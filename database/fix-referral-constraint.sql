-- =====================================================
-- FIX REFERRAL CODE CONSTRAINT
-- Run this in Supabase SQL Editor to fix the referral issue
-- =====================================================

-- 1. Drop the UNIQUE constraint on referral_code
-- This allows multiple referrals to share the same code
ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_referral_code_key;

-- 2. Add an index for performance when querying by referral_code
CREATE INDEX IF NOT EXISTS idx_referrals_referral_code ON referrals(referral_code);

-- 3. Ensure we still have the constraint to prevent duplicate referrals to same email
-- (This should already exist but we'll ensure it's there)
ALTER TABLE referrals DROP CONSTRAINT IF EXISTS unique_referral_per_email_product;
ALTER TABLE referrals ADD CONSTRAINT unique_referral_per_email_product
  UNIQUE(referred_email, product_type);

-- 4. Add index for referrer_id for better query performance
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);

-- Verify the changes
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'referrals'
  AND tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY')
ORDER BY tc.constraint_type, tc.constraint_name;