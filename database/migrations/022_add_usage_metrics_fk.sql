-- =====================================================
-- Migration 022: Add Foreign Key to usage_metrics
-- Phase 2.1 - Data Integrity & Database Optimization
-- =====================================================

-- Start transaction for safety
BEGIN;

-- Step 1: Add nullable call_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'usage_metrics'
        AND column_name = 'call_id'
    ) THEN
        ALTER TABLE usage_metrics
        ADD COLUMN call_id UUID;

        RAISE NOTICE 'Added call_id column to usage_metrics table';
    ELSE
        RAISE NOTICE 'call_id column already exists in usage_metrics table';
    END IF;
END $$;

-- Step 2: Populate call_id from metadata JSONB
-- Only update records where metadata contains call_id
UPDATE usage_metrics
SET call_id = (metadata->>'call_id')::UUID
WHERE metadata->>'call_id' IS NOT NULL
    AND call_id IS NULL
    AND EXISTS (
        SELECT 1 FROM calls
        WHERE id = (metadata->>'call_id')::UUID
    );

-- Log how many records were updated
DO $$
DECLARE
    updated_count INTEGER;
    orphaned_count INTEGER;
    missing_count INTEGER;
BEGIN
    -- Count updated records
    SELECT COUNT(*) INTO updated_count
    FROM usage_metrics
    WHERE call_id IS NOT NULL;

    -- Count orphaned references
    SELECT COUNT(*) INTO orphaned_count
    FROM usage_metrics
    WHERE metadata->>'call_id' IS NOT NULL
        AND call_id IS NULL;

    -- Count records with no call reference
    SELECT COUNT(*) INTO missing_count
    FROM usage_metrics
    WHERE metadata->>'call_id' IS NULL
        AND call_id IS NULL;

    RAISE NOTICE 'Migration stats - Updated: %, Orphaned: %, No reference: %',
                 updated_count, orphaned_count, missing_count;
END $$;

-- Step 3: Add foreign key constraint (CASCADE DELETE)
-- This will fail if there are orphaned references
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_usage_metrics_call'
        AND table_name = 'usage_metrics'
    ) THEN
        ALTER TABLE usage_metrics
        ADD CONSTRAINT fk_usage_metrics_call
        FOREIGN KEY (call_id)
        REFERENCES calls(id)
        ON DELETE CASCADE;

        RAISE NOTICE 'Added foreign key constraint fk_usage_metrics_call';
    ELSE
        RAISE NOTICE 'Foreign key constraint fk_usage_metrics_call already exists';
    END IF;
END $$;

-- Step 4: Create index on call_id for better join performance
CREATE INDEX IF NOT EXISTS idx_usage_metrics_call_id
ON usage_metrics(call_id)
WHERE call_id IS NOT NULL;

-- Step 5: Update future insertions to include call_id directly
-- This is a note for the application layer - no SQL change needed

COMMIT;

-- Rollback script (save as 022_add_usage_metrics_fk.down.sql)
/*
BEGIN;

-- Drop the foreign key constraint
ALTER TABLE usage_metrics
DROP CONSTRAINT IF EXISTS fk_usage_metrics_call;

-- Drop the index
DROP INDEX IF EXISTS idx_usage_metrics_call_id;

-- Optionally remove the column (data loss warning)
-- ALTER TABLE usage_metrics DROP COLUMN IF EXISTS call_id;

COMMIT;
*/