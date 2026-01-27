-- =====================================================
-- CHECK SPECIFIC USER: adeliyitomiwa@yahoo.com
-- =====================================================

-- Get complete user status
WITH user_data AS (
    SELECT
        u.id as user_id,
        u.email,
        u.display_name,
        uo.organization_id,
        o.name as org_name,
        o.plan_type,
        o.max_minutes_monthly as base_minutes,
        o.overage_minutes_purchased,
        o.used_minutes,
        o.max_minutes_monthly + COALESCE(o.overage_minutes_purchased, 0) as total_available,
        o.current_period_start,
        o.current_period_end
    FROM users u
    JOIN user_organizations uo ON uo.user_id = u.id
    JOIN organizations o ON o.id = uo.organization_id
    WHERE u.email = 'adeliyitomiwa@yahoo.com'
)
SELECT
    email,
    org_name,
    plan_type || ' plan' as plan,
    base_minutes || ' base minutes' as base,
    CASE
        WHEN overage_minutes_purchased > 0 THEN overage_minutes_purchased || ' overage minutes'
        ELSE 'NO OVERAGE PURCHASED'
    END as overage,
    used_minutes || '/' || total_available || ' used' as usage,
    total_available - used_minutes || ' remaining' as remaining,
    CASE
        WHEN used_minutes >= total_available THEN '❌ NO MINUTES LEFT'
        WHEN used_minutes >= total_available * 0.9 THEN '⚠️ Less than 10% remaining'
        ELSE '✅ Has minutes available'
    END as status
FROM user_data;

-- Show recent usage
SELECT
    'Recent usage (last 10 records):' as title;

SELECT
    created_at::date as date,
    created_at::time as time,
    metric_value || ' minutes' as minutes,
    LEFT(metadata::text, 50) || '...' as metadata_preview
FROM usage_metrics
WHERE organization_id = (
    SELECT organization_id
    FROM user_organizations uo
    JOIN users u ON u.id = uo.user_id
    WHERE u.email = 'adeliyitomiwa@yahoo.com'
)
AND metric_type = 'minutes_transcribed'
ORDER BY created_at DESC
LIMIT 10;

-- Check if user can upload a 3-minute file
SELECT
    'Can this user upload a 3-minute file?' as question;

WITH check_upload AS (
    SELECT
        o.used_minutes,
        o.max_minutes_monthly + COALESCE(o.overage_minutes_purchased, 0) as total_available,
        (o.max_minutes_monthly + COALESCE(o.overage_minutes_purchased, 0)) - o.used_minutes as remaining
    FROM users u
    JOIN user_organizations uo ON uo.user_id = u.id
    JOIN organizations o ON o.id = uo.organization_id
    WHERE u.email = 'adeliyitomiwa@yahoo.com'
)
SELECT
    CASE
        WHEN remaining >= 3 THEN '✅ YES - User has ' || remaining || ' minutes available'
        WHEN remaining > 0 THEN '❌ NO - User only has ' || remaining || ' minutes (needs 3)'
        ELSE '❌ NO - User has exhausted all ' || total_available || ' minutes'
    END as can_upload_3min_file,
    CASE
        WHEN remaining <= 0 THEN 'User needs to: 1) Purchase overage minutes, 2) Upgrade plan, or 3) Wait for next month'
        WHEN remaining < 3 THEN 'User needs ' || (3 - remaining) || ' more minutes'
        ELSE 'User can upload the file'
    END as recommendation
FROM check_upload;