/**
 * Redis-based Rate Limiting Implementation
 * Drop-in replacement for in-memory rate limiter with distributed capabilities
 */

import { redisRateLimitStore } from './redis/rate-limit-store';

interface RateLimiterOptions {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Not used in Redis implementation (for compatibility)
  tokensPerInterval: number; // Max requests per interval
}

export class RateLimiter {
  private interval: number;
  private tokensPerInterval: number;
  private useRedis: boolean;

  constructor(options: RateLimiterOptions) {
    this.interval = options.interval;
    this.tokensPerInterval = options.tokensPerInterval;

    // Use Redis if available, fallback to in-memory if not
    this.useRedis = process.env.REDIS_HOST ? true : false;

    if (!this.useRedis) {
      console.warn('Redis not configured, using in-memory rate limiting (not suitable for production)');
    }
  }

  /**
   * Check if request is allowed for given identifier
   * @param identifier - Usually IP address or user ID
   * @throws Error if rate limit exceeded
   */
  async check(identifier: string): Promise<void> {
    const result = await redisRateLimitStore.increment(
      identifier,
      this.interval,
      this.tokensPerInterval
    );

    if (!result.allowed) {
      throw new Error(
        `Rate limit exceeded. Retry after ${result.retryAfter} seconds.`
      );
    }
  }

  /**
   * Get current rate limit status for identifier
   */
  async getStatus(identifier: string): Promise<{ remaining: number; resetAt: Date } | null> {
    const result = await redisRateLimitStore.check(
      identifier,
      this.interval,
      this.tokensPerInterval
    );

    return {
      remaining: result.remaining,
      resetAt: new Date(result.resetTime),
    };
  }

  /**
   * Get the tokens per interval limit
   */
  getLimit(): number {
    return this.tokensPerInterval;
  }

  /**
   * Reset rate limit for identifier
   */
  async reset(identifier: string): Promise<void> {
    await redisRateLimitStore.reset(identifier);
  }
}

// =====================================================
// PRE-CONFIGURED RATE LIMITERS (same as original)
// =====================================================

// Upload API: 5 uploads per minute per user
export const uploadRateLimiter = new RateLimiter({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
  tokensPerInterval: 5,
});

// General API: 60 requests per minute per user
export const apiRateLimiter = new RateLimiter({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 1000,
  tokensPerInterval: 60,
});

// Auth API: 10 attempts per 15 minutes (stricter)
export const authRateLimiter = new RateLimiter({
  interval: 15 * 60 * 1000, // 15 minutes
  uniqueTokenPerInterval: 500,
  tokensPerInterval: 10,
});

// Team invitation: 10 invites per hour
export const inviteRateLimiter = new RateLimiter({
  interval: 60 * 60 * 1000, // 1 hour
  uniqueTokenPerInterval: 500,
  tokensPerInterval: 10,
});

// Extract API: 20 extractions per minute per user (expensive GPT-4 operations)
export const extractRateLimiter = new RateLimiter({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 1000,
  tokensPerInterval: 20,
});

// Poll API: 60 polls per minute per user
export const pollRateLimiter = new RateLimiter({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 1000,
  tokensPerInterval: 60,
});

// Health check: 30 checks per minute per IP (prevent information disclosure attacks)
export const healthRateLimiter = new RateLimiter({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
  tokensPerInterval: 30,
});

// =====================================================
// RATE LIMIT MIDDLEWARE HELPER
// =====================================================

export async function applyRateLimit(
  rateLimiter: RateLimiter,
  identifier: string,
  headers?: Headers
): Promise<void> {
  try {
    await rateLimiter.check(identifier);

    // Add rate limit headers if headers object provided
    if (headers) {
      const status = await rateLimiter.getStatus(identifier);
      if (status) {
        headers.set('X-RateLimit-Limit', rateLimiter.getLimit().toString());
        headers.set('X-RateLimit-Remaining', status.remaining.toString());
        headers.set('X-RateLimit-Reset', status.resetAt.toISOString());
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
      // Extract retry after from error message
      const match = error.message.match(/Retry after (\d+) seconds/);
      const retryAfter = match ? match[1] : '60';

      if (headers) {
        headers.set('Retry-After', retryAfter);
        headers.set('X-RateLimit-Limit', rateLimiter.getLimit().toString());
        headers.set('X-RateLimit-Remaining', '0');
      }
    }
    throw error;
  }
}