-- =====================================================
-- QUICK RLS FIX - Just the essential policies
-- Run this in Supabase SQL Editor
-- =====================================================

-- Fix team_invitations to allow public viewing by token
DROP POLICY IF EXISTS "Team admins can view invitations" ON team_invitations;
DROP POLICY IF EXISTS "Public can view invitations by token" ON team_invitations;

-- Allow anyone to view invitations (they need the token anyway)
CREATE POLICY "Public can view invitations by token"
  ON team_invitations FOR SELECT
  USING (expires_at > NOW());

-- Fix user_organizations to allow users to see their own memberships
DROP POLICY IF EXISTS "Users can view own memberships" ON user_organizations;

CREATE POLICY "Users can view own memberships"
  ON user_organizations FOR SELECT
  USING (user_id = auth.uid());

-- Allow users to create their own memberships (for auto-accept)
DROP POLICY IF EXISTS "Users can create own memberships" ON user_organizations;

CREATE POLICY "Users can create own memberships"
  ON user_organizations FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Ensure RLS is enabled
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;