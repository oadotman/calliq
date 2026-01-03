/**
 * Queue Monitoring API
 * Provides real-time queue metrics and management capabilities
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getQueueStats,
  pauseQueue,
  resumeQueue,
  retryFailedJobs,
  cleanCompletedJobs
} from '@/lib/queue/call-processor';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/monitoring/queue
 * Returns queue statistics and health metrics
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
    const action = searchParams.get('action');

    // Get queue statistics
    const stats = await getQueueStats();

    // Get additional metrics if requested
    if (action === 'detailed') {
      const supabase = createClient();

      // Get recent job history
      const { data: recentJobs } = await supabase
        .from('calls')
        .select('id, status, queue_job_id, queued_at, processing_started_at, completed_at, error_message')
        .in('status', ['queued', 'processing', 'failed', 'retrying'])
        .order('queued_at', { ascending: false })
        .limit(20);

      // Get processing time statistics
      const { data: processingStats } = await supabase
        .from('calls')
        .select('processing_time')
        .eq('status', 'completed')
        .not('processing_time', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(100);

      const processingTimes = processingStats?.map(s => s.processing_time) || [];
      const avgProcessingTime = processingTimes.length > 0
        ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
        : 0;
      const maxProcessingTime = processingTimes.length > 0
        ? Math.max(...processingTimes)
        : 0;
      const minProcessingTime = processingTimes.length > 0
        ? Math.min(...processingTimes)
        : 0;

      return NextResponse.json({
        ...stats,
        recentJobs,
        processingMetrics: {
          avg: Math.round(avgProcessingTime),
          max: maxProcessingTime,
          min: minProcessingTime,
          samples: processingTimes.length
        },
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({
      ...stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Queue monitoring error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch queue metrics' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/monitoring/queue
 * Perform queue management operations
 */
export async function POST(request: NextRequest) {
  try {
    // Check authorization and admin role
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin (you might want to add proper role checking)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, params } = body;

    let result;

    switch (action) {
      case 'pause':
        await pauseQueue();
        result = { success: true, message: 'Queue paused' };
        break;

      case 'resume':
        await resumeQueue();
        result = { success: true, message: 'Queue resumed' };
        break;

      case 'retry-failed':
        const retriedCount = await retryFailedJobs();
        result = { success: true, message: `Retried ${retriedCount} failed jobs` };
        break;

      case 'clean-completed':
        const olderThan = params?.olderThan || 86400000; // Default 24 hours
        await cleanCompletedJobs(olderThan);
        result = { success: true, message: 'Cleaned old completed jobs' };
        break;

      case 'process-dlq':
        // Process dead letter queue items
        result = await processDeadLetterQueue();
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Log admin action
    await supabase
      .from('admin_logs')
      .insert({
        user_id: user.id,
        action: `queue_${action}`,
        details: params,
        timestamp: new Date().toISOString()
      });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Queue operation error:', error);
    return NextResponse.json(
      { error: 'Queue operation failed' },
      { status: 500 }
    );
  }
}

/**
 * Process dead letter queue items
 */
async function processDeadLetterQueue(): Promise<any> {
  // This would process items from the DLQ
  // For now, return mock result
  return {
    success: true,
    message: 'Dead letter queue processed',
    processed: 0
  };
}