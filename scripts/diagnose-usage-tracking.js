require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables!');
  console.error('Please ensure .env.local contains NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 USAGE TRACKING DIAGNOSTIC TOOL\n');
console.log('='.repeat(60));

async function diagnoseUsageTracking() {
  try {
    // 1. Check recent completed calls
    console.log('\n1. RECENT COMPLETED CALLS:');
    console.log('-'.repeat(40));

    const { data: recentCalls, error: callsError } = await supabase
      .from('calls')
      .select('id, user_id, organization_id, status, duration, duration_minutes, customer_name, processed_at, created_at')
      .eq('status', 'completed')
      .order('processed_at', { ascending: false, nullsFirst: false })
      .limit(10);

    if (callsError) {
      console.error('Error fetching calls:', callsError);
    } else {
      console.log(`Found ${recentCalls.length} completed calls\n`);

      for (const call of recentCalls) {
        console.log(`Call ID: ${call.id}`);
        console.log(`  Customer: ${call.customer_name || 'Unknown'}`);
        console.log(`  Organization ID: ${call.organization_id || 'NULL ❌'}`);
        console.log(`  User ID: ${call.user_id}`);
        console.log(`  Duration: ${call.duration} seconds`);
        console.log(`  Duration Minutes: ${call.duration_minutes} minutes`);
        console.log(`  Processed: ${call.processed_at || 'Not recorded'}`);

        // Check if usage was tracked for this call
        const { data: metrics, error: metricsError } = await supabase
          .from('usage_metrics')
          .select('*')
          .or(`metadata->call_id.eq.${call.id},metadata->>call_id.eq.${call.id}`)
          .single();

        if (metrics) {
          console.log(`  ✅ Usage tracked: ${metrics.metric_value} minutes`);
          console.log(`     Metric type: ${metrics.metric_type}`);
          console.log(`     Organization: ${metrics.organization_id}`);
        } else {
          console.log(`  ❌ NO USAGE TRACKED FOR THIS CALL!`);
        }
        console.log();
      }
    }

    // 2. Check usage_metrics table
    console.log('\n2. RECENT USAGE_METRICS ENTRIES:');
    console.log('-'.repeat(40));

    const { data: recentMetrics, error: metricsError } = await supabase
      .from('usage_metrics')
      .select('*')
      .eq('metric_type', 'minutes_transcribed')
      .order('created_at', { ascending: false })
      .limit(10);

    if (metricsError) {
      console.error('Error fetching metrics:', metricsError);
    } else {
      console.log(`Found ${recentMetrics.length} usage metric entries\n`);

      for (const metric of recentMetrics) {
        console.log(`Metric ID: ${metric.id}`);
        console.log(`  Organization: ${metric.organization_id}`);
        console.log(`  User: ${metric.user_id || 'NULL'}`);
        console.log(`  Type: ${metric.metric_type}`);
        console.log(`  Value: ${metric.metric_value} minutes`);
        console.log(`  Call ID: ${metric.metadata?.call_id || 'Not linked'}`);
        console.log(`  Created: ${metric.created_at}`);
        console.log();
      }
    }

    // 3. Check organizations with usage
    console.log('\n3. ORGANIZATION USAGE SUMMARY:');
    console.log('-'.repeat(40));

    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name, plan_type, max_minutes_monthly, used_minutes')
      .order('created_at', { ascending: false })
      .limit(5);

    if (orgsError) {
      console.error('Error fetching organizations:', orgsError);
    } else {
      for (const org of orgs) {
        console.log(`Organization: ${org.name}`);
        console.log(`  ID: ${org.id}`);
        console.log(`  Plan: ${org.plan_type || 'None'}`);
        console.log(`  Max Minutes: ${org.max_minutes_monthly || 'Unlimited'}`);
        console.log(`  Used Minutes: ${org.used_minutes || 0}`);

        // Calculate actual usage from usage_metrics
        const { data: actualUsage } = await supabase
          .from('usage_metrics')
          .select('metric_value')
          .eq('organization_id', org.id)
          .eq('metric_type', 'minutes_transcribed');

        const totalMinutes = actualUsage?.reduce((sum, m) => sum + Number(m.metric_value), 0) || 0;
        console.log(`  Calculated from metrics: ${totalMinutes} minutes`);

        if (org.used_minutes !== totalMinutes) {
          console.log(`  ⚠️ MISMATCH: Column shows ${org.used_minutes}, metrics show ${totalMinutes}`);
        }
        console.log();
      }
    }

    // 4. Check for orphaned calls (no org ID)
    console.log('\n4. ORPHANED CALLS (NO ORGANIZATION):');
    console.log('-'.repeat(40));

    const { data: orphanedCalls, count } = await supabase
      .from('calls')
      .select('id, user_id, customer_name, status, duration_minutes', { count: 'exact' })
      .is('organization_id', null)
      .eq('status', 'completed')
      .limit(10);

    if (orphanedCalls && orphanedCalls.length > 0) {
      console.log(`❌ Found ${count} completed calls with NO organization_id!\n`);
      for (const call of orphanedCalls) {
        console.log(`  Call ${call.id}: ${call.customer_name || 'Unknown'}`);
        console.log(`    Duration: ${call.duration_minutes} minutes LOST!`);

        // Check if user has an org
        const { data: userOrg } = await supabase
          .from('user_organizations')
          .select('organization_id')
          .eq('user_id', call.user_id)
          .single();

        if (userOrg) {
          console.log(`    🔧 User HAS org: ${userOrg.organization_id} (needs fixing!)`);
        } else {
          console.log(`    ❌ User has NO organization!`);
        }
      }
    } else {
      console.log('✅ No orphaned completed calls found');
    }

    // 5. Check constraint on usage_metrics
    console.log('\n5. DATABASE CONSTRAINT CHECK:');
    console.log('-'.repeat(40));

    // Try to insert a test record
    const testInsert = await supabase
      .from('usage_metrics')
      .insert({
        organization_id: '00000000-0000-0000-0000-000000000000',
        metric_type: 'minutes_transcribed',
        metric_value: 1,
        metadata: { test: true }
      });

    if (testInsert.error) {
      if (testInsert.error.message.includes('constraint')) {
        console.log('❌ Constraint error:', testInsert.error.message);
      } else {
        console.log('✅ Constraint allows minutes_transcribed');
      }
      // Clean up test record if it was created
      await supabase
        .from('usage_metrics')
        .delete()
        .eq('organization_id', '00000000-0000-0000-0000-000000000000');
    } else {
      console.log('✅ Successfully inserted test metric with minutes_transcribed');
      // Clean up
      await supabase
        .from('usage_metrics')
        .delete()
        .eq('organization_id', '00000000-0000-0000-0000-000000000000');
    }

    // 6. Summary
    console.log('\n' + '='.repeat(60));
    console.log('DIAGNOSIS SUMMARY:');
    console.log('='.repeat(60));

    const { count: totalCalls } = await supabase
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');

    const { count: callsWithOrg } = await supabase
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .not('organization_id', 'is', null);

    const { count: totalMetrics } = await supabase
      .from('usage_metrics')
      .select('*', { count: 'exact', head: true })
      .eq('metric_type', 'minutes_transcribed');

    console.log(`Total completed calls: ${totalCalls}`);
    console.log(`Calls with organization_id: ${callsWithOrg}`);
    console.log(`Calls missing organization_id: ${totalCalls - callsWithOrg} ❌`);
    console.log(`Total usage metrics recorded: ${totalMetrics}`);
    console.log(`\nGap: ${totalCalls - totalMetrics} calls not tracked!`);

    if (totalCalls - callsWithOrg > 0) {
      console.log('\n⚠️ CRITICAL ISSUE: Calls are being created without organization_id!');
      console.log('This prevents usage tracking and billing!');
    }

  } catch (error) {
    console.error('Diagnostic error:', error);
  }
}

// Run diagnostics
diagnoseUsageTracking().then(() => {
  console.log('\n✅ Diagnostic complete');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});