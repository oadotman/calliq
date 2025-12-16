-- =====================================================
-- MAKE USER ADMIN SCRIPT
-- Run this in your Supabase SQL editor to grant admin access
-- =====================================================

-- First, let's check your current role
SELECT
    u.id as user_id,
    u.email,
    uo.role as current_role,
    o.name as organization_name
FROM auth.users u
LEFT JOIN user_organizations uo ON uo.user_id = u.id
LEFT JOIN organizations o ON o.id = uo.organization_id
WHERE u.email = 'adeliyitomiwa@yahoo.com';

-- Update your role to 'owner' to get full admin access
UPDATE user_organizations
SET role = 'owner'
WHERE user_id = (
    SELECT id
    FROM auth.users
    WHERE email = 'adeliyitomiwa@yahoo.com'
);

-- Verify the update was successful
SELECT
    u.id as user_id,
    u.email,
    uo.role as updated_role,
    o.name as organization_name
FROM auth.users u
LEFT JOIN user_organizations uo ON uo.user_id = u.id
LEFT JOIN organizations o ON o.id = uo.organization_id
WHERE u.email = 'adeliyitomiwa@yahoo.com';