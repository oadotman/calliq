-- =====================================================
-- DATABASE INVESTIGATION SCRIPT
-- Let's understand the actual database structure first
-- =====================================================

-- 1. Check the usage_metrics table structure and constraints
\echo '========================================='
\echo '1. USAGE_METRICS TABLE STRUCTURE'
\echo '========================================='

-- Get table definition
\d usage_metrics

-- Check constraints specifically
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'usage_metrics'::regclass;

-- 2. Check what metric_type values are actually allowed
\echo ''
\echo '========================================='
\echo '2. ALLOWED METRIC_TYPE VALUES'
\echo '========================================='

-- Get the check constraint definition for metric_type
SELECT
    pg_get_constraintdef(oid) AS allowed_values
FROM pg_constraint
WHERE conrelid = 'usage_metrics'::regclass
  AND conname LIKE '%metric_type%';

-- 3. See what metric_type values are actually being used
\echo ''
\echo '========================================='
\echo '3. ACTUAL METRIC_TYPE VALUES IN USE'
\echo '========================================='

SELECT
    metric_type,
    COUNT(*) as count,
    MIN(created_at) as first_used,
    MAX(created_at) as last_used
FROM usage_metrics
GROUP BY metric_type
ORDER BY count DESC;

-- 4. Check organizations table structure
\echo ''
\echo '========================================='
\echo '4. ORGANIZATIONS TABLE STRUCTURE'
\echo '========================================='

-- Get relevant columns
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'organizations'
  AND column_name IN (
    'id', 'name', 'plan_type',
    'max_minutes_monthly', 'used_minutes',
    'overage_minutes_purchased',
    'current_period_start', 'current_period_end',
    'created_at', 'updated_at'
  )
ORDER BY ordinal_position;

-- 5. Check current state of organizations
\echo ''
\echo '========================================='
\echo '5. CURRENT ORGANIZATIONS STATE'
\echo '========================================='

SELECT
    name,
    plan_type,
    max_minutes_monthly,
    used_minutes,
    overage_minutes_purchased,
    DATE(current_period_start) as period_start,
    DATE(current_period_end) as period_end,
    CASE
        WHEN current_period_start IS NULL THEN 'NO PERIOD SET'
        WHEN DATE_TRUNC('month', current_period_start::date) = DATE_TRUNC('month', NOW()) THEN 'CURRENT'
        ELSE 'OUTDATED'
    END as period_status
FROM organizations
ORDER BY created_at DESC
LIMIT 10;

-- 6. Check usage_metrics required fields
\echo ''
\echo '========================================='
\echo '6. USAGE_METRICS REQUIRED FIELDS'
\echo '========================================='

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'usage_metrics'
ORDER BY ordinal_position;

-- 7. Sample of recent usage_metrics records
\echo ''
\echo '========================================='
\echo '7. RECENT USAGE_METRICS RECORDS'
\echo '========================================='

SELECT
    id,
    organization_id,
    user_id,
    metric_type,
    metric_value,
    cost_cents,
    LEFT(metadata::text, 100) as metadata_sample,
    created_at
FROM usage_metrics
ORDER BY created_at DESC
LIMIT 10;

-- 8. Check for existing functions
\echo ''
\echo '========================================='
\echo '8. EXISTING FUNCTIONS'
\echo '========================================='

SELECT
    proname as function_name,
    pronargs as arg_count
FROM pg_proc
WHERE proname IN ('increment_used_minutes', 'get_accurate_usage')
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 9. Check for organizations with usage mismatches
\echo ''
\echo '========================================='
\echo '9. USAGE MISMATCHES'
\echo '========================================='

WITH period_usage AS (
    SELECT
        o.id,
        o.name,
        o.used_minutes,
        o.current_period_start,
        o.current_period_end,
        COALESCE(SUM(
            CASE
                WHEN um.metric_type = 'minutes_transcribed'
                 AND um.created_at >= COALESCE(o.current_period_start, DATE_TRUNC('month', NOW()))
                 AND um.created_at <= COALESCE(o.current_period_end, DATE_TRUNC('month', NOW()) + INTERVAL '1 month')
                THEN um.metric_value
                ELSE 0
            END
        ), 0) as calculated_usage
    FROM organizations o
    LEFT JOIN usage_metrics um ON um.organization_id = o.id
    GROUP BY o.id, o.name, o.used_minutes, o.current_period_start, o.current_period_end
)
SELECT
    name,
    used_minutes as column_value,
    calculated_usage as metrics_value,
    ABS(COALESCE(used_minutes, 0) - calculated_usage) as difference
FROM period_usage
WHERE ABS(COALESCE(used_minutes, 0) - calculated_usage) > 0
ORDER BY difference DESC
LIMIT 10;

-- 10. Check calls table relationship
\echo ''
\echo '========================================='
\echo '10. CALLS TABLE USAGE TRACKING'
\echo '========================================='

SELECT
    COUNT(*) as total_calls,
    COUNT(organization_id) as calls_with_org,
    COUNT(CASE WHEN organization_id IS NULL THEN 1 END) as calls_without_org,
    COUNT(duration) as calls_with_duration,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_calls
FROM calls
WHERE created_at >= NOW() - INTERVAL '30 days';