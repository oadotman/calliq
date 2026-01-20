-- =====================================================
-- DIAGNOSE STUCK CALL PROCESSING ISSUES
-- =====================================================

-- 1. Check recent calls and their statuses
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
WHERE status IN ('processing', 'transcribing', 'extracting', 'pending')
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

-- 4. Check for any webhook records (if webhooks are used)
SELECT
    id,
    webhook_type,
    payload,
    processed,
    error,
    created_at
FROM webhook_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 10;

-- 5. Check usage metrics to see if minutes are being tracked
SELECT
    um.*,
    o.name as org_name
FROM usage_metrics um
JOIN organizations o ON o.id = um.organization_id
WHERE um.created_at > NOW() - INTERVAL '24 hours'
ORDER BY um.created_at DESC
LIMIT 20;

-- 6. Check for any errors in the assemblyai webhook responses
SELECT
    c.id,
    c.file_name,
    c.status,
    c.assemblyai_error,
    c.processing_message
FROM calls c
WHERE c.assemblyai_error IS NOT NULL
  AND c.created_at > NOW() - INTERVAL '48 hours'
ORDER BY c.created_at DESC;

-- 7. Check if there are any calls waiting for processing
SELECT COUNT(*) as pending_calls
FROM calls
WHERE status = 'pending';

-- 8. Check the specific call mentioned in the logs (with that specific audio file)
SELECT
    c.*,
    t.id as transcript_id,
    t.assemblyai_id
FROM calls c
LEFT JOIN transcripts t ON t.call_id = c.id
WHERE c.file_url LIKE '%02657d65458b3a35.mp3%'
   OR c.file_name LIKE '%02657d65458b3a35%';