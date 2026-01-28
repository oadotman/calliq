-- Query to check stuck calls and their status
-- Run this in Supabase SQL editor

-- 1. Check all calls with problematic statuses
SELECT
    id,
    file_name,
    customer_name,
    status,
    processing_progress,
    processing_message,
    created_at,
    updated_at,
    processed_at,
    user_id,
    organization_id,
    file_url,
    CASE
        WHEN file_url IS NOT NULL THEN 'Has file'
        ELSE 'No file'
    END as file_status,
    EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_since_creation,
    EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutes_since_update
FROM calls
WHERE status IN ('uploading', 'processing', 'transcribing', 'extracting')
   OR (status = 'failed' AND created_at > NOW() - INTERVAL '24 hours')
ORDER BY created_at DESC;

-- 2. Check if there are any completed transcripts for stuck calls
SELECT
    c.id as call_id,
    c.file_name,
    c.status as call_status,
    t.id as transcript_id,
    LENGTH(t.text) as transcript_length,
    t.created_at as transcript_created
FROM calls c
LEFT JOIN transcripts t ON c.id = t.call_id
WHERE c.status IN ('processing', 'transcribing', 'uploading')
ORDER BY c.created_at DESC;

-- 3. Check recent error patterns
SELECT
    status,
    COUNT(*) as count,
    MAX(created_at) as most_recent,
    MIN(created_at) as oldest
FROM calls
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY status
ORDER BY count DESC;

-- 4. Check for calls with file_url but wrong status
SELECT
    id,
    file_name,
    status,
    file_url,
    created_at
FROM calls
WHERE file_url IS NOT NULL
  AND file_url != ''
  AND status = 'uploading'
ORDER BY created_at DESC;

-- 5. Check organization usage and limits
SELECT
    o.id,
    o.name,
    o.plan_type,
    o.monthly_limit,
    o.used_minutes,
    o.overage_allowed,
    COUNT(c.id) as total_calls,
    COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as completed_calls,
    COUNT(CASE WHEN c.status IN ('processing', 'transcribing') THEN 1 END) as stuck_calls
FROM organizations o
LEFT JOIN calls c ON o.id = c.organization_id
WHERE c.created_at > NOW() - INTERVAL '30 days'
GROUP BY o.id, o.name, o.plan_type, o.monthly_limit, o.used_minutes, o.overage_allowed
HAVING COUNT(CASE WHEN c.status IN ('processing', 'transcribing') THEN 1 END) > 0;