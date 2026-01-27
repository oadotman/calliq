-- =====================================================
-- USER-SPECIFIC USAGE DIAGNOSTIC
-- Replace 'USER_EMAIL_HERE' with the actual user email
-- =====================================================

-- Set the user email to diagnose
\set user_email 'USER_EMAIL_HERE'

\echo 'DIAGNOSING USER:' :user_email
\echo ''

-- Get user and organization info
WITH user_info AS (
    SELECT
        u.id as user_id,
        u.email,
        u.display_name,
        uo.organization_id,
        uo.role,
        o.name as org_name,
        o.plan_type,
        o.max_minutes_monthly,
        o.overage_minutes_purchased,
        o.used_minutes,
        o.current_period_start,
        o.current_period_end
    FROM users u
    LEFT JOIN user_organizations uo ON uo.user_id = u.id
    LEFT JOIN organizations o ON o.id = uo.organization_id
    WHERE u.email = :'user_email'
),
usage_calc AS (
    SELECT
        ui.*,
        (
            SELECT COALESCE(SUM(metric_value), 0)
            FROM usage_metrics
            WHERE organization_id = ui.organization_id
              AND metric_type = 'minutes_transcribed'
              AND created_at >= COALESCE(ui.current_period_start, DATE_TRUNC('month', NOW()))
              AND created_at < COALESCE(ui.current_period_end, DATE_TRUNC('month', NOW()) + INTERVAL '1 month')
        ) as calculated_usage
    FROM user_info ui
)
SELECT
    '=== USER INFORMATION ===' as section,
    email,
    display_name,
    role as org_role,
    org_name
FROM usage_calc
UNION ALL
SELECT
    '=== ORGANIZATION PLAN ===' as section,
    plan_type as info1,
    max_minutes_monthly || ' base minutes' as info2,
    COALESCE(overage_minutes_purchased || ' overage minutes', '0 overage minutes') as info3,
    (max_minutes_monthly + COALESCE(overage_minutes_purchased, 0)) || ' total available' as info4
FROM usage_calc
UNION ALL
SELECT
    '=== USAGE STATUS ===' as section,
    'Stored usage: ' || COALESCE(used_minutes::text, 'NULL') as info1,
    'Calculated usage: ' || calculated_usage as info2,
    'Remaining: ' || ((max_minutes_monthly + COALESCE(overage_minutes_purchased, 0)) - COALESCE(used_minutes, calculated_usage)) as info3,
    CASE
        WHEN used_minutes IS NULL THEN 'ERROR: used_minutes is NULL'
        WHEN used_minutes != calculated_usage THEN 'WARNING: Mismatch! Stored ≠ Calculated'
        ELSE 'OK: Usage is synced'
    END as info4
FROM usage_calc
UNION ALL
SELECT
    '=== BILLING PERIOD ===' as section,
    'Start: ' || COALESCE(current_period_start::text, 'NOT SET') as info1,
    'End: ' || COALESCE(current_period_end::text, 'NOT SET') as info2,
    CASE
        WHEN current_period_start IS NULL THEN 'ERROR: No period set!'
        WHEN DATE_TRUNC('month', current_period_start::date) != DATE_TRUNC('month', NOW()) THEN 'ERROR: Period is outdated!'
        ELSE 'OK: Period is current'
    END as info3,
    '' as info4
FROM usage_calc;

-- Show recent usage records
\echo ''
\echo 'RECENT USAGE RECORDS (Last 10):'
SELECT
    created_at::date as date,
    metric_type,
    metric_value as minutes,
    (metadata->>'call_id')::text as call_id
FROM usage_metrics
WHERE organization_id = (
    SELECT organization_id
    FROM user_organizations uo
    JOIN users u ON u.id = uo.user_id
    WHERE u.email = :'user_email'
)
ORDER BY created_at DESC
LIMIT 10;

-- Show recent calls
\echo ''
\echo 'RECENT CALLS (Last 5):'
SELECT
    c.created_at::date as date,
    c.customer_name,
    c.status,
    c.duration as duration_seconds,
    ROUND(c.duration::numeric / 60, 1) as duration_minutes
FROM calls c
WHERE c.organization_id = (
    SELECT organization_id
    FROM user_organizations uo
    JOIN users u ON u.id = uo.user_id
    WHERE u.email = :'user_email'
)
ORDER BY c.created_at DESC
LIMIT 5;

-- Diagnosis summary
\echo ''
\echo 'DIAGNOSIS SUMMARY:'
WITH diagnosis AS (
    SELECT
        u.email,
        o.used_minutes,
        o.max_minutes_monthly + COALESCE(o.overage_minutes_purchased, 0) as total_available,
        (
            SELECT COALESCE(SUM(metric_value), 0)
            FROM usage_metrics
            WHERE organization_id = o.id
              AND metric_type = 'minutes_transcribed'
              AND created_at >= DATE_TRUNC('month', NOW())
              AND created_at < DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
        ) as actual_usage,
        o.current_period_start,
        o.overage_minutes_purchased
    FROM users u
    JOIN user_organizations uo ON uo.user_id = u.id
    JOIN organizations o ON o.id = uo.organization_id
    WHERE u.email = :'user_email'
)
SELECT
    CASE
        WHEN used_minutes >= total_available AND overage_minutes_purchased > 0 THEN
            '❌ CRITICAL: User has ' || overage_minutes_purchased || ' overage minutes but still blocked!'
        WHEN used_minutes >= total_available THEN
            '⚠️  User has exhausted all minutes (no overage purchased)'
        WHEN used_minutes != actual_usage THEN
            '⚠️  Usage mismatch: stored=' || used_minutes || ', actual=' || actual_usage
        WHEN current_period_start IS NULL OR DATE_TRUNC('month', current_period_start::date) != DATE_TRUNC('month', NOW()) THEN
            '⚠️  Billing period needs update'
        ELSE
            '✓ No issues detected. User has ' || (total_available - used_minutes) || ' minutes remaining.'
    END as diagnosis
FROM diagnosis;

-- Recommended fix
\echo ''
\echo 'RECOMMENDED FIX:'
WITH fix_needed AS (
    SELECT
        o.id,
        o.used_minutes,
        (
            SELECT COALESCE(SUM(metric_value), 0)
            FROM usage_metrics
            WHERE organization_id = o.id
              AND metric_type = 'minutes_transcribed'
              AND created_at >= DATE_TRUNC('month', NOW())
              AND created_at < DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
        ) as actual_usage,
        o.current_period_start
    FROM users u
    JOIN user_organizations uo ON uo.user_id = u.id
    JOIN organizations o ON o.id = uo.organization_id
    WHERE u.email = :'user_email'
)
SELECT
    'UPDATE organizations SET ' ||
    CASE
        WHEN used_minutes != actual_usage THEN 'used_minutes = ' || actual_usage || ', '
        ELSE ''
    END ||
    CASE
        WHEN current_period_start IS NULL OR DATE_TRUNC('month', current_period_start::date) != DATE_TRUNC('month', NOW()) THEN
            'current_period_start = ''' || DATE_TRUNC('month', NOW()) || ''', ' ||
            'current_period_end = ''' || (DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 second') || ''', '
        ELSE ''
    END ||
    'updated_at = NOW() WHERE id = ''' || id || ''';' as fix_query
FROM fix_needed
WHERE used_minutes != actual_usage
   OR current_period_start IS NULL
   OR DATE_TRUNC('month', current_period_start::date) != DATE_TRUNC('month', NOW());