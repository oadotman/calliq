-- =====================================================
-- SIMPLE ADMIN ROLE FIX FOR adeliyitomiwa@yahoo.com
-- =====================================================

-- STEP 1: Check current status (simplified)
SELECT
    u.id,
    u.email,
    uo.role as current_role,
    o.plan_type
FROM users u
LEFT JOIN user_organizations uo ON uo.user_id = u.id
LEFT JOIN organizations o ON o.id = uo.organization_id
WHERE u.email = 'adeliyitomiwa@yahoo.com';

-- STEP 2: Update to owner role
UPDATE user_organizations
SET
    role = 'owner',
    updated_at = NOW()
WHERE user_id = (
    SELECT id FROM users WHERE email = 'adeliyitomiwa@yahoo.com'
);

-- STEP 3: Verify the update
SELECT
    u.email,
    uo.role,
    'Role updated successfully' as status
FROM users u
JOIN user_organizations uo ON uo.user_id = u.id
WHERE u.email = 'adeliyitomiwa@yahoo.com';

-- STEP 4: Check if anyone else has owner/admin access
SELECT
    u.email,
    uo.role
FROM user_organizations uo
JOIN users u ON u.id = uo.user_id
WHERE uo.role IN ('owner', 'admin')
ORDER BY uo.role, u.email;

-- STEP 5: OPTIONAL - Remove admin/owner from everyone else
-- Uncomment and run only if you want to ensure ONLY you have admin access
/*
UPDATE user_organizations
SET
    role = 'member',
    updated_at = NOW()
WHERE role IN ('owner', 'admin')
AND user_id != (
    SELECT id FROM users WHERE email = 'adeliyitomiwa@yahoo.com'
);
*/