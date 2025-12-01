-- =====================================================
-- COMPLETE RLS FIX FOR TEAM INVITATIONS AND USER ORGANIZATIONS
-- Run this in Supabase SQL Editor
-- =====================================================

-- ========== PART 1: FIX TEAM_INVITATIONS TABLE ==========

-- Drop existing policies for team_invitations
DROP POLICY IF EXISTS "Team admins can view invitations" ON team_invitations;
DROP POLICY IF EXISTS "Team admins can view org invitations" ON team_invitations;
DROP POLICY IF EXISTS "Public can view invitations by token" ON team_invitations;
DROP POLICY IF EXISTS "Users can accept invitations with valid token" ON team_invitations;
DROP POLICY IF EXISTS "Anyone can accept valid invitations" ON team_invitations;

-- Create new policies for team_invitations
CREATE POLICY "Team admins can view org invitations"
  ON team_invitations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- CRITICAL: Allow public to view invitations by token (fixes 406 error)
CREATE POLICY "Public can view invitations by token"
  ON team_invitations FOR SELECT
  USING (expires_at > NOW());

CREATE POLICY "Anyone can accept valid invitations"
  ON team_invitations FOR UPDATE
  USING (
    accepted_at IS NULL
    AND expires_at > NOW()
  )
  WITH CHECK (
    accepted_at IS NOT NULL
  );

-- Keep existing INSERT and DELETE policies
CREATE POLICY IF NOT EXISTS "Team admins can create invitations"
  ON team_invitations FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY IF NOT EXISTS "Team admins can revoke invitations"
  ON team_invitations FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ========== PART 2: FIX USER_ORGANIZATIONS TABLE ==========

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own memberships" ON user_organizations;
DROP POLICY IF EXISTS "Users can create own memberships" ON user_organizations;
DROP POLICY IF EXISTS "Users can update own memberships" ON user_organizations;

-- Create policies for user_organizations
-- Allow users to see their own memberships
CREATE POLICY "Users can view own memberships"
  ON user_organizations FOR SELECT
  USING (user_id = auth.uid());

-- Allow users to insert their own memberships (for auto-accept)
CREATE POLICY "Users can create own memberships"
  ON user_organizations FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Allow users to update their own memberships
CREATE POLICY "Users can update own memberships"
  ON user_organizations FOR UPDATE
  USING (user_id = auth.uid());

-- Allow team members to view other members in their organization
CREATE POLICY "Team members can view organization members"
  ON user_organizations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_organizations
      WHERE user_id = auth.uid()
    )
  );

-- Allow admins/owners to manage members
CREATE POLICY "Admins can remove members"
  ON user_organizations FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_organizations
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
    AND role != 'owner'  -- Can't remove owners
  );

-- ========== PART 3: VERIFY RLS IS ENABLED ==========

-- Ensure RLS is enabled on both tables
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;

-- ========== VERIFICATION QUERY ==========
-- Run this after applying the policies to verify they exist:
/*
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
WHERE tablename IN ('team_invitations', 'user_organizations')
ORDER BY tablename, policyname;
*/