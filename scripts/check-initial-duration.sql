-- CHECK IF DURATION IS SET BEFORE PROCESSING
-- This checks if duration is set at upload time (before AssemblyAI)

SELECT
  c.id,
  c.customer_name,
  c.file_name,
  c.duration as initial_duration,
  c.duration_minutes,
  c.status,
  c.created_at as uploaded_at,
  c.processed_at,
  t.audio_duration as assemblyai_duration,
  u.email
FROM calls c
LEFT JOIN transcripts t ON t.call_id = c.id
JOIN auth.users u ON c.user_id = u.id
WHERE u.email = 'adeliyitomiwa@yahoo.com'
   OR u.email = 'adeiyitomiwa@yahoo.com'  -- trying both spellings
ORDER BY c.created_at DESC;