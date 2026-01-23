-- =====================================================
-- Migration 024: Add Performance Indexes
-- Phase 2.3 - Database Performance Optimization
-- =====================================================

-- NOTE: CREATE INDEX CONCURRENTLY cannot run in a transaction
-- Run each CREATE INDEX statement separately
-- This allows normal database operations to continue

-- =====================================================
-- CALLS TABLE INDEXES
-- =====================================================

-- Index for customer email searches (filtered for non-deleted)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calls_customer_email
ON calls(customer_email)
WHERE deleted_at IS NULL;

-- Index for customer phone searches (filtered for non-deleted)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calls_customer_phone
ON calls(customer_phone)
WHERE deleted_at IS NULL;

-- Index for organization and status queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calls_org_status
ON calls(organization_id, status)
WHERE deleted_at IS NULL;

-- Index for date range queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calls_date_range
ON calls(organization_id, call_date DESC)
WHERE deleted_at IS NULL;

-- Index for processing status tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calls_processing_status
ON calls(status, processing_started_at)
WHERE status IN ('processing', 'pending', 'queued');

-- =====================================================
-- TRANSCRIPTS TABLE INDEXES
-- =====================================================

-- Index for confidence score queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transcripts_confidence
ON transcripts(confidence_score);

-- Index for call_id lookups (if not exists from FK)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transcripts_call_id
ON transcripts(call_id);

-- =====================================================
-- USER_ORGANIZATIONS TABLE INDEXES
-- =====================================================

-- Composite index for organization and role queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_orgs_org_role
ON user_organizations(organization_id, role);

-- Index for user lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_orgs_user_id
ON user_organizations(user_id);

-- =====================================================
-- CALL_FIELDS TABLE INDEXES
-- =====================================================

-- Composite index for call_id and field_name lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_call_fields_composite
ON call_fields(call_id, field_name);

-- Index for template-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_call_fields_template
ON call_fields(template_id)
WHERE template_id IS NOT NULL;

-- =====================================================
-- NOTIFICATIONS TABLE INDEXES
-- =====================================================

-- Index for unread notifications queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_unread
ON notifications(user_id, is_read, created_at DESC)
WHERE is_read = false;

-- Index for notification type queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_type
ON notifications(user_id, notification_type, created_at DESC);

-- =====================================================
-- USAGE_METRICS TABLE INDEXES
-- =====================================================

-- Index for organization usage queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_metrics_org_type
ON usage_metrics(organization_id, metric_type, created_at DESC);

-- Index for date range analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_metrics_date
ON usage_metrics(created_at, organization_id);

-- =====================================================
-- USAGE_RESERVATIONS TABLE INDEXES
-- =====================================================

-- Index for active reservations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_reservations_active
ON usage_reservations(organization_id, status)
WHERE status = 'active';

-- Index for expiry cleanup queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_reservations_expiry
ON usage_reservations(expires_at, status)
WHERE status IN ('active', 'pending');

-- =====================================================
-- REFERRALS TABLE INDEXES
-- =====================================================

-- Index for email lookups (case-insensitive)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_referrals_email_lower
ON referrals(LOWER(referred_email));

-- Index for referrer queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_referrals_referrer_status
ON referrals(referrer_id, status);

-- Index for activation tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_referrals_activation
ON referrals(status, activated_at)
WHERE status = 'pending';

-- =====================================================
-- AUDIT_LOGS TABLE INDEXES
-- =====================================================

-- Index for user activity queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user
ON audit_logs(user_id, created_at DESC);

-- Index for resource-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_resource
ON audit_logs(resource_type, resource_id, created_at DESC)
WHERE resource_id IS NOT NULL;

-- =====================================================
-- ORGANIZATIONS TABLE INDEXES
-- =====================================================

-- Index for slug lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_slug
ON organizations(slug)
WHERE deleted_at IS NULL;

-- Index for subscription management
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_subscription
ON organizations(paddle_subscription_id, subscription_status)
WHERE paddle_subscription_id IS NOT NULL;

-- =====================================================
-- Analyze tables after index creation
-- =====================================================

-- Run these ANALYZE commands after all indexes are created
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
-- Verification Query - Run this to check indexes were created
-- =====================================================

-- Check created indexes
SELECT
    indexname,
    tablename,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes
WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- =====================================================
-- Rollback script (save as 024_add_performance_indexes.down.sql)
-- =====================================================
/*
BEGIN;

-- Drop all created indexes
DROP INDEX IF EXISTS idx_calls_customer_email;
DROP INDEX IF EXISTS idx_calls_customer_phone;
DROP INDEX IF EXISTS idx_calls_org_status;
DROP INDEX IF EXISTS idx_calls_date_range;
DROP INDEX IF EXISTS idx_calls_processing_status;
DROP INDEX IF EXISTS idx_transcripts_confidence;
DROP INDEX IF EXISTS idx_transcripts_call_id;
DROP INDEX IF EXISTS idx_user_orgs_org_role;
DROP INDEX IF EXISTS idx_user_orgs_user_id;
DROP INDEX IF EXISTS idx_call_fields_composite;
DROP INDEX IF EXISTS idx_call_fields_template;
DROP INDEX IF EXISTS idx_notifications_unread;
DROP INDEX IF EXISTS idx_notifications_type;
DROP INDEX IF EXISTS idx_usage_metrics_org_type;
DROP INDEX IF EXISTS idx_usage_metrics_date;
DROP INDEX IF EXISTS idx_usage_reservations_active;
DROP INDEX IF EXISTS idx_usage_reservations_expiry;
DROP INDEX IF EXISTS idx_referrals_email_lower;
DROP INDEX IF EXISTS idx_referrals_referrer_status;
DROP INDEX IF EXISTS idx_referrals_activation;
DROP INDEX IF EXISTS idx_audit_logs_user;
DROP INDEX IF EXISTS idx_audit_logs_resource;
DROP INDEX IF EXISTS idx_organizations_slug;
DROP INDEX IF EXISTS idx_organizations_subscription;

COMMIT;
*/