# Phase 2 Implementation Guide - Data Integrity & Database Optimization

## Overview
This guide provides step-by-step instructions for implementing Phase 2 of the CallIQ database optimization plan. Phase 2 focuses on data integrity, performance optimization through indexes, and fixing Row Level Security (RLS) policies.

## Pre-Implementation Checklist

### 1. Backup Your Database
**CRITICAL: Do this before ANY changes**
```sql
-- In Supabase Dashboard:
-- Settings > Database > Backups > Create Manual Backup
-- Wait for backup to complete before proceeding
```

### 2. Document Current State
Save the results of these queries for rollback reference:
```sql
-- Count records in key tables
SELECT
    'calls' as table_name, COUNT(*) as count FROM calls
UNION ALL
SELECT 'usage_metrics', COUNT(*) FROM usage_metrics
UNION ALL
SELECT 'usage_reservations', COUNT(*) FROM usage_reservations
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications;
```

## Implementation Steps

### Step 1: Run Assessment Queries
**File:** `database/phase2_assessment.sql`

1. Open Supabase SQL Editor
2. Run the assessment script section by section
3. Save the output, particularly:
   - Section 1.2: Usage metrics with/without call_id
   - Section 2: Current RLS policies
   - Section 3.2: Missing indexes status
   - Section 8: Summary report

**Decision Points Based on Assessment:**

If you find:
- **Many orphaned call references** (Section 1.2): Need to clean these before migration
- **Multiple active reservations per org** (Section 6.2): Need to resolve conflicts first
- **Non-lowercase emails** (Section 4.2): Will be auto-fixed during migration

### Step 2: Clean Orphaned Data (If Needed)

If assessment shows orphaned call references, run this cleanup:

```sql
-- Backup orphaned records first
CREATE TABLE usage_metrics_orphaned_backup AS
SELECT * FROM usage_metrics
WHERE metadata->>'call_id' IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM calls
        WHERE id = (metadata->>'call_id')::UUID
    );

-- Then delete orphaned records
DELETE FROM usage_metrics
WHERE metadata->>'call_id' IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM calls
        WHERE id = (metadata->>'call_id')::UUID
    );
```

### Step 3: Implement Migration 022 - Add Foreign Key to usage_metrics

**File:** `database/migrations/022_add_usage_metrics_fk.sql`

**Pre-checks:**
```sql
-- Verify no active transactions
SELECT * FROM pg_stat_activity WHERE state != 'idle';

-- Check current foreign keys
SELECT constraint_name FROM information_schema.table_constraints
WHERE table_name = 'usage_metrics' AND constraint_type = 'FOREIGN KEY';
```

**Execute Migration:**
1. Run the entire migration script
2. Check the NOTICE messages for statistics
3. Verify the foreign key was created:
```sql
SELECT constraint_name FROM information_schema.table_constraints
WHERE table_name = 'usage_metrics'
    AND constraint_name = 'fk_usage_metrics_call';
```

### Step 4: Implement Migration 023 - Fix RLS Policies

**File:** `database/migrations/023_fix_rls_policies.sql`

**Pre-checks:**
```sql
-- Save current policies for rollback
CREATE TABLE rls_policies_backup AS
SELECT * FROM pg_policies
WHERE tablename IN ('notifications', 'referral_statistics');
```

**Execute Migration:**
1. Run the entire migration script
2. Verify new policies:
```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('notifications', 'referral_statistics')
ORDER BY tablename, policyname;
```

**Test RLS Policies:**
```sql
-- Test as a regular user (replace with actual user ID)
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claim.sub TO 'user-uuid-here';

-- Should only see own notifications
SELECT COUNT(*) FROM notifications;

-- Reset role
RESET role;
```

### Step 5: Implement Migration 024 - Add Performance Indexes

**File:** `database/migrations/024_add_performance_indexes.sql`

**Important:** This migration uses `CONCURRENTLY` which allows normal operations to continue. However, it may take longer on large tables.

**Pre-checks:**
```sql
-- Check table sizes to estimate time
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('calls', 'transcripts', 'notifications', 'usage_metrics')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Execute Migration:**
1. Run the migration during low-traffic period if possible
2. Monitor progress:
```sql
-- Check index creation progress
SELECT * FROM pg_stat_progress_create_index;
```

**Verify Indexes:**
```sql
-- Count new indexes
SELECT COUNT(*) FROM pg_indexes
WHERE schemaname = 'public' AND indexname LIKE 'idx_%';
```

### Step 6: Implement Migration 025 - Add Data Constraints

**File:** `database/migrations/025_add_data_constraints.sql`

**WARNING:** This migration modifies data and adds constraints. It may fail if data doesn't meet requirements.

**Pre-checks:**
```sql
-- Check for NULL values that will be fixed
SELECT
    COUNT(*) FILTER (WHERE user_id IS NULL) as null_user_ids,
    COUNT(*) FILTER (WHERE file_url IS NULL) as null_file_urls,
    COUNT(*) FILTER (WHERE duration IS NULL) as null_durations
FROM calls;

-- Check for non-lowercase emails
SELECT COUNT(*) FROM referrals
WHERE referred_email != LOWER(referred_email);
```

**Execute Migration:**
1. Run the migration
2. Check for constraint violations:
```sql
-- Verify constraints were added
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'calls'::regclass
    AND contype = 'c';
```

## Post-Implementation Verification

### 1. Performance Testing

Run these queries to verify performance improvements:

```sql
-- Test indexed query performance
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM calls
WHERE customer_email = 'test@example.com'
    AND deleted_at IS NULL
LIMIT 10;

-- Compare with assessment baseline
-- Should show "Index Scan" instead of "Seq Scan"
```

### 2. Data Integrity Check

```sql
-- Verify foreign key integrity
SELECT COUNT(*) FROM usage_metrics
WHERE call_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM calls WHERE id = usage_metrics.call_id
    );
-- Should return 0

-- Verify email constraint
SELECT COUNT(*) FROM referrals
WHERE referred_email != LOWER(referred_email);
-- Should return 0
```

### 3. RLS Policy Testing

```sql
-- Test notification isolation
-- Run this in Supabase Dashboard as different users
-- Each user should only see their own notifications
SELECT user_id, COUNT(*)
FROM notifications
GROUP BY user_id;
```

## Rollback Procedures

If any issues occur, use these rollback scripts:

### Rollback Migration 025 (Constraints)
```sql
-- From 025_add_data_constraints.sql bottom section
BEGIN;
-- Run the rollback commands
COMMIT;
```

### Rollback Migration 024 (Indexes)
```sql
-- Drop all idx_* indexes
SELECT 'DROP INDEX IF EXISTS ' || indexname || ';'
FROM pg_indexes
WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%';
-- Execute the generated DROP statements
```

### Rollback Migration 023 (RLS Policies)
```sql
-- Restore from backup
-- Use the rls_policies_backup table created earlier
```

### Rollback Migration 022 (Foreign Key)
```sql
BEGIN;
ALTER TABLE usage_metrics
DROP CONSTRAINT IF EXISTS fk_usage_metrics_call;
DROP INDEX IF EXISTS idx_usage_metrics_call_id;
-- Optionally: ALTER TABLE usage_metrics DROP COLUMN call_id;
COMMIT;
```

## Monitoring After Implementation

### 1. Check Query Performance
```sql
-- Monitor slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### 2. Check Index Usage
```sql
-- Verify indexes are being used
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%'
ORDER BY idx_scan DESC;
```

### 3. Monitor Table Bloat
```sql
-- Check for table bloat after constraints
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('calls', 'usage_metrics', 'referrals')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Success Criteria

Phase 2 is successful when:

✅ All migrations complete without errors
✅ Foreign key relationship established for usage_metrics
✅ RLS policies properly restrict data access
✅ All performance indexes created
✅ Data constraints enforced
✅ Query performance improved (check EXPLAIN plans)
✅ No data integrity violations
✅ Application continues to function normally

## Troubleshooting

### Common Issues and Solutions

1. **Migration fails with "column already exists"**
   - The migration has been partially applied
   - Check which parts succeeded and skip those sections

2. **Foreign key constraint violation**
   - Orphaned records exist
   - Run the cleanup script from Step 2

3. **Index creation takes too long**
   - Normal for large tables
   - Use `pg_stat_progress_create_index` to monitor
   - Consider creating indexes one at a time

4. **RLS policies blocking legitimate access**
   - Verify service role is being used for system operations
   - Check JWT claims are correct

5. **Constraint violations after adding checks**
   - Data doesn't meet new requirements
   - Run data cleanup queries before adding constraints

## Next Steps

After successful Phase 2 implementation:

1. Monitor application for 24-48 hours
2. Collect performance metrics
3. Document any issues or improvements
4. Prepare for Phase 3 (Performance & Frontend Optimization)

## Support

If you encounter issues:
1. Check the rollback procedures
2. Restore from backup if necessary
3. Review Supabase logs for detailed error messages
4. Document the issue for troubleshooting

Remember: **Always backup before making changes!**