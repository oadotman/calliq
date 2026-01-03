/**
 * Cached Dashboard API Route
 * Demonstrates using Redis cache for frequently accessed data
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cacheManager, CacheKeys } from '@/lib/redis/cache-manager';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's organization
    const { data: userOrg, error: orgError } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (orgError || !userOrg) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const organizationId = userOrg.organization_id;

    // Use cache for dashboard stats
    const stats = await cacheManager.getOrSet(
      CacheKeys.dashboardStats(organizationId),
      async () => {
        // Fetch all dashboard data in parallel
        const [
          callsResult,
          usageResult,
          membersResult,
          recentResult
        ] = await Promise.all([
          // Total calls count
          supabase
            .from('calls')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', organizationId),

          // Current month usage
          supabase
            .from('usage_metrics')
            .select('transcription_minutes, extraction_count')
            .eq('organization_id', organizationId)
            .gte('period_start', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
            .single(),

          // Team members count
          supabase
            .from('user_organizations')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', organizationId),

          // Recent calls
          supabase
            .from('calls')
            .select('id, name, status, call_date, duration')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false })
            .limit(5)
        ]);

        return {
          totalCalls: callsResult.count || 0,
          monthlyUsage: {
            transcriptionMinutes: usageResult.data?.transcription_minutes || 0,
            extractionCount: usageResult.data?.extraction_count || 0,
          },
          teamMembers: membersResult.count || 0,
          recentCalls: recentResult.data || [],
          cachedAt: new Date().toISOString()
        };
      },
      300 // Cache for 5 minutes
    );

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Invalidate dashboard cache when data changes
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!userOrg) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Invalidate dashboard cache
    await cacheManager.delete(CacheKeys.dashboardStats(userOrg.organization_id));

    return NextResponse.json({
      success: true,
      message: 'Dashboard cache cleared'
    });

  } catch (error) {
    console.error('Cache invalidation error:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}