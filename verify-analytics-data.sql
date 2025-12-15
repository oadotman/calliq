-- =====================================================
-- VERIFY ANALYTICS PAGE DATA
-- Run this to confirm all data needed for analytics is present
-- =====================================================

-- 1. QUICK HEALTH CHECK
SELECT '=== ANALYTICS DATA HEALTH CHECK ===' as section;
SELECT
  COUNT(*) as total_calls,
  COUNT(duration_minutes) as calls_with_duration,
  COUNT(sentiment_score) as calls_with_sentiment,
  COUNT(sales_rep) as calls_with_sales_rep,
  ROUND(AVG(duration_minutes), 1) as avg_duration_minutes,
  ROUND(AVG(sentiment_score), 2) as avg_sentiment,
  COUNT(DISTINCT sales_rep) as unique_sales_reps
FROM calls
WHERE organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041'
  AND created_at >= DATE_TRUNC('month', NOW())
  AND deleted_at IS NULL;

-- 2. CURRENT MONTH METRICS (What the analytics page shows)
SELECT '=== CURRENT MONTH ANALYTICS METRICS ===' as section;
WITH current_month_data AS (
  SELECT
    COUNT(*) as call_count,
    COUNT(*) * 15 / 60.0 as hours_saved,
    AVG(sentiment_score) as avg_sentiment,
    COUNT(DISTINCT sales_rep) as active_reps,
    AVG(duration_minutes) as avg_call_length_minutes
  FROM calls
  WHERE organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041'
    AND created_at >= DATE_TRUNC('month', NOW())
    AND created_at < DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
    AND deleted_at IS NULL
)
SELECT
  ROUND(hours_saved, 1) as "Total Hours Saved",
  ROUND(avg_sentiment, 1) as "Avg Sentiment (0-10)",
  active_reps as "Active Sales Reps",
  ROUND(avg_call_length_minutes, 0) as "Avg Call Length (min)",
  call_count as "Total Calls This Month"
FROM current_month_data;

-- 3. SENTIMENT DISTRIBUTION
SELECT '=== SENTIMENT DISTRIBUTION ===' as section;
SELECT
  sentiment_type,
  COUNT(*) as count,
  ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER() * 100, 1) as percentage
FROM calls
WHERE organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041'
  AND created_at >= DATE_TRUNC('month', NOW())
  AND deleted_at IS NULL
  AND sentiment_type IS NOT NULL
GROUP BY sentiment_type
ORDER BY count DESC;

-- 4. TOP SALES REPS
SELECT '=== TOP 5 SALES REPS THIS MONTH ===' as section;
SELECT
  sales_rep,
  COUNT(*) as calls_processed,
  ROUND(AVG(duration_minutes), 1) as avg_duration_min,
  ROUND(AVG(sentiment_score), 2) as avg_sentiment
FROM calls
WHERE organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041'
  AND created_at >= DATE_TRUNC('month', NOW())
  AND deleted_at IS NULL
  AND sales_rep IS NOT NULL
GROUP BY sales_rep
ORDER BY calls_processed DESC
LIMIT 5;

-- 5. DATA COMPLETENESS PERCENTAGE
SELECT '=== DATA COMPLETENESS ===' as section;
WITH data_completeness AS (
  SELECT
    COUNT(*) as total,
    COUNT(duration_minutes) as has_duration,
    COUNT(sentiment_score) as has_sentiment,
    COUNT(sales_rep) as has_sales_rep,
    COUNT(t.id) as has_transcript
  FROM calls c
  LEFT JOIN transcripts t ON t.call_id = c.id
  WHERE c.organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041'
    AND c.deleted_at IS NULL
)
SELECT
  total as "Total Calls",
  ROUND(has_duration::numeric / total * 100, 1) || '%' as "Duration Coverage",
  ROUND(has_sentiment::numeric / total * 100, 1) || '%' as "Sentiment Coverage",
  ROUND(has_sales_rep::numeric / total * 100, 1) || '%' as "Sales Rep Coverage",
  ROUND(has_transcript::numeric / total * 100, 1) || '%' as "Transcript Coverage"
FROM data_completeness;

-- =====================================================
-- Expected Results:
-- ✅ All calls should have duration_minutes
-- ✅ Most calls should have sentiment scores
-- ✅ Sales rep field should be populated for most calls
-- ✅ Analytics page can now calculate all metrics properly
-- =====================================================