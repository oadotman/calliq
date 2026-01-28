/**
 * Safe Redis Client Wrapper
 * Provides null-safe operations for Redis client
 */

import redisClient from './client';

export class SafeRedisClient {
  private client = redisClient;

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return this.client !== null && this.client.status === 'ready';
  }

  /**
   * Safe ping operation
   */
  async ping(): Promise<string | null> {
    if (!this.client) return null;
    try {
      return await this.client.ping();
    } catch {
      return null;
    }
  }

  /**
   * Safe get operation
   */
  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  /**
   * Safe set operation
   */
  async set(key: string, value: string, ttl?: number): Promise<boolean> {
    if (!this.client) return false;
    try {
      if (ttl) {
        await this.client.setex(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Safe delete operation
   */
  async del(key: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.del(key);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Safe keys operation
   */
  async keys(pattern: string): Promise<string[]> {
    if (!this.client) return [];
    try {
      return await this.client.keys(pattern);
    } catch {
      return [];
    }
  }

  /**
   * Safe hgetall operation
   */
  async hgetall(key: string): Promise<Record<string, string> | null> {
    if (!this.client) return null;
    try {
      return await this.client.hgetall(key);
    } catch {
      return null;
    }
  }

  /**
   * Safe hincrby operation
   */
  async hincrby(key: string, field: string, value: number): Promise<number> {
    if (!this.client) return 0;
    try {
      return await this.client.hincrby(key, field, value);
    } catch {
      return 0;
    }
  }

  /**
   * Safe incr operation
   */
  async incr(key: string): Promise<number> {
    if (!this.client) return 0;
    try {
      return await this.client.incr(key);
    } catch {
      return 0;
    }
  }

  /**
   * Safe expire operation
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.expire(key, seconds);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Safe ttl operation
   */
  async ttl(key: string): Promise<number> {
    if (!this.client) return -2;
    try {
      return await this.client.ttl(key);
    } catch {
      return -2;
    }
  }

  /**
   * Safe pipeline operation
   */
  pipeline() {
    if (!this.client) {
      // Return a mock pipeline that does nothing
      return {
        incr: () => this,
        expire: () => this,
        exec: async () => [],
        zadd: () => this,
        zremrangebyscore: () => this,
        zcount: () => this,
        zrange: () => this,
      };
    }
    return this.client.pipeline();
  }

  /**
   * Get raw client (use with caution)
   */
  getRawClient() {
    return this.client;
  }

  /**
   * Get status
   */
  get status(): string {
    return this.client?.status || 'disconnected';
  }
}

// Export singleton instance
export const safeRedisClient = new SafeRedisClient();
export default safeRedisClient;
