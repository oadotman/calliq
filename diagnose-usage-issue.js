/**
 * DIAGNOSE: Why invited member's usage is not showing
 *
 * This script diagnoses the exact issue with usage tracking
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function diagnoseUsageIssue() {
  console.log('\n🔍 DIAGNOSING USAGE TRACKING ISSUE');
  console.log('=' .repeat(60));

  try {
    // Step 1: Find the Karamo organization
    console.log('\n1️⃣ Finding Karamo organization...\n');

    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('name', 'Karamo')
      .single();

    if (!org) {
      console.error('❌ Karamo organization not found');
      return;
    }

    console.log('✅ Found Karamo organization:');
    console.log(`   ID: ${org.id}`);
    console.log(`   Plan: ${org.plan_type}`);
    console.log(`   Max Minutes: ${org.max_minutes_monthly}`);
    console.log(`   Used Minutes (stored): ${org.used_minutes || 0}`);

    // Step 2: Find all members of Karamo
    console.log('\n2️⃣ Finding all members of Karamo...\n');

    const { data: members } = await supabase
      .from('user_organizations')
      .select(`
        user_id,
        role,
        joined_at,
        user:users(email)
      `)
      .eq('organization_id', org.id);

    console.log(`Found ${members?.length || 0} members:`);
    members?.forEach(member => {
      console.log(`   - ${member.user?.email} (${member.role}) - Joined: ${new Date(member.joined_at).toLocaleDateString()}`);
    });

    // Step 3: Find ALL calls for this organization
    console.log('\n3️⃣ Finding ALL calls for Karamo organization...\n');

    const { data: allCalls } = await supabase
      .from('calls')
      .select(`
        id,
        user_id,
        status,
        duration_minutes,
        created_at,
        file_name,
        user:users(email)
      `)
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false });

    console.log(`Found ${allCalls?.length || 0} total calls for organization`);

    // Group by status
    const callsByStatus = {};
    allCalls?.forEach(call => {
      if (!callsByStatus[call.status]) {
        callsByStatus[call.status] = [];
      }
      callsByStatus[call.status].push(call);
    });

    console.log('\nCalls by status:');
    Object.entries(callsByStatus).forEach(([status, calls]) => {
      const totalMinutes = calls.reduce((sum, c) => sum + (c.duration_minutes || 0), 0);
      console.log(`   ${status}: ${calls.length} calls (${totalMinutes} minutes total)`);
    });

    // Step 4: Check ONLY completed calls
    console.log('\n4️⃣ Analyzing COMPLETED calls only...\n');

    const completedCalls = callsByStatus['completed'] || [];

    if (completedCalls.length === 0) {
      console.log('⚠️ NO COMPLETED CALLS FOUND!');
      console.log('   This is the issue - calls must have status "completed" to count');
    } else {
      console.log(`Found ${completedCalls.length} completed calls:`);

      completedCalls.forEach(call => {
        console.log(`\n   Call ${call.id.substring(0, 8)}...`);
        console.log(`   - File: ${call.file_name}`);
        console.log(`   - User: ${call.user?.email || 'Unknown'}`);
        console.log(`   - Date: ${new Date(call.created_at).toLocaleString()}`);
        console.log(`   - Duration: ${call.duration_minutes || 'NULL'} minutes`);

        if (!call.duration_minutes) {
          console.log(`   ❌ MISSING duration_minutes!`);
        }
      });

      const totalCompletedMinutes = completedCalls.reduce(
        (sum, c) => sum + (c.duration_minutes || 0),
        0
      );
      console.log(`\n   Total minutes from completed calls: ${totalCompletedMinutes}`);
    }

    // Step 5: Check this month's usage
    console.log('\n5️⃣ Checking this month\'s usage calculation...\n');

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data: monthCalls } = await supabase
      .from('calls')
      .select('duration_minutes, status')
      .eq('organization_id', org.id)
      .eq('status', 'completed')
      .gte('created_at', startOfMonth.toISOString());

    const monthlyTotal = monthCalls?.reduce((sum, c) => sum + (c.duration_minutes || 0), 0) || 0;

    console.log(`This month's completed calls: ${monthCalls?.length || 0}`);
    console.log(`This month's total minutes: ${monthlyTotal}`);
    console.log(`Dashboard should show: ${monthlyTotal}/${org.max_minutes_monthly} minutes used`);

    // Step 6: Find the issue
    console.log('\n6️⃣ DIAGNOSIS SUMMARY:\n');
    console.log('=' .repeat(60));

    if (allCalls?.length === 0) {
      console.log('❌ No calls found for organization at all');
    } else if (completedCalls.length === 0) {
      console.log('❌ ISSUE FOUND: Calls exist but NONE have status "completed"');
      console.log('   The dashboard only counts calls with status="completed"');
      console.log('\n   Current call statuses:');
      Object.entries(callsByStatus).forEach(([status, calls]) => {
        console.log(`   - ${status}: ${calls.length} calls`);
      });
      console.log('\n   💡 SOLUTION: Calls need to finish processing to be marked "completed"');
    } else if (monthlyTotal === 0 && monthCalls?.length > 0) {
      console.log('❌ ISSUE FOUND: Completed calls exist but duration_minutes is NULL');
      console.log('   The upload process should save duration_minutes when file is uploaded');
    } else if (monthlyTotal > 0) {
      console.log('✅ Usage tracking is working correctly!');
      console.log(`   Dashboard shows: ${monthlyTotal} minutes used`);
    }

    // Step 7: Check for calls with wrong status
    console.log('\n7️⃣ Checking for stuck calls...\n');

    const processingStatuses = ['uploading', 'transcribing', 'extracting', 'processing', 'ready'];
    const stuckCalls = allCalls?.filter(call => {
      const age = (Date.now() - new Date(call.created_at).getTime()) / 1000 / 60; // age in minutes
      return processingStatuses.includes(call.status) && age > 30; // stuck if processing for > 30 min
    });

    if (stuckCalls && stuckCalls.length > 0) {
      console.log(`⚠️ Found ${stuckCalls.length} potentially stuck calls:`);
      stuckCalls.forEach(call => {
        const age = Math.round((Date.now() - new Date(call.created_at).getTime()) / 1000 / 60);
        console.log(`   - ${call.id.substring(0, 8)}... Status: ${call.status}, Age: ${age} minutes`);
      });
      console.log('\n   These calls may need to be marked as completed manually');
    }

  } catch (error) {
    console.error('\n❌ Diagnosis error:', error);
  }
}

// Run the diagnosis
diagnoseUsageIssue()
  .then(() => {
    console.log('\n✅ Diagnosis completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Diagnosis failed:', error);
    process.exit(1);
  });