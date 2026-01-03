/**
 * Redis Client Configuration
 * Provides centralized Redis connection for caching and session management
 */

import Redis from 'ioredis';

// Create Redis client with production-ready configuration
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),

  // Retry strategy for connection failures
  retryStrategy: (times) => {
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

// Connection event handlers
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

redisClient.on('reconnecting', (time) => {
  console.log(`Redis reconnecting in ${time}ms`);
});

export default redisClient;