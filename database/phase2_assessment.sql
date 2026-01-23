-- =====================================================
-- PHASE 2 DATABASE ASSESSMENT QUERIES
-- Run these queries in Supabase SQL Editor before implementing Phase 2
-- =====================================================

-- =====================================================
-- SECTION 1: CHECK USAGE_METRICS FOREIGN KEY STATUS
-- =====================================================

-- 1.1 Check existing foreign keys on usage_metrics table
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'usage_metrics'
    AND tc.constraint_type = 'FOREIGN KEY';

-- 1.2 Check if metadata contains call_id and count orphaned records
SELECT
    COUNT(*) as total_records,
    COUNT(metadata->>'call_id') as records_with_call_id,
    COUNT(*) - COUNT(metadata->>'call_id') as records_without_call_id,
    COUNT(CASE WHEN metadata->>'call_id' IS NOT NULL
               AND NOT EXISTS (SELECT 1 FROM calls WHERE id = (metadata->>'call_id')::uuid)
          THEN 1 END) as orphaned_call_references
FROM usage_metrics;

-- 1.3 Sample records to understand metadata structure
SELECT
    id,
    organization_id,
    metric_type,
    metadata,
    created_at
FROM usage_metrics
WHERE metadata IS NOT NULL
LIMIT 10;

-- 1.4 Check distinct metric_types and their call_id presence
SELECT
    metric_type,
    COUNT(*) as count,
    COUNT(metadata->>'call_id') as with_call_id,
    COUNT(*) - COUNT(metadata->>'call_id') as without_call_id
FROM usage_metrics
GROUP BY metric_type
ORDER BY count DESC;

-- =====================================================
-- SECTION 2: CHECK RLS POLICIES
-- =====================================================

-- 2.1 Check all RLS policies on notifications table
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'notifications'
ORDER BY policyname;

-- 2.2 Check all RLS policies on referral_statistics table
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'referral_statistics'
ORDER BY policyname;

-- 2.3 Check if RLS is enabled on these tables
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename IN ('notifications', 'referral_statistics');

-- =====================================================
-- SECTION 3: CHECK EXISTING INDEXES
-- =====================================================

-- 3.1 List all existing indexes on key tables
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN ('calls', 'transcripts', 'call_fields', 'user_organizations', 'notifications', 'usage_metrics')
ORDER BY tablename, indexname;

-- 3.2 Check for missing indexes we want to create
WITH desired_indexes AS (
    SELECT 'calls' as table_name, 'customer_email' as column_name
    UNION SELECT 'calls', 'customer_phone'
    UNION SELECT 'transcripts', 'confidence_score'
    UNION SELECT 'user_organizations', 'organization_id'
    UNION SELECT 'user_organizations', 'role'
    UNION SELECT 'call_fields', 'call_id'
    UNION SELECT 'call_fields', 'field_name'
    UNION SELECT 'notifications', 'user_id'
    UNION SELECT 'notifications', 'is_read'
)
SELECT
    di.table_name,
    di.column_name,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE schemaname = 'public'
                AND tablename = di.table_name
                AND indexdef LIKE '%' || di.column_name || '%'
        ) THEN 'EXISTS'
        ELSE 'MISSING'
    END as index_status
FROM desired_indexes di
ORDER BY index_status DESC, table_name, column_name;

-- 3.3 Check table sizes to understand index impact
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
    AND tablename IN ('calls', 'transcripts', 'call_fields', 'user_organizations', 'notifications', 'usage_metrics')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- =====================================================
-- SECTION 4: CHECK DATA INTEGRITY ISSUES
-- =====================================================

-- 4.1 Check NULL values in critical columns
SELECT
    'calls' as table_name,
    'user_id' as column_name,
    COUNT(*) FILTER (WHERE user_id IS NULL) as null_count,
    COUNT(*) as total_count
FROM calls
UNION ALL
SELECT
    'calls', 'file_url',
    COUNT(*) FILTER (WHERE file_url IS NULL),
    COUNT(*)
FROM calls
UNION ALL
SELECT
    'calls', 'duration',
    COUNT(*) FILTER (WHERE duration IS NULL),
    COUNT(*)
FROM calls
UNION ALL
SELECT
    'referrals', 'referred_email',
    COUNT(*) FILTER (WHERE referred_email IS NULL),
    COUNT(*)
FROM referrals;

-- 4.2 Check for invalid email formats in referrals
SELECT
    COUNT(*) as total_referrals,
    COUNT(*) FILTER (WHERE referred_email != LOWER(referred_email)) as non_lowercase_emails,
    COUNT(*) FILTER (WHERE referred_email !~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$') as invalid_format_emails
FROM referrals;

-- 4.3 Check for duplicate constraints that might conflict
SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    conrelid::regclass AS table_name,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid IN ('usage_reservations'::regclass, 'calls'::regclass, 'referrals'::regclass)
    AND contype IN ('u', 'c') -- unique and check constraints
ORDER BY table_name, constraint_name;

-- =====================================================
-- SECTION 5: CHECK DATABASE MIGRATIONS STATUS
-- =====================================================

-- 5.1 Check if there's a migration tracking table
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name LIKE '%migration%'
ORDER BY table_name, ordinal_position;

-- 5.2 List all existing functions/procedures that might be affected
SELECT
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND (routine_name LIKE '%usage%' OR routine_name LIKE '%reservation%' OR routine_name LIKE '%calculate%')
ORDER BY routine_name;

-- =====================================================
-- SECTION 6: CHECK USAGE_RESERVATIONS CONSTRAINTS
-- =====================================================

-- 6.1 Check existing constraints on usage_reservations
SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'usage_reservations'::regclass
ORDER BY constraint_name;

-- 6.2 Check for potential race conditions - overlapping active reservations
WITH active_reservations AS (
    SELECT
        organization_id,
        COUNT(*) as active_count,
        SUM(reserved_minutes) as total_reserved_minutes,
        STRING_AGG(id::text, ', ') as reservation_ids
    FROM usage_reservations
    WHERE status = 'active'
    GROUP BY organization_id
    HAVING COUNT(*) > 1
)
SELECT
    ar.*,
    o.name as organization_name
FROM active_reservations ar
LEFT JOIN organizations o ON ar.organization_id = o.id;

-- =====================================================
-- SECTION 7: PERFORMANCE BASELINE QUERIES
-- =====================================================

-- 7.1 Test query performance on calls table (customer search)
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM calls
WHERE customer_email = 'test@example.com'
    AND deleted_at IS NULL
LIMIT 10;

-- 7.2 Test query performance on notifications (unread notifications)
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM notifications
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
    AND is_read = false
ORDER BY created_at DESC
LIMIT 20;

-- 7.3 Test query performance on call_fields (field lookup)
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM call_fields
WHERE call_id = (SELECT id FROM calls LIMIT 1)
    AND field_name = 'customer_name';

-- =====================================================
-- SECTION 8: SUMMARY REPORT
-- =====================================================

-- 8.1 Generate a summary of potential issues
WITH summary AS (
    SELECT 'Missing call_id FK in usage_metrics' as issue_type,
           COUNT(*) as affected_records
    FROM usage_metrics
    WHERE metadata->>'call_id' IS NULL
    UNION ALL
    SELECT 'Orphaned call references in usage_metrics',
           COUNT(*)
    FROM usage_metrics
    WHERE metadata->>'call_id' IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM calls WHERE id = (metadata->>'call_id')::uuid)
    UNION ALL
    SELECT 'Multiple active reservations per org',
           COUNT(DISTINCT organization_id)
    FROM usage_reservations
    WHERE status = 'active'
    GROUP BY organization_id
    HAVING COUNT(*) > 1
    UNION ALL
    SELECT 'Non-lowercase emails in referrals',
           COUNT(*)
    FROM referrals
    WHERE referred_email != LOWER(referred_email)
)
SELECT
    issue_type,
    affected_records,
    CASE
        WHEN affected_records = 0 THEN '✅ No issues'
        WHEN affected_records < 10 THEN '⚠️ Minor issues'
        ELSE '❌ Needs attention'
    END as status
FROM summary
ORDER BY affected_records DESC;