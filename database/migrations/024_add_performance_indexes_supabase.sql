-- =====================================================
-- Migration 024: Add Performance Indexes (Supabase Version)
-- Phase 2.3 - Database Performance Optimization
-- =====================================================

-- IMPORTANT: In Supabase SQL Editor, you need to run each CREATE INDEX
-- statement ONE AT A TIME. Select each statement individually and run it.
-- This is because CREATE INDEX CONCURRENTLY cannot run in a transaction.

-- =====================================================
-- STEP 1: Run each of these individually
-- =====================================================

-- 1. Index for customer email searches (filtered for non-deleted)
CREATE INDEX IF NOT EXISTS idx_calls_customer_email
ON calls(customer_email)
WHERE deleted_at IS NULL;

-- 2. Index for customer phone searches (filtered for non-deleted)
CREATE INDEX IF NOT EXISTS idx_calls_customer_phone
ON calls(customer_phone)
WHERE deleted_at IS NULL;

-- 3. Index for organization and status queries
CREATE INDEX IF NOT EXISTS idx_calls_org_status
ON calls(organization_id, status)
WHERE deleted_at IS NULL;

-- 4. Index for date range queries
CREATE INDEX IF NOT EXISTS idx_calls_date_range
ON calls(organization_id, call_date DESC)
WHERE deleted_at IS NULL;

-- 5. Index for processing status tracking
CREATE INDEX IF NOT EXISTS idx_calls_processing_status
ON calls(status, processing_started_at)
WHERE status IN ('processing', 'pending', 'queued');

-- 6. Index for confidence score queries
CREATE INDEX IF NOT EXISTS idx_transcripts_confidence
ON transcripts(confidence_score);

-- 7. Index for call_id lookups
CREATE INDEX IF NOT EXISTS idx_transcripts_call_id
ON transcripts(call_id);

-- 8. Composite index for organization and role queries
CREATE INDEX IF NOT EXISTS idx_user_orgs_org_role
ON user_organizations(organization_id, role);

-- 9. Index for user lookups
CREATE INDEX IF NOT EXISTS idx_user_orgs_user_id
ON user_organizations(user_id);

-- 10. Composite index for call_id and field_name lookups
CREATE INDEX IF NOT EXISTS idx_call_fields_composite
ON call_fields(call_id, field_name);

-- 11. Index for template-based queries
CREATE INDEX IF NOT EXISTS idx_call_fields_template
ON call_fields(template_id)
WHERE template_id IS NOT NULL;

-- 12. Index for unread notifications queries
CREATE INDEX IF NOT EXISTS idx_notifications_unread
ON notifications(user_id, is_read, created_at DESC)
WHERE is_read = false;

-- 13. Index for notification type queries
CREATE INDEX IF NOT EXISTS idx_notifications_type
ON notifications(user_id, notification_type, created_at DESC);

-- 14. Index for organization usage queries
CREATE INDEX IF NOT EXISTS idx_usage_metrics_org_type
ON usage_metrics(organization_id, metric_type, created_at DESC);

-- 15. Index for date range analytics
CREATE INDEX IF NOT EXISTS idx_usage_metrics_date
ON usage_metrics(created_at, organization_id);

-- 16. Index for active reservations
CREATE INDEX IF NOT EXISTS idx_usage_reservations_active
ON usage_reservations(organization_id, status)
WHERE status = 'active';

-- 17. Index for expiry cleanup queries
CREATE INDEX IF NOT EXISTS idx_usage_reservations_expiry
ON usage_reservations(expires_at, status)
WHERE status IN ('active', 'pending');

-- 18. Index for email lookups (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_referrals_email_lower
ON referrals(LOWER(referred_email));

-- 19. Index for referrer queries
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_status
ON referrals(referrer_id, status);

-- 20. Index for activation tracking
CREATE INDEX IF NOT EXISTS idx_referrals_activation
ON referrals(status, activated_at)
WHERE status = 'pending';

-- 21. Index for user activity queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user
ON audit_logs(user_id, created_at DESC);

-- 22. Index for resource-based queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource
ON audit_logs(resource_type, resource_id, created_at DESC)
WHERE resource_id IS NOT NULL;

-- 23. Index for slug lookups
CREATE INDEX IF NOT EXISTS idx_organizations_slug
ON organizations(slug)
WHERE deleted_at IS NULL;

-- 24. Index for subscription management
CREATE INDEX IF NOT EXISTS idx_organizations_subscription
ON organizations(paddle_subscription_id, subscription_status)
WHERE paddle_subscription_id IS NOT NULL;

-- =====================================================
-- STEP 2: After creating all indexes, run this as a group
-- =====================================================

-- Analyze tables to update statistics
ANALYZE calls;
ANALYZE transcripts;
ANALYZE call_fields;
ANALYZE user_organizations;
ANALYZE notifications;
ANALYZE usage_metrics;
ANALYZE usage_reservations;
ANALYZE referrals;
ANALYZE audit_logs;
ANALYZE organizations;

-- =====================================================
-- STEP 3: Verify indexes were created
-- =====================================================

SELECT
    indexname,
    tablename,
    pg_size_pretty(pg_relation_size(schemaname||'.'||indexname::text)) as index_size
FROM pg_indexes
WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;