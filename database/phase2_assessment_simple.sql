-- =====================================================
-- PHASE 2 DATABASE ASSESSMENT QUERIES (SIMPLIFIED)
-- Run each section separately in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- SECTION 1A: Basic usage_metrics check
-- =====================================================
SELECT
    COUNT(*) as total_records,
    COUNT(metadata) as records_with_metadata,
    COUNT(metadata->>'call_id') as records_with_call_id_in_metadata
FROM usage_metrics;

-- =====================================================
-- SECTION 1B: Check for orphaned call references
-- =====================================================
SELECT COUNT(*) as orphaned_call_references
FROM usage_metrics um
WHERE um.metadata->>'call_id' IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM calls c
        WHERE c.id = (um.metadata->>'call_id')::uuid
    );

-- =====================================================
-- SECTION 1C: Sample metadata structure
-- =====================================================
SELECT
    id,
    organization_id,
    metric_type,
    metadata,
    created_at
FROM usage_metrics
WHERE metadata IS NOT NULL
LIMIT 5;

-- =====================================================
-- SECTION 1D: Metric types breakdown
-- =====================================================
SELECT
    metric_type,
    COUNT(*) as count
FROM usage_metrics
GROUP BY metric_type
ORDER BY count DESC;

-- =====================================================
-- SECTION 2A: Check RLS on notifications
-- =====================================================
SELECT
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename = 'notifications';

-- =====================================================
-- SECTION 2B: Check RLS on referral_statistics
-- =====================================================
SELECT
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename = 'referral_statistics';

-- =====================================================
-- SECTION 2C: Check if RLS is enabled
-- =====================================================
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('notifications', 'referral_statistics');

-- =====================================================
-- SECTION 3A: Check existing indexes on calls
-- =====================================================
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename = 'calls'
ORDER BY indexname;

-- =====================================================
-- SECTION 3B: Check table sizes
-- =====================================================
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('calls', 'transcripts', 'call_fields', 'notifications', 'usage_metrics')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- =====================================================
-- SECTION 4A: Check NULL values in calls
-- =====================================================
SELECT
    COUNT(*) as total_calls,
    COUNT(*) FILTER (WHERE user_id IS NULL) as null_user_ids,
    COUNT(*) FILTER (WHERE file_url IS NULL) as null_file_urls,
    COUNT(*) FILTER (WHERE duration IS NULL) as null_durations
FROM calls;

-- =====================================================
-- SECTION 4B: Check referrals email format
-- =====================================================
SELECT
    COUNT(*) as total_referrals,
    COUNT(*) FILTER (WHERE referred_email != LOWER(referred_email)) as non_lowercase_emails
FROM referrals;

-- =====================================================
-- SECTION 5: Check for active reservations
-- =====================================================
SELECT
    organization_id,
    COUNT(*) as active_reservation_count,
    SUM(reserved_minutes) as total_reserved_minutes
FROM usage_reservations
WHERE status = 'active'
GROUP BY organization_id
HAVING COUNT(*) > 1;

-- =====================================================
-- SECTION 6: Quick Summary
-- =====================================================
WITH checks AS (
    SELECT 'Total usage_metrics records' as check_name,
           COUNT(*)::text as result
    FROM usage_metrics

    UNION ALL

    SELECT 'Usage metrics with call_id in metadata',
           COUNT(*)::text
    FROM usage_metrics
    WHERE metadata->>'call_id' IS NOT NULL

    UNION ALL

    SELECT 'Calls with NULL user_id',
           COUNT(*)::text
    FROM calls
    WHERE user_id IS NULL

    UNION ALL

    SELECT 'Referrals with uppercase emails',
           COUNT(*)::text
    FROM referrals
    WHERE referred_email != LOWER(referred_email)

    UNION ALL

    SELECT 'Organizations with multiple active reservations',
           COUNT(DISTINCT organization_id)::text
    FROM usage_reservations
    WHERE status = 'active'
    GROUP BY organization_id
    HAVING COUNT(*) > 1
)
SELECT * FROM checks;