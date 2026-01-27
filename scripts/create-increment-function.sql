-- =====================================================
-- CREATE ATOMIC INCREMENT FUNCTION FOR USED_MINUTES
-- This prevents race conditions when updating usage
-- =====================================================

-- Create function for atomic increment of used_minutes
CREATE OR REPLACE FUNCTION increment_used_minutes(
    org_id UUID,
    minutes_to_add NUMERIC
) RETURNS void AS $$
BEGIN
    UPDATE organizations
    SET
        used_minutes = COALESCE(used_minutes, 0) + minutes_to_add,
        updated_at = NOW()
    WHERE id = org_id;

    -- Log the increment
    RAISE NOTICE 'Incremented % minutes for org %', minutes_to_add, org_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_used_minutes TO authenticated;
GRANT EXECUTE ON FUNCTION increment_used_minutes TO service_role;

-- Test the function
SELECT 'Testing increment_used_minutes function' as info;

-- Show current usage for all organizations
SELECT
    name,
    used_minutes as before_test,
    max_minutes_monthly
FROM organizations
ORDER BY name;