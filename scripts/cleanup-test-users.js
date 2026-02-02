// =====================================================
// CLEANUP TEST USERS SCRIPT
// Deletes all users except the owner from Supabase Auth
// =====================================================

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function cleanupUsers() {
  console.log('🔵 Starting user cleanup...');

  try {
    // Step 1: Get all users
    const {
      data: { users },
      error: listError,
    } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error('❌ Error listing users:', listError);
      return;
    }

    console.log(`📊 Found ${users.length} total users`);

    // Step 2: Filter out the owner
    const usersToDelete = users.filter((user) => user.email !== 'adeliyitomiwa@yahoo.com');

    console.log(`🗑️  Will delete ${usersToDelete.length} users (keeping owner)`);

    // Step 3: Show users to be deleted
    console.log('\n📋 Users to delete:');
    usersToDelete.forEach((user) => {
      console.log(`  - ${user.email} (ID: ${user.id})`);
    });

    // Step 4: Confirm deletion
    console.log('\n⚠️  WARNING: This will permanently delete these users!');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Step 5: Delete users one by one
    let deletedCount = 0;
    let failedCount = 0;

    for (const user of usersToDelete) {
      try {
        console.log(`Deleting ${user.email}...`);

        // First, delete from user_organizations
        const { error: orgError } = await supabaseAdmin
          .from('user_organizations')
          .delete()
          .eq('user_id', user.id);

        if (orgError) {
          console.warn(`  ⚠️  Could not delete org membership: ${orgError.message}`);
        }

        // Delete from auth.users
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

        if (deleteError) {
          console.error(`  ❌ Failed to delete ${user.email}:`, deleteError.message);
          failedCount++;
        } else {
          console.log(`  ✅ Deleted ${user.email}`);
          deletedCount++;
        }
      } catch (error) {
        console.error(`  ❌ Error deleting ${user.email}:`, error.message);
        failedCount++;
      }
    }

    // Step 6: Summary
    console.log('\n📊 Cleanup Summary:');
    console.log(`  ✅ Successfully deleted: ${deletedCount} users`);
    console.log(`  ❌ Failed to delete: ${failedCount} users`);
    console.log(`  👤 Owner kept: adeliyitomiwa@yahoo.com`);

    // Step 7: Verify remaining users
    const {
      data: { users: remainingUsers },
    } = await supabaseAdmin.auth.admin.listUsers();
    console.log(`\n📋 Remaining users: ${remainingUsers.length}`);
    remainingUsers.forEach((user) => {
      console.log(`  - ${user.email}`);
    });
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the cleanup
cleanupUsers()
  .then(() => {
    console.log('\n✅ Cleanup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  });
