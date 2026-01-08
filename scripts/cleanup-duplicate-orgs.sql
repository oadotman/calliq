-- =====================================================
-- CLEANUP DUPLICATE ORGANIZATIONS
-- =====================================================

-- 1. First, let's see what we're dealing with
SELECT 'DUPLICATE ORGANIZATIONS AUDIT' as report;

-- Show all Karamo organizations with their details
SELECT
  o.id,
  o.name,
  o.plan_type,
  o.created_at,
  o.used_minutes,
  (SELECT COUNT(*) FROM user_organizations WHERE organization_id = o.id) as member_count,
  (SELECT COUNT(*) FROM calls WHERE organization_id = o.id) as call_count,
  (SELECT STRING_AGG(u.email, ', ')
   FROM user_organizations uo
   JOIN auth.users u ON uo.user_id = u.id
   WHERE uo.organization_id = o.id) as members
FROM organizations o
WHERE o.name = 'Karamo'
ORDER BY o.created_at;

-- 2. Identify the organization to keep (the one with members and usage)
WITH org_to_keep AS (
  SELECT id
  FROM organizations
  WHERE name = 'Karamo'
    AND plan_type = 'starter'
    AND id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041' -- The one with 2 members
)
SELECT
  'ORGANIZATION TO KEEP' as status,
  id,
  name,
  plan_type,
  used_minutes
FROM organizations
WHERE id IN (SELECT id FROM org_to_keep);

-- 3. Check if any of the duplicate orgs have any data we need to preserve
SELECT
  'DATA IN DUPLICATE ORGS' as check_type,
  o.id as org_id,
  o.name,
  COUNT(DISTINCT c.id) as calls,
  COUNT(DISTINCT um.id) as usage_metrics,
  COUNT(DISTINCT ct.id) as custom_templates
FROM organizations o
LEFT JOIN calls c ON c.organization_id = o.id
LEFT JOIN usage_metrics um ON um.organization_id = o.id
LEFT JOIN custom_templates ct ON ct.organization_id = o.id
WHERE o.name = 'Karamo'
  AND o.id != '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041' -- Not the keeper
GROUP BY o.id, o.name
HAVING COUNT(DISTINCT c.id) > 0
    OR COUNT(DISTINCT um.id) > 0
    OR COUNT(DISTINCT ct.id) > 0;

-- 4. DELETE THE DUPLICATE EMPTY ORGANIZATIONS
-- Only delete if they have no members and no data
BEGIN;

-- Delete empty Karamo organizations (those with 0 members)
DELETE FROM organizations
WHERE name = 'Karamo'
  AND id != '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041' -- Keep the starter plan one with members
  AND NOT EXISTS (
    SELECT 1 FROM user_organizations WHERE organization_id = organizations.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM calls WHERE organization_id = organizations.id
  )
RETURNING id, name, plan_type, created_at;

COMMIT;

-- 5. Check for similar duplicates with other organization names
SELECT
  'OTHER DUPLICATE ORGANIZATIONS' as report,
  name,
  COUNT(*) as duplicate_count,
  STRING_AGG(id::text, ', ') as org_ids,
  STRING_AGG(plan_type, ', ') as plans
FROM organizations
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- 6. Final verification
SELECT
  'FINAL KARAMO ORG STATUS' as status,
  id,
  name,
  plan_type,
  used_minutes,
  (SELECT COUNT(*) FROM user_organizations WHERE organization_id = o.id) as members,
  (SELECT STRING_AGG(u.email, ', ')
   FROM user_organizations uo
   JOIN auth.users u ON uo.user_id = u.id
   WHERE uo.organization_id = o.id) as member_emails
FROM organizations o
WHERE name = 'Karamo';