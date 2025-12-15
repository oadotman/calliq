-- =====================================================
-- FIX MISSING DURATION VALUES IN CALLS
-- =====================================================

-- 1. First, let's check which calls have transcripts with audio_duration
SELECT '=== CALLS WITH MISSING DURATION BUT HAVE TRANSCRIPT DURATION ===' as section;
SELECT
  c.id,
  c.file_name,
  c.duration,
  c.duration_minutes,
  t.audio_duration as transcript_audio_duration_seconds,
  ROUND(t.audio_duration / 60) as transcript_duration_minutes
FROM calls c
JOIN transcripts t ON t.call_id = c.id
WHERE c.organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041'
  AND (c.duration IS NULL OR c.duration_minutes IS NULL)
  AND t.audio_duration IS NOT NULL
LIMIT 20;

-- 2. Update calls with missing duration from transcript audio_duration
-- IMPORTANT: Review the results above before running this update!
/*
UPDATE calls c
SET
  duration = ROUND(t.audio_duration),
  duration_minutes = ROUND(t.audio_duration / 60),
  updated_at = NOW()
FROM transcripts t
WHERE t.call_id = c.id
  AND c.organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041'
  AND (c.duration IS NULL OR c.duration_minutes IS NULL)
  AND t.audio_duration IS NOT NULL;
*/

-- 3. For calls without transcript audio_duration, estimate from file size
-- Average bitrate for audio files is typically 128 kbps (16 KB/s)
SELECT '=== CALLS WITHOUT ANY DURATION DATA ===' as section;
SELECT
  c.id,
  c.file_name,
  c.file_size,
  c.mime_type,
  -- Estimate duration based on file size (assuming 128 kbps bitrate)
  ROUND(c.file_size / 16000) as estimated_duration_seconds,
  ROUND(c.file_size / 16000 / 60) as estimated_duration_minutes
FROM calls c
LEFT JOIN transcripts t ON t.call_id = c.id
WHERE c.organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041'
  AND c.duration IS NULL
  AND c.duration_minutes IS NULL
  AND (t.audio_duration IS NULL OR t.id IS NULL)
LIMIT 20;

-- 4. Update calls with estimated duration based on file size
-- Only use this as a last resort for calls without any duration data
/*
UPDATE calls
SET
  duration = GREATEST(60, ROUND(file_size / 16000)), -- Minimum 60 seconds
  duration_minutes = GREATEST(1, ROUND(file_size / 16000 / 60)), -- Minimum 1 minute
  updated_at = NOW()
WHERE organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041'
  AND duration IS NULL
  AND duration_minutes IS NULL
  AND file_size > 0;
*/

-- 5. Check results after updates
SELECT '=== DURATION STATUS AFTER FIXES ===' as section;
SELECT
  COUNT(*) as total_calls,
  COUNT(duration) as calls_with_duration,
  COUNT(duration_minutes) as calls_with_duration_minutes,
  COUNT(*) - COUNT(duration) as still_missing_duration,
  ROUND((COUNT(duration)::numeric / COUNT(*)) * 100, 2) as duration_coverage_percent
FROM calls
WHERE organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041';

-- 6. Verify the analytics metrics would be correct
SELECT '=== ANALYTICS METRICS CHECK ===' as section;
SELECT
  COUNT(*) as total_calls,
  COUNT(*) * 15 as total_minutes_saved,
  ROUND(COUNT(*) * 15 / 60.0, 1) as total_hours_saved,
  ROUND(AVG(duration / 60.0), 1) as avg_call_duration_minutes,
  COUNT(DISTINCT sales_rep) as unique_sales_reps,
  ROUND(AVG(sentiment_score), 2) as avg_sentiment_score
FROM calls
WHERE organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041'
  AND created_at >= DATE_TRUNC('month', NOW())
  AND deleted_at IS NULL;

-- =====================================================
-- INSTRUCTIONS:
-- 1. Run sections 1-3 first to analyze the data
-- 2. Review the results carefully
-- 3. Uncomment and run the UPDATE statements (sections 2 and 4) if the data looks correct
-- 4. Run sections 5-6 to verify the fixes
-- =====================================================