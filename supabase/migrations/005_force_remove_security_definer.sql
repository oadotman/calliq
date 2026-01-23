-- Force removal of SECURITY DEFINER from all views
-- This migration forcefully drops and recreates views to ensure SECURITY DEFINER is removed

-- =============================================================================
-- 1. Drop ALL existing views first (CASCADE to handle dependencies)
-- =============================================================================

DROP VIEW IF EXISTS public.calls_pending_review CASCADE;
DROP VIEW IF EXISTS public.call_quality_metrics CASCADE;
DROP VIEW IF EXISTS public.organization_current_usage CASCADE;

-- =============================================================================
-- 2. Recreate calls_pending_review view WITHOUT SECURITY DEFINER
-- =============================================================================

CREATE VIEW public.calls_pending_review
WITH (security_invoker = true) -- Explicitly set security_invoker
AS
SELECT
    c.id,
    c.file_name,
    c.customer_name,
    c.customer_email,
    c.customer_phone,
    c.customer_company,
    c.sales_rep,
    c.call_date,
    c.call_type,
    c.duration,
    c.duration_minutes,
    c.sentiment_type,
    c.sentiment_score,
    c.summary,
    c.next_steps,
    c.status,
    c.approval_status,
    c.requires_review,
    c.review_trigger_reason,
    c.extraction_quality_score,
    c.low_confidence_fields_count,
    c.uploaded_at,
    c.processed_at,
    c.created_at,
    c.updated_at,
    c.organization_id,
    c.user_id,
    c.template_id,
    c.typed_notes,
    -- Get user names from public.users table (not auth.users)
    COALESCE(
        (SELECT full_name FROM public.users WHERE id = c.user_id),
        (SELECT email FROM public.users WHERE id = c.user_id)
    ) as uploader_name,
    COALESCE(
        (SELECT full_name FROM public.users WHERE id = c.reviewed_by),
        (SELECT email FROM public.users WHERE id = c.reviewed_by)
    ) as reviewer_name
FROM public.calls c
WHERE c.requires_review = true
    AND c.approval_status = 'pending'
    AND c.deleted_at IS NULL
    -- RLS check - only show calls from user's organization
    AND EXISTS (
        SELECT 1
        FROM public.user_organizations uo
        WHERE uo.user_id = auth.uid()
        AND (uo.organization_id = c.organization_id OR c.user_id = auth.uid())
    );

-- Set owner and grant permissions
ALTER VIEW public.calls_pending_review OWNER TO postgres;
GRANT SELECT ON public.calls_pending_review TO authenticated;

-- Add comment
COMMENT ON VIEW public.calls_pending_review IS
'Shows calls pending review. Uses SECURITY INVOKER (not DEFINER) to respect RLS.';

-- =============================================================================
-- 3. Recreate call_quality_metrics view WITHOUT SECURITY DEFINER
-- =============================================================================

CREATE VIEW public.call_quality_metrics
WITH (security_invoker = true) -- Explicitly set security_invoker
AS
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
    -- Calculate overall quality score
    CASE
        WHEN c.transcription_quality_score IS NOT NULL
             AND c.extraction_quality_score IS NOT NULL THEN
            ROUND((c.transcription_quality_score + c.extraction_quality_score) / 2.0, 2)
        WHEN c.transcription_quality_score IS NOT NULL THEN
            c.transcription_quality_score
        WHEN c.extraction_quality_score IS NOT NULL THEN
            c.extraction_quality_score
        ELSE NULL
    END as overall_quality_score,
    -- Quality category
    CASE
        WHEN c.transcription_quality_score >= 90
             AND c.extraction_quality_score >= 90 THEN 'excellent'
        WHEN c.transcription_quality_score >= 70
             AND c.extraction_quality_score >= 70 THEN 'good'
        WHEN c.transcription_quality_score >= 50
             AND c.extraction_quality_score >= 50 THEN 'fair'
        ELSE 'poor'
    END as quality_category
FROM public.calls c
WHERE c.deleted_at IS NULL
    AND c.status = 'completed'
    -- RLS check
    AND EXISTS (
        SELECT 1
        FROM public.user_organizations uo
        WHERE uo.user_id = auth.uid()
        AND (uo.organization_id = c.organization_id OR c.user_id = auth.uid())
    );

-- Set owner and grant permissions
ALTER VIEW public.call_quality_metrics OWNER TO postgres;
GRANT SELECT ON public.call_quality_metrics TO authenticated;

-- Add comment
COMMENT ON VIEW public.call_quality_metrics IS
'Quality metrics for calls. Uses SECURITY INVOKER (not DEFINER) to respect RLS.';

-- =============================================================================
-- 4. Recreate organization_current_usage view WITHOUT SECURITY DEFINER
-- =============================================================================

CREATE VIEW public.organization_current_usage
WITH (security_invoker = true) -- Explicitly set security_invoker
AS
SELECT
    o.id as organization_id,
    o.name as organization_name,
    o.plan_type,
    o.max_minutes_monthly,
    o.current_period_start,
    o.current_period_end,
    -- Calculate used minutes for current period
    COALESCE(
        (SELECT SUM(duration_minutes)
         FROM public.calls
         WHERE organization_id = o.id
           AND deleted_at IS NULL
           AND created_at >= o.current_period_start
           AND created_at < COALESCE(o.current_period_end, NOW() + INTERVAL '1 month')
        ), 0
    )::integer as used_minutes,
    -- Include overage minutes
    COALESCE(o.overage_minutes_purchased, 0) as overage_minutes_purchased,
    -- Include bonus minutes
    COALESCE(o.bonus_minutes_balance, 0) as bonus_minutes_balance,
    -- Calculate remaining minutes
    GREATEST(
        0,
        COALESCE(o.max_minutes_monthly, 0) +
        COALESCE(o.overage_minutes_purchased, 0) +
        COALESCE(o.bonus_minutes_balance, 0) -
        COALESCE(
            (SELECT SUM(duration_minutes)
             FROM public.calls
             WHERE organization_id = o.id
               AND deleted_at IS NULL
               AND created_at >= o.current_period_start
               AND created_at < COALESCE(o.current_period_end, NOW() + INTERVAL '1 month')
            ), 0
        )
    )::integer as remaining_minutes,
    -- Usage percentage
    CASE
        WHEN COALESCE(o.max_minutes_monthly, 0) > 0 THEN
            ROUND(
                (COALESCE(
                    (SELECT SUM(duration_minutes)
                     FROM public.calls
                     WHERE organization_id = o.id
                       AND deleted_at IS NULL
                       AND created_at >= o.current_period_start
                       AND created_at < COALESCE(o.current_period_end, NOW() + INTERVAL '1 month')
                    ), 0
                )::numeric / o.max_minutes_monthly::numeric) * 100,
                2
            )
        ELSE 0
    END as usage_percentage
FROM public.organizations o
WHERE o.deleted_at IS NULL
    -- RLS check - only show organizations the user belongs to
    AND EXISTS (
        SELECT 1
        FROM public.user_organizations uo
        WHERE uo.user_id = auth.uid()
        AND uo.organization_id = o.id
    );

-- Set owner and grant permissions
ALTER VIEW public.organization_current_usage OWNER TO postgres;
GRANT SELECT ON public.organization_current_usage TO authenticated;

-- Add comment
COMMENT ON VIEW public.organization_current_usage IS
'Organization usage statistics. Uses SECURITY INVOKER (not DEFINER) to respect RLS.';

-- =============================================================================
-- 5. Verify all views are using SECURITY INVOKER
-- =============================================================================

DO $$
DECLARE
    view_record RECORD;
    view_definition TEXT;
BEGIN
    RAISE NOTICE 'Checking views for SECURITY DEFINER...';

    FOR view_record IN
        SELECT
            c.relname as view_name,
            pg_get_viewdef(c.oid, true) as definition
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'v'
        AND n.nspname = 'public'
        AND c.relname IN ('calls_pending_review', 'call_quality_metrics', 'organization_current_usage')
    LOOP
        view_definition := view_record.definition;

        IF position('SECURITY DEFINER' in upper(view_definition)) > 0 THEN
            RAISE WARNING 'View % still contains SECURITY DEFINER', view_record.view_name;
        ELSE
            RAISE NOTICE 'View % is correctly using SECURITY INVOKER', view_record.view_name;
        END IF;
    END LOOP;

    RAISE NOTICE 'Security check complete.';
END $$;

-- =============================================================================
-- 6. Additional verification query
-- =============================================================================

-- This query will show the security context of the views
SELECT
    schemaname,
    viewname,
    viewowner,
    CASE
        WHEN definition ILIKE '%SECURITY DEFINER%' THEN 'USES SECURITY DEFINER (BAD)'
        ELSE 'USES SECURITY INVOKER (GOOD)'
    END as security_context
FROM pg_views
WHERE schemaname = 'public'
AND viewname IN ('calls_pending_review', 'call_quality_metrics', 'organization_current_usage');

-- =============================================================================
-- 7. Create a function to check for SECURITY DEFINER in all public views
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_view_security()
RETURNS TABLE(
    view_name TEXT,
    has_security_definer BOOLEAN,
    recommendation TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        v.viewname::TEXT,
        (pg_get_viewdef((quote_ident(v.schemaname)||'.'||quote_ident(v.viewname))::regclass, true) ILIKE '%SECURITY DEFINER%'),
        CASE
            WHEN pg_get_viewdef((quote_ident(v.schemaname)||'.'||quote_ident(v.viewname))::regclass, true) ILIKE '%SECURITY DEFINER%'
            THEN 'Remove SECURITY DEFINER from this view'
            ELSE 'View is secure'
        END::TEXT
    FROM pg_views v
    WHERE v.schemaname = 'public'
    ORDER BY v.viewname;
END;
$$;

-- Run the check
SELECT * FROM public.check_view_security();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_view_security() TO authenticated;

-- =============================================================================
-- 8. Log completion
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SECURITY DEFINER removal complete!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'All views have been recreated with SECURITY INVOKER.';
    RAISE NOTICE 'This ensures that views respect the RLS policies of the querying user.';
    RAISE NOTICE '';
    RAISE NOTICE 'You can verify this by running: SELECT * FROM public.check_view_security();';
    RAISE NOTICE '========================================';
END $$;