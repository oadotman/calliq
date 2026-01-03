// =====================================================
// UPLOAD COMPLETION API
// Called after direct upload to Supabase completes
// Creates database record and triggers processing
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, requireAuth } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;
    const supabase = createServerClient();

    // Parse request body
    const body = await req.json();
    const {
      path,
      fileName,
      fileSize,
      mimeType,
      customerName,
      customerEmail,
      customerPhone,
      customerCompany,
      salesRep,
      callDate,
      callType,
      participants,
      templateId, // Extract templateId from request
      audioDuration, // Extract audio duration in seconds
      typedNotes, // Extract typed notes from request
      organizationId, // CRITICAL: Explicit organization ID from frontend
    } = body;

    // Validate required fields
    if (!path || !fileName || !fileSize || !mimeType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('Upload completion:', {
      userId,
      path,
      fileName,
      fileSize,
      audioDuration,
      durationMinutes: audioDuration ? Math.ceil(audioDuration / 60) : null,
      organizationId: organizationId || 'not provided',
    });

    // CRITICAL FIX: Use the organization ID from the request
    // If not provided (old clients), fall back to user's default organization
    let finalOrganizationId = organizationId;

    if (!finalOrganizationId) {
      console.warn('⚠️ No organization ID provided in upload request - falling back to user default');

      // Get user's default organization (their first/primary one)
      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', userId)
        .order('joined_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      finalOrganizationId = userOrg?.organization_id || null;
    } else {
      // Verify the user belongs to the specified organization
      const { data: membership } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', userId)
        .eq('organization_id', finalOrganizationId)
        .maybeSingle();

      if (!membership) {
        console.error('❌ User does not belong to specified organization');
        return NextResponse.json(
          { error: 'Invalid organization' },
          { status: 403 }
        );
      }
    }

    // Get public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from('call-audio')
      .getPublicUrl(path);

    console.log('File public URL:', publicUrl);

    // Get default sales rep name
    const defaultSalesRep = user.user_metadata?.full_name || user.email || 'Unknown';

    // Create call record in database
    const { data: callData, error: dbError } = await supabase
      .from('calls')
      .insert({
        user_id: userId,
        organization_id: finalOrganizationId,
        file_name: fileName,
        file_size: fileSize,
        file_url: publicUrl,
        mime_type: mimeType,
        customer_name: customerName || null,
        customer_email: customerEmail || null,
        customer_phone: customerPhone || null,
        customer_company: customerCompany || null,
        sales_rep: salesRep || defaultSalesRep,
        call_date: callDate ? new Date(callDate).toISOString() : new Date().toISOString(),
        call_type: callType || null,
        status: 'uploading',
        uploaded_at: new Date().toISOString(),
        metadata: participants ? { participants } : null,
        template_id: templateId || null, // Save the selected template
        duration: audioDuration ? Math.round(audioDuration) : null, // Duration in seconds
        duration_minutes: audioDuration ? Math.ceil(audioDuration / 60) : null, // Duration in minutes
        typed_notes: typedNotes || null, // Save the typed notes
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);

      // Clean up uploaded file
      await supabase.storage.from('call-audio').remove([path]);

      return NextResponse.json(
        { error: 'Failed to create call record: ' + dbError.message },
        { status: 500 }
      );
    }

    console.log('Call record created:', callData.id);

    // Check user preferences for auto-transcription
    const { data: userPreferences } = await supabase
      .from('user_preferences')
      .select('auto_transcribe')
      .eq('user_id', userId)
      .maybeSingle();

    const shouldAutoTranscribe = userPreferences?.auto_transcribe ?? true;

    if (shouldAutoTranscribe) {
      console.log('🚀 Starting call processing:', callData.id);

      // Try to start processing synchronously with proper error handling
      let processingStarted = false;
      let lastError = null;

      // First try queue system
      try {
        const { enqueueCallProcessing } = await import('@/lib/queue/call-processor');

        const processingJob = {
          callId: callData.id,
          userId: userId,
          organizationId: callData.organization_id,
          fileUrl: callData.file_url,
          fileName: callData.file_name,
          duration: callData.duration || 0,
          metadata: {
            customerName: callData.customer_name,
            templateId: callData.template_id,
            callType: callData.call_type
          }
        };

        await enqueueCallProcessing(processingJob);
        processingStarted = true;
        console.log('✅ Call enqueued for processing:', callData.id);

      } catch (queueError) {
        console.error('Queue processing failed, trying direct processing:', queueError);
        lastError = queueError;

        // Fallback to direct processing with retries
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://synqall.com';
        const processUrl = `${baseUrl}/api/calls/${callData.id}/process`;

        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const processResponse = await fetch(processUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-internal-processing': 'true',
              },
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!processResponse.ok) {
              throw new Error(`Direct processing failed: ${processResponse.status}`);
            }

            processingStarted = true;
            console.log('✅ Fallback: Direct processing started for:', callData.id);
            break;

          } catch (directError) {
            lastError = directError;
            console.error(`Direct processing attempt ${attempt + 1} failed:`, directError.message);

            if (attempt < 2) {
              await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
            }
          }
        }
      }

      // If processing couldn't be started, update status to failed
      if (!processingStarted) {
        console.error('❌ All processing attempts failed:', lastError);

        await supabase
          .from('calls')
          .update({
            status: 'failed',
            assemblyai_error: 'Processing unavailable. Please try again later or use manual transcription.',
          })
          .eq('id', callData.id);

        // Still return success for upload, but indicate processing failed
        return NextResponse.json({
          success: true,
          call: callData,
          message: 'Upload completed but automatic processing failed. Please start transcription manually.',
          processingFailed: true,
        });
      }
    } else {
      console.log('Auto-transcribe disabled, leaving call in uploaded state');
    }

    // Create notification
    await supabase.from('notifications').insert({
      user_id: userId,
      notification_type: 'call_uploaded',
      title: 'Call uploaded successfully',
      message: shouldAutoTranscribe
        ? `Your call with ${customerName || 'customer'} is being processed. This usually takes 3-6 minutes.`
        : `Your call with ${customerName || 'customer'} has been uploaded. Click "Start Transcription" to process it.`,
      link: `/calls/${callData.id}`,
    });

    // Return success response
    return NextResponse.json({
      success: true,
      call: callData,
      message: 'Upload completed successfully',
    });

  } catch (error) {
    console.error('Upload completion error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
