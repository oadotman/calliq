/**
 * Monitoring Metrics API
 * Provides real-time metrics data for monitoring dashboards
 */

import { NextRequest, NextResponse } from 'next/server';
import { Metrics } from '@/lib/monitoring/metrics';
import { AlertManager } from '@/lib/monitoring/alerts';
import redisClient from '@/lib/redis/client';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/monitoring/metrics
 * Returns current system metrics
 */
export async function GET(request: NextRequest) {
  try {
    // Check authorization (only admins should access metrics)
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'summary';
    const period = searchParams.get('period') || 'hour';

    let metrics;

    switch (type) {
      case 'summary':
        metrics = await getMetricsSummary();
        break;

      case 'detailed':
        metrics = await getDetailedMetrics(period);
        break;

      case 'realtime':
        metrics = await getRealtimeMetrics();
        break;

      case 'alerts':
        metrics = await getAlertsData();
        break;

      default:
        return NextResponse.json({ error: 'Invalid metrics type' }, { status: 400 });
    }

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Metrics API error:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}

/**
 * POST /api/monitoring/metrics
 * Record a metric
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    switch (type) {
      case 'response_time':
        await Metrics.recordResponseTime(data.route, data.duration);
        break;

      case 'error':
        await Metrics.recordError(data.route, data.errorType);
        break;

      case 'queue_depth':
        await Metrics.recordQueueDepth(data.queue, data.depth);
        break;

      case 'cache':
        await Metrics.recordCacheOperation(data.hit);
        break;

      case 'database_query':
        await Metrics.recordDatabaseQuery(data.operation, data.duration);
        break;

      default:
        return NextResponse.json({ error: 'Invalid metric type' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Metrics recording error:', error);
    return NextResponse.json({ error: 'Failed to record metric' }, { status: 500 });
  }
}

// Helper functions

async function getMetricsSummary() {
  const summary = await Metrics.getMetricsSummary();

  // Get active alerts
  const activeAlerts = await AlertManager.getActiveAlerts();

  // Get system info
  const systemInfo = getSystemInfo();

  return {
    ...summary,
    alerts: {
      active: activeAlerts.length,
      list: activeAlerts.slice(0, 5), // Last 5 alerts
    },
    system: systemInfo,
    timestamp: new Date().toISOString(),
  };
}

async function getDetailedMetrics(period: string) {
  const now = Date.now();
  const windowMs = period === 'day' ? 86400000 : period === 'hour' ? 3600000 : 300000; // 5 min default

  // If Redis is not available, return empty metrics
  if (!redisClient) {
    return {
      responseTimeDistribution: [],
      errorDistribution: {},
      queueMetrics: {},
      cacheMetrics: {
        hitRate: 0,
        misses: 0,
        hits: 0,
        totalRequests: 0,
      },
      sessionMetrics: {
        activeSessions: 0,
        totalSessions: 0,
      },
    };
  }

  // Get response time distribution
  const responseTimeKeys = await redisClient.keys('metrics:response_times:*:stats');
  const responseTimeData: any[] = [];

  for (const key of responseTimeKeys) {
    const stats = await redisClient.hgetall(key);
    const route = key.split(':')[2];
    if (stats) {
      responseTimeData.push({
        route,
        avg: parseInt(stats.avg || '0'),
        min: parseInt(stats.min || '0'),
        max: parseInt(stats.max || '0'),
        count: parseInt(stats.count || '0'),
        lastUpdate: parseInt(stats.lastUpdate || '0'),
      });
    }
  }

  // Get error distribution
  const errorKeys = await redisClient.keys(`metrics:errors:*:${getCurrentHour()}`);
  const errorData: any = {};

  for (const key of errorKeys) {
    const errors = await redisClient.hgetall(key);
    const route = key.split(':')[2];
    errorData[route] = errors;
  }

  // Get queue metrics
  const queues = ['transcription', 'extraction', 'email'];
  const queueData: any = {};

  for (const queue of queues) {
    const depth = await redisClient.get(`metrics:queue:${queue}`);
    const maxDepth = await redisClient.get(`metrics:queue:${queue}:max`);
    queueData[queue] = {
      current: parseInt(depth || '0'),
      max: parseInt(maxDepth || '0'),
    };
  }

  // Get slow queries
  const slowQueries = await redisClient.lrange('metrics:slow_queries', 0, 49);
  const parsedSlowQueries = slowQueries.map((q) => JSON.parse(q));

  return {
    period,
    window: {
      start: new Date(now - windowMs).toISOString(),
      end: new Date(now).toISOString(),
    },
    responseTime: responseTimeData,
    errors: errorData,
    queues: queueData,
    slowQueries: parsedSlowQueries.slice(0, 10),
    timestamp: new Date().toISOString(),
  };
}

async function getRealtimeMetrics() {
  // Get last minute metrics
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  // If Redis is not available, return empty metrics
  if (!redisClient) {
    return {
      responseTime: { p50: 0, p95: 0, p99: 0 },
      errorRate: 0,
      cacheHitRate: 0,
      redis: { connectedClients: 0, opsPerSec: 0 },
    };
  }

  // Get recent response times
  const recentResponseTimes: number[] = [];
  const responseTimeKeys = await redisClient.keys('metrics:response_times:*');

  for (const key of responseTimeKeys.slice(0, 5)) {
    // Sample 5 routes
    const recent = await redisClient.zrangebyscore(key, oneMinuteAgo, now, 'WITHSCORES');
    for (let i = 0; i < recent.length; i += 2) {
      const value = recent[i];
      const duration = parseInt(value.split(':')[1]);
      recentResponseTimes.push(duration);
    }
  }

  // Calculate percentiles
  recentResponseTimes.sort((a, b) => a - b);
  const p50 = recentResponseTimes[Math.floor(recentResponseTimes.length * 0.5)] || 0;
  const p95 = recentResponseTimes[Math.floor(recentResponseTimes.length * 0.95)] || 0;
  const p99 = recentResponseTimes[Math.floor(recentResponseTimes.length * 0.99)] || 0;

  // Get current rates
  const errorRate = await redisClient.zcard('metrics:errors:rate');
  const cacheHits = await redisClient.get('metrics:cache:hits');
  const cacheMisses = await redisClient.get('metrics:cache:misses');

  // Get Redis info
  const redisInfo = await redisClient.info('stats');
  const connectedClients = redisInfo.match(/connected_clients:(\d+)/)?.[1] || '0';
  const opsPerSec = redisInfo.match(/instantaneous_ops_per_sec:(\d+)/)?.[1] || '0';

  return {
    realtime: true,
    responseTime: {
      p50,
      p95,
      p99,
      samples: recentResponseTimes.length,
    },
    errorRate: {
      perMinute: errorRate,
    },
    cache: {
      hits: parseInt(cacheHits || '0'),
      misses: parseInt(cacheMisses || '0'),
      operations: parseInt(cacheHits || '0') + parseInt(cacheMisses || '0'),
    },
    redis: {
      connectedClients: parseInt(connectedClients),
      opsPerSec: parseInt(opsPerSec),
    },
    timestamp: new Date().toISOString(),
  };
}

async function getAlertsData() {
  const [activeAlerts, alertHistory] = await Promise.all([
    AlertManager.getActiveAlerts(),
    AlertManager.getAlertHistory(50),
  ]);

  // Group alerts by type and severity
  const alertStats = {
    byType: {} as Record<string, number>,
    bySeverity: {} as Record<string, number>,
    total: alertHistory.length,
    active: activeAlerts.length,
  };

  for (const alert of alertHistory) {
    alertStats.byType[alert.type] = (alertStats.byType[alert.type] || 0) + 1;
    alertStats.bySeverity[alert.severity] = (alertStats.bySeverity[alert.severity] || 0) + 1;
  }

  return {
    active: activeAlerts,
    history: alertHistory.slice(0, 20), // Last 20 alerts
    stats: alertStats,
    timestamp: new Date().toISOString(),
  };
}

function getSystemInfo() {
  const os = require('os');
  const memUsage = process.memoryUsage();

  return {
    platform: process.platform,
    nodeVersion: process.version,
    uptime: process.uptime(),
    memory: {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem(),
      node: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
      },
    },
    cpu: {
      cores: os.cpus().length,
      model: os.cpus()[0]?.model,
      speed: os.cpus()[0]?.speed,
    },
    load: os.loadavg(),
  };
}

function getCurrentHour(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}`;
}
