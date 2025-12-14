/**
 * CRITICAL FIX: Organization Tracking for Historical Data
 *
 * This script fixes calls that may have been assigned to the wrong organization
 * when users belong to multiple organizations (especially invited team members)
 *
 * Run this script AFTER deploying the organization tracking fix
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Need service role for admin operations
);

async function fixOrganizationTracking() {
  console.log('🔧 Starting organization tracking fix...\n');

  try {
    // Step 1: Find all users who belong to multiple organizations
    console.log('📊 Finding users with multiple organizations...');
    const { data: multiOrgUsers, error: multiOrgError } = await supabase
      .from('user_organizations')
      .select('user_id')
      .order('user_id');

    if (multiOrgError) throw multiOrgError;

    // Count organizations per user
    const userOrgCounts = {};
    multiOrgUsers.forEach(row => {
      userOrgCounts[row.user_id] = (userOrgCounts[row.user_id] || 0) + 1;
    });

    const usersWithMultipleOrgs = Object.keys(userOrgCounts)
      .filter(userId => userOrgCounts[userId] > 1);

    console.log(`Found ${usersWithMultipleOrgs.length} users with multiple organizations\n`);

    // Step 2: For each user with multiple orgs, check their calls
    let totalCallsFixed = 0;
    let totalCallsChecked = 0;

    for (const userId of usersWithMultipleOrgs) {
      console.log(`\n👤 Processing user: ${userId}`);

      // Get all organizations for this user
      const { data: userOrgs, error: userOrgsError } = await supabase
        .from('user_organizations')
        .select('organization_id, role, joined_at, organization:organizations(*)')
        .eq('user_id', userId)
        .order('joined_at', { ascending: true });

      if (userOrgsError) {
        console.error(`Error fetching orgs for user ${userId}:`, userOrgsError);
        continue;
      }

      console.log(`  - Member of ${userOrgs.length} organizations`);

      // Identify personal vs team organizations
      const personalOrg = userOrgs.find(uo => uo.role === 'owner' && uo.organization.organizations.max_members === 1);
      const teamOrgs = userOrgs.filter(uo => uo.role !== 'owner' || uo.organization.organizations.max_members > 1);

      if (!personalOrg && teamOrgs.length === 0) {
        console.log('  - No clear organization structure, skipping...');
        continue;
      }

      // Get all calls for this user
      const { data: userCalls, error: callsError } = await supabase
        .from('calls')
        .select('id, organization_id, created_at, duration_minutes')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (callsError) {
        console.error(`Error fetching calls for user ${userId}:`, callsError);
        continue;
      }

      console.log(`  - Has ${userCalls.length} total calls`);
      totalCallsChecked += userCalls.length;

      // Check each call
      for (const call of userCalls) {
        // For invited team members, calls after joining should belong to team org
        let correctOrgId = null;

        // Find which organization the call should belong to based on timing
        for (const teamOrg of teamOrgs) {
          const joinDate = new Date(teamOrg.joined_at);
          const callDate = new Date(call.created_at);

          if (callDate >= joinDate) {
            // Call was made after joining this team
            correctOrgId = teamOrg.organization_id;
            break;
          }
        }

        // If no team org matched, use personal org
        if (!correctOrgId && personalOrg) {
          correctOrgId = personalOrg.organization_id;
        }

        // Check if call needs fixing
        if (correctOrgId && call.organization_id !== correctOrgId) {
          console.log(`  ⚠️ Call ${call.id} has wrong org (${call.organization_id} → ${correctOrgId})`);

          // Fix the call's organization
          const { error: updateError } = await supabase
            .from('calls')
            .update({ organization_id: correctOrgId })
            .eq('id', call.id);

          if (updateError) {
            console.error(`    ❌ Failed to update call ${call.id}:`, updateError);
          } else {
            console.log(`    ✅ Fixed call ${call.id}`);
            totalCallsFixed++;
          }
        }
      }
    }

    // Step 3: Fix usage metrics
    console.log('\n📊 Recalculating usage metrics...');

    // Get all organizations
    const { data: allOrgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name');

    if (orgsError) throw orgsError;

    for (const org of allOrgs) {
      // Calculate total minutes used
      const { data: orgCalls, error: orgCallsError } = await supabase
        .from('calls')
        .select('duration_minutes')
        .eq('organization_id', org.id)
        .eq('status', 'completed')
        .not('duration_minutes', 'is', null);

      if (orgCallsError) {
        console.error(`Error fetching calls for org ${org.id}:`, orgCallsError);
        continue;
      }

      const totalMinutes = orgCalls.reduce((sum, call) => sum + (call.duration_minutes || 0), 0);

      // Update organization's used_minutes
      const { error: updateOrgError } = await supabase
        .from('organizations')
        .update({ used_minutes: totalMinutes })
        .eq('id', org.id);

      if (updateOrgError) {
        console.error(`Error updating org ${org.id} usage:`, updateOrgError);
      } else {
        console.log(`✅ Updated ${org.name}: ${totalMinutes} minutes used`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ ORGANIZATION TRACKING FIX COMPLETE');
    console.log('='.repeat(60));
    console.log(`📊 Statistics:`);
    console.log(`  - Users with multiple orgs: ${usersWithMultipleOrgs.length}`);
    console.log(`  - Total calls checked: ${totalCallsChecked}`);
    console.log(`  - Calls fixed: ${totalCallsFixed}`);
    console.log(`  - Organizations updated: ${allOrgs.length}`);

  } catch (error) {
    console.error('\n❌ Error during fix:', error);
    process.exit(1);
  }
}

// Run the fix
fixOrganizationTracking()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });