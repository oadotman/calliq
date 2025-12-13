-- =====================================================
-- FIX REFERRAL CODE CONSTRAINT
-- Remove UNIQUE constraint from referral_code to allow
-- multiple referrals with the same code (from same referrer)
-- =====================================================

-- Drop the UNIQUE constraint on referral_code
ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_referral_code_key;

-- Add an index for performance when querying by referral_code
CREATE INDEX IF NOT EXISTS idx_referrals_referral_code ON referrals(referral_code);

-- Add a composite unique constraint to prevent duplicate referrals to the same email
-- This ensures one referral per email per product type
CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_unique_email_product
ON referrals(referred_email, product_type)
WHERE referred_email IS NOT NULL;

-- Add index for referrer_id for better query performance
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);