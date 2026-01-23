-- =====================================================
-- Migration 024: Add Performance Indexes (Batch Version)
-- This version creates all indexes using a PL/pgSQL function
-- to avoid transaction block issues in Supabase
-- =====================================================

DO $$
DECLARE
    index_count INTEGER := 0;
    start_time TIMESTAMP;
BEGIN
    start_time := clock_timestamp();

    -- =====================================================
    -- CALLS TABLE INDEXES
    -- =====================================================

    -- Index 1: Customer email searches
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_calls_customer_email') THEN
        EXECUTE 'CREATE INDEX idx_calls_customer_email ON calls(customer_email) WHERE deleted_at IS NULL';
        index_count := index_count + 1;
        RAISE NOTICE 'Created index: idx_calls_customer_email';
    END IF;

    -- Index 2: Customer phone searches
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_calls_customer_phone') THEN
        EXECUTE 'CREATE INDEX idx_calls_customer_phone ON calls(customer_phone) WHERE deleted_at IS NULL';
        index_count := index_count + 1;
        RAISE NOTICE 'Created index: idx_calls_customer_phone';
    END IF;

    -- Index 3: Organization and status queries
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_calls_org_status') THEN
        EXECUTE 'CREATE INDEX idx_calls_org_status ON calls(organization_id, status) WHERE deleted_at IS NULL';
        index_count := index_count + 1;
        RAISE NOTICE 'Created index: idx_calls_org_status';
    END IF;

    -- Index 4: Date range queries
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_calls_date_range') THEN
        EXECUTE 'CREATE INDEX idx_calls_date_range ON calls(organization_id, call_date DESC) WHERE deleted_at IS NULL';
        index_count := index_count + 1;
        RAISE NOTICE 'Created index: idx_calls_date_range';
    END IF;

    -- Index 5: Processing status tracking
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_calls_processing_status') THEN
        EXECUTE 'CREATE INDEX idx_calls_processing_status ON calls(status, processing_started_at) WHERE status IN (''processing'', ''pending'', ''queued'')';
        index_count := index_count + 1;
        RAISE NOTICE 'Created index: idx_calls_processing_status';
    END IF;

    -- =====================================================
    -- TRANSCRIPTS TABLE INDEXES
    -- =====================================================

    -- Index 6: Confidence score queries
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_transcripts_confidence') THEN
        EXECUTE 'CREATE INDEX idx_transcripts_confidence ON transcripts(confidence_score)';
        index_count := index_count + 1;
        RAISE NOTICE 'Created index: idx_transcripts_confidence';
    END IF;

    -- Index 7: Call ID lookups
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_transcripts_call_id') THEN
        EXECUTE 'CREATE INDEX idx_transcripts_call_id ON transcripts(call_id)';
        index_count := index_count + 1;
        RAISE NOTICE 'Created index: idx_transcripts_call_id';
    END IF;

    -- =====================================================
    -- USER_ORGANIZATIONS TABLE INDEXES
    -- =====================================================

    -- Index 8: Organization and role queries
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_orgs_org_role') THEN
        EXECUTE 'CREATE INDEX idx_user_orgs_org_role ON user_organizations(organization_id, role)';
        index_count := index_count + 1;
        RAISE NOTICE 'Created index: idx_user_orgs_org_role';
    END IF;

    -- Index 9: User lookups
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_orgs_user_id') THEN
        EXECUTE 'CREATE INDEX idx_user_orgs_user_id ON user_organizations(user_id)';
        index_count := index_count + 1;
        RAISE NOTICE 'Created index: idx_user_orgs_user_id';
    END IF;

    -- =====================================================
    -- CALL_FIELDS TABLE INDEXES
    -- =====================================================

    -- Index 10: Call ID and field name lookups
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_call_fields_composite') THEN
        EXECUTE 'CREATE INDEX idx_call_fields_composite ON call_fields(call_id, field_name)';
        index_count := index_count + 1;
        RAISE NOTICE 'Created index: idx_call_fields_composite';
    END IF;

    -- Index 11: Template-based queries
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_call_fields_template') THEN
        EXECUTE 'CREATE INDEX idx_call_fields_template ON call_fields(template_id) WHERE template_id IS NOT NULL';
        index_count := index_count + 1;
        RAISE NOTICE 'Created index: idx_call_fields_template';
    END IF;

    -- =====================================================
    -- NOTIFICATIONS TABLE INDEXES
    -- =====================================================

    -- Index 12: Unread notifications
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_unread') THEN
        EXECUTE 'CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read, created_at DESC) WHERE is_read = false';
        index_count := index_count + 1;
        RAISE NOTICE 'Created index: idx_notifications_unread';
    END IF;

    -- Index 13: Notification type queries
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_type') THEN
        EXECUTE 'CREATE INDEX idx_notifications_type ON notifications(user_id, notification_type, created_at DESC)';
        index_count := index_count + 1;
        RAISE NOTICE 'Created index: idx_notifications_type';
    END IF;

    -- =====================================================
    -- USAGE_METRICS TABLE INDEXES
    -- =====================================================

    -- Index 14: Organization usage queries
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_usage_metrics_org_type') THEN
        EXECUTE 'CREATE INDEX idx_usage_metrics_org_type ON usage_metrics(organization_id, metric_type, created_at DESC)';
        index_count := index_count + 1;
        RAISE NOTICE 'Created index: idx_usage_metrics_org_type';
    END IF;

    -- Index 15: Date range analytics
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_usage_metrics_date') THEN
        EXECUTE 'CREATE INDEX idx_usage_metrics_date ON usage_metrics(created_at, organization_id)';
        index_count := index_count + 1;
        RAISE NOTICE 'Created index: idx_usage_metrics_date';
    END IF;

    -- =====================================================
    -- USAGE_RESERVATIONS TABLE INDEXES
    -- =====================================================

    -- Index 16: Active reservations
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_usage_reservations_active') THEN
        EXECUTE 'CREATE INDEX idx_usage_reservations_active ON usage_reservations(organization_id, status) WHERE status = ''active''';
        index_count := index_count + 1;
        RAISE NOTICE 'Created index: idx_usage_reservations_active';
    END IF;

    -- Index 17: Expiry cleanup queries
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_usage_reservations_expiry') THEN
        EXECUTE 'CREATE INDEX idx_usage_reservations_expiry ON usage_reservations(expires_at, status) WHERE status IN (''active'', ''pending'')';
        index_count := index_count + 1;
        RAISE NOTICE 'Created index: idx_usage_reservations_expiry';
    END IF;

    -- =====================================================
    -- REFERRALS TABLE INDEXES
    -- =====================================================

    -- Index 18: Email lookups
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_referrals_email_lower') THEN
        EXECUTE 'CREATE INDEX idx_referrals_email_lower ON referrals(LOWER(referred_email))';
        index_count := index_count + 1;
        RAISE NOTICE 'Created index: idx_referrals_email_lower';
    END IF;

    -- Index 19: Referrer queries
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_referrals_referrer_status') THEN
        EXECUTE 'CREATE INDEX idx_referrals_referrer_status ON referrals(referrer_id, status)';
        index_count := index_count + 1;
        RAISE NOTICE 'Created index: idx_referrals_referrer_status';
    END IF;

    -- Index 20: Activation tracking
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_referrals_activation') THEN
        EXECUTE 'CREATE INDEX idx_referrals_activation ON referrals(status, activated_at) WHERE status = ''pending''';
        index_count := index_count + 1;
        RAISE NOTICE 'Created index: idx_referrals_activation';
    END IF;

    -- =====================================================
    -- AUDIT_LOGS TABLE INDEXES
    -- =====================================================

    -- Index 21: User activity queries
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_logs_user') THEN
        EXECUTE 'CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC)';
        index_count := index_count + 1;
        RAISE NOTICE 'Created index: idx_audit_logs_user';
    END IF;

    -- Index 22: Resource-based queries
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_logs_resource') THEN
        EXECUTE 'CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id, created_at DESC) WHERE resource_id IS NOT NULL';
        index_count := index_count + 1;
        RAISE NOTICE 'Created index: idx_audit_logs_resource';
    END IF;

    -- =====================================================
    -- ORGANIZATIONS TABLE INDEXES
    -- =====================================================

    -- Index 23: Slug lookups
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_organizations_slug') THEN
        EXECUTE 'CREATE INDEX idx_organizations_slug ON organizations(slug) WHERE deleted_at IS NULL';
        index_count := index_count + 1;
        RAISE NOTICE 'Created index: idx_organizations_slug';
    END IF;

    -- Index 24: Subscription management
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_organizations_subscription') THEN
        EXECUTE 'CREATE INDEX idx_organizations_subscription ON organizations(paddle_subscription_id, subscription_status) WHERE paddle_subscription_id IS NOT NULL';
        index_count := index_count + 1;
        RAISE NOTICE 'Created index: idx_organizations_subscription';
    END IF;

    -- =====================================================
    -- Final Report
    -- =====================================================

    RAISE NOTICE '';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Index creation completed!';
    RAISE NOTICE 'New indexes created: %', index_count;
    RAISE NOTICE 'Time taken: % seconds', EXTRACT(EPOCH FROM (clock_timestamp() - start_time));
    RAISE NOTICE '=========================================';

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

    RAISE NOTICE 'Table statistics updated';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating indexes: %', SQLERRM;
        RAISE NOTICE 'Indexes created so far: %', index_count;
        RAISE;
END $$;

-- =====================================================
-- Verification Query - Run this after to see all indexes
-- =====================================================

SELECT
    indexname,
    tablename,
    pg_size_pretty(pg_relation_size(schemaname||'.'||indexname::text)) as index_size,
    CASE
        WHEN indexname LIKE 'idx_%' THEN 'Custom'
        ELSE 'System'
    END as index_type
FROM pg_indexes
WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;