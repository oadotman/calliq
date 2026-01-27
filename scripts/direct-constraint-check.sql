-- =====================================================
-- DIRECT CHECK OF METRIC_TYPE CONSTRAINTS
-- =====================================================

-- 1. Get the raw constraint definition
SELECT
    conname as constraint_name,
    pg_get_constraintdef(oid) as full_definition
FROM pg_constraint
WHERE conrelid = 'usage_metrics'::regclass
AND contype = 'c';

-- 2. Show what values are actually being used successfully
SELECT
    DISTINCT metric_type,
    COUNT(*) as usage_count
FROM usage_metrics
GROUP BY metric_type
ORDER BY metric_type;

-- 3. Try to see the column definition another way
SELECT
    a.attname as column_name,
    pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
    a.attnotnull as not_null
FROM pg_attribute a
WHERE a.attrelid = 'usage_metrics'::regclass
AND a.attname = 'metric_type'
AND a.attnum > 0
AND NOT a.attisdropped;

-- 4. Check if it's a domain type with constraints
SELECT
    t.typname,
    t.typtype,
    t.typbasetype,
    pg_get_constraintdef(c.oid) as domain_constraint
FROM pg_type t
LEFT JOIN pg_constraint c ON c.contypid = t.oid
WHERE t.typname IN (
    SELECT udt_name
    FROM information_schema.columns
    WHERE table_name = 'usage_metrics'
    AND column_name = 'metric_type'
);