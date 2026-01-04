import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, requireAuth } from '@/lib/supabase/server';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';

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
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30d';

    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('user_organizations')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (userError || !userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const organizationId = userData.organization_id;
    const now = new Date();
    const startDate = period === '7d' ? subDays(now, 7) : subDays(now, 30);

    // Fetch team-related data
    const [
      teamMembers,
      callsByUsers,
      invitations,
      organizationSettings
    ] = await Promise.all([
      // All team members
      supabase
        .from('user_organizations')
        .select('user_id, role, joined_at, invited_by')
        .eq('organization_id', organizationId),

      // Calls grouped by user
      supabase
        .from('calls')
        .select('id, user_id, created_at, duration, status')
        .eq('organization_id', organizationId)
        .gte('created_at', startDate.toISOString())
        .is('deleted_at', null),

      // Pending invitations
      supabase
        .from('team_invitations')
        .select('*')
        .eq('organization_id', organizationId)
        .is('accepted_at', null)
        .gte('expires_at', now.toISOString()),

      // Organization settings
      supabase
        .from('organizations')
        .select(`
          name,
          settings,
          plan_type,
          max_members,
          max_minutes_monthly,
          subscription_status
        `)
        .eq('id', organizationId)
        .single()
    ]);

    const members = teamMembers.data || [];
    const calls = callsByUsers.data || [];
    const pendingInvites = invitations.data || [];
    const orgSettings = organizationSettings.data;

    // Calculate team member statistics
    const memberStats = members.map(member => {
      const memberCalls = calls.filter(c => c.user_id === member.user_id);

      const totalCalls = memberCalls.length;
      const totalDuration = memberCalls.reduce((sum, call) => sum + (call.duration || 0), 0);
      const avgCallDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;

      // Activity score based on calls
      const activityScore = totalCalls * 10;

      // Last activity
      const lastCallDate = memberCalls.length > 0
        ? memberCalls.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
        : null;

      // Daily activity for the period
      const dailyActivity: Record<string, number> = {};
      for (let i = 0; i < (period === '7d' ? 7 : 30); i++) {
        const day = format(subDays(now, i), 'yyyy-MM-dd');
        dailyActivity[day] = 0;
      }

      memberCalls.forEach(call => {
        const day = format(new Date(call.created_at), 'yyyy-MM-dd');
        if (dailyActivity[day] !== undefined) {
          dailyActivity[day]++;
        }
      });

      return {
        id: member.user_id,
        role: member.role,
        joinedAt: member.joined_at,
        lastActive: lastCallDate,
        stats: {
          totalCalls,
          totalDuration: Math.round(totalDuration / 60), // in minutes
          avgCallDuration: Math.round(avgCallDuration),
          activityScore,
          dailyActivity
        },
        status: lastCallDate && new Date(lastCallDate) > subDays(now, 7) ? 'active' : 'inactive'
      };
    });

    // Sort by activity score
    memberStats.sort((a, b) => b.stats.activityScore - a.stats.activityScore);

    // Calculate team-wide metrics
    const teamMetrics = {
      totalMembers: members.length,
      activeMembers: memberStats.filter(m => m.status === 'active').length,
      totalCalls: calls.length,
      totalDuration: Math.round(calls.reduce((sum, call) => sum + (call.duration || 0), 0) / 60),
      avgCallsPerMember: members.length > 0 ? calls.length / members.length : 0,
      topPerformers: memberStats.slice(0, 5).map(m => ({
        id: m.id,
        calls: m.stats.totalCalls,
        duration: m.stats.totalDuration
      }))
    };

    // Role distribution
    const roleDistribution = members.reduce((acc, member) => {
      const role = member.role || 'member';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Activity trends
    const activityTrends = [];
    const days = period === '7d' ? 7 : 30;
    for (let i = days - 1; i >= 0; i--) {
      const day = subDays(now, i);
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);

      const dayCalls = calls.filter(call => {
        const callDate = new Date(call.created_at);
        return callDate >= dayStart && callDate <= dayEnd;
      });

      const activeUsers = new Set(dayCalls.map(c => c.user_id)).size;

      activityTrends.push({
        date: format(day, 'MMM dd'),
        calls: dayCalls.length,
        activeUsers,
        duration: Math.round(dayCalls.reduce((sum, call) => sum + (call.duration || 0), 0) / 60)
      });
    }

    // Collaboration metrics
    const collaborationMetrics = {
      avgTeamActivity: teamMetrics.avgCallsPerMember,
      mostActiveDay: activityTrends.reduce((max, day) =>
        day.calls > (max?.calls || 0) ? day : max, activityTrends[0]
      ),
      leastActiveDay: activityTrends.reduce((min, day) =>
        day.calls < (min?.calls || Infinity) ? day : min, activityTrends[0]
      ),
      weeklyGrowth: (() => {
        if (period === '30d' && activityTrends.length >= 14) {
          const lastWeek = activityTrends.slice(-7).reduce((sum, d) => sum + d.calls, 0);
          const prevWeek = activityTrends.slice(-14, -7).reduce((sum, d) => sum + d.calls, 0);
          return prevWeek > 0 ? ((lastWeek - prevWeek) / prevWeek) * 100 : 0;
        }
        return 0;
      })()
    };

    // Seat utilization (if applicable)
    const seatLimit = orgSettings?.max_members || null;
    const seatUtilization = seatLimit ? {
      used: members.length,
      limit: seatLimit,
      percentage: (members.length / seatLimit) * 100,
      available: seatLimit - members.length
    } : null;

    const response = {
      members: memberStats,
      metrics: teamMetrics,
      roleDistribution,
      activityTrends,
      collaborationMetrics,
      pendingInvitations: pendingInvites.length,
      seatUtilization,
      organization: {
        name: orgSettings?.name,
        plan: orgSettings?.plan_type
      },
      period
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Team analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team analytics' },
      { status: 500 }
    );
  }
}