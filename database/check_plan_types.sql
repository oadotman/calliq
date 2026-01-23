-- Check what plan types currently exist in the database
SELECT DISTINCT plan_type, COUNT(*) as count
FROM organizations
GROUP BY plan_type
ORDER BY plan_type;