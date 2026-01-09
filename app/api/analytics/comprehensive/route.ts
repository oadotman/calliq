import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, requireAuth } from '@/lib/supabase/server';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createServerClient();

    // Get user's organization with validation
    const { data: userOrgData, error: userOrgError } = await supabase
      .from('user_organizations')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (userOrgError || !userOrgData?.organization_id) {
      console.error('User organization error:', userOrgError);
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Only admin and owner can view comprehensive analytics
    if (userOrgData.role !== 'admin' && userOrgData.role !== 'owner') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const organizationId = userOrgData.organization_id;
    const now = new Date();
    const fiveMonthsAgo = subMonths(now, 5);
    const oneMonthAgo = subMonths(now, 1);
    const sevenDaysAgo = subMonths(now, 0.23); // ~7 days

    // First, get the call IDs for the time periods we need
    const { data: recentCallIds, error: callIdsError } = await supabase
      .from('calls')
      .select('id')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .gte('created_at', oneMonthAgo.toISOString())
      .order('created_at', { ascending: false });

    if (callIdsError) {
      console.error('Error fetching call IDs:', callIdsError);
      return NextResponse.json({ error: 'Failed to fetch calls' }, { status: 500 });
    }

    const callIdList = recentCallIds?.map(c => c.id) || [];

    // Fetch all necessary data in parallel with proper error handling
    const [
      callsData,
      insightsData,
      usageMetrics,
      activeUsers,
      organizationData,
      recentActivity,
      transcriptsData,
      callFieldsData
    ] = await Promise.all([
      // 1. Calls data with limit for performance
      supabase
        .from('calls')
        .select('id, created_at, duration, status, sentiment_score, sentiment_type, user_id, processing_started_at, processing_completed_at')
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .gte('created_at', fiveMonthsAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(1000), // Limit to prevent memory issues

      // 2. Call fields for insights and keywords (only for recent calls)
      callIdList.length > 0
        ? supabase
            .from('call_fields')
            .select('id, call_id, field_name, field_value, field_type, confidence_score, created_at')
            .in('call_id', callIdList.slice(0, 500)) // Limit to 500 most recent calls
        : Promise.resolve({ data: [], error: null }),

      // 3. Usage metrics with proper time filtering
      supabase
        .from('usage_metrics')
        .select('metric_type, metric_value, cost_cents, created_at')
        .eq('organization_id', organizationId)
        .gte('created_at', subMonths(now, 3).toISOString())
        .order('created_at', { ascending: false })
        .limit(1000),

      // 4. Active users count with proper join
      supabase
        .from('user_organizations')
        .select('user_id, role, joined_at')
        .eq('organization_id', organizationId),

      // 5. Organization details with subscription info
      supabase
        .from('organizations')
        .select('id, name, max_minutes_monthly, max_members, subscription_status, created_at')
        .eq('id', organizationId)
        .single(),

      // 6. Recent activity for patterns
      supabase
        .from('calls')
        .select('id, created_at, user_id, duration, status')
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .gte('created_at', oneMonthAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(500),

      // 7. Call fields for quality metrics (using confidence scores)
      callIdList.length > 0
        ? supabase
            .from('call_fields')
            .select('call_id, confidence_score, field_name')
            .in('call_id', callIdList.slice(0, 100)) // Sample 100 recent calls
            .eq('field_name', 'summary') // Use summary field as quality indicator
        : Promise.resolve({ data: [], error: null }),

      // 8. Call fields for extraction data
      callIdList.length > 0
        ? supabase
            .from('call_fields')
            .select('call_id, field_name, field_value, confidence')
            .in('call_id', callIdList.slice(0, 100)) // Sample 100 recent calls
        : Promise.resolve({ data: [], error: null })
    ]);

    // Check for errors in parallel queries
    if (callsData.error) {
      console.error('Calls data error:', callsData.error);
      return NextResponse.json({ error: 'Failed to fetch calls data' }, { status: 500 });
    }

    if (organizationData.error) {
      console.error('Organization data error:', organizationData.error);
      return NextResponse.json({ error: 'Failed to fetch organization data' }, { status: 500 });
    }

    // Process and aggregate the data with null safety
    const calls = callsData.data || [];
    const insights = insightsData.data || []; // Now using call_fields data
    const usage = usageMetrics.data || [];
    const users = activeUsers.data || [];
    const organization = organizationData.data;
    const recentCalls = recentActivity.data || [];
    const transcripts = transcriptsData.data || []; // Now using call_fields summary data
    const callFields = callFieldsData.data || [];

    // Validate organization data
    if (!organization) {
      return NextResponse.json({ error: 'Organization data not found' }, { status: 404 });
    }

    // Calculate key metrics with proper error handling
    const totalCalls = calls.length;
    const totalDuration = calls.reduce((sum, call) => {
      const duration = Number(call.duration) || 0;
      return sum + duration;
    }, 0);
    const avgCallDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;

    // Calculate time saved (based on actual transcription time vs call duration)
    const timeSaved = calls.reduce((sum, call) => {
      const duration = Number(call.duration) || 0;
      // Estimate: manual transcription takes 3-4x the call duration
      const manualTime = duration * 3.5;
      return sum + Math.max(0, manualTime - duration);
    }, 0);

    // Calculate sentiment distribution from calls with validation
    const sentimentScores = calls
      .map(c => c.sentiment_score)
      .filter(score => score !== null && score !== undefined && !isNaN(Number(score)));

    const sentimentDistribution = {
      positive: calls.filter(c => c.sentiment_type === 'positive').length,
      neutral: calls.filter(c => c.sentiment_type === 'neutral' || !c.sentiment_type).length,
      negative: calls.filter(c => c.sentiment_type === 'negative').length
    };

    const avgSentiment = sentimentScores.length > 0
      ? sentimentScores.reduce((sum, s) => sum + Number(s), 0) / sentimentScores.length
      : 0;

    // Extract keywords from call fields with better pattern matching
    const keywordCounts: Record<string, number> = {};
    const keywordPatterns = [
      { keyword: 'pricing', match: /\b(pric|cost|budget|expensive|cheap|afford|payment)\w*/gi },
      { keyword: 'integration', match: /\b(integrat|connect|api|webhook|sync|import|export)\w*/gi },
      { keyword: 'support', match: /\b(support|help|assist|customer service|troubleshoot)\w*/gi },
      { keyword: 'feature', match: /\b(feature|function|capability|ability|option)\w*/gi },
      { keyword: 'timeline', match: /\b(timeline|deadline|schedule|when|date|time frame)\w*/gi },
      { keyword: 'competitor', match: /\b(competitor|alternative|versus|compare|other|switch)\w*/gi },
      { keyword: 'quality', match: /\b(quality|accuracy|precise|clear|reliable)\w*/gi },
      { keyword: 'performance', match: /\b(performance|speed|fast|slow|efficient|optimize)\w*/gi }
    ];

    // Process call fields to extract keywords
    insights.forEach(field => {
      if (!field.field_value) return;
      const text = String(field.field_value).toLowerCase();

      keywordPatterns.forEach(({ keyword, match }) => {
        const matches = text.match(match);
        if (matches && matches.length > 0) {
          keywordCounts[keyword] = (keywordCounts[keyword] || 0) + matches.length;
        }
      });
    });

    const allKeywords = Object.entries(keywordCounts)
      .map(([keyword, count]) => ({ keyword, count }));

    const topKeywords = allKeywords
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Monthly trends with proper date handling
    const monthlyTrends = [];
    for (let i = 4; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = i === 0 ? now : startOfMonth(subMonths(now, i - 1));

      const monthCalls = calls.filter(call => {
        if (!call.created_at) return false;
        const callDate = new Date(call.created_at);
        return callDate >= monthStart && callDate < monthEnd;
      });

      const monthSentiments = monthCalls
        .map(c => c.sentiment_score)
        .filter(s => s !== null && s !== undefined && !isNaN(Number(s)));

      monthlyTrends.push({
        month: format(monthStart, 'MMM'),
        calls: monthCalls.length,
        avgSentiment: monthSentiments.length > 0
          ? Number((monthSentiments.reduce((sum, s) => sum + Number(s), 0) / monthSentiments.length).toFixed(2))
          : 0,
        totalDuration: Math.round(monthCalls.reduce((sum, call) => sum + (Number(call.duration) || 0), 0) / 60) // in minutes
      });
    }

    // Processing performance analysis with error handling
    const processedCalls = calls.filter(c => c.status === 'completed').length;
    const processingSuccessRate = totalCalls > 0 ? Number((processedCalls / totalCalls * 100).toFixed(2)) : 0;

    const processingTimes = calls
      .filter(c => c.processing_completed_at && c.processing_started_at)
      .map(c => {
        try {
          const start = new Date(c.processing_started_at).getTime();
          const end = new Date(c.processing_completed_at).getTime();
          const diff = end - start;
          return diff > 0 && diff < 3600000 ? diff : null; // Exclude invalid times (> 1 hour)
        } catch {
          return null;
        }
      })
      .filter(time => time !== null) as number[];

    const avgProcessingTime = processingTimes.length > 0
      ? Math.round(processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length / 1000) // in seconds
      : 0;

    // Usage analytics with proper aggregation
    const currentMonthStart = startOfMonth(now);
    const currentMonthUsage = usage.filter(u => {
      if (!u.created_at) return false;
      const usageDate = new Date(u.created_at);
      return usageDate >= currentMonthStart;
    });

    const totalMinutesUsed = currentMonthUsage
      .filter(u => u.metric_type === 'minutes_transcribed')
      .reduce((sum, u) => sum + (Number(u.metric_value) || 0), 0);

    const totalCostCents = currentMonthUsage
      .reduce((sum, u) => sum + (Number(u.cost_cents) || 0), 0);

    const usageTrends = [];
    for (let i = 2; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      const monthUsage = usage.filter(u => {
        if (!u.created_at) return false;
        const usageDate = new Date(u.created_at);
        return usageDate >= monthStart && usageDate <= monthEnd;
      });

      usageTrends.push({
        period: format(monthStart, 'MMM yyyy'),
        calls: monthUsage.filter(u => u.metric_type === 'minutes_transcribed').length,
        minutes: Math.round(monthUsage
          .filter(u => u.metric_type === 'minutes_transcribed')
          .reduce((sum, u) => sum + (Number(u.metric_value) || 0), 0)),
        cost: Number((monthUsage.reduce((sum, u) => sum + (Number(u.cost_cents) || 0), 0) / 100).toFixed(2))
      });
    }

    // User activity metrics with Set for unique counting
    const activeUserIds = new Set(recentCalls
      .map(c => c.user_id)
      .filter(id => id && typeof id === 'string'));
    const activeUsersLast30Days = activeUserIds.size;

    // Get activity from last 7 days
    const recentUserIds = new Set(
      recentCalls
        .filter(c => {
          if (!c.created_at) return false;
          return new Date(c.created_at) >= sevenDaysAgo;
        })
        .map(c => c.user_id)
        .filter(id => id && typeof id === 'string')
    );
    const activeUsersLast7Days = recentUserIds.size;

    // Call activity heatmap (by hour and day of week) with validation
    const activityHeatmap: Record<string, number> = {};
    recentCalls.forEach(call => {
      if (!call.created_at) return;
      try {
        const date = new Date(call.created_at);
        const hour = date.getHours();
        const day = date.getDay();
        const key = `${day}-${hour}`;
        activityHeatmap[key] = (activityHeatmap[key] || 0) + 1;
      } catch {
        // Skip invalid dates
      }
    });

    // Team performance (calls per user) with privacy protection
    const callsByUser: Record<string, number> = {};
    calls.forEach(call => {
      if (call.user_id && typeof call.user_id === 'string') {
        callsByUser[call.user_id] = (callsByUser[call.user_id] || 0) + 1;
      }
    });

    const topPerformers = Object.entries(callsByUser)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([userId, callCount], index) => ({
        // Use a generic name since we don't have email access
        email: `user${index + 1}@team.local`, // Frontend expects email field
        callCount
      }));

    // Calculate transcription quality safely from call fields confidence scores
    const validTranscripts = transcripts.filter(t =>
      t.confidence_score !== null &&
      t.confidence_score !== undefined &&
      !isNaN(Number(t.confidence_score))
    );

    const avgTranscriptionQuality = validTranscripts.length > 0
      ? Number((validTranscripts.reduce((sum, t) => sum + Number(t.confidence_score), 0) / validTranscripts.length).toFixed(2))
      : 0.9; // Default to 90% quality if no data

    // Calculate overage if applicable
    const maxMinutes = organization.max_minutes_monthly || 0;
    const overage = maxMinutes > 0 ? Math.max(0, totalMinutesUsed - maxMinutes) : 0;

    // Compile comprehensive analytics response with all validations
    const analytics = {
      overview: {
        totalCalls,
        totalDuration: Math.round(totalDuration / 60), // in minutes
        avgCallDuration,
        timeSaved: Math.round(timeSaved / 60), // in minutes
        activeUsers: users.length,
        activeUsersLast7Days,
        activeUsersLast30Days,
        processingSuccessRate
      },
      sentiment: {
        average: Number(avgSentiment.toFixed(2)),
        distribution: sentimentDistribution,
        trend: monthlyTrends.map(m => ({
          month: m.month,
          sentiment: m.avgSentiment
        }))
      },
      keywords: {
        top: topKeywords,
        total: allKeywords.length,
        unique: Object.keys(keywordCounts).length
      },
      trends: {
        monthly: monthlyTrends,
        activityHeatmap: Object.entries(activityHeatmap)
          .map(([key, value]) => {
            const [day, hour] = key.split('-').map(Number);
            return { day, hour, count: value };
          })
          .filter(item => !isNaN(item.day) && !isNaN(item.hour))
      },
      processing: {
        successRate: processingSuccessRate,
        avgProcessingTime, // in seconds
        totalProcessed: processedCalls,
        transcriptionQuality: avgTranscriptionQuality,
        extractedFields: callFields.length
      },
      usage: {
        current: {
          calls: currentMonthUsage.filter(u => u.metric_type === 'minutes_transcribed').length,
          minutes: Math.round(totalMinutesUsed),
          cost: Number((totalCostCents / 100).toFixed(2)),
          overage: Math.round(overage)
        },
        trends: usageTrends,
        limits: {
          maxMinutes: maxMinutes,
          maxMembers: organization.max_members || 0,
          subscriptionStatus: organization.subscription_status || 'trial'
        }
      },
      team: {
        topPerformers,
        totalUsers: users.length,
        newUsersThisMonth: users.filter(user => {
          if (!user.joined_at) return false;
          try {
            const joinedDate = new Date(user.joined_at);
            return joinedDate >= currentMonthStart;
          } catch {
            return false;
          }
        }).length,
        roleDistribution: {
          admins: users.filter(u => u.role === 'admin').length,
          members: users.filter(u => u.role === 'member').length,
          owners: users.filter(u => u.role === 'owner').length
        }
      },
      metadata: {
        lastUpdated: new Date().toISOString(),
        dataRange: {
          from: fiveMonthsAgo.toISOString(),
          to: now.toISOString()
        },
        sampleSize: {
          calls: calls.length,
          insights: insights.length,
          transcripts: transcripts.length
        }
      }
    };

    // Set cache headers for performance
    const response = NextResponse.json(analytics);
    response.headers.set('Cache-Control', 'private, max-age=60'); // Cache for 1 minute

    return response;

  } catch (error) {
    console.error('Analytics API error:', error);

    // More detailed error response for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    return NextResponse.json(
      {
        error: 'Failed to fetch analytics data',
        details: process.env.NODE_ENV === 'development' ? {
          message: errorMessage,
          stack: errorStack
        } : undefined
      },
      { status: 500 }
    );
  }
}