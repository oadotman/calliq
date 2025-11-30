// =====================================================
// CALL DELETE API
// DELETE: Soft delete a call (set deleted_at timestamp)
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const callId = params.id;

  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user owns the call
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('id, user_id, file_name, customer_name')
      .eq('id', callId)
      .is('deleted_at', null) // Don't allow deleting already deleted calls
      .single();

    if (callError || !call) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    // Check if user owns the call or is part of the same organization
    if (call.user_id !== user.id) {
      // Check if they're in the same organization
      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id, role')
        .eq('user_id', user.id)
        .single();

      if (userOrg?.organization_id) {
        const { data: callOwnerOrg } = await supabase
          .from('user_organizations')
          .select('organization_id')
          .eq('user_id', call.user_id)
          .single();

        // If not in same org or not an admin/owner, deny access
        if (callOwnerOrg?.organization_id !== userOrg.organization_id ||
            (userOrg.role !== 'admin' && userOrg.role !== 'owner')) {
          return NextResponse.json(
            { error: 'Forbidden - You do not have permission to delete this call' },
            { status: 403 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Forbidden - You do not have permission to delete this call' },
          { status: 403 }
        );
      }
    }

    // Perform soft delete
    const adminSupabase = createAdminClient();
    const { error: deleteError } = await adminSupabase
      .from('calls')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', callId);

    if (deleteError) {
      console.error('Error deleting call:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete call' },
        { status: 500 }
      );
    }

    // Also soft delete related data (cascade)
    // Delete transcripts
    await adminSupabase
      .from('transcripts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('call_id', callId);

    // Delete transcript utterances
    const { data: transcripts } = await adminSupabase
      .from('transcripts')
      .select('id')
      .eq('call_id', callId);

    if (transcripts && transcripts.length > 0) {
      await adminSupabase
        .from('transcript_utterances')
        .update({ deleted_at: new Date().toISOString() })
        .in('transcript_id', transcripts.map(t => t.id));
    }

    // Delete call fields
    await adminSupabase
      .from('call_fields')
      .update({ deleted_at: new Date().toISOString() })
      .eq('call_id', callId);

    // Delete call insights
    await adminSupabase
      .from('call_insights')
      .update({ deleted_at: new Date().toISOString() })
      .eq('call_id', callId);

    // Delete call notes
    await adminSupabase
      .from('call_notes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('call_id', callId);

    // Log the deletion in audit logs (if table exists)
    await adminSupabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'delete_call',
        resource_type: 'call',
        resource_id: callId,
        metadata: {
          call_name: call.file_name,
          customer_name: call.customer_name,
          deleted_at: new Date().toISOString(),
        },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        user_agent: request.headers.get('user-agent') || null,
      });

    console.log(`Call ${callId} soft deleted by user ${user.id}`);

    return NextResponse.json({
      success: true,
      message: 'Call deleted successfully',
      callId,
    });

  } catch (error) {
    console.error('Delete call error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Unknown error')
          : 'Failed to delete call'
      },
      { status: 500 }
    );
  }
}

// Bulk delete endpoint
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user
    const supabase = await createClient();
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
    const userOrg = await supabase
      .from('user_organizations')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    const unauthorizedCalls = [];
    for (const call of calls) {
      if (call.user_id !== user.id) {
        // Check org membership
        if (userOrg.data?.organization_id) {
          const callOwnerOrg = await supabase
            .from('user_organizations')
            .select('organization_id')
            .eq('user_id', call.user_id)
            .single();

          if (callOwnerOrg.data?.organization_id !== userOrg.data.organization_id ||
              (userOrg.data.role !== 'admin' && userOrg.data.role !== 'owner')) {
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

    // Log the bulk deletion
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