/**
 * Business Metrics Tracking System
 * Tracks key business KPIs and user behavior metrics
 */

import { Metrics } from './metrics';
import { createServerClient } from '@/lib/supabase/server';

export interface BusinessMetrics {
  // User Metrics
  dailyActiveUsers: number;
  monthlyActiveUsers: number;
  newSignups: number;
  churnRate: number;

  // Usage Metrics
  totalCallsProcessed: number;
  totalMinutesTranscribed: number;
  averageCallDuration: number;
  peakUsageHour: number;

  // Revenue Metrics
  monthlyRecurringRevenue: number;
  averageRevenuePerUser: number;
  customerLifetimeValue: number;
  conversionRate: number;

  // Performance Metrics
  transcriptionSuccessRate: number;
  averageProcessingTime: number;
  apiErrorRate: number;
  userSatisfactionScore: number;
}

/**
 * Business Metrics Tracker
 */
export class BusinessMetricsTracker {
  private static instance: BusinessMetricsTracker;

  private constructor() {}

  static getInstance(): BusinessMetricsTracker {
    if (!BusinessMetricsTracker.instance) {
      BusinessMetricsTracker.instance = new BusinessMetricsTracker();
    }
    return BusinessMetricsTracker.instance;
  }

  /**
   * Track user signup
   */
  async trackSignup(userId: string, plan: string, source?: string): Promise<void> {
    try {
      const supabase = createServerClient();

      // Record signup event
      await supabase.from('analytics_events').insert({
        event_type: 'signup',
        user_id: userId,
        properties: {
          plan,
          source,
          timestamp: new Date().toISOString()
        }
      });

      // Update metrics
      await Metrics.recordResponseTime('business.signup', Date.now());

      // Track conversion if from referral
      if (source?.startsWith('referral_')) {
        await this.trackConversion('referral', userId, { referralCode: source });
      }
    } catch (error) {
      console.error('Error tracking signup:', error);
    }
  }

  /**
   * Track call processing
   */
  async trackCallProcessing(
    callId: string,
    organizationId: string,
    duration: number,
    processingTime: number,
    success: boolean
  ): Promise<void> {
    try {
      const supabase = createServerClient();

      // Record call event
      await supabase.from('analytics_events').insert({
        event_type: 'call_processed',
        organization_id: organizationId,
        properties: {
          call_id: callId,
          duration,
          processing_time: processingTime,
          success,
          timestamp: new Date().toISOString()
        }
      });

      // Update metrics
      if (success) {
        await Metrics.recordResponseTime('business.call_processing', processingTime);
        await this.updateUsageMetrics(organizationId, duration);
      } else {
        await Metrics.recordError('call_processing', 'processing_failed');
      }
    } catch (error) {
      console.error('Error tracking call processing:', error);
    }
  }

  /**
   * Track subscription changes
   */
  async trackSubscriptionChange(
    organizationId: string,
    oldPlan: string,
    newPlan: string,
    mrr: number
  ): Promise<void> {
    try {
      const supabase = createServerClient();

      const eventType = this.getSubscriptionEventType(oldPlan, newPlan);

      await supabase.from('analytics_events').insert({
        event_type: eventType,
        organization_id: organizationId,
        properties: {
          old_plan: oldPlan,
          new_plan: newPlan,
          mrr_change: mrr,
          timestamp: new Date().toISOString()
        }
      });

      // Track revenue metrics
      await this.updateRevenueMetrics(organizationId, mrr);
    } catch (error) {
      console.error('Error tracking subscription change:', error);
    }
  }

  /**
   * Track user activity
   */
  async trackUserActivity(
    userId: string,
    organizationId: string,
    action: string,
    properties?: Record<string, any>
  ): Promise<void> {
    try {
      const supabase = createServerClient();

      await supabase.from('analytics_events').insert({
        event_type: 'user_activity',
        user_id: userId,
        organization_id: organizationId,
        properties: {
          action,
          ...properties,
          timestamp: new Date().toISOString()
        }
      });

      // Update daily active users
      await this.updateActiveUsers(userId);
    } catch (error) {
      console.error('Error tracking user activity:', error);
    }
  }

  /**
   * Track conversion events
   */
  async trackConversion(
    type: 'trial_to_paid' | 'free_to_paid' | 'referral' | 'upgrade',
    userId: string,
    properties?: Record<string, any>
  ): Promise<void> {
    try {
      const supabase = createServerClient();

      await supabase.from('analytics_events').insert({
        event_type: `conversion_${type}`,
        user_id: userId,
        properties: {
          ...properties,
          timestamp: new Date().toISOString()
        }
      });

      // Update conversion metrics
      await Metrics.recordResponseTime(`business.conversion.${type}`, 1);
    } catch (error) {
      console.error('Error tracking conversion:', error);
    }
  }

  /**
   * Get daily metrics summary
   */
  async getDailyMetrics(date?: Date): Promise<Partial<BusinessMetrics>> {
    try {
      const supabase = createServerClient();
      const targetDate = date || new Date();
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Get DAU
      const { data: dauData } = await supabase
        .from('analytics_events')
        .select('user_id', { count: 'exact' })
        .eq('event_type', 'user_activity')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString());

      // Get new signups
      const { data: signupData } = await supabase
        .from('analytics_events')
        .select('*', { count: 'exact' })
        .eq('event_type', 'signup')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString());

      // Get calls processed
      const { data: callsData } = await supabase
        .from('analytics_events')
        .select('properties')
        .eq('event_type', 'call_processed')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString());

      const totalMinutes = callsData?.reduce((sum, event) => {
        return sum + (event.properties?.duration || 0);
      }, 0) || 0;

      const avgProcessingTime = (callsData?.reduce((sum, event) => {
        return sum + (event.properties?.processing_time || 0);
      }, 0) || 0) / (callsData?.length || 1);

      return {
        dailyActiveUsers: dauData?.length || 0,
        newSignups: signupData?.length || 0,
        totalCallsProcessed: callsData?.length || 0,
        totalMinutesTranscribed: Math.round(totalMinutes / 60),
        averageProcessingTime: Math.round(avgProcessingTime)
      };
    } catch (error) {
      console.error('Error getting daily metrics:', error);
      return {};
    }
  }

  /**
   * Get monthly metrics summary
   */
  async getMonthlyMetrics(year: number, month: number): Promise<Partial<BusinessMetrics>> {
    try {
      const supabase = createServerClient();
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

      // Get MAU
      const { data: mauData } = await supabase
        .from('analytics_events')
        .select('user_id', { count: 'exact' })
        .eq('event_type', 'user_activity')
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString());

      // Get MRR
      const { data: mrrData } = await supabase
        .from('organizations')
        .select('subscription_amount')
        .in('subscription_status', ['active', 'trialing']);

      const mrr = mrrData?.reduce((sum, org) => sum + (org.subscription_amount || 0), 0) || 0;

      // Get conversion rate
      const { data: trialsData } = await supabase
        .from('analytics_events')
        .select('*', { count: 'exact' })
        .eq('event_type', 'signup')
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString());

      const { data: conversionsData } = await supabase
        .from('analytics_events')
        .select('*', { count: 'exact' })
        .eq('event_type', 'conversion_trial_to_paid')
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString());

      const conversionRate = trialsData?.length
        ? (conversionsData?.length || 0) / trialsData.length * 100
        : 0;

      return {
        monthlyActiveUsers: mauData?.length || 0,
        monthlyRecurringRevenue: mrr,
        averageRevenuePerUser: mauData?.length ? mrr / mauData.length : 0,
        conversionRate: Math.round(conversionRate * 10) / 10
      };
    } catch (error) {
      console.error('Error getting monthly metrics:', error);
      return {};
    }
  }

  /**
   * Calculate customer lifetime value
   */
  async calculateCustomerLifetimeValue(organizationId: string): Promise<number> {
    try {
      const supabase = createServerClient();

      // Get organization subscription history
      const { data } = await supabase
        .from('subscription_history')
        .select('amount, duration_months')
        .eq('organization_id', organizationId);

      const totalRevenue = data?.reduce((sum, sub) => {
        return sum + (sub.amount * sub.duration_months);
      }, 0) || 0;

      return totalRevenue;
    } catch (error) {
      console.error('Error calculating CLV:', error);
      return 0;
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<{
    transcriptionSuccessRate: number;
    apiErrorRate: number;
    averageResponseTime: number;
  }> {
    try {
      const supabase = createServerClient();

      // Get transcription success rate
      const { data: transcriptionData } = await supabase
        .from('calls')
        .select('status', { count: 'exact' })
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const successCount = transcriptionData?.filter(c => c.status === 'completed').length || 0;
      const totalCount = transcriptionData?.length || 1;
      const successRate = (successCount / totalCount) * 100;

      // Get API error rate from Redis metrics
      const errorRate = await Metrics.getAverageResponseTime();

      return {
        transcriptionSuccessRate: Math.round(successRate * 10) / 10,
        apiErrorRate: errorRate,
        averageResponseTime: await Metrics.getAverageResponseTime()
      };
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      return {
        transcriptionSuccessRate: 0,
        apiErrorRate: 0,
        averageResponseTime: 0
      };
    }
  }

  /**
   * Generate metrics report
   */
  async generateMetricsReport(period: 'daily' | 'weekly' | 'monthly'): Promise<any> {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'daily':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'monthly':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
    }

    const [
      dailyMetrics,
      monthlyMetrics,
      performanceMetrics,
      redisMetrics
    ] = await Promise.all([
      this.getDailyMetrics(),
      this.getMonthlyMetrics(now.getFullYear(), now.getMonth() + 1),
      this.getPerformanceMetrics(),
      Metrics.getMetricsSummary()
    ]);

    return {
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      metrics: {
        ...dailyMetrics,
        ...monthlyMetrics,
        ...performanceMetrics,
        redis: redisMetrics
      },
      generated_at: new Date().toISOString()
    };
  }

  // Private helper methods

  private getSubscriptionEventType(oldPlan: string, newPlan: string): string {
    if (!oldPlan || oldPlan === 'free') return 'subscription_created';
    if (!newPlan || newPlan === 'free') return 'subscription_cancelled';

    const planHierarchy: Record<string, number> = { free: 0, solo: 1, team: 2, enterprise: 3 };
    const oldLevel = planHierarchy[oldPlan] || 0;
    const newLevel = planHierarchy[newPlan] || 0;

    return newLevel > oldLevel ? 'subscription_upgraded' : 'subscription_downgraded';
  }

  private async updateUsageMetrics(organizationId: string, duration: number): Promise<void> {
    try {
      const supabase = createServerClient();

      // Update organization usage
      await supabase.rpc('increment_usage_minutes', {
        p_organization_id: organizationId,
        p_minutes: Math.ceil(duration / 60)
      });
    } catch (error) {
      console.error('Error updating usage metrics:', error);
    }
  }

  private async updateRevenueMetrics(organizationId: string, mrr: number): Promise<void> {
    try {
      // Record MRR change in Redis for quick access
      await Metrics.recordResponseTime('business.mrr', mrr);
    } catch (error) {
      console.error('Error updating revenue metrics:', error);
    }
  }

  private async updateActiveUsers(userId: string): Promise<void> {
    try {
      const supabase = createServerClient();

      // Update last activity timestamp
      await supabase
        .from('users')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', userId);
    } catch (error) {
      console.error('Error updating active users:', error);
    }
  }
}

// Export singleton instance
export const businessMetrics = BusinessMetricsTracker.getInstance();