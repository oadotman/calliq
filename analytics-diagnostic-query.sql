-- =====================================================
-- ANALYTICS DIAGNOSTIC QUERY
-- Run this in Supabase SQL Editor to check analytics data
-- =====================================================

-- 1. CHECK ORGANIZATION AND USERS
SELECT '=== ORGANIZATION OVERVIEW ===' as section;
SELECT
  o.id,
  o.name,
  o.plan_type,
  o.max_minutes_monthly,
  o.used_minutes,
  o.created_at,
  COUNT(DISTINCT uo.user_id) as member_count
FROM organizations o
LEFT JOIN user_organizations uo ON uo.organization_id = o.id
WHERE o.name = 'Karamo'
GROUP BY o.id, o.name, o.plan_type, o.max_minutes_monthly, o.used_minutes, o.created_at
LIMIT 1;

-- 2. CHECK CALLS DATA (Last 30 days)
SELECT '=== CALLS DATA (Last 30 days) ===' as section;
SELECT
  COUNT(*) as total_calls,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT sales_rep) as unique_reps,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_calls,
  SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing_calls,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_calls,
  AVG(duration_minutes) as avg_duration_minutes,
  SUM(duration_minutes) as total_duration_minutes
FROM calls
WHERE organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041'
  AND created_at >= NOW() - INTERVAL '30 days';

-- 3. CHECK SENTIMENT DATA
SELECT '=== SENTIMENT DATA ===' as section;
SELECT
  sentiment_type,
  COUNT(*) as count,
  AVG(sentiment_score) as avg_score
FROM calls
WHERE organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041'
  AND created_at >= NOW() - INTERVAL '30 days'
  AND sentiment_type IS NOT NULL
GROUP BY sentiment_type;

-- 4. CHECK SALES REP DISTRIBUTION
SELECT '=== SALES REP ACTIVITY ===' as section;
SELECT
  sales_rep,
  COUNT(*) as call_count,
  AVG(duration_minutes) as avg_duration,
  AVG(sentiment_score) as avg_sentiment
FROM calls
WHERE organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041'
  AND created_at >= NOW() - INTERVAL '30 days'
  AND sales_rep IS NOT NULL
GROUP BY sales_rep
ORDER BY call_count DESC
LIMIT 10;

-- 5. CHECK CALL INSIGHTS DATA
SELECT '=== CALL INSIGHTS OVERVIEW ===' as section;
SELECT
  ci.insight_type,
  COUNT(*) as insight_count
FROM call_insights ci
JOIN calls c ON c.id = ci.call_id
WHERE c.organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041'
  AND c.created_at >= NOW() - INTERVAL '30 days'
GROUP BY ci.insight_type;

-- 6. MONTHLY BREAKDOWN (Last 6 months)
SELECT '=== MONTHLY CALL BREAKDOWN ===' as section;
SELECT
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as call_count,
  AVG(duration_minutes) as avg_duration,
  SUM(duration_minutes) as total_minutes,
  COUNT(DISTINCT user_id) as active_users
FROM calls
WHERE organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041'
  AND created_at >= NOW() - INTERVAL '6 months'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- 7. CHECK FOR NULL/MISSING VALUES
SELECT '=== DATA QUALITY CHECK ===' as section;
SELECT
  COUNT(*) as total_calls,
  SUM(CASE WHEN c.duration_minutes IS NULL THEN 1 ELSE 0 END) as missing_duration,
  SUM(CASE WHEN c.sentiment_score IS NULL THEN 1 ELSE 0 END) as missing_sentiment,
  SUM(CASE WHEN c.sentiment_type IS NULL THEN 1 ELSE 0 END) as missing_sentiment_type,
  SUM(CASE WHEN c.sales_rep IS NULL THEN 1 ELSE 0 END) as missing_sales_rep,
  SUM(CASE WHEN t.id IS NULL THEN 1 ELSE 0 END) as missing_transcript
FROM calls c
LEFT JOIN transcripts t ON t.call_id = c.id
WHERE c.organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041'
  AND c.created_at >= NOW() - INTERVAL '30 days';

-- 8. CHECK RECENT CALLS (Last 7 days)
SELECT '=== RECENT CALLS (Last 7 days) ===' as section;
SELECT
  id,
  created_at,
  status,
  duration_minutes,
  sentiment_score,
  sentiment_type,
  sales_rep,
  file_name
FROM calls
WHERE organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041'
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 10;

-- 9. CHECK IF USER HAS ACCESS TO CALLS
SELECT '=== USER ACCESS CHECK ===' as section;
SELECT
  c.id,
  c.created_at,
  c.user_id,
  u.email as user_email,
  c.organization_id,
  o.name as org_name
FROM calls c
LEFT JOIN auth.users u ON u.id = c.user_id
LEFT JOIN organizations o ON o.id = c.organization_id
WHERE c.organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041'
  AND c.created_at >= NOW() - INTERVAL '7 days'
ORDER BY c.created_at DESC
LIMIT 5;

-- 10. CHECK ANALYTICS PAGE SPECIFIC FIELDS
SELECT '=== ANALYTICS FIELDS CHECK ===' as section;
SELECT
  COUNT(*) as total_calls,
  -- Fields used for Time Saved calculation (15 min per call)
  COUNT(*) * 15 / 60.0 as estimated_hours_saved,
  -- Fields for sentiment
  AVG(sentiment_score) as avg_sentiment_score,
  -- Fields for active reps
  COUNT(DISTINCT sales_rep) as unique_sales_reps,
  -- Fields for call duration
  AVG(duration) as avg_duration_seconds,
  AVG(duration / 60.0) as avg_duration_minutes
FROM calls
WHERE organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041'
  AND created_at >= DATE_TRUNC('month', NOW())
  AND created_at <= DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 second';

-- 11. SAMPLE CALL INSIGHTS TEXT
SELECT '=== SAMPLE INSIGHTS TEXT ===' as section;
SELECT
  ci.insight_type,
  ci.insight_text,
  c.created_at
FROM call_insights ci
JOIN calls c ON c.id = ci.call_id
WHERE c.organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041'
  AND c.created_at >= NOW() - INTERVAL '7 days'
LIMIT 10;

-- 12. CHECK TRANSCRIPTS EXISTENCE
SELECT '=== TRANSCRIPTS CHECK ===' as section;
SELECT
  COUNT(DISTINCT c.id) as total_calls,
  COUNT(DISTINCT t.id) as calls_with_transcripts,
  COUNT(DISTINCT c.id) - COUNT(DISTINCT t.id) as calls_without_transcripts,
  ROUND((COUNT(DISTINCT t.id)::numeric / NULLIF(COUNT(DISTINCT c.id), 0)) * 100, 2) as transcript_percentage
FROM calls c
LEFT JOIN transcripts t ON t.call_id = c.id
WHERE c.organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041'
  AND c.created_at >= NOW() - INTERVAL '30 days';

-- 13. CHECK DURATION VALUES
SELECT '=== DURATION VALUES CHECK ===' as section;
SELECT
  COUNT(*) as total_calls,
  COUNT(duration) as calls_with_duration_seconds,
  COUNT(duration_minutes) as calls_with_duration_minutes,
  MIN(duration) as min_duration_seconds,
  MAX(duration) as max_duration_seconds,
  AVG(duration) as avg_duration_seconds,
  MIN(duration_minutes) as min_duration_minutes,
  MAX(duration_minutes) as max_duration_minutes,
  AVG(duration_minutes) as avg_duration_minutes
FROM calls
WHERE organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041'
  AND created_at >= NOW() - INTERVAL '30 days';

-- =====================================================
-- INTERPRETATION GUIDE:
--
-- 1. If "total_calls" = 0: No calls data exists
-- 2. If "missing_duration" is high: Duration not being set properly
-- 3. If "missing_sentiment" is high: Sentiment analysis not working
-- 4. If "unique_sales_reps" = 0: Sales rep field not being populated
-- 5. If no insights data: Call insights not being generated
--
-- The analytics page expects:
-- - calls.duration (in seconds)
-- - calls.duration_minutes (in minutes)
-- - calls.sentiment_score (numeric)
-- - calls.sentiment_type (text: positive/neutral/negative)
-- - calls.sales_rep (text)
-- - call_insights.insight_type and insight_text
-- =====================================================