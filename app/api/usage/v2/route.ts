/**
 * USAGE API V2 - UNIFIED USAGE ENDPOINT
 *
 * This endpoint provides accurate, real-time usage information
 * with automatic synchronization and billing period management
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/server';
import { getAccurateUsage } from '@/lib/usage-tracker-v2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get organization ID from query or user's default
    const { searchParams } = new URL(req.url);
    const queryOrgId = searchParams.get('organizationId');
    const forceSync = searchParams.get('forceSync') === 'true';

    // If no org ID provided, get user's organization
    let organizationId = queryOrgId;

    if (!organizationId) {
      const { createServerClient } = await import('@/lib/supabase/server');
      const supabase = createServerClient();

      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle();

      organizationId = userOrg?.organization_id;
    }

    if (!organizationId) {
      // Return default free plan values
      return NextResponse.json({
        success: true,
        usage: {
          organizationId: null,
          planType: 'free',
          baseMinutes: 30,
          purchasedOverageMinutes: 0,
          minutesUsed: 0,
          totalAvailableMinutes: 30,
          remainingMinutes: 30,
          percentUsed: 0,
          hasOverage: false,
          canUpload: true,
          isOverLimit: false,
          periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
          periodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString(),
          syncStatus: 'unknown',
          // Legacy compatibility fields
          minutesLimit: 30,
          callsProcessed: 0,
          warningLevel: 'none',
        },
      });
    }

    // Get accurate usage with automatic sync
    const usage = await getAccurateUsage(organizationId, forceSync);

    if (!usage) {
      return NextResponse.json({ error: 'Failed to retrieve usage information' }, { status: 500 });
    }

    // Determine warning level for UI
    let warningLevel: 'none' | 'low' | 'medium' | 'high' | 'exceeded' = 'none';
    if (usage.isOverLimit) {
      warningLevel = 'exceeded';
    } else if (usage.percentUsed >= 90) {
      warningLevel = 'high';
    } else if (usage.percentUsed >= 80) {
      warningLevel = 'medium';
    } else if (usage.percentUsed >= 70) {
      warningLevel = 'low';
    }

    // Count processed calls for this period
    const { createServerClient } = await import('@/lib/supabase/server');
    const supabase = createServerClient();

    const { count: callsProcessed } = await supabase
      .from('calls')
      .select('id', { count: 'exact' })
      .eq('organization_id', organizationId)
      .eq('status', 'completed')
      .gte('created_at', usage.periodStart)
      .lte('created_at', usage.periodEnd);

    return NextResponse.json({
      success: true,
      usage: {
        // All fields from DetailedUsageInfo
        ...usage,
        // Additional computed fields
        warningLevel,
        callsProcessed: callsProcessed || 0,
        // Legacy compatibility field
        minutesLimit: usage.baseMinutes,
        // Billing period info
        billingPeriodStart: usage.periodStart,
        billingPeriodEnd: usage.periodEnd,
      },
    });
  } catch (error) {
    console.error('[Usage API V2] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to force usage sync
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organizationId } = await req.json();

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
    }

    // Verify user has access to this organization
    const { createServerClient } = await import('@/lib/supabase/server');
    const supabase = createServerClient();

    const { data: membership } = await supabase
      .from('user_organizations')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: 'Not authorized for this organization' }, { status: 403 });
    }

    // Force sync usage
    const usage = await getAccurateUsage(organizationId, true);

    if (!usage) {
      return NextResponse.json({ error: 'Failed to sync usage' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Usage synchronized successfully',
      usage,
    });
  } catch (error) {
    console.error('[Usage API V2] Sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
