-- Diagnostic SQL to check duration issues

-- 1. Check recent calls and their durations
SELECT
    id,
    customer_name,
    duration,
    duration_minutes,
    status,
    created_at
FROM calls
WHERE status = 'completed'
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check usage_metrics for call_minutes
SELECT
    id,
    organization_id,
    metric_type,
    metric_value,
    created_at,
    metadata->>'call_id' as call_id
FROM usage_metrics
WHERE metric_type = 'call_minutes'
ORDER BY created_at DESC
LIMIT 10;

-- 3. Find calls with 0 or NULL duration that are completed
SELECT
    id,
    customer_name,
    duration,
    duration_minutes,
    status
FROM calls
WHERE status = 'completed'
  AND (duration IS NULL OR duration = 0 OR duration_minutes IS NULL OR duration_minutes = 0)
LIMIT 10;

-- 4. Check if there's a mismatch between duration calculation
SELECT
    id,
    duration,
    duration_minutes,
    CEIL(duration::numeric / 60) as calculated_minutes,
    status
FROM calls
WHERE duration IS NOT NULL
  AND duration > 0
  AND duration_minutes != CEIL(duration::numeric / 60)
LIMIT 10;