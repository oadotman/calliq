-- =====================================================
-- FIND VALID METRIC TYPES
-- Simple query to understand what's allowed
-- =====================================================

-- Option 1: Look at existing data to infer allowed types
SELECT
    'CURRENTLY USED METRIC TYPES:' as info;

SELECT
    metric_type,
    COUNT(*) as count,
    MIN(created_at)::date as first_used,
    MAX(created_at)::date as last_used
FROM usage_metrics
GROUP BY metric_type
ORDER BY count DESC;

-- Option 2: Try to extract from constraint
SELECT
    'CHECK CONSTRAINT DEFINITION:' as info;

SELECT
    conname,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'usage_metrics'::regclass
  AND contype = 'c';

-- Option 3: Look for enum type
SELECT
    'ENUM TYPES (if any):' as info;

SELECT
    n.nspname as schema,
    t.typname as type_name,
    string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as allowed_values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE t.typname LIKE '%metric%' OR t.typname LIKE '%type%'
GROUP BY n.nspname, t.typname;

-- Option 4: Check column data type directly
SELECT
    'COLUMN DEFINITION:' as info;

SELECT
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'usage_metrics'
  AND column_name = 'metric_type';

-- Option 5: If it's an enum, get the values
SELECT
    'ENUM VALUES (if metric_type is enum):' as info;

SELECT enumlabel
FROM pg_enum
WHERE enumtypid = (
    SELECT typelem
    FROM pg_type
    WHERE typname = (
        SELECT udt_name
        FROM information_schema.columns
        WHERE table_name = 'usage_metrics'
          AND column_name = 'metric_type'
    )
)
ORDER BY enumsortorder;