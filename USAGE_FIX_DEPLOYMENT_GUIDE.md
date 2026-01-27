# 🚨 CRITICAL USAGE TRACKING FIX - DEPLOYMENT GUIDE

## Problem Summary
Users with active credits are receiving "no minutes remaining" errors due to:
1. **Dual tracking system conflict** (usage_metrics table vs organizations.used_minutes)
2. **Billing period reset issues** (overage minutes being cleared monthly)
3. **Race conditions** in usage updates
4. **Stale/incorrect usage calculations**

## Files Created/Modified

### NEW FILES (V2 Implementation)
- `/lib/usage-tracker-v2.ts` - Unified usage management system
- `/lib/client-usage-v2.ts` - Client-side V2 usage API
- `/app/api/usage/v2/route.ts` - New accurate usage endpoint
- `/scripts/diagnose-usage-issue-comprehensive.js` - Diagnostic tool
- `/scripts/fix-usage-tracking-comprehensive.sql` - Database fixes

### MODIFIED FILES
- `/components/modals/UploadModal.tsx` - Updated to use V2 API

## Deployment Steps

### Step 1: Run Diagnostics (BEFORE FIX)
```bash
# Check a specific user's usage issue
node scripts/diagnose-usage-issue-comprehensive.js user@example.com

# Save the output for comparison
```

### Step 2: Apply Database Fixes
```bash
# Connect to your production database
psql $DATABASE_URL

# Run the comprehensive fix
\i scripts/fix-usage-tracking-comprehensive.sql

# This will:
# - Fix all billing periods to current month
# - Sync used_minutes with usage_metrics
# - Preserve overage minutes (they now persist!)
# - Create improved functions and indexes
```

### Step 3: Deploy Code Changes
```bash
# Commit and push the changes
git add .
git commit -m "fix: comprehensive usage tracking system overhaul

- Implement unified usage tracker (V2) with single source of truth
- Fix billing period resets preserving overage minutes
- Add automatic usage synchronization
- Improve error messages with actionable recommendations
- Add comprehensive diagnostic tools

Fixes #usage-tracking"

git push origin main
```

### Step 4: Deploy to Production
```bash
# On your server
cd /var/www/synqall
git pull origin main
npm install
npm run build
pm2 restart synqall
```

### Step 5: Verify the Fix
```bash
# Run diagnostics again
node scripts/diagnose-usage-issue-comprehensive.js user@example.com

# Test upload flow
# 1. Try uploading a file as the affected user
# 2. Check that usage is calculated correctly
# 3. Verify error messages are accurate
```

## Key Improvements

### 1. **Single Source of Truth**
- Usage is calculated from `usage_metrics` table (authoritative source)
- `organizations.used_minutes` is automatically synced
- No more discrepancies between the two

### 2. **Overage Minutes Persistence**
- Overage minutes now persist across billing periods
- Only usage resets monthly, not purchased minutes
- Users don't lose paid-for minutes anymore

### 3. **Automatic Synchronization**
- Usage is synced on every API call
- Force sync available via `?forceSync=true` parameter
- Modal opens with fresh, accurate data

### 4. **Better Error Messages**
- Clear indication of remaining minutes
- Actionable recommendations
- Distinction between base and overage minutes

### 5. **Comprehensive Logging**
- All usage operations are logged
- Diagnostic tools for troubleshooting
- Audit trail in usage_metrics

## Monitoring

### Check Usage Accuracy
```sql
-- Compare usage_metrics vs used_minutes
SELECT
    o.name,
    o.used_minutes as column_usage,
    COALESCE(SUM(um.metric_value), 0) as metrics_usage,
    ABS(o.used_minutes - COALESCE(SUM(um.metric_value), 0)) as diff
FROM organizations o
LEFT JOIN usage_metrics um ON um.organization_id = o.id
    AND um.metric_type = 'minutes_transcribed'
    AND um.created_at >= o.current_period_start
    AND um.created_at <= o.current_period_end
GROUP BY o.id, o.name, o.used_minutes
HAVING ABS(o.used_minutes - COALESCE(SUM(um.metric_value), 0)) > 0;
```

### Check Billing Periods
```sql
-- Find outdated billing periods
SELECT name, current_period_start, current_period_end
FROM organizations
WHERE DATE_TRUNC('month', current_period_start::date) != DATE_TRUNC('month', NOW());
```

### Monitor API Errors
```bash
# Check logs for usage-related errors
tail -f /var/log/pm2/synqall-error.log | grep -i "usage\|minutes"
```

## Rollback Plan

If issues arise, you can rollback:

```bash
# Revert code changes
git revert HEAD
git push origin main

# On server
cd /var/www/synqall
git pull
npm run build
pm2 restart synqall
```

## Testing Checklist

- [ ] User with exhausted base minutes + no overage → Gets clear error
- [ ] User with remaining minutes → Can upload
- [ ] User with overage minutes → Can use them
- [ ] Month changes → Usage resets but overage persists
- [ ] Multiple simultaneous uploads → Usage tracked correctly
- [ ] API returns accurate, real-time usage
- [ ] Upload modal shows correct limits
- [ ] Error messages are clear and actionable

## Support

If users still report issues after deployment:

1. Run diagnostic script with their email
2. Check for NULL billing periods
3. Force sync their usage: `curl -X POST /api/usage/v2 -d '{"organizationId":"..."}'`
4. Check usage_metrics for their recent activity

## Long-term Improvements

Consider implementing:
- Real-time usage updates via WebSocket
- Usage alerts at 80%, 90%, 100%
- Automatic overage pack recommendations
- Usage analytics dashboard
- Predictive usage warnings