// =====================================================
// TYPED NOTES API
// POST: Save optional typed notes for a call
// GET: Retrieve typed notes for a call
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, requireAuth } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const user = await requireAuth();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createServerClient();
    const callId = params.id;

    // Get the notes from request body
    const { notes } = await request.json();

    // Validate notes length (max 5000 characters)
    if (notes && notes.length > 5000) {
      return NextResponse.json(
        { error: 'Notes cannot exceed 5000 characters' },
        { status: 400 }
      );
    }

    // Get call record to verify ownership and status
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('id, status, user_id')
      .eq('id', callId)
      .eq('user_id', user.id) // Ensure user owns the call
      .single();

    if (callError || !call) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    // Only allow notes to be added/updated for transcribed or completed calls
    const allowedStatuses = ['transcribed', 'completed', 'extracting', 'processing'];
    if (!allowedStatuses.includes(call.status)) {
      return NextResponse.json(
        { error: `Cannot add notes to a call in "${call.status}" status. Please wait for transcription to complete.` },
        { status: 400 }
      );
    }

    // Update the typed_notes field
    const { data: updatedCall, error: updateError } = await supabase
      .from('calls')
      .update({
        typed_notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', callId)
      .eq('user_id', user.id)
      .select('id, typed_notes')
      .single();

    if (updateError) {
      console.error('Error updating typed notes:', updateError);
      return NextResponse.json(
        { error: 'Failed to save notes' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Notes saved successfully',
      data: {
        callId: updatedCall.id,
        notes: updatedCall.typed_notes
      }
    });

  } catch (error) {
    console.error('Error in notes API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const user = await requireAuth();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createServerClient();
    const callId = params.id;

    // Get call record with typed_notes
    const { data: call, error } = await supabase
      .from('calls')
      .select('id, typed_notes')
      .eq('id', callId)
      .eq('user_id', user.id) // Ensure user owns the call
      .single();

    if (error || !call) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        callId: call.id,
        notes: call.typed_notes || ''
      }
    });

  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}