/**
 * Cached Comprehensive Analytics API
 * Demonstrates integration of the caching service with API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cacheService, cacheKeys, cacheTags } from '@/lib/cache/cache-service';
import { withCache, cachePresets } from '@/lib/cache/cache-middleware';
import { profiler, timeOperation } from '@/lib/monitoring/profiler';
import { CircuitBreakerFactory } from '@/lib/resilience/circuit-breaker';
import { logger } from '@/lib/logger';

/**
 * GET /api/analytics/cached-comprehensive
 * Returns comprehensive analytics with intelligent caching
 */
export const GET = withCache({
  ttl: 300, // Cache for 5 minutes
  varyBy: ['authorization'], // Vary cache by user
  shouldCache: (req) => {
    // Only cache successful responses
    const searchParams = req.nextUrl.searchParams;
    const noCache = searchParams.get('nocache') === 'true';
    return !noCache;
  }
})(async (request: NextRequest) => {
  const profileId = profiler.startProfile('analytics-comprehensive');

  try {
    // Mark start of authentication
    profiler.mark(profileId, 'auth-start');

    // Authentication check
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    profiler.mark(profileId, 'auth-end');
    profiler.measure(profileId, 'authentication', 'auth-start', 'auth-end');

    // Get organization
    profiler.mark(profileId, 'org-fetch-start');
    const organization = await getOrganizationWithCache(user.id);
    profiler.mark(profileId, 'org-fetch-end');
    profiler.measure(profileId, 'organization-fetch', 'org-fetch-start', 'org-fetch-end');

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Fetch analytics data in parallel with caching
    profiler.mark(profileId, 'data-fetch-start');

    const [
      callMetrics,
      teamMetrics,
      usageMetrics,
      performanceMetrics
    ] = await Promise.all([
      getCallMetricsWithCache(organization.id),
      getTeamMetricsWithCache(organization.id),
      getUsageMetricsWithCache(organization.id),
      getPerformanceMetricsWithCache(organization.id)
    ]);

    profiler.mark(profileId, 'data-fetch-end');
    profiler.measure(profileId, 'data-fetching', 'data-fetch-start', 'data-fetch-end');

    // Compile response
    const response = {
      organization: {
        id: organization.id,
        name: organization.name,
        created_at: organization.created_at
      },
      metrics: {
        calls: callMetrics,
        team: teamMetrics,
        usage: usageMetrics,
        performance: performanceMetrics
      },
      cache: {
        cached_at: new Date().toISOString(),
        ttl: 300
      }
    };

    // End profiling
    const profile = await profiler.endProfile(profileId);

    // Add performance metadata to response
    if (profile) {
      (response.cache as any).performance = {
        duration_ms: Math.round(profile.duration || 0),
        marks: profile.marks.length,
        measures: profile.measures.length
      };
    }

    return NextResponse.json(response);

  } catch (error) {
    await profiler.endProfile(profileId);
    logger.error({ error, message: 'Analytics API error' });

    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
});

/**
 * Helper functions with caching
 */

async function getOrganizationWithCache(userId: string) {
  const cacheKey = cacheKeys.userOrganizations(userId);

  return cacheService.getOrSet(
    cacheKey,
    async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('owner_id', userId)
        .single();

      if (error) throw error;
      return data;
    },
    {
      ttl: 600, // 10 minutes
      tags: [cacheTags.user(userId)]
    }
  );
}

async function getCallMetricsWithCache(organizationId: string) {
  const cacheKey = `analytics:calls:${organizationId}`;

  return cacheService.getOrSet(
    cacheKey,
    async () => {
      // Use circuit breaker for database calls
      return CircuitBreakerFactory.executeWithRetry(
        'supabase-analytics',
        async () => {
          const supabase = createClient();

          // Get call statistics
          const { data: calls, error } = await supabase
            .from('calls')
            .select('status, duration, sentiment_score, created_at')
            .eq('organization_id', organizationId)
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

          if (error) throw error;

          // Calculate metrics
          const totalCalls = calls.length;
          const completedCalls = calls.filter(c => c.status === 'completed').length;
          const avgDuration = calls.reduce((sum, c) => sum + (c.duration || 0), 0) / totalCalls;
          const avgSentiment = calls.reduce((sum, c) => sum + (c.sentiment_score || 0), 0) / totalCalls;

          return {
            total: totalCalls,
            completed: completedCalls,
            processing: totalCalls - completedCalls,
            avgDuration: Math.round(avgDuration),
            avgSentiment: Math.round(avgSentiment * 100) / 100,
            last30Days: totalCalls
          };
        },
        {
          maxRetries: 2,
          initialDelay: 100
        }
      );
    },
    {
      ttl: 300,
      tags: [cacheTags.organization(organizationId)]
    }
  );
}

async function getTeamMetricsWithCache(organizationId: string) {
  const cacheKey = `analytics:team:${organizationId}`;

  return cacheService.getOrSet(
    cacheKey,
    async () => {
      const supabase = createClient();

      // Get team members
      const { data: members, error } = await supabase
        .from('organization_members')
        .select('user_id, role, created_at')
        .eq('organization_id', organizationId);

      if (error) throw error;

      return {
        totalMembers: members.length,
        admins: members.filter(m => m.role === 'admin').length,
        members: members.filter(m => m.role === 'member').length,
        recentlyAdded: members.filter(m =>
          new Date(m.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length
      };
    },
    {
      ttl: 600,
      tags: [cacheTags.organization(organizationId)]
    }
  );
}

async function getUsageMetricsWithCache(organizationId: string) {
  const cacheKey = cacheKeys.organizationUsage(organizationId);

  return cacheService.getOrSet(
    cacheKey,
    async () => {
      const supabase = createClient();

      // Get usage data
      const { data: usage, error } = await supabase
        .from('usage_metrics')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        return {
          minutes_used: 0,
          minutes_limit: 0,
          percentage: 0,
          status: 'unknown'
        };
      }

      const percentage = usage.minutes_limit > 0
        ? Math.round((usage.minutes_used / usage.minutes_limit) * 100)
        : 0;

      return {
        minutes_used: usage.minutes_used,
        minutes_limit: usage.minutes_limit,
        percentage,
        status: percentage > 90 ? 'critical' : percentage > 75 ? 'warning' : 'healthy'
      };
    },
    {
      ttl: 60, // 1 minute for usage data
      tags: [cacheTags.organization(organizationId)]
    }
  );
}

async function getPerformanceMetricsWithCache(organizationId: string) {
  const cacheKey = `analytics:performance:${organizationId}`;

  return timeOperation(
    'performance-metrics-fetch',
    async () => {
      return cacheService.getOrSet(
        cacheKey,
        async () => {
          // Get performance stats from profiler
          const [apiStats, dbStats, cacheStats] = await Promise.all([
            profiler.getStats('api-request'),
            profiler.getStats('database-query'),
            cacheService.getStats()
          ]);

          return {
            api: {
              avgResponseTime: apiStats?.avgDuration || 0,
              p95ResponseTime: apiStats?.p95 || 0,
              requestCount: apiStats?.count || 0
            },
            database: {
              avgQueryTime: dbStats?.avgDuration || 0,
              p95QueryTime: dbStats?.p95 || 0,
              queryCount: dbStats?.count || 0
            },
            cache: {
              hitRate: cacheStats.hitRate,
              hits: cacheStats.hits,
              misses: cacheStats.misses
            }
          };
        },
        {
          ttl: 300,
          tags: ['performance']
        }
      );
    },
    { organization: organizationId }
  );
}

/**
 * POST /api/analytics/cached-comprehensive/invalidate
 * Invalidate cache for an organization
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { organizationId } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID required' },
        { status: 400 }
      );
    }

    // Invalidate all caches for this organization
    await cacheService.invalidateTag(cacheTags.organization(organizationId));

    logger.info({ organizationId, userId: user.id }, 'Cache invalidated');

    return NextResponse.json({
      success: true,
      message: 'Cache invalidated successfully'
    });

  } catch (error) {
    logger.error({ error }, 'Cache invalidation error');
    return NextResponse.json(
      { error: 'Failed to invalidate cache' },
      { status: 500 }
    );
  }
}