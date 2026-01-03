#!/usr/bin/env node

/**
 * Ensure Queue Worker is Running
 * This script checks if the queue worker is running and starts it if not
 * Run this after deployment or as a health check
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function checkWorkerStatus() {
  try {
    const { stdout } = await execPromise('pm2 list --json');
    const processes = JSON.parse(stdout);

    const worker = processes.find(p =>
      p.name === 'synqall-worker' ||
      p.name === 'queue-worker' ||
      p.name === 'calliq-worker'
    );

    if (!worker) {
      console.log('❌ Queue worker not found in PM2 processes');
      return false;
    }

    if (worker.pm2_env.status !== 'online') {
      console.log(`⚠️ Queue worker is ${worker.pm2_env.status}`);
      return false;
    }

    console.log('✅ Queue worker is running');
    console.log(`  - PID: ${worker.pid}`);
    console.log(`  - Uptime: ${Math.floor(worker.pm2_env.pm_uptime / 1000 / 60)} minutes`);
    console.log(`  - Restarts: ${worker.pm2_env.restart_time}`);
    console.log(`  - Memory: ${Math.floor(worker.monit.memory / 1024 / 1024)} MB`);

    return true;
  } catch (error) {
    console.error('Failed to check PM2 status:', error.message);
    return false;
  }
}

async function startWorker() {
  try {
    console.log('🚀 Starting queue worker...');

    // Try to start the worker with PM2
    const { stdout, stderr } = await execPromise(
      'pm2 start scripts/queue-worker.js --name synqall-worker --max-memory-restart 500M'
    );

    console.log('Worker start output:', stdout);
    if (stderr) console.error('Worker start stderr:', stderr);

    // Save PM2 configuration
    await execPromise('pm2 save');

    console.log('✅ Queue worker started successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to start queue worker:', error.message);

    // Try alternative approach
    console.log('Trying alternative start method...');
    try {
      await execPromise('node scripts/queue-worker.js &');
      console.log('✅ Worker started in background (without PM2)');
      return true;
    } catch (altError) {
      console.error('❌ Alternative start also failed:', altError.message);
      return false;
    }
  }
}

async function checkRedis() {
  try {
    console.log('\n🔍 Checking Redis connection...');

    const { stdout } = await execPromise('redis-cli ping');
    if (stdout.trim() === 'PONG') {
      console.log('✅ Redis is running and responsive');
      return true;
    } else {
      console.log('⚠️ Redis responded but not with PONG:', stdout);
      return false;
    }
  } catch (error) {
    console.error('❌ Redis is not running or not accessible:', error.message);
    console.log('   Please ensure Redis is installed and running');
    console.log('   Start Redis with: redis-server');
    return false;
  }
}

async function checkQueueHealth() {
  try {
    console.log('\n🔍 Checking queue health...');

    // Use the Redis URL from environment
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    console.log('Redis URL:', redisUrl.replace(/\/\/.*@/, '//***@'));

    // Try to connect to Redis and check queue
    const Bull = require('bull');
    const callQueue = new Bull('call-processing', redisUrl);

    const jobCounts = await callQueue.getJobCounts();
    console.log('📊 Queue statistics:');
    console.log(`  - Waiting: ${jobCounts.waiting}`);
    console.log(`  - Active: ${jobCounts.active}`);
    console.log(`  - Completed: ${jobCounts.completed}`);
    console.log(`  - Failed: ${jobCounts.failed}`);
    console.log(`  - Delayed: ${jobCounts.delayed}`);
    console.log(`  - Paused: ${jobCounts.paused}`);

    if (jobCounts.failed > 0) {
      console.log('⚠️ There are failed jobs in the queue');

      // Get failed jobs for debugging
      const failedJobs = await callQueue.getFailed(0, 5);
      failedJobs.forEach(job => {
        console.log(`   Failed job ${job.id}: ${job.failedReason}`);
      });
    }

    await callQueue.close();
    return true;
  } catch (error) {
    console.error('❌ Failed to check queue health:', error.message);
    return false;
  }
}

async function main() {
  console.log('========================================');
  console.log('Queue Worker Health Check');
  console.log('========================================');

  // Load environment variables
  try {
    require('dotenv').config({ path: '.env.local' });
  } catch (e) {
    console.log('⚠️ Could not load .env.local, using environment variables');
  }

  // Check Redis first
  const redisOk = await checkRedis();
  if (!redisOk) {
    console.log('\n❌ Redis must be running for queue processing to work');
    process.exit(1);
  }

  // Check if worker is running
  const isRunning = await checkWorkerStatus();

  if (!isRunning) {
    // Try to start it
    const started = await startWorker();

    if (!started) {
      console.log('\n❌ Could not start queue worker');
      console.log('Please start it manually:');
      console.log('  pm2 start scripts/queue-worker.js --name synqall-worker');
      process.exit(1);
    }

    // Wait a bit for it to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check again
    await checkWorkerStatus();
  }

  // Check queue health
  await checkQueueHealth();

  console.log('\n========================================');
  console.log('Health check complete');
  console.log('========================================');
}

// Run the main function
main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});