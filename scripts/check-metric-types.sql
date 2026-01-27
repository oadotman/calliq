-- =====================================================
-- CHECK WHAT METRIC TYPES ARE ALLOWED
-- =====================================================

-- 1. Show the exact constraint on metric_type
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_catalog.pg_constraint c
JOIN pg_catalog.pg_class t ON c.conrelid = t.oid
WHERE t.relname = 'usage_metrics'
  AND c.contype = 'c'
  AND pg_get_constraintdef(c.oid) LIKE '%metric_type%';

-- 2. Show what metric types are currently in use
SELECT DISTINCT
    metric_type,
    COUNT(*) as usage_count
FROM usage_metrics
GROUP BY metric_type
ORDER BY metric_type;

-- 3. Check if there's an enum type for metric_type
SELECT
    t.typname AS enum_name,
    array_agg(e.enumlabel ORDER BY e.enumsortorder) AS enum_values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname LIKE '%metric%'
GROUP BY t.typname;

-- 4. Show the full table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'usage_metrics'
ORDER BY ordinal_position;

-- 5. Try to find any comments or documentation on the table
SELECT
    obj_description('usage_metrics'::regclass, 'pg_class') as table_comment;

-- 6. Check for any triggers that might affect inserts
SELECT
    tgname AS trigger_name,
    proname AS function_name,
    tgtype AS trigger_type
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'usage_metrics'::regclass;