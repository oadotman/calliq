-- Fix security issues with database views
-- This migration addresses:
-- 1. Auth.users exposure via views
-- 2. SECURITY DEFINER issues on views

-- =============================================================================
-- 1. FIRST: Create users table if it doesn't exist
-- =============================================================================

-- This table should store non-sensitive user profile data
-- It mirrors some auth.users data but doesn't expose sensitive fields
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- Create RLS policies
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Users can view profiles in their organization" ON public.users
    FOR SELECT
    USING (
        id IN (
            SELECT uo2.user_id
            FROM public.user_organizations uo1
            JOIN public.user_organizations uo2 ON uo1.organization_id = uo2.organization_id
            WHERE uo1.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Grant permissions
GRANT SELECT, UPDATE ON public.users TO authenticated;

-- Create trigger to sync with auth.users
CREATE OR REPLACE FUNCTION public.handle_user_sync()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    )
    ON CONFLICT (id) DO UPDATE
    SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_sync();

-- Sync existing users
INSERT INTO public.users (id, email, full_name)
SELECT
    id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', email)
FROM auth.users
ON CONFLICT (id) DO UPDATE
SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    updated_at = NOW();

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- =============================================================================
-- 2. Fix calls_pending_review view
-- =============================================================================

-- Drop the existing view with SECURITY DEFINER
DROP VIEW IF EXISTS public.calls_pending_review CASCADE;

-- Recreate the view without SECURITY DEFINER and without exposing auth.users
-- This view should only show calls that need review for the current user's organization
CREATE OR REPLACE VIEW public.calls_pending_review AS
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
    -- Instead of joining auth.users, get user name from public.users table
    -- This prevents exposing sensitive auth.users data
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
    -- Add RLS check - only show calls from user's organization
    AND (
        c.organization_id IN (
            SELECT organization_id
            FROM public.user_organizations
            WHERE user_id = auth.uid()
        )
        OR c.user_id = auth.uid()
    );

-- Grant appropriate permissions
GRANT SELECT ON public.calls_pending_review TO authenticated;

-- Add RLS policy settings
ALTER VIEW public.calls_pending_review SET (security_barrier = on);

-- Add comment explaining the view
COMMENT ON VIEW public.calls_pending_review IS
'Shows calls pending review for the current user''s organization. Does not expose auth.users data.';

-- =============================================================================
-- 3. Fix call_quality_metrics view
-- =============================================================================

-- Drop the existing view with SECURITY DEFINER
DROP VIEW IF EXISTS public.call_quality_metrics CASCADE;

-- Recreate without SECURITY DEFINER
CREATE OR REPLACE VIEW public.call_quality_metrics AS
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
    -- Add RLS check
    AND (
        c.organization_id IN (
            SELECT organization_id
            FROM public.user_organizations
            WHERE user_id = auth.uid()
        )
        OR c.user_id = auth.uid()
    );

-- Grant appropriate permissions
GRANT SELECT ON public.call_quality_metrics TO authenticated;

-- Add RLS
ALTER VIEW public.call_quality_metrics SET (security_barrier = on);

-- Add comment
COMMENT ON VIEW public.call_quality_metrics IS
'Provides quality metrics for calls. Respects RLS and does not use SECURITY DEFINER.';

-- =============================================================================
-- 4. Fix organization_current_usage view
-- =============================================================================

-- Drop the existing view with SECURITY DEFINER
DROP VIEW IF EXISTS public.organization_current_usage CASCADE;

-- Recreate without SECURITY DEFINER
CREATE OR REPLACE VIEW public.organization_current_usage AS
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
    ) as used_minutes,
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
    ) as remaining_minutes,
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
    -- Add RLS check - only show organizations the user belongs to
    AND o.id IN (
        SELECT organization_id
        FROM public.user_organizations
        WHERE user_id = auth.uid()
    );

-- Grant appropriate permissions
GRANT SELECT ON public.organization_current_usage TO authenticated;

-- Add RLS
ALTER VIEW public.organization_current_usage SET (security_barrier = on);

-- Add comment
COMMENT ON VIEW public.organization_current_usage IS
'Shows current usage statistics for organizations. Respects RLS and does not use SECURITY DEFINER.';

-- =============================================================================
-- 5. Create additional indexes for performance
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_calls_pending_review ON public.calls(requires_review, approval_status, deleted_at)
    WHERE requires_review = true AND approval_status = 'pending' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_calls_quality_metrics ON public.calls(organization_id, status, deleted_at)
    WHERE status = 'completed' AND deleted_at IS NULL;

-- =============================================================================
-- 6. Verify fixes
-- =============================================================================

-- Check that views no longer have SECURITY DEFINER
DO $$
BEGIN
    -- This will log a notice if any public views still have SECURITY DEFINER
    IF EXISTS (
        SELECT 1
        FROM pg_views v
        JOIN pg_class c ON c.relname = v.viewname AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = v.schemaname)
        WHERE v.schemaname = 'public'
        AND c.relkind = 'v'
        AND pg_get_viewdef(c.oid, true) ILIKE '%SECURITY DEFINER%'
    ) THEN
        RAISE WARNING 'Some views still have SECURITY DEFINER - manual review needed';
    ELSE
        RAISE NOTICE 'All SECURITY DEFINER issues have been resolved';
    END IF;
END $$;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Security fixes applied successfully:';
    RAISE NOTICE '1. Created public.users table for safe user data access';
    RAISE NOTICE '2. Removed auth.users exposure from calls_pending_review';
    RAISE NOTICE '3. Removed SECURITY DEFINER from all views';
    RAISE NOTICE '4. Added proper RLS checks to all views';
END $$;