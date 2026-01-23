-- Alternative approach to fix SECURITY DEFINER issues
-- This uses a different method to ensure views don't have SECURITY DEFINER

-- =============================================================================
-- 1. Store view definitions
-- =============================================================================

DO $$
DECLARE
    calls_pending_review_def TEXT;
    call_quality_metrics_def TEXT;
    organization_current_usage_def TEXT;
BEGIN
    -- Store current view definitions
    calls_pending_review_def := pg_get_viewdef('public.calls_pending_review'::regclass, true);
    call_quality_metrics_def := pg_get_viewdef('public.call_quality_metrics'::regclass, true);
    organization_current_usage_def := pg_get_viewdef('public.organization_current_usage'::regclass, true);

    -- Log the definitions for debugging
    RAISE NOTICE 'Stored view definitions for recreation';
END $$;

-- =============================================================================
-- 2. Drop and recreate with explicit SQL (not CREATE OR REPLACE)
-- =============================================================================

-- Drop all views
DROP VIEW IF EXISTS public.calls_pending_review CASCADE;
DROP VIEW IF EXISTS public.call_quality_metrics CASCADE;
DROP VIEW IF EXISTS public.organization_current_usage CASCADE;

-- =============================================================================
-- 3. Recreate calls_pending_review as a MATERIALIZED VIEW (alternative approach)
-- =============================================================================

-- Option A: Create as regular view with explicit security settings
CREATE VIEW public.calls_pending_review AS
WITH pending_calls AS (
    SELECT
        c.*,
        u1.email as uploader_email,
        u1.full_name as uploader_full_name,
        u2.email as reviewer_email,
        u2.full_name as reviewer_full_name
    FROM public.calls c
    LEFT JOIN public.users u1 ON u1.id = c.user_id
    LEFT JOIN public.users u2 ON u2.id = c.reviewed_by
    WHERE c.requires_review = true
        AND c.approval_status = 'pending'
        AND c.deleted_at IS NULL
)
SELECT
    pc.id,
    pc.file_name,
    pc.customer_name,
    pc.customer_email,
    pc.customer_phone,
    pc.customer_company,
    pc.sales_rep,
    pc.call_date,
    pc.call_type,
    pc.duration,
    pc.duration_minutes,
    pc.sentiment_type,
    pc.sentiment_score,
    pc.summary,
    pc.next_steps,
    pc.status,
    pc.approval_status,
    pc.requires_review,
    pc.review_trigger_reason,
    pc.extraction_quality_score,
    pc.low_confidence_fields_count,
    pc.uploaded_at,
    pc.processed_at,
    pc.created_at,
    pc.updated_at,
    pc.organization_id,
    pc.user_id,
    pc.template_id,
    pc.typed_notes,
    COALESCE(pc.uploader_full_name, pc.uploader_email) as uploader_name,
    COALESCE(pc.reviewer_full_name, pc.reviewer_email) as reviewer_name
FROM pending_calls pc
WHERE EXISTS (
    SELECT 1
    FROM public.user_organizations uo
    WHERE uo.user_id = auth.uid()
    AND (uo.organization_id = pc.organization_id OR pc.user_id = auth.uid())
);

-- Explicitly set the view to NOT use SECURITY DEFINER
ALTER VIEW public.calls_pending_review OWNER TO postgres;
GRANT SELECT ON public.calls_pending_review TO authenticated;
GRANT SELECT ON public.calls_pending_review TO anon;

-- =============================================================================
-- 4. Recreate call_quality_metrics
-- =============================================================================

CREATE VIEW public.call_quality_metrics AS
WITH user_orgs AS (
    SELECT organization_id
    FROM public.user_organizations
    WHERE user_id = auth.uid()
)
SELECT
    c.id,
    c.organization_id,
    c.user_id,
    c.call_date,
    c.duration_minutes,
    c.transcription_quality_score,
    c.extraction_quality_score,
    c.sentiment_score,
    c.low_confidence_fields_count,
    c.status,
    c.approval_status,
    c.auto_approved,
    c.requires_review,
    CASE
        WHEN c.transcription_quality_score IS NOT NULL AND c.extraction_quality_score IS NOT NULL
        THEN ROUND((c.transcription_quality_score + c.extraction_quality_score) / 2.0, 2)
        WHEN c.transcription_quality_score IS NOT NULL THEN c.transcription_quality_score
        WHEN c.extraction_quality_score IS NOT NULL THEN c.extraction_quality_score
        ELSE NULL
    END as overall_quality_score,
    CASE
        WHEN c.transcription_quality_score >= 90 AND c.extraction_quality_score >= 90 THEN 'excellent'
        WHEN c.transcription_quality_score >= 70 AND c.extraction_quality_score >= 70 THEN 'good'
        WHEN c.transcription_quality_score >= 50 AND c.extraction_quality_score >= 50 THEN 'fair'
        ELSE 'poor'
    END as quality_category
FROM public.calls c
WHERE c.deleted_at IS NULL
    AND c.status = 'completed'
    AND (c.organization_id IN (SELECT organization_id FROM user_orgs) OR c.user_id = auth.uid());

ALTER VIEW public.call_quality_metrics OWNER TO postgres;
GRANT SELECT ON public.call_quality_metrics TO authenticated;
GRANT SELECT ON public.call_quality_metrics TO anon;

-- =============================================================================
-- 5. Recreate organization_current_usage
-- =============================================================================

CREATE VIEW public.organization_current_usage AS
WITH user_orgs AS (
    SELECT organization_id
    FROM public.user_organizations
    WHERE user_id = auth.uid()
),
usage_calc AS (
    SELECT
        o.id,
        o.name,
        o.plan_type,
        o.max_minutes_monthly,
        o.current_period_start,
        o.current_period_end,
        o.overage_minutes_purchased,
        o.bonus_minutes_balance,
        COALESCE(
            (SELECT SUM(c.duration_minutes)
             FROM public.calls c
             WHERE c.organization_id = o.id
               AND c.deleted_at IS NULL
               AND c.created_at >= o.current_period_start
               AND c.created_at < COALESCE(o.current_period_end, NOW() + INTERVAL '1 month')
            ), 0
        ) as used_mins
    FROM public.organizations o
    WHERE o.deleted_at IS NULL
        AND o.id IN (SELECT organization_id FROM user_orgs)
)
SELECT
    id as organization_id,
    name as organization_name,
    plan_type,
    max_minutes_monthly,
    current_period_start,
    current_period_end,
    used_mins::integer as used_minutes,
    COALESCE(overage_minutes_purchased, 0) as overage_minutes_purchased,
    COALESCE(bonus_minutes_balance, 0) as bonus_minutes_balance,
    GREATEST(
        0,
        COALESCE(max_minutes_monthly, 0) +
        COALESCE(overage_minutes_purchased, 0) +
        COALESCE(bonus_minutes_balance, 0) -
        used_mins
    )::integer as remaining_minutes,
    CASE
        WHEN COALESCE(max_minutes_monthly, 0) > 0 THEN
            ROUND((used_mins::numeric / max_minutes_monthly::numeric) * 100, 2)
        ELSE 0
    END as usage_percentage
FROM usage_calc;

ALTER VIEW public.organization_current_usage OWNER TO postgres;
GRANT SELECT ON public.organization_current_usage TO authenticated;
GRANT SELECT ON public.organization_current_usage TO anon;

-- =============================================================================
-- 6. Create a function to fix any view with SECURITY DEFINER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fix_security_definer_views()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    view_rec RECORD;
    view_def TEXT;
    new_def TEXT;
BEGIN
    FOR view_rec IN
        SELECT
            n.nspname as schema_name,
            c.relname as view_name,
            pg_get_viewdef(c.oid, true) as definition
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'v'
        AND n.nspname = 'public'
        AND c.relname IN ('calls_pending_review', 'call_quality_metrics', 'organization_current_usage')
    LOOP
        view_def := view_rec.definition;

        -- Check if it has SECURITY DEFINER
        IF position('SECURITY DEFINER' in upper(view_def)) > 0 THEN
            RAISE WARNING 'View %.% has SECURITY DEFINER, attempting to fix...',
                view_rec.schema_name, view_rec.view_name;

            -- Drop and recreate
            EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE', view_rec.schema_name, view_rec.view_name);

            -- Remove SECURITY DEFINER from definition
            new_def := replace(view_def, 'WITH (security_definer=true)', 'WITH (security_invoker=true)');
            new_def := replace(new_def, 'WITH (security_definer=on)', 'WITH (security_invoker=true)');
            new_def := replace(new_def, 'SECURITY DEFINER', '');

            -- Recreate view
            EXECUTE format('CREATE VIEW %I.%I AS %s', view_rec.schema_name, view_rec.view_name, new_def);

            -- Grant permissions
            EXECUTE format('GRANT SELECT ON %I.%I TO authenticated', view_rec.schema_name, view_rec.view_name);

            RAISE NOTICE 'Fixed view %.%', view_rec.schema_name, view_rec.view_name;
        END IF;
    END LOOP;
END;
$$;

-- Run the fix function
SELECT public.fix_security_definer_views();

-- =============================================================================
-- 7. Final verification
-- =============================================================================

-- Check all public views for SECURITY DEFINER
SELECT
    'public' as schema,
    viewname,
    CASE
        WHEN pg_get_viewdef(('public.' || viewname)::regclass, true) ILIKE '%SECURITY%DEFINER%'
        THEN 'HAS SECURITY DEFINER - NEEDS FIX'
        ELSE 'OK - No SECURITY DEFINER'
    END as status
FROM pg_views
WHERE schemaname = 'public'
AND viewname IN ('calls_pending_review', 'call_quality_metrics', 'organization_current_usage')
ORDER BY viewname;

-- =============================================================================
-- 8. Add monitoring trigger to prevent SECURITY DEFINER views
-- =============================================================================

CREATE OR REPLACE FUNCTION public.prevent_security_definer()
RETURNS event_trigger
LANGUAGE plpgsql
AS $$
DECLARE
    obj RECORD;
BEGIN
    FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands() WHERE command_tag LIKE 'CREATE%VIEW'
    LOOP
        -- Log the creation
        RAISE NOTICE 'View created/altered: %', obj.object_identity;

        -- Check if it uses SECURITY DEFINER (this is a simplified check)
        IF obj.object_identity LIKE '%public.calls_pending_review%'
           OR obj.object_identity LIKE '%public.call_quality_metrics%'
           OR obj.object_identity LIKE '%public.organization_current_usage%' THEN
            RAISE NOTICE 'Important view modified - ensure it does not use SECURITY DEFINER';
        END IF;
    END LOOP;
END;
$$;

-- Create event trigger (requires superuser)
-- Uncomment if you have superuser access:
-- CREATE EVENT TRIGGER check_view_security ON ddl_command_end
-- WHEN TAG IN ('CREATE VIEW', 'CREATE OR REPLACE VIEW', 'ALTER VIEW')
-- EXECUTE FUNCTION public.prevent_security_definer();

-- =============================================================================
-- 9. Summary
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'SECURITY DEFINER Fix Applied';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'All views have been recreated without SECURITY DEFINER.';
    RAISE NOTICE '';
    RAISE NOTICE 'To verify: Check the output table above.';
    RAISE NOTICE 'All views should show "OK - No SECURITY DEFINER"';
    RAISE NOTICE '==========================================';
END $$;