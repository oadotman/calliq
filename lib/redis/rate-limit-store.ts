/**
 * Redis-based Rate Limiting Store
 * Implements sliding window algorithm for distributed rate limiting
 */

import redisClient from './client';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export class RedisRateLimitStore {
  private redis = redisClient;

  /**
   * Increment counter using sliding window algorithm
   * @param key - The rate limit key (usually IP or user ID)
   * @param windowMs - Time window in milliseconds
   * @param limit - Maximum requests allowed in the window
   * @returns Number of requests in the current window
   */
  async increment(key: string, windowMs: number, limit: number): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - windowMs;
    const prefixedKey = `rate_limit:${key}`;

    // If Redis is not available, allow all requests (fail open)
    if (!this.redis) {
      return {
        allowed: true,
        remaining: limit,
        resetTime: now + windowMs,
      };
    }

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline();

      // Remove entries outside the window
      pipeline.zremrangebyscore(prefixedKey, 0, windowStart);

      // Add current request with unique ID
      const requestId = `${now}-${Math.random()}`;
      pipeline.zadd(prefixedKey, now, requestId);

      // Count requests in the window
      pipeline.zcount(prefixedKey, windowStart, now);

      // Set expiry on the key
      pipeline.expire(prefixedKey, Math.ceil(windowMs / 1000));

      // Execute pipeline
      const results = await pipeline.exec();

      if (!results) {
        throw new Error('Redis pipeline execution failed');
      }

      // Extract count from pipeline results
      const count = results[2][1] as number;

      // Calculate reset time (when the oldest entry will expire)
      let resetTime = now + windowMs;
      if (count > limit) {
        // Get the oldest entry to calculate exact reset time
        const oldestEntry = await this.redis!.zrange(prefixedKey, 0, 0, 'WITHSCORES');
        if (oldestEntry.length >= 2) {
          const oldestTimestamp = parseInt(oldestEntry[1]);
          resetTime = oldestTimestamp + windowMs;
        }
      }

      return {
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
        resetTime,
        retryAfter: count > limit ? Math.ceil((resetTime - now) / 1000) : undefined,
      };
    } catch (error) {
      console.error('Redis rate limit error:', error);
      // Fail open - allow request if Redis is unavailable
      return {
        allowed: true,
        remaining: limit,
        resetTime: now + windowMs,
      };
    }
  }

  /**
   * Check current rate limit status without incrementing
   * @param key - The rate limit key
   * @param windowMs - Time window in milliseconds
   * @param limit - Maximum requests allowed in the window
   */
  async check(key: string, windowMs: number, limit: number): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - windowMs;
    const prefixedKey = `rate_limit:${key}`;

    // If Redis is not available, allow all requests (fail open)
    if (!this.redis) {
      return {
        allowed: true,
        remaining: limit,
        resetTime: now + windowMs,
      };
    }

    try {
      // Count requests in the current window
      const count = await this.redis.zcount(prefixedKey, windowStart, now);

      let resetTime = now + windowMs;
      if (count >= limit) {
        // Get the oldest entry to calculate exact reset time
        const oldestEntry = await this.redis!.zrange(prefixedKey, 0, 0, 'WITHSCORES');
        if (oldestEntry.length >= 2) {
          const oldestTimestamp = parseInt(oldestEntry[1]);
          resetTime = oldestTimestamp + windowMs;
        }
      }

      return {
        allowed: count < limit,
        remaining: Math.max(0, limit - count),
        resetTime,
        retryAfter: count >= limit ? Math.ceil((resetTime - now) / 1000) : undefined,
      };
    } catch (error) {
      console.error('Redis rate limit check error:', error);
      // Fail open
      return {
        allowed: true,
        remaining: limit,
        resetTime: now + windowMs,
      };
    }
  }

  /**
   * Reset rate limit for a specific key
   * @param key - The rate limit key to reset
   */
  async reset(key: string): Promise<void> {
    const prefixedKey = `rate_limit:${key}`;
    if (!this.redis) {
      return;
    }
    try {
      await this.redis.del(prefixedKey);
    } catch (error) {
      console.error('Redis rate limit reset error:', error);
    }
  }

  /**
   * Get all active rate limit keys (for monitoring)
   */
  async getActiveKeys(): Promise<string[]> {
    if (!this.redis) {
      return [];
    }
    try {
      const keys = await this.redis.keys('rate_limit:*');
      return keys.map((key) => key.replace('rate_limit:', ''));
    } catch (error) {
      console.error('Redis get active keys error:', error);
      return [];
    }
  }

  /**
   * Clean up expired rate limit entries
   * This is usually handled automatically by Redis TTL, but can be called manually
   */
  async cleanup(): Promise<number> {
    if (!this.redis) {
      return 0;
    }
    try {
      const keys = await this.redis.keys('rate_limit:*');
      let cleaned = 0;

      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        // Remove keys with no TTL or negative TTL
        if (ttl === -1 || ttl === -2) {
          await this.redis.del(key);
          cleaned++;
        }
      }

      return cleaned;
    } catch (error) {
      console.error('Redis cleanup error:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const redisRateLimitStore = new RedisRateLimitStore();
