-- =====================================================
-- USAGE TRACKING FIX WITHOUT ARCHIVING
-- This version only uses known valid metric types
-- =====================================================

-- First, show what metric types exist in the database
\echo '========================================='
\echo 'EXISTING METRIC TYPES IN USE:'
\echo '========================================='
SELECT DISTINCT metric_type, COUNT(*) as count
FROM usage_metrics
GROUP BY metric_type
ORDER BY metric_type;

-- Now fix the usage tracking
\echo ''
\echo '========================================='
\echo 'STARTING USAGE FIX'
\echo '========================================='

DO $$
DECLARE
    org RECORD;
    actual_usage INTEGER;
    current_month_start DATE := DATE_TRUNC('month', NOW());
    current_month_end TIMESTAMP := DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 second';
    fixed_count INTEGER := 0;
    already_correct INTEGER := 0;
    total_orgs INTEGER := 0;
BEGIN
    RAISE NOTICE 'Current billing period should be: % to %', current_month_start, current_month_end;
    RAISE NOTICE '';

    FOR org IN
        SELECT * FROM organizations
        ORDER BY name
    LOOP
        total_orgs := total_orgs + 1;

        -- Calculate what the usage SHOULD be based on usage_metrics
        -- Only count minutes_transcribed in the current period
        SELECT COALESCE(SUM(metric_value), 0)
        INTO actual_usage
        FROM usage_metrics
        WHERE organization_id = org.id
          AND metric_type = 'minutes_transcribed'  -- We know this type exists
          AND created_at >= current_month_start
          AND created_at <= current_month_end;

        -- Check if update is needed
        IF org.current_period_start IS NULL OR
           org.current_period_end IS NULL OR
           DATE_TRUNC('month', org.current_period_start::DATE) != current_month_start OR
           COALESCE(org.used_minutes, -1) != actual_usage THEN

            -- Log what we're changing
            RAISE NOTICE 'Fixing: % (ID: %)', org.name, org.id;

            IF org.current_period_start IS NULL OR DATE_TRUNC('month', org.current_period_start::DATE) != current_month_start THEN
                RAISE NOTICE '  Period: % → %',
                    COALESCE(org.current_period_start::text, 'NULL'),
                    current_month_start;
            END IF;

            IF COALESCE(org.used_minutes, -1) != actual_usage THEN
                RAISE NOTICE '  Usage: % → % minutes',
                    COALESCE(org.used_minutes, 0),
                    actual_usage;
            END IF;

            -- Update the organization
            UPDATE organizations
            SET
                current_period_start = current_month_start,
                current_period_end = current_month_end,
                used_minutes = actual_usage,
                -- Keep overage_minutes_purchased as is (don't reset)
                updated_at = NOW()
            WHERE id = org.id;

            fixed_count := fixed_count + 1;
        ELSE
            already_correct := already_correct + 1;
        END IF;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SUMMARY:';
    RAISE NOTICE '  Total organizations: %', total_orgs;
    RAISE NOTICE '  Fixed: %', fixed_count;
    RAISE NOTICE '  Already correct: %', already_correct;
    RAISE NOTICE '========================================';
END $$;

-- Show the results
\echo ''
\echo '========================================='
\echo 'VERIFICATION - CURRENT STATE:'
\echo '========================================='

WITH usage_calc AS (
    SELECT
        o.id,
        o.name,
        o.plan_type,
        o.max_minutes_monthly as base_minutes,
        COALESCE(o.overage_minutes_purchased, 0) as overage_minutes,
        o.max_minutes_monthly + COALESCE(o.overage_minutes_purchased, 0) as total_available,
        o.used_minutes as stored_usage,
        COALESCE(SUM(
            CASE
                WHEN um.metric_type = 'minutes_transcribed'
                 AND um.created_at >= DATE_TRUNC('month', NOW())
                 AND um.created_at < DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
                THEN um.metric_value
                ELSE 0
            END
        ), 0) as calculated_usage,
        o.current_period_start,
        o.current_period_end
    FROM organizations o
    LEFT JOIN usage_metrics um ON um.organization_id = o.id
    GROUP BY o.id
)
SELECT
    name,
    plan_type,
    base_minutes || '+' || overage_minutes as "base+overage",
    stored_usage || '/' || total_available as "used/total",
    total_available - stored_usage as remaining,
    CASE
        WHEN stored_usage != calculated_usage THEN 'MISMATCH: actual=' || calculated_usage
        WHEN stored_usage >= total_available THEN 'OVER LIMIT!'
        WHEN stored_usage >= total_available * 0.9 THEN 'Warning: >90%'
        WHEN stored_usage >= total_available * 0.8 THEN 'Warning: >80%'
        ELSE 'OK'
    END as status
FROM usage_calc
ORDER BY
    CASE
        WHEN stored_usage != calculated_usage THEN 0
        WHEN stored_usage >= total_available THEN 1
        WHEN stored_usage >= total_available * 0.9 THEN 2
        ELSE 3
    END,
    name
LIMIT 20;

-- Check for any organizations that might have the "no minutes" error
\echo ''
\echo '========================================='
\echo 'ORGANIZATIONS WITH NO REMAINING MINUTES:'
\echo '========================================='

SELECT
    name,
    plan_type,
    used_minutes,
    max_minutes_monthly + COALESCE(overage_minutes_purchased, 0) as total_available,
    (max_minutes_monthly + COALESCE(overage_minutes_purchased, 0)) - used_minutes as remaining
FROM organizations
WHERE used_minutes >= (max_minutes_monthly + COALESCE(overage_minutes_purchased, 0))
ORDER BY name;

-- Show organizations with overage minutes
\echo ''
\echo '========================================='
\echo 'ORGANIZATIONS WITH PURCHASED OVERAGE:'
\echo '========================================='

SELECT
    name,
    plan_type,
    overage_minutes_purchased as overage_mins,
    used_minutes || '/' || (max_minutes_monthly + overage_minutes_purchased) as usage,
    (max_minutes_monthly + overage_minutes_purchased) - used_minutes as remaining
FROM organizations
WHERE overage_minutes_purchased > 0
ORDER BY overage_minutes_purchased DESC;