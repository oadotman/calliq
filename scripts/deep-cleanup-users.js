// =====================================================
// DEEP CLEANUP - Removes all test users and their data
// =====================================================

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function deepCleanup() {
  console.log('🔵 Starting deep cleanup of test users...\n');

  try {
    // Step 1: Get all users except owner
    const {
      data: { users },
      error: listError,
    } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error('❌ Error listing users:', listError);
      return;
    }

    const usersToDelete = users.filter((user) => user.email !== 'adeliyitomiwa@yahoo.com');

    if (usersToDelete.length === 0) {
      console.log('✅ No users to delete. Only owner exists.');
      return;
    }

    console.log(`📊 Found ${usersToDelete.length} users to delete\n`);
    console.log('Users to delete:');
    usersToDelete.forEach((user) => {
      console.log(`  - ${user.email}`);
    });

    console.log('\n⚠️  WARNING: This will delete all data for these users!');
    console.log('Starting in 3 seconds... (Ctrl+C to cancel)\n');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Step 2: Delete related data for each user
    for (const user of usersToDelete) {
      console.log(`\n📦 Processing ${user.email}...`);

      try {
        // Delete calls
        const { data: calls, error: callsError } = await supabaseAdmin
          .from('calls')
          .delete()
          .eq('user_id', user.id)
          .select();

        if (calls && calls.length > 0) {
          console.log(`  ✅ Deleted ${calls.length} calls`);
        }

        // Delete team invitations they sent
        const { data: sentInvites } = await supabaseAdmin
          .from('team_invitations')
          .delete()
          .eq('invited_by', user.id)
          .select();

        if (sentInvites && sentInvites.length > 0) {
          console.log(`  ✅ Deleted ${sentInvites.length} sent invitations`);
        }

        // Delete team invitations they received
        const { data: receivedInvites } = await supabaseAdmin
          .from('team_invitations')
          .delete()
          .eq('email', user.email)
          .select();

        if (receivedInvites && receivedInvites.length > 0) {
          console.log(`  ✅ Deleted ${receivedInvites.length} received invitations`);
        }

        // Delete referrals
        const { data: referrals } = await supabaseAdmin
          .from('referrals')
          .delete()
          .or(`referrer_id.eq.${user.id},referred_user_id.eq.${user.id}`)
          .select();

        if (referrals && referrals.length > 0) {
          console.log(`  ✅ Deleted ${referrals.length} referrals`);
        }

        // Delete notifications
        const { data: notifications } = await supabaseAdmin
          .from('notifications')
          .delete()
          .eq('user_id', user.id)
          .select();

        if (notifications && notifications.length > 0) {
          console.log(`  ✅ Deleted ${notifications.length} notifications`);
        }

        // Delete API keys
        const { data: apiKeys } = await supabaseAdmin
          .from('api_keys')
          .delete()
          .eq('user_id', user.id)
          .select();

        if (apiKeys && apiKeys.length > 0) {
          console.log(`  ✅ Deleted ${apiKeys.length} API keys`);
        }

        // Delete user_organizations membership
        const { data: memberships } = await supabaseAdmin
          .from('user_organizations')
          .delete()
          .eq('user_id', user.id)
          .select();

        if (memberships && memberships.length > 0) {
          console.log(`  ✅ Removed from ${memberships.length} organizations`);
        }

        // Finally, delete the user from auth
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

        if (deleteError) {
          console.error(`  ❌ Failed to delete user: ${deleteError.message}`);
        } else {
          console.log(`  ✅ User deleted successfully`);
        }
      } catch (error) {
        console.error(`  ❌ Error processing ${user.email}:`, error.message);
      }
    }

    // Step 3: Clean up orphaned organizations
    console.log('\n🏢 Checking for orphaned organizations...');

    // Get all organizations
    const { data: allOrgs } = await supabaseAdmin.from('organizations').select('id, name');

    if (allOrgs) {
      for (const org of allOrgs) {
        // Check if org has any members
        const { data: members } = await supabaseAdmin
          .from('user_organizations')
          .select('user_id')
          .eq('organization_id', org.id);

        if (!members || members.length === 0) {
          // Delete orphaned organization
          const { error } = await supabaseAdmin.from('organizations').delete().eq('id', org.id);

          if (!error) {
            console.log(`  ✅ Deleted orphaned organization: ${org.name}`);
          }
        }
      }
    }

    // Step 4: Final verification
    console.log('\n📊 Final verification...');

    const {
      data: { users: remainingUsers },
    } = await supabaseAdmin.auth.admin.listUsers();
    console.log(`\n✅ Cleanup complete! Remaining users: ${remainingUsers.length}`);

    if (remainingUsers.length === 1 && remainingUsers[0].email === 'adeliyitomiwa@yahoo.com') {
      console.log('✅ Perfect! Only the owner remains.');
    } else {
      console.log('⚠️  Some users could not be deleted:');
      remainingUsers.forEach((user) => {
        if (user.email !== 'adeliyitomiwa@yahoo.com') {
          console.log(`  - ${user.email}`);
        }
      });
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the cleanup
deepCleanup()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
