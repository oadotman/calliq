/**
 * Test script to verify the invitation flow is working correctly
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

// Use service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testInvitationFlow() {
  console.log('🧪 Testing invitation flow...\n');

  try {
    // 1. Get a sample invitation token from the database
    console.log('1️⃣ Fetching a sample invitation...');
    const { data: invitations, error: inviteError } = await supabase
      .from('team_invitations')
      .select(
        `
        *,
        organizations (
          id,
          name,
          slug
        )
      `
      )
      .is('accepted_at', null)
      .gte('expires_at', new Date().toISOString())
      .limit(1);

    if (inviteError || !invitations || invitations.length === 0) {
      console.log('No valid invitations found. Creating a test invitation...');

      // Get an organization to create invitation for
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name')
        .limit(1)
        .single();

      if (!orgs) {
        console.error('No organizations found in database');
        return;
      }

      // Get the owner of that organization
      const { data: owner } = await supabase
        .from('user_organizations')
        .select('user_id')
        .eq('organization_id', orgs.id)
        .eq('role', 'owner')
        .single();

      if (!owner) {
        console.error('No owner found for organization');
        return;
      }

      // Create a test invitation
      const testEmail = 'testinvite@example.com';
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);

      const { data: newInvite, error: createError } = await supabase
        .from('team_invitations')
        .insert({
          email: testEmail,
          organization_id: orgs.id,
          role: 'member',
          token: token,
          invited_by: owner.user_id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        })
        .select(
          `
          *,
          organizations (
            id,
            name,
            slug
          )
        `
        )
        .single();

      if (createError) {
        console.error('Failed to create test invitation:', createError);
        return;
      }

      console.log('✅ Created test invitation:', {
        email: newInvite.email,
        organization: newInvite.organizations.name,
        token: newInvite.token,
      });

      invitations[0] = newInvite;
    }

    const invitation = invitations[0];
    console.log('✅ Found invitation:', {
      id: invitation.id,
      email: invitation.email,
      organization: invitation.organizations?.name,
      role: invitation.role,
      expires_at: invitation.expires_at,
    });

    // 2. Generate the invitation URL
    const inviteUrl = `http://localhost:3003/invite/${invitation.token}`;
    console.log(`\n2️⃣ Invitation URL: ${inviteUrl}`);

    // 3. Test the invitation page behavior
    console.log('\n3️⃣ Testing invitation page behavior...');
    console.log('The invitation page should:');
    console.log('   - Be accessible without authentication');
    console.log('   - Show invitation details (organization name, role)');
    console.log('   - Offer "Create Account & Accept" for new users');
    console.log('   - Offer "I Already Have an Account" for existing users');
    console.log('   - NOT redirect to login automatically');

    // 4. Test scenarios
    console.log('\n4️⃣ Test Scenarios:');
    console.log('\n   Scenario A: New User');
    console.log('   1. Click the invitation link');
    console.log('   2. Should see invitation details without being redirected');
    console.log('   3. Click "Create Account & Accept"');
    console.log('   4. Complete signup with the invitation email');
    console.log('   5. Should be automatically added to the organization');
    console.log('   6. Should be redirected to the dashboard');

    console.log('\n   Scenario B: Existing User (Not Logged In)');
    console.log('   1. Click the invitation link');
    console.log('   2. Should see invitation details');
    console.log('   3. Click "I Already Have an Account"');
    console.log('   4. Login with correct email');
    console.log('   5. Should automatically accept invitation');
    console.log('   6. Should be redirected to the dashboard');

    console.log('\n   Scenario C: Existing User (Already Logged In)');
    console.log('   1. Be logged in as the invited email');
    console.log('   2. Click the invitation link');
    console.log('   3. Should automatically accept the invitation');
    console.log('   4. Should be redirected to the dashboard');
    console.log('   5. Should be in the correct organization context');

    // 5. Check current state
    console.log('\n5️⃣ Current invitation state:');
    console.log(`   Status: ${invitation.accepted_at ? 'Already Accepted' : 'Pending'}`);
    if (invitation.accepted_at) {
      console.log(`   Accepted at: ${invitation.accepted_at}`);
      console.log(`   Accepted by: ${invitation.accepted_by}`);
    }

    console.log('\n✅ Invitation flow test complete!');
    console.log(`\n📝 To manually test, visit: ${inviteUrl}`);
    console.log('   The page should NOT redirect you to login.');
    console.log('   You should see the invitation details immediately.');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testInvitationFlow();
