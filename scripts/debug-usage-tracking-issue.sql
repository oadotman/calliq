-- =====================================================
-- DEBUG: USAGE TRACKING ISSUE
-- Why aren't minutes being deducted after transcription?
-- =====================================================

-- 1. Check the most recent call that was transcribed
SELECT
  'MOST RECENT TRANSCRIBED CALL' as report,
  c.id,
  c.customer_name,
  c.status,
  c.duration,
  c.duration_minutes,
  c.organization_id,
  c.user_id,
  c.processed_at,
  c.created_at,
  o.name as org_name,
  o.used_minutes as org_used_minutes,
  o.max_minutes_monthly as org_max_minutes,
  (o.max_minutes_monthly - o.used_minutes) as minutes_remaining
FROM calls c
LEFT JOIN organizations o ON c.organization_id = o.id
WHERE c.status = 'completed'
ORDER BY c.processed_at DESC
LIMIT 5;

-- 2. Check if usage_metrics records exist for recent calls
SELECT
  'USAGE METRICS FOR RECENT CALLS' as report,
  um.id,
  um.organization_id,
  um.metric_type,
  um.metric_value,
  um.metadata->>'call_id' as call_id,
  um.created_at,
  o.name as org_name,
  o.used_minutes as org_current_used_minutes
FROM usage_metrics um
LEFT JOIN organizations o ON um.organization_id = o.id
WHERE um.metric_type = 'minutes_transcribed'
ORDER BY um.created_at DESC
LIMIT 10;

-- 3. Check for calls without organization_id
SELECT
  'CALLS WITHOUT ORGANIZATION' as report,
  c.id,
  c.customer_name,
  c.status,
  c.duration_minutes,
  c.user_id,
  c.processed_at,
  u.email as user_email,
  uo.organization_id as user_org_id,
  o.name as user_org_name
FROM calls c
LEFT JOIN auth.users u ON c.user_id = u.id
LEFT JOIN user_organizations uo ON uo.user_id = c.user_id
LEFT JOIN organizations o ON uo.organization_id = o.id
WHERE c.organization_id IS NULL
  AND c.status = 'completed'
ORDER BY c.processed_at DESC;

-- 4. Check specific user's organization (from the console logs)
SELECT
  'USER ORGANIZATION CHECK' as report,
  u.id as user_id,
  u.email,
  uo.organization_id,
  uo.role,
  o.name as org_name,
  o.plan_type,
  o.used_minutes,
  o.max_minutes_monthly,
  (o.max_minutes_monthly - o.used_minutes) as minutes_remaining
FROM auth.users u
LEFT JOIN user_organizations uo ON u.id = uo.user_id
LEFT JOIN organizations o ON uo.organization_id = o.id
WHERE u.id = '3bc923c3-e09e-4e86-8e1a-d7cd05e4e1c8';

-- 5. Check the specific call from the console logs
SELECT
  'SPECIFIC CALL CHECK' as report,
  c.*,
  o.name as org_name,
  o.used_minutes as org_used_minutes
FROM calls c
LEFT JOIN organizations o ON c.organization_id = o.id
WHERE c.id = '1fc4e0ca-9fcc-4160-8118-8a7964b5af1b';

-- 6. Check if there's a usage_metrics entry for this specific call
SELECT
  'USAGE METRICS FOR SPECIFIC CALL' as report,
  um.*,
  o.name as org_name,
  o.used_minutes as org_current_used
FROM usage_metrics um
LEFT JOIN organizations o ON um.organization_id = o.id
WHERE um.metadata->>'call_id' = '1fc4e0ca-9fcc-4160-8118-8a7964b5af1b';

-- 7. Calculate what the total SHOULD be vs what it IS
WITH call_totals AS (
  SELECT
    organization_id,
    SUM(duration_minutes) as total_minutes_from_calls
  FROM calls
  WHERE status = 'completed'
    AND organization_id IS NOT NULL
    AND duration_minutes IS NOT NULL
  GROUP BY organization_id
),
metric_totals AS (
  SELECT
    organization_id,
    SUM(metric_value) as total_minutes_from_metrics
  FROM usage_metrics
  WHERE metric_type = 'minutes_transcribed'
  GROUP BY organization_id
)
SELECT
  'USAGE DISCREPANCY CHECK' as report,
  o.id,
  o.name,
  o.used_minutes as org_table_used_minutes,
  ct.total_minutes_from_calls,
  mt.total_minutes_from_metrics,
  (ct.total_minutes_from_calls - o.used_minutes) as discrepancy_calls_vs_org,
  (mt.total_minutes_from_metrics - o.used_minutes) as discrepancy_metrics_vs_org
FROM organizations o
LEFT JOIN call_totals ct ON o.id = ct.organization_id
LEFT JOIN metric_totals mt ON o.id = mt.organization_id
WHERE o.used_minutes > 0
   OR ct.total_minutes_from_calls > 0
   OR mt.total_minutes_from_metrics > 0
ORDER BY o.name;

-- 8. Check if there are any database triggers that might be interfering
SELECT
  'DATABASE TRIGGERS' as report,
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgtype,
  tgenabled
FROM pg_trigger
WHERE tgrelid::regclass::text IN ('organizations', 'usage_metrics', 'calls')
  AND NOT tgisinternal
ORDER BY table_name, trigger_name;

-- 9. Check recent organization updates
SELECT
  'RECENT ORG UPDATES' as report,
  id,
  name,
  used_minutes,
  updated_at,
  (updated_at AT TIME ZONE 'UTC') as updated_utc
FROM organizations
WHERE updated_at > NOW() - INTERVAL '24 hours'
ORDER BY updated_at DESC;