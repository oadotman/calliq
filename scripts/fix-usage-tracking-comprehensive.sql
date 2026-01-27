-- =====================================================
-- COMPREHENSIVE USAGE TRACKING FIX
-- Fixes all usage tracking issues and ensures data consistency
-- =====================================================

-- 1. Fix billing periods for all organizations
DO $$
DECLARE
    current_month_start DATE := DATE_TRUNC('month', NOW());
    current_month_end DATE := (DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 second')::DATE;
    org RECORD;
    actual_usage INTEGER;
BEGIN
    RAISE NOTICE 'Starting comprehensive usage tracking fix at %', NOW();

    -- Loop through all organizations
    FOR org IN SELECT * FROM organizations LOOP
        RAISE NOTICE 'Processing organization: % (%)', org.name, org.id;

        -- Check if billing period needs updating
        IF org.current_period_start IS NULL OR
           org.current_period_end IS NULL OR
           DATE_TRUNC('month', org.current_period_start::DATE) != current_month_start THEN

            -- Archive old usage if exists
            IF org.current_period_start IS NOT NULL AND org.used_minutes > 0 THEN
                INSERT INTO usage_metrics (
                    organization_id,
                    metric_type,
                    metric_value,
                    metadata,
                    created_at
                ) VALUES (
                    org.id,
                    'billing_period_archive',
                    COALESCE(org.used_minutes, 0),
                    jsonb_build_object(
                        'period_start', org.current_period_start,
                        'period_end', org.current_period_end,
                        'archived_at', NOW(),
                        'reason', 'billing_period_fix',
                        'overage_at_end', COALESCE(org.overage_minutes_purchased, 0)
                    ),
                    NOW()
                );
                RAISE NOTICE '  Archived % minutes from previous period', org.used_minutes;
            END IF;

            -- Calculate actual usage for current month from usage_metrics
            SELECT COALESCE(SUM(metric_value), 0)
            INTO actual_usage
            FROM usage_metrics
            WHERE organization_id = org.id
              AND metric_type = 'minutes_transcribed'
              AND created_at >= current_month_start
              AND created_at <= current_month_end;

            -- Update organization with correct period and synced usage
            UPDATE organizations
            SET
                current_period_start = current_month_start,
                current_period_end = current_month_end,
                used_minutes = actual_usage,
                -- Preserve overage minutes (they don't reset monthly!)
                -- overage_minutes_purchased stays as is
                updated_at = NOW()
            WHERE id = org.id;

            RAISE NOTICE '  Updated period to % - %', current_month_start, current_month_end;
            RAISE NOTICE '  Set used_minutes to % (from usage_metrics)', actual_usage;

        ELSE
            -- Period is current, just sync the used_minutes
            SELECT COALESCE(SUM(metric_value), 0)
            INTO actual_usage
            FROM usage_metrics
            WHERE organization_id = org.id
              AND metric_type = 'minutes_transcribed'
              AND created_at >= org.current_period_start
              AND created_at <= org.current_period_end;

            IF actual_usage != COALESCE(org.used_minutes, 0) THEN
                UPDATE organizations
                SET
                    used_minutes = actual_usage,
                    updated_at = NOW()
                WHERE id = org.id;

                RAISE NOTICE '  Synced used_minutes: % -> %', org.used_minutes, actual_usage;
            ELSE
                RAISE NOTICE '  Usage already synced: % minutes', actual_usage;
            END IF;
        END IF;
    END LOOP;

    RAISE NOTICE 'Comprehensive fix completed at %', NOW();
END $$;

-- 2. Create improved increment function with better error handling
CREATE OR REPLACE FUNCTION increment_used_minutes(
    org_id UUID,
    minutes_to_add INTEGER
) RETURNS VOID AS $$
DECLARE
    current_usage INTEGER;
    max_minutes INTEGER;
    overage_minutes INTEGER;
    total_available INTEGER;
BEGIN
    -- Get current organization state with lock
    SELECT used_minutes, max_minutes_monthly, overage_minutes_purchased
    INTO current_usage, max_minutes, overage_minutes
    FROM organizations
    WHERE id = org_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Organization % not found', org_id;
    END IF;

    -- Calculate total available minutes
    total_available := COALESCE(max_minutes, 0) + COALESCE(overage_minutes, 0);

    -- Check if adding minutes would exceed limits
    IF (COALESCE(current_usage, 0) + minutes_to_add) > total_available THEN
        RAISE WARNING 'Usage would exceed limit for org %: current=%, adding=%, limit=%',
            org_id, current_usage, minutes_to_add, total_available;
    END IF;

    -- Update the usage
    UPDATE organizations
    SET
        used_minutes = COALESCE(used_minutes, 0) + minutes_to_add,
        updated_at = NOW()
    WHERE id = org_id;

    RAISE NOTICE 'Updated org % used_minutes by % (new total: %)',
        org_id, minutes_to_add, (COALESCE(current_usage, 0) + minutes_to_add);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create a function to get accurate usage
CREATE OR REPLACE FUNCTION get_accurate_usage(org_id UUID)
RETURNS TABLE (
    minutes_used INTEGER,
    base_minutes INTEGER,
    overage_minutes INTEGER,
    total_available INTEGER,
    remaining_minutes INTEGER,
    percent_used NUMERIC
) AS $$
DECLARE
    period_start TIMESTAMP;
    period_end TIMESTAMP;
    actual_usage INTEGER;
BEGIN
    -- Get organization details
    SELECT
        current_period_start,
        current_period_end,
        max_minutes_monthly,
        overage_minutes_purchased
    INTO
        period_start,
        period_end,
        base_minutes,
        overage_minutes
    FROM organizations
    WHERE id = org_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Organization % not found', org_id;
    END IF;

    -- Calculate actual usage from usage_metrics
    SELECT COALESCE(SUM(metric_value), 0)
    INTO actual_usage
    FROM usage_metrics
    WHERE organization_id = org_id
      AND metric_type = 'minutes_transcribed'
      AND created_at >= COALESCE(period_start, DATE_TRUNC('month', NOW()))
      AND created_at <= COALESCE(period_end, DATE_TRUNC('month', NOW()) + INTERVAL '1 month');

    -- Calculate derived values
    total_available := COALESCE(base_minutes, 0) + COALESCE(overage_minutes, 0);
    remaining_minutes := GREATEST(0, total_available - actual_usage);

    IF total_available > 0 THEN
        percent_used := (actual_usage::NUMERIC / total_available) * 100;
    ELSE
        percent_used := 100;
    END IF;

    RETURN QUERY SELECT
        actual_usage AS minutes_used,
        COALESCE(base_minutes, 0) AS base_minutes,
        COALESCE(overage_minutes, 0) AS overage_minutes,
        total_available,
        remaining_minutes,
        ROUND(percent_used, 2) AS percent_used;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_usage_metrics_lookup
    ON usage_metrics (organization_id, metric_type, created_at)
    WHERE metric_type = 'minutes_transcribed';

CREATE INDEX IF NOT EXISTS idx_calls_org_status_date
    ON calls (organization_id, status, created_at);

-- 5. Grant necessary permissions
GRANT EXECUTE ON FUNCTION increment_used_minutes TO authenticated;
GRANT EXECUTE ON FUNCTION get_accurate_usage TO authenticated;

-- 6. Add helpful comments
COMMENT ON COLUMN organizations.used_minutes IS
    'Current billing period usage in minutes. Synced from usage_metrics table.';

COMMENT ON COLUMN organizations.overage_minutes_purchased IS
    'Additional minutes purchased that persist until used. Does NOT reset monthly.';

COMMENT ON COLUMN organizations.current_period_start IS
    'Start of current billing period. Must be first day of current month.';

COMMENT ON COLUMN organizations.current_period_end IS
    'End of current billing period. Must be last day of current month.';

-- 7. Verify the fix
DO $$
DECLARE
    org RECORD;
    usage_info RECORD;
    issues_found INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFICATION REPORT ===';

    FOR org IN SELECT * FROM organizations LIMIT 10 LOOP
        SELECT * INTO usage_info FROM get_accurate_usage(org.id);

        RAISE NOTICE 'Org: % (%)', org.name, org.id;
        RAISE NOTICE '  Used: %/%  Remaining: %  Overage: %',
            usage_info.minutes_used,
            usage_info.total_available,
            usage_info.remaining_minutes,
            usage_info.overage_minutes;

        -- Check for issues
        IF org.used_minutes != usage_info.minutes_used THEN
            RAISE WARNING '  ISSUE: used_minutes mismatch (% vs %)',
                org.used_minutes, usage_info.minutes_used;
            issues_found := issues_found + 1;
        END IF;

        IF org.current_period_start IS NULL THEN
            RAISE WARNING '  ISSUE: No billing period set';
            issues_found := issues_found + 1;
        END IF;
    END LOOP;

    RAISE NOTICE '';
    IF issues_found = 0 THEN
        RAISE NOTICE '✓ All checks passed!';
    ELSE
        RAISE WARNING '⚠ Found % issues that may need attention', issues_found;
    END IF;
END $$;