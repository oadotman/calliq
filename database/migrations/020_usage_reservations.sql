-- =====================================================
-- USAGE RESERVATIONS TABLE
-- Prevents race conditions for concurrent uploads
-- =====================================================

-- Create usage_reservations table
CREATE TABLE IF NOT EXISTS usage_reservations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    file_identifier TEXT NOT NULL, -- Hash or unique identifier for the file
    reserved_minutes INTEGER NOT NULL,
    actual_minutes INTEGER, -- Filled after transcription completes
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'confirmed', 'released', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL, -- Reservation expires if not confirmed
    confirmed_at TIMESTAMPTZ,
    released_at TIMESTAMPTZ,
    expired_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_usage_reservations_org_status ON usage_reservations(organization_id, status);
CREATE INDEX idx_usage_reservations_expires ON usage_reservations(expires_at) WHERE status = 'active';
CREATE INDEX idx_usage_reservations_file ON usage_reservations(file_identifier);

-- RLS Policies
ALTER TABLE usage_reservations ENABLE ROW LEVEL SECURITY;

-- Organizations can view their own reservations
CREATE POLICY "Organizations can view own reservations" ON usage_reservations
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id
            FROM user_organizations
            WHERE user_id = auth.uid()
        )
    );

-- Service role bypass for backend operations
CREATE POLICY "Service role bypass" ON usage_reservations
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Function to automatically clean up expired reservations
CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE usage_reservations
    SET
        status = 'expired',
        expired_at = NOW(),
        updated_at = NOW()
    WHERE
        status = 'active'
        AND expires_at < NOW();
END;
$$;

-- Optional: Create a cron job to run cleanup every 5 minutes
-- This requires pg_cron extension (available in Supabase)
-- SELECT cron.schedule('cleanup-expired-reservations', '*/5 * * * *', 'SELECT cleanup_expired_reservations();');