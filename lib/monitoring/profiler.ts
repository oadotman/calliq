/**
 * Performance Profiler
 * Advanced performance monitoring and profiling for the application
 */

import { logger } from '@/lib/logger';
import redisClient from '@/lib/redis/client';

export interface PerformanceMark {
  name: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface PerformanceMeasure {
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  metadata?: Record<string, any>;
}

export interface PerformanceProfile {
  id: string;
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  marks: PerformanceMark[];
  measures: PerformanceMeasure[];
  metadata: Record<string, any>;
  resourceTimings?: ResourceTiming[];
}

interface ResourceTiming {
  name: string;
  type: string;
  duration: number;
  size?: number;
}

/**
 * Performance Profiler Class
 */
export class PerformanceProfiler {
  private profiles: Map<string, PerformanceProfile> = new Map();
  private globalMarks: Map<string, number> = new Map();

  /**
   * Start a new performance profile
   */
  startProfile(operation: string, metadata: Record<string, any> = {}): string {
    const id = `${operation}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const profile: PerformanceProfile = {
      id,
      operation,
      startTime: performance.now(),
      marks: [],
      measures: [],
      metadata,
    };

    this.profiles.set(id, profile);

    logger.debug({ id, operation }, 'Performance profile started');

    return id;
  }

  /**
   * End a performance profile
   */
  async endProfile(profileId: string): Promise<PerformanceProfile | null> {
    const profile = this.profiles.get(profileId);

    if (!profile) {
      logger.warn({ profileId }, 'Profile not found');
      return null;
    }

    profile.endTime = performance.now();
    profile.duration = profile.endTime - profile.startTime;

    // Get resource timings if available (browser only)
    if (typeof window !== 'undefined' && window.performance) {
      profile.resourceTimings = this.getResourceTimings();
    }

    // Store profile data
    await this.storeProfile(profile);

    // Clean up
    this.profiles.delete(profileId);

    logger.debug(
      {
        id: profileId,
        duration: profile.duration,
        operation: profile.operation,
      },
      'Performance profile completed'
    );

    return profile;
  }

  /**
   * Add a mark to the current profile
   */
  mark(profileId: string, markName: string, metadata?: Record<string, any>): void {
    const profile = this.profiles.get(profileId);

    if (!profile) {
      logger.warn({ profileId, markName }, 'Profile not found for mark');
      return;
    }

    const mark: PerformanceMark = {
      name: markName,
      timestamp: performance.now(),
      metadata,
    };

    profile.marks.push(mark);
    this.globalMarks.set(`${profileId}-${markName}`, mark.timestamp);
  }

  /**
   * Measure between two marks
   */
  measure(profileId: string, measureName: string, startMark: string, endMark?: string): void {
    const profile = this.profiles.get(profileId);

    if (!profile) {
      logger.warn({ profileId, measureName }, 'Profile not found for measure');
      return;
    }

    const startKey = `${profileId}-${startMark}`;
    const startTime = this.globalMarks.get(startKey);

    if (!startTime) {
      logger.warn({ startMark }, 'Start mark not found');
      return;
    }

    const endTime = endMark ? this.globalMarks.get(`${profileId}-${endMark}`) : performance.now();

    if (!endTime) {
      logger.warn({ endMark }, 'End mark not found');
      return;
    }

    const measure: PerformanceMeasure = {
      name: measureName,
      startTime,
      endTime,
      duration: endTime - startTime,
    };

    profile.measures.push(measure);
  }

  /**
   * Get resource timings (browser only)
   */
  private getResourceTimings(): ResourceTiming[] {
    if (typeof window === 'undefined' || !window.performance) {
      return [];
    }

    const entries = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];

    return entries.slice(-50).map((entry) => ({
      name: entry.name,
      type: entry.initiatorType,
      duration: entry.duration,
      size: entry.transferSize,
    }));
  }

  /**
   * Store profile data in Redis
   */
  private async storeProfile(profile: PerformanceProfile): Promise<void> {
    try {
      const key = `performance:${profile.operation}:${profile.id}`;
      await redisClient!.setex(key, 3600, JSON.stringify(profile)); // 1 hour TTL

      // Update aggregated metrics
      await this.updateAggregatedMetrics(profile);
    } catch (error) {
      logger.error({ error }, 'Failed to store performance profile');
    }
  }

  /**
   * Update aggregated performance metrics
   */
  private async updateAggregatedMetrics(profile: PerformanceProfile): Promise<void> {
    try {
      const metricsKey = `metrics:performance:${profile.operation}`;

      // Update operation count
      await redisClient!.hincrby(metricsKey, 'count', 1);

      // Update total duration
      await redisClient!.hincrbyfloat(metricsKey, 'totalDuration', profile.duration || 0);

      // Update min/max duration
      const currentMin = await redisClient!.hget(metricsKey, 'minDuration');
      const currentMax = await redisClient!.hget(metricsKey, 'maxDuration');

      if (!currentMin || profile.duration! < parseFloat(currentMin)) {
        await redisClient!.hset(metricsKey, 'minDuration', profile.duration!.toString());
      }

      if (!currentMax || profile.duration! > parseFloat(currentMax)) {
        await redisClient!.hset(metricsKey, 'maxDuration', profile.duration!.toString());
      }

      // Store slow operations
      if (profile.duration! > 1000) {
        // Operations slower than 1 second
        const slowKey = `metrics:slow:${profile.operation}`;
        await redisClient!.zadd(
          slowKey,
          profile.duration!,
          JSON.stringify({
            id: profile.id,
            duration: profile.duration,
            timestamp: new Date().toISOString(),
            metadata: profile.metadata,
          })
        );

        // Keep only top 100 slow operations
        await redisClient!.zremrangebyrank(slowKey, 0, -101);
      }
    } catch (error) {
      logger.error({ error }, 'Failed to update aggregated metrics');
    }
  }

  /**
   * Get performance statistics for an operation
   */
  async getStats(operation: string): Promise<{
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    p50: number;
    p95: number;
    p99: number;
  } | null> {
    try {
      const metricsKey = `metrics:performance:${operation}`;
      const data = await redisClient!.hgetall(metricsKey);

      if (!data || !data.count) {
        return null;
      }

      const count = parseInt(data.count);
      const totalDuration = parseFloat(data.totalDuration || '0');

      // Get percentiles from recent operations
      const recentKey = `performance:recent:${operation}`;
      const recentOps = await redisClient!.zrange(recentKey, 0, -1, 'WITHSCORES');

      const durations: number[] = [];
      for (let i = 1; i < recentOps.length; i += 2) {
        durations.push(parseFloat(recentOps[i]));
      }

      durations.sort((a, b) => a - b);

      const p50 = durations[Math.floor(durations.length * 0.5)] || 0;
      const p95 = durations[Math.floor(durations.length * 0.95)] || 0;
      const p99 = durations[Math.floor(durations.length * 0.99)] || 0;

      return {
        count,
        avgDuration: totalDuration / count,
        minDuration: parseFloat(data.minDuration || '0'),
        maxDuration: parseFloat(data.maxDuration || '0'),
        p50,
        p95,
        p99,
      };
    } catch (error) {
      logger.error({ error, operation }, 'Failed to get performance stats');
      return null;
    }
  }
}

// Export singleton instance
export const profiler = new PerformanceProfiler();

/**
 * Performance decorator for automatic profiling
 */
export function profile(operationName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const name = operationName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const profileId = profiler.startProfile(name, {
        className: target.constructor.name,
        methodName: propertyKey,
        args: args.length,
      });

      try {
        const result = await originalMethod.apply(this, args);
        await profiler.endProfile(profileId);
        return result;
      } catch (error) {
        await profiler.endProfile(profileId);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Utility function for timing async operations
 */
export async function timeOperation<T>(
  operationName: string,
  operation: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const profileId = profiler.startProfile(operationName, metadata);

  try {
    profiler.mark(profileId, 'start');
    const result = await operation();
    profiler.mark(profileId, 'end');
    profiler.measure(profileId, 'total', 'start', 'end');
    await profiler.endProfile(profileId);
    return result;
  } catch (error) {
    await profiler.endProfile(profileId);
    throw error;
  }
}

/**
 * Browser Performance Observer
 */
export class BrowserPerformanceObserver {
  private observer: PerformanceObserver | null = null;

  start() {
    if (typeof window === 'undefined' || !window.PerformanceObserver) {
      return;
    }

    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.processEntry(entry);
      }
    });

    // Observe different performance entry types
    try {
      this.observer.observe({
        entryTypes: [
          'navigation',
          'resource',
          'paint',
          'largest-contentful-paint',
          'first-input',
          'layout-shift',
        ],
      });
    } catch (e) {
      // Some entry types might not be supported
      this.observer.observe({ entryTypes: ['navigation', 'resource'] });
    }
  }

  stop() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  private processEntry(entry: PerformanceEntry) {
    // Log performance entries for analysis
    const data = {
      name: entry.name,
      type: entry.entryType,
      startTime: entry.startTime,
      duration: entry.duration,
    };

    // Send to analytics or monitoring service
    logger.debug(data, 'Performance entry');
  }
}

/**
 * Server-side performance monitoring
 */
export class ServerPerformanceMonitor {
  private interval: NodeJS.Timeout | null = null;

  start(intervalMs: number = 60000) {
    // Default 1 minute
    this.interval = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private async collectMetrics() {
    const metrics = {
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      uptime: process.uptime(),
    };

    // Store metrics
    try {
      await redisClient!.zadd('metrics:server:performance', Date.now(), JSON.stringify(metrics));

      // Keep only last 24 hours
      const dayAgo = Date.now() - 86400000;
      await redisClient!.zremrangebyscore('metrics:server:performance', '-inf', dayAgo);
    } catch (error) {
      logger.error({ error }, 'Failed to collect server metrics');
    }
  }
}
