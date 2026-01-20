#!/usr/bin/env node

/**
 * Diagnose Stuck Calls
 * Check the status of calls and the queue system
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const Bull = require('bull');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize Redis queue
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

async function diagnose() {
  console.log('========================================');
  console.log('Call Processing Diagnostic');
  console.log('========================================\n');

  // 1. Check recent calls
  const { data: recentCalls, error: callError } = await supabase
    .from('calls')
    .select('id, status, file_name, customer_name, created_at, processing_message')
    .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(10);

  if (callError) {
    console.error('❌ Error fetching calls:', callError.message);
  } else {
    console.log(`📊 Recent calls (last 24 hours):`);
    console.log(`   Total: ${recentCalls.length}\n`);

    // Group by status
    const statusCounts = {};
    recentCalls.forEach(call => {
      statusCounts[call.status] = (statusCounts[call.status] || 0) + 1;
    });

    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
    console.log('');

    // Show stuck calls
    const stuckCalls = recentCalls.filter(c =>
      ['uploaded', 'pending', 'processing', 'transcribing'].includes(c.status)
    );

    if (stuckCalls.length > 0) {
      console.log('⚠️  Stuck calls:');
      stuckCalls.forEach(call => {
        const age = Math.round((Date.now() - new Date(call.created_at).getTime()) / 1000 / 60);
        console.log(`   - ${call.id.substring(0, 8)}... (${call.customer_name || 'Unknown'})`);
        console.log(`     Status: ${call.status}, Age: ${age} minutes`);
        if (call.processing_message) {
          console.log(`     Message: ${call.processing_message}`);
        }
      });
      console.log('');
    }
  }

  // 2. Check Redis and Queue
  try {
    const callQueue = new Bull('call-processing', REDIS_URL);

    const counts = await callQueue.getJobCounts();
    console.log('📊 Queue status:');
    console.log(`   Waiting: ${counts.waiting}`);
    console.log(`   Active: ${counts.active}`);
    console.log(`   Completed: ${counts.completed}`);
    console.log(`   Failed: ${counts.failed}`);
    console.log(`   Delayed: ${counts.delayed}`);
    console.log(`   Paused: ${counts.paused}`);

    // Check failed jobs
    if (counts.failed > 0) {
      const failedJobs = await callQueue.getFailed(0, 5);
      console.log('\n❌ Recent failed jobs:');
      failedJobs.forEach(job => {
        console.log(`   - Job ${job.id}: Call ${job.data?.callId?.substring(0, 8) || 'unknown'}...`);
        console.log(`     Reason: ${job.failedReason?.substring(0, 100)}...`);
      });
    }

    await callQueue.close();
    console.log('\n✅ Redis queue is accessible');

  } catch (queueError) {
    console.error('\n❌ Queue/Redis error:', queueError.message);
    console.log('   This might be why calls are stuck!');
  }

  // 3. Check environment
  console.log('\n📊 Environment check:');
  console.log(`   REDIS_URL: ${process.env.REDIS_URL ? 'Set' : 'NOT SET ❌'}`);
  console.log(`   ASSEMBLYAI_API_KEY: ${process.env.ASSEMBLYAI_API_KEY ? 'Set' : 'NOT SET ❌'}`);
  console.log(`   OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'Set' : 'NOT SET ❌'}`);
  console.log(`   NEXT_PUBLIC_APP_URL: ${process.env.NEXT_PUBLIC_APP_URL || 'Not set (using default)'}`);

  console.log('\n========================================');
  console.log('Diagnostic complete');
  console.log('========================================');

  process.exit(0);
}

// Run diagnostic
diagnose().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});