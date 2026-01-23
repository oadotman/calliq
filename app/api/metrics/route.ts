/**
 * Metrics API Endpoint
 * Provides application metrics and performance data
 */

import { NextRequest, NextResponse } from 'next/server';
import { Metrics } from '@/lib/monitoring/metrics';
import { businessMetrics } from '@/lib/monitoring/business-metrics';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Check authorization - only admin users or API keys can access metrics
    const apiKey = req.headers.get('x-api-key');
    const supabase = createServerClient();

    if (!apiKey || apiKey !== process.env.METRICS_API_KEY) {
      // Check if user is admin
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      // Check user role
      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('role, organization:organizations(plan_type)')
        .eq('user_id', user.id)
        .single();

      if (!userOrg || userOrg.role !== 'owner') {
        return NextResponse.json(
          { error: 'Forbidden - Admin access required' },
          { status: 403 }
        );
      }
    }

    // Get metric type from query params
    const metricType = req.nextUrl.searchParams.get('type') || 'summary';
    const period = req.nextUrl.searchParams.get('period') || 'daily';

    let metricsData: any;

    switch (metricType) {
      case 'performance':
        metricsData = await getPerformanceMetrics();
        break;

      case 'business':
        metricsData = await getBusinessMetrics(period as 'daily' | 'weekly' | 'monthly');
        break;

      case 'redis':
        metricsData = await Metrics.getMetricsSummary();
        break;

      case 'detailed':
        metricsData = await getDetailedMetrics();
        break;

      case 'summary':
      default:
        metricsData = await getSummaryMetrics();
        break;
    }

    return NextResponse.json(
      {
        type: metricType,
        period,
        timestamp: new Date().toISOString(),
        data: metricsData
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=60' // Cache for 1 minute
        }
      }
    );

  } catch (error) {
    console.error('Metrics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function getSummaryMetrics() {
  const [redis, business, performance] = await Promise.all([
    Metrics.getMetricsSummary(),
    businessMetrics.getDailyMetrics(),
    businessMetrics.getPerformanceMetrics()
  ]);

  return {
    redis,
    business,
    performance,
    system: getSystemMetrics()
  };
}

async function getPerformanceMetrics() {
  const [avgResponseTime, performanceData] = await Promise.all([
    Metrics.getAverageResponseTime(),
    businessMetrics.getPerformanceMetrics()
  ]);

  return {
    ...performanceData,
    averageResponseTime: avgResponseTime, // Override with our calculated value
    system: getSystemMetrics()
  };
}

async function getBusinessMetrics(period: 'daily' | 'weekly' | 'monthly') {
  const report = await businessMetrics.generateMetricsReport(period);
  return report;
}

async function getDetailedMetrics() {
  const now = new Date();
  const [
    daily,
    monthly,
    performance,
    redis
  ] = await Promise.all([
    businessMetrics.getDailyMetrics(now),
    businessMetrics.getMonthlyMetrics(now.getFullYear(), now.getMonth() + 1),
    businessMetrics.getPerformanceMetrics(),
    Metrics.getMetricsSummary()
  ]);

  const supabase = createServerClient();

  // Get additional database metrics
  const { data: callsToday } = await supabase
    .from('calls')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', new Date(now.setHours(0, 0, 0, 0)).toISOString());

  const { data: activeOrgs } = await supabase
    .from('organizations')
    .select('*', { count: 'exact', head: true })
    .in('subscription_status', ['active', 'trialing']);

  return {
    summary: {
      calls_today: callsToday || 0,
      active_organizations: activeOrgs || 0,
      ...daily
    },
    monthly,
    performance,
    redis,
    system: getSystemMetrics()
  };
}

function getSystemMetrics() {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  return {
    memory: {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
      unit: 'MB'
    },
    cpu: {
      user: Math.round(cpuUsage.user / 1000000), // Convert to seconds
      system: Math.round(cpuUsage.system / 1000000),
      unit: 'seconds'
    },
    process: {
      uptime: Math.round(process.uptime()),
      pid: process.pid,
      version: process.version,
      platform: process.platform,
      arch: process.arch
    }
  };
}

// Prometheus-style metrics endpoint
export async function POST(req: NextRequest) {
  try {
    // Verify API key
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey || apiKey !== process.env.METRICS_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Record custom metric
    const body = await req.json();
    const { metric, value, tags } = body;

    if (!metric || typeof value !== 'number') {
      return NextResponse.json(
        { error: 'Invalid metric data' },
        { status: 400 }
      );
    }

    // Record the metric
    await Metrics.recordResponseTime(metric, value);

    return NextResponse.json(
      { success: true, recorded: { metric, value, tags } },
      { status: 200 }
    );

  } catch (error) {
    console.error('Metrics recording error:', error);
    return NextResponse.json(
      { error: 'Failed to record metric' },
      { status: 500 }
    );
  }
}