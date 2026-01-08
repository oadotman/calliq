const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function diagnoseUsageTracking() {
  console.log('====================================');
  console.log('USAGE TRACKING DIAGNOSTIC REPORT');
  console.log('====================================\n');

  // 1. Check adeiyitomiwa@yahoo.com's specific case
  console.log('1. INVESTIGATING: adeiyitomiwa@yahoo.com');
  console.log('----------------------------------------');

  // Get user details
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'adeiyitomiwa@yahoo.com')
    .single();

  if (!user) {
    console.log('❌ User not found!');
  } else {
    console.log('✓ User found:', {
      id: user.id,
      email: user.email,
      plan: user.subscription_plan || 'free'
    });

    // Get user's organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (!userOrg) {
      console.log('❌ NO ORGANIZATION FOUND FOR USER - THIS IS THE PROBLEM!');
      console.log('   Without an organization, usage cannot be tracked!');
    } else {
      console.log('✓ User organization:', userOrg);

      // Get organization details
      const { data: org } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', userOrg.organization_id)
        .single();

      console.log('✓ Organization details:', {
        id: org.id,
        name: org.name,
        plan: org.subscription_plan,
        used_minutes: org.used_minutes,
        plan_minutes: org.plan_minutes,
        overage_minutes: org.overage_minutes
      });

      // Check recent calls
      const { data: recentCalls } = await supabase
        .from('calls')
        .select('id, customer_name, duration_minutes, processed_at, status, organization_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      console.log('\nRecent calls by user:');
      recentCalls?.forEach(call => {
        console.log(`  - Call ${call.id}:`, {
          customer: call.customer_name,
          minutes: call.duration_minutes,
          status: call.status,
          has_org: !!call.organization_id,
          processed: call.processed_at
        });
      });

      // Check usage metrics for this user
      const { data: metrics } = await supabase
        .from('usage_metrics')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      console.log('\nUsage metrics recorded:');
      if (!metrics || metrics.length === 0) {
        console.log('  ❌ NO USAGE METRICS FOUND!');
      } else {
        metrics.forEach(m => {
          console.log(`  - ${m.created_at}:`, {
            minutes: m.metric_value,
            call_id: m.metadata?.call_id,
            org_id: m.organization_id
          });
        });
      }
    }
  }

  console.log('\n2. INVESTIGATING: 3x MULTIPLICATION ISSUE');
  console.log('----------------------------------------');

  // Check for discrepancies in duration tracking
  const { data: callsWithIssues } = await supabase
    .from('calls')
    .select(`
      id,
      customer_name,
      duration,
      duration_minutes,
      user_id,
      organization_id,
      status,
      created_at,
      processed_at
    `)
    .eq('status', 'completed')
    .not('duration_minutes', 'is', null)
    .order('created_at', { ascending: false })
    .limit(20);

  console.log('\nRecent completed calls analysis:');
  console.log('(Looking for duration calculation issues)\n');

  let issuesFound = [];

  callsWithIssues?.forEach(call => {
    const expectedMinutes = call.duration ? Math.ceil(call.duration / 60) : null;
    const actualMinutes = call.duration_minutes;

    if (expectedMinutes && actualMinutes) {
      const ratio = actualMinutes / expectedMinutes;

      if (Math.abs(ratio - 1) > 0.1) { // More than 10% difference
        issuesFound.push({
          call_id: call.id,
          customer: call.customer_name,
          duration_seconds: call.duration,
          expected_minutes: expectedMinutes,
          actual_minutes: actualMinutes,
          ratio: ratio.toFixed(2),
          created: call.created_at
        });
      }
    }

    // Also check if organization_id is missing
    if (!call.organization_id) {
      console.log(`  ⚠️ Call ${call.id} missing organization_id!`);
    }
  });

  if (issuesFound.length > 0) {
    console.log('\n❌ FOUND DURATION CALCULATION ISSUES:');
    issuesFound.forEach(issue => {
      console.log(`  Call ${issue.call_id}:`, {
        customer: issue.customer,
        expected: `${issue.expected_minutes} min`,
        actual: `${issue.actual_minutes} min`,
        ratio: `${issue.ratio}x`,
        problem: issue.ratio > 2 ? '🔴 LIKELY 3X ISSUE!' : '⚠️ Discrepancy'
      });
    });
  } else {
    console.log('✓ No obvious duration calculation issues found in recent calls');
  }

  // Check for duplicate usage entries
  console.log('\n3. CHECKING FOR DUPLICATE USAGE ENTRIES');
  console.log('----------------------------------------');

  const { data: allMetrics } = await supabase
    .from('usage_metrics')
    .select('*')
    .eq('metric_type', 'minutes_transcribed')
    .order('created_at', { ascending: false })
    .limit(50);

  // Group by call_id to find duplicates
  const callIdCounts = {};
  allMetrics?.forEach(m => {
    const callId = m.metadata?.call_id;
    if (callId) {
      if (!callIdCounts[callId]) {
        callIdCounts[callId] = [];
      }
      callIdCounts[callId].push({
        id: m.id,
        minutes: m.metric_value,
        created: m.created_at,
        org_id: m.organization_id
      });
    }
  });

  const duplicates = Object.entries(callIdCounts).filter(([_, entries]) => entries.length > 1);

  if (duplicates.length > 0) {
    console.log('\n❌ FOUND DUPLICATE USAGE ENTRIES:');
    duplicates.forEach(([callId, entries]) => {
      const totalMinutes = entries.reduce((sum, e) => sum + e.minutes, 0);
      console.log(`  Call ${callId}:`);
      console.log(`    - Recorded ${entries.length} times`);
      console.log(`    - Total minutes charged: ${totalMinutes} (should be ${entries[0].minutes})`);
      console.log(`    - Overcharged by: ${totalMinutes - entries[0].minutes} minutes`);
      entries.forEach(e => {
        console.log(`      • ${e.created}: ${e.minutes} min (org: ${e.org_id})`);
      });
    });
  } else {
    console.log('✓ No duplicate usage entries found');
  }

  // Check for users without organizations
  console.log('\n4. CHECKING FOR USERS WITHOUT ORGANIZATIONS');
  console.log('--------------------------------------------');

  const { data: recentUsers } = await supabase
    .from('users')
    .select('id, email, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  for (const u of recentUsers) {
    const { data: org } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', u.id)
      .single();

    if (!org) {
      console.log(`  ❌ ${u.email} - NO ORGANIZATION!`);

      // Check if they have any calls
      const { count } = await supabase
        .from('calls')
        .select('id', { count: 'exact' })
        .eq('user_id', u.id);

      if (count > 0) {
        console.log(`     ⚠️ Has ${count} calls but no org - USAGE NOT TRACKED!`);
      }
    }
  }

  console.log('\n====================================');
  console.log('DIAGNOSTIC COMPLETE');
  console.log('====================================');

  console.log('\nKEY FINDINGS:');
  console.log('1. Users without organizations cannot have usage tracked');
  console.log('2. Check for duplicate usage_metrics entries causing multiplication');
  console.log('3. Verify organization_id is set on calls during processing');
  console.log('4. Ensure users are added to organizations during signup');
}

diagnoseUsageTracking().catch(console.error);