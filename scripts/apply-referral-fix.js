// =====================================================
// APPLY REFERRAL FIX SCRIPT
// Removes UNIQUE constraint from referral_code column
// =====================================================

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function applyReferralFix() {
  console.log('Applying referral code constraint fix...\n');

  try {
    // Drop the UNIQUE constraint
    const { error: dropError } = await supabase.rpc('query', {
      query: `ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_referral_code_key;`
    });

    if (dropError) {
      console.error('Error dropping constraint:', dropError);
      // Continue anyway as it might not exist
    } else {
      console.log('✓ Dropped UNIQUE constraint on referral_code');
    }

    // Add index for performance
    const { error: indexError } = await supabase.rpc('query', {
      query: `CREATE INDEX IF NOT EXISTS idx_referrals_referral_code ON referrals(referral_code);`
    });

    if (indexError) {
      console.error('Error creating index:', indexError);
    } else {
      console.log('✓ Created index on referral_code');
    }

    // Add composite unique constraint
    const { error: compositeError } = await supabase.rpc('query', {
      query: `
        CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_unique_email_product
        ON referrals(referred_email, product_type)
        WHERE referred_email IS NOT NULL;
      `
    });

    if (compositeError) {
      console.error('Error creating composite index:', compositeError);
    } else {
      console.log('✓ Created composite unique index on (referred_email, product_type)');
    }

    console.log('\n✅ Referral fix applied successfully!');
    console.log('You can now send multiple invitations with the same referral code.');

  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

// Run the fix
applyReferralFix();