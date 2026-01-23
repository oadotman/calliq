/**
 * Data Retention Service
 * Phase 5.3 - Implement Data Retention Automation
 *
 * This service handles automated data cleanup based on retention policies
 */

import { createClient } from '@supabase/supabase-js';
import config from '@/config/app.config';

export interface RetentionPolicy {
  planType: string;
  retentionDays: number;
  softDelete: boolean;
  anonymize: boolean;
}

// Retention policies by plan type
export const RETENTION_POLICIES: Record<string, RetentionPolicy> = {
  free: {
    planType: 'free',
    retentionDays: config.gdpr.retentionDaysFree,
    softDelete: false,
    anonymize: true,
  },
  solo: {
    planType: 'solo',
    retentionDays: config.gdpr.retentionDaysPaid,
    softDelete: true,
    anonymize: false,
  },
  team: {
    planType: 'team',
    retentionDays: config.gdpr.retentionDaysPaid,
    softDelete: true,
    anonymize: false,
  },
  enterprise: {
    planType: 'enterprise',
    retentionDays: config.gdpr.retentionDaysEnterprise,
    softDelete: true,
    anonymize: false,
  },
  partner: {
    planType: 'partner',
    retentionDays: config.gdpr.retentionDaysPaid,
    softDelete: true,
    anonymize: false,
  },
};

export class RetentionService {
  private supabase: any;

  constructor() {
    this.supabase = createClient(
      config.services.supabase.url,
      config.services.supabase.serviceKey
    );
  }

  /**
   * Run retention cleanup for all organizations
   */
  async runRetentionCleanup(): Promise<{
    success: boolean;
    processed: number;
    errors: string[];
    details: any[];
  }> {
    const errors: string[] = [];
    const details: any[] = [];
    let processed = 0;

    try {
      // Get all organizations with their plan types
      const { data: organizations, error: orgError } = await this.supabase
        .from('organizations')
        .select('id, name, plan_type, created_at');

      if (orgError) {
        errors.push(`Failed to fetch organizations: ${orgError.message}`);
        return { success: false, processed, errors, details };
      }

      // Process each organization
      for (const org of organizations) {
        try {
          const result = await this.processOrganizationRetention(org);
          details.push(result);
          processed++;
        } catch (error: any) {
          errors.push(`Failed to process org ${org.id}: ${error.message}`);
        }
      }

      return {
        success: errors.length === 0,
        processed,
        errors,
        details,
      };
    } catch (error: any) {
      errors.push(`Retention cleanup failed: ${error.message}`);
      return { success: false, processed, errors, details };
    }
  }

  /**
   * Process retention for a single organization
   */
  private async processOrganizationRetention(org: any): Promise<any> {
    const policy = RETENTION_POLICIES[org.plan_type] || RETENTION_POLICIES.free;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

    const result = {
      organizationId: org.id,
      organizationName: org.name,
      planType: org.plan_type,
      policy,
      cutoffDate,
      callsCleaned: 0,
      transcriptsCleaned: 0,
      metricsCleaned: 0,
      errors: [] as string[],
    };

    try {
      // Clean up calls
      if (policy.softDelete) {
        // Soft delete - just mark as deleted
        const { count: callCount } = await this.supabase
          .from('calls')
          .update({ deleted_at: new Date().toISOString() })
          .eq('organization_id', org.id)
          .lt('created_at', cutoffDate.toISOString())
          .is('deleted_at', null)
          .select('id', { count: 'exact', head: true });

        result.callsCleaned = callCount || 0;
      } else if (policy.anonymize) {
        // Anonymize sensitive data
        const { count: callCount } = await this.supabase
          .from('calls')
          .update({
            customer_name: 'ANONYMIZED',
            customer_email: 'anonymized@example.com',
            customer_phone: 'ANONYMIZED',
            customer_company: 'ANONYMIZED',
            metadata: {},
          })
          .eq('organization_id', org.id)
          .lt('created_at', cutoffDate.toISOString())
          .not('customer_name', 'eq', 'ANONYMIZED')
          .select('id', { count: 'exact', head: true });

        result.callsCleaned = callCount || 0;
      } else {
        // Hard delete - actually remove data
        const { count: callCount } = await this.supabase
          .from('calls')
          .delete()
          .eq('organization_id', org.id)
          .lt('created_at', cutoffDate.toISOString())
          .select('id', { count: 'exact', head: true });

        result.callsCleaned = callCount || 0;
      }

      // Clean up transcripts for old calls
      if (!policy.softDelete && !policy.anonymize) {
        const { count: transcriptCount } = await this.supabase
          .from('transcripts')
          .delete()
          .in(
            'call_id',
            this.supabase
              .from('calls')
              .select('id')
              .eq('organization_id', org.id)
              .lt('created_at', cutoffDate.toISOString())
          )
          .select('id', { count: 'exact', head: true });

        result.transcriptsCleaned = transcriptCount || 0;
      }

      // Clean up old usage metrics
      const { count: metricsCount } = await this.supabase
        .from('usage_metrics')
        .delete()
        .eq('organization_id', org.id)
        .lt('created_at', cutoffDate.toISOString())
        .select('id', { count: 'exact', head: true });

      result.metricsCleaned = metricsCount || 0;

      // Log retention action
      await this.logRetentionAction(org.id, result);

    } catch (error: any) {
      result.errors.push(error.message);
    }

    return result;
  }

  /**
   * Log retention action for audit trail
   */
  private async logRetentionAction(organizationId: string, result: any): Promise<void> {
    try {
      await this.supabase.from('audit_logs').insert({
        action: 'data_retention_cleanup',
        resource_type: 'organization',
        resource_id: organizationId,
        metadata: {
          ...result,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to log retention action:', error);
    }
  }

  /**
   * Check if data should be retained
   */
  async shouldRetainData(
    organizationId: string,
    dataCreatedAt: Date
  ): Promise<boolean> {
    try {
      // Get organization plan type
      const { data: org } = await this.supabase
        .from('organizations')
        .select('plan_type')
        .eq('id', organizationId)
        .single();

      if (!org) return false;

      const policy = RETENTION_POLICIES[org.plan_type] || RETENTION_POLICIES.free;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

      return dataCreatedAt > cutoffDate;
    } catch (error) {
      console.error('Error checking retention policy:', error);
      return true; // Err on the side of retention
    }
  }

  /**
   * Get retention policy for an organization
   */
  async getRetentionPolicy(organizationId: string): Promise<RetentionPolicy | null> {
    try {
      const { data: org } = await this.supabase
        .from('organizations')
        .select('plan_type')
        .eq('id', organizationId)
        .single();

      if (!org) return null;

      return RETENTION_POLICIES[org.plan_type] || RETENTION_POLICIES.free;
    } catch (error) {
      console.error('Error fetching retention policy:', error);
      return null;
    }
  }

  /**
   * Preview what would be deleted for an organization
   */
  async previewRetentionCleanup(organizationId: string): Promise<{
    policy: RetentionPolicy | null;
    cutoffDate: Date;
    affectedCalls: number;
    affectedTranscripts: number;
    affectedMetrics: number;
    totalDataSize: string;
  }> {
    const policy = await this.getRetentionPolicy(organizationId);

    if (!policy) {
      throw new Error('Organization not found or invalid plan type');
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

    // Count affected records
    const { count: callCount } = await this.supabase
      .from('calls')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .lt('created_at', cutoffDate.toISOString())
      .is('deleted_at', null);

    const { count: transcriptCount } = await this.supabase
      .from('transcripts')
      .select('id', { count: 'exact', head: true })
      .in(
        'call_id',
        this.supabase
          .from('calls')
          .select('id')
          .eq('organization_id', organizationId)
          .lt('created_at', cutoffDate.toISOString())
      );

    const { count: metricsCount } = await this.supabase
      .from('usage_metrics')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .lt('created_at', cutoffDate.toISOString());

    // Estimate data size (rough calculation)
    const estimatedSize = (callCount || 0) * 10 + // ~10KB per call
                          (transcriptCount || 0) * 50 + // ~50KB per transcript
                          (metricsCount || 0) * 1; // ~1KB per metric

    return {
      policy,
      cutoffDate,
      affectedCalls: callCount || 0,
      affectedTranscripts: transcriptCount || 0,
      affectedMetrics: metricsCount || 0,
      totalDataSize: this.formatBytes(estimatedSize * 1024),
    };
  }

  /**
   * Format bytes to human-readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

// Export singleton instance
export const retentionService = new RetentionService();