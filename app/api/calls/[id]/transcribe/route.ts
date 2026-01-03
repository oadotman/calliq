// =====================================================
// MANUAL TRANSCRIPTION TRIGGER API
// POST: Start transcription for an uploaded call
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

    // Get call record
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('*')
      .eq('id', callId)
      .eq('user_id', user.id) // Ensure user owns the call
      .single();

    if (callError || !call) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    // Check if call is in a state that can be transcribed
    if (call.status !== 'uploaded' && call.status !== 'failed') {
      return NextResponse.json(
        { error: `Call is currently in "${call.status}" state. Can only transcribe calls in "uploaded" or "failed" state.` },
        { status: 400 }
      );
    }

    // Check if audio URL exists
    if (!call.audio_url && !call.file_url) {
      return NextResponse.json(
        { error: 'No audio file found for this call' },
        { status: 400 }
      );
    }

    // Trigger background processing directly (no Inngest needed)
    try {
      console.log('🚀 Triggering background processing for call:', callId);

      // Update call status to processing
      await supabase
        .from('calls')
        .update({
          status: 'processing',
          assemblyai_error: null, // Clear any previous errors
        })
        .eq('id', callId);

      // Trigger processing with retry logic
      const processUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/calls/${callId}/process`;

      // Retry logic with exponential backoff
      let processingStarted = false;
      let lastError = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

          const response = await fetch(processUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-processing': 'true',
              'Connection': 'close',
            },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Processing endpoint returned ${response.status}: ${errorText}`);
          }

          processingStarted = true;
          console.log('✅ Processing successfully started for call:', callId);
          break;

        } catch (error) {
          lastError = error;
          console.error(`Attempt ${attempt + 1} failed to start processing:`, error.message);

          // If not the last attempt, wait before retrying
          if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt))); // Exponential backoff
          }
        }
      }

      // If all attempts failed, revert status and return error
      if (!processingStarted) {
        console.error('❌ All attempts to start processing failed:', lastError);

        // Revert status to uploaded
        await supabase
          .from('calls')
          .update({
            status: 'uploaded',
            assemblyai_error: `Failed to start processing: ${lastError?.message || 'Unknown error'}`,
          })
          .eq('id', callId);

        return NextResponse.json(
          { error: 'Failed to start processing after 3 attempts. Please try again.' },
          { status: 500 }
        );
      }

      // Create notification
      await supabase.from('notifications').insert({
        user_id: user.id,
        notification_type: 'call_processing',
        title: 'Transcription started',
        message: `Your call with ${call.customer_name || 'customer'} is now being transcribed. This usually takes 3-6 minutes.`,
        link: `/calls/${callId}`,
      });

      return NextResponse.json({
        success: true,
        message: 'Transcription started successfully',
        call: {
          id: call.id,
          status: 'processing',
        },
      });

    } catch (error) {
      console.error('Failed to trigger transcription:', error);

      // Update status to failed
      await supabase
        .from('calls')
        .update({
          status: 'failed',
          assemblyai_error: error instanceof Error
            ? error.message
            : 'Failed to start transcription',
        })
        .eq('id', callId);

      return NextResponse.json(
        { error: 'Failed to start transcription. Please try again.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Transcription trigger error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
