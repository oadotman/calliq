-- =====================================================
-- MIGRATION: Rename Pricing Tiers
-- Date: 2025-11-27
-- Description: Rename team_5, team_10, team_20 to team_starter, team_pro, team_enterprise
-- =====================================================

-- IMPORTANT: Run this migration AFTER deploying the updated application code

BEGIN;

-- Step 1: Drop the existing CHECK constraint
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_plan_type_check;

-- Step 2: Update existing organization records to use new tier names
UPDATE organizations
SET plan_type = 'team_starter'
WHERE plan_type = 'team_5';

UPDATE organizations
SET plan_type = 'team_pro'
WHERE plan_type = 'team_10';

UPDATE organizations
SET plan_type = 'team_enterprise'
WHERE plan_type = 'team_20';

-- Step 3: Add the new CHECK constraint with updated tier names
ALTER TABLE organizations
ADD CONSTRAINT organizations_plan_type_check
CHECK (plan_type IN ('free', 'solo', 'team_starter', 'team_pro', 'team_enterprise', 'enterprise'));

-- Step 4: Verify the migration
SELECT
  plan_type,
  COUNT(*) as count
FROM organizations
GROUP BY plan_type
ORDER BY plan_type;

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- Run these after migration to confirm success:
-- =====================================================

-- 1. Check that no old tier names exist
-- SELECT * FROM organizations WHERE plan_type IN ('team_5', 'team_10', 'team_20');
-- Expected result: 0 rows

-- 2. View all current plan types
-- SELECT plan_type, COUNT(*) FROM organizations GROUP BY plan_type;
