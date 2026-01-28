/**
 * Error Tracking System
 * Captures and monitors application errors for reliability monitoring
 */

import { Metrics } from './metrics';
import redisClient from '@/lib/redis/client';

export interface ErrorInfo {
  message: string;
  stack?: string;
  type: string;
  route?: string;
  userId?: string;
  organizationId?: string;
  timestamp: Date;
  context?: Record<string, any>;
}

export class ErrorTracker {
  private static readonly ERROR_PREFIX = 'errors:';
  private static readonly MAX_ERROR_LENGTH = 1000;
  private static readonly ERROR_TTL = 86400; // 24 hours

  /**
   * Track an error
   */
  static async trackError(
    error: Error | unknown,
    context?: {
      route?: string;
      userId?: string;
      organizationId?: string;
      [key: string]: any;
    }
  ): Promise<void> {
    try {
      const errorInfo = this.parseError(error, context);

      // Record in metrics
      if (errorInfo.route) {
        await Metrics.recordError(errorInfo.route, errorInfo.type);
      } else {
        await Metrics.recordError('unknown', errorInfo.type);
      }

      // Store detailed error for debugging
      await this.storeError(errorInfo);

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Tracked error:', errorInfo);
      }
    } catch (trackingError) {
      // Don't let error tracking errors break the app
      console.error('Error tracking failed:', trackingError);
    }
  }

  /**
   * Track API route error
   */
  static async trackApiError(
    route: string,
    method: string,
    error: Error | unknown,
    statusCode: number,
    context?: Record<string, any>
  ): Promise<void> {
    const errorContext = {
      ...context,
      route,
      method,
      statusCode,
      api: true,
    };

    await this.trackError(error, errorContext);

    // Track status codes
    await this.trackStatusCode(route, statusCode);
  }

  /**
   * Track database error
   */
  static async trackDatabaseError(
    operation: string,
    error: Error | unknown,
    query?: string
  ): Promise<void> {
    const errorContext = {
      database: true,
      operation,
      query: query ? query.substring(0, 200) : undefined, // Truncate long queries
    };

    await this.trackError(error, errorContext);
  }

  /**
   * Track external service error
   */
  static async trackExternalError(
    service: string,
    error: Error | unknown,
    context?: Record<string, any>
  ): Promise<void> {
    const errorContext = {
      ...context,
      external: true,
      service,
    };

    await this.trackError(error, errorContext);
  }

  /**
   * Get error statistics
   */
  static async getErrorStats(hours: number = 24): Promise<any> {
    try {
      const now = Date.now();
      const startTime = now - hours * 3600000;

      // Get error counts by type
      const errorTypes: Record<string, number> = {};
      const errorRoutes: Record<string, number> = {};
      const statusCodes: Record<string, number> = {};

      // Get recent errors
      const recentErrors = await this.getRecentErrors(100);

      for (const error of recentErrors) {
        if (error.timestamp.getTime() >= startTime) {
          // Count by type
          errorTypes[error.type] = (errorTypes[error.type] || 0) + 1;

          // Count by route
          if (error.route) {
            errorRoutes[error.route] = (errorRoutes[error.route] || 0) + 1;
          }

          // Count status codes
          if (error.context?.statusCode) {
            const code = String(error.context.statusCode);
            statusCodes[code] = (statusCodes[code] || 0) + 1;
          }
        }
      }

      // Get top errors
      const topErrors = Object.entries(errorTypes)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([type, count]) => ({ type, count }));

      const topRoutes = Object.entries(errorRoutes)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([route, count]) => ({ route, count }));

      return {
        period: `${hours} hours`,
        total: recentErrors.filter((e) => e.timestamp.getTime() >= startTime).length,
        byType: topErrors,
        byRoute: topRoutes,
        statusCodes,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to get error stats:', error);
      return null;
    }
  }

  /**
   * Get recent errors
   */
  static async getRecentErrors(limit: number = 50): Promise<ErrorInfo[]> {
    if (!redisClient) return [];

    try {
      const key = `${this.ERROR_PREFIX}recent`;
      const errors = await redisClient.lrange(key, 0, limit - 1);

      return errors.map((e) => {
        const parsed = JSON.parse(e);
        return {
          ...parsed,
          timestamp: new Date(parsed.timestamp),
        };
      });
    } catch (error) {
      console.error('Failed to get recent errors:', error);
      return [];
    }
  }

  /**
   * Clear old errors
   */
  static async clearOldErrors(): Promise<number> {
    if (!redisClient) return 0;

    try {
      const key = `${this.ERROR_PREFIX}recent`;
      const errors = await redisClient.lrange(key, 0, -1);

      const now = Date.now();
      const oneDayAgo = now - 86400000;

      let kept = 0;
      const newList: string[] = [];

      for (const error of errors) {
        const parsed = JSON.parse(error);
        if (new Date(parsed.timestamp).getTime() > oneDayAgo) {
          newList.push(error);
          kept++;
        }
      }

      // Replace the list with filtered errors
      if (newList.length < errors.length) {
        await redisClient.del(key);
        if (newList.length > 0) {
          await redisClient.rpush(key, ...newList);
        }
      }

      return errors.length - kept;
    } catch (error) {
      console.error('Failed to clear old errors:', error);
      return 0;
    }
  }

  // Private helper methods

  private static parseError(error: Error | unknown, context?: Record<string, any>): ErrorInfo {
    let errorInfo: ErrorInfo;

    if (error instanceof Error) {
      errorInfo = {
        message: error.message.substring(0, this.MAX_ERROR_LENGTH),
        stack: error.stack?.substring(0, this.MAX_ERROR_LENGTH * 2),
        type: error.name || 'Error',
        timestamp: new Date(),
        ...context,
      };
    } else if (typeof error === 'string') {
      errorInfo = {
        message: error.substring(0, this.MAX_ERROR_LENGTH),
        type: 'StringError',
        timestamp: new Date(),
        ...context,
      };
    } else {
      errorInfo = {
        message: JSON.stringify(error).substring(0, this.MAX_ERROR_LENGTH),
        type: 'UnknownError',
        timestamp: new Date(),
        ...context,
      };
    }

    // Clean sensitive data
    errorInfo = this.sanitizeError(errorInfo);

    return errorInfo;
  }

  private static async storeError(errorInfo: ErrorInfo): Promise<void> {
    if (!redisClient) return;

    const key = `${this.ERROR_PREFIX}recent`;
    const errorString = JSON.stringify(errorInfo);

    // Add to list
    await redisClient.lpush(key, errorString);

    // Keep only last 1000 errors
    await redisClient.ltrim(key, 0, 999);

    // Set TTL
    await redisClient.expire(key, this.ERROR_TTL);

    // Store by type for quick lookup
    const typeKey = `${this.ERROR_PREFIX}type:${errorInfo.type}`;
    await redisClient.lpush(typeKey, errorString);
    await redisClient.ltrim(typeKey, 0, 99);
    await redisClient.expire(typeKey, 3600); // 1 hour

    // Store by route if available
    if (errorInfo.route) {
      const routeKey = `${this.ERROR_PREFIX}route:${errorInfo.route.replace(/\//g, ':')}`;
      await redisClient.lpush(routeKey, errorString);
      await redisClient.ltrim(routeKey, 0, 49);
      await redisClient.expire(routeKey, 3600);
    }
  }

  private static async trackStatusCode(route: string, statusCode: number): Promise<void> {
    if (!redisClient) return;

    const key = `${this.ERROR_PREFIX}status:${statusCode}`;
    await redisClient.hincrby(key, route, 1);
    await redisClient.expire(key, 3600);

    // Track 5xx errors specially
    if (statusCode >= 500) {
      const serverErrorKey = `${this.ERROR_PREFIX}5xx:${this.getCurrentHour()}`;
      await redisClient.hincrby(serverErrorKey, route, 1);
      await redisClient.expire(serverErrorKey, 3600);
    }

    // Track 4xx errors
    if (statusCode >= 400 && statusCode < 500) {
      const clientErrorKey = `${this.ERROR_PREFIX}4xx:${this.getCurrentHour()}`;
      await redisClient.hincrby(clientErrorKey, route, 1);
      await redisClient.expire(clientErrorKey, 3600);
    }
  }

  private static sanitizeError(errorInfo: ErrorInfo): ErrorInfo {
    // Remove sensitive patterns
    const sensitivePatterns = [
      /password['":\s]*['"]\w+['"]/gi,
      /token['":\s]*['"]\w+['"]/gi,
      /api[_-]?key['":\s]*['"]\w+['"]/gi,
      /secret['":\s]*['"]\w+['"]/gi,
      /Bearer\s+[\w-]+/gi,
    ];

    const sanitized = { ...errorInfo };

    if (sanitized.message) {
      for (const pattern of sensitivePatterns) {
        sanitized.message = sanitized.message.replace(pattern, '[REDACTED]');
      }
    }

    if (sanitized.stack) {
      for (const pattern of sensitivePatterns) {
        sanitized.stack = sanitized.stack.replace(pattern, '[REDACTED]');
      }
    }

    if (sanitized.context?.query) {
      for (const pattern of sensitivePatterns) {
        sanitized.context.query = sanitized.context.query.replace(pattern, '[REDACTED]');
      }
    }

    return sanitized;
  }

  private static getCurrentHour(): string {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}`;
  }
}
