-- =====================================================
-- SIMPLE USAGE SYNC - MINIMAL SAFE FIX
-- Only syncs used_minutes with actual usage
-- =====================================================

-- Show current state before fix
\echo 'BEFORE FIX - Organizations with potential issues:'
SELECT
    o.name,
    o.plan_type,
    o.used_minutes,
    o.max_minutes_monthly + COALESCE(o.overage_minutes_purchased, 0) as total_available,
    DATE(o.current_period_start) as period_start,
    DATE(o.current_period_end) as period_end,
    CASE
        WHEN o.current_period_start IS NULL THEN 'NO PERIOD'
        WHEN DATE_TRUNC('month', o.current_period_start::date) != DATE_TRUNC('month', NOW()) THEN 'OUTDATED'
        WHEN o.used_minutes >= (o.max_minutes_monthly + COALESCE(o.overage_minutes_purchased, 0)) THEN 'NO MINUTES'
        ELSE 'OK'
    END as issue
FROM organizations o
WHERE o.current_period_start IS NULL
   OR DATE_TRUNC('month', o.current_period_start::date) != DATE_TRUNC('month', NOW())
   OR o.used_minutes >= (o.max_minutes_monthly + COALESCE(o.overage_minutes_purchased, 0))
ORDER BY issue, o.name;

\echo ''
\echo 'APPLYING FIX...'
\echo ''

-- Apply the fix
DO $$
DECLARE
    current_month_start DATE := DATE_TRUNC('month', NOW());
    current_month_end TIMESTAMP := DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 second';
    org_record RECORD;
    actual_minutes INTEGER;
    fixed_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Setting all organizations to current period: % to %',
        current_month_start, current_month_end::date;
    RAISE NOTICE '';

    -- Process each organization
    FOR org_record IN SELECT * FROM organizations LOOP

        -- Calculate actual usage for current month
        SELECT COALESCE(SUM(metric_value), 0)
        INTO actual_minutes
        FROM usage_metrics
        WHERE organization_id = org_record.id
          AND metric_type = 'minutes_transcribed'
          AND created_at >= current_month_start
          AND created_at <= current_month_end;

        -- Update if needed
        IF org_record.current_period_start IS NULL OR
           DATE_TRUNC('month', org_record.current_period_start::date) != current_month_start OR
           COALESCE(org_record.used_minutes, -1) != actual_minutes THEN

            UPDATE organizations
            SET
                current_period_start = current_month_start,
                current_period_end = current_month_end,
                used_minutes = actual_minutes,
                updated_at = NOW()
            WHERE id = org_record.id;

            fixed_count := fixed_count + 1;
            RAISE NOTICE 'Fixed: % (was % minutes, now % minutes)',
                org_record.name,
                COALESCE(org_record.used_minutes, 0),
                actual_minutes;
        END IF;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE 'Fixed % organizations', fixed_count;
END $$;

-- Show results after fix
\echo ''
\echo 'AFTER FIX - Verification:'

SELECT
    o.name,
    o.plan_type,
    o.used_minutes || '/' || (o.max_minutes_monthly + COALESCE(o.overage_minutes_purchased, 0)) as "used/total",
    (o.max_minutes_monthly + COALESCE(o.overage_minutes_purchased, 0)) - o.used_minutes as remaining,
    CASE
        WHEN o.overage_minutes_purchased > 0 THEN 'Has ' || o.overage_minutes_purchased || ' overage mins'
        ELSE 'No overage'
    END as overage_status,
    CASE
        WHEN o.used_minutes >= (o.max_minutes_monthly + COALESCE(o.overage_minutes_purchased, 0)) THEN '❌ NO MINUTES LEFT'
        WHEN o.used_minutes >= (o.max_minutes_monthly + COALESCE(o.overage_minutes_purchased, 0)) * 0.9 THEN '⚠️  >90% used'
        WHEN o.used_minutes >= (o.max_minutes_monthly + COALESCE(o.overage_minutes_purchased, 0)) * 0.8 THEN '⚠️  >80% used'
        ELSE '✓ OK'
    END as status
FROM organizations o
ORDER BY
    CASE
        WHEN o.used_minutes >= (o.max_minutes_monthly + COALESCE(o.overage_minutes_purchased, 0)) THEN 0
        WHEN o.used_minutes >= (o.max_minutes_monthly + COALESCE(o.overage_minutes_purchased, 0)) * 0.9 THEN 1
        WHEN o.used_minutes >= (o.max_minutes_monthly + COALESCE(o.overage_minutes_purchased, 0)) * 0.8 THEN 2
        ELSE 3
    END,
    o.name;

-- Special check for users with overage who might be affected
\echo ''
\echo 'CRITICAL CHECK - Users with overage minutes:'
SELECT
    o.name,
    o.overage_minutes_purchased as overage_mins,
    o.used_minutes as used,
    o.max_minutes_monthly as base,
    (o.max_minutes_monthly + o.overage_minutes_purchased) as total,
    (o.max_minutes_monthly + o.overage_minutes_purchased) - o.used_minutes as remaining,
    CASE
        WHEN o.used_minutes >= (o.max_minutes_monthly + o.overage_minutes_purchased) THEN 'BLOCKED - SHOULD NOT BE!'
        ELSE 'Should have access'
    END as access_status
FROM organizations o
WHERE o.overage_minutes_purchased > 0
ORDER BY o.overage_minutes_purchased DESC;