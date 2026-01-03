#!/usr/bin/env node

/**
 * Queue Worker Process
 * Processes calls from the Redis queue
 * Run this as a separate process with PM2
 */

require('dotenv').config({ path: '.env.local' });
const Bull = require('bull');
const fetch = require('node-fetch');

// Redis configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Create the queue
const callQueue = new Bull('call-processing', REDIS_URL, {
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

// Process jobs - handle all job types
callQueue.process('*', async (job) => {
  const { callId, userId, fileUrl, fileName } = job.data;

  console.log(`[Worker] Processing call ${callId} for user ${userId}`);
  console.log(`[Worker] File: ${fileName}`);
  console.log(`[Worker] Job type: ${job.name || 'default'}`);

  try {
    // Call the processing API
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://synqall.com';
    const response = await fetch(`${baseUrl}/api/calls/${callId}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-processing': 'true',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Processing failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log(`[Worker] ✅ Successfully processed call ${callId}`);
    return result;

  } catch (error) {
    console.error(`[Worker] ❌ Failed to process call ${callId}:`, error);
    throw error;
  }
});

// Event listeners
callQueue.on('completed', (job, result) => {
  console.log(`[Worker] Job ${job.id} completed for call ${job.data.callId}`);
});

callQueue.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job.id} failed for call ${job.data.callId}:`, err);
});

callQueue.on('stalled', (job) => {
  console.warn(`[Worker] Job ${job.id} stalled for call ${job.data.callId}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Worker] Shutting down gracefully...');
  await callQueue.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Worker] Shutting down gracefully...');
  await callQueue.close();
  process.exit(0);
});

console.log('[Worker] Queue worker started and listening for jobs...');
console.log('[Worker] Redis URL:', REDIS_URL.replace(/\/\/.*@/, '//***@'));