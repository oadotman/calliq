// =====================================================
// BILLING MAINTENANCE API
// Manually trigger billing period updates and resets
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { ensureCurrentBillingPeriods } from '@/lib/billing-period-manager';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Check for admin token or API key (add your own authentication)
    const authHeader = req.headers.get('authorization');
    const expectedToken = process.env.ADMIN_API_KEY || 'your-secret-admin-key';

    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Billing Maintenance] Starting monthly billing maintenance...');

    // Run the billing period update
    const result = await ensureCurrentBillingPeriods();

    if (!result.success) {
      throw new Error('Failed to update billing periods');
    }

    // Log the maintenance run
    const supabase = createAdminClient();
    await supabase.from('usage_metrics').insert({
      organization_id: null,
      metric_type: 'billing_maintenance',
      metric_value: result.updated || 0,
      metadata: {
        run_at: new Date().toISOString(),
        type: 'api_triggered',
        organizations_updated: result.updated
      }
    });

    console.log(`[Billing Maintenance] Completed. Updated ${result.updated} organizations`);

    return NextResponse.json({
      success: true,
      message: 'Billing periods updated successfully',
      organizationsUpdated: result.updated,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Billing Maintenance] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to run billing maintenance',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check current status
export async function GET(req: NextRequest) {
  try {
    // Check for admin token
    const authHeader = req.headers.get('authorization');
    const expectedToken = process.env.ADMIN_API_KEY || 'your-secret-admin-key';

    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();

    // Get organizations with outdated periods
    const now = new Date();
    const { data: outdatedOrgs, error } = await supabase
      .from('organizations')
      .select('id, name, current_period_end')
      .or(`current_period_end.is.null,current_period_end.lt.${now.toISOString()}`);

    if (error) throw error;

    // Get last maintenance run
    const { data: lastRun } = await supabase
      .from('usage_metrics')
      .select('created_at, metadata')
      .eq('metric_type', 'billing_maintenance')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      needsUpdate: (outdatedOrgs?.length || 0) > 0,
      outdatedOrganizations: outdatedOrgs?.length || 0,
      organizations: outdatedOrgs?.map(o => ({
        id: o.id,
        name: o.name,
        periodEnd: o.current_period_end
      })),
      lastMaintenanceRun: lastRun?.created_at || 'Never',
      currentDate: now.toISOString()
    });

  } catch (error) {
    console.error('[Billing Maintenance] Error checking status:', error);
    return NextResponse.json(
      { error: 'Failed to check billing status' },
      { status: 500 }
    );
  }
}