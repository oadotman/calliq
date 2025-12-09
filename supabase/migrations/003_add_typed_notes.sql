-- =====================================================
-- ADD TYPED NOTES TO CALLS TABLE
-- Allows users to add optional typed notes after transcription
-- to improve CRM extraction accuracy
-- =====================================================

-- Add typed_notes column to calls table
ALTER TABLE calls
ADD COLUMN IF NOT EXISTS typed_notes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN calls.typed_notes IS 'Optional user-provided typed notes to supplement transcript for improved CRM extraction accuracy';

-- No additional indexes needed since we query by call_id which is already indexed
-- No RLS policies needed since calls table already has comprehensive RLS policies
-- Notes will inherit the same access controls as the parent call record