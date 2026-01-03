/**
 * Queue Configuration
 * Production-ready Bull queue configuration with Redis
 */

import Bull from 'bull';
import Redis from 'ioredis';

// Redis connection configuration
export const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy: (times: number) => {
    if (times > 10) return null;
    return Math.min(times * 50, 2000);
  }
};

// Queue configuration
export const QUEUE_CONFIG = {
  defaultJobOptions: {
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 500,     // Keep last 500 failed jobs
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 5000
    }
  },

  // Queue-specific configurations
  callProcessing: {
    concurrency: 5,        // Process 5 calls simultaneously
    maxStalledCount: 2,    // Retry stalled jobs twice
    stalledInterval: 30000 // Check for stalled jobs every 30s
  },

  transcription: {
    concurrency: 3,        // 3 concurrent transcriptions (API rate limit)
    maxStalledCount: 1,
    stalledInterval: 60000 // Check every minute
  },

  extraction: {
    concurrency: 10,       // 10 concurrent OpenAI extractions
    maxStalledCount: 2,
    stalledInterval: 30000
  },

  webhook: {
    concurrency: 20,       // 20 concurrent webhook deliveries
    maxStalledCount: 3,
    stalledInterval: 20000
  },

  usage: {
    concurrency: 50,       // High concurrency for usage updates
    maxStalledCount: 1,
    stalledInterval: 10000
  }
};

// Priority levels for jobs
export enum JobPriority {
  CRITICAL = 1,    // Highest priority
  HIGH = 5,
  NORMAL = 10,
  LOW = 15,
  BACKGROUND = 20  // Lowest priority
}

// Job status tracking
export enum JobStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  STALLED = 'stalled',
  DELAYED = 'delayed'
}

// Dead letter queue configuration
export const DLQ_CONFIG = {
  maxRetries: 5,
  retryDelay: 60000, // 1 minute between retries
  alertThreshold: 10 // Alert when DLQ has 10+ items
};

// Rate limiting for external APIs
export const API_RATE_LIMITS = {
  assemblyAI: {
    maxConcurrent: 3,
    perSecond: 1,
    perMinute: 30
  },
  openAI: {
    maxConcurrent: 10,
    perSecond: 5,
    perMinute: 100
  },
  webhooks: {
    maxConcurrent: 20,
    perSecond: 10,
    perMinute: 300
  }
};

// Create Redis client factory
export function createRedisClient(purpose: string = 'general'): Redis {
  const client = new Redis({
    ...REDIS_CONFIG,
    lazyConnect: true,
    connectionName: `calliq-${purpose}`
  });

  client.on('error', (error) => {
    console.error(`Redis client error (${purpose}):`, error);
  });

  client.on('connect', () => {
    console.log(`Redis client connected (${purpose})`);
  });

  client.on('ready', () => {
    console.log(`Redis client ready (${purpose})`);
  });

  return client;
}

// Queue health check configuration
export const HEALTH_CHECK_CONFIG = {
  interval: 30000,      // Check every 30 seconds
  timeout: 5000,        // 5 second timeout for health checks
  thresholds: {
    queueSize: 1000,    // Alert if queue > 1000 jobs
    processingTime: 300000, // Alert if job takes > 5 minutes
    errorRate: 0.1      // Alert if error rate > 10%
  }
};