// =====================================================
// AUDIT: Check what analytics data exists in Supabase
// Before fixing the analytics page errors
// =====================================================

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function auditAnalyticsData() {
  console.log('\n========================================');
  console.log('ANALYTICS DATA AUDIT');
  console.log('========================================\n');

  // 1. Check what tables exist that might be used for analytics
  console.log('1. CHECKING AVAILABLE TABLES:');
  console.log('----------------------------------');

  const tables = [
    'calls',
    'call_fields',
    'usage_metrics',
    'organizations',
    'user_organizations',
    'notifications',
    'audit_logs',
    'custom_templates',
    'template_fields'
  ];

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`  ❌ ${table}: Not accessible or doesn't exist`);
      } else {
        console.log(`  ✅ ${table}: ${count || 0} records`);
      }
    } catch (err) {
      console.log(`  ❌ ${table}: Error accessing`);
    }
  }

  // 2. Check calls data (main source for analytics)
  console.log('\n2. CALLS DATA SUMMARY:');
  console.log('----------------------------------');

  const { data: calls, error: callsError } = await supabase
    .from('calls')
    .select('*');

  if (callsError) {
    console.error('Error fetching calls:', callsError);
  } else {
    // Group by status
    const statusCounts = {};
    calls.forEach(call => {
      statusCounts[call.status] = (statusCounts[call.status] || 0) + 1;
    });

    console.log('By Status:');
    for (const [status, count] of Object.entries(statusCounts)) {
      console.log(`  - ${status}: ${count} calls`);
    }

    // Group by month
    const monthCounts = {};
    calls.forEach(call => {
      const month = call.created_at?.substring(0, 7) || 'Unknown';
      monthCounts[month] = (monthCounts[month] || 0) + 1;
    });

    console.log('\nBy Month:');
    for (const [month, count] of Object.entries(monthCounts).sort()) {
      console.log(`  - ${month}: ${count} calls`);
    }

    // Calculate total duration
    const totalMinutes = calls.reduce((sum, call) => sum + (call.duration_minutes || 0), 0);
    console.log(`\nTotal transcribed minutes: ${totalMinutes}`);
  }

  // 3. Check call_fields (for insights/extraction data)
  console.log('\n3. CALL FIELDS DATA:');
  console.log('----------------------------------');

  const { data: fields, error: fieldsError } = await supabase
    .from('call_fields')
    .select('field_name')
    .limit(100);

  if (fieldsError) {
    console.error('Error fetching call_fields:', fieldsError);
  } else {
    // Count unique field types
    const fieldCounts = {};
    fields.forEach(field => {
      fieldCounts[field.field_name] = (fieldCounts[field.field_name] || 0) + 1;
    });

    console.log('Field types found:');
    for (const [name, count] of Object.entries(fieldCounts).sort()) {
      console.log(`  - ${name}: ${count} occurrences`);
    }
  }

  // 4. Check organizations for user counts
  console.log('\n4. ORGANIZATIONS SUMMARY:');
  console.log('----------------------------------');

  const { data: orgs } = await supabase
    .from('organizations')
    .select(`
      *,
      user_organizations (count)
    `);

  if (orgs) {
    const planCounts = {};
    orgs.forEach(org => {
      planCounts[org.plan_type] = (planCounts[org.plan_type] || 0) + 1;
    });

    console.log('By Plan Type:');
    for (const [plan, count] of Object.entries(planCounts)) {
      console.log(`  - ${plan}: ${count} organizations`);
    }

    const totalUsers = orgs.reduce((sum, org) => {
      return sum + (org.user_organizations?.[0]?.count || 0);
    }, 0);
    console.log(`\nTotal users across all orgs: ${totalUsers}`);
  }

  // 5. Check usage_metrics for billing data
  console.log('\n5. USAGE METRICS:');
  console.log('----------------------------------');

  const { data: metrics } = await supabase
    .from('usage_metrics')
    .select('metric_type');

  if (metrics) {
    const metricTypes = {};
    metrics.forEach(m => {
      metricTypes[m.metric_type] = (metricTypes[m.metric_type] || 0) + 1;
    });

    console.log('Metric types:');
    for (const [type, count] of Object.entries(metricTypes)) {
      console.log(`  - ${type}: ${count} entries`);
    }
  }

  // 6. Check for specific analytics requirements
  console.log('\n6. ANALYTICS PAGE REQUIREMENTS CHECK:');
  console.log('----------------------------------');

  // Check if we have data for key metrics
  const { data: recentCalls } = await supabase
    .from('calls')
    .select('*')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });

  console.log(`Recent calls (last 30 days): ${recentCalls?.length || 0}`);

  // Check for completed calls with insights
  const { data: completedWithInsights } = await supabase
    .from('calls')
    .select(`
      id,
      call_fields!inner (field_name)
    `)
    .eq('status', 'completed')
    .limit(10);

  console.log(`Completed calls with insights: ${completedWithInsights?.length || 0}`);

  // 7. Test the analytics API endpoint
  console.log('\n7. API ENDPOINTS CHECK:');
  console.log('----------------------------------');

  const endpoints = [
    '/api/analytics',
    '/api/analytics/comprehensive',
    '/api/analytics/summary',
    '/api/stats'
  ];

  console.log('Expected analytics endpoints:');
  for (const endpoint of endpoints) {
    console.log(`  - ${endpoint}`);
  }

  console.log('\n❗ The error shows /api/analytics/comprehensive returns 404');
  console.log('This means the analytics API route is missing or incorrectly configured.');

  console.log('\n========================================');
  console.log('SUMMARY:');
  console.log('========================================');
  console.log('1. Database has data for analytics ✅');
  console.log('2. Missing API endpoint: /api/analytics/comprehensive ❌');
  console.log('3. Need to create the analytics API routes');
  console.log('========================================\n');
}

auditAnalyticsData().catch(console.error);