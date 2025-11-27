-- =====================================================
-- CONVERT USER: Tommy Leigh to Team Starter Plan
-- Date: 2025-11-27
-- User: Tommy Leigh (adeliyitomiwa@yahoo.com)
-- User UID: 3bc923c3-e09e-4e86-8e1a-d7cd05e4e1c8
-- =====================================================

-- IMPORTANT: Run this AFTER running the pricing tier migration (MIGRATION_RENAME_PRICING_TIERS.sql)

BEGIN;

-- Step 1: Find the user's organization
-- First, let's verify the user and their current organization
SELECT
  u.id as user_id,
  u.email,
  uo.organization_id,
  o.name as org_name,
  o.plan_type as current_plan,
  o.max_members as current_max_members,
  o.max_minutes_monthly as current_max_minutes
FROM auth.users u
LEFT JOIN user_organizations uo ON u.id = uo.user_id
LEFT JOIN organizations o ON uo.organization_id = o.id
WHERE u.email = 'adeliyitomiwa@yahoo.com'
  AND u.id = '3bc923c3-e09e-4e86-8e1a-d7cd05e4e1c8';

-- Step 2: Update the organization to Team Starter plan
-- Team Starter: 5 users, 6,000 minutes/month, $149/month
UPDATE organizations
SET
  plan_type = 'team_starter',
  max_members = 5,
  max_minutes_monthly = 6000,
  subscription_status = 'active',
  updated_at = NOW()
WHERE id IN (
  SELECT uo.organization_id
  FROM user_organizations uo
  WHERE uo.user_id = '3bc923c3-e09e-4e86-8e1a-d7cd05e4e1c8'
);

-- Step 3: Reset usage for the new billing cycle (optional)
-- Uncomment if you want to reset their usage to 0
-- UPDATE organizations
-- SET
--   minutes_used_this_month = 0,
--   overage_minutes_purchased = 0
-- WHERE id IN (
--   SELECT uo.organization_id
--   FROM user_organizations uo
--   WHERE uo.user_id = '3bc923c3-e09e-4e86-8e1a-d7cd05e4e1c8'
-- );

-- Step 4: Create audit log entry
INSERT INTO audit_logs (
  organization_id,
  user_id,
  action,
  resource_type,
  resource_id,
  metadata
)
SELECT
  uo.organization_id,
  '3bc923c3-e09e-4e86-8e1a-d7cd05e4e1c8',
  'plan_upgraded',
  'organization',
  uo.organization_id::TEXT,
  jsonb_build_object(
    'old_plan', o.plan_type,
    'new_plan', 'team_starter',
    'upgraded_by', 'admin',
    'reason', 'Manual upgrade by admin',
    'timestamp', NOW()
  )
FROM user_organizations uo
JOIN organizations o ON uo.organization_id = o.id
WHERE uo.user_id = '3bc923c3-e09e-4e86-8e1a-d7cd05e4e1c8';

-- Step 5: Verify the update
SELECT
  u.id as user_id,
  u.email,
  o.name as org_name,
  o.plan_type,
  o.max_members,
  o.max_minutes_monthly,
  o.subscription_status,
  o.updated_at
FROM auth.users u
JOIN user_organizations uo ON u.id = uo.user_id
JOIN organizations o ON uo.organization_id = o.id
WHERE u.email = 'adeliyitomiwa@yahoo.com'
  AND u.id = '3bc923c3-e09e-4e86-8e1a-d7cd05e4e1c8';

COMMIT;

-- =====================================================
-- EXPECTED RESULT:
-- =====================================================
-- user_id: 3bc923c3-e09e-4e86-8e1a-d7cd05e4e1c8
-- email: adeliyitomiwa@yahoo.com
-- plan_type: team_starter
-- max_members: 5
-- max_minutes_monthly: 6000
-- subscription_status: active
-- =====================================================
