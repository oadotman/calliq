-- =====================================================
-- FIX FOR 42X (AND OTHER) MULTIPLICATION ISSUES
-- =====================================================

-- STEP 1: IDENTIFY ALL AFFECTED CALLS
-- ====================================
SELECT '=== STEP 1: IDENTIFYING AFFECTED CALLS ===' as step;

WITH affected_calls AS (
  SELECT
    c.id,
    c.customer_name,
    c.user_id,
    u.email,
    c.organization_id,
    o.name as org_name,
    c.duration as duration_seconds,
    c.duration_minutes as wrong_minutes,
    CEIL(c.duration::numeric / 60) as correct_minutes,
    c.duration_minutes - CEIL(c.duration::numeric / 60) as overcharged_minutes,
    ROUND(c.duration_minutes::numeric / NULLIF(CEIL(c.duration::numeric / 60), 0), 2) as multiplication_factor,
    c.processed_at
  FROM calls c
  LEFT JOIN auth.users u ON c.user_id = u.id
  LEFT JOIN organizations o ON c.organization_id = o.id
  WHERE c.duration IS NOT NULL
    AND c.duration > 0
    AND c.duration_minutes IS NOT NULL
    AND c.status = 'completed'
    AND c.duration_minutes > CEIL(c.duration::numeric / 60) * 1.5  -- At least 1.5x wrong
)
SELECT * FROM affected_calls
ORDER BY multiplication_factor DESC;

-- STEP 2: FIX THE duration_minutes IN CALLS TABLE
-- =================================================
SELECT '=== STEP 2: FIXING DURATION_MINUTES IN CALLS ===' as step;

-- First, show what we're about to fix
SELECT
  COUNT(*) as calls_to_fix,
  SUM(duration_minutes) as total_wrong_minutes,
  SUM(CEIL(duration::numeric / 60)) as total_correct_minutes,
  SUM(duration_minutes - CEIL(duration::numeric / 60)) as total_overcharged_minutes
FROM calls
WHERE duration IS NOT NULL
  AND duration > 0
  AND duration_minutes IS NOT NULL
  AND status = 'completed'
  AND duration_minutes > CEIL(duration::numeric / 60) * 1.5;

-- Now fix the duration_minutes
UPDATE calls
SET duration_minutes = CEIL(duration::numeric / 60)
WHERE duration IS NOT NULL
  AND duration > 0
  AND duration_minutes IS NOT NULL
  AND status = 'completed'
  AND duration_minutes > CEIL(duration::numeric / 60) * 1.5
RETURNING id, customer_name, duration_minutes as new_minutes;

-- STEP 3: FIX USAGE_METRICS TABLE
-- ================================
SELECT '=== STEP 3: FIXING USAGE_METRICS ===' as step;

-- Update usage_metrics to match corrected duration_minutes
WITH corrected_calls AS (
  SELECT
    id::text as call_id,
    CEIL(duration::numeric / 60) as correct_minutes
  FROM calls
  WHERE duration IS NOT NULL
    AND duration > 0
    AND status = 'completed'
)
UPDATE usage_metrics um
SET metric_value = cc.correct_minutes
FROM corrected_calls cc
WHERE um.metadata->>'call_id' = cc.call_id
  AND um.metric_type = 'minutes_transcribed'
  AND um.metric_value != cc.correct_minutes
RETURNING
  um.id,
  um.metadata->>'call_id' as call_id,
  um.metric_value as new_minutes;

-- STEP 4: RECALCULATE ORGANIZATION USED_MINUTES
-- ==============================================
SELECT '=== STEP 4: RECALCULATING ORGANIZATION USAGE ===' as step;

-- Update all organizations' used_minutes based on corrected usage_metrics
WITH org_usage AS (
  SELECT
    organization_id,
    SUM(metric_value) as total_minutes
  FROM usage_metrics
  WHERE metric_type = 'minutes_transcribed'
  GROUP BY organization_id
)
UPDATE organizations o
SET used_minutes = COALESCE(ou.total_minutes, 0)
FROM org_usage ou
WHERE o.id = ou.organization_id
  AND o.used_minutes != COALESCE(ou.total_minutes, 0)
RETURNING
  o.id,
  o.name,
  o.used_minutes as new_used_minutes;

-- STEP 5: VERIFY THE FIX
-- =======================
SELECT '=== STEP 5: VERIFICATION ===' as step;

-- Check if any calls still have wrong duration_minutes
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✅ All calls fixed!'
    ELSE '❌ ' || COUNT(*) || ' calls still have wrong duration_minutes'
  END as status,
  COUNT(*) as remaining_issues
FROM calls
WHERE duration IS NOT NULL
  AND duration > 0
  AND duration_minutes IS NOT NULL
  AND status = 'completed'
  AND duration_minutes > CEIL(duration::numeric / 60) * 1.5;

-- Show specific fix for adeliyitomiwa@yahoo.com
SELECT
  'adeliyitomiwa@yahoo.com' as user,
  c.id,
  c.customer_name,
  c.duration as duration_seconds,
  c.duration_minutes as fixed_minutes,
  o.name as org_name,
  o.used_minutes as org_total_usage
FROM calls c
JOIN auth.users u ON c.user_id = u.id
LEFT JOIN organizations o ON c.organization_id = o.id
WHERE u.email = 'adeliyitomiwa@yahoo.com'
  AND c.status = 'completed'
ORDER BY c.processed_at DESC;

-- Show Karamo organization final status
SELECT
  'Karamo Organization Status' as description,
  o.name,
  o.plan_type,
  o.used_minutes as corrected_usage,
  (
    SELECT COUNT(*)
    FROM calls
    WHERE organization_id = o.id
      AND status = 'completed'
  ) as total_calls,
  (
    SELECT SUM(duration_minutes)
    FROM calls
    WHERE organization_id = o.id
      AND status = 'completed'
  ) as sum_of_call_minutes
FROM organizations o
WHERE LOWER(o.name) LIKE '%karamo%';