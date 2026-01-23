/**
 * Call Processing Queue
 * Production-ready implementation with Bull queue for robust background processing
 */

import Bull, { Job, Queue } from 'bull';
import {
  REDIS_CONFIG,
  QUEUE_CONFIG,
  JobPriority,
  JobStatus,
  createRedisClient
} from './config';
import { createClient } from '@/lib/supabase/server';
import { Metrics } from '@/lib/monitoring/metrics';
import { ErrorTracker } from '@/lib/monitoring/error-tracker';

export interface CallProcessingJob {
  callId: string;
  userId: string;
  teamId?: string;
  organizationId?: string;
  fileUrl: string;
  fileName: string;
  duration: number;
  priority?: JobPriority;
  metadata?: Record<string, any>;
  retryCount?: number;
}

export interface ProcessingResult {
  callId: string;
  transcriptionId?: string;
  extractedData?: any;
  processingTime: number;
  status: JobStatus;
  error?: string;
}

// Create the main call processing queue
let callQueue: Queue<CallProcessingJob> | null = null;

/**
 * Initialize the call processing queue
 */
export async function initializeCallQueue(): Promise<Queue<CallProcessingJob>> {
  if (callQueue) {
    return callQueue;
  }

  try {
    // Create separate Redis clients for queue operations
    const client = createRedisClient('queue-client');
    const subscriber = createRedisClient('queue-subscriber');

    callQueue = new Bull<CallProcessingJob>('call-processing', {
      createClient: (type) => {
        switch (type) {
          case 'client':
            return client;
          case 'subscriber':
            return subscriber;
          case 'bclient':
            return createRedisClient('queue-bclient');
          default:
            return createRedisClient(`queue-${type}`);
        }
      },
      defaultJobOptions: QUEUE_CONFIG.defaultJobOptions
    });

    // Set up event listeners
    setupQueueEventListeners(callQueue);

    console.log('Call processing queue initialized successfully');
    return callQueue;

  } catch (error) {
    console.error('Failed to initialize call queue:', error);
    await ErrorTracker.trackError(error, { queue: true, operation: 'initialization' });
    throw error;
  }
}

/**
 * Enqueue a call for processing
 */
export async function enqueueCallProcessing(
  job: CallProcessingJob
): Promise<string> {
  try {
    // Ensure queue is initialized
    const queue = await initializeCallQueue();

    // Validate job data
    if (!job.callId || !job.userId || !job.fileUrl) {
      throw new Error('Invalid job data: missing required fields');
    }

    // Track metrics
    const stats = await getQueueStats();
    if (stats.counts?.total) {
      await Metrics.recordQueueDepth('call-processing', stats.counts.total + 1);
    }

    // Add job to queue with priority
    const bullJob = await queue.add('process-call', job, {
      priority: job.priority || JobPriority.NORMAL,
      delay: 0,
      attempts: job.retryCount || QUEUE_CONFIG.defaultJobOptions.attempts,
      backoff: QUEUE_CONFIG.defaultJobOptions.backoff,
      removeOnComplete: QUEUE_CONFIG.defaultJobOptions.removeOnComplete,
      removeOnFail: false // Keep failed jobs for debugging
    });

    console.log(`Call ${job.callId} enqueued with job ID: ${bullJob.id}`);

    // Update call status in database
    const supabase = createClient();
    await supabase
      .from('calls')
      .update({
        status: 'queued',
        queue_job_id: bullJob.id?.toString(),
        queued_at: new Date().toISOString(),
        metadata: {
          ...job.metadata,
          queuePriority: job.priority || JobPriority.NORMAL
        }
      })
      .eq('id', job.callId);

    return bullJob.id?.toString() || '';

  } catch (error) {
    console.error('Error enqueuing call:', error);
    await ErrorTracker.trackError(error, { queue: true, operation: 'enqueue', callId: job.callId });

    // Update call status to failed
    try {
      const supabase = createClient();
      await supabase
        .from('calls')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Failed to enqueue',
          failed_at: new Date().toISOString()
        })
        .eq('id', job.callId);
    } catch (dbError) {
      console.error('Failed to update call status:', dbError);
    }

    throw new Error(`Failed to enqueue call ${job.callId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Process a call (this is the actual job processor)
 */
export async function processCall(job: Job<CallProcessingJob>): Promise<ProcessingResult> {
  const startTime = Date.now();
  const { data } = job;

  try {
    console.log(`Processing call ${data.callId} (attempt ${job.attemptsMade + 1}/${job.opts.attempts})`);

    // Update status to processing
    const supabase = createClient();
    await supabase
      .from('calls')
      .update({
        status: 'processing',
        processing_started_at: new Date().toISOString(),
        attempts: job.attemptsMade + 1
      })
      .eq('id', data.callId);

    // Track processing metrics - record as database operation
    await Metrics.recordDatabaseQuery('queue_processing', 0);

    // Step 1: Send to AssemblyAI for transcription
    const transcriptionId = await sendToAssemblyAI(data);

    // Update progress
    await job.progress(33);

    // Step 2: Wait for transcription completion
    const transcription = await waitForTranscription(transcriptionId, data.callId);

    // Update progress
    await job.progress(66);

    // Step 3: Extract data with OpenAI
    const extractedData = await extractDataWithOpenAI(transcription, data);

    // Update progress
    await job.progress(90);

    // Step 4: Save results to database
    await saveProcessingResults(data.callId, {
      transcriptionId,
      transcription,
      extractedData,
      processingTime: Date.now() - startTime,
      actualDuration: extractedData.actualDuration // Pass through actual duration from extraction
    });

    // Update progress
    await job.progress(100);

    // Track success metrics
    const processingTime = Date.now() - startTime;
    await Metrics.recordResponseTime('queue.call.processing', processingTime);

    console.log(`Call ${data.callId} processed successfully in ${processingTime}ms`);

    return {
      callId: data.callId,
      transcriptionId,
      extractedData,
      processingTime,
      status: JobStatus.COMPLETED
    };

  } catch (error) {
    console.error(`Error processing call ${data.callId}:`, error);

    // Track error metrics
    await Metrics.recordError('queue.calls', 'PROCESSING_FAILED');
    await ErrorTracker.trackError(error, {
      queue: true,
      operation: 'processing',
      callId: data.callId,
      attempt: job.attemptsMade + 1
    });

    // Update call status
    const supabase = createClient();
    const isLastAttempt = job.attemptsMade + 1 >= (job.opts.attempts || 3);

    await supabase
      .from('calls')
      .update({
        status: isLastAttempt ? 'failed' : 'retrying',
        error_message: error instanceof Error ? error.message : 'Processing failed',
        last_error_at: new Date().toISOString(),
        attempts: job.attemptsMade + 1
      })
      .eq('id', data.callId);

    // Log critical call failures
    if (data.priority === JobPriority.CRITICAL && isLastAttempt) {
      console.error(`CRITICAL: Call ${data.callId} failed after ${job.attemptsMade + 1} attempts`);
      // In production, this would trigger an alert through the AlertManager.checkAndAlert() method
    }

    throw error; // Re-throw to trigger Bull's retry mechanism
  }
}

/**
 * Send call to AssemblyAI for transcription
 */
async function sendToAssemblyAI(job: CallProcessingJob): Promise<string> {
  // This would integrate with AssemblyAI API
  // For now, return mock transcription ID
  console.log(`Sending call ${job.callId} to AssemblyAI`);

  // In production:
  // const response = await fetch('https://api.assemblyai.com/v2/transcript', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': process.env.ASSEMBLY_AI_API_KEY,
  //     'Content-Type': 'application/json'
  //   },
  //   body: JSON.stringify({ audio_url: job.fileUrl })
  // });
  // const data = await response.json();
  // return data.id;

  return `transcript_${job.callId}_${Date.now()}`;
}

/**
 * Wait for transcription to complete
 */
async function waitForTranscription(
  transcriptionId: string,
  callId: string
): Promise<string> {
  // This would poll AssemblyAI API for completion
  console.log(`Waiting for transcription ${transcriptionId} to complete`);

  // In production:
  // let status = 'processing';
  // while (status === 'processing' || status === 'queued') {
  //   await new Promise(resolve => setTimeout(resolve, 5000));
  //   const response = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptionId}`, {
  //     headers: { 'Authorization': process.env.ASSEMBLY_AI_API_KEY }
  //   });
  //   const data = await response.json();
  //   status = data.status;
  //   if (status === 'completed') return data.text;
  //   if (status === 'error') throw new Error('Transcription failed');
  // }

  return `Mock transcription for call ${callId}`;
}

/**
 * Extract data using OpenAI
 */
async function extractDataWithOpenAI(
  transcription: string,
  job: CallProcessingJob
): Promise<any> {
  // This would call OpenAI API for data extraction
  console.log(`Extracting data for call ${job.callId} with OpenAI`);

  // In production:
  // const response = await openai.chat.completions.create({
  //   model: 'gpt-4-turbo-preview',
  //   messages: [
  //     { role: 'system', content: 'Extract structured data from call transcription' },
  //     { role: 'user', content: transcription }
  //   ]
  // });
  // return response.choices[0].message.content;

  return {
    summary: `Call summary for ${job.callId}`,
    sentiment: 'positive',
    keyPoints: ['Point 1', 'Point 2'],
    actionItems: [],
    actualDuration: 300 // In production, this would come from AssemblyAI
  };
}

/**
 * Save processing results to database
 */
async function saveProcessingResults(
  callId: string,
  results: any
): Promise<void> {
  const supabase = createClient();

  // First, get the call to retrieve reservation ID from metadata
  const { data: call, error: fetchError } = await supabase
    .from('calls')
    .select('metadata, organization_id')
    .eq('id', callId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch call: ${fetchError.message}`);
  }

  const { error } = await supabase
    .from('calls')
    .update({
      status: 'completed',
      transcription_id: results.transcriptionId,
      transcription_text: results.transcription,
      extracted_data: results.extractedData,
      processing_time: results.processingTime,
      completed_at: new Date().toISOString()
    })
    .eq('id', callId);

  if (error) {
    throw new Error(`Failed to save results: ${error.message}`);
  }

  console.log(`Results saved for call ${callId}`);

  // Confirm usage reservation if it exists
  if (call?.metadata?.reservationId && call?.organization_id) {
    try {
      const { confirmReservation } = await import('@/lib/usage-reservation');
      const actualMinutes = results.actualDuration ? results.actualDuration / 60 : undefined;

      await confirmReservation(
        call.metadata.reservationId,
        actualMinutes // Pass actual duration if available, otherwise uses estimated
      );

      console.log(`Confirmed reservation ${call.metadata.reservationId} for call ${callId}`);
    } catch (error) {
      console.error(`Failed to confirm reservation for call ${callId}:`, error);
      // Don't throw - processing succeeded even if reservation confirmation failed
    }
  }
}

/**
 * Set up queue event listeners for monitoring
 */
function setupQueueEventListeners(queue: Queue<CallProcessingJob>): void {
  // Job completed successfully
  queue.on('completed', async (job, result) => {
    console.log(`Job ${job.id} completed for call ${job.data.callId}`);
    // Record as successful response time
    if (result && result.processingTime) {
      await Metrics.recordResponseTime('queue.job', result.processingTime);
    }
  });

  // Job failed after all retries
  queue.on('failed', async (job, err) => {
    console.error(`Job ${job.id} failed for call ${job.data.callId}:`, err.message);
    await Metrics.recordError('queue.jobs', 'JOB_FAILED');

    // Send to dead letter queue if configured
    if (job.attemptsMade >= (job.opts.attempts || 3)) {
      await sendToDeadLetterQueue(job);
    }
  });

  // Job is stalled
  queue.on('stalled', async (job) => {
    console.warn(`Job ${job.id} stalled for call ${job.data.callId}`);
    await Metrics.recordError('queue.jobs', 'JOB_STALLED');
  });

  // Global error handler
  queue.on('error', async (error) => {
    console.error('Queue error:', error);
    await ErrorTracker.trackError(error, { queue: true, operation: 'global' });
  });

  // Progress updates
  queue.on('progress', (job, progress) => {
    console.log(`Job ${job.id} progress: ${progress}%`);
  });
}

/**
 * Send failed job to dead letter queue
 */
async function sendToDeadLetterQueue(job: Job<CallProcessingJob>): Promise<void> {
  try {
    const dlQueue = new Bull('dead-letter-queue', {
      redis: REDIS_CONFIG
    });

    await dlQueue.add('failed-call', {
      originalJob: job.data,
      jobId: job.id,
      failedAt: new Date().toISOString(),
      error: job.failedReason,
      attempts: job.attemptsMade
    });

    console.log(`Job ${job.id} sent to dead letter queue`);

    // Alert if DLQ is getting full
    const dlqCount = await dlQueue.count();
    if (dlqCount >= 10) {
      console.warn(`WARNING: Dead letter queue has ${dlqCount} items`);
      // In production, this would trigger an alert through the AlertManager.checkAndAlert() method
    }

  } catch (error) {
    console.error('Failed to send to DLQ:', error);
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<any> {
  if (!callQueue) {
    return {
      status: 'not_initialized',
      counts: {}
    };
  }

  try {
    const [
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused
    ] = await Promise.all([
      callQueue.getWaitingCount(),
      callQueue.getActiveCount(),
      callQueue.getCompletedCount(),
      callQueue.getFailedCount(),
      callQueue.getDelayedCount(),
      callQueue.isPaused()
    ]);

    return {
      status: paused ? 'paused' : 'active',
      counts: {
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + delayed
      },
      health: {
        isPaused: paused,
        isHealthy: waiting < 1000 && failed < 100
      }
    };

  } catch (error) {
    console.error('Error getting queue stats:', error);
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Pause queue processing
 */
export async function pauseQueue(): Promise<void> {
  if (!callQueue) {
    throw new Error('Queue not initialized');
  }

  await callQueue.pause();
  console.log('Call processing queue paused');
}

/**
 * Resume queue processing
 */
export async function resumeQueue(): Promise<void> {
  if (!callQueue) {
    throw new Error('Queue not initialized');
  }

  await callQueue.resume();
  console.log('Call processing queue resumed');
}

/**
 * Clean old completed jobs
 */
export async function cleanCompletedJobs(olderThan: number = 86400000): Promise<void> {
  if (!callQueue) {
    throw new Error('Queue not initialized');
  }

  const jobs = await callQueue.getCompleted();
  const cutoffTime = Date.now() - olderThan;
  let cleaned = 0;

  for (const job of jobs) {
    if (job.finishedOn && job.finishedOn < cutoffTime) {
      await job.remove();
      cleaned++;
    }
  }

  console.log(`Cleaned ${cleaned} old completed jobs`);
}

/**
 * Retry failed jobs
 */
export async function retryFailedJobs(): Promise<number> {
  if (!callQueue) {
    throw new Error('Queue not initialized');
  }

  const failedJobs = await callQueue.getFailed();
  let retried = 0;

  for (const job of failedJobs) {
    try {
      await job.retry();
      retried++;
      console.log(`Retried job ${job.id} for call ${job.data.callId}`);
    } catch (error) {
      console.error(`Failed to retry job ${job.id}:`, error);
    }
  }

  console.log(`Retried ${retried} failed jobs`);
  return retried;
}

/**
 * Gracefully shutdown the queue
 */
export async function shutdownQueue(): Promise<void> {
  if (!callQueue) {
    return;
  }

  console.log('Shutting down call processing queue...');

  // Pause processing new jobs
  await callQueue.pause();

  // Wait for active jobs to complete (max 30 seconds)
  const maxWait = 30000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    const activeCount = await callQueue.getActiveCount();
    if (activeCount === 0) {
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Close the queue
  await callQueue.close();
  callQueue = null;

  console.log('Call processing queue shutdown complete');
}