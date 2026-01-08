const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixUsageTracking() {
  console.log('====================================');
  console.log('FIXING USAGE TRACKING ISSUES');
  console.log('====================================\n');

  // 1. Fix users without organizations (like adeiyitomiwa@yahoo.com)
  console.log('1. FIXING USERS WITHOUT ORGANIZATIONS');
  console.log('--------------------------------------');

  // Get all users without organizations
  const { data: allUsers } = await supabase
    .from('users')
    .select('id, email, created_at')
    .order('created_at', { ascending: false });

  let usersFixed = 0;

  for (const user of allUsers || []) {
    // Check if user has organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!userOrg) {
      console.log(`\n❌ User ${user.email} has NO organization`);

      // Create organization for this user
      const orgSlug = `org-${user.id.substring(0, 8)}`;
      const orgName = user.email.split('@')[0] + "'s Organization";

      console.log(`  Creating organization: ${orgName}`);

      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: orgName,
          slug: orgSlug,
          subscription_plan: 'free',
          plan_minutes: 30,
          used_minutes: 0,
          overage_minutes: 0,
          billing_email: user.email,
          subscription_status: 'active'
        })
        .select()
        .single();

      if (orgError) {
        console.error(`  ❌ Failed to create org:`, orgError.message);
        continue;
      }

      // Link user to organization
      const { error: linkError } = await supabase
        .from('user_organizations')
        .insert({
          user_id: user.id,
          organization_id: newOrg.id,
          role: 'owner'
        });

      if (linkError) {
        console.error(`  ❌ Failed to link user:`, linkError.message);
        // Rollback org creation
        await supabase.from('organizations').delete().eq('id', newOrg.id);
      } else {
        console.log(`  ✅ Organization created and linked: ${newOrg.id}`);
        usersFixed++;

        // Update any existing calls for this user with the organization_id
        const { data: userCalls } = await supabase
          .from('calls')
          .select('id')
          .eq('user_id', user.id)
          .is('organization_id', null);

        if (userCalls && userCalls.length > 0) {
          const { error: updateError } = await supabase
            .from('calls')
            .update({ organization_id: newOrg.id })
            .eq('user_id', user.id)
            .is('organization_id', null);

          if (!updateError) {
            console.log(`  ✅ Updated ${userCalls.length} calls with organization_id`);
          }
        }
      }
    }
  }

  console.log(`\n✅ Fixed ${usersFixed} users without organizations\n`);

  // 2. Fix duplicate usage entries and incorrect calculations
  console.log('2. FIXING DUPLICATE USAGE ENTRIES');
  console.log('----------------------------------');

  // Get all usage metrics grouped by call_id
  const { data: allMetrics } = await supabase
    .from('usage_metrics')
    .select('*')
    .eq('metric_type', 'minutes_transcribed')
    .order('created_at', { ascending: false });

  const callIdGroups = {};
  allMetrics?.forEach(m => {
    const callId = m.metadata?.call_id;
    if (callId) {
      if (!callIdGroups[callId]) {
        callIdGroups[callId] = [];
      }
      callIdGroups[callId].push(m);
    }
  });

  let duplicatesFixed = 0;

  for (const [callId, metrics] of Object.entries(callIdGroups)) {
    if (metrics.length > 1) {
      console.log(`\n❌ Call ${callId} has ${metrics.length} duplicate entries`);

      // Keep only the first (oldest) entry
      const [keep, ...remove] = metrics.sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      console.log(`  Keeping: ${keep.metric_value} minutes (${keep.created_at})`);

      for (const metric of remove) {
        console.log(`  Removing: ${metric.metric_value} minutes (${metric.created_at})`);

        const { error } = await supabase
          .from('usage_metrics')
          .delete()
          .eq('id', metric.id);

        if (!error) {
          duplicatesFixed++;
        } else {
          console.error(`  ❌ Failed to remove:`, error.message);
        }
      }
    }
  }

  console.log(`\n✅ Removed ${duplicatesFixed} duplicate usage entries\n`);

  // 3. Recalculate organization used_minutes based on actual usage_metrics
  console.log('3. RECALCULATING ORGANIZATION USED MINUTES');
  console.log('-------------------------------------------');

  const { data: organizations } = await supabase
    .from('organizations')
    .select('*');

  let orgsRecalculated = 0;

  for (const org of organizations || []) {
    // Calculate actual used minutes from usage_metrics
    const { data: orgMetrics } = await supabase
      .from('usage_metrics')
      .select('metric_value')
      .eq('organization_id', org.id)
      .eq('metric_type', 'minutes_transcribed');

    const actualUsedMinutes = orgMetrics?.reduce((sum, m) => sum + (m.metric_value || 0), 0) || 0;

    if (actualUsedMinutes !== org.used_minutes) {
      console.log(`\n❌ Organization ${org.name}:`);
      console.log(`  Current used_minutes: ${org.used_minutes}`);
      console.log(`  Actual from metrics: ${actualUsedMinutes}`);
      console.log(`  Difference: ${org.used_minutes - actualUsedMinutes} minutes`);

      // Update to correct value
      const { error } = await supabase
        .from('organizations')
        .update({ used_minutes: actualUsedMinutes })
        .eq('id', org.id);

      if (!error) {
        console.log(`  ✅ Updated to ${actualUsedMinutes} minutes`);
        orgsRecalculated++;
      } else {
        console.error(`  ❌ Failed to update:`, error.message);
      }
    }
  }

  console.log(`\n✅ Recalculated ${orgsRecalculated} organizations\n`);

  // 4. Track missing usage for completed calls
  console.log('4. TRACKING MISSING USAGE FOR COMPLETED CALLS');
  console.log('----------------------------------------------');

  // Find completed calls without usage tracking
  const { data: completedCalls } = await supabase
    .from('calls')
    .select('*')
    .eq('status', 'completed')
    .not('duration_minutes', 'is', null)
    .not('organization_id', 'is', null);

  let missingUsageFixed = 0;

  for (const call of completedCalls || []) {
    // Check if usage was tracked
    const { data: existingUsage } = await supabase
      .from('usage_metrics')
      .select('id')
      .eq('organization_id', call.organization_id)
      .eq('metric_type', 'minutes_transcribed')
      .or(`metadata->call_id.eq.${call.id},metadata->>call_id.eq.${call.id}`);

    if (!existingUsage || existingUsage.length === 0) {
      console.log(`\n❌ Call ${call.id} (${call.customer_name}) has no usage tracked`);
      console.log(`  Duration: ${call.duration_minutes} minutes`);
      console.log(`  Organization: ${call.organization_id}`);

      // Track the usage
      const { error } = await supabase
        .from('usage_metrics')
        .insert({
          organization_id: call.organization_id,
          user_id: call.user_id,
          metric_type: 'minutes_transcribed',
          metric_value: call.duration_minutes,
          metadata: {
            call_id: call.id,
            duration_seconds: call.duration,
            duration_minutes: call.duration_minutes,
            customer_name: call.customer_name,
            sales_rep: call.sales_rep,
            processed_at: call.processed_at || call.created_at,
            retroactive_fix: true
          }
        });

      if (!error) {
        console.log(`  ✅ Usage tracked: ${call.duration_minutes} minutes`);
        missingUsageFixed++;
      } else {
        console.error(`  ❌ Failed to track:`, error.message);
      }
    }
  }

  console.log(`\n✅ Tracked usage for ${missingUsageFixed} calls\n`);

  // Final summary
  console.log('====================================');
  console.log('FIX COMPLETE - SUMMARY');
  console.log('====================================');
  console.log(`Users fixed (no org): ${usersFixed}`);
  console.log(`Duplicate entries removed: ${duplicatesFixed}`);
  console.log(`Organizations recalculated: ${orgsRecalculated}`);
  console.log(`Missing usage tracked: ${missingUsageFixed}`);
  console.log('====================================');
}

// Run the fix
fixUsageTracking().catch(console.error);