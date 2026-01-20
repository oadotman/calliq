-- =====================================================
-- COMPLETE CHECK OF PARTNER TIER HIERARCHY
-- =====================================================

-- 1. Check the EXACT constraint on the partners table
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'partners'::regclass
  AND contype = 'c';  -- All check constraints

-- 2. Check what tier values ACTUALLY EXIST in the database right now
SELECT
    tier,
    COUNT(*) as partner_count,
    commission_rate,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created
FROM partners
GROUP BY tier, commission_rate
ORDER BY tier, commission_rate;

-- 3. Check if there are any NULL tiers
SELECT COUNT(*) as null_tier_count
FROM partners
WHERE tier IS NULL;

-- 4. List all unique tier values that exist
SELECT DISTINCT tier
FROM partners
ORDER BY tier;

-- 5. Check partner_applications table structure
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'partner_applications'
  AND column_name IN ('tier', 'proposed_tier', 'suggested_tier', 'commission_tier')
ORDER BY column_name;

-- 6. Check for any tier-related metadata in partners table
SELECT
    id,
    email,
    tier,
    metadata->>'original_tier' as metadata_original_tier,
    metadata->>'upgraded_from' as metadata_upgraded_from,
    metadata->>'tier_history' as metadata_tier_history
FROM partners
WHERE metadata IS NOT NULL
LIMIT 10;

-- 7. Check commission rates to understand the tier structure
SELECT
    tier,
    MIN(commission_rate) as min_rate,
    MAX(commission_rate) as max_rate,
    AVG(commission_rate) as avg_rate,
    COUNT(*) as count
FROM partners
GROUP BY tier
ORDER BY tier;

-- 8. Check if there are any partner_tiers or partner_levels tables
SELECT
    table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%partner%'
  AND (
    table_name LIKE '%tier%'
    OR table_name LIKE '%level%'
    OR table_name LIKE '%plan%'
    OR table_name LIKE '%grade%'
  );

-- 9. Check the partner_applications for any tier mentions
SELECT
    id,
    email,
    full_name,
    status,
    submitted_at
FROM partner_applications
WHERE status = 'pending'
ORDER BY submitted_at DESC
LIMIT 5;

-- 10. CRITICAL: Show the EXACT constraint definition for tier column
SELECT
    table_name,
    column_name,
    data_type,
    column_default,
    is_nullable,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'partners'
  AND column_name = 'tier';