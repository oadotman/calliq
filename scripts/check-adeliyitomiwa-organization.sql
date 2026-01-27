-- =====================================================
-- CHECK WHICH ORGANIZATION BELONGS TO adeliyitomiwa@yahoo.com
-- =====================================================

-- Find adeliyitomiwa's organization details
SELECT
    'ADELIYITOMIWA ORGANIZATION CHECK:' as info;

SELECT
    u.email,
    u.id as user_id,
    uo.organization_id,
    o.name as org_name,
    o.plan_type,
    o.max_minutes_monthly,
    o.used_minutes,
    CASE
        WHEN o.max_minutes_monthly = 999999 THEN 'YES - Has unlimited minutes'
        ELSE 'NO - Regular user'
    END as is_superuser
FROM users u
JOIN user_organizations uo ON uo.user_id = u.id
JOIN organizations o ON o.id = uo.organization_id
WHERE u.email = 'adeliyitomiwa@yahoo.com';

-- Show all organizations with their owners
SELECT
    'ALL ORGANIZATIONS WITH OWNERS:' as info;

SELECT
    o.name as org_name,
    o.plan_type,
    o.max_minutes_monthly as minutes_limit,
    o.used_minutes,
    u.email as owner_email,
    CASE
        WHEN u.email = 'adeliyitomiwa@yahoo.com' THEN 'SHOULD BE SUPERUSER'
        WHEN o.max_minutes_monthly = 999999 THEN 'HAS SUPERUSER MINUTES'
        ELSE 'Regular'
    END as status
FROM organizations o
LEFT JOIN user_organizations uo ON uo.organization_id = o.id
LEFT JOIN users u ON u.id = uo.user_id
ORDER BY
    CASE WHEN u.email = 'adeliyitomiwa@yahoo.com' THEN 0 ELSE 1 END,
    o.name;