// =====================================================
// BULK DELETE API
// POST: Bulk delete multiple calls
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body for bulk delete
    const body = await request.json();
    const { callIds } = body;

    if (!Array.isArray(callIds) || callIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request - callIds array required' },
        { status: 400 }
      );
    }

    // Verify user owns all calls
    const { data: calls, error: callsError } = await supabase
      .from('calls')
      .select('id, user_id')
      .in('id', callIds)
      .is('deleted_at', null);

    if (callsError || !calls) {
      return NextResponse.json(
        { error: 'Calls not found' },
        { status: 404 }
      );
    }

    // Check ownership for all calls
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    const unauthorizedCalls = [];
    for (const call of calls) {
      if (call.user_id !== user.id) {
        // Check org membership
        if (userOrg?.organization_id) {
          const { data: callOwnerOrg } = await supabase
            .from('user_organizations')
            .select('organization_id')
            .eq('user_id', call.user_id)
            .single();

          if (callOwnerOrg?.organization_id !== userOrg.organization_id ||
              (userOrg.role !== 'admin' && userOrg.role !== 'owner')) {
            unauthorizedCalls.push(call.id);
          }
        } else {
          unauthorizedCalls.push(call.id);
        }
      }
    }

    if (unauthorizedCalls.length > 0) {
      return NextResponse.json(
        {
          error: 'Forbidden - You do not have permission to delete some calls',
          unauthorizedCalls
        },
        { status: 403 }
      );
    }

    // Perform bulk soft delete
    const adminSupabase = createAdminClient();
    const { error: deleteError } = await adminSupabase
      .from('calls')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in('id', callIds);

    if (deleteError) {
      console.error('Error bulk deleting calls:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete calls' },
        { status: 500 }
      );
    }

    // Cascade delete related data
    await adminSupabase
      .from('transcripts')
      .update({ deleted_at: new Date().toISOString() })
      .in('call_id', callIds);

    await adminSupabase
      .from('call_fields')
      .update({ deleted_at: new Date().toISOString() })
      .in('call_id', callIds);

    await adminSupabase
      .from('call_insights')
      .update({ deleted_at: new Date().toISOString() })
      .in('call_id', callIds);

    await adminSupabase
      .from('call_notes')
      .update({ deleted_at: new Date().toISOString() })
      .in('call_id', callIds);

    // Log the bulk deletion (if audit table exists)
    try {
      await adminSupabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action: 'bulk_delete_calls',
          resource_type: 'call',
          metadata: {
            call_ids: callIds,
            count: callIds.length,
            deleted_at: new Date().toISOString(),
          },
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
          user_agent: request.headers.get('user-agent') || null,
        });
    } catch (auditError) {
      // Audit logging is non-critical, just log the error
      console.log('Audit log error (non-critical):', auditError);
    }

    console.log(`${callIds.length} calls bulk deleted by user ${user.id}`);

    return NextResponse.json({
      success: true,
      message: `${callIds.length} calls deleted successfully`,
      deletedCount: callIds.length,
    });

  } catch (error) {
    console.error('Bulk delete error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Unknown error')
          : 'Failed to delete calls'
      },
      { status: 500 }
    );
  }
}