-- =====================================================
-- AUTOMATIC BILLING PERIOD MANAGEMENT
-- Ensures billing periods auto-update and usage resets monthly
-- =====================================================

-- 1. Create a function to check and update billing periods
CREATE OR REPLACE FUNCTION check_and_update_billing_periods()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    org RECORD;
    current_date_val DATE := CURRENT_DATE;
    period_start TIMESTAMP;
    period_end TIMESTAMP;
    new_period_start TIMESTAMP;
    new_period_end TIMESTAMP;
BEGIN
    -- Loop through all organizations
    FOR org IN SELECT * FROM organizations
    LOOP
        -- Check if billing period needs updating
        IF org.current_period_end IS NULL OR org.current_period_end < current_date_val THEN
            -- Calculate new billing period (current month)
            new_period_start := date_trunc('month', current_date_val);
            new_period_end := (date_trunc('month', current_date_val) + interval '1 month' - interval '1 second');

            -- If this is a new billing period, reset used_minutes to 0
            IF org.current_period_end IS NOT NULL AND org.current_period_end < new_period_start THEN
                -- Archive the old usage before resetting
                INSERT INTO usage_metrics (
                    organization_id,
                    user_id,
                    metric_type,
                    metric_value,
                    metadata
                )
                VALUES (
                    org.id,
                    NULL,
                    'billing_period_archive',
                    org.used_minutes,
                    jsonb_build_object(
                        'period_start', org.current_period_start,
                        'period_end', org.current_period_end,
                        'archived_at', current_timestamp,
                        'plan_type', org.plan_type,
                        'max_minutes', org.max_minutes_monthly
                    )
                );

                -- Reset used_minutes for the new period
                UPDATE organizations
                SET
                    used_minutes = 0,
                    overage_minutes_purchased = 0, -- Reset overage minutes too
                    current_period_start = new_period_start,
                    current_period_end = new_period_end,
                    updated_at = current_timestamp
                WHERE id = org.id;

                RAISE NOTICE 'Reset billing for org %: period % to %',
                    org.name, new_period_start::date, new_period_end::date;
            ELSE
                -- Just update the period dates without resetting usage
                UPDATE organizations
                SET
                    current_period_start = new_period_start,
                    current_period_end = new_period_end,
                    updated_at = current_timestamp
                WHERE id = org.id;

                RAISE NOTICE 'Updated billing period for org %: % to %',
                    org.name, new_period_start::date, new_period_end::date;
            END IF;
        END IF;
    END LOOP;
END;
$$;

-- 2. Create a function that calculates ONLY current period usage
-- This is what the dashboard should use instead of used_minutes
CREATE OR REPLACE FUNCTION get_current_period_usage(org_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    total_minutes INTEGER;
    period_start TIMESTAMP;
    period_end TIMESTAMP;
BEGIN
    -- Get current billing period for the organization
    SELECT current_period_start, current_period_end
    INTO period_start, period_end
    FROM organizations
    WHERE id = org_id;

    -- If no period is set, use current month
    IF period_start IS NULL THEN
        period_start := date_trunc('month', CURRENT_DATE);
        period_end := (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 second');
    END IF;

    -- Calculate usage for current period from usage_metrics
    SELECT COALESCE(SUM(metric_value), 0)
    INTO total_minutes
    FROM usage_metrics
    WHERE organization_id = org_id
      AND metric_type = 'minutes_transcribed'
      AND created_at >= period_start
      AND created_at <= period_end;

    RETURN total_minutes;
END;
$$;

-- 3. Create a scheduled job simulation (call this from your API/cron)
-- In production, use pg_cron or external scheduler
CREATE OR REPLACE FUNCTION monthly_billing_maintenance()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check and update all billing periods
    PERFORM check_and_update_billing_periods();

    -- Log the maintenance run
    INSERT INTO usage_metrics (
        organization_id,
        metric_type,
        metric_value,
        metadata
    )
    VALUES (
        NULL,
        'billing_maintenance',
        0,
        jsonb_build_object(
            'run_at', current_timestamp,
            'type', 'monthly_reset'
        )
    );

    RAISE NOTICE 'Monthly billing maintenance completed at %', current_timestamp;
END;
$$;

-- 4. Fix the current organizations immediately
SELECT check_and_update_billing_periods();

-- 5. Create a view for dashboard to use (always shows current period usage)
CREATE OR REPLACE VIEW organization_current_usage AS
SELECT
    o.id,
    o.name,
    o.plan_type,
    o.max_minutes_monthly,
    o.current_period_start,
    o.current_period_end,
    get_current_period_usage(o.id) as used_minutes_current_period,
    o.max_minutes_monthly - get_current_period_usage(o.id) as remaining_minutes,
    o.overage_minutes_purchased
FROM organizations o;

-- 6. Example: Query to see current usage
SELECT * FROM organization_current_usage ORDER BY name;

-- =====================================================
-- IMPORTANT: Set up a cron job or scheduled task to run this monthly:
-- SELECT monthly_billing_maintenance();
--
-- For immediate testing:
-- SELECT check_and_update_billing_periods();
-- =====================================================