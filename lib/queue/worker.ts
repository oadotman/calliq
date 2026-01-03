/**
 * Queue Worker
 * Processes queue jobs using Bull v3
 * Can be run as a separate process for better scalability
 */

import Bull, { Queue } from 'bull';
import { REDIS_CONFIG, QUEUE_CONFIG } from './config';
import { processCall, CallProcessingJob } from './call-processor';
import { Metrics } from '@/lib/monitoring/metrics';
import { ErrorTracker } from '@/lib/monitoring/error-tracker';

// Queue instance
let callQueue: Queue<CallProcessingJob> | null = null;

/**
 * Start the queue worker
 */
export async function startWorker(): Promise<void> {
  try {
    console.log('Starting queue worker...');

    // Create or connect to the queue
    callQueue = new Bull<CallProcessingJob>('call-processing', {
      redis: REDIS_CONFIG
    });

    // Process jobs
    callQueue.process(
      QUEUE_CONFIG.callProcessing.concurrency,
      async (job) => {
        // Process the job
        return processCall(job);
      }
    );

    // Set up event listeners
    setupWorkerEventListeners(callQueue);

    console.log(`Worker started with concurrency: ${QUEUE_CONFIG.callProcessing.concurrency}`);

    // Handle graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    console.error('Failed to start worker:', error);
    await ErrorTracker.trackError(error, { queue: true, operation: 'worker-startup' });
    throw error;
  }
}

/**
 * Set up worker event listeners
 */
function setupWorkerEventListeners(queue: Queue<CallProcessingJob>): void {
  // Job started
  queue.on('active', (job) => {
    console.log(`Processing job ${job.id} for call ${job.data.callId}`);
  });

  // Job completed
  queue.on('completed', async (job, result) => {
    console.log(`Completed job ${job.id} in ${result?.processingTime || 0}ms`);
    if (result?.processingTime) {
      await Metrics.recordResponseTime('worker.job.duration', result.processingTime);
    }
  });

  // Job failed
  queue.on('failed', async (job, error) => {
    console.error(`Failed job ${job?.id}:`, error.message);
    await ErrorTracker.trackError(error, {
      queue: true,
      operation: 'worker-job-failed',
      jobId: job?.id,
      callId: job?.data.callId
    });
  });

  // Global error
  queue.on('error', async (error) => {
    console.error('Queue error:', error);
    await ErrorTracker.trackError(error, { queue: true, operation: 'worker-error' });
  });

  // Stalled job
  queue.on('stalled', (job) => {
    console.warn(`Job ${job.id} stalled and will be retried`);
  });

  // Progress update
  queue.on('progress', (job, progress) => {
    console.log(`Job ${job.id} progress: ${progress}%`);
  });

  // Ready
  queue.on('ready', () => {
    console.log('Worker ready and waiting for jobs');
  });
}

/**
 * Graceful shutdown
 */
async function gracefulShutdown(): Promise<void> {
  console.log('Shutting down worker gracefully...');

  try {
    if (callQueue) {
      // Pause the queue to stop processing new jobs
      await callQueue.pause();

      // Wait for active jobs to complete (max 30 seconds)
      const maxWait = 30000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWait) {
        const activeCount = await callQueue.getActiveCount();
        if (activeCount === 0) {
          break;
        }
        console.log(`Waiting for ${activeCount} active jobs to complete...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Close the queue
      await callQueue.close();
      console.log('Worker shutdown complete');
    }

    process.exit(0);

  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

/**
 * Get worker status
 */
export async function getWorkerStatus(): Promise<any> {
  if (!callQueue) {
    return { status: 'not_started' };
  }

  try {
    const [isPaused, activeCount, waitingCount] = await Promise.all([
      callQueue.isPaused(),
      callQueue.getActiveCount(),
      callQueue.getWaitingCount()
    ]);

    return {
      status: isPaused ? 'paused' : 'running',
      isPaused,
      activeJobs: activeCount,
      waitingJobs: waitingCount,
      concurrency: QUEUE_CONFIG.callProcessing.concurrency
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Pause worker
 */
export async function pauseWorker(): Promise<void> {
  if (!callQueue) {
    throw new Error('Worker not started');
  }

  await callQueue.pause();
  console.log('Worker paused');
}

/**
 * Resume worker
 */
export async function resumeWorker(): Promise<void> {
  if (!callQueue) {
    throw new Error('Worker not started');
  }

  await callQueue.resume();
  console.log('Worker resumed');
}

// Auto-start worker if this file is run directly
if (require.main === module) {
  startWorker().catch((error) => {
    console.error('Failed to start worker:', error);
    process.exit(1);
  });
}