-- =====================================================
-- DIAGNOSTIC QUERY: Why New Calls Aren't Being Tracked
-- Run this in Supabase SQL Editor to diagnose the issue
-- =====================================================

-- 1. FIND THE KARAMO ORGANIZATION (STARTER PLAN)
SELECT '=== KARAMO ORGANIZATION ===' as section;
SELECT
  id,
  name,
  plan_type,
  max_minutes_monthly,
  used_minutes,
  created_at,
  updated_at
FROM organizations
WHERE name = 'Karamo'
  AND plan_type = 'starter'
LIMIT 1;

-- 2. CHECK ALL MEMBERS OF KARAMO
SELECT '=== KARAMO MEMBERS ===' as section;
SELECT
  uo.user_id,
  u.email,
  uo.role,
  uo.joined_at,
  u.created_at as user_created_at
FROM user_organizations uo
JOIN users u ON u.id = uo.user_id
WHERE uo.organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041'; -- Karamo starter org ID

-- 3. FIND ALL CALLS IN LAST 7 DAYS
SELECT '=== CALLS IN LAST 7 DAYS ===' as section;
SELECT
  c.id,
  c.created_at,
  c.user_id,
  u.email as user_email,
  c.organization_id,
  CASE
    WHEN c.organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041' THEN 'YES - KARAMO'
    WHEN c.organization_id IS NULL THEN 'NULL - NOT SET!'
    ELSE 'WRONG ORG!'
  END as correct_org,
  c.status,
  c.duration_minutes,
  c.file_name
FROM calls c
LEFT JOIN users u ON u.id = c.user_id
WHERE c.created_at >= NOW() - INTERVAL '7 days'
  AND (
    c.organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041'
    OR c.user_id IN (
      SELECT user_id
      FROM user_organizations
      WHERE organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041'
    )
    OR u.email = 'evelyn.etaifo@protonmail.com' -- Also check specific user
  )
ORDER BY c.created_at DESC;

-- 4. CHECK CALLS BY STATUS IN LAST 7 DAYS
SELECT '=== CALL STATUS BREAKDOWN (LAST 7 DAYS) ===' as section;
SELECT
  c.status,
  COUNT(*) as call_count,
  SUM(CASE WHEN c.duration_minutes IS NOT NULL THEN c.duration_minutes ELSE 0 END) as total_minutes,
  SUM(CASE WHEN c.organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041' THEN 1 ELSE 0 END) as karamo_calls,
  SUM(CASE WHEN c.organization_id IS NULL THEN 1 ELSE 0 END) as no_org_calls
FROM calls c
LEFT JOIN users u ON u.id = c.user_id
WHERE c.created_at >= NOW() - INTERVAL '7 days'
  AND (
    c.organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041'
    OR c.user_id IN (
      SELECT user_id
      FROM user_organizations
      WHERE organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041'
    )
    OR u.email = 'evelyn.etaifo@protonmail.com'
  )
GROUP BY c.status;

-- 5. FIND COMPLETED CALLS SPECIFICALLY
SELECT '=== COMPLETED CALLS IN LAST 7 DAYS ===' as section;
SELECT
  c.id,
  c.created_at,
  u.email as user_email,
  c.duration_minutes,
  CASE
    WHEN c.duration_minutes IS NULL THEN 'MISSING DURATION!'
    ELSE CAST(c.duration_minutes AS TEXT) || ' minutes'
  END as duration_status,
  CASE
    WHEN c.organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041' THEN 'CORRECT'
    WHEN c.organization_id IS NULL THEN 'NULL!'
    ELSE 'WRONG!'
  END as org_status
FROM calls c
LEFT JOIN users u ON u.id = c.user_id
WHERE c.status = 'completed'
  AND c.created_at >= NOW() - INTERVAL '7 days'
  AND (
    c.organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041'
    OR c.user_id IN (
      SELECT user_id
      FROM user_organizations
      WHERE organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041'
    )
    OR u.email = 'evelyn.etaifo@protonmail.com'
  );

-- 6. CALCULATE WHAT USAGE SHOULD BE
SELECT '=== USAGE CALCULATION ===' as section;
SELECT
  (SELECT used_minutes FROM organizations WHERE id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041') as stored_usage,
  (
    SELECT COALESCE(SUM(duration_minutes), 0)
    FROM calls
    WHERE organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041'
      AND status = 'completed'
      AND duration_minutes IS NOT NULL
  ) as actual_total_usage,
  (
    SELECT COALESCE(SUM(duration_minutes), 0)
    FROM calls
    WHERE organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041'
      AND status = 'completed'
      AND duration_minutes IS NOT NULL
      AND created_at >= NOW() - INTERVAL '7 days'
  ) as usage_last_7_days,
  (
    SELECT COALESCE(SUM(duration_minutes), 0)
    FROM calls
    WHERE organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041'
      AND status = 'completed'
      AND duration_minutes IS NOT NULL
      AND created_at >= DATE_TRUNC('month', NOW())
  ) as usage_this_month;

-- 7. FIND ORPHANED CALLS (NO ORGANIZATION)
SELECT '=== ORPHANED CALLS (NO ORG) LAST 7 DAYS ===' as section;
SELECT
  c.id,
  c.created_at,
  u.email as user_email,
  c.status,
  c.duration_minutes,
  'NO ORGANIZATION SET!' as issue
FROM calls c
LEFT JOIN users u ON u.id = c.user_id
WHERE c.organization_id IS NULL
  AND c.created_at >= NOW() - INTERVAL '7 days'
  AND (
    c.user_id IN (
      SELECT user_id
      FROM user_organizations
      WHERE organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041'
    )
    OR u.email = 'evelyn.etaifo@protonmail.com'
  );

-- 8. CHECK FOR DUPLICATE ORGANIZATIONS
SELECT '=== ALL KARAMO ORGANIZATIONS ===' as section;
SELECT
  id,
  name,
  plan_type,
  max_minutes_monthly,
  used_minutes,
  created_at
FROM organizations
WHERE LOWER(name) LIKE '%karamo%'
ORDER BY created_at DESC;

-- 9. FIND SPECIFIC USER'S RECENT CALLS
SELECT '=== EVELYN.ETAIFO RECENT CALLS ===' as section;
SELECT
  c.id,
  c.created_at,
  c.organization_id,
  o.name as org_name,
  c.status,
  c.duration_minutes,
  c.file_name
FROM calls c
LEFT JOIN organizations o ON o.id = c.organization_id
WHERE c.user_id = (SELECT id FROM users WHERE email = 'evelyn.etaifo@protonmail.com')
  AND c.created_at >= NOW() - INTERVAL '7 days'
ORDER BY c.created_at DESC;

-- 10. DIAGNOSTIC SUMMARY
SELECT '=== DIAGNOSTIC SUMMARY ===' as section;
SELECT
  'Organization ID' as check_item,
  '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041' as value
UNION ALL
SELECT
  'Member Count',
  (SELECT COUNT(*)::text FROM user_organizations WHERE organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041')
UNION ALL
SELECT
  'Total Calls (All Time)',
  (SELECT COUNT(*)::text FROM calls WHERE organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041')
UNION ALL
SELECT
  'Calls Last 7 Days',
  (SELECT COUNT(*)::text FROM calls WHERE organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041' AND created_at >= NOW() - INTERVAL '7 days')
UNION ALL
SELECT
  'Completed Calls Last 7 Days',
  (SELECT COUNT(*)::text FROM calls WHERE organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041' AND status = 'completed' AND created_at >= NOW() - INTERVAL '7 days')
UNION ALL
SELECT
  'Minutes Used Last 7 Days',
  (SELECT COALESCE(SUM(duration_minutes), 0)::text FROM calls WHERE organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041' AND status = 'completed' AND created_at >= NOW() - INTERVAL '7 days');

-- =====================================================
-- INTERPRETATION GUIDE:
--
-- 1. If "Member Count" = 0: Users aren't in user_organizations table
-- 2. If "Orphaned Calls" exist: Calls missing organization_id
-- 3. If "Minutes Used Last 7 Days" = 0 but calls exist:
--    - Check if duration_minutes is NULL
--    - Check if status is not 'completed'
-- 4. If calls have wrong organization_id: They're going to personal org
-- 5. If multiple Karamo orgs exist: Users might be in wrong org
-- =====================================================