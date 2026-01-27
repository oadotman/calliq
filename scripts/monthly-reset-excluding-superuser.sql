-- =====================================================
-- MONTHLY RESET SYSTEM - EXCLUDES SUPERUSER
-- Regular users reset to 0, superuser keeps usage
-- =====================================================

-- Create improved reset function that excludes superuser
CREATE OR REPLACE FUNCTION reset_monthly_usage_smart() RETURNS void AS $$
DECLARE
    current_month_start TIMESTAMP := DATE_TRUNC('month', NOW());
    current_month_end TIMESTAMP := DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 second';
    org_record RECORD;
    reset_count INTEGER := 0;
    superuser_org_id UUID;
BEGIN
    RAISE NOTICE 'Starting smart monthly usage reset for %', current_month_start::date;

    -- Find the superuser's organization
    SELECT o.id INTO superuser_org_id
    FROM users u
    JOIN user_organizations uo ON uo.user_id = u.id
    JOIN organizations o ON o.id = uo.organization_id
    WHERE u.email = 'adeliyitomiwa@yahoo.com'
    LIMIT 1;

    IF superuser_org_id IS NOT NULL THEN
        RAISE NOTICE 'Superuser organization found: %, will not reset usage', superuser_org_id;
    END IF;

    -- Process all organizations
    FOR org_record IN
        SELECT * FROM organizations
        WHERE (current_period_start IS NULL
           OR DATE_TRUNC('month', current_period_start::date) < current_month_start)
    LOOP
        -- Update billing period for ALL organizations
        UPDATE organizations
        SET
            current_period_start = current_month_start,
            current_period_end = current_month_end,
            -- Only reset usage if NOT the superuser
            used_minutes = CASE
                WHEN id = superuser_org_id THEN used_minutes  -- Keep superuser's usage
                ELSE 0  -- Reset regular users
            END,
            -- Reset overage for everyone (including superuser - overage expires monthly)
            overage_minutes_purchased = 0,
            updated_at = NOW()
        WHERE id = org_record.id;

        IF org_record.id = superuser_org_id THEN
            RAISE NOTICE 'Updated superuser org % - kept usage at % minutes',
                org_record.name, org_record.used_minutes;
        ELSE
            RAISE NOTICE 'Reset regular org % - was % minutes, now 0',
                org_record.name, org_record.used_minutes;
        END IF;

        reset_count := reset_count + 1;
    END LOOP;

    RAISE NOTICE 'Smart reset complete. Updated % organizations', reset_count;
END;
$$ LANGUAGE plpgsql;

-- Create automatic monthly reset (for cron jobs) that excludes superuser
CREATE OR REPLACE FUNCTION auto_reset_monthly_usage_smart() RETURNS void AS $$
DECLARE
    current_date DATE := CURRENT_DATE;
    current_month_start TIMESTAMP := DATE_TRUNC('month', current_date);
    current_month_end TIMESTAMP := DATE_TRUNC('month', current_date) + INTERVAL '1 month' - INTERVAL '1 second';
    org_record RECORD;
    reset_count INTEGER := 0;
    superuser_org_id UUID;
BEGIN
    -- Only run on the first day of the month
    IF EXTRACT(DAY FROM current_date) != 1 THEN
        RAISE NOTICE 'Not the first of the month. Skipping reset.';
        RETURN;
    END IF;

    RAISE NOTICE 'Running automatic monthly reset on %', current_date;

    -- Find the superuser's organization
    SELECT o.id INTO superuser_org_id
    FROM users u
    JOIN user_organizations uo ON uo.user_id = u.id
    JOIN organizations o ON o.id = uo.organization_id
    WHERE u.email = 'adeliyitomiwa@yahoo.com'
    LIMIT 1;

    FOR org_record IN
        SELECT * FROM organizations
        WHERE DATE_TRUNC('month', current_period_start::date) < current_month_start
    LOOP
        UPDATE organizations
        SET
            current_period_start = current_month_start,
            current_period_end = current_month_end,
            used_minutes = CASE
                WHEN id = superuser_org_id THEN used_minutes
                ELSE 0
            END,
            overage_minutes_purchased = 0,
            updated_at = NOW()
        WHERE id = org_record.id;

        reset_count := reset_count + 1;
    END LOOP;

    RAISE NOTICE 'Automatic smart reset complete. Updated % organizations', reset_count;
END;
$$ LANGUAGE plpgsql;

-- Test the smart reset to show how it works
SELECT
    'DEMONSTRATION: How smart reset will work next month' as info;

WITH next_month_simulation AS (
    SELECT
        o.name,
        o.used_minutes as current_usage,
        CASE
            WHEN u.email = 'adeliyitomiwa@yahoo.com' THEN current_usage
            ELSE 0
        END as usage_after_reset,
        CASE
            WHEN u.email = 'adeliyitomiwa@yahoo.com' THEN 'SUPERUSER - Usage preserved'
            ELSE 'Regular user - Reset to 0'
        END as reset_behavior
    FROM organizations o
    LEFT JOIN (
        SELECT DISTINCT uo.organization_id, u.email
        FROM user_organizations uo
        JOIN users u ON u.id = uo.user_id
        WHERE u.email = 'adeliyitomiwa@yahoo.com'
    ) u ON u.organization_id = o.id
)
SELECT * FROM next_month_simulation
ORDER BY
    CASE WHEN reset_behavior LIKE 'SUPERUSER%' THEN 0 ELSE 1 END,
    name;