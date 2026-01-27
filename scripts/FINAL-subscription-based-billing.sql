-- =====================================================
-- FINAL SUBSCRIPTION-BASED BILLING SYSTEM
-- Everyone gets 30-day cycles from their start/upgrade date
-- =====================================================

-- 1. Add necessary columns if they don't exist
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_start_date DATE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS last_plan_change_date DATE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS next_reset_date DATE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_cycle_day INTEGER; -- Day of month they reset (1-31)

-- 2. Initialize subscription dates for existing organizations
-- Use created_at as initial subscription date
UPDATE organizations
SET
    subscription_start_date = COALESCE(subscription_start_date, DATE(created_at)),
    last_plan_change_date = COALESCE(last_plan_change_date, DATE(created_at)),
    billing_cycle_day = COALESCE(billing_cycle_day, EXTRACT(DAY FROM created_at)::INTEGER),
    next_reset_date = COALESCE(
        next_reset_date,
        -- Calculate next reset date (30 days from start)
        DATE(created_at) + INTERVAL '30 days'
    )
WHERE subscription_start_date IS NULL OR next_reset_date IS NULL;

-- 3. Function to handle plan upgrades (resets the 30-day cycle)
CREATE OR REPLACE FUNCTION handle_plan_upgrade(
    org_id UUID,
    new_plan TEXT
) RETURNS void AS $$
DECLARE
    old_plan TEXT;
    today DATE := CURRENT_DATE;
BEGIN
    -- Get current plan
    SELECT plan_type INTO old_plan
    FROM organizations
    WHERE id = org_id;

    -- If upgrading from free to paid, reset the cycle
    IF old_plan = 'free' AND new_plan != 'free' THEN
        UPDATE organizations
        SET
            plan_type = new_plan,
            last_plan_change_date = today,
            next_reset_date = today + INTERVAL '30 days',
            used_minutes = 0, -- Reset usage on upgrade
            billing_cycle_day = EXTRACT(DAY FROM today)::INTEGER,
            updated_at = NOW()
        WHERE id = org_id;

        RAISE NOTICE 'User upgraded from % to % - New 30-day cycle starts today', old_plan, new_plan;
    ELSE
        -- Just update the plan, keep the same cycle
        UPDATE organizations
        SET
            plan_type = new_plan,
            updated_at = NOW()
        WHERE id = org_id;

        RAISE NOTICE 'Plan changed from % to % - Keeping same billing cycle', old_plan, new_plan;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Function to reset usage based on 30-day cycles
CREATE OR REPLACE FUNCTION reset_usage_30_day_cycle() RETURNS void AS $$
DECLARE
    org_record RECORD;
    reset_count INTEGER := 0;
    preserved_count INTEGER := 0;
    karamo_org_id UUID;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Running 30-day cycle usage reset';
    RAISE NOTICE 'Date: %', CURRENT_DATE;
    RAISE NOTICE '========================================';

    -- Find Karamo organization (adeliyitomiwa's superuser org)
    SELECT o.id INTO karamo_org_id
    FROM organizations o
    WHERE LOWER(o.name) = 'karamo'
    LIMIT 1;

    IF karamo_org_id IS NOT NULL THEN
        RAISE NOTICE 'Found Karamo (superuser) organization: %', karamo_org_id;
    END IF;

    -- Process all organizations
    FOR org_record IN
        SELECT * FROM organizations
        WHERE next_reset_date <= CURRENT_DATE
    LOOP
        -- Check if this is Karamo (superuser)
        IF org_record.id = karamo_org_id THEN
            -- For Karamo: Update next reset date but keep usage
            UPDATE organizations
            SET
                next_reset_date = CURRENT_DATE + INTERVAL '30 days',
                current_period_start = CURRENT_DATE,
                current_period_end = CURRENT_DATE + INTERVAL '30 days',
                -- DO NOT reset used_minutes for Karamo
                -- DO NOT reset overage_minutes_purchased
                updated_at = NOW()
            WHERE id = org_record.id;

            preserved_count := preserved_count + 1;
            RAISE NOTICE '✓ SUPERUSER: % - Preserved % minutes, next reset: %',
                org_record.name,
                org_record.used_minutes,
                CURRENT_DATE + INTERVAL '30 days';
        ELSE
            -- For regular users: Reset usage to 0
            UPDATE organizations
            SET
                used_minutes = 0,
                overage_minutes_purchased = 0,
                next_reset_date = CURRENT_DATE + INTERVAL '30 days',
                current_period_start = CURRENT_DATE,
                current_period_end = CURRENT_DATE + INTERVAL '30 days',
                updated_at = NOW()
            WHERE id = org_record.id;

            reset_count := reset_count + 1;
            RAISE NOTICE '✓ Reset: % (%s plan) - Was % minutes, now 0',
                org_record.name,
                org_record.plan_type,
                org_record.used_minutes;
        END IF;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE 'Summary: Reset % regular users, preserved % superuser(s)',
        reset_count, preserved_count;
END;
$$ LANGUAGE plpgsql;

-- 5. Daily check function (to be called by cron job)
CREATE OR REPLACE FUNCTION daily_billing_cycle_check() RETURNS void AS $$
BEGIN
    -- Run the 30-day cycle reset
    PERFORM reset_usage_30_day_cycle();

    -- Log the run
    RAISE NOTICE 'Daily billing cycle check completed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- 6. Verify Karamo is set up correctly as superuser
DO $$
DECLARE
    karamo_id UUID;
BEGIN
    -- Find Karamo organization
    SELECT id INTO karamo_id
    FROM organizations
    WHERE LOWER(name) = 'karamo';

    IF karamo_id IS NOT NULL THEN
        -- Make sure Karamo has superuser privileges
        UPDATE organizations
        SET
            max_minutes_monthly = 999999,
            plan_type = 'starter'
        WHERE id = karamo_id;

        RAISE NOTICE 'Karamo organization configured as superuser with 999,999 minutes';
    ELSE
        RAISE NOTICE 'Warning: Karamo organization not found!';
    END IF;
END $$;

-- 7. Show current billing status for all organizations
SELECT 'CURRENT BILLING CYCLES:' as title;

SELECT
    o.name,
    o.plan_type,
    o.max_minutes_monthly as minutes_limit,
    o.used_minutes || '/' || o.max_minutes_monthly as usage,
    DATE(o.created_at) as joined_date,
    o.subscription_start_date,
    o.next_reset_date,
    CASE
        WHEN o.next_reset_date <= CURRENT_DATE THEN 'DUE NOW'
        ELSE (o.next_reset_date - CURRENT_DATE) || ' days'
    END as days_until_reset,
    CASE
        WHEN LOWER(o.name) = 'karamo' THEN 'SUPERUSER - Usage preserved'
        ELSE 'Regular - Resets to 0'
    END as reset_policy
FROM organizations o
ORDER BY
    CASE WHEN LOWER(o.name) = 'karamo' THEN 0 ELSE 1 END,
    o.next_reset_date;

-- 8. Example scenario: User upgrades from free to paid
SELECT 'UPGRADE SCENARIO EXAMPLE:' as title;

SELECT
    'If a free user upgrades on day 15:' as scenario,
    '1. Their 30-day cycle restarts from upgrade date' as step1,
    '2. Usage resets to 0' as step2,
    '3. New cycle: Upgrade day → Upgrade day + 30' as step3,
    '4. They get full 30 days on new plan' as step4;

-- 9. Show Karamo's special status
SELECT 'KARAMO (SUPERUSER) STATUS:' as title;

SELECT
    o.name,
    u.email as owner_email,
    o.plan_type,
    o.max_minutes_monthly as "minutes_available",
    o.used_minutes as "minutes_used",
    o.max_minutes_monthly - o.used_minutes as "remaining",
    'Never resets - usage accumulates' as "special_rule"
FROM organizations o
LEFT JOIN user_organizations uo ON uo.organization_id = o.id
LEFT JOIN users u ON u.id = uo.user_id
WHERE LOWER(o.name) = 'karamo';

-- 10. Manual reset function for testing
CREATE OR REPLACE FUNCTION manual_reset_org(org_name TEXT) RETURNS void AS $$
DECLARE
    org_id UUID;
BEGIN
    SELECT id INTO org_id
    FROM organizations
    WHERE name = org_name;

    IF org_id IS NOT NULL THEN
        IF LOWER(org_name) = 'karamo' THEN
            RAISE NOTICE 'Cannot reset Karamo - superuser organization';
        ELSE
            UPDATE organizations
            SET
                used_minutes = 0,
                next_reset_date = CURRENT_DATE + INTERVAL '30 days',
                updated_at = NOW()
            WHERE id = org_id;

            RAISE NOTICE 'Reset % to 0 minutes', org_name;
        END IF;
    ELSE
        RAISE NOTICE 'Organization % not found', org_name;
    END IF;
END;
$$ LANGUAGE plpgsql;