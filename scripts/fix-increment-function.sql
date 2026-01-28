-- =====================================================
-- FIX INCREMENT FUNCTION - HANDLE EXISTING FUNCTION
-- =====================================================

-- First, check what increment_used_minutes functions exist
SELECT
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments,
    prosrc as source_preview
FROM pg_proc
WHERE proname = 'increment_used_minutes';

-- Drop existing function(s) with specific signatures
DROP FUNCTION IF EXISTS increment_used_minutes(UUID, NUMERIC);
DROP FUNCTION IF EXISTS increment_used_minutes(UUID, INTEGER);
DROP FUNCTION IF EXISTS increment_used_minutes(UUID, DOUBLE PRECISION);
DROP FUNCTION IF EXISTS increment_used_minutes(UUID, REAL);

-- Create the correct function with explicit signature
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
GRANT EXECUTE ON FUNCTION increment_used_minutes(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_used_minutes(UUID, NUMERIC) TO service_role;

-- Test the function exists with correct signature
SELECT
    'Function created successfully' as status,
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'increment_used_minutes';