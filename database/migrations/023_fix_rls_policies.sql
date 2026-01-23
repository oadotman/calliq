-- =====================================================
-- Migration 023: Fix RLS Policies
-- Phase 2.2 - Security & Data Isolation
-- =====================================================

BEGIN;

-- =====================================================
-- NOTIFICATIONS TABLE - Fix overly permissive policies
-- =====================================================

-- Step 1: Enable RLS if not already enabled
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing overly permissive policies
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON notifications;
DROP POLICY IF EXISTS "Service role bypass" ON notifications;

-- Step 3: Create proper RLS policies for notifications

-- Policy for users to view their own notifications
CREATE POLICY "Users can view own notifications"
ON notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy for users to update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy for service role to bypass RLS (for system notifications)
CREATE POLICY "Service role full access"
ON notifications
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy for authenticated users to delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON notifications
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- =====================================================
-- REFERRAL_STATISTICS TABLE - Fix isolation
-- =====================================================

-- Step 1: Enable RLS if not already enabled
ALTER TABLE referral_statistics ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies
DROP POLICY IF EXISTS "System can manage statistics" ON referral_statistics;
DROP POLICY IF EXISTS "Users can view statistics" ON referral_statistics;
DROP POLICY IF EXISTS "Users manage own statistics" ON referral_statistics;

-- Step 3: Create proper RLS policies

-- Users can only view their own statistics
CREATE POLICY "Users view own statistics"
ON referral_statistics
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can update their own statistics
CREATE POLICY "Users update own statistics"
ON referral_statistics
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- System/service role can manage all statistics
CREATE POLICY "Service role manages all statistics"
ON referral_statistics
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Prevent users from inserting statistics directly (should be done by system)
-- No INSERT policy for authenticated users

-- =====================================================
-- PARTNER_STATISTICS TABLE - Additional security
-- =====================================================

-- Enable RLS if exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'partner_statistics'
    ) THEN
        ALTER TABLE partner_statistics ENABLE ROW LEVEL SECURITY;

        -- Drop any existing policies
        DROP POLICY IF EXISTS "Partners view own statistics" ON partner_statistics;
        DROP POLICY IF EXISTS "Service role manages statistics" ON partner_statistics;

        -- Partners can only view their own statistics
        CREATE POLICY "Partners view own statistics"
        ON partner_statistics
        FOR SELECT
        TO authenticated
        USING (
            partner_id IN (
                SELECT id FROM partners
                WHERE email = auth.jwt()->>'email'
            )
        );

        -- Service role has full access
        CREATE POLICY "Service role full access"
        ON partner_statistics
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);

        RAISE NOTICE 'Partner statistics RLS policies created';
    END IF;
END $$;

-- =====================================================
-- Verify RLS is enabled on all sensitive tables
-- =====================================================

DO $$
DECLARE
    r RECORD;
    tables_to_check text[] := ARRAY[
        'notifications',
        'referral_statistics',
        'referral_rewards',
        'user_preferences',
        'audit_logs',
        'team_invitations',
        'user_organizations'
    ];
    tbl text;
BEGIN
    FOREACH tbl IN ARRAY tables_to_check
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
        RAISE NOTICE 'RLS enabled on table: %', tbl;
    END LOOP;
END $$;

COMMIT;

-- =====================================================
-- Rollback script (save as 023_fix_rls_policies.down.sql)
-- =====================================================
/*
BEGIN;

-- Restore original policies for notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
DROP POLICY IF EXISTS "Service role full access" ON notifications;

-- Restore original policies for referral_statistics
DROP POLICY IF EXISTS "Users view own statistics" ON referral_statistics;
DROP POLICY IF EXISTS "Users update own statistics" ON referral_statistics;
DROP POLICY IF EXISTS "Service role manages all statistics" ON referral_statistics;

-- Restore partner_statistics policies if needed
DROP POLICY IF EXISTS "Partners view own statistics" ON partner_statistics;
DROP POLICY IF EXISTS "Service role full access" ON partner_statistics;

COMMIT;
*/