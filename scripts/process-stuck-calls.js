#!/usr/bin/env node

/**
 * Process Stuck Calls
 * Manually triggers processing for calls that are stuck
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const Bull = require('bull');
const fetch = require('node-fetch');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize Redis queue
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const callQueue = new Bull('call-processing', REDIS_URL);

async function processStuckCalls() {
  console.log('========================================');
  console.log('Processing Stuck Calls');
  console.log('========================================\n');

  try {
    // 1. Find stuck calls
    const { data: stuckCalls, error } = await supabase
      .from('calls')
      .select('*')
      .in('status', ['uploaded', 'pending', 'processing', 'transcribing'])
      .gt('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()) // Last 48 hours
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching stuck calls:', error);
      return;
    }

    if (!stuckCalls || stuckCalls.length === 0) {
      console.log('✅ No stuck calls found!');
      return;
    }

    console.log(`Found ${stuckCalls.length} stuck calls:\n`);

    // 2. Display stuck calls
    stuckCalls.forEach(call => {
      console.log(`- Call ID: ${call.id}`);
      console.log(`  Customer: ${call.customer_name || 'Unknown'}`);
      console.log(`  Status: ${call.status}`);
      console.log(`  Created: ${new Date(call.created_at).toLocaleString()}`);
      console.log(`  File: ${call.file_name}`);
      console.log('');
    });

    // 3. Ask for confirmation
    console.log('Do you want to process these calls? (Type "yes" to continue)');

    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question('> ', async (answer) => {
      if (answer.toLowerCase() !== 'yes') {
        console.log('Cancelled.');
        readline.close();
        process.exit(0);
      }

      console.log('\nProcessing calls...\n');

      // 4. Process each stuck call
      for (const call of stuckCalls) {
        console.log(`Processing ${call.id}...`);

        try {
          // Option 1: Try to add to queue
          const job = await callQueue.add({
            callId: call.id,
            userId: call.user_id,
            organizationId: call.organization_id,
            fileUrl: call.file_url,
            fileName: call.file_name,
            duration: call.duration || 0,
            metadata: {
              customerName: call.customer_name,
              templateId: call.template_id,
              callType: call.call_type
            }
          }, {
            priority: 1, // High priority
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000
            }
          });

          console.log(`✅ Added to queue with job ID: ${job.id}`);

        } catch (queueError) {
          console.error(`❌ Failed to add to queue: ${queueError.message}`);

          // Option 2: Try direct API call
          console.log('   Trying direct API call...');

          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const response = await fetch(`${baseUrl}/api/calls/${call.id}/process`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-processing': 'true',
            }
          });

          if (response.ok) {
            console.log('   ✅ Direct API call succeeded');
          } else {
            console.log(`   ❌ Direct API call failed: ${response.status}`);
          }
        }
      }

      console.log('\n========================================');
      console.log('Processing complete!');
      console.log('Check the queue worker logs for progress.');
      console.log('========================================');

      readline.close();
      await callQueue.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

// Run the script
processStuckCalls();