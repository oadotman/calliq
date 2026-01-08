-- =====================================================
-- DIAGNOSE THE DURATION ISSUE
-- =====================================================

-- 1. Check actual transcript durations vs call durations
SELECT
  c.id as call_id,
  c.customer_name,
  c.user_id,
  c.duration as call_duration_field,
  c.duration_minutes as call_duration_minutes_field,
  t.audio_duration as transcript_audio_duration,
  -- Calculate what the minutes SHOULD be if transcript is in seconds
  CEIL(t.audio_duration / 60) as expected_minutes_from_transcript,
  -- Compare to what's actually stored
  c.duration_minutes - CEIL(t.audio_duration / 60) as difference,
  c.processed_at
FROM calls c
JOIN transcripts t ON t.call_id = c.id
WHERE c.status = 'completed'
  AND t.audio_duration IS NOT NULL
ORDER BY c.processed_at DESC
LIMIT 20;

-- 2. Check if there's a pattern in the transcript audio_duration values
SELECT
  MIN(audio_duration) as min_duration,
  MAX(audio_duration) as max_duration,
  AVG(audio_duration) as avg_duration,
  COUNT(*) as total_transcripts,
  -- Check if values look like seconds (large numbers) or minutes (small numbers)
  CASE
    WHEN AVG(audio_duration) > 100 THEN 'Likely in SECONDS (normal)'
    WHEN AVG(audio_duration) < 20 THEN 'Likely in MINUTES (PROBLEM!)'
    ELSE 'Unclear'
  END as duration_unit_guess
FROM transcripts
WHERE audio_duration IS NOT NULL;

-- 3. Find specific problematic case for adeliyitomiwa@yahoo.com
SELECT
  c.id,
  c.customer_name,
  u.email,
  c.duration as stored_duration,
  c.duration_minutes as stored_minutes,
  t.audio_duration as transcript_duration,
  t.assemblyai_id,
  c.file_name,
  c.file_size,
  c.processed_at
FROM calls c
JOIN auth.users u ON c.user_id = u.id
LEFT JOIN transcripts t ON t.call_id = c.id
WHERE u.email = 'adeliyitomiwa@yahoo.com'
ORDER BY c.processed_at DESC;

-- 4. Check if problem is consistent or sporadic
WITH duration_analysis AS (
  SELECT
    c.id,
    c.duration,
    c.duration_minutes,
    t.audio_duration,
    CASE
      WHEN c.duration = t.audio_duration THEN 'Match (both same unit)'
      WHEN c.duration = ROUND(t.audio_duration * 60) THEN 'Duration stored as minutes * 60'
      WHEN c.duration_minutes = ROUND(t.audio_duration) THEN 'Minutes = transcript value (WRONG if transcript is seconds)'
      WHEN c.duration_minutes = CEIL(t.audio_duration / 60) THEN 'Correct conversion'
      ELSE 'Other pattern'
    END as pattern,
    c.processed_at
  FROM calls c
  JOIN transcripts t ON t.call_id = c.id
  WHERE c.status = 'completed'
    AND t.audio_duration IS NOT NULL
)
SELECT
  pattern,
  COUNT(*) as count,
  MIN(processed_at) as first_occurrence,
  MAX(processed_at) as last_occurrence
FROM duration_analysis
GROUP BY pattern
ORDER BY count DESC;