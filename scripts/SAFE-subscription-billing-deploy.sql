-- =====================================================
-- SAFE SUBSCRIPTION-BASED BILLING DEPLOYMENT
-- Handles existing columns/functions gracefully
-- =====================================================

-- 1. Add necessary columns if they don't exist
DO $$
BEGIN
    -- Check and add subscription_start_date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'organizations'
                   AND column_name = 'subscription_start_date') THEN
        ALTER TABLE organizations ADD COLUMN subscription_start_date DATE;
        RAISE NOTICE 'Added subscription_start_date column';
    END IF;

    -- Check and add last_plan_change_date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'organizations'
                   AND column_name = 'last_plan_change_date') THEN
        ALTER TABLE organizations ADD COLUMN last_plan_change_date DATE;
        RAISE NOTICE 'Added last_plan_change_date column';
    END IF;

    -- Check and add next_reset_date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'organizations'
                   AND column_name = 'next_reset_date') THEN
        ALTER TABLE organizations ADD COLUMN next_reset_date DATE;
        RAISE NOTICE 'Added next_reset_date column';
    END IF;

    -- Check and add billing_cycle_day
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'organizations'
                   AND column_name = 'billing_cycle_day') THEN
        ALTER TABLE organizations ADD COLUMN billing_cycle_day INTEGER;
        RAISE NOTICE 'Added billing_cycle_day column';
    END IF;
END $$;

-- 2. Initialize subscription dates for existing organizations
UPDATE organizations
SET
    subscription_start_date = COALESCE(subscription_start_date, DATE(created_at)),
    last_plan_change_date = COALESCE(last_plan_change_date, DATE(created_at)),
    billing_cycle_day = COALESCE(billing_cycle_day, EXTRACT(DAY FROM created_at)::INTEGER),
    next_reset_date = COALESCE(
        next_reset_date,
        DATE(created_at) + INTERVAL '30 days'
    )
WHERE subscription_start_date IS NULL OR next_reset_date IS NULL;

-- 3. Drop existing functions before recreating
DROP FUNCTION IF EXISTS handle_plan_upgrade(UUID, TEXT);
DROP FUNCTION IF EXISTS reset_usage_30_day_cycle();
DROP FUNCTION IF EXISTS daily_billing_cycle_check();
DROP FUNCTION IF EXISTS manual_reset_org(TEXT);

-- 4. Function to handle plan upgrades (resets the 30-day cycle)
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

-- 5. Function to reset usage based on 30-day cycles
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

-- 6. Daily check function (to be called by cron job)
CREATE OR REPLACE FUNCTION daily_billing_cycle_check() RETURNS void AS $$
BEGIN
    -- Run the 30-day cycle reset
    PERFORM reset_usage_30_day_cycle();

    -- Log the run
    RAISE NOTICE 'Daily billing cycle check completed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- 7. Ensure Karamo is set up correctly as superuser
DO $$
DECLARE
    karamo_id UUID;
    karamo_exists BOOLEAN;
BEGIN
    -- Check if Karamo organization exists
    SELECT id, (id IS NOT NULL) INTO karamo_id, karamo_exists
    FROM organizations
    WHERE LOWER(name) = 'karamo'
    LIMIT 1;

    IF karamo_exists THEN
        -- Make sure Karamo has superuser privileges
        UPDATE organizations
        SET
            max_minutes_monthly = 999999,
            plan_type = CASE
                WHEN plan_type = 'free' THEN 'starter'
                ELSE plan_type
            END
        WHERE id = karamo_id;

        RAISE NOTICE 'Karamo organization configured as superuser with 999,999 minutes';
    ELSE
        RAISE NOTICE 'Warning: Karamo organization not found! Will be created when adeliyitomiwa@yahoo.com signs up.';
    END IF;
END $$;

-- 8. Manual reset function for testing
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

-- 9. Show current billing status
SELECT 'DEPLOYMENT COMPLETE - Current Status:' as info;

SELECT
    o.name,
    o.plan_type,
    o.max_minutes_monthly as minutes_limit,
    o.used_minutes || '/' || o.max_minutes_monthly as usage,
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

-- 10. Verify Karamo status specifically
SELECT 'KARAMO STATUS CHECK:' as info;

SELECT
    o.name,
    o.plan_type,
    o.max_minutes_monthly as "minutes_available",
    o.used_minutes as "minutes_used",
    o.max_minutes_monthly - o.used_minutes as "remaining",
    o.next_reset_date,
    'Never resets - usage accumulates' as "special_rule"
FROM organizations o
WHERE LOWER(o.name) = 'karamo';

-- 11. Show functions created
SELECT 'FUNCTIONS CREATED:' as info;

SELECT
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc
WHERE proname IN ('handle_plan_upgrade', 'reset_usage_30_day_cycle',
                  'daily_billing_cycle_check', 'manual_reset_org',
                  'increment_used_minutes')
ORDER BY proname;