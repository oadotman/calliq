/**
 * Advanced Caching Service
 * Provides intelligent caching with TTL management, cache invalidation, and warming
 */

import redisClient from '@/lib/redis/client';
import { logger } from '@/lib/logger';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
  compress?: boolean; // Whether to compress the cached data
}

export class CacheService {
  private defaultTTL = 300; // 5 minutes default
  private keyPrefix = 'cache:';
  private tagPrefix = 'tag:';

  /**
   * Get item from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const fullKey = this.keyPrefix + key;
      const cached = await redisClient.get(fullKey);

      if (!cached) {
        return null;
      }

      // Update metrics
      await this.incrementMetric('hits');

      return JSON.parse(cached) as T;
    } catch (error) {
      logger.error({ key, error }, 'Cache get error');
      await this.incrementMetric('errors');
      return null;
    }
  }

  /**
   * Set item in cache with options
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    try {
      const fullKey = this.keyPrefix + key;
      const ttl = options.ttl || this.defaultTTL;
      const serialized = JSON.stringify(value);

      // Set with TTL
      await redisClient.setex(fullKey, ttl, serialized);

      // Handle tags for cache invalidation
      if (options.tags && options.tags.length > 0) {
        await this.addToTags(key, options.tags);
      }

      // Update metrics
      await this.incrementMetric('sets');

      return true;
    } catch (error) {
      logger.error({ key, error }, 'Cache set error');
      await this.incrementMetric('errors');
      return false;
    }
  }

  /**
   * Delete item from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      const fullKey = this.keyPrefix + key;
      await redisClient.del(fullKey);

      // Remove from tags
      await this.removeFromTags(key);

      await this.incrementMetric('deletes');
      return true;
    } catch (error) {
      logger.error({ key, error }, 'Cache delete error');
      return false;
    }
  }

  /**
   * Invalidate all cache entries with a specific tag
   */
  async invalidateTag(tag: string): Promise<number> {
    try {
      const tagKey = this.tagPrefix + tag;
      const keys = await redisClient.smembers(tagKey);

      if (keys.length === 0) {
        return 0;
      }

      // Delete all keys with this tag
      const fullKeys = keys.map(k => this.keyPrefix + k);
      await redisClient.del(...fullKeys);

      // Clean up the tag set
      await redisClient.del(tagKey);

      logger.info({ tag, count: keys.length }, 'Cache tag invalidated');
      return keys.length;
    } catch (error) {
      logger.error({ tag, error }, 'Cache tag invalidation error');
      return 0;
    }
  }

  /**
   * Get or set cache with callback
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - fetch and cache
    await this.incrementMetric('misses');

    try {
      const value = await fetchFn();
      await this.set(key, value, options);
      return value;
    } catch (error) {
      logger.error({ key, error }, 'Cache getOrSet fetch error');
      throw error;
    }
  }

  /**
   * Warm cache with multiple entries
   */
  async warmCache(entries: Array<{ key: string; value: any; options?: CacheOptions }>) {
    const results = await Promise.allSettled(
      entries.map(entry => this.set(entry.key, entry.value, entry.options))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    logger.info({ total: entries.length, successful }, 'Cache warming completed');

    return { total: entries.length, successful };
  }

  /**
   * Clear all cache entries (use with caution)
   */
  async clear(): Promise<void> {
    try {
      const keys = await redisClient.keys(this.keyPrefix + '*');
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }

      // Clear all tags
      const tagKeys = await redisClient.keys(this.tagPrefix + '*');
      if (tagKeys.length > 0) {
        await redisClient.del(...tagKeys);
      }

      logger.info({ count: keys.length }, 'Cache cleared');
    } catch (error) {
      logger.error({ error }, 'Cache clear error');
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    errors: number;
    hitRate: number;
  }> {
    try {
      const [hits, misses, sets, deletes, errors] = await Promise.all([
        this.getMetric('hits'),
        this.getMetric('misses'),
        this.getMetric('sets'),
        this.getMetric('deletes'),
        this.getMetric('errors')
      ]);

      const total = hits + misses;
      const hitRate = total > 0 ? (hits / total) * 100 : 0;

      return { hits, misses, sets, deletes, errors, hitRate };
    } catch (error) {
      logger.error({ error }, 'Failed to get cache stats');
      return { hits: 0, misses: 0, sets: 0, deletes: 0, errors: 0, hitRate: 0 };
    }
  }

  /**
   * Private: Add key to tags for invalidation
   */
  private async addToTags(key: string, tags: string[]): Promise<void> {
    const promises = tags.map(tag => {
      const tagKey = this.tagPrefix + tag;
      return redisClient.sadd(tagKey, key);
    });
    await Promise.all(promises);
  }

  /**
   * Private: Remove key from all tags
   */
  private async removeFromTags(key: string): Promise<void> {
    // This is a simplified version - in production you might want to track
    // which tags a key belongs to for more efficient removal
    const tagKeys = await redisClient.keys(this.tagPrefix + '*');
    if (tagKeys.length > 0) {
      const promises = tagKeys.map(tagKey => redisClient.srem(tagKey, key));
      await Promise.all(promises);
    }
  }

  /**
   * Private: Increment a metric counter
   */
  private async incrementMetric(metric: string): Promise<void> {
    const metricKey = `metrics:cache:${metric}`;
    await redisClient.incr(metricKey);
  }

  /**
   * Private: Get a metric value
   */
  private async getMetric(metric: string): Promise<number> {
    const metricKey = `metrics:cache:${metric}`;
    const value = await redisClient.get(metricKey);
    return value ? parseInt(value, 10) : 0;
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// Cache key generators for consistency
export const cacheKeys = {
  // Organization cache keys
  organization: (id: string) => `org:${id}`,
  organizationSettings: (id: string) => `org:${id}:settings`,
  organizationUsage: (id: string) => `org:${id}:usage`,
  organizationMembers: (id: string) => `org:${id}:members`,

  // User cache keys
  user: (id: string) => `user:${id}`,
  userPermissions: (id: string) => `user:${id}:permissions`,
  userOrganizations: (id: string) => `user:${id}:orgs`,

  // Call cache keys
  call: (id: string) => `call:${id}`,
  callTranscript: (id: string) => `call:${id}:transcript`,
  callExtractedData: (id: string) => `call:${id}:data`,
  organizationCalls: (orgId: string, page?: number) => `org:${orgId}:calls:${page || 1}`,

  // Partner cache keys
  partner: (id: string) => `partner:${id}`,
  partnerTier: (id: string) => `partner:${id}:tier`,
  partnerAnalytics: (id: string) => `partner:${id}:analytics`,

  // System cache keys
  systemConfig: () => 'system:config',
  systemHealth: () => 'system:health',
  rateLimitBucket: (key: string) => `ratelimit:${key}`,
};

// Cache tags for invalidation groups
export const cacheTags = {
  organization: (id: string) => `org:${id}`,
  user: (id: string) => `user:${id}`,
  call: (id: string) => `call:${id}`,
  partner: (id: string) => `partner:${id}`,
};