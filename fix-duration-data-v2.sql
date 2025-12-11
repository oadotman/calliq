-- Fixed SQL script for duration issues
-- First, let's check what metric_types are allowed

-- 1. Check current metric types in use
SELECT DISTINCT metric_type, COUNT(*) as count
FROM usage_metrics
GROUP BY metric_type
ORDER BY metric_type;

-- 2. Update calls that have audio_duration in transcripts but missing duration_minutes
UPDATE calls c
SET
    duration = COALESCE(c.duration, ROUND(t.audio_duration::numeric / 1000)),
    duration_minutes = COALESCE(c.duration_minutes, CEIL(t.audio_duration::numeric / 1000 / 60))
FROM transcripts t
WHERE c.id = t.call_id
  AND t.audio_duration IS NOT NULL
  AND t.audio_duration > 0
  AND (c.duration IS NULL OR c.duration_minutes IS NULL OR c.duration = 0);

-- 3. Fix any mismatched duration_minutes calculations
UPDATE calls
SET duration_minutes = CEIL(duration::numeric / 60)
WHERE duration IS NOT NULL
  AND duration > 0
  AND (duration_minutes IS NULL OR duration_minutes != CEIL(duration::numeric / 60));

-- 4. Update the VALUE of existing minutes_transcribed records instead of changing type
-- This preserves the constraint while fixing the tracking
UPDATE usage_metrics um
SET
    metric_value = c.duration_minutes,
    metadata = jsonb_set(
        COALESCE(um.metadata, '{}'::jsonb),
        '{fixed_duration}',
        'true'::jsonb
    )
FROM calls c
WHERE um.metadata->>'call_id' = c.id::text
  AND um.metric_type = 'minutes_transcribed'
  AND c.duration_minutes IS NOT NULL
  AND c.duration_minutes > 0
  AND um.metric_value != c.duration_minutes;

-- 5. For calls with call_processed=1, update the value to actual minutes
UPDATE usage_metrics um
SET
    metric_value = c.duration_minutes,
    metadata = jsonb_set(
        jsonb_set(
            COALESCE(um.metadata, '{}'::jsonb),
            '{duration_minutes}',
            to_jsonb(c.duration_minutes)
        ),
        '{fixed_from_call_processed}',
        'true'::jsonb
    )
FROM calls c
WHERE um.metadata->>'call_id' = c.id::text
  AND um.metric_type = 'call_processed'
  AND um.metric_value = 1
  AND c.duration_minutes IS NOT NULL
  AND c.duration_minutes > 0;

-- 6. For completed calls that don't have any usage tracking, add minutes_transcribed records
INSERT INTO usage_metrics (
    organization_id,
    user_id,
    metric_type,
    metric_value,
    metadata,
    created_at
)
SELECT
    c.organization_id,
    c.user_id,
    'minutes_transcribed', -- Use the allowed metric type
    c.duration_minutes,
    jsonb_build_object(
        'call_id', c.id,
        'duration_seconds', c.duration,
        'duration_minutes', c.duration_minutes,
        'customer_name', c.customer_name,
        'sales_rep', c.sales_rep,
        'migrated', true
    ),
    COALESCE(c.processed_at, c.created_at)
FROM calls c
WHERE c.status = 'completed'
  AND c.duration_minutes IS NOT NULL
  AND c.duration_minutes > 0
  AND c.organization_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM usage_metrics um
    WHERE um.metadata->>'call_id' = c.id::text
      AND (um.metric_type = 'minutes_transcribed' OR um.metric_type = 'call_processed')
  );

-- 7. Summary of fixes
SELECT
    'Calls with updated duration' as fix_type,
    COUNT(*) as count
FROM calls
WHERE duration IS NOT NULL AND duration_minutes IS NOT NULL
UNION ALL
SELECT
    'Usage metrics - minutes_transcribed',
    COUNT(*)
FROM usage_metrics
WHERE metric_type = 'minutes_transcribed'
UNION ALL
SELECT
    'Usage metrics - call_processed with minutes',
    COUNT(*)
FROM usage_metrics
WHERE metric_type = 'call_processed' AND metric_value > 1
UNION ALL
SELECT
    'Completed calls still missing duration',
    COUNT(*)
FROM calls
WHERE status = 'completed'
  AND (duration IS NULL OR duration = 0 OR duration_minutes IS NULL OR duration_minutes = 0);