-- =====================================================
-- MIGRATION: Add Database-Level Locking for Usage Reservations
-- Purpose: Prevent race conditions in concurrent uploads
-- Date: 2024
-- =====================================================

BEGIN;

-- Add unique constraint to prevent duplicate active reservations
-- This ensures only one active reservation per organization at a time
ALTER TABLE usage_reservations
ADD CONSTRAINT unique_active_reservation_per_org
UNIQUE (organization_id, status)
WHERE status = 'active';

-- Create a function to calculate available minutes for an organization
CREATE OR REPLACE FUNCTION calculate_available_minutes(p_organization_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_plan_minutes INTEGER;
  v_overage_minutes INTEGER;
  v_used_minutes INTEGER;
  v_reserved_minutes INTEGER;
  v_total_available INTEGER;
BEGIN
  -- Get plan minutes from organization
  SELECT COALESCE(max_minutes_monthly, 0)
  INTO v_plan_minutes
  FROM organizations
  WHERE id = p_organization_id;

  -- Get purchased overage minutes for current billing period
  SELECT COALESCE(SUM(minutes_purchased), 0)
  INTO v_overage_minutes
  FROM overage_purchases
  WHERE organization_id = p_organization_id
  AND status = 'completed'
  AND created_at >= date_trunc('month', CURRENT_DATE)
  AND created_at < date_trunc('month', CURRENT_DATE) + interval '1 month';

  -- Get used minutes for current billing period
  SELECT COALESCE(SUM(minutes_used), 0)
  INTO v_used_minutes
  FROM usage_metrics
  WHERE organization_id = p_organization_id
  AND metric_type = 'call_minutes'
  AND created_at >= date_trunc('month', CURRENT_DATE)
  AND created_at < date_trunc('month', CURRENT_DATE) + interval '1 month';

  -- Get currently reserved minutes (active reservations)
  SELECT COALESCE(SUM(minutes_reserved), 0)
  INTO v_reserved_minutes
  FROM usage_reservations
  WHERE organization_id = p_organization_id
  AND status = 'active';

  -- Calculate total available
  v_total_available := (v_plan_minutes + v_overage_minutes) - (v_used_minutes + v_reserved_minutes);

  RETURN GREATEST(v_total_available, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create stored procedure for atomic usage reservation
-- This uses advisory locks to prevent race conditions
CREATE OR REPLACE FUNCTION reserve_usage(
  p_organization_id UUID,
  p_minutes INTEGER,
  p_call_id UUID,
  p_user_id UUID
) RETURNS UUID AS $$
DECLARE
  v_available_minutes INTEGER;
  v_reservation_id UUID;
  v_lock_id BIGINT;
BEGIN
  -- Generate a unique lock ID based on organization_id
  -- We use the first 8 bytes of the UUID for the advisory lock
  v_lock_id := ('x' || substring(p_organization_id::text, 1, 8))::bit(32)::bigint;

  -- Acquire advisory lock for this organization
  -- This ensures only one reservation can be processed at a time per org
  PERFORM pg_advisory_lock(v_lock_id);

  BEGIN
    -- Check available minutes
    v_available_minutes := calculate_available_minutes(p_organization_id);

    -- If not enough minutes available, release lock and return NULL
    IF v_available_minutes < p_minutes THEN
      PERFORM pg_advisory_unlock(v_lock_id);
      RETURN NULL;
    END IF;

    -- Create the reservation
    v_reservation_id := gen_random_uuid();

    INSERT INTO usage_reservations (
      id,
      organization_id,
      call_id,
      user_id,
      minutes_reserved,
      status,
      created_at,
      expires_at
    ) VALUES (
      v_reservation_id,
      p_organization_id,
      p_call_id,
      p_user_id,
      p_minutes,
      'active',
      NOW(),
      NOW() + INTERVAL '5 minutes'  -- Reservation expires in 5 minutes if not confirmed
    );

    -- Release the advisory lock
    PERFORM pg_advisory_unlock(v_lock_id);

    RETURN v_reservation_id;

  EXCEPTION
    WHEN OTHERS THEN
      -- Always release lock on error
      PERFORM pg_advisory_unlock(v_lock_id);
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to confirm a reservation (when upload completes)
CREATE OR REPLACE FUNCTION confirm_reservation(
  p_reservation_id UUID,
  p_actual_minutes INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_reservation RECORD;
  v_success BOOLEAN := FALSE;
BEGIN
  -- Get the reservation
  SELECT * INTO v_reservation
  FROM usage_reservations
  WHERE id = p_reservation_id
  AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Update reservation to completed
  UPDATE usage_reservations
  SET
    status = 'completed',
    minutes_reserved = p_actual_minutes,
    completed_at = NOW()
  WHERE id = p_reservation_id;

  -- Record actual usage
  INSERT INTO usage_metrics (
    organization_id,
    metric_type,
    minutes_used,
    metadata,
    created_at
  ) VALUES (
    v_reservation.organization_id,
    'call_minutes',
    p_actual_minutes,
    jsonb_build_object(
      'call_id', v_reservation.call_id,
      'reservation_id', p_reservation_id
    ),
    NOW()
  );

  v_success := TRUE;
  RETURN v_success;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to cancel a reservation (on upload failure)
CREATE OR REPLACE FUNCTION cancel_reservation(
  p_reservation_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE usage_reservations
  SET
    status = 'cancelled',
    cancelled_at = NOW(),
    cancellation_reason = p_reason
  WHERE id = p_reservation_id
  AND status = 'active';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a cleanup function for expired reservations
CREATE OR REPLACE FUNCTION cleanup_expired_usage_reservations()
RETURNS void AS $$
BEGIN
  -- Cancel reservations that have expired
  UPDATE usage_reservations
  SET
    status = 'expired',
    cancelled_at = NOW(),
    cancellation_reason = 'Reservation expired'
  WHERE status = 'active'
  AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add necessary columns to usage_reservations if they don't exist
DO $$
BEGIN
  -- Add expires_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usage_reservations' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE usage_reservations ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;

  -- Add completed_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usage_reservations' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE usage_reservations ADD COLUMN completed_at TIMESTAMPTZ;
  END IF;

  -- Add cancelled_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usage_reservations' AND column_name = 'cancelled_at'
  ) THEN
    ALTER TABLE usage_reservations ADD COLUMN cancelled_at TIMESTAMPTZ;
  END IF;

  -- Add cancellation_reason column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usage_reservations' AND column_name = 'cancellation_reason'
  ) THEN
    ALTER TABLE usage_reservations ADD COLUMN cancellation_reason TEXT;
  END IF;
END $$;

-- Create index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_usage_reservations_active_expires
ON usage_reservations(status, expires_at)
WHERE status = 'active';

-- Create index for organization lookups
CREATE INDEX IF NOT EXISTS idx_usage_reservations_org_status
ON usage_reservations(organization_id, status);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION calculate_available_minutes(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reserve_usage(UUID, INTEGER, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_reservation(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_reservation(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_usage_reservations() TO authenticated;

-- Add RLS policy for usage_reservations if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'usage_reservations' AND policyname = 'Users can manage their organization reservations'
  ) THEN
    CREATE POLICY "Users can manage their organization reservations"
    ON usage_reservations
    FOR ALL
    TO authenticated
    USING (
      organization_id IN (
        SELECT organization_id FROM user_organizations
        WHERE user_id = auth.uid()
      )
    );
  END IF;
END $$;

COMMIT;

-- Add comment explaining the migration
COMMENT ON FUNCTION reserve_usage IS 'Atomically reserves usage minutes for an organization using advisory locks to prevent race conditions';
COMMENT ON FUNCTION calculate_available_minutes IS 'Calculates the available minutes for an organization considering plan, overage, used, and reserved minutes';
COMMENT ON FUNCTION confirm_reservation IS 'Confirms a usage reservation and records the actual usage';
COMMENT ON FUNCTION cancel_reservation IS 'Cancels an active reservation, freeing up the reserved minutes';
COMMENT ON FUNCTION cleanup_expired_usage_reservations IS 'Cleans up expired reservations that were never confirmed or cancelled';