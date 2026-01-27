/**
 * COMPREHENSIVE USAGE DIAGNOSTIC SCRIPT
 * Analyzes why users with credits are getting "no minutes remaining" errors
 *
 * Run with: node scripts/diagnose-usage-issue-comprehensive.js <userEmail>
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function diagnoseUsage(userEmail) {
  console.log('=====================================');
  console.log('COMPREHENSIVE USAGE DIAGNOSTIC REPORT');
  console.log('=====================================');
  console.log(`User Email: ${userEmail}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('');

  try {
    // 1. Find user
    console.log('1. FINDING USER...');
    const { data: users } = await supabase.from('users').select('*').eq('email', userEmail);

    if (!users || users.length === 0) {
      console.error('❌ User not found');
      return;
    }

    const user = users[0];
    console.log(`✓ User found: ${user.id}`);
    console.log(`  Name: ${user.display_name || 'N/A'}`);
    console.log('');

    // 2. Find user's organization
    console.log('2. FINDING ORGANIZATION...');
    const { data: membership } = await supabase
      .from('user_organizations')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      console.error('❌ No organization membership found');
      return;
    }

    console.log(`✓ Organization found: ${membership.organization_id}`);
    console.log(`  Role: ${membership.role}`);
    console.log('');

    // 3. Get organization details
    console.log('3. ORGANIZATION DETAILS...');
    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', membership.organization_id)
      .single();

    if (!org) {
      console.error('❌ Organization not found');
      return;
    }

    console.log(`✓ Organization: ${org.name}`);
    console.log(`  Plan: ${org.plan_type}`);
    console.log(`  Max Minutes Monthly: ${org.max_minutes_monthly}`);
    console.log(`  Used Minutes (column): ${org.used_minutes || 0}`);
    console.log(`  Overage Minutes Purchased: ${org.overage_minutes_purchased || 0}`);
    console.log(`  Current Period Start: ${org.current_period_start || 'NOT SET'}`);
    console.log(`  Current Period End: ${org.current_period_end || 'NOT SET'}`);
    console.log('');

    // 4. Check billing period validity
    console.log('4. BILLING PERIOD ANALYSIS...');
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    if (org.current_period_start && org.current_period_end) {
      const periodStart = new Date(org.current_period_start);
      const periodEnd = new Date(org.current_period_end);

      console.log(`  Period Start: ${periodStart.toISOString()}`);
      console.log(`  Period End: ${periodEnd.toISOString()}`);
      console.log(`  Current Time: ${now.toISOString()}`);

      const isPeriodCurrent = periodStart <= now && periodEnd >= now;
      const periodMonth = periodStart.getMonth();
      const periodYear = periodStart.getFullYear();

      if (!isPeriodCurrent) {
        console.log('  ⚠️ BILLING PERIOD IS OUTDATED');
        console.log(`     Should be: ${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`);
        console.log(`     Actually is: ${periodYear}-${String(periodMonth + 1).padStart(2, '0')}`);
      } else {
        console.log('  ✓ Billing period is current');
      }

      // Check if period needs reset
      if (periodMonth !== currentMonth || periodYear !== currentYear) {
        console.log('  ⚠️ BILLING PERIOD NEEDS RESET (wrong month/year)');
        console.log('     This could cause usage to not reset properly!');
      }
    } else {
      console.log('  ❌ NO BILLING PERIOD SET');
    }
    console.log('');

    // 5. Calculate actual usage from usage_metrics
    console.log('5. USAGE METRICS ANALYSIS...');

    // Use the organization's billing period or default to current month
    const periodStart =
      org.current_period_start || new Date(currentYear, currentMonth, 1).toISOString();
    const periodEnd =
      org.current_period_end ||
      new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();

    const { data: metrics } = await supabase
      .from('usage_metrics')
      .select('*')
      .eq('organization_id', membership.organization_id)
      .eq('metric_type', 'minutes_transcribed')
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd)
      .order('created_at', { ascending: false });

    const totalMinutesFromMetrics =
      metrics?.reduce((sum, m) => sum + (m.metric_value || 0), 0) || 0;

    console.log(`  Period: ${periodStart.substring(0, 10)} to ${periodEnd.substring(0, 10)}`);
    console.log(`  Total usage_metrics records: ${metrics?.length || 0}`);
    console.log(`  Total minutes from metrics: ${totalMinutesFromMetrics}`);
    console.log(`  Used minutes in org column: ${org.used_minutes || 0}`);

    if (Math.abs(totalMinutesFromMetrics - (org.used_minutes || 0)) > 1) {
      console.log('  ⚠️ MISMATCH between usage_metrics and used_minutes column!');
      console.log(
        `     Difference: ${Math.abs(totalMinutesFromMetrics - (org.used_minutes || 0))} minutes`
      );
    }
    console.log('');

    // 6. Show recent usage records
    console.log('6. RECENT USAGE RECORDS...');
    if (metrics && metrics.length > 0) {
      console.log(`  Last 5 usage records:`);
      metrics.slice(0, 5).forEach((m) => {
        console.log(
          `    - ${m.created_at}: ${m.metric_value} minutes (Call ID: ${m.metadata?.call_id || 'N/A'})`
        );
      });
    } else {
      console.log('  No usage records found for current period');
    }
    console.log('');

    // 7. Check ALL usage metrics (including other periods)
    console.log('7. ALL-TIME USAGE ANALYSIS...');
    const { data: allMetrics } = await supabase
      .from('usage_metrics')
      .select('*')
      .eq('organization_id', membership.organization_id)
      .eq('metric_type', 'minutes_transcribed')
      .order('created_at', { ascending: false })
      .limit(10);

    console.log(`  Total all-time usage records: ${allMetrics?.length || 0}`);
    if (allMetrics && allMetrics.length > 0) {
      console.log('  Last usage record: ' + allMetrics[0].created_at);
      console.log('  First usage record shown: ' + allMetrics[allMetrics.length - 1].created_at);
    }
    console.log('');

    // 8. Calculate what the API would return
    console.log('8. API CALCULATION SIMULATION...');

    const baseMinutes = org.max_minutes_monthly;
    const purchasedOverageMinutes = org.overage_minutes_purchased || 0;
    const totalAvailableMinutes = baseMinutes + purchasedOverageMinutes;
    const remainingMinutes = Math.max(0, totalAvailableMinutes - totalMinutesFromMetrics);
    const percentUsed = (totalMinutesFromMetrics / totalAvailableMinutes) * 100;

    console.log(`  Base minutes: ${baseMinutes}`);
    console.log(`  Purchased overage: ${purchasedOverageMinutes}`);
    console.log(`  Total available: ${totalAvailableMinutes}`);
    console.log(`  Minutes used: ${totalMinutesFromMetrics}`);
    console.log(`  Remaining minutes: ${remainingMinutes}`);
    console.log(`  Percent used: ${percentUsed.toFixed(1)}%`);

    if (remainingMinutes <= 0) {
      console.log('  ❌ USER HAS NO REMAINING MINUTES');
      console.log('     This explains the error message!');
    } else {
      console.log(`  ✓ User has ${remainingMinutes} minutes remaining`);
    }
    console.log('');

    // 9. Check for overage purchases
    console.log('9. OVERAGE PURCHASE HISTORY...');
    const { data: overagePurchases } = await supabase
      .from('usage_metrics')
      .select('*')
      .eq('organization_id', membership.organization_id)
      .eq('metric_type', 'overage_pack_purchased')
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd)
      .order('created_at', { ascending: false });

    if (overagePurchases && overagePurchases.length > 0) {
      console.log(`  Found ${overagePurchases.length} overage purchases this period:`);
      overagePurchases.forEach((p) => {
        console.log(`    - ${p.created_at}: ${p.metric_value} minutes added`);
      });
    } else {
      console.log('  No overage purchases found for current period');
    }
    console.log('');

    // 10. Check recent calls
    console.log('10. RECENT CALLS ANALYSIS...');
    const { data: recentCalls } = await supabase
      .from('calls')
      .select('*')
      .eq('organization_id', membership.organization_id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentCalls && recentCalls.length > 0) {
      console.log(`  Last 5 calls:`);
      recentCalls.forEach((call) => {
        console.log(`    - ${call.created_at}: ${call.customer_name || 'Unknown'}`);
        console.log(`      Status: ${call.status}, Duration: ${call.duration || 'N/A'}s`);
      });
    } else {
      console.log('  No recent calls found');
    }
    console.log('');

    // 11. DIAGNOSIS SUMMARY
    console.log('=====================================');
    console.log('DIAGNOSIS SUMMARY');
    console.log('=====================================');

    const issues = [];

    if (!org.current_period_start || !org.current_period_end) {
      issues.push('❌ No billing period set - usage tracking will fail');
    }

    if (org.current_period_start) {
      const periodStart = new Date(org.current_period_start);
      if (periodStart.getMonth() !== currentMonth || periodStart.getFullYear() !== currentYear) {
        issues.push('❌ Billing period is for wrong month - usage not reset');
      }
    }

    if (Math.abs(totalMinutesFromMetrics - (org.used_minutes || 0)) > 1) {
      issues.push('⚠️ Mismatch between usage_metrics and used_minutes column');
    }

    if (remainingMinutes <= 0 && purchasedOverageMinutes === 0) {
      issues.push('❌ User has exhausted all minutes and has no overage');
    }

    if (totalMinutesFromMetrics > totalAvailableMinutes) {
      issues.push('❌ Usage exceeds available minutes (including overage)');
    }

    if (issues.length > 0) {
      console.log('ISSUES FOUND:');
      issues.forEach((issue) => console.log(`  ${issue}`));
    } else {
      console.log('✓ No major issues detected');
    }

    console.log('');
    console.log('RECOMMENDED ACTIONS:');

    if (
      issues.includes('❌ No billing period set - usage tracking will fail') ||
      issues.includes('❌ Billing period is for wrong month - usage not reset')
    ) {
      console.log('  1. Run billing period update to reset the period');
      console.log('  2. Recalculate usage for current period');
    }

    if (issues.includes('⚠️ Mismatch between usage_metrics and used_minutes column')) {
      console.log('  3. Sync used_minutes column with usage_metrics data');
    }

    if (remainingMinutes <= 0) {
      console.log('  4. User needs to purchase overage minutes or upgrade plan');
    }
  } catch (error) {
    console.error('Error during diagnosis:', error);
  }
}

// Get user email from command line
const userEmail = process.argv[2];

if (!userEmail) {
  console.log('Usage: node scripts/diagnose-usage-issue-comprehensive.js <userEmail>');
  process.exit(1);
}

diagnoseUsage(userEmail);
