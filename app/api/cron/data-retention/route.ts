/**
 * Data Retention Cron Job API
 * Phase 5.3 - Automated Data Cleanup
 *
 * This endpoint should be called daily via cron job to clean up old data
 * Can be triggered by Vercel Cron, GitHub Actions, or external cron services
 */

import { NextRequest, NextResponse } from 'next/server';
import { retentionService } from '@/lib/data-retention/retention-service';
import { createClient } from '@supabase/supabase-js';
import config from '@/config/app.config';

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET || 'your-secure-cron-secret';

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if retention cleanup is enabled
    if (!config.features.enableGDPR) {
      return NextResponse.json({
        success: false,
        message: 'Data retention cleanup is disabled',
      });
    }

    console.log('[Data Retention] Starting cleanup job at', new Date().toISOString());

    // Run retention cleanup
    const result = await retentionService.runRetentionCleanup();

    console.log('[Data Retention] Cleanup completed:', {
      processed: result.processed,
      errors: result.errors.length,
    });

    // Log to system logs
    const supabase = createClient(
      config.services.supabase.url,
      config.services.supabase.serviceKey
    );

    await supabase.from('system_logs').insert({
      log_type: 'data_retention_cleanup',
      message: `Data retention cleanup completed: ${result.processed} organizations processed`,
      metadata: {
        ...result,
        timestamp: new Date().toISOString(),
        environment: config.app.environment,
      },
    });

    // Send notification if there were errors
    if (result.errors.length > 0) {
      console.error('[Data Retention] Errors during cleanup:', result.errors);
      // TODO: Send email notification to admin
    }

    return NextResponse.json({
      success: result.success,
      processed: result.processed,
      errors: result.errors,
      summary: {
        totalCallsCleaned: result.details.reduce((sum, d) => sum + d.callsCleaned, 0),
        totalTranscriptsCleaned: result.details.reduce((sum, d) => sum + d.transcriptsCleaned, 0),
        totalMetricsCleaned: result.details.reduce((sum, d) => sum + d.metricsCleaned, 0),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Data Retention] Cron job failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility
export async function POST(req: NextRequest) {
  return GET(req);
}