-- =====================================================
-- SHOW THE EXACT CONSTRAINT ON METRIC_TYPE
-- =====================================================

-- 1. Get ALL constraints on usage_metrics table
SELECT
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'usage_metrics'::regclass
ORDER BY conname;

-- 2. Show what metric types are actually in the database
SELECT
    metric_type,
    COUNT(*) as count,
    MIN(created_at)::date as first_used,
    MAX(created_at)::date as last_used
FROM usage_metrics
GROUP BY metric_type
ORDER BY count DESC;

-- 3. Try inserting a test record to see the exact error
-- (This will fail but show us the constraint)
DO $$
BEGIN
    -- Try to insert with a test metric type
    BEGIN
        INSERT INTO usage_metrics (
            organization_id,
            metric_type,
            metric_value,
            metadata
        ) VALUES (
            '00000000-0000-0000-0000-000000000000'::uuid,
            'TEST_TYPE',
            0,
            '{}'::jsonb
        );
        -- If it succeeds, delete it
        DELETE FROM usage_metrics
        WHERE organization_id = '00000000-0000-0000-0000-000000000000'::uuid
        AND metric_type = 'TEST_TYPE';
        RAISE NOTICE 'TEST_TYPE was allowed (and deleted)';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'Check constraint error: %', SQLERRM;
        WHEN foreign_key_violation THEN
            RAISE NOTICE 'Foreign key error: %', SQLERRM;
        WHEN OTHERS THEN
            RAISE NOTICE 'Other error: %', SQLERRM;
    END;
END $$;