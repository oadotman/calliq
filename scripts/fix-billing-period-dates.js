// =====================================================
// FIX: Update Organization Billing Period Dates
// The billing periods are stuck in 2025, needs to be 2026
// =====================================================

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixBillingPeriodDates() {
  console.log('\n========================================');
  console.log('FIXING BILLING PERIOD DATES');
  console.log('========================================\n');

  // Get all organizations with outdated billing periods
  const { data: organizations, error } = await supabase
    .from('organizations')
    .select('*');

  if (error) {
    console.error('Error fetching organizations:', error);
    return;
  }

  console.log(`Found ${organizations.length} organizations to check\n`);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let updated = 0;
  let skipped = 0;

  for (const org of organizations) {
    console.log(`\nOrganization: ${org.name} (${org.plan_type})`);
    console.log(`  Current period: ${org.current_period_start?.substring(0, 10)} to ${org.current_period_end?.substring(0, 10)}`);

    // Check if billing period needs updating
    const periodStart = org.current_period_start ? new Date(org.current_period_start) : null;
    const periodEnd = org.current_period_end ? new Date(org.current_period_end) : null;

    let needsUpdate = false;

    // If no period is set, or if the period is in the past
    if (!periodStart || !periodEnd || periodEnd < now) {
      needsUpdate = true;
    }

    if (needsUpdate) {
      // Set to current month's billing period
      const newPeriodStart = new Date(currentYear, currentMonth, 1);
      const newPeriodEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

      console.log(`  ✅ Updating to: ${newPeriodStart.toISOString().substring(0, 10)} to ${newPeriodEnd.toISOString().substring(0, 10)}`);

      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          current_period_start: newPeriodStart.toISOString(),
          current_period_end: newPeriodEnd.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', org.id);

      if (updateError) {
        console.error(`  ❌ Failed to update: ${updateError.message}`);
      } else {
        updated++;

        // Now calculate the correct usage for this period
        const { data: periodMetrics } = await supabase
          .from('usage_metrics')
          .select('metric_value')
          .eq('organization_id', org.id)
          .eq('metric_type', 'minutes_transcribed')
          .gte('created_at', newPeriodStart.toISOString())
          .lte('created_at', newPeriodEnd.toISOString());

        const periodUsage = (periodMetrics || []).reduce((sum, m) => sum + m.metric_value, 0);
        console.log(`  Usage for new period: ${periodUsage} minutes`);
      }
    } else {
      console.log(`  ⏭️ Skipping - period is still valid`);
      skipped++;
    }
  }

  console.log('\n========================================');
  console.log('SUMMARY:');
  console.log('========================================');
  console.log(`Updated: ${updated} organizations`);
  console.log(`Skipped: ${skipped} organizations`);

  // Test the specific Karamo organization
  console.log('\n📊 VERIFYING KARAMO ORGANIZATION:');
  const { data: karamo } = await supabase
    .from('organizations')
    .select('*')
    .eq('name', 'Karamo')
    .single();

  if (karamo) {
    console.log(`  Name: ${karamo.name}`);
    console.log(`  Plan: ${karamo.plan_type} (${karamo.max_minutes_monthly} minutes/month)`);
    console.log(`  New period: ${karamo.current_period_start?.substring(0, 10)} to ${karamo.current_period_end?.substring(0, 10)}`);

    // Calculate usage for the new period
    const { data: karamoMetrics } = await supabase
      .from('usage_metrics')
      .select('metric_value')
      .eq('organization_id', karamo.id)
      .eq('metric_type', 'minutes_transcribed')
      .gte('created_at', karamo.current_period_start)
      .lte('created_at', karamo.current_period_end);

    const karamoUsage = (karamoMetrics || []).reduce((sum, m) => sum + m.metric_value, 0);
    console.log(`  Usage for current period: ${karamoUsage} minutes`);
    console.log(`  Remaining: ${karamo.max_minutes_monthly - karamoUsage} minutes`);
  }

  console.log('\n✅ Billing periods updated! The dashboard should now show correct usage for January 2026.');
  console.log('========================================\n');
}

fixBillingPeriodDates().catch(console.error);