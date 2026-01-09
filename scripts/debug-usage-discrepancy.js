// =====================================================
// DEBUG: Why Usage Metrics Don't Match Organizations Table
// =====================================================

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugUsageDiscrepancy() {
  console.log('\n========================================');
  console.log('DEBUGGING USAGE DISCREPANCY');
  console.log('========================================\n');

  const orgId = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041'; // Karamo org

  // 1. Get organization details
  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single();

  console.log('Organization:', {
    name: org.name,
    planType: org.plan_type,
    usedMinutes: org.used_minutes,
    maxMinutes: org.max_minutes_monthly,
    currentPeriodStart: org.current_period_start,
    currentPeriodEnd: org.current_period_end
  });

  // 2. Get ALL usage_metrics for this org
  console.log('\n2. ALL USAGE METRICS FOR ORGANIZATION:');
  const { data: allMetrics } = await supabase
    .from('usage_metrics')
    .select('*')
    .eq('organization_id', orgId)
    .eq('metric_type', 'minutes_transcribed')
    .order('created_at', { ascending: false });

  console.log(`Total metrics entries: ${allMetrics?.length || 0}`);

  // Group by month
  const metricsByMonth = {};
  allMetrics?.forEach(m => {
    const month = new Date(m.created_at).toISOString().substring(0, 7);
    if (!metricsByMonth[month]) {
      metricsByMonth[month] = { count: 0, minutes: 0, entries: [] };
    }
    metricsByMonth[month].count++;
    metricsByMonth[month].minutes += m.metric_value;
    metricsByMonth[month].entries.push({
      value: m.metric_value,
      callId: m.metadata?.call_id,
      created: m.created_at
    });
  });

  console.log('\nMetrics by month:');
  for (const [month, data] of Object.entries(metricsByMonth)) {
    console.log(`  ${month}: ${data.count} entries, ${data.minutes} minutes`);
  }

  // 3. Calculate current period usage (like the dashboard does)
  console.log('\n3. CURRENT PERIOD CALCULATION:');

  const now = new Date();
  const periodStart = org.current_period_start || new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const periodEnd = org.current_period_end || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

  console.log(`Period: ${periodStart.substring(0, 10)} to ${periodEnd.substring(0, 10)}`);

  const { data: periodMetrics } = await supabase
    .from('usage_metrics')
    .select('*')
    .eq('organization_id', orgId)
    .eq('metric_type', 'minutes_transcribed')
    .gte('created_at', periodStart)
    .lte('created_at', periodEnd);

  const periodTotal = (periodMetrics || []).reduce((sum, m) => sum + m.metric_value, 0);

  console.log(`Current period metrics: ${periodMetrics?.length || 0} entries`);
  console.log(`Current period total: ${periodTotal} minutes`);

  if (periodMetrics && periodMetrics.length > 0) {
    console.log('\nCurrent period entries:');
    periodMetrics.forEach(m => {
      console.log(`  - ${m.metric_value} minutes on ${m.created_at.substring(0, 19)} (call: ${m.metadata?.call_id?.substring(0, 8)}...)`);
    });
  }

  // 4. Get ALL completed calls for comparison
  console.log('\n4. COMPLETED CALLS FOR ORGANIZATION:');
  const { data: allCalls } = await supabase
    .from('calls')
    .select('id, duration_minutes, created_at, processed_at')
    .eq('organization_id', orgId)
    .eq('status', 'completed')
    .not('duration_minutes', 'is', null);

  const callsTotal = (allCalls || []).reduce((sum, c) => sum + c.duration_minutes, 0);

  console.log(`Total completed calls: ${allCalls?.length || 0}`);
  console.log(`Total minutes from calls: ${callsTotal}`);

  // Group calls by month
  const callsByMonth = {};
  allCalls?.forEach(c => {
    const month = new Date(c.processed_at || c.created_at).toISOString().substring(0, 7);
    if (!callsByMonth[month]) {
      callsByMonth[month] = { count: 0, minutes: 0 };
    }
    callsByMonth[month].count++;
    callsByMonth[month].minutes += c.duration_minutes;
  });

  console.log('\nCalls by month:');
  for (const [month, data] of Object.entries(callsByMonth)) {
    console.log(`  ${month}: ${data.count} calls, ${data.minutes} minutes`);
  }

  // 5. Find calls without metrics
  console.log('\n5. CHECKING FOR CALLS WITHOUT METRICS:');
  const callIds = new Set(allCalls?.map(c => c.id) || []);
  const metricsCallIds = new Set(allMetrics?.filter(m => m.metadata?.call_id).map(m => m.metadata.call_id) || []);

  const callsWithoutMetrics = Array.from(callIds).filter(id => !metricsCallIds.has(id));

  if (callsWithoutMetrics.length > 0) {
    console.log(`❌ Found ${callsWithoutMetrics.length} calls WITHOUT metrics:`);
    for (const callId of callsWithoutMetrics) {
      const call = allCalls.find(c => c.id === callId);
      console.log(`  - Call ${callId.substring(0, 8)}... (${call?.duration_minutes} minutes)`);
    }
  } else {
    console.log('✅ All calls have corresponding metrics');
  }

  // 6. Summary
  console.log('\n========================================');
  console.log('SUMMARY:');
  console.log('========================================');
  console.log(`Organization: ${org.name}`);
  console.log(`\nTotals (all time):`);
  console.log(`  - organizations.used_minutes: ${org.used_minutes}`);
  console.log(`  - Sum of ALL usage_metrics: ${allMetrics?.reduce((sum, m) => sum + m.metric_value, 0) || 0}`);
  console.log(`  - Sum of ALL calls: ${callsTotal}`);

  console.log(`\nCurrent billing period (${periodStart.substring(0, 10)} to ${periodEnd.substring(0, 10)}):`);
  console.log(`  - Usage metrics in period: ${periodTotal} minutes`);
  console.log(`  - This is what the dashboard shows!`);

  console.log(`\n❗ ISSUE IDENTIFIED:`);
  if (periodTotal !== org.used_minutes) {
    console.log(`The dashboard calculates usage for the CURRENT PERIOD only (${periodTotal} minutes)`);
    console.log(`But organizations.used_minutes tracks ALL TIME usage (${org.used_minutes} minutes)`);
    console.log(`This is why the dashboard shows less usage than expected!`);
  }

  console.log('\n========================================\n');
}

debugUsageDiscrepancy().catch(console.error);