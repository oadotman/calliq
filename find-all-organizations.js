/**
 * Find all organizations and their members to identify the issue
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findAllOrganizations() {
  console.log('\n🔍 FINDING ALL ORGANIZATIONS AND MEMBERS');
  console.log('=' .repeat(60));

  try {
    // Find all organizations
    const { data: orgs } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });

    console.log(`\nFound ${orgs?.length || 0} organizations:\n`);

    for (const org of orgs || []) {
      console.log(`\n📊 Organization: ${org.name}`);
      console.log(`   ID: ${org.id}`);
      console.log(`   Plan: ${org.plan_type}`);
      console.log(`   Max Minutes: ${org.max_minutes_monthly}`);
      console.log(`   Used Minutes: ${org.used_minutes || 0}`);
      console.log(`   Max Members: ${org.max_members}`);
      console.log(`   Created: ${new Date(org.created_at).toLocaleDateString()}`);

      // Get members
      const { data: members } = await supabase
        .from('user_organizations')
        .select(`
          user_id,
          role,
          joined_at,
          user:users(email)
        `)
        .eq('organization_id', org.id);

      console.log(`\n   Members (${members?.length || 0}):`);
      members?.forEach(member => {
        console.log(`   - ${member.user?.email || 'Unknown'} (${member.role})`);
      });

      // Get recent calls
      const { data: calls } = await supabase
        .from('calls')
        .select('id, status, duration_minutes, created_at')
        .eq('organization_id', org.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (calls && calls.length > 0) {
        console.log(`\n   Recent Calls (${calls.length}):`);
        calls.forEach(call => {
          console.log(`   - ${call.id.substring(0, 8)}... Status: ${call.status}, Duration: ${call.duration_minutes || 0} min, Date: ${new Date(call.created_at).toLocaleDateString()}`);
        });
      }

      console.log('\n' + '-'.repeat(60));
    }

    // Find the user evelyn.etaifo@protonmail.com
    console.log('\n🔍 Finding user evelyn.etaifo@protonmail.com...\n');

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'evelyn.etaifo@protonmail.com')
      .single();

    if (user) {
      console.log('✅ Found user:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);

      // Get their organizations
      const { data: userOrgs } = await supabase
        .from('user_organizations')
        .select(`
          organization_id,
          role,
          organization:organizations(name, plan_type, max_minutes_monthly, used_minutes)
        `)
        .eq('user_id', user.id);

      console.log(`\n   User's Organizations (${userOrgs?.length || 0}):`);
      userOrgs?.forEach(uo => {
        console.log(`   - ${uo.organization.name} (${uo.role})`);
        console.log(`     Plan: ${uo.organization.plan_type}`);
        console.log(`     Usage: ${uo.organization.used_minutes || 0}/${uo.organization.max_minutes_monthly}`);
      });

      // Get their calls
      const { data: userCalls } = await supabase
        .from('calls')
        .select('id, organization_id, status, duration_minutes, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      console.log(`\n   User's Calls (${userCalls?.length || 0}):`);
      userCalls?.forEach(call => {
        console.log(`   - ${call.id.substring(0, 8)}...`);
        console.log(`     Status: ${call.status}`);
        console.log(`     Duration: ${call.duration_minutes || 0} minutes`);
        console.log(`     Org ID: ${call.organization_id || 'NULL'}`);
        console.log(`     Date: ${new Date(call.created_at).toLocaleString()}`);
      });
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

// Run the search
findAllOrganizations()
  .then(() => {
    console.log('\n✅ Search completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Search failed:', error);
    process.exit(1);
  });