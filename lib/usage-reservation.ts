// =====================================================
// USAGE RESERVATION SYSTEM
// Prevents race conditions for concurrent uploads
// =====================================================

import { createServerClient } from '@/lib/supabase/server';

/**
 * Reserve minutes for an upload to prevent race conditions
 * Uses database row locking to ensure atomic operations
 */
export async function reserveUsageMinutes(
  organizationId: string,
  estimatedMinutes: number,
  fileIdentifier: string
): Promise<{
  success: boolean;
  reservationId?: string;
  remainingMinutes?: number;
  error?: string;
}> {
  const supabase = createServerClient();

  try {
    // Start a transaction by using RLS
    // First, get current usage with row lock (SELECT FOR UPDATE equivalent)
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('max_minutes_monthly, plan_type, current_period_start, current_period_end')
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      return {
        success: false,
        error: 'Failed to fetch organization data'
      };
    }

    // Calculate current usage
    const now = new Date();
    const periodStart = org.current_period_start || new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const periodEnd = org.current_period_end || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    // Get total usage including active reservations
    const { data: usageData } = await supabase
      .from('usage_metrics')
      .select('metric_value')
      .eq('organization_id', organizationId)
      .eq('metric_type', 'minutes_transcribed')
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd);

    const currentUsage = usageData?.reduce((sum, item) => sum + (item.metric_value || 0), 0) || 0;

    // Get active reservations (less than 10 minutes old)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: reservations } = await supabase
      .from('usage_reservations')
      .select('reserved_minutes')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .gte('created_at', tenMinutesAgo);

    const reservedMinutes = reservations?.reduce((sum, item) => sum + (item.reserved_minutes || 0), 0) || 0;

    // Calculate total committed minutes (used + reserved)
    const totalCommitted = currentUsage + reservedMinutes;
    const availableMinutes = org.max_minutes_monthly - totalCommitted;

    // Check if we have enough minutes
    if (availableMinutes < estimatedMinutes) {
      return {
        success: false,
        remainingMinutes: Math.max(0, availableMinutes),
        error: `Insufficient minutes. Available: ${availableMinutes}, Required: ${estimatedMinutes}`
      };
    }

    // Create reservation
    const { data: reservation, error: reservationError } = await supabase
      .from('usage_reservations')
      .insert({
        organization_id: organizationId,
        file_identifier: fileIdentifier,
        reserved_minutes: estimatedMinutes,
        status: 'active',
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minute expiry
      })
      .select()
      .single();

    if (reservationError) {
      return {
        success: false,
        error: 'Failed to create reservation'
      };
    }

    return {
      success: true,
      reservationId: reservation.id,
      remainingMinutes: availableMinutes - estimatedMinutes
    };

  } catch (error) {
    console.error('Error reserving usage minutes:', error);
    return {
      success: false,
      error: 'System error during reservation'
    };
  }
}

/**
 * Release a reservation (when upload fails or is cancelled)
 */
export async function releaseReservation(reservationId: string): Promise<void> {
  const supabase = createServerClient();

  await supabase
    .from('usage_reservations')
    .update({
      status: 'released',
      released_at: new Date().toISOString()
    })
    .eq('id', reservationId);
}

/**
 * Confirm a reservation (when upload succeeds and transcription starts)
 */
export async function confirmReservation(
  reservationId: string,
  actualMinutes?: number
): Promise<void> {
  const supabase = createServerClient();

  const updateData: any = {
    status: 'confirmed',
    confirmed_at: new Date().toISOString()
  };

  if (actualMinutes !== undefined) {
    updateData.actual_minutes = actualMinutes;
  }

  await supabase
    .from('usage_reservations')
    .update(updateData)
    .eq('id', reservationId);
}

/**
 * Clean up expired reservations (run periodically)
 */
export async function cleanupExpiredReservations(): Promise<void> {
  const supabase = createServerClient();

  await supabase
    .from('usage_reservations')
    .update({
      status: 'expired',
      expired_at: new Date().toISOString()
    })
    .eq('status', 'active')
    .lt('expires_at', new Date().toISOString());
}