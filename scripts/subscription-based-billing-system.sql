-- =====================================================
-- SUBSCRIPTION-BASED BILLING SYSTEM
-- Each user resets based on their subscription date, not calendar month
-- =====================================================

-- First, let's add a subscription_start_date column if it doesn't exist
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_start_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS next_reset_date DATE;

-- Update existing organizations to have subscription dates
-- We'll use their created_at date as the subscription start
UPDATE organizations
SET
    subscription_start_date = DATE(created_at),
    next_reset_date = DATE(created_at) + INTERVAL '30 days'
WHERE subscription_start_date IS NULL;

-- Function to calculate next reset date for an organization
CREATE OR REPLACE FUNCTION calculate_next_reset_date(org_id UUID) RETURNS DATE AS $$
DECLARE
    sub_date DATE;
    today DATE := CURRENT_DATE;
    next_reset DATE;
BEGIN
    -- Get subscription date
    SELECT subscription_start_date INTO sub_date
    FROM organizations
    WHERE id = org_id;

    IF sub_date IS NULL THEN
        RETURN NULL;
    END IF;

    -- Calculate the next reset date (30 days from subscription date)
    -- Find the next occurrence of the subscription day
    next_reset := sub_date;

    WHILE next_reset <= today LOOP
        next_reset := next_reset + INTERVAL '30 days';
    END LOOP;

    RETURN next_reset;
END;
$$ LANGUAGE plpgsql;

-- Function to reset usage based on subscription date
CREATE OR REPLACE FUNCTION reset_usage_subscription_based() RETURNS void AS $$
DECLARE
    org_record RECORD;
    reset_count INTEGER := 0;
    superuser_org_id UUID;
BEGIN
    RAISE NOTICE 'Starting subscription-based usage reset for %', CURRENT_DATE;

    -- Find adeliyitomiwa's organization (the real superuser)
    SELECT o.id INTO superuser_org_id
    FROM users u
    JOIN user_organizations uo ON uo.user_id = u.id
    JOIN organizations o ON o.id = uo.organization_id
    WHERE u.email = 'adeliyitomiwa@yahoo.com'
    LIMIT 1;

    -- Process organizations whose reset date has arrived
    FOR org_record IN
        SELECT * FROM organizations
        WHERE next_reset_date <= CURRENT_DATE
           OR next_reset_date IS NULL
    LOOP
        -- Skip superuser from reset
        IF org_record.id = superuser_org_id THEN
            -- Update only the next reset date for superuser
            UPDATE organizations
            SET
                next_reset_date = calculate_next_reset_date(org_record.id),
                updated_at = NOW()
            WHERE id = org_record.id;

            RAISE NOTICE 'Superuser % - kept usage at % minutes',
                org_record.name, org_record.used_minutes;
        ELSE
            -- Reset regular user
            UPDATE organizations
            SET
                used_minutes = 0,
                overage_minutes_purchased = 0,
                next_reset_date = calculate_next_reset_date(org_record.id),
                current_period_start = CURRENT_DATE,
                current_period_end = CURRENT_DATE + INTERVAL '30 days',
                updated_at = NOW()
            WHERE id = org_record.id;

            RAISE NOTICE 'Reset % - was % minutes, now 0. Next reset: %',
                org_record.name, org_record.used_minutes,
                calculate_next_reset_date(org_record.id);
        END IF;

        reset_count := reset_count + 1;
    END LOOP;

    RAISE NOTICE 'Subscription-based reset complete. Processed % organizations', reset_count;
END;
$$ LANGUAGE plpgsql;

-- Show current subscription dates and next reset dates
SELECT
    'SUBSCRIPTION-BASED BILLING STATUS:' as info;

SELECT
    o.name,
    o.plan_type,
    DATE(o.created_at) as subscription_start,
    o.subscription_start_date,
    o.next_reset_date,
    CASE
        WHEN o.next_reset_date <= CURRENT_DATE THEN 'DUE FOR RESET'
        WHEN o.next_reset_date IS NULL THEN 'NEEDS SETUP'
        ELSE (o.next_reset_date - CURRENT_DATE) || ' days until reset'
    END as reset_status,
    o.used_minutes || '/' || o.max_minutes_monthly as usage,
    CASE
        WHEN u.email = 'adeliyitomiwa@yahoo.com' THEN 'SUPERUSER - No reset'
        ELSE 'Regular - Will reset'
    END as user_type
FROM organizations o
LEFT JOIN (
    SELECT DISTINCT uo.organization_id, u.email
    FROM user_organizations uo
    JOIN users u ON u.id = uo.user_id
    WHERE u.email = 'adeliyitomiwa@yahoo.com'
) u ON u.organization_id = o.id
ORDER BY o.next_reset_date NULLS FIRST;

-- Create a daily cron job function
CREATE OR REPLACE FUNCTION daily_subscription_reset_check() RETURNS void AS $$
BEGIN
    -- This should be called daily by a cron job
    -- It will only reset organizations whose subscription period has ended
    PERFORM reset_usage_subscription_based();
END;
$$ LANGUAGE plpgsql;

-- Example: Set up different subscription dates for testing
-- This shows how each organization can have its own billing cycle
SELECT
    'EXAMPLE SUBSCRIPTION CYCLES:' as info;

WITH subscription_examples AS (
    SELECT
        name,
        plan_type,
        subscription_start_date,
        subscription_start_date + INTERVAL '30 days' as next_reset,
        EXTRACT(DAY FROM (subscription_start_date + INTERVAL '30 days' - CURRENT_DATE)) as days_until_reset
    FROM organizations
)
SELECT * FROM subscription_examples
ORDER BY days_until_reset;