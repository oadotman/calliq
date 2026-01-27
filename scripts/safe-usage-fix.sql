-- =====================================================
-- SAFE USAGE TRACKING FIX
-- This version checks constraints before making changes
-- =====================================================

-- First, let's see what we're working with
DO $$
DECLARE
    allowed_types TEXT;
    can_archive BOOLEAN := FALSE;
    current_month_start DATE := DATE_TRUNC('month', NOW());
    current_month_end DATE := (DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 second')::DATE;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'STARTING SAFE USAGE FIX';
    RAISE NOTICE 'Current month: % to %', current_month_start, current_month_end;
    RAISE NOTICE '========================================';

    -- Check what metric types are allowed
    SELECT pg_get_constraintdef(c.oid) INTO allowed_types
    FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'usage_metrics'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%metric_type%'
    LIMIT 1;

    RAISE NOTICE 'Allowed metric types: %', allowed_types;

    -- Check if we can use billing_period_archive
    IF allowed_types LIKE '%billing_period_archive%' THEN
        can_archive := TRUE;
        RAISE NOTICE '✓ Can archive old periods';
    ELSE
        RAISE NOTICE '✗ Cannot archive (metric type not allowed)';
    END IF;
END $$;

-- Now let's fix the usage tracking WITHOUT violating constraints
DO $$
DECLARE
    org RECORD;
    actual_usage INTEGER;
    current_month_start DATE := DATE_TRUNC('month', NOW());
    current_month_end TIMESTAMP := DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 second';
    updates_made INTEGER := 0;
    syncs_made INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'PROCESSING ORGANIZATIONS...';
    RAISE NOTICE '';

    FOR org IN
        SELECT * FROM organizations
        ORDER BY created_at DESC
    LOOP
        -- Calculate actual usage from usage_metrics
        SELECT COALESCE(SUM(metric_value), 0)
        INTO actual_usage
        FROM usage_metrics
        WHERE organization_id = org.id
          AND metric_type = 'minutes_transcribed'  -- This type should definitely exist
          AND created_at >= COALESCE(org.current_period_start, current_month_start)
          AND created_at <= COALESCE(org.current_period_end, current_month_end);

        RAISE NOTICE 'Organization: % (%)', org.name, org.id;

        -- Check if billing period needs updating
        IF org.current_period_start IS NULL OR
           org.current_period_end IS NULL OR
           DATE_TRUNC('month', org.current_period_start::DATE) != current_month_start THEN

            RAISE NOTICE '  → Updating billing period';

            -- Update to current period WITHOUT trying to archive
            -- (since billing_period_archive might not be allowed)
            UPDATE organizations
            SET
                current_period_start = current_month_start,
                current_period_end = current_month_end,
                used_minutes = actual_usage,  -- Set to calculated usage
                updated_at = NOW()
            WHERE id = org.id;

            updates_made := updates_made + 1;

            RAISE NOTICE '    Period: % to %', current_month_start, current_month_end;
            RAISE NOTICE '    Usage set to: % minutes', actual_usage;

        ELSIF actual_usage != COALESCE(org.used_minutes, 0) THEN
            -- Just sync the usage
            UPDATE organizations
            SET
                used_minutes = actual_usage,
                updated_at = NOW()
            WHERE id = org.id;

            syncs_made := syncs_made + 1;

            RAISE NOTICE '  → Synced usage: % -> %', org.used_minutes, actual_usage;
        ELSE
            RAISE NOTICE '  → Already in sync (%  minutes)', actual_usage;
        END IF;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SUMMARY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Billing periods updated: %', updates_made;
    RAISE NOTICE 'Usage synced: %', syncs_made;
    RAISE NOTICE '';
END $$;

-- Create or replace the increment function with better error handling
CREATE OR REPLACE FUNCTION increment_used_minutes(
    org_id UUID,
    minutes_to_add INTEGER
) RETURNS VOID AS $$
DECLARE
    current_usage INTEGER;
    new_usage INTEGER;
BEGIN
    -- Get current usage with lock
    SELECT used_minutes INTO current_usage
    FROM organizations
    WHERE id = org_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Organization % not found', org_id;
    END IF;

    new_usage := COALESCE(current_usage, 0) + minutes_to_add;

    -- Update the usage
    UPDATE organizations
    SET
        used_minutes = new_usage,
        updated_at = NOW()
    WHERE id = org_id;

    RAISE NOTICE 'Updated org % from % to % minutes',
        org_id, current_usage, new_usage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verification query to check the results
\echo ''
\echo 'VERIFICATION: Organizations with outdated periods or mismatched usage'
\echo ''

WITH usage_check AS (
    SELECT
        o.id,
        o.name,
        o.plan_type,
        o.max_minutes_monthly,
        o.overage_minutes_purchased,
        o.used_minutes,
        o.current_period_start,
        o.current_period_end,
        COALESCE(SUM(
            CASE
                WHEN um.metric_type = 'minutes_transcribed'
                 AND um.created_at >= COALESCE(o.current_period_start, DATE_TRUNC('month', NOW()))
                 AND um.created_at <= COALESCE(o.current_period_end, DATE_TRUNC('month', NOW()) + INTERVAL '1 month')
                THEN um.metric_value
                ELSE 0
            END
        ), 0) as calculated_usage,
        (o.max_minutes_monthly + COALESCE(o.overage_minutes_purchased, 0)) as total_available
    FROM organizations o
    LEFT JOIN usage_metrics um ON um.organization_id = o.id
    GROUP BY o.id
)
SELECT
    name,
    plan_type,
    used_minutes || '/' || total_available as usage_display,
    calculated_usage as actual_usage,
    CASE
        WHEN used_minutes != calculated_usage THEN 'MISMATCH!'
        WHEN used_minutes >= total_available THEN 'OVER LIMIT'
        WHEN used_minutes >= total_available * 0.9 THEN 'WARNING'
        ELSE 'OK'
    END as status,
    DATE(current_period_start) || ' to ' || DATE(current_period_end) as period
FROM usage_check
WHERE used_minutes != calculated_usage
   OR current_period_start IS NULL
   OR DATE_TRUNC('month', current_period_start::date) != DATE_TRUNC('month', NOW())
ORDER BY
    CASE
        WHEN used_minutes != calculated_usage THEN 0
        WHEN current_period_start IS NULL THEN 1
        ELSE 2
    END,
    name;