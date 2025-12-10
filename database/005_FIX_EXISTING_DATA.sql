-- Fix existing data after constraint update
-- Run this AFTER running 004_FIX_USAGE_METRICS_CONSTRAINT.sql

-- Step 1: Update calls table with proper duration values from transcripts
UPDATE calls c
SET
    duration = CASE
        WHEN c.duration IS NULL OR c.duration = 0
        THEN ROUND(t.audio_duration::numeric / 1000)  -- Convert ms to seconds
        ELSE c.duration
    END,
    duration_minutes = CASE
        WHEN c.duration_minutes IS NULL OR c.duration_minutes = 0
        THEN CEIL((t.audio_duration::numeric / 1000) / 60)  -- Convert ms to minutes
        ELSE c.duration_minutes
    END
FROM transcripts t
WHERE c.id = t.call_id
  AND t.audio_duration IS NOT NULL
  AND t.audio_duration > 0
  AND (c.duration IS NULL OR c.duration = 0 OR c.duration_minutes IS NULL OR c.duration_minutes = 0);

-- Step 2: Fix any duration_minutes that don't match duration
UPDATE calls
SET duration_minutes = CEIL(duration::numeric / 60)
WHERE duration IS NOT NULL
  AND duration > 0
  AND (duration_minutes IS NULL OR duration_minutes = 0);

-- Step 3: Create usage_metrics records for completed calls that don't have them
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
    'minutes_transcribed',
    c.duration_minutes,
    jsonb_build_object(
        'call_id', c.id,
        'duration_seconds', c.duration,
        'duration_minutes', c.duration_minutes,
        'customer_name', c.customer_name,
        'sales_rep', c.sales_rep,
        'migrated', true,
        'migration_date', NOW()
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
      AND um.metric_type = 'minutes_transcribed'
  );

-- Step 4: Update any call_processed records that have value=1 to use minutes_transcribed
UPDATE usage_metrics um
SET
    metric_type = 'minutes_transcribed',
    metric_value = c.duration_minutes,
    metadata = jsonb_set(
        jsonb_set(
            COALESCE(um.metadata, '{}'::jsonb),
            '{duration_seconds}',
            to_jsonb(c.duration)
        ),
        '{duration_minutes}',
        to_jsonb(c.duration_minutes)
    )
FROM calls c
WHERE um.metadata->>'call_id' = c.id::text
  AND um.metric_type = 'call_processed'
  AND um.metric_value = 1
  AND c.duration_minutes IS NOT NULL
  AND c.duration_minutes > 0;

-- Step 5: Remove any duplicate entries (keep the one with highest metric_value)
DELETE FROM usage_metrics um1
WHERE EXISTS (
    SELECT 1
    FROM usage_metrics um2
    WHERE um2.metadata->>'call_id' = um1.metadata->>'call_id'
      AND um2.metric_type = um1.metric_type
      AND um2.id != um1.id
      AND um2.metric_value > um1.metric_value
);

-- Step 6: Summary report
WITH stats AS (
    SELECT
        COUNT(DISTINCT c.id) as total_calls,
        COUNT(DISTINCT CASE WHEN c.status = 'completed' THEN c.id END) as completed_calls,
        COUNT(DISTINCT CASE WHEN c.duration_minutes > 0 THEN c.id END) as calls_with_duration,
        COUNT(DISTINCT um.metadata->>'call_id') as calls_with_metrics
    FROM calls c
    LEFT JOIN usage_metrics um ON um.metadata->>'call_id' = c.id::text
        AND um.metric_type = 'minutes_transcribed'
    WHERE c.organization_id IS NOT NULL
)
SELECT
    'Total calls' as metric,
    total_calls as count
FROM stats
UNION ALL
SELECT
    'Completed calls',
    completed_calls
FROM stats
UNION ALL
SELECT
    'Calls with duration',
    calls_with_duration
FROM stats
UNION ALL
SELECT
    'Calls with usage metrics',
    calls_with_metrics
FROM stats
UNION ALL
SELECT
    'Total minutes tracked',
    COALESCE(SUM(metric_value), 0)::integer
FROM usage_metrics
WHERE metric_type = 'minutes_transcribed';