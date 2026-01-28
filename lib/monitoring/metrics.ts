/**
 * Minimal Metrics Collection System
 * Tracks essential performance metrics using Redis
 * Focuses only on critical metrics for scale and reliability
 */

import redisClient from '@/lib/redis/client';

export class Metrics {
  private static readonly METRICS_PREFIX = 'metrics:';
  private static readonly WINDOW_SIZE = 3600; // 1 hour window for metrics

  /**
   * Record API response time
   */
  static async recordResponseTime(route: string, duration: number): Promise<void> {
    if (!redisClient) return;

    try {
      const key = `${this.METRICS_PREFIX}response_times:${route}`;
      const timestamp = Date.now();

      // Store in sorted set with timestamp as score
      await redisClient.zadd(key, timestamp, `${timestamp}:${duration}`);

      // Remove old entries (older than window)
      await redisClient.zremrangebyscore(key, '-inf', timestamp - this.WINDOW_SIZE * 1000);

      // Set expiry
      await redisClient.expire(key, this.WINDOW_SIZE);

      // Update aggregates
      await this.updateResponseTimeAggregates(route, duration);
    } catch (error) {
      console.error('Error recording response time:', error);
    }
  }

  /**
   * Record an error occurrence
   */
  static async recordError(route: string, errorType: string): Promise<void> {
    if (!redisClient) return;

    try {
      const hourKey = `${this.METRICS_PREFIX}errors:${route}:${this.getCurrentHour()}`;
      const totalKey = `${this.METRICS_PREFIX}errors:total`;

      // Increment error count for specific route and error type
      await redisClient.hincrby(hourKey, errorType, 1);
      await redisClient.expire(hourKey, this.WINDOW_SIZE);

      // Increment total error count
      await redisClient.incr(totalKey);
      await redisClient.expire(totalKey, this.WINDOW_SIZE);

      // Track error rate
      await this.updateErrorRate();
    } catch (error) {
      console.error('Error recording error metric:', error);
    }
  }

  /**
   * Record queue depth
   */
  static async recordQueueDepth(queueName: string, depth: number): Promise<void> {
    if (!redisClient) return;

    try {
      const key = `${this.METRICS_PREFIX}queue:${queueName}`;
      await redisClient.set(key, depth, 'EX', 60); // Expire after 1 minute

      // Track max queue depth
      const maxKey = `${this.METRICS_PREFIX}queue:${queueName}:max`;
      const currentMax = await redisClient.get(maxKey);
      if (!currentMax || depth > parseInt(currentMax)) {
        await redisClient.set(maxKey, depth, 'EX', this.WINDOW_SIZE);
      }
    } catch (error) {
      console.error('Error recording queue depth:', error);
    }
  }

  /**
   * Record database query time
   */
  static async recordDatabaseQuery(operation: string, duration: number): Promise<void> {
    if (!redisClient) return;

    try {
      const key = `${this.METRICS_PREFIX}db:${operation}`;
      const timestamp = Date.now();

      await redisClient.zadd(key, timestamp, `${timestamp}:${duration}`);
      await redisClient.zremrangebyscore(key, '-inf', timestamp - this.WINDOW_SIZE * 1000);
      await redisClient.expire(key, this.WINDOW_SIZE);

      // Track slow queries
      if (duration > 1000) {
        await this.recordSlowQuery(operation, duration);
      }
    } catch (error) {
      console.error('Error recording database query:', error);
    }
  }

  /**
   * Record cache hit/miss
   */
  static async recordCacheOperation(hit: boolean): Promise<void> {
    if (!redisClient) return;

    try {
      const key = hit ? `${this.METRICS_PREFIX}cache:hits` : `${this.METRICS_PREFIX}cache:misses`;

      await redisClient.incr(key);
      await redisClient.expire(key, this.WINDOW_SIZE);
    } catch (error) {
      console.error('Error recording cache operation:', error);
    }
  }

  /**
   * Record memory usage
   */
  static async recordMemoryUsage(): Promise<void> {
    if (!redisClient) return;

    try {
      const memUsage = process.memoryUsage();
      const key = `${this.METRICS_PREFIX}memory:node`;

      await redisClient.hset(key, {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        timestamp: Date.now(),
      });
      await redisClient.expire(key, 300); // 5 minutes
    } catch (error) {
      console.error('Error recording memory usage:', error);
    }
  }

  /**
   * Get current metrics summary
   */
  static async getMetricsSummary(): Promise<any> {
    if (!redisClient) return null;

    try {
      const [responseTimeStats, errorCount, cacheHits, cacheMisses, memoryUsage] =
        await Promise.all([
          this.getResponseTimeStats(),
          redisClient.get(`${this.METRICS_PREFIX}errors:total`),
          redisClient.get(`${this.METRICS_PREFIX}cache:hits`),
          redisClient.get(`${this.METRICS_PREFIX}cache:misses`),
          redisClient.hgetall(`${this.METRICS_PREFIX}memory:node`),
        ]);

      const cacheHitRate = this.calculateCacheHitRate(
        parseInt(cacheHits || '0'),
        parseInt(cacheMisses || '0')
      );

      return {
        responseTime: responseTimeStats,
        errors: {
          total: parseInt(errorCount || '0'),
          rate: await this.getErrorRate(),
        },
        cache: {
          hits: parseInt(cacheHits || '0'),
          misses: parseInt(cacheMisses || '0'),
          hitRate: cacheHitRate,
        },
        memory: memoryUsage
          ? {
              rss: this.formatBytes(parseInt(memoryUsage.rss || '0')),
              heapUsed: this.formatBytes(parseInt(memoryUsage.heapUsed || '0')),
              heapTotal: this.formatBytes(parseInt(memoryUsage.heapTotal || '0')),
            }
          : null,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error getting metrics summary:', error);
      return null;
    }
  }

  /**
   * Get average response time for a route
   */
  static async getAverageResponseTime(route?: string): Promise<number> {
    if (!redisClient) return 0;

    try {
      const pattern = route
        ? `${this.METRICS_PREFIX}response_times:${route}`
        : `${this.METRICS_PREFIX}response_times:*`;

      const keys = route ? [pattern] : await redisClient.keys(pattern);

      if (keys.length === 0) return 0;

      let totalTime = 0;
      let count = 0;

      for (const key of keys) {
        const values = await redisClient.zrange(key, 0, -1);
        for (const value of values) {
          const duration = parseInt(value.split(':')[1]);
          totalTime += duration;
          count++;
        }
      }

      return count > 0 ? Math.round(totalTime / count) : 0;
    } catch (error) {
      console.error('Error getting average response time:', error);
      return 0;
    }
  }

  // Private helper methods

  private static async updateResponseTimeAggregates(
    route: string,
    duration: number
  ): Promise<void> {
    if (!redisClient) return;

    const key = `${this.METRICS_PREFIX}response_times:${route}:stats`;

    const stats = await redisClient.hgetall(key);
    const count = parseInt(stats?.count || '0') + 1;
    const total = parseInt(stats?.total || '0') + duration;
    const min = Math.min(duration, parseInt(stats?.min || String(duration)));
    const max = Math.max(duration, parseInt(stats?.max || '0'));

    await redisClient.hset(key, {
      count,
      total,
      min,
      max,
      avg: Math.round(total / count),
      last: duration,
      lastUpdate: Date.now(),
    });

    await redisClient.expire(key, this.WINDOW_SIZE);
  }

  private static async updateErrorRate(): Promise<void> {
    if (!redisClient) return;

    const key = `${this.METRICS_PREFIX}errors:rate`;
    const timestamp = Date.now();

    await redisClient.zadd(key, timestamp, timestamp);
    await redisClient.zremrangebyscore(key, '-inf', timestamp - 60000); // Keep last minute
    await redisClient.expire(key, 120);
  }

  private static async getErrorRate(): Promise<number> {
    if (!redisClient) return 0;

    const key = `${this.METRICS_PREFIX}errors:rate`;
    const count = await redisClient.zcard(key);
    return count; // Errors per minute
  }

  private static async recordSlowQuery(operation: string, duration: number): Promise<void> {
    if (!redisClient) return;

    const key = `${this.METRICS_PREFIX}slow_queries`;
    const entry = JSON.stringify({
      operation,
      duration,
      timestamp: Date.now(),
    });

    await redisClient.lpush(key, entry);
    await redisClient.ltrim(key, 0, 99); // Keep last 100
    await redisClient.expire(key, this.WINDOW_SIZE);
  }

  private static async getResponseTimeStats(): Promise<any> {
    if (!redisClient) return { avg: 0, min: 0, max: 0, count: 0 };

    const statsKey = `${this.METRICS_PREFIX}response_times:*:stats`;
    const keys = await redisClient.keys(statsKey);

    if (keys.length === 0) {
      return { avg: 0, min: 0, max: 0, count: 0 };
    }

    let totalAvg = 0;
    let minTime = Infinity;
    let maxTime = 0;
    let totalCount = 0;

    for (const key of keys) {
      const stats = await redisClient.hgetall(key);
      if (stats) {
        totalAvg += parseInt(stats.avg || '0') * parseInt(stats.count || '0');
        totalCount += parseInt(stats.count || '0');
        minTime = Math.min(minTime, parseInt(stats.min || String(Infinity)));
        maxTime = Math.max(maxTime, parseInt(stats.max || '0'));
      }
    }

    return {
      avg: totalCount > 0 ? Math.round(totalAvg / totalCount) : 0,
      min: minTime === Infinity ? 0 : minTime,
      max: maxTime,
      count: totalCount,
    };
  }

  private static calculateCacheHitRate(hits: number, misses: number): number {
    const total = hits + misses;
    return total > 0 ? Math.round((hits / total) * 100) : 0;
  }

  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  private static getCurrentHour(): string {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}`;
  }
}
