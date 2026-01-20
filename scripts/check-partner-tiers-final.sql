-- =====================================================
-- CHECK PARTNER TIER HIERARCHY AND CONSTRAINTS
-- =====================================================

-- 1. Check the exact constraint on the partners table
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'partners'::regclass
  AND conname = 'partners_tier_check';

-- 2. Check what tier values actually exist in the database
SELECT
    tier,
    COUNT(*) as partner_count,
    AVG(commission_rate) as avg_commission_rate,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created
FROM partners
GROUP BY tier
ORDER BY tier;

-- 3. Check if there are any partners with incorrect tiers
SELECT
    id,
    email,
    full_name,
    tier,
    commission_rate,
    status,
    created_at
FROM partners
WHERE tier NOT IN ('standard', 'premium')
ORDER BY created_at DESC;

-- 4. Check pending partner applications
SELECT
    id,
    email,
    full_name,
    company_name,
    partner_type,
    status,
    submitted_at
FROM partner_applications
WHERE status = 'pending'
ORDER BY submitted_at DESC
LIMIT 10;

-- 5. Check the specific application that was causing the error
SELECT *
FROM partner_applications
WHERE id = '468b21fe-cdf5-447f-8ccb-d3acb1f3ceb1';

-- 6. Summary of partner statistics
SELECT
    'Total Partners' as metric,
    COUNT(*) as value
FROM partners
UNION ALL
SELECT
    'Standard Tier Partners' as metric,
    COUNT(*) as value
FROM partners
WHERE tier = 'standard'
UNION ALL
SELECT
    'Premium Tier Partners' as metric,
    COUNT(*) as value
FROM partners
WHERE tier = 'premium'
UNION ALL
SELECT
    'Active Partners' as metric,
    COUNT(*) as value
FROM partners
WHERE status = 'active'
UNION ALL
SELECT
    'Pending Applications' as metric,
    COUNT(*) as value
FROM partner_applications
WHERE status = 'pending';