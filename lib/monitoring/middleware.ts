/**
 * Monitoring Middleware
 * Automatically tracks metrics for API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { Metrics } from './metrics';
import { ErrorTracker } from './error-tracker';

export interface MonitoredRouteOptions {
  trackResponseTime?: boolean;
  trackErrors?: boolean;
  trackCache?: boolean;
  routeName?: string;
}

/**
 * Wrap an API route handler with monitoring
 */
export function withMonitoring(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: MonitoredRouteOptions = {}
) {
  const {
    trackResponseTime = true,
    trackErrors = true,
    trackCache = false,
    routeName
  } = options;

  return async (req: NextRequest) => {
    const start = Date.now();
    const route = routeName || req.nextUrl.pathname;
    const method = req.method;

    try {
      // Execute the handler
      const response = await handler(req);

      // Track successful response time
      if (trackResponseTime) {
        const duration = Date.now() - start;
        await Metrics.recordResponseTime(route, duration).catch(console.error);
      }

      // Track cache hit/miss if applicable
      if (trackCache && response.headers.get('X-Cache-Status')) {
        const cacheHit = response.headers.get('X-Cache-Status') === 'HIT';
        await Metrics.recordCacheOperation(cacheHit).catch(console.error);
      }

      // Record memory usage periodically (1 in 100 requests)
      if (Math.random() < 0.01) {
        await Metrics.recordMemoryUsage().catch(console.error);
      }

      return response;

    } catch (error) {
      // Track the error
      if (trackErrors) {
        await ErrorTracker.trackApiError(
          route,
          method,
          error,
          500,
          {
            url: req.url,
            headers: Object.fromEntries(req.headers.entries())
          }
        ).catch(console.error);
      }

      // Track response time even for errors
      if (trackResponseTime) {
        const duration = Date.now() - start;
        await Metrics.recordResponseTime(route, duration).catch(console.error);
      }

      // Re-throw the error
      throw error;
    }
  };
}

/**
 * Monitoring middleware for database operations
 */
export function withDatabaseMonitoring<T extends (...args: any[]) => Promise<any>>(
  operation: string,
  fn: T
): T {
  return (async (...args: Parameters<T>) => {
    const start = Date.now();

    try {
      const result = await fn(...args);

      // Track successful query time
      const duration = Date.now() - start;
      await Metrics.recordDatabaseQuery(operation, duration).catch(console.error);

      return result;

    } catch (error) {
      // Track database error
      const duration = Date.now() - start;
      await Metrics.recordDatabaseQuery(operation, duration).catch(console.error);

      await ErrorTracker.trackDatabaseError(
        operation,
        error,
        typeof args[0] === 'string' ? args[0] : undefined
      ).catch(console.error);

      throw error;
    }
  }) as T;
}

/**
 * Monitoring wrapper for external service calls
 */
export function withExternalMonitoring<T extends (...args: any[]) => Promise<any>>(
  service: string,
  fn: T
): T {
  return (async (...args: Parameters<T>) => {
    const start = Date.now();

    try {
      const result = await fn(...args);

      // Track successful call time
      const duration = Date.now() - start;
      await Metrics.recordResponseTime(`external:${service}`, duration).catch(console.error);

      return result;

    } catch (error) {
      // Track external service error
      const duration = Date.now() - start;
      await Metrics.recordResponseTime(`external:${service}`, duration).catch(console.error);

      await ErrorTracker.trackExternalError(
        service,
        error,
        { duration }
      ).catch(console.error);

      throw error;
    }
  }) as T;
}

/**
 * Express-style middleware for tracking all requests
 */
export async function monitoringMiddleware(req: NextRequest): Promise<void> {
  const route = req.nextUrl.pathname;
  const method = req.method;

  // Skip monitoring for certain paths
  const skipPaths = [
    '/_next/',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
    '/api/health'
  ];

  if (skipPaths.some(path => route.startsWith(path))) {
    return;
  }

  // Track request
  const requestKey = `request:${route}:${method}`;

  try {
    // You could track active requests here
    // For example, increment a counter when request starts
    // and decrement when it ends
  } catch (error) {
    console.error('Monitoring middleware error:', error);
  }
}

/**
 * Helper to create monitored API route
 */
export function createMonitoredRoute(
  handler: (req: NextRequest) => Promise<NextResponse>,
  routeName?: string
) {
  return withMonitoring(handler, {
    trackResponseTime: true,
    trackErrors: true,
    trackCache: true,
    routeName
  });
}