# 🚀 CRITICAL DEPLOYMENT - Call Processing Fix

**Date:** January 3, 2025
**Commit:** 869c7e6
**Priority:** URGENT - Customer-facing issue

## What We Fixed

1. **Environment Variable Mismatch** - Changed NEXT_PUBLIC_BASE_URL → NEXT_PUBLIC_APP_URL
2. **Smart Fire-and-Forget Pattern** - Reverted aggressive timeouts, now using 5-second health checks
3. **Queue Fallback Mechanism** - Tries queue first, falls back to direct processing
4. **Worker Health Check Script** - Added tool to ensure worker is running

## Deployment Steps

### Step 1: SSH to Server
```bash
ssh root@datalix.eu
cd /var/www/synqall
```

### Step 2: Pull Latest Changes
```bash
git pull origin main
```

### Step 3: Install Dependencies (if any new)
```bash
npm install
```

### Step 4: Build the Application
```bash
npm run build
```

### Step 5: Check Redis is Running
```bash
redis-cli ping
# Should return: PONG

# If not running, start it:
sudo systemctl start redis-server
# OR
redis-server --daemonize yes
```

### Step 6: Start/Restart Queue Worker
```bash
# Check if worker is already running
pm2 list

# If not running, start it:
pm2 start scripts/queue-worker.js --name synqall-worker --max-memory-restart 500M

# If running, restart it:
pm2 restart synqall-worker

# Save PM2 configuration
pm2 save
pm2 startup  # If not already configured
```

### Step 7: Restart Main Application
```bash
pm2 restart synqall
```

### Step 8: Verify Everything is Running
```bash
# Run the health check script
node scripts/ensure-worker-running.js

# Check PM2 status
pm2 status

# Monitor logs
pm2 logs --lines 50
```

### Step 9: Test a Call Upload
1. Go to https://synqall.com/calls
2. Upload a test audio file
3. Watch the logs: `pm2 logs synqall-worker`
4. Verify it processes within 3-6 minutes

## If Something Goes Wrong

### Check API Keys
```bash
# Check if AssemblyAI key is valid
curl -X GET "https://api.assemblyai.com/v2/transcript" \
  -H "authorization: $ASSEMBLYAI_API_KEY"

# Check environment variables
cat .env.local | grep -E "ASSEMBLYAI|OPENAI|REDIS"
```

### Check Worker Logs
```bash
pm2 logs synqall-worker --lines 100
```

### Check Main App Logs
```bash
pm2 logs synqall --lines 100 | grep -i error
```

### Emergency Rollback
```bash
# If needed, rollback to previous version
git log --oneline -5  # Find previous commit
git checkout [previous-commit-hash]
npm run build
pm2 restart all
```

## What to Monitor After Deployment

1. **Queue Processing**
   ```bash
   # Watch queue worker logs
   pm2 logs synqall-worker -f
   ```

2. **Error Rate**
   ```bash
   # Monitor for errors
   pm2 logs synqall -f | grep -i error
   ```

3. **Database for Stuck Calls**
   ```sql
   -- Check for calls stuck in processing
   SELECT id, created_at, status, assemblyai_error
   FROM calls
   WHERE status = 'processing'
   AND created_at < NOW() - INTERVAL '30 minutes';
   ```

## Success Indicators

✅ Worker shows "Queue worker started and listening for jobs..."
✅ Redis responds with PONG
✅ PM2 shows both synqall and synqall-worker as "online"
✅ New uploads process within 3-6 minutes
✅ No timeout errors in logs

## Support Contact

If issues persist after deployment:
1. Check the CRITICAL_REAUDIT_REPORT.md for detailed analysis
2. Verify all API keys are valid and have credits
3. Ensure server has sufficient memory/CPU

---

**Remember:** The fire-and-forget pattern is GOOD. Don't wait for long operations to complete synchronously!