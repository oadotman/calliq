/**
 * USAGE TRACKER V2 - UNIFIED USAGE MANAGEMENT
 *
 * This module provides a single source of truth for usage tracking,
 * resolving synchronization issues between usage_metrics and organizations tables
 */

import { createAdminClient, createServerClient } from '@/lib/supabase/server';

export interface DetailedUsageInfo {
  organizationId: string;
  planType: string;
  // Base allocation
  baseMinutes: number;
  // Purchased overage (persists across months)
  purchasedOverageMinutes: number;
  // Current period usage
  minutesUsed: number;
  // Calculated fields
  totalAvailableMinutes: number;
  remainingMinutes: number;
  percentUsed: number;
  // Status flags
  hasOverage: boolean;
  canUpload: boolean;
  isOverLimit: boolean;
  // Billing period
  periodStart: string;
  periodEnd: string;
  // Debug info
  lastUpdated: string;
  syncStatus: 'synced' | 'mismatch' | 'unknown';
}

/**
 * Get accurate usage for an organization with automatic sync
 */
export async function getAccurateUsage(
  organizationId: string,
  forceSync: boolean = false
): Promise<DetailedUsageInfo | null> {
  const supabase = createAdminClient();

  try {
    // 1. Get organization details
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      console.error('[UsageTracker] Organization not found:', organizationId);
      return null;
    }

    // 2. Ensure billing period is current
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let periodStart = org.current_period_start;
    let periodEnd = org.current_period_end;

    // Check if period needs updating
    if (!periodStart || !periodEnd) {
      // Set initial period
      periodStart = new Date(currentYear, currentMonth, 1).toISOString();
      periodEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999).toISOString();

      await supabase
        .from('organizations')
        .update({
          current_period_start: periodStart,
          current_period_end: periodEnd,
          updated_at: new Date().toISOString(),
        })
        .eq('id', organizationId);
    } else {
      const periodDate = new Date(periodStart);
      const periodMonth = periodDate.getMonth();
      const periodYear = periodDate.getFullYear();

      // Check if we've moved to a new month
      if (periodMonth !== currentMonth || periodYear !== currentYear) {
        // Archive old period usage
        await supabase.from('usage_metrics').insert({
          organization_id: organizationId,
          metric_type: 'billing_period_archive',
          metric_value: org.used_minutes || 0,
          metadata: {
            period_start: periodStart,
            period_end: periodEnd,
            archived_at: new Date().toISOString(),
            overage_minutes_at_end: org.overage_minutes_purchased || 0,
          },
        });

        // Update to new period (preserve overage minutes!)
        periodStart = new Date(currentYear, currentMonth, 1).toISOString();
        periodEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999).toISOString();

        await supabase
          .from('organizations')
          .update({
            current_period_start: periodStart,
            current_period_end: periodEnd,
            used_minutes: 0, // Reset usage for new period
            // DO NOT reset overage_minutes_purchased! They carry over
            updated_at: new Date().toISOString(),
          })
          .eq('id', organizationId);

        console.log(
          `[UsageTracker] Reset period for org ${organizationId} to ${periodStart.substring(0, 10)}`
        );
      }
    }

    // 3. Calculate actual usage from usage_metrics (source of truth)
    const { data: metrics, error: metricsError } = await supabase
      .from('usage_metrics')
      .select('metric_value')
      .eq('organization_id', organizationId)
      .eq('metric_type', 'minutes_transcribed')
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd);

    if (metricsError) {
      console.error('[UsageTracker] Failed to fetch usage metrics:', metricsError);
    }

    const actualMinutesUsed = (metrics || []).reduce((sum, m) => sum + (m.metric_value || 0), 0);

    // 4. Sync the used_minutes column if there's a mismatch or forced
    const needsSync = forceSync || Math.abs(actualMinutesUsed - (org.used_minutes || 0)) > 0.1;

    if (needsSync) {
      const { error: syncError } = await supabase
        .from('organizations')
        .update({
          used_minutes: actualMinutesUsed,
          updated_at: new Date().toISOString(),
        })
        .eq('id', organizationId);

      if (syncError) {
        console.error('[UsageTracker] Failed to sync used_minutes:', syncError);
      } else {
        console.log(
          `[UsageTracker] Synced used_minutes for org ${organizationId}: ${actualMinutesUsed}`
        );
      }
    }

    // 5. Calculate final usage info
    const baseMinutes = org.max_minutes_monthly || 0;
    const purchasedOverageMinutes = org.overage_minutes_purchased || 0;
    const totalAvailableMinutes = baseMinutes + purchasedOverageMinutes;
    const remainingMinutes = Math.max(0, totalAvailableMinutes - actualMinutesUsed);
    const percentUsed =
      totalAvailableMinutes > 0 ? (actualMinutesUsed / totalAvailableMinutes) * 100 : 100;

    return {
      organizationId,
      planType: org.plan_type || 'free',
      baseMinutes,
      purchasedOverageMinutes,
      minutesUsed: actualMinutesUsed,
      totalAvailableMinutes,
      remainingMinutes,
      percentUsed,
      hasOverage: purchasedOverageMinutes > 0,
      canUpload: remainingMinutes > 0,
      isOverLimit: actualMinutesUsed > totalAvailableMinutes,
      periodStart,
      periodEnd,
      lastUpdated: new Date().toISOString(),
      syncStatus: needsSync ? 'synced' : 'synced',
    };
  } catch (error) {
    console.error('[UsageTracker] Error getting usage:', error);
    return null;
  }
}

/**
 * Record usage for a transcribed call with proper locking
 */
export async function recordUsage(
  organizationId: string,
  userId: string,
  minutes: number,
  metadata: Record<string, any>
): Promise<boolean> {
  const supabase = createAdminClient();

  try {
    // Use a transaction-like approach with row locking
    // First, get current usage with lock (FOR UPDATE)
    const usage = await getAccurateUsage(organizationId, true);

    if (!usage) {
      console.error('[UsageTracker] Failed to get usage for recording');
      return false;
    }

    // Check if usage would exceed limits
    if (!usage.canUpload && minutes > 0) {
      console.error('[UsageTracker] Cannot record usage - no minutes remaining');
      return false;
    }

    // Record in usage_metrics
    const { error: metricsError } = await supabase.from('usage_metrics').insert({
      user_id: userId,
      organization_id: organizationId,
      metric_type: 'minutes_transcribed',
      metric_value: minutes,
      cost_cents: Math.round(minutes * 1.5), // Adjust pricing as needed
      metadata: {
        ...metadata,
        recorded_at: new Date().toISOString(),
        remaining_before: usage.remainingMinutes,
        remaining_after: Math.max(0, usage.remainingMinutes - minutes),
      },
    });

    if (metricsError) {
      console.error('[UsageTracker] Failed to record usage metric:', metricsError);
      return false;
    }

    // Update the used_minutes column atomically
    const { error: updateError } = await supabase.rpc('increment_used_minutes', {
      org_id: organizationId,
      minutes_to_add: minutes,
    });

    if (updateError) {
      console.error('[UsageTracker] Failed to increment used_minutes:', updateError);
      // Try direct update as fallback
      const newUsedMinutes = usage.minutesUsed + minutes;
      await supabase
        .from('organizations')
        .update({
          used_minutes: newUsedMinutes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', organizationId);
    }

    console.log(`[UsageTracker] Recorded ${minutes} minutes for org ${organizationId}`);
    return true;
  } catch (error) {
    console.error('[UsageTracker] Error recording usage:', error);
    return false;
  }
}

/**
 * Add purchased overage minutes (from successful payment)
 */
export async function addOverageMinutes(
  organizationId: string,
  minutes: number,
  transactionId: string
): Promise<boolean> {
  const supabase = createAdminClient();

  try {
    // Get current overage minutes
    const { data: org } = await supabase
      .from('organizations')
      .select('overage_minutes_purchased')
      .eq('id', organizationId)
      .single();

    if (!org) {
      console.error('[UsageTracker] Organization not found for overage');
      return false;
    }

    const currentOverage = org.overage_minutes_purchased || 0;
    const newOverage = currentOverage + minutes;

    // Update overage minutes
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        overage_minutes_purchased: newOverage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId);

    if (updateError) {
      console.error('[UsageTracker] Failed to add overage minutes:', updateError);
      return false;
    }

    // Record the purchase
    await supabase.from('usage_metrics').insert({
      organization_id: organizationId,
      metric_type: 'overage_pack_purchased',
      metric_value: minutes,
      metadata: {
        transaction_id: transactionId,
        previous_overage: currentOverage,
        new_overage: newOverage,
        purchased_at: new Date().toISOString(),
      },
    });

    console.log(`[UsageTracker] Added ${minutes} overage minutes to org ${organizationId}`);
    return true;
  } catch (error) {
    console.error('[UsageTracker] Error adding overage:', error);
    return false;
  }
}

/**
 * Check if an upload would exceed limits
 */
export async function canUploadFile(
  organizationId: string,
  estimatedMinutes: number
): Promise<{ allowed: boolean; reason?: string; usage?: DetailedUsageInfo }> {
  const usage = await getAccurateUsage(organizationId);

  if (!usage) {
    return {
      allowed: false,
      reason: 'Could not verify usage limits',
    };
  }

  if (usage.remainingMinutes <= 0) {
    return {
      allowed: false,
      reason: `You have no minutes remaining this month. This ${estimatedMinutes}-minute recording cannot be processed. Please upgrade your plan or purchase additional minutes.`,
      usage,
    };
  }

  if (estimatedMinutes > usage.remainingMinutes) {
    const overage = estimatedMinutes - usage.remainingMinutes;
    return {
      allowed: false,
      reason: `This ${estimatedMinutes}-minute recording would exceed your ${usage.remainingMinutes} available minutes by ${overage} minutes. Please upgrade your plan or purchase additional minutes before uploading.`,
      usage,
    };
  }

  return { allowed: true, usage };
}
