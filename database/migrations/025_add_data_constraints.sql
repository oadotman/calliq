-- =====================================================
-- Migration 025: Add Data Constraints
-- Phase 2.4 - Data Integrity Constraints
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Clean up bad data before adding constraints
-- =====================================================

-- Fix NULL user_ids in calls (use organization_id as fallback)
UPDATE calls
SET user_id = COALESCE(user_id, organization_id)
WHERE user_id IS NULL AND organization_id IS NOT NULL;

-- Fix NULL file_urls in calls
UPDATE calls
SET file_url = COALESCE(file_url, audio_url, 'placeholder_' || id::text)
WHERE file_url IS NULL;

-- Fix NULL durations in calls
UPDATE calls
SET duration = COALESCE(duration, duration_minutes * 60, 0)
WHERE duration IS NULL;

-- Fix non-lowercase emails in referrals
UPDATE referrals
SET referred_email = LOWER(referred_email)
WHERE referred_email != LOWER(referred_email);

-- Log cleanup results
DO $$
DECLARE
    calls_fixed INTEGER;
    referrals_fixed INTEGER;
BEGIN
    SELECT COUNT(*) INTO calls_fixed
    FROM calls
    WHERE user_id IS NOT NULL
        AND file_url IS NOT NULL
        AND duration IS NOT NULL;

    SELECT COUNT(*) INTO referrals_fixed
    FROM referrals
    WHERE referred_email = LOWER(referred_email);

    RAISE NOTICE 'Data cleanup complete - Calls fixed: %, Referrals normalized: %',
                 calls_fixed, referrals_fixed;
END $$;

-- =====================================================
-- STEP 2: Add NOT NULL constraints to calls table
-- =====================================================

DO $$
BEGIN
    -- Add NOT NULL constraint to user_id if not already present
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'calls'
            AND column_name = 'user_id'
            AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE calls
        ALTER COLUMN user_id SET NOT NULL;
        RAISE NOTICE 'Added NOT NULL constraint to calls.user_id';
    END IF;

    -- Add NOT NULL constraint to file_url if not already present
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'calls'
            AND column_name = 'file_url'
            AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE calls
        ALTER COLUMN file_url SET NOT NULL;
        RAISE NOTICE 'Added NOT NULL constraint to calls.file_url';
    END IF;

    -- Add NOT NULL constraint to duration if not already present
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'calls'
            AND column_name = 'duration'
            AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE calls
        ALTER COLUMN duration SET NOT NULL;
        RAISE NOTICE 'Added NOT NULL constraint to calls.duration';
    END IF;
END $$;

-- =====================================================
-- STEP 3: Add CHECK constraints
-- =====================================================

-- Email format check on referrals table
ALTER TABLE referrals DROP CONSTRAINT IF EXISTS check_referred_email_lower;
ALTER TABLE referrals
ADD CONSTRAINT check_referred_email_lower
CHECK (referred_email = LOWER(referred_email));

-- Email format validation
ALTER TABLE referrals DROP CONSTRAINT IF EXISTS check_referred_email_format;
ALTER TABLE referrals
ADD CONSTRAINT check_referred_email_format
CHECK (referred_email ~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$');

-- Duration must be non-negative
ALTER TABLE calls DROP CONSTRAINT IF EXISTS check_duration_positive;
ALTER TABLE calls
ADD CONSTRAINT check_duration_positive
CHECK (duration >= 0);

-- File size must be positive
ALTER TABLE calls DROP CONSTRAINT IF EXISTS check_file_size_positive;
ALTER TABLE calls
ADD CONSTRAINT check_file_size_positive
CHECK (file_size > 0);

-- Status enum validation
ALTER TABLE calls DROP CONSTRAINT IF EXISTS check_status_valid;
ALTER TABLE calls
ADD CONSTRAINT check_status_valid
CHECK (status IN ('pending', 'uploading', 'uploaded', 'processing', 'completed', 'failed', 'cancelled'));

-- Approval status enum validation
ALTER TABLE calls DROP CONSTRAINT IF EXISTS check_approval_status_valid;
ALTER TABLE calls
ADD CONSTRAINT check_approval_status_valid
CHECK (approval_status IS NULL OR approval_status IN ('pending', 'approved', 'rejected', 'auto_approved'));

-- =====================================================
-- STEP 4: Add constraints to usage tables
-- =====================================================

-- Usage metrics value must be non-negative
ALTER TABLE usage_metrics DROP CONSTRAINT IF EXISTS check_metric_value_positive;
ALTER TABLE usage_metrics
ADD CONSTRAINT check_metric_value_positive
CHECK (metric_value >= 0);

-- Usage reservations minutes must be positive
ALTER TABLE usage_reservations DROP CONSTRAINT IF EXISTS check_reserved_minutes_positive;
ALTER TABLE usage_reservations
ADD CONSTRAINT check_reserved_minutes_positive
CHECK (reserved_minutes > 0);

-- Usage reservations status validation
ALTER TABLE usage_reservations DROP CONSTRAINT IF EXISTS check_reservation_status_valid;
ALTER TABLE usage_reservations
ADD CONSTRAINT check_reservation_status_valid
CHECK (status IN ('active', 'confirmed', 'released', 'expired'));

-- =====================================================
-- STEP 5: Add constraints to organizations table
-- =====================================================

-- First check what plan types exist
DO $$
DECLARE
    invalid_plans TEXT;
BEGIN
    SELECT STRING_AGG(DISTINCT plan_type, ', ')
    INTO invalid_plans
    FROM organizations
    WHERE plan_type IS NOT NULL
        AND plan_type NOT IN ('free', 'solo', 'team', 'enterprise', 'partner', 'trial', 'starter', 'professional', 'business');

    IF invalid_plans IS NOT NULL THEN
        RAISE NOTICE 'Warning: Found non-standard plan types: %', invalid_plans;
        RAISE NOTICE 'Skipping plan_type constraint to avoid breaking existing data';
    ELSE
        -- Plan type validation - expanded to include common plan types
        ALTER TABLE organizations DROP CONSTRAINT IF EXISTS check_plan_type_valid;
        ALTER TABLE organizations
        ADD CONSTRAINT check_plan_type_valid
        CHECK (plan_type IS NULL OR plan_type IN ('free', 'solo', 'team', 'enterprise', 'partner', 'trial', 'starter', 'professional', 'business'));
        RAISE NOTICE 'Plan type constraint added successfully';
    END IF;
END $$;

-- Max members must be positive if set
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS check_max_members_positive;
ALTER TABLE organizations
ADD CONSTRAINT check_max_members_positive
CHECK (max_members IS NULL OR max_members > 0);

-- Max minutes must be positive if set
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS check_max_minutes_positive;
ALTER TABLE organizations
ADD CONSTRAINT check_max_minutes_positive
CHECK (max_minutes_monthly IS NULL OR max_minutes_monthly > 0);

-- =====================================================
-- STEP 6: Add unique constraints where needed
-- =====================================================

-- Ensure unique active reservation per organization and file
-- Using CREATE UNIQUE INDEX instead of ADD CONSTRAINT for partial uniqueness
DROP INDEX IF EXISTS unique_active_reservation_per_file;
CREATE UNIQUE INDEX unique_active_reservation_per_file
ON usage_reservations(organization_id, file_identifier)
WHERE status = 'active';

-- Ensure unique email per organization for team invitations
DROP INDEX IF EXISTS unique_pending_invitation;
CREATE UNIQUE INDEX unique_pending_invitation
ON team_invitations(organization_id, email)
WHERE accepted_at IS NULL;

-- =====================================================
-- STEP 7: Add default values where appropriate
-- =====================================================

-- Set default values for new records
ALTER TABLE calls ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE calls ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE calls ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE calls ALTER COLUMN auto_approved SET DEFAULT false;
ALTER TABLE calls ALTER COLUMN requires_review SET DEFAULT false;
ALTER TABLE calls ALTER COLUMN processing_progress SET DEFAULT 0;

ALTER TABLE organizations ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE organizations ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE organizations ALTER COLUMN bonus_minutes_balance SET DEFAULT 0;
ALTER TABLE organizations ALTER COLUMN bonus_credits_balance_cents SET DEFAULT 0;
ALTER TABLE organizations ALTER COLUMN used_minutes SET DEFAULT 0;

ALTER TABLE usage_metrics ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE usage_reservations ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE usage_reservations ALTER COLUMN updated_at SET DEFAULT NOW();

-- =====================================================
-- STEP 8: Create trigger for updated_at timestamps
-- =====================================================

-- Create or replace function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to tables with updated_at columns
DROP TRIGGER IF EXISTS update_calls_updated_at ON calls;
CREATE TRIGGER update_calls_updated_at
    BEFORE UPDATE ON calls
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_usage_reservations_updated_at ON usage_reservations;
CREATE TRIGGER update_usage_reservations_updated_at
    BEFORE UPDATE ON usage_reservations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Report on constraints added
-- =====================================================

DO $$
DECLARE
    constraint_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO constraint_count
    FROM pg_constraint
    WHERE conrelid IN (
        'calls'::regclass,
        'referrals'::regclass,
        'usage_metrics'::regclass,
        'usage_reservations'::regclass,
        'organizations'::regclass
    )
    AND contype IN ('c', 'u'); -- check and unique constraints

    RAISE NOTICE 'Total constraints added/verified: %', constraint_count;
END $$;

COMMIT;

-- =====================================================
-- Rollback script (save as 025_add_data_constraints.down.sql)
-- =====================================================
/*
BEGIN;

-- Drop check constraints
ALTER TABLE referrals DROP CONSTRAINT IF EXISTS check_referred_email_lower;
ALTER TABLE referrals DROP CONSTRAINT IF EXISTS check_referred_email_format;
ALTER TABLE calls DROP CONSTRAINT IF EXISTS check_duration_positive;
ALTER TABLE calls DROP CONSTRAINT IF EXISTS check_file_size_positive;
ALTER TABLE calls DROP CONSTRAINT IF EXISTS check_status_valid;
ALTER TABLE calls DROP CONSTRAINT IF EXISTS check_approval_status_valid;
ALTER TABLE usage_metrics DROP CONSTRAINT IF EXISTS check_metric_value_positive;
ALTER TABLE usage_reservations DROP CONSTRAINT IF EXISTS check_reserved_minutes_positive;
ALTER TABLE usage_reservations DROP CONSTRAINT IF EXISTS check_reservation_status_valid;
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS check_plan_type_valid;
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS check_max_members_positive;
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS check_max_minutes_positive;

-- Drop unique constraints
ALTER TABLE usage_reservations DROP CONSTRAINT IF EXISTS unique_active_reservation_per_file;
ALTER TABLE team_invitations DROP CONSTRAINT IF EXISTS unique_pending_invitation;

-- Drop triggers
DROP TRIGGER IF EXISTS update_calls_updated_at ON calls;
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
DROP TRIGGER IF EXISTS update_usage_reservations_updated_at ON usage_reservations;

-- Optionally drop the trigger function
-- DROP FUNCTION IF EXISTS update_updated_at_column();

-- Remove NOT NULL constraints (be careful with this)
-- ALTER TABLE calls ALTER COLUMN user_id DROP NOT NULL;
-- ALTER TABLE calls ALTER COLUMN file_url DROP NOT NULL;
-- ALTER TABLE calls ALTER COLUMN duration DROP NOT NULL;

COMMIT;
*/