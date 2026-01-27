-- =====================================================
-- SETUP SUPERUSER AND MONTHLY RESET SYSTEM (FIXED)
-- =====================================================

-- 1. First check adeliyitomiwa@yahoo.com current status
SELECT
    'CURRENT STATUS FOR adeliyitomiwa@yahoo.com:' as info;

WITH user_data AS (
    SELECT
        u.id as user_id,
        u.email,
        uo.organization_id,
        o.id as org_id,
        o.name as org_name,
        o.plan_type,
        o.max_minutes_monthly as base_minutes,
        o.overage_minutes_purchased,
        o.used_minutes,
        o.max_minutes_monthly + COALESCE(o.overage_minutes_purchased, 0) as total_available,
        o.current_period_start,
        o.current_period_end
    FROM users u
    JOIN user_organizations uo ON uo.user_id = u.id
    JOIN organizations o ON o.id = uo.organization_id
    WHERE u.email = 'adeliyitomiwa@yahoo.com'
)
SELECT
    email,
    org_name,
    plan_type || ' plan' as plan,
    base_minutes || ' base minutes' as base,
    used_minutes || '/' || total_available || ' used' as usage,
    total_available - used_minutes || ' remaining' as remaining
FROM user_data;

-- 2. Make adeliyitomiwa@yahoo.com a superuser with special privileges
DO $$
DECLARE
    target_org_id UUID;
    current_month_start TIMESTAMP := DATE_TRUNC('month', NOW());
    current_month_end TIMESTAMP := DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 second';
BEGIN
    -- Find the organization for adeliyitomiwa@yahoo.com
    SELECT o.id INTO target_org_id
    FROM users u
    JOIN user_organizations uo ON uo.user_id = u.id
    JOIN organizations o ON o.id = uo.organization_id
    WHERE u.email = 'adeliyitomiwa@yahoo.com'
    LIMIT 1;

    IF target_org_id IS NOT NULL THEN
        -- Give this user unlimited minutes by setting a very high limit
        -- Also reset their usage to 0 for testing
        UPDATE organizations
        SET
            max_minutes_monthly = 999999,  -- Effectively unlimited
            used_minutes = 0,  -- Reset usage to allow immediate testing
            current_period_start = current_month_start,
            current_period_end = current_month_end,
            plan_type = 'starter',  -- Keep on starter plan as requested
            overage_minutes_purchased = 0,  -- Clear any overage
            updated_at = NOW()
        WHERE id = target_org_id;

        RAISE NOTICE 'Superuser setup complete for adeliyitomiwa@yahoo.com';
        RAISE NOTICE '  - Set to 999999 minutes (effectively unlimited)';
        RAISE NOTICE '  - Reset usage to 0';
        RAISE NOTICE '  - Billing period set to current month';
    ELSE
        RAISE NOTICE 'User adeliyitomiwa@yahoo.com not found!';
    END IF;
END $$;

-- 3. Create a function to reset usage monthly for all organizations
CREATE OR REPLACE FUNCTION reset_monthly_usage() RETURNS void AS $$
DECLARE
    current_month_start TIMESTAMP := DATE_TRUNC('month', NOW());
    current_month_end TIMESTAMP := DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 second';
    org_record RECORD;
    reset_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting monthly usage reset for %', current_month_start::date;

    FOR org_record IN
        SELECT * FROM organizations
        WHERE current_period_start IS NULL
           OR DATE_TRUNC('month', current_period_start::date) < current_month_start
    LOOP
        -- Reset the organization's usage for the new month
        UPDATE organizations
        SET
            current_period_start = current_month_start,
            current_period_end = current_month_end,
            used_minutes = 0,  -- Reset usage to 0
            -- Keep max_minutes_monthly as is (plan limits)
            -- Keep overage_minutes_purchased as 0 (overage expires monthly)
            overage_minutes_purchased = 0,
            updated_at = NOW()
        WHERE id = org_record.id;

        reset_count := reset_count + 1;
        RAISE NOTICE 'Reset usage for: % (was % minutes)', org_record.name, org_record.used_minutes;
    END LOOP;

    RAISE NOTICE 'Reset complete. Updated % organizations', reset_count;
END;
$$ LANGUAGE plpgsql;

-- 4. Execute the monthly reset for all organizations
SELECT reset_monthly_usage();

-- 5. Verify adeliyitomiwa@yahoo.com now has access
SELECT
    'VERIFICATION - adeliyitomiwa@yahoo.com after changes:' as info;

SELECT
    u.email,
    o.name as org_name,
    o.plan_type,
    o.max_minutes_monthly || ' minutes available' as minutes_available,
    o.used_minutes || ' minutes used' as minutes_used,
    (o.max_minutes_monthly - o.used_minutes) || ' minutes remaining' as minutes_remaining,
    CASE
        WHEN o.used_minutes >= o.max_minutes_monthly THEN 'NO ACCESS'
        ELSE 'CAN UPLOAD'
    END as upload_status,
    'Can upload ' || FLOOR((o.max_minutes_monthly - o.used_minutes) / 3) || ' x 3-minute files' as capacity
FROM users u
JOIN user_organizations uo ON uo.user_id = u.id
JOIN organizations o ON o.id = uo.organization_id
WHERE u.email = 'adeliyitomiwa@yahoo.com';

-- 6. Show all organizations after reset
SELECT
    'ALL ORGANIZATIONS AFTER MONTHLY RESET:' as info;

SELECT
    name,
    plan_type,
    max_minutes_monthly as monthly_limit,
    used_minutes,
    max_minutes_monthly - used_minutes as remaining,
    DATE(current_period_start) || ' to ' || DATE(current_period_end) as billing_period,
    CASE
        WHEN email = 'adeliyitomiwa@yahoo.com' THEN 'SUPERUSER'
        ELSE 'Regular'
    END as user_type
FROM organizations o
LEFT JOIN (
    SELECT DISTINCT uo.organization_id, u.email
    FROM user_organizations uo
    JOIN users u ON u.id = uo.user_id
    WHERE u.email = 'adeliyitomiwa@yahoo.com'
) su ON su.organization_id = o.id
ORDER BY
    CASE WHEN email = 'adeliyitomiwa@yahoo.com' THEN 0 ELSE 1 END,
    name;

-- 7. Create a scheduled reset function (can be called by a cron job)
CREATE OR REPLACE FUNCTION auto_reset_monthly_usage() RETURNS void AS $$
DECLARE
    current_date DATE := CURRENT_DATE;
    current_month_start TIMESTAMP := DATE_TRUNC('month', current_date);
    current_month_end TIMESTAMP := DATE_TRUNC('month', current_date) + INTERVAL '1 month' - INTERVAL '1 second';
    org_record RECORD;
    reset_count INTEGER := 0;
BEGIN
    -- Only run on the first day of the month
    IF EXTRACT(DAY FROM current_date) = 1 THEN
        RAISE NOTICE 'Running automatic monthly reset on %', current_date;

        FOR org_record IN
            SELECT * FROM organizations
            WHERE DATE_TRUNC('month', current_period_start::date) < current_month_start
        LOOP
            UPDATE organizations
            SET
                current_period_start = current_month_start,
                current_period_end = current_month_end,
                used_minutes = 0,
                overage_minutes_purchased = 0,  -- Reset overage each month
                updated_at = NOW()
            WHERE id = org_record.id;

            reset_count := reset_count + 1;
        END LOOP;

        RAISE NOTICE 'Automatic reset complete. Updated % organizations', reset_count;
    ELSE
        RAISE NOTICE 'Not the first of the month. Skipping reset.';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 8. Summary of changes
SELECT
    'SUMMARY OF CHANGES:' as info;

WITH summary AS (
    SELECT
        COUNT(*) as total_orgs,
        COUNT(CASE WHEN used_minutes = 0 THEN 1 END) as reset_orgs,
        COUNT(CASE WHEN max_minutes_monthly = 999999 THEN 1 END) as superusers,
        COUNT(CASE WHEN DATE_TRUNC('month', current_period_start::date) = DATE_TRUNC('month', NOW()) THEN 1 END) as current_period_orgs
    FROM organizations
)
SELECT
    total_orgs || ' total organizations' as stat1,
    reset_orgs || ' have 0 usage (fresh start)' as stat2,
    superusers || ' superuser(s) with unlimited minutes' as stat3,
    current_period_orgs || ' set to current billing period' as stat4
FROM summary;