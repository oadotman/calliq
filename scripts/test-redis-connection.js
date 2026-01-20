#!/usr/bin/env node

/**
 * Test Redis Connection
 * Verifies that Redis is properly configured and accessible
 */

require('dotenv').config({ path: '.env.local' });
const Bull = require('bull');
const Redis = require('ioredis');

console.log('========================================');
console.log('Testing Redis Connection');
console.log('========================================');

// Test 1: Basic Redis connection
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
console.log('Redis URL:', REDIS_URL);

const redis = new Redis(REDIS_URL);

redis.on('connect', () => {
  console.log('✅ Successfully connected to Redis');
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err.message);
});

// Test 2: Basic operations
async function testRedisOperations() {
  try {
    // Ping
    const pingResult = await redis.ping();
    console.log('✅ Redis PING:', pingResult);

    // Set and Get
    await redis.set('test:key', 'test-value');
    const value = await redis.get('test:key');
    console.log('✅ Redis SET/GET test:', value === 'test-value' ? 'PASSED' : 'FAILED');

    // Clean up
    await redis.del('test:key');

    // Test 3: Bull Queue connection
    console.log('\nTesting Bull Queue connection...');
    const testQueue = new Bull('test-queue', REDIS_URL);

    // Add a test job
    const job = await testQueue.add({ test: 'data' });
    console.log('✅ Created test job with ID:', job.id);

    // Get job counts
    const counts = await testQueue.getJobCounts();
    console.log('📊 Queue job counts:', counts);

    // Clean up
    await testQueue.empty();
    await testQueue.close();
    console.log('✅ Queue test completed successfully');

    // Test 4: Check call-processing queue
    console.log('\nChecking call-processing queue...');
    const callQueue = new Bull('call-processing', REDIS_URL);

    const callCounts = await callQueue.getJobCounts();
    console.log('📊 Call processing queue counts:', callCounts);

    if (callCounts.waiting > 0 || callCounts.failed > 0) {
      console.log('⚠️  There are jobs in the queue:');
      console.log(`   - Waiting: ${callCounts.waiting}`);
      console.log(`   - Active: ${callCounts.active}`);
      console.log(`   - Failed: ${callCounts.failed}`);
      console.log(`   - Completed: ${callCounts.completed}`);
      console.log(`   - Delayed: ${callCounts.delayed}`);
    }

    // Get failed jobs if any
    if (callCounts.failed > 0) {
      const failedJobs = await callQueue.getFailed(0, 5);
      console.log('\n❌ Recent failed jobs:');
      failedJobs.forEach(job => {
        console.log(`   - Job ${job.id}: Call ${job.data?.callId || 'unknown'}`);
        console.log(`     Error: ${job.failedReason}`);
      });
    }

    await callQueue.close();

    console.log('\n========================================');
    console.log('✅ All Redis tests completed successfully!');
    console.log('========================================');

    await redis.quit();
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error);
    await redis.quit();
    process.exit(1);
  }
}

// Run tests after connection
redis.once('ready', () => {
  testRedisOperations();
});

// Timeout after 5 seconds
setTimeout(() => {
  console.error('❌ Connection timeout - Redis might not be running');
  process.exit(1);
}, 5000);