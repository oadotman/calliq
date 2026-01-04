import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, requireAuth } from '@/lib/supabase/server';
import { subDays, subHours } from 'date-fns';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
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
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '24h'; // 24h, 7d, 30d

    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (userError || !userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const organizationId = userData.organization_id;
    const now = new Date();

    // Calculate date range based on period
    let startDate: Date;
    switch (period) {
      case '24h':
        startDate = subHours(now, 24);
        break;
      case '7d':
        startDate = subDays(now, 7);
        break;
      case '30d':
        startDate = subDays(now, 30);
        break;
      default:
        startDate = subHours(now, 24);
    }

    // Fetch performance data
    const [
      callProcessing,
      transcripts,
      callFields,
      callInsights
    ] = await Promise.all([
      // Call processing performance
      supabase
        .from('calls')
        .select(`
          id,
          created_at,
          duration,
          status,
          processing_started_at,
          processing_completed_at,
          processing_attempts,
          processing_error,
          approval_status,
          auto_approved,
          requires_review
        `)
        .eq('organization_id', organizationId)
        .gte('created_at', startDate.toISOString()),

      // Transcription quality
      supabase
        .from('transcripts')
        .select('call_id, confidence_score, word_count, created_at')
        .in('call_id',
          (await supabase
            .from('calls')
            .select('id')
            .eq('organization_id', organizationId)
            .gte('created_at', startDate.toISOString()))
            .data?.map(c => c.id) || []
        ),

      // Field extraction performance
      supabase
        .from('call_fields')
        .select('call_id, confidence_score, created_at')
        .in('call_id',
          (await supabase
            .from('calls')
            .select('id')
            .eq('organization_id', organizationId)
            .gte('created_at', startDate.toISOString()))
            .data?.map(c => c.id) || []
        ),

      // Insights generation
      supabase
        .from('call_insights')
        .select('call_id, confidence_score, created_at')
        .in('call_id',
          (await supabase
            .from('calls')
            .select('id')
            .eq('organization_id', organizationId)
            .gte('created_at', startDate.toISOString()))
            .data?.map(c => c.id) || []
        )
    ]);

    const calls = callProcessing.data || [];
    const transcriptsData = transcripts.data || [];
    const fieldsData = callFields.data || [];
    const insightsData = callInsights.data || [];

    // Calculate performance metrics
    const totalCalls = calls.length;
    const successfulCalls = calls.filter(c => c.status === 'completed').length;
    const failedCalls = calls.filter(c => c.processing_error).length;
    const successRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;

    // Processing time analysis
    const processingTimes = calls
      .filter(c => c.processing_completed_at && c.processing_started_at)
      .map(c => {
        const start = new Date(c.processing_started_at!).getTime();
        const end = new Date(c.processing_completed_at!).getTime();
        return end - start;
      });

    const avgProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
      : 0;

    const p50ProcessingTime = processingTimes.length > 0
      ? processingTimes.sort((a, b) => a - b)[Math.floor(processingTimes.length * 0.5)]
      : 0;

    const p95ProcessingTime = processingTimes.length > 0
      ? processingTimes.sort((a, b) => a - b)[Math.floor(processingTimes.length * 0.95)]
      : 0;

    // Status breakdown
    const statusBreakdown = {
      pending: calls.filter(c => c.status === 'pending').length,
      processing: calls.filter(c => c.status === 'processing').length,
      completed: calls.filter(c => c.status === 'completed').length,
      failed: calls.filter(c => c.status === 'failed').length
    };

    // Review metrics
    const reviewMetrics = {
      requiresReview: calls.filter(c => c.requires_review).length,
      autoApproved: calls.filter(c => c.auto_approved).length,
      approved: calls.filter(c => c.approval_status === 'approved').length,
      rejected: calls.filter(c => c.approval_status === 'rejected').length
    };

    // Quality metrics
    const transcriptQuality = transcriptsData.length > 0
      ? transcriptsData.reduce((sum, t) => sum + (Number(t.confidence_score) || 0), 0) / transcriptsData.length
      : 0;

    const fieldExtractionQuality = fieldsData.length > 0
      ? fieldsData.reduce((sum, f) => sum + (Number(f.confidence_score) || 0), 0) / fieldsData.length
      : 0;

    // Time series data for charts
    const timeSeries = [];
    const intervals = period === '24h' ? 24 : period === '7d' ? 7 : 30;
    const intervalUnit = period === '24h' ? 'hour' : 'day';

    for (let i = intervals - 1; i >= 0; i--) {
      const intervalStart = intervalUnit === 'hour'
        ? subHours(now, i)
        : subDays(now, i);

      const intervalEnd = intervalUnit === 'hour'
        ? subHours(now, i - 1)
        : subDays(now, i - 1);

      const intervalCalls = calls.filter(c => {
        const callDate = new Date(c.created_at);
        return callDate >= intervalStart && callDate < intervalEnd;
      });

      const intervalErrors = intervalCalls.filter(c => c.processing_error).length;

      timeSeries.push({
        timestamp: intervalStart.toISOString(),
        calls: intervalCalls.length,
        successRate: intervalCalls.length > 0
          ? (intervalCalls.filter(c => c.status === 'completed').length / intervalCalls.length) * 100
          : 0,
        errors: intervalErrors,
        avgProcessingTime: intervalCalls
          .filter(c => c.processing_completed_at && c.processing_started_at)
          .map(c => {
            const start = new Date(c.processing_started_at!).getTime();
            const end = new Date(c.processing_completed_at!).getTime();
            return end - start;
          })
          .reduce((sum, time, _, arr) => arr.length > 0 ? sum / arr.length : 0, 0)
      });
    }

    const performance = {
      summary: {
        totalCalls,
        successfulCalls,
        failedCalls,
        successRate,
        avgProcessingTime,
        p50ProcessingTime,
        p95ProcessingTime,
        transcriptQuality,
        fieldExtractionQuality
      },
      statusBreakdown,
      reviewMetrics,
      qualityMetrics: {
        transcriptionConfidence: transcriptQuality,
        extractionConfidence: fieldExtractionQuality,
        totalTranscripts: transcriptsData.length,
        totalFieldsExtracted: fieldsData.length,
        totalInsights: insightsData.length
      },
      timeSeries,
      period
    };

    return NextResponse.json(performance);

  } catch (error) {
    console.error('Performance API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch performance data' },
      { status: 500 }
    );
  }
}