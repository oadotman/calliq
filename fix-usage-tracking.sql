-- =====================================================
-- FIX: Update Organization Used Minutes to Match Actual
-- =====================================================

-- 1. First, let's see what the actual total should be
SELECT
  'Current Stored Usage' as description,
  used_minutes as value
FROM organizations
WHERE id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041'
UNION ALL
SELECT
  'Actual Total Usage (All Completed Calls)',
  COALESCE(SUM(duration_minutes), 0)::integer
FROM calls
WHERE organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041'
  AND status = 'completed'
  AND duration_minutes IS NOT NULL;

-- 2. UPDATE the organization's used_minutes to the correct total
UPDATE organizations
SET used_minutes = (
  SELECT COALESCE(SUM(duration_minutes), 0)
  FROM calls
  WHERE organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041'
    AND status = 'completed'
    AND duration_minutes IS NOT NULL
)
WHERE id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041';

-- 3. Verify the update worked
SELECT
  name,
  plan_type,
  max_minutes_monthly,
  used_minutes,
  ROUND((used_minutes::numeric / max_minutes_monthly::numeric * 100), 1) as usage_percentage
FROM organizations
WHERE id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041';

-- 4. Create a function to automatically update used_minutes when a call completes
-- This ensures future calls will update the usage automatically
CREATE OR REPLACE FUNCTION update_organization_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if status changed to 'completed' and duration_minutes is set
  IF NEW.status = 'completed' AND NEW.duration_minutes IS NOT NULL AND NEW.organization_id IS NOT NULL THEN
    -- Update the organization's used_minutes
    UPDATE organizations
    SET used_minutes = COALESCE(used_minutes, 0) + NEW.duration_minutes
    WHERE id = NEW.organization_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger to automatically update usage when calls complete
DROP TRIGGER IF EXISTS update_org_usage_on_call_complete ON calls;

CREATE TRIGGER update_org_usage_on_call_complete
AFTER UPDATE OF status ON calls
FOR EACH ROW
WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
EXECUTE FUNCTION update_organization_usage();

-- 6. Show the current month's usage breakdown
SELECT
  'Usage This Month' as period,
  COUNT(*) as call_count,
  COALESCE(SUM(duration_minutes), 0) as total_minutes
FROM calls
WHERE organization_id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041'
  AND status = 'completed'
  AND created_at >= DATE_TRUNC('month', NOW());

-- =====================================================
-- RESULT:
-- 1. Organization's used_minutes will be corrected
-- 2. Future calls will automatically update usage
-- 3. Dashboard will show accurate usage
-- =====================================================