-- =====================================================
-- CHECK PARTNER TIER HIERARCHY AND CONSTRAINTS
-- =====================================================

-- 1. Check the actual constraint on the partners table
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'partners'::regclass
  AND contype = 'c'  -- Check constraints
  AND conname LIKE '%tier%';

-- 2. Check what tier values actually exist in the database
SELECT
    tier,
    COUNT(*) as partner_count,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created
FROM partners
GROUP BY tier
ORDER BY tier;

-- 3. Check all partners with their details
SELECT
    id,
    email,
    full_name,
    company_name,
    tier,
    status,
    commission_rate,
    created_at,
    approved_at
FROM partners
ORDER BY created_at DESC;

-- 4. Check if there are any tier-related columns in other tables
SELECT
    table_name,
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name LIKE '%tier%'
ORDER BY table_name, column_name;

-- 5. Check partner applications to see what's pending
SELECT
    id,
    email,
    full_name,
    company_name,
    partner_type,
    status,
    submitted_at,
    reviewed_at
FROM partner_applications
WHERE status = 'pending'
ORDER BY submitted_at DESC;

-- 6. Check if there's a partner tier configuration or pricing table
SELECT
    table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%tier%'
    OR table_name LIKE '%partner_tier%'
    OR table_name LIKE '%partner_plan%'
    OR table_name LIKE '%partner_level%'
    OR table_name LIKE '%partner_pricing%'
  );

-- 7. Check commission rates by tier (if any patterns exist)
SELECT
    tier,
    commission_rate,
    COUNT(*) as count
FROM partners
GROUP BY tier, commission_rate
ORDER BY tier, commission_rate;

-- 8. Check if there are any references to tiers in JSONB metadata
SELECT
    id,
    email,
    metadata->>'tier' as metadata_tier,
    metadata->>'plan' as metadata_plan,
    metadata->>'level' as metadata_level
FROM partners
WHERE metadata IS NOT NULL
  AND (
    metadata ? 'tier'
    OR metadata ? 'plan'
    OR metadata ? 'level'
  );