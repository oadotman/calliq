/**
 * Cache Manager
 * Provides caching strategies for API responses and frequently accessed data
 */

import redisClient from './client';

export class CacheManager {
  private readonly prefix = 'cache:';

  /**
   * Get or set cached data
   * If data exists in cache, return it
   * Otherwise, call fetcher function and cache the result
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 300 // 5 minutes default
  ): Promise<T> {
    try {
      const cacheKey = `${this.prefix}${key}`;

      // Try to get from cache
      const cached = await redisClient!.get(cacheKey);
      if (cached) {
        console.log(`Cache hit for key: ${key}`);
        return JSON.parse(cached);
      }

      // Cache miss - fetch data
      console.log(`Cache miss for key: ${key}`);
      const data = await fetcher();

      // Store in cache
      if (data !== null && data !== undefined) {
        await redisClient!.setex(cacheKey, ttl, JSON.stringify(data));
      }

      return data;
    } catch (error) {
      console.error('Cache error, falling back to fetcher:', error);
      // If cache fails, don't break the app - just fetch directly
      return await fetcher();
    }
  }

  /**
   * Get cached value directly
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cacheKey = `${this.prefix}${key}`;
      const cached = await redisClient!.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Error getting from cache:', error);
      return null;
    }
  }

  /**
   * Set cache value directly
   */
  async set(key: string, value: any, ttl: number = 300): Promise<boolean> {
    try {
      const cacheKey = `${this.prefix}${key}`;
      await redisClient!.setex(cacheKey, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Error setting cache:', error);
      return false;
    }
  }

  /**
   * Delete a specific cache key
   */
  async delete(key: string): Promise<boolean> {
    try {
      const cacheKey = `${this.prefix}${key}`;
      const deleted = await redisClient!.del(cacheKey);
      return deleted === 1;
    } catch (error) {
      console.error('Error deleting from cache:', error);
      return false;
    }
  }

  /**
   * Invalidate cache keys by pattern
   * Example: invalidatePattern('user:*') to clear all user caches
   */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const searchPattern = `${this.prefix}${pattern}`;
      const keys = await redisClient!.keys(searchPattern);

      if (keys.length === 0) {
        return 0;
      }

      const deleted = await redisClient!.del(...keys);
      console.log(`Invalidated ${deleted} cache keys matching pattern: ${pattern}`);
      return deleted;
    } catch (error) {
      console.error('Error invalidating cache pattern:', error);
      return 0;
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  async clearAll(): Promise<number> {
    try {
      const pattern = `${this.prefix}*`;
      const keys = await redisClient!.keys(pattern);

      if (keys.length === 0) {
        return 0;
      }

      const deleted = await redisClient!.del(...keys);
      console.log(`Cleared ${deleted} cache entries`);
      return deleted;
    } catch (error) {
      console.error('Error clearing cache:', error);
      return 0;
    }
  }

  /**
   * Get cache stats for monitoring
   */
  async getStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    connected: boolean;
  }> {
    try {
      const pattern = `${this.prefix}*`;
      const keys = await redisClient!.keys(pattern);
      const info = await redisClient!.info('memory');

      // Parse memory usage from Redis INFO command
      const memMatch = info.match(/used_memory_human:(\S+)/);
      const memoryUsage = memMatch ? memMatch[1] : 'unknown';

      return {
        totalKeys: keys.length,
        memoryUsage,
        connected: redisClient?.status === 'ready',
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        totalKeys: 0,
        memoryUsage: 'unknown',
        connected: false,
      };
    }
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();

/**
 * Cache key generators for consistent key naming
 */
export const CacheKeys = {
  // User-related caches
  user: (userId: string) => `user:${userId}`,
  userCalls: (userId: string, page: number = 1) => `user:${userId}:calls:${page}`,
  userStats: (userId: string) => `user:${userId}:stats`,

  // Organization-related caches
  org: (orgId: string) => `org:${orgId}`,
  orgMembers: (orgId: string) => `org:${orgId}:members`,
  orgUsage: (orgId: string, month: string) => `org:${orgId}:usage:${month}`,
  orgCalls: (orgId: string, page: number = 1) => `org:${orgId}:calls:${page}`,

  // Call-related caches
  call: (callId: string) => `call:${callId}`,
  callTranscript: (callId: string) => `call:${callId}:transcript`,
  callExtraction: (callId: string) => `call:${callId}:extraction`,

  // Dashboard caches
  dashboardStats: (orgId: string) => `dashboard:${orgId}:stats`,
  recentActivity: (orgId: string) => `dashboard:${orgId}:recent`,
};
