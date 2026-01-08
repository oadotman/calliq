-- =====================================================
-- COMPREHENSIVE FIX FOR DURATION ISSUES
-- =====================================================

-- STEP 1: Identify and fix calls with incorrect durations
-- Use the transcript's audio_duration as the source of truth
-- =========================================================

BEGIN;

-- First, let's see what we're about to fix
SELECT
  'BEFORE FIX - Calls with wrong duration' as status,
  COUNT(*) as affected_calls,
  SUM(c.duration_minutes) as wrong_total_minutes,
  SUM(CEIL(t.audio_duration / 60)) as correct_total_minutes,
  SUM(c.duration_minutes) - SUM(CEIL(t.audio_duration / 60)) as overcharged_minutes
FROM calls c
JOIN transcripts t ON t.call_id = c.id
WHERE c.status = 'completed'
  AND t.audio_duration IS NOT NULL
  AND (
    -- Case 1: duration doesn't match transcript
    c.duration != ROUND(t.audio_duration)
    -- Case 2: duration_minutes is wrong
    OR c.duration_minutes != CEIL(t.audio_duration / 60)
  );

-- Fix the calls table using transcript as source of truth
UPDATE calls c
SET
  duration = ROUND(t.audio_duration),
  duration_minutes = CEIL(t.audio_duration / 60)
FROM transcripts t
WHERE t.call_id = c.id
  AND c.status = 'completed'
  AND t.audio_duration IS NOT NULL
  AND (
    c.duration != ROUND(t.audio_duration)
    OR c.duration_minutes != CEIL(t.audio_duration / 60)
  );

-- Fix usage_metrics to match corrected calls
WITH corrected_calls AS (
  SELECT
    c.id::text as call_id,
    c.duration_minutes as correct_minutes
  FROM calls c
  WHERE c.status = 'completed'
    AND c.duration_minutes IS NOT NULL
)
UPDATE usage_metrics um
SET metric_value = cc.correct_minutes::numeric
FROM corrected_calls cc
WHERE um.metadata->>'call_id' = cc.call_id
  AND um.metric_type = 'minutes_transcribed'
  AND um.metric_value != cc.correct_minutes::numeric;

-- Recalculate organization used_minutes
WITH org_totals AS (
  SELECT
    organization_id,
    SUM(metric_value) as total_minutes
  FROM usage_metrics
  WHERE metric_type = 'minutes_transcribed'
  GROUP BY organization_id
)
UPDATE organizations o
SET used_minutes = COALESCE(ot.total_minutes, 0)::integer
FROM org_totals ot
WHERE o.id = ot.organization_id
  AND o.used_minutes != COALESCE(ot.total_minutes, 0)::integer;

-- Verify the fix
SELECT
  'AFTER FIX - Verification' as status,
  COUNT(*) as remaining_issues
FROM calls c
JOIN transcripts t ON t.call_id = c.id
WHERE c.status = 'completed'
  AND t.audio_duration IS NOT NULL
  AND (
    c.duration != ROUND(t.audio_duration)
    OR c.duration_minutes != CEIL(t.audio_duration / 60)
  );

-- Show specific results for affected users
SELECT
  u.email,
  COUNT(c.id) as calls_fixed,
  SUM(old_values.old_minutes) as old_total_minutes,
  SUM(c.duration_minutes) as new_total_minutes,
  SUM(old_values.old_minutes) - SUM(c.duration_minutes) as minutes_refunded
FROM calls c
JOIN auth.users u ON c.user_id = u.id
JOIN transcripts t ON t.call_id = c.id
JOIN LATERAL (
  SELECT
    c2.duration_minutes as old_minutes
  FROM calls c2
  WHERE c2.id = c.id
) old_values ON true
WHERE u.email IN ('adeliyitomiwa@yahoo.com', 'adeiyitomiwa@yahoo.com')
  OR c.id IN (
    SELECT c3.id
    FROM calls c3
    JOIN transcripts t3 ON t3.call_id = c3.id
    WHERE c3.duration != ROUND(t3.audio_duration)
      OR c3.duration_minutes != CEIL(t3.audio_duration / 60)
  )
GROUP BY u.email;

COMMIT;

-- STEP 2: Create a function to prevent this in the future
-- ========================================================

-- Drop if exists
DROP FUNCTION IF EXISTS fix_call_duration_from_transcript CASCADE;

-- Create function to fix duration based on transcript
CREATE OR REPLACE FUNCTION fix_call_duration_from_transcript()
RETURNS TRIGGER AS $$
BEGIN
  -- If transcript has audio_duration, update the call
  IF NEW.audio_duration IS NOT NULL THEN
    UPDATE calls
    SET
      duration = ROUND(NEW.audio_duration),
      duration_minutes = CEIL(NEW.audio_duration / 60)
    WHERE id = NEW.call_id
      AND (
        duration IS NULL
        OR duration != ROUND(NEW.audio_duration)
        OR duration_minutes IS NULL
        OR duration_minutes != CEIL(NEW.audio_duration / 60)
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-fix durations when transcripts are inserted/updated
DROP TRIGGER IF EXISTS auto_fix_call_duration ON transcripts;

CREATE TRIGGER auto_fix_call_duration
AFTER INSERT OR UPDATE OF audio_duration ON transcripts
FOR EACH ROW
EXECUTE FUNCTION fix_call_duration_from_transcript();

-- STEP 3: Final summary
-- =====================

SELECT
  'FINAL SUMMARY' as report,
  o.name as organization,
  o.plan_type,
  o.used_minutes as corrected_used_minutes,
  COUNT(c.id) as total_calls,
  SUM(c.duration_minutes) as total_call_minutes
FROM organizations o
LEFT JOIN calls c ON c.organization_id = o.id AND c.status = 'completed'
WHERE o.name LIKE '%Karamo%'
  OR o.id IN (
    SELECT organization_id
    FROM user_organizations
    WHERE user_id IN (
      SELECT id FROM auth.users
      WHERE email IN ('adeliyitomiwa@yahoo.com', 'adeiyitomiwa@yahoo.com')
    )
  )
GROUP BY o.id, o.name, o.plan_type, o.used_minutes;