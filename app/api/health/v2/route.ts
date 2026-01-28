/**
 * Enhanced Health Check Endpoint
 * Monitors all critical services including Redis
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import redisClient from '@/lib/redis/client';
import { cacheManager } from '@/lib/redis/cache-manager';

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  error?: string;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    database: HealthCheck;
    redis: HealthCheck;
    cache: HealthCheck;
    session: HealthCheck;
  };
  metrics?: {
    cacheStats?: any;
    memoryUsage?: any;
  };
}

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const supabase = createClient();

    // Simple query to check database connectivity
    const { error } = await supabase.from('organizations').select('id').limit(1).single();

    const responseTime = Date.now() - start;

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows" which is fine
      return {
        status: 'unhealthy',
        responseTime,
        error: error.message,
      };
    }

    return {
      status: responseTime > 1000 ? 'degraded' : 'healthy',
      responseTime,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkRedis(): Promise<HealthCheck> {
  const start = Date.now();

  // If Redis is not configured, return healthy (optional service)
  if (!redisClient) {
    return {
      status: 'healthy',
      responseTime: 0,
      error: 'Redis not configured (optional)',
    };
  }

  try {
    // Check Redis connectivity
    await redisClient.ping();
    const responseTime = Date.now() - start;

    // Check Redis status
    const status = redisClient.status;

    if (status !== 'ready') {
      return {
        status: 'unhealthy',
        responseTime,
        error: `Redis status: ${status}`,
      };
    }

    return {
      status: responseTime > 100 ? 'degraded' : 'healthy',
      responseTime,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkCache(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    // Test cache operations
    const testKey = 'health:check:test';
    const testValue = { test: true, timestamp: Date.now() };

    // Set a test value
    await cacheManager.set(testKey, testValue, 10);

    // Get the test value
    const retrieved = await cacheManager.get(testKey);

    // Clean up
    await cacheManager.delete(testKey);

    const responseTime = Date.now() - start;

    if (!retrieved) {
      return {
        status: 'unhealthy',
        responseTime,
        error: 'Cache read/write test failed',
      };
    }

    return {
      status: responseTime > 50 ? 'degraded' : 'healthy',
      responseTime,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkSession(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const { sessionStore } = await import('@/lib/session/redis-store');

    // Test session operations
    const testSessionId = 'health:check:session';
    const testData = {
      userId: 'health-check',
      test: true,
      timestamp: Date.now(),
    };

    // Test set and get
    await sessionStore.set(testSessionId, testData, 10);
    const retrieved = await sessionStore.get(testSessionId);
    await sessionStore.destroy(testSessionId);

    const responseTime = Date.now() - start;

    if (!retrieved) {
      return {
        status: 'unhealthy',
        responseTime,
        error: 'Session store test failed',
      };
    }

    return {
      status: responseTime > 50 ? 'degraded' : 'healthy',
      responseTime,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check if this is a simple health check (for load balancers)
    const simple = request.nextUrl.searchParams.get('simple') === 'true';

    if (simple) {
      // Quick check - just verify Redis connectivity (if available)
      try {
        if (redisClient) {
          await redisClient.ping();
        }
        return new NextResponse('OK', { status: 200 });
      } catch {
        return new NextResponse('Service Unavailable', { status: 503 });
      }
    }

    // Full health check
    const [database, redis, cache, session] = await Promise.allSettled([
      checkDatabase(),
      checkRedis(),
      checkCache(),
      checkSession(),
    ]);

    const services = {
      database:
        database.status === 'fulfilled'
          ? database.value
          : {
              status: 'unhealthy' as const,
              error: 'Check failed',
            },
      redis:
        redis.status === 'fulfilled'
          ? redis.value
          : {
              status: 'unhealthy' as const,
              error: 'Check failed',
            },
      cache:
        cache.status === 'fulfilled'
          ? cache.value
          : {
              status: 'unhealthy' as const,
              error: 'Check failed',
            },
      session:
        session.status === 'fulfilled'
          ? session.value
          : {
              status: 'unhealthy' as const,
              error: 'Check failed',
            },
    };

    // Determine overall status
    const statuses = Object.values(services).map((s) => s.status);
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';

    if (statuses.every((s) => s === 'healthy')) {
      overallStatus = 'healthy';
    } else if (statuses.some((s) => s === 'unhealthy')) {
      overallStatus = 'unhealthy';
    } else {
      overallStatus = 'degraded';
    }

    // Get additional metrics if requested
    let metrics = undefined;
    if (request.nextUrl.searchParams.get('metrics') === 'true') {
      try {
        const cacheStats = await cacheManager.getStats();
        const memoryUsage = process.memoryUsage();

        metrics = {
          cacheStats,
          memoryUsage: {
            rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
            external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
          },
        };
      } catch (error) {
        console.error('Error getting metrics:', error);
      }
    }

    const response: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services,
      ...(metrics && { metrics }),
    };

    return NextResponse.json(response, {
      status: overallStatus === 'healthy' ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Status': overallStatus,
      },
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      },
      { status: 503 }
    );
  }
}
