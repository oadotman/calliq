-- =====================================================
-- CHECK PENDING PARTNER APPLICATION AND APPROVE
-- =====================================================

-- 1. View the pending partner application details
SELECT
    id,
    email,
    full_name,
    company_name,
    website,
    phone,
    partner_type,
    clients_per_year,
    crms_used,
    how_heard,
    why_partner,
    has_used_synqall,
    status,
    submitted_at,
    review_notes
FROM partner_applications
WHERE status = 'pending'
ORDER BY submitted_at DESC;

-- 2. If you want to manually approve the application,
-- uncomment and run this (replace the ID with actual application ID):
/*
-- First, update the application status
UPDATE partner_applications
SET
    status = 'approved',
    reviewed_at = NOW(),
    reviewed_by = (SELECT id FROM auth.users WHERE email = 'adeliyitomiwa@yahoo.com' LIMIT 1), -- Replace with your admin user ID
    review_notes = 'Manually approved via SQL'
WHERE id = 'YOUR_APPLICATION_ID_HERE';

-- Then, create the partner account
INSERT INTO partners (
    email,
    full_name,
    company_name,
    website,
    phone,
    partner_type,
    status,
    tier,
    commission_rate,
    referral_code,
    password_hash,
    approved_at,
    approved_by
)
SELECT
    email,
    full_name,
    company_name,
    website,
    phone,
    partner_type,
    'active' as status,
    'standard' as tier,  -- Start at standard tier
    0.25 as commission_rate,  -- 25% commission
    UPPER(SUBSTRING(full_name FROM 1 FOR 3)) || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4)) as referral_code,
    '$2a$10$' || ENCODE(SHA256(RANDOM()::TEXT::BYTEA), 'base64') as password_hash,  -- Temporary password hash
    NOW() as approved_at,
    (SELECT id FROM auth.users WHERE email = 'adeliyitomiwa@yahoo.com' LIMIT 1) as approved_by
FROM partner_applications
WHERE id = 'YOUR_APPLICATION_ID_HERE';

-- Create partner statistics record
INSERT INTO partner_statistics (
    partner_id,
    total_clicks,
    total_signups,
    total_trials,
    total_customers,
    active_customers,
    churned_customers,
    total_revenue_generated,
    total_commission_earned,
    total_commission_paid,
    total_commission_pending,
    total_commission_approved,
    average_customer_value,
    conversion_rate,
    churn_rate,
    current_month_earnings,
    last_month_earnings,
    lifetime_earnings
)
SELECT
    id as partner_id,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
FROM partners
WHERE email = (SELECT email FROM partner_applications WHERE id = 'YOUR_APPLICATION_ID_HERE');
*/

-- 3. Check if partner_statistics table exists
SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'partner_statistics'
) as partner_statistics_exists;

-- 4. Check if partner_activity_logs table exists
SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'partner_activity_logs'
) as partner_activity_logs_exists;