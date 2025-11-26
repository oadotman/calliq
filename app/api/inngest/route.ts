// =====================================================
// INNGEST API ENDPOINT
// Serves Inngest functions and handles job execution
// =====================================================

import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { processTranscription } from '@/lib/inngest/functions/process-transcription';
import { processApproval } from '@/lib/inngest/functions/process-approval';
import { processExtraction } from '@/lib/inngest/functions/process-extraction';
import { retentionCleanupJob, auditLogCleanupJob } from '@/lib/inngest/functions/retention-cleanup';

// Register all Inngest functions
// Note: Using landingPage: false to prevent body parsing issues in development
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processTranscription,    // Handles transcription workflow
    processApproval,         // Handles approval workflow (NEW - HITL)
    processExtraction,       // Handles CRM extraction workflow
    retentionCleanupJob,     // Daily data retention cleanup (GDPR)
    auditLogCleanupJob,      // Weekly audit log anonymization (GDPR)
  ],
  servePath: '/api/inngest',
  // Only use signing key in production
  signingKey: process.env.INNGEST_SIGNING_KEY,
});
