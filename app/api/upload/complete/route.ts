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
    });

    // Get organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', userId)
      .maybeSingle();

    const organizationId = userOrg?.organization_id || null;

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
        organization_id: organizationId,
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
      try {
        console.log('🚀 Triggering background processing for call:', callData.id);

        // Update call status to processing
        await supabase
          .from('calls')
          .update({
            status: 'processing',
          })
          .eq('id', callData.id);

        // Call processing endpoint asynchronously (fire and forget)
        const processUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/calls/${callData.id}/process`;

        // Use fetch without awaiting to trigger background processing
        // Use Connection: close to avoid chunked encoding HTTP parser issues
        fetch(processUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-processing': 'true',
            'Connection': 'close',
          },
        }).catch((err) => {
          // Log but don't fail - processing will continue in background
          console.error('Failed to trigger processing (non-fatal):', err.message);
        });

        console.log('✅ Background processing triggered for call:', callData.id);

      } catch (error) {
        console.error('Failed to trigger processing:', error);

        // Update status to failed
        await supabase
          .from('calls')
          .update({
            status: 'failed',
            assemblyai_error: error instanceof Error
              ? error.message
              : 'Failed to start processing',
          })
          .eq('id', callData.id);
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
