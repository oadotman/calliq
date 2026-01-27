-- =====================================================
-- FINAL USAGE TRACKING FIX
-- Works with the constraint: only 'minutes_transcribed' is allowed
-- =====================================================

\echo '========================================='
\echo 'USAGE TRACKING FIX - FINAL VERSION'
\echo 'Current date:' `date`
\echo '========================================='
\echo ''

-- Step 1: Show the problem
\echo 'STEP 1: IDENTIFYING PROBLEMS'
\echo '-----------------------------'

WITH current_period AS (
    SELECT
        DATE_TRUNC('month', NOW()) as period_start,
        DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 second' as period_end
),
org_status AS (
    SELECT
        o.id,
        o.name,
        o.plan_type,
        o.max_minutes_monthly,
        o.overage_minutes_purchased,
        o.used_minutes as stored_usage,
        o.current_period_start,
        o.current_period_end,
        -- Calculate actual usage for current month
        (
            SELECT COALESCE(SUM(metric_value), 0)
            FROM usage_metrics um
            WHERE um.organization_id = o.id
              AND um.metric_type = 'minutes_transcribed'
              AND um.created_at >= cp.period_start
              AND um.created_at <= cp.period_end
        ) as actual_usage,
        o.max_minutes_monthly + COALESCE(o.overage_minutes_purchased, 0) as total_available
    FROM organizations o
    CROSS JOIN current_period cp
)
SELECT
    name,
    plan_type,
    stored_usage || ' stored vs ' || actual_usage || ' actual' as usage_comparison,
    CASE
        WHEN stored_usage != actual_usage THEN '❌ MISMATCH'
        ELSE '✓ Synced'
    END as sync_status,
    CASE
        WHEN current_period_start IS NULL THEN '❌ NO PERIOD'
        WHEN DATE_TRUNC('month', current_period_start::date) != DATE_TRUNC('month', NOW()) THEN '❌ OUTDATED'
        ELSE '✓ Current'
    END as period_status,
    CASE
        WHEN overage_minutes_purchased > 0 AND stored_usage >= total_available THEN '🚨 HAS OVERAGE BUT BLOCKED'
        WHEN stored_usage >= total_available THEN '⚠️ No minutes left'
        ELSE '✓ Has minutes'
    END as access_status
FROM org_status
WHERE stored_usage != actual_usage
   OR current_period_start IS NULL
   OR DATE_TRUNC('month', current_period_start::date) != DATE_TRUNC('month', NOW())
   OR (overage_minutes_purchased > 0 AND stored_usage >= total_available)
ORDER BY
    CASE WHEN overage_minutes_purchased > 0 AND stored_usage >= total_available THEN 0 ELSE 1 END,
    name;

\echo ''
\echo 'STEP 2: APPLYING THE FIX'
\echo '-------------------------'

DO $$
DECLARE
    current_month_start TIMESTAMP := DATE_TRUNC('month', NOW());
    current_month_end TIMESTAMP := DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 second';
    org_record RECORD;
    actual_usage_value INTEGER;
    issues_fixed INTEGER := 0;
    critical_fixes INTEGER := 0;
BEGIN
    RAISE NOTICE 'Setting all organizations to current period: % to %',
        current_month_start::date, current_month_end::date;
    RAISE NOTICE '';

    FOR org_record IN
        SELECT * FROM organizations
        ORDER BY
            CASE WHEN overage_minutes_purchased > 0 THEN 0 ELSE 1 END,
            name
    LOOP
        -- Calculate actual usage for current month only
        SELECT COALESCE(SUM(metric_value), 0)
        INTO actual_usage_value
        FROM usage_metrics
        WHERE organization_id = org_record.id
          AND metric_type = 'minutes_transcribed'
          AND created_at >= current_month_start
          AND created_at <= current_month_end;

        -- Check if fix is needed
        IF org_record.current_period_start IS NULL OR
           DATE_TRUNC('month', org_record.current_period_start::date) != current_month_start OR
           COALESCE(org_record.used_minutes, -1) != actual_usage_value THEN

            -- Check if this is a critical fix (user with overage being blocked)
            IF org_record.overage_minutes_purchased > 0 AND
               org_record.used_minutes >= (org_record.max_minutes_monthly + org_record.overage_minutes_purchased) THEN
                critical_fixes := critical_fixes + 1;
                RAISE NOTICE '🚨 CRITICAL FIX: % has % overage minutes but was blocked!',
                    org_record.name, org_record.overage_minutes_purchased;
            END IF;

            -- Log the change
            RAISE NOTICE 'Fixing: %', org_record.name;
            IF COALESCE(org_record.used_minutes, -1) != actual_usage_value THEN
                RAISE NOTICE '  Usage: % → %', org_record.used_minutes, actual_usage_value;
            END IF;
            IF org_record.current_period_start IS NULL OR
               DATE_TRUNC('month', org_record.current_period_start::date) != current_month_start THEN
                RAISE NOTICE '  Period: Updated to current month';
            END IF;

            -- Apply the fix
            UPDATE organizations
            SET
                current_period_start = current_month_start,
                current_period_end = current_month_end,
                used_minutes = actual_usage_value,
                -- IMPORTANT: Keep overage_minutes_purchased unchanged!
                updated_at = NOW()
            WHERE id = org_record.id;

            issues_fixed := issues_fixed + 1;
        END IF;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FIXES APPLIED:';
    RAISE NOTICE '  Total issues fixed: %', issues_fixed;
    RAISE NOTICE '  Critical fixes (overage users): %', critical_fixes;
    RAISE NOTICE '========================================';
END $$;

\echo ''
\echo 'STEP 3: VERIFICATION'
\echo '--------------------'

-- Show all organizations with their corrected status
SELECT
    o.name,
    o.plan_type,
    o.used_minutes || '/' || (o.max_minutes_monthly + COALESCE(o.overage_minutes_purchased, 0)) as "used/total",
    (o.max_minutes_monthly + COALESCE(o.overage_minutes_purchased, 0)) - o.used_minutes as remaining,
    CASE
        WHEN o.overage_minutes_purchased > 0 THEN '+' || o.overage_minutes_purchased || ' overage'
        ELSE 'No overage'
    END as overage,
    CASE
        WHEN o.used_minutes >= (o.max_minutes_monthly + COALESCE(o.overage_minutes_purchased, 0)) THEN
            CASE
                WHEN o.overage_minutes_purchased > 0 THEN '🚨 ERROR: Has overage but no access!'
                ELSE '⚠️ Exhausted'
            END
        WHEN o.used_minutes >= (o.max_minutes_monthly + COALESCE(o.overage_minutes_purchased, 0)) * 0.9 THEN '⚠️ >90%'
        WHEN o.used_minutes >= (o.max_minutes_monthly + COALESCE(o.overage_minutes_purchased, 0)) * 0.8 THEN '⚠️ >80%'
        ELSE '✅ OK'
    END as status
FROM organizations o
ORDER BY
    CASE
        WHEN o.overage_minutes_purchased > 0 AND o.used_minutes >= (o.max_minutes_monthly + o.overage_minutes_purchased) THEN 0
        WHEN o.used_minutes >= (o.max_minutes_monthly + COALESCE(o.overage_minutes_purchased, 0)) THEN 1
        ELSE 2
    END,
    o.name;

\echo ''
\echo 'STEP 4: CRITICAL CHECK - USERS WITH OVERAGE'
\echo '--------------------------------------------'

SELECT
    'Organization: ' || o.name as info,
    'Plan: ' || o.plan_type || ' (' || o.max_minutes_monthly || ' base + ' || o.overage_minutes_purchased || ' overage)' as plan_details,
    'Usage: ' || o.used_minutes || '/' || (o.max_minutes_monthly + o.overage_minutes_purchased) ||
    ' (' || ((o.max_minutes_monthly + o.overage_minutes_purchased) - o.used_minutes) || ' remaining)' as usage_details,
    CASE
        WHEN o.used_minutes >= (o.max_minutes_monthly + o.overage_minutes_purchased) THEN
            '❌ STILL BLOCKED - Manual intervention needed!'
        ELSE
            '✅ FIXED - User now has access with ' ||
            ((o.max_minutes_monthly + o.overage_minutes_purchased) - o.used_minutes) || ' minutes remaining'
    END as status
FROM organizations o
WHERE o.overage_minutes_purchased > 0
ORDER BY o.overage_minutes_purchased DESC;

\echo ''
\echo '========================================='
\echo 'FIX COMPLETE'
\echo '========================================='
\echo ''
\echo 'NEXT STEPS:'
\echo '1. Check the results above'
\echo '2. Any organizations showing "STILL BLOCKED" need manual review'
\echo '3. Test by having an affected user try to upload a file'
\echo '4. Monitor the usage_metrics table for new entries'
\echo ''

-- Final summary query
WITH summary AS (
    SELECT
        COUNT(*) as total_orgs,
        COUNT(CASE WHEN overage_minutes_purchased > 0 THEN 1 END) as orgs_with_overage,
        COUNT(CASE WHEN used_minutes >= (max_minutes_monthly + COALESCE(overage_minutes_purchased, 0)) THEN 1 END) as orgs_exhausted,
        COUNT(CASE WHEN overage_minutes_purchased > 0 AND
                         used_minutes < (max_minutes_monthly + overage_minutes_purchased) THEN 1 END) as overage_with_access,
        COUNT(CASE WHEN overage_minutes_purchased > 0 AND
                         used_minutes >= (max_minutes_monthly + overage_minutes_purchased) THEN 1 END) as overage_still_blocked
    FROM organizations
)
SELECT
    'FINAL SUMMARY:' as title,
    total_orgs || ' total organizations' as stat1,
    orgs_with_overage || ' have purchased overage' as stat2,
    orgs_exhausted || ' have exhausted all minutes' as stat3,
    CASE
        WHEN overage_still_blocked > 0 THEN
            '⚠️ ' || overage_still_blocked || ' with overage are STILL BLOCKED!'
        ELSE
            '✅ All overage users have access'
    END as critical_status
FROM summary;