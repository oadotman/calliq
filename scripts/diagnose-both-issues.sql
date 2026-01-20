-- =====================================================
-- COMPREHENSIVE DIAGNOSTIC FOR BOTH ISSUES
-- =====================================================

-- =====================================================
-- ISSUE 1: STUCK CALL PROCESSING
-- =====================================================

-- 1. Check recent calls and their statuses (webhook_logs doesn't exist so removed)
SELECT
    id,
    file_name,
    customer_name,
    status,
    processing_progress,
    processing_message,
    assemblyai_error,
    created_at,
    processed_at,
    duration,
    duration_minutes,
    file_url,
    assemblyai_audio_url
FROM calls
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- 2. Check calls that are stuck in processing states
SELECT
    id,
    file_name,
    status,
    processing_progress,
    processing_message,
    assemblyai_error,
    created_at,
    EXTRACT(EPOCH FROM (NOW() - created_at)) / 60 as minutes_since_created
FROM calls
WHERE status IN ('processing', 'transcribing', 'extracting', 'pending', 'uploaded')
  AND created_at > NOW() - INTERVAL '48 hours'
ORDER BY created_at DESC;

-- 3. Check if there are any transcripts for recent calls
SELECT
    c.id as call_id,
    c.file_name,
    c.status as call_status,
    t.id as transcript_id,
    t.assemblyai_id,
    t.created_at as transcript_created,
    LENGTH(t.text) as transcript_length
FROM calls c
LEFT JOIN transcripts t ON t.call_id = c.id
WHERE c.created_at > NOW() - INTERVAL '24 hours'
ORDER BY c.created_at DESC;

-- 4. Check for the specific call mentioned in user logs
SELECT
    c.*,
    t.id as transcript_id,
    t.assemblyai_id
FROM calls c
LEFT JOIN transcripts t ON t.call_id = c.id
WHERE c.file_url LIKE '%02657d65458b3a35.mp3%'
   OR c.file_name LIKE '%02657d65458b3a35%';

-- 5. Check usage metrics to see if minutes are being tracked
SELECT
    um.*,
    o.name as org_name
FROM usage_metrics um
JOIN organizations o ON o.id = um.organization_id
WHERE um.created_at > NOW() - INTERVAL '24 hours'
ORDER BY um.created_at DESC
LIMIT 20;

-- 6. Check calls with errors
SELECT
    c.id,
    c.file_name,
    c.status,
    c.assemblyai_error,
    c.processing_message,
    c.created_at
FROM calls c
WHERE c.assemblyai_error IS NOT NULL
  AND c.created_at > NOW() - INTERVAL '48 hours'
ORDER BY c.created_at DESC;

-- 7. Check if calls are stuck at 'uploaded' status (not being processed)
SELECT
    status,
    COUNT(*) as count,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
FROM calls
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY status
ORDER BY count DESC;

-- =====================================================
-- ISSUE 2: PARTNER APPROVAL CONSTRAINT VIOLATION
-- =====================================================

-- 8. Check the actual constraint on the partners table
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'partners'::regclass
  AND contype = 'c';  -- Check constraints

-- 9. Check what values are currently in the partners tier column
SELECT DISTINCT tier, COUNT(*) as count
FROM partners
GROUP BY tier
ORDER BY tier;

-- 10. Check pending partner applications
SELECT
    id,
    email,
    full_name,
    company_name,
    partner_type,
    status,
    submitted_at,
    reviewed_at,
    reviewed_by,
    review_notes
FROM partner_applications
WHERE status = 'pending'
ORDER BY submitted_at DESC;

-- 11. Check the specific application mentioned in error (468b21fe-cdf5-447f-8ccb-d3acb1f3ceb1)
SELECT *
FROM partner_applications
WHERE id = '468b21fe-cdf5-447f-8ccb-d3acb1f3ceb1';

-- 12. Check if there are any existing partners with 'bronze' tier (which would be invalid)
SELECT *
FROM partners
WHERE tier NOT IN ('standard', 'premium');

-- 13. Check partner_statistics table existence
SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'partner_statistics'
) as partner_statistics_exists;

-- 14. Check partner_activity_logs table existence
SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'partner_activity_logs'
) as partner_activity_logs_exists;