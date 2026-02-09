'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { formatDate, formatDuration } from '@/lib/utils';
import { SentimentType } from '@/lib/types';
import { Clock, Zap, Phone, Users, Plus, Sparkles, TrendingUp, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { UsageMeter } from '@/components/dashboard/UsageMeter';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { UploadModal } from '@/components/modals/UploadModal';

interface DashboardStats {
  callsThisMonth: number;
  callsLastMonth: number;
  callsTrend: string;
  timeSaved: string;
  hoursSavedThisMonth: number;
  hoursSavedLastMonth: number;
  minutesUsed: number;
  minutesTotal: number;
  hourlyRate: number;
}

interface Call {
  id: string;
  customer_name: string | null;
  sales_rep: string | null;
  call_date: string;
  duration: number | null;
  sentiment_type: SentimentType | null;
  sentiment_score: number | null;
  status: string;
  created_at: string;
}

export default function DashboardContent() {
  const { user, organization } = useAuth();
  const [recentCalls, setRecentCalls] = useState<Call[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    let debounceTimer: NodeJS.Timeout | null = null;

    async function fetchDashboardData() {
      if (!user || !isMounted) return;

      try {
        setLoading(true);
        const supabase = createClient();

        // Use organization from AuthContext if available
        let planLimit = 30; // Default to free plan (30 minutes)
        let orgId = organization?.id;

        if (organization) {
          planLimit = organization.max_minutes_monthly || 30;
          console.log('Using organization from context:', organization.name, 'Limit:', planLimit);
        } else {
          // Fallback: fetch user's organization if not in context
          console.log('Organization not in context, fetching...');
          try {
            const { data: userOrg, error: orgError } = await supabase
              .from('user_organizations')
              .select('organization_id, role')
              .eq('user_id', user.id)
              .single();

            if (!orgError && userOrg?.organization_id) {
              orgId = userOrg.organization_id;
              const { data: org } = await supabase
                .from('organizations')
                .select('max_minutes_monthly, plan_type, name')
                .eq('id', userOrg.organization_id)
                .single();

              if (org) {
                planLimit = org.max_minutes_monthly || 30;
                console.log(
                  'Fetched organization:',
                  org.name,
                  'Plan:',
                  org.plan_type,
                  'Limit:',
                  planLimit
                );
              }
            }
          } catch (err) {
            console.log('No organization found for user, using defaults');
          }
        }

        // Fetch recent calls
        const recentCallsQuery = supabase
          .from('calls')
          .select('*')
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(5);

        if (orgId) {
          recentCallsQuery.eq('organization_id', orgId);
        } else {
          recentCallsQuery.eq('user_id', user.id);
        }

        const { data: callsData } = await recentCallsQuery;
        setRecentCalls(callsData || []);

        // Fetch metrics for current month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        // Current month calls
        const callsQuery = orgId
          ? supabase
              .from('calls')
              .select('id, duration, user_id')
              .eq('status', 'completed')
              .gte('created_at', startOfMonth.toISOString())
              .eq('organization_id', orgId)
          : supabase
              .from('calls')
              .select('id, duration')
              .eq('user_id', user.id)
              .eq('status', 'completed')
              .gte('created_at', startOfMonth.toISOString());

        const { data: currentMonthCalls } = await callsQuery;

        // Last month calls
        const lastMonthQuery = orgId
          ? supabase
              .from('calls')
              .select('id, duration, user_id')
              .eq('status', 'completed')
              .gte('created_at', startOfLastMonth.toISOString())
              .lte('created_at', endOfLastMonth.toISOString())
              .eq('organization_id', orgId)
          : supabase
              .from('calls')
              .select('id, duration')
              .eq('user_id', user.id)
              .eq('status', 'completed')
              .gte('created_at', startOfLastMonth.toISOString())
              .lte('created_at', endOfLastMonth.toISOString());

        const { data: lastMonthCalls } = await lastMonthQuery;

        const callsThisMonth = currentMonthCalls?.length || 0;
        const callsLastMonth = lastMonthCalls?.length || 0;

        // Calculate minutes used directly from calls table
        // Use duration_minutes field which is saved when calls are uploaded
        let totalMinutesThisMonth = 0;

        try {
          if (orgId) {
            // For organizations, aggregate ALL team member usage from calls
            const { data: orgCalls, error: callsError } = await supabase
              .from('calls')
              .select('duration_minutes, user_id')
              .eq('organization_id', orgId)
              .eq('status', 'completed')
              .gte('created_at', startOfMonth.toISOString())
              .lte('created_at', now.toISOString());

            if (!callsError && orgCalls) {
              totalMinutesThisMonth = orgCalls.reduce(
                (sum, call) => sum + (call.duration_minutes || 0),
                0
              );
              console.log(
                `Organization usage from calls: ${totalMinutesThisMonth} minutes from ${orgCalls.length} calls`
              );

              // Log details for debugging
              const uniqueUsers = new Set(orgCalls.map((c) => c.user_id));
              console.log(`Unique users with calls: ${uniqueUsers.size}`);
            } else if (callsError) {
              console.error('Error fetching organization calls:', callsError);
            }
          } else {
            // Fallback: If no org, calculate from user's calls
            const { data: userCalls, error: callsError } = await supabase
              .from('calls')
              .select('duration_minutes')
              .eq('user_id', user.id)
              .eq('status', 'completed')
              .gte('created_at', startOfMonth.toISOString())
              .lte('created_at', now.toISOString());

            if (!callsError && userCalls) {
              totalMinutesThisMonth = userCalls.reduce(
                (sum, call) => sum + (call.duration_minutes || 0),
                0
              );
              console.log(`Individual usage from calls: ${totalMinutesThisMonth} minutes`);
            }
          }

          // Also check usage_metrics table as a secondary source
          // (for backwards compatibility with older data)
          if (totalMinutesThisMonth === 0) {
            const { data: usageMetrics } = await supabase
              .from('usage_metrics')
              .select('metric_value')
              .eq(orgId ? 'organization_id' : 'user_id', orgId || user.id)
              .eq('metric_type', 'minutes_transcribed')
              .gte('created_at', startOfMonth.toISOString())
              .lte('created_at', now.toISOString());

            if (usageMetrics && usageMetrics.length > 0) {
              totalMinutesThisMonth = usageMetrics.reduce(
                (sum, metric) => sum + (metric.metric_value || 0),
                0
              );
              console.log(`Fallback to usage_metrics: ${totalMinutesThisMonth} minutes`);
            }
          }
        } catch (err) {
          console.error('Error calculating usage:', err);
          totalMinutesThisMonth = 0;
        }

        // Calculate time saved (assuming 15 min saved per call)
        const hoursSavedThisMonth = Math.round(((callsThisMonth * 15) / 60) * 10) / 10;
        const hoursSavedLastMonth = Math.round(((callsLastMonth * 15) / 60) * 10) / 10;

        // Calculate trend
        let callsTrend = '+0%';
        if (callsLastMonth > 0) {
          const percentChange = Math.round(
            ((callsThisMonth - callsLastMonth) / callsLastMonth) * 100
          );
          callsTrend = `${percentChange > 0 ? '+' : ''}${percentChange}%`;
        } else if (callsThisMonth > 0) {
          callsTrend = '+100%';
        }

        if (isMounted) {
          setStats({
            callsThisMonth,
            callsLastMonth,
            callsTrend,
            timeSaved: `${hoursSavedThisMonth} hours`,
            hoursSavedThisMonth,
            hoursSavedLastMonth,
            minutesUsed: Math.round(totalMinutesThisMonth),
            minutesTotal: planLimit,
            hourlyRate: 75,
          });
          setLoading(false);
        }
      } catch (error) {
        console.error('Dashboard fetch error:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchDashboardData();

    // Set up real-time subscription for call status updates
    const supabase = createClient();
    const channel = supabase
      .channel('dashboard-calls')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calls',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Call updated:', payload);
          if (debounceTimer) {
            clearTimeout(debounceTimer);
          }
          debounceTimer = setTimeout(() => {
            if (isMounted) {
              fetchDashboardData();
            }
          }, 1000);
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      isMounted = false;
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      supabase.removeChannel(channel);
    };
  }, [user, organization]);

  // Calculate metrics with memoization
  const dollarsSaved = useMemo(() => {
    return stats ? stats.hoursSavedThisMonth * stats.hourlyRate : 0;
  }, [stats]);

  // Memoize upload modal handlers
  const handleOpenUploadModal = useCallback(() => {
    setIsUploadModalOpen(true);
  }, []);

  const handleCloseUploadModal = useCallback(() => {
    setIsUploadModalOpen(false);
  }, []);

  // Get plan type display with memoization - moved before conditional return
  const planDisplay = useMemo(() => {
    if (!organization) return 'Starter Plan';
    switch (organization?.plan_type) {
      case 'free':
        return 'Free Plan';
      case 'solo':
        return 'Solo Plan';
      case 'team':
        return 'Team Plan';
      case 'enterprise':
        return 'Enterprise Plan';
      default:
        return 'Starter Plan';
    }
  }, [organization]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-purple-700 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="p-12 space-y-8">
        {/* TOP SECTION - Header Area */}
        <div className="flex items-center justify-between">
          <h1 className="text-[28px] font-semibold text-gray-800">Dashboard</h1>
          <div className="bg-purple-50 text-purple-700 px-4 py-1.5 rounded-full">
            <span className="text-sm font-medium">✨ {planDisplay}</span>
          </div>
        </div>

        {/* QUICK ACTIONS SECTION - Moved to top */}
        <div className="mt-16">
          <QuickActions onProcessNewCall={handleOpenUploadModal} />
        </div>

        {/* MAIN HERO SECTION - Usage Overview */}
        <div className="mt-8">
          <UsageMeter />
        </div>

        {/* KEY METRICS SECTION - Three Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {/* Calls Processed Card */}
            <MetricCard
              icon={Phone}
              iconBgColor="bg-blue-500"
              cardBgColor="bg-blue-50"
              label="CALLS PROCESSED"
              value={stats.callsThisMonth}
              subText="This month"
              trend={{
                value: `${stats.callsTrend} vs last month`,
                isPositive: stats.callsTrend.startsWith('+'),
              }}
            />

            {/* Time Saved Card */}
            <MetricCard
              icon={Zap}
              iconBgColor="bg-emerald-500"
              cardBgColor="bg-green-50"
              label="TIME SAVED"
              value={stats.hoursSavedThisMonth}
              unit="hours"
              subText={`≈ $${dollarsSaved.toFixed(2)} saved`}
              additionalInfo="~15 min per call average"
            />

            {/* Active Team Card */}
            <MetricCard
              icon={Users}
              iconBgColor="bg-purple-700"
              cardBgColor="bg-purple-50"
              label="ACTIVE TEAM"
              value={1}
              subText="Team member online"
              statusIndicator={{
                isActive: true,
                text: 'Available now',
              }}
            />
          </div>
        )}

        {/* FLOATING ACTION BUTTON (FAB) */}
        <div className="fixed bottom-8 right-8 z-50">
          <button
            onClick={handleOpenUploadModal}
            className="w-16 h-16 bg-purple-700 hover:bg-purple-800 text-white rounded-full shadow-[0px_8px_16px_rgba(124,58,237,0.3)] hover:shadow-[0px_12px_20px_rgba(124,58,237,0.4)] hover:scale-105 transition-all duration-200 flex items-center justify-center group"
          >
            <Plus className="w-8 h-8" strokeWidth={2.5} />
          </button>
        </div>

        {/* Upload Modal */}
        <UploadModal isOpen={isUploadModalOpen} onClose={handleCloseUploadModal} />
      </div>
    </div>
  );
}
