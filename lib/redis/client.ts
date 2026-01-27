/**
 * Redis Client Configuration
 * Provides centralized Redis connection for caching and session management
 */

import Redis from 'ioredis';

// Create Redis client with production-ready configuration
// Make Redis optional for builds - only connect if REDIS_URL is provided
const createRedisClient = () => {
  // Skip Redis connection if REDIS_URL is not provided or we're in build mode
  if (
    !process.env.REDIS_URL &&
    (process.env.NODE_ENV === 'production' || process.env.SKIP_REDIS === 'true')
  ) {
    console.log('Redis connection skipped - REDIS_URL not provided or SKIP_REDIS=true');
    return null;
  }

  return new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),

    // Retry strategy for connection failures - limit retries during build
    retryStrategy: (times) => {
      if (process.env.NEXT_PHASE === 'phase-production-build' && times > 3) {
        console.log('Redis connection failed during build - continuing without Redis');
        return null; // Stop retrying during build
      }
      const delay = Math.min(times * 50, 2000);
      console.log(`Redis retry attempt ${times}, waiting ${delay}ms`);
      return delay;
    },

    // Connection options
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
    disconnectTimeout: 2000,

    // Automatic reconnection
    enableOfflineQueue: true,

    // Keep-alive
    keepAlive: 10000,
  });
};

const redisClient = createRedisClient();

// Connection event handlers
if (redisClient) {
  redisClient.on('connect', () => {
    console.log('Redis client connected');
  });

  redisClient.on('ready', () => {
    console.log('Redis client ready');
  });

  redisClient.on('error', (err) => {
    console.error('Redis client error:', err);
  });

  redisClient.on('close', () => {
    console.log('Redis connection closed');
  });

  redisClient.on('reconnecting', (time: any) => {
    console.log(`Redis reconnecting in ${time}ms`);
  });
}

export default redisClient;
