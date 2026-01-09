// =====================================================
// PROPERLY RESET USED_MINUTES TO ACTUAL CURRENT PERIOD USAGE
// Fixes the issue where used_minutes shows all-time total
// =====================================================

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetUsedMinutesToCurrentPeriod() {
  console.log('\n========================================');
  console.log('RESETTING USED_MINUTES TO CURRENT PERIOD USAGE');
  console.log('========================================\n');

  // Get all organizations
  const { data: organizations, error } = await supabase
    .from('organizations')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching organizations:', error);
    return;
  }

  console.log(`Found ${organizations.length} organizations to process\n`);

  let updated = 0;
  let errors = 0;

  for (const org of organizations) {
    console.log(`\nProcessing: ${org.name} (${org.plan_type})`);
    console.log(`  Current used_minutes: ${org.used_minutes}`);
    console.log(`  Period: ${org.current_period_start?.substring(0, 10)} to ${org.current_period_end?.substring(0, 10)}`);

    // Calculate actual usage for current period
    const periodStart = org.current_period_start;
    const periodEnd = org.current_period_end;

    if (!periodStart || !periodEnd) {
      console.log('  ⚠️ No billing period set, skipping');
      continue;
    }

    // Get usage metrics for current period
    const { data: metrics, error: metricsError } = await supabase
      .from('usage_metrics')
      .select('metric_value')
      .eq('organization_id', org.id)
      .eq('metric_type', 'minutes_transcribed')
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd);

    if (metricsError) {
      console.error(`  ❌ Error fetching metrics: ${metricsError.message}`);
      errors++;
      continue;
    }

    const actualPeriodUsage = (metrics || []).reduce((sum, m) => sum + (m.metric_value || 0), 0);

    console.log(`  Actual period usage: ${actualPeriodUsage} minutes`);

    if (org.used_minutes !== actualPeriodUsage) {
      console.log(`  ✅ Updating used_minutes: ${org.used_minutes} → ${actualPeriodUsage}`);

      // Update the organization
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          used_minutes: actualPeriodUsage,
          updated_at: new Date().toISOString()
        })
        .eq('id', org.id);

      if (updateError) {
        console.error(`  ❌ Failed to update: ${updateError.message}`);
        errors++;
      } else {
        updated++;
        console.log(`  ✅ Successfully updated`);
      }
    } else {
      console.log(`  ⏭️ Already correct, no update needed`);
    }
  }

  console.log('\n========================================');
  console.log('SUMMARY:');
  console.log('========================================');
  console.log(`Updated: ${updated} organizations`);
  console.log(`Errors: ${errors}`);

  // Verify specific organization (Karamo)
  console.log('\n📊 VERIFYING KARAMO ORGANIZATION:');
  const { data: karamo } = await supabase
    .from('organizations')
    .select('*')
    .eq('name', 'Karamo')
    .single();

  if (karamo) {
    // Get current period metrics
    const { data: karamoMetrics } = await supabase
      .from('usage_metrics')
      .select('metric_value')
      .eq('organization_id', karamo.id)
      .eq('metric_type', 'minutes_transcribed')
      .gte('created_at', karamo.current_period_start)
      .lte('created_at', karamo.current_period_end);

    const karamoUsage = (karamoMetrics || []).reduce((sum, m) => sum + m.metric_value, 0);

    console.log(`  Name: ${karamo.name}`);
    console.log(`  Plan: ${karamo.plan_type} (${karamo.max_minutes_monthly} minutes/month)`);
    console.log(`  Period: ${karamo.current_period_start?.substring(0, 10)} to ${karamo.current_period_end?.substring(0, 10)}`);
    console.log(`  used_minutes in DB: ${karamo.used_minutes}`);
    console.log(`  Actual period usage: ${karamoUsage} minutes`);
    console.log(`  Match: ${karamo.used_minutes === karamoUsage ? '✅' : '❌'}`);
    console.log(`  Remaining: ${karamo.max_minutes_monthly - karamo.used_minutes} minutes`);
  }

  console.log('\n✅ Used minutes have been reset to current period values!');
  console.log('The dashboard should now show correct usage.');
  console.log('========================================\n');
}

resetUsedMinutesToCurrentPeriod().catch(console.error);