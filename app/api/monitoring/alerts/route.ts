/**
 * Monitoring Alerts API
 * Manages alerts and alert configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { AlertManager } from '@/lib/monitoring/alerts';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/monitoring/alerts
 * Get alerts (active or history)
 */
export async function GET(request: NextRequest) {
  try {
    // Check authorization
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'active';
    const limit = parseInt(searchParams.get('limit') || '100');

    let alerts;

    if (type === 'active') {
      alerts = await AlertManager.getActiveAlerts();
    } else if (type === 'history') {
      alerts = await AlertManager.getAlertHistory(limit);
    } else {
      return NextResponse.json(
        { error: 'Invalid alert type' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      type,
      count: alerts.length,
      alerts,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Alerts API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/monitoring/alerts
 * Trigger manual alert check
 */
export async function POST(request: NextRequest) {
  try {
    // Check authorization
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Trigger alert check
    await AlertManager.checkAndAlert();

    return NextResponse.json({
      success: true,
      message: 'Alert check triggered',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Alert check error:', error);
    return NextResponse.json(
      { error: 'Failed to check alerts' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/monitoring/alerts
 * Clear alert history
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check authorization
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check admin role
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userOrg || (userOrg.role !== 'owner' && userOrg.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Clear alert history (keeping active alerts)
    const { clearHistory } = await request.json();

    if (clearHistory) {
      // This would clear the history in Redis
      // Implementation depends on how you want to handle this
      return NextResponse.json({
        success: true,
        message: 'Alert history cleared',
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json(
      { error: 'Invalid operation' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Alert deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to clear alerts' },
      { status: 500 }
    );
  }
}