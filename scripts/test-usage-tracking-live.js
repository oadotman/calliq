// =====================================================
// LIVE TEST: Check Usage Tracking Issue
// =====================================================

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testUsageTracking() {
  console.log('\n========================================');
  console.log('USAGE TRACKING DIAGNOSTIC TEST');
  console.log('========================================\n');

  // 1. Check the specific user and call from the console logs
  const userId = '3bc923c3-e09e-4e86-8e1a-d7cd05e4e1c8';
  const callId = '1fc4e0ca-9fcc-4160-8118-8a7964b5af1b';

  // Get user's organization
  console.log('1. CHECKING USER ORGANIZATION:');
  const { data: userOrg, error: userOrgError } = await supabase
    .from('user_organizations')
    .select(`
      user_id,
      organization_id,
      role,
      organizations (
        id,
        name,
        plan_type,
        used_minutes,
        max_minutes_monthly
      )
    `)
    .eq('user_id', userId)
    .single();

  if (userOrgError) {
    console.error('Error fetching user org:', userOrgError);
    return;
  }

  console.log('User Organization:', {
    userId: userOrg.user_id,
    orgId: userOrg.organization_id,
    role: userOrg.role,
    orgName: userOrg.organizations?.name,
    planType: userOrg.organizations?.plan_type,
    usedMinutes: userOrg.organizations?.used_minutes,
    maxMinutes: userOrg.organizations?.max_minutes_monthly,
    remainingMinutes: userOrg.organizations?.max_minutes_monthly - userOrg.organizations?.used_minutes
  });

  const organizationId = userOrg.organization_id;

  // 2. Check the specific call
  console.log('\n2. CHECKING SPECIFIC CALL:');
  const { data: call, error: callError } = await supabase
    .from('calls')
    .select('*')
    .eq('id', callId)
    .single();

  if (callError) {
    console.error('Error fetching call:', callError);
  } else {
    console.log('Call Details:', {
      id: call.id,
      customerName: call.customer_name,
      status: call.status,
      duration: call.duration,
      durationMinutes: call.duration_minutes,
      organizationId: call.organization_id,
      userId: call.user_id,
      processedAt: call.processed_at
    });
  }

  // 3. Check if usage_metrics entry exists for this call
  console.log('\n3. CHECKING USAGE_METRICS FOR THIS CALL:');
  const { data: metrics, error: metricsError } = await supabase
    .from('usage_metrics')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('metric_type', 'minutes_transcribed');

  if (metricsError) {
    console.error('Error fetching metrics:', metricsError);
  } else {
    const callMetric = metrics.find(m => m.metadata?.call_id === callId);
    if (callMetric) {
      console.log('Found usage metric for this call:', {
        id: callMetric.id,
        metricValue: callMetric.metric_value,
        callId: callMetric.metadata.call_id,
        createdAt: callMetric.created_at
      });
    } else {
      console.log('❌ NO USAGE METRIC FOUND FOR THIS CALL!');
      console.log('All usage metrics for org:', metrics.map(m => ({
        value: m.metric_value,
        callId: m.metadata?.call_id,
        created: m.created_at
      })));
    }
  }

  // 4. Calculate total usage from metrics (like the dashboard does)
  console.log('\n4. CALCULATING USAGE (DASHBOARD METHOD):');

  // Get current billing period
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

  const { data: periodMetrics } = await supabase
    .from('usage_metrics')
    .select('metric_value')
    .eq('organization_id', organizationId)
    .eq('metric_type', 'minutes_transcribed')
    .gte('created_at', periodStart)
    .lte('created_at', periodEnd);

  const totalMinutesFromMetrics = (periodMetrics || []).reduce((sum, m) => sum + (m.metric_value || 0), 0);

  console.log('Dashboard calculation:', {
    periodStart,
    periodEnd,
    metricsCount: periodMetrics?.length || 0,
    totalMinutesFromMetrics,
    orgTableUsedMinutes: userOrg.organizations?.used_minutes,
    discrepancy: userOrg.organizations?.used_minutes - totalMinutesFromMetrics
  });

  // 5. Check all completed calls for the organization
  console.log('\n5. CHECKING ALL COMPLETED CALLS:');
  const { data: allCalls } = await supabase
    .from('calls')
    .select('id, customer_name, duration_minutes, processed_at')
    .eq('organization_id', organizationId)
    .eq('status', 'completed')
    .order('processed_at', { ascending: false });

  const totalMinutesFromCalls = (allCalls || []).reduce((sum, c) => sum + (c.duration_minutes || 0), 0);

  console.log('All completed calls:', {
    count: allCalls?.length || 0,
    totalMinutesFromCalls,
    recentCalls: (allCalls || []).slice(0, 3).map(c => ({
      id: c.id,
      customer: c.customer_name,
      minutes: c.duration_minutes,
      processed: c.processed_at
    }))
  });

  // 6. Summary
  console.log('\n========================================');
  console.log('SUMMARY:');
  console.log('========================================');
  console.log(`Organization: ${userOrg.organizations?.name}`);
  console.log(`Plan: ${userOrg.organizations?.plan_type} (${userOrg.organizations?.max_minutes_monthly} minutes/month)`);
  console.log(`\nUsage Tracking:`);
  console.log(`- organizations.used_minutes: ${userOrg.organizations?.used_minutes}`);
  console.log(`- Sum of usage_metrics: ${totalMinutesFromMetrics}`);
  console.log(`- Sum of call.duration_minutes: ${totalMinutesFromCalls}`);
  console.log(`\nDiscrepancies:`);
  console.log(`- org table vs metrics: ${userOrg.organizations?.used_minutes - totalMinutesFromMetrics} minutes`);
  console.log(`- org table vs calls: ${userOrg.organizations?.used_minutes - totalMinutesFromCalls} minutes`);
  console.log(`- metrics vs calls: ${totalMinutesFromMetrics - totalMinutesFromCalls} minutes`);

  if (totalMinutesFromMetrics === 0 && totalMinutesFromCalls > 0) {
    console.log('\n❌ CRITICAL ISSUE: usage_metrics table has NO entries but calls have been processed!');
    console.log('This means the dashboard will show 0 usage even though calls were transcribed.');
  }

  console.log('\n========================================\n');
}

testUsageTracking().catch(console.error);