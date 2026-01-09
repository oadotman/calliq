// =====================================================
// AUTOMATIC BILLING PERIOD MANAGER
// Ensures billing periods are always current
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';

/**
 * Check and update billing periods for all organizations
 * This should be called:
 * 1. On every API request that checks usage
 * 2. Daily via a cron job
 * 3. When processing transcriptions
 */
export async function ensureCurrentBillingPeriods() {
  const supabase = createAdminClient();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Get first and last day of current month
  const periodStart = new Date(currentYear, currentMonth, 1);
  const periodEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

  try {
    // Get all organizations
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name, current_period_start, current_period_end, used_minutes');

    if (orgsError) throw orgsError;

    const updates = [];

    for (const org of orgs || []) {
      const orgPeriodEnd = org.current_period_end ? new Date(org.current_period_end) : null;

      // Check if billing period needs updating
      if (!orgPeriodEnd || orgPeriodEnd < now) {
        const orgPeriodStart = org.current_period_start ? new Date(org.current_period_start) : null;

        // Check if this is a new billing period (month changed)
        const needsReset = orgPeriodStart &&
          (new Date(orgPeriodStart).getMonth() !== currentMonth ||
           new Date(orgPeriodStart).getFullYear() !== currentYear);

        if (needsReset) {
          // Archive old usage before resetting
          await supabase.from('usage_metrics').insert({
            organization_id: org.id,
            metric_type: 'billing_period_archive',
            metric_value: org.used_minutes || 0,
            metadata: {
              period_start: org.current_period_start,
              period_end: org.current_period_end,
              archived_at: new Date().toISOString(),
              reason: 'monthly_reset'
            }
          });

          // Reset usage for new period
          updates.push({
            id: org.id,
            current_period_start: periodStart.toISOString(),
            current_period_end: periodEnd.toISOString(),
            used_minutes: 0, // Reset to 0 for new period
            overage_minutes_purchased: 0, // Reset overage too
            updated_at: new Date().toISOString()
          });

          console.log(`[Billing] Reset usage for ${org.name}: new period ${periodStart.toISOString().substring(0, 10)} to ${periodEnd.toISOString().substring(0, 10)}`);
        } else {
          // Just update the period dates
          updates.push({
            id: org.id,
            current_period_start: periodStart.toISOString(),
            current_period_end: periodEnd.toISOString(),
            updated_at: new Date().toISOString()
          });

          console.log(`[Billing] Updated period for ${org.name}: ${periodStart.toISOString().substring(0, 10)} to ${periodEnd.toISOString().substring(0, 10)}`);
        }
      }
    }

    // Batch update all organizations that need updating
    if (updates.length > 0) {
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('organizations')
          .update({
            current_period_start: update.current_period_start,
            current_period_end: update.current_period_end,
            used_minutes: update.used_minutes !== undefined ? update.used_minutes : undefined,
            overage_minutes_purchased: update.overage_minutes_purchased !== undefined ? update.overage_minutes_purchased : undefined,
            updated_at: update.updated_at
          })
          .eq('id', update.id);

        if (updateError) {
          console.error(`[Billing] Failed to update org ${update.id}:`, updateError);
        }
      }

      console.log(`[Billing] Updated ${updates.length} organizations`);
    }

    return { success: true, updated: updates.length };
  } catch (error) {
    console.error('[Billing] Error updating billing periods:', error);
    return { success: false, error };
  }
}

/**
 * Get current period usage for an organization
 * This calculates usage from usage_metrics for the current billing period
 */
export async function getCurrentPeriodUsage(organizationId: string): Promise<number> {
  const supabase = createAdminClient();

  // Get organization's current billing period
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('current_period_start, current_period_end')
    .eq('id', organizationId)
    .single();

  if (orgError || !org) {
    console.error('[Billing] Failed to get organization:', orgError);
    return 0;
  }

  // Use current month if no period is set
  const now = new Date();
  const periodStart = org.current_period_start ||
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const periodEnd = org.current_period_end ||
    new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  // Calculate usage from usage_metrics
  const { data: metrics, error: metricsError } = await supabase
    .from('usage_metrics')
    .select('metric_value')
    .eq('organization_id', organizationId)
    .eq('metric_type', 'minutes_transcribed')
    .gte('created_at', periodStart)
    .lte('created_at', periodEnd);

  if (metricsError) {
    console.error('[Billing] Failed to get usage metrics:', metricsError);
    return 0;
  }

  return (metrics || []).reduce((sum, m) => sum + (m.metric_value || 0), 0);
}

/**
 * Check if organization has exceeded their monthly limit
 */
export async function checkUsageLimit(organizationId: string): Promise<{
  withinLimit: boolean;
  used: number;
  limit: number;
  remaining: number;
}> {
  const supabase = createAdminClient();

  // Ensure billing periods are current
  await ensureCurrentBillingPeriods();

  // Get organization limits
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('max_minutes_monthly, overage_minutes_purchased')
    .eq('id', organizationId)
    .single();

  if (orgError || !org) {
    return { withinLimit: false, used: 0, limit: 0, remaining: 0 };
  }

  // Get current period usage
  const used = await getCurrentPeriodUsage(organizationId);
  const limit = org.max_minutes_monthly + (org.overage_minutes_purchased || 0);
  const remaining = Math.max(0, limit - used);

  return {
    withinLimit: used < limit,
    used,
    limit,
    remaining
  };
}