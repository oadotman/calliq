# Deployment Instructions: Subscription-Based Billing System

## Overview
This guide walks you through deploying the 30-day subscription-based billing system to production.

## Pre-Deployment Checklist

1. **Backup Database**
   ```bash
   pg_dump your_database_url > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Verify Karamo Organization Exists**
   - Run `scripts/check-adeliyitomiwa-organization.sql` to confirm adeliyitomiwa@yahoo.com owns Karamo organization

## Step 1: Deploy Database Changes

### 1.1 Create Increment Function
```bash
# This function enables atomic usage updates
psql $DATABASE_URL < scripts/create-increment-function.sql
```

### 1.2 Deploy Subscription-Based Billing
```bash
# Main billing system implementation
psql $DATABASE_URL < scripts/FINAL-subscription-based-billing.sql
```

### 1.3 Verify Deployment
```sql
-- Check that all organizations have subscription dates
SELECT
    name,
    plan_type,
    subscription_start_date,
    next_reset_date,
    CASE
        WHEN LOWER(name) = 'karamo' THEN 'SUPERUSER'
        ELSE 'Regular'
    END as user_type
FROM organizations
ORDER BY name;

-- Verify Karamo has superuser status
SELECT * FROM organizations WHERE LOWER(name) = 'karamo';
```

## Step 2: Set Up Automated Daily Check

### Option A: Cron Job (Linux/Unix)
```bash
# Add to crontab (runs at 2 AM daily)
0 2 * * * psql $DATABASE_URL -c "SELECT daily_billing_cycle_check();"
```

### Option B: Scheduled Task (Windows)
```powershell
# Create scheduled task
$action = New-ScheduledTaskAction -Execute "psql" -Argument "$env:DATABASE_URL -c 'SELECT daily_billing_cycle_check();'"
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
Register-ScheduledTask -TaskName "CallIQ-Billing-Reset" -Action $action -Trigger $trigger
```

### Option C: Node.js Cron (Application-Level)
```javascript
// Add to your application startup
import cron from 'node-cron';
import { createAdminClient } from '@/lib/supabase/server';

// Run daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  const supabase = createAdminClient();
  const { error } = await supabase.rpc('daily_billing_cycle_check');
  if (error) {
    console.error('Daily billing check failed:', error);
  } else {
    console.log('Daily billing check completed');
  }
});
```

## Step 3: Deploy Application Code

1. **Commit and Push Changes**
   ```bash
   git add .
   git commit -m "feat: implement subscription-based billing with superuser support"
   git push origin main
   ```

2. **Deploy to Production**
   - If using Vercel: Changes will auto-deploy
   - If manual: `npm run build && npm start`

## Step 4: Test the System

### 4.1 Test Regular User Reset
```sql
-- Manually trigger reset for testing
SELECT manual_reset_org('TestOrg');
```

### 4.2 Test Karamo Preservation
```sql
-- Verify Karamo's usage is preserved
SELECT reset_usage_30_day_cycle();
-- Check Karamo still has usage
SELECT name, used_minutes FROM organizations WHERE LOWER(name) = 'karamo';
```

### 4.3 Test Plan Upgrade
```sql
-- Test free to paid upgrade
SELECT handle_plan_upgrade(
    (SELECT id FROM organizations WHERE plan_type = 'free' LIMIT 1),
    'starter'
);
```

## Key Features Implemented

### 1. **30-Day Subscription Cycles**
- Each user gets 30 days from their signup/upgrade date
- Not tied to calendar months

### 2. **Superuser Support (Karamo)**
- adeliyitomiwa@yahoo.com's organization never resets
- Has 999,999 minutes available
- Usage accumulates but doesn't reset

### 3. **Upgrade Handling**
- Free users upgrading mid-cycle get a fresh 30-day period
- Usage resets to 0 on upgrade
- Billing cycle restarts from upgrade date

### 4. **Automatic Reset**
- Daily check function runs automatically
- Only resets organizations whose 30-day cycle has ended
- Preserves superuser usage

## Monitoring

### Check Reset Status
```sql
-- See when each organization will reset
SELECT
    name,
    plan_type,
    used_minutes || '/' || max_minutes_monthly as usage,
    next_reset_date,
    CASE
        WHEN next_reset_date <= CURRENT_DATE THEN 'DUE NOW'
        ELSE (next_reset_date - CURRENT_DATE) || ' days'
    END as days_until_reset
FROM organizations
ORDER BY next_reset_date;
```

### View Reset History
```sql
-- See recent resets (check logs)
SELECT * FROM usage_metrics
WHERE metric_type = 'billing_period_archive'
ORDER BY created_at DESC
LIMIT 10;
```

## Rollback Plan

If issues occur, rollback with:
```sql
-- Remove subscription columns
ALTER TABLE organizations
DROP COLUMN IF EXISTS subscription_start_date,
DROP COLUMN IF EXISTS last_plan_change_date,
DROP COLUMN IF EXISTS next_reset_date,
DROP COLUMN IF EXISTS billing_cycle_day;

-- Remove functions
DROP FUNCTION IF EXISTS handle_plan_upgrade;
DROP FUNCTION IF EXISTS reset_usage_30_day_cycle;
DROP FUNCTION IF EXISTS daily_billing_cycle_check;
DROP FUNCTION IF EXISTS manual_reset_org;
```

## Support

- Logs: Check application logs for "30-day cycle usage reset" messages
- Manual Reset: Use `SELECT manual_reset_org('OrgName');` for testing
- Force Reset: Use `SELECT reset_usage_30_day_cycle();` to run immediately

## Important Notes

1. **First Run**: On deployment, all organizations will be initialized with their current created_at as subscription start
2. **Karamo Special Status**: Karamo organization (adeliyitomiwa's) will NEVER have usage reset
3. **Overage Minutes**: Purchased overage minutes persist across billing cycles
4. **Upgrade Behavior**: Users upgrading from free to paid get immediate reset and new 30-day cycle