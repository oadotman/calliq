// =====================================================
// BACKFILL MISSING USAGE_METRICS ENTRIES
// Fixes the issue where older calls don't have usage_metrics
// =====================================================

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function backfillUsageMetrics() {
  console.log('\n========================================');
  console.log('BACKFILLING MISSING USAGE METRICS');
  console.log('========================================\n');

  // 1. Get all completed calls with their organizations
  const { data: calls, error: callsError } = await supabase
    .from('calls')
    .select(`
      id,
      customer_name,
      sales_rep,
      duration_minutes,
      organization_id,
      user_id,
      processed_at,
      created_at
    `)
    .eq('status', 'completed')
    .not('duration_minutes', 'is', null)
    .not('organization_id', 'is', null)
    .order('processed_at', { ascending: false });

  if (callsError) {
    console.error('Error fetching calls:', callsError);
    return;
  }

  console.log(`Found ${calls.length} completed calls with duration and organization\n`);

  // 2. Get existing usage_metrics to avoid duplicates
  const { data: existingMetrics, error: metricsError } = await supabase
    .from('usage_metrics')
    .select('metadata')
    .eq('metric_type', 'minutes_transcribed');

  if (metricsError) {
    console.error('Error fetching existing metrics:', metricsError);
    return;
  }

  // Create a Set of call_ids that already have metrics
  const callsWithMetrics = new Set(
    existingMetrics
      .filter(m => m.metadata?.call_id)
      .map(m => m.metadata.call_id)
  );

  console.log(`Found ${callsWithMetrics.size} calls that already have usage metrics\n`);

  // 3. Find calls missing metrics
  const callsMissingMetrics = calls.filter(call => !callsWithMetrics.has(call.id));

  console.log(`Found ${callsMissingMetrics.length} calls MISSING usage metrics\n`);

  if (callsMissingMetrics.length === 0) {
    console.log('✅ All calls already have usage metrics! No backfill needed.');
    return;
  }

  // 4. Group by organization to show impact
  const byOrg = {};
  callsMissingMetrics.forEach(call => {
    if (!byOrg[call.organization_id]) {
      byOrg[call.organization_id] = {
        calls: [],
        totalMinutes: 0
      };
    }
    byOrg[call.organization_id].calls.push(call);
    byOrg[call.organization_id].totalMinutes += call.duration_minutes;
  });

  console.log('Missing metrics by organization:');
  for (const [orgId, data] of Object.entries(byOrg)) {
    console.log(`  Org ${orgId}: ${data.calls.length} calls, ${data.totalMinutes} minutes`);
  }
  console.log('');

  // 5. Ask for confirmation
  console.log('This will create usage_metrics entries for these calls.');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

  await new Promise(resolve => setTimeout(resolve, 5000));

  // 6. Create missing usage_metrics entries
  let created = 0;
  let failed = 0;

  for (const call of callsMissingMetrics) {
    const metricData = {
      organization_id: call.organization_id,
      user_id: call.user_id,
      metric_type: 'minutes_transcribed',
      metric_value: call.duration_minutes,
      metadata: {
        call_id: call.id,
        duration_minutes: call.duration_minutes,
        customer_name: call.customer_name,
        sales_rep: call.sales_rep,
        processed_at: call.processed_at || call.created_at,
        backfilled: true,
        backfilled_at: new Date().toISOString()
      }
    };

    const { error } = await supabase
      .from('usage_metrics')
      .insert(metricData);

    if (error) {
      console.error(`Failed to create metric for call ${call.id}:`, error.message);
      failed++;
    } else {
      console.log(`✅ Created metric for call ${call.id} (${call.duration_minutes} minutes)`);
      created++;
    }
  }

  console.log('\n========================================');
  console.log('BACKFILL COMPLETE');
  console.log('========================================');
  console.log(`Successfully created: ${created} usage metrics`);
  console.log(`Failed: ${failed}`);

  // 7. Verify the fix by checking totals again
  console.log('\nVerifying totals after backfill...\n');

  for (const orgId of Object.keys(byOrg)) {
    // Get organization details
    const { data: org } = await supabase
      .from('organizations')
      .select('name, used_minutes, max_minutes_monthly')
      .eq('id', orgId)
      .single();

    // Get new total from usage_metrics
    const { data: metrics } = await supabase
      .from('usage_metrics')
      .select('metric_value')
      .eq('organization_id', orgId)
      .eq('metric_type', 'minutes_transcribed');

    const metricsTotal = (metrics || []).reduce((sum, m) => sum + m.metric_value, 0);

    console.log(`${org?.name || orgId}:`);
    console.log(`  - organizations.used_minutes: ${org?.used_minutes}`);
    console.log(`  - Sum of usage_metrics: ${metricsTotal}`);
    console.log(`  - Match: ${org?.used_minutes === metricsTotal ? '✅' : '❌'}`);
  }

  console.log('\n✅ Backfill complete! The dashboard should now show correct usage.');
  console.log('========================================\n');
}

backfillUsageMetrics().catch(console.error);