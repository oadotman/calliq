-- =====================================================
-- CHECK AND FIX ADMIN ROLE FOR adeliyitomiwa@yahoo.com
-- This script checks the current role and fixes it if needed
-- =====================================================

-- STEP 1: Check current user status and role
-- Run this first to see the current state
SELECT
    u.id,
    u.email,
    u.display_name,
    uo.role as current_role,
    uo.organization_id,
    o.name as org_name,
    o.plan_type,
    CASE
        WHEN uo.role = 'owner' THEN '✅ Has owner role'
        WHEN uo.role = 'admin' THEN '⚠️ Has admin role (needs to be owner)'
        WHEN uo.role = 'member' THEN '❌ Only has member role'
        ELSE '❌ Unknown role: ' || COALESCE(uo.role, 'NULL')
    END as role_status,
    CASE
        WHEN o.plan_type IN ('free', 'solo') THEN '❌ Plan does not allow admin features'
        WHEN o.plan_type IN ('starter', 'team', 'enterprise') THEN '✅ Plan allows admin features'
        ELSE '❓ Unknown plan: ' || COALESCE(o.plan_type, 'NULL')
    END as plan_status
FROM users u
LEFT JOIN user_organizations uo ON uo.user_id = u.id
LEFT JOIN organizations o ON o.id = uo.organization_id
WHERE u.email = 'adeliyitomiwa@yahoo.com';

-- =====================================================
-- STEP 2: FIX THE ROLE (Only run if role is not 'owner')
-- This updates the user to have the 'owner' role
-- =====================================================

-- Update user role to 'owner'
UPDATE user_organizations
SET
    role = 'owner',
    updated_at = NOW()
WHERE user_id IN (
    SELECT id FROM users WHERE email = 'adeliyitomiwa@yahoo.com'
);

-- Verify the update worked
SELECT
    'After Update:' as status,
    u.email,
    uo.role,
    uo.updated_at
FROM users u
JOIN user_organizations uo ON uo.user_id = u.id
WHERE u.email = 'adeliyitomiwa@yahoo.com';

-- =====================================================
-- STEP 3: CHECK OTHER USERS WITH ADMIN/OWNER ROLES
-- See if anyone else has admin/owner access
-- =====================================================

SELECT
    u.email,
    u.display_name,
    uo.role,
    o.name as org_name,
    CASE
        WHEN u.email = 'adeliyitomiwa@yahoo.com' THEN '✅ Authorized owner'
        WHEN uo.role IN ('owner', 'admin') THEN '⚠️ Should be downgraded to member'
        ELSE 'OK'
    END as action_needed
FROM user_organizations uo
JOIN users u ON u.id = uo.user_id
JOIN organizations o ON o.id = uo.organization_id
WHERE uo.role IN ('owner', 'admin')
ORDER BY uo.role, u.email;

-- =====================================================
-- STEP 4: OPTIONAL - Remove admin/owner access from others
-- Only run this if you want to ensure ONLY adeliyitomiwa@yahoo.com has admin access
-- =====================================================

-- Downgrade all other users to 'member' role
UPDATE user_organizations
SET
    role = 'member',
    updated_at = NOW()
WHERE role IN ('owner', 'admin')
AND user_id NOT IN (
    SELECT id FROM users WHERE email = 'adeliyitomiwa@yahoo.com'
);

-- Final verification - should only show adeliyitomiwa@yahoo.com as owner
SELECT
    'Final Status:' as check_type,
    u.email,
    uo.role,
    o.name as org_name
FROM user_organizations uo
JOIN users u ON u.id = uo.user_id
JOIN organizations o ON o.id = uo.organization_id
WHERE uo.role IN ('owner', 'admin')
ORDER BY uo.role, u.email;