# 🚀 QUICK DEPLOYMENT COMMANDS

Copy and paste these commands to deploy the fixes:

## Step 1: SSH and Navigate
```bash
ssh root@datalix.eu
cd /var/www/synqall
```

## Step 2: Check Redis FIRST (Critical!)
```bash
# Check if Redis is running
redis-cli ping

# If it doesn't return "PONG", start Redis:
sudo systemctl start redis-server
# OR if systemctl not available:
redis-server --daemonize yes

# Verify it's running
redis-cli ping
```

## Step 3: Pull and Build
```bash
git pull origin main
npm install
npm run build

# Copy static files to standalone directory (IMPORTANT!)
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/
```

## Step 4: Start/Restart Queue Worker
```bash
# Check if worker is running
pm2 list

# If "synqall-worker" NOT in list, start it:
pm2 start scripts/queue-worker.js --name synqall-worker --max-memory-restart 500M
pm2 save

# If it IS in list, restart it:
pm2 restart synqall-worker
```

## Step 5: Restart Main App
```bash
pm2 restart synqall
pm2 status
```

## Step 6: Verify Everything Works
```bash
# Check both are running
pm2 status

# Monitor logs (watch for errors)
pm2 logs synqall --lines 50

# Check worker logs specifically
pm2 logs synqall-worker --lines 20
```

## All-in-One Copy-Paste Block
```bash
cd /var/www/synqall && \
redis-cli ping && \
git pull origin main && \
npm install && \
npm run build && \
cp -r .next/static .next/standalone/.next/ && \
cp -r public .next/standalone/ && \
pm2 list && \
echo "Check if synqall-worker is in the list above. If not, run:" && \
echo "pm2 start scripts/queue-worker.js --name synqall-worker --max-memory-restart 500M" && \
echo "Otherwise run: pm2 restart synqall-worker" && \
pm2 restart synqall && \
pm2 status
```

## If Redis is NOT Running
```bash
# Option 1: Using systemctl (Ubuntu/Debian)
sudo systemctl start redis-server
sudo systemctl enable redis-server  # To start on boot

# Option 2: Direct start
redis-server --daemonize yes

# Option 3: If Redis not installed
sudo apt-get update
sudo apt-get install redis-server
```

## What to Look For in Logs

### Good Signs ✅
```
✅ Call enqueued for processing: [call-id]
✅ Background processing triggered for call: [call-id]
[Worker] Queue worker started and listening for jobs...
[Worker] Processing call [call-id] for user [user-id]
```

### Bad Signs ❌
```
❌ Redis connection failed
❌ ECONNREFUSED
❌ Queue processing failed
❌ All processing attempts failed
```

## Test After Deployment
1. Go to https://synqall.com/calls
2. Upload a small test audio file
3. Watch: `pm2 logs synqall-worker -f`
4. Should see processing start within seconds
5. Full transcription in 3-6 minutes

## Emergency Fixes

### If Worker Won't Start
```bash
# Check Node.js version
node --version  # Should be 18+

# Check if script exists
ls -la scripts/queue-worker.js

# Try manual start
node scripts/queue-worker.js
```

### If Redis Won't Connect
```bash
# Check Redis config
redis-cli CONFIG GET bind
redis-cli CONFIG GET protected-mode

# Check if Redis URL is set
cat .env.local | grep REDIS_URL
# Should be: REDIS_URL=redis://localhost:6379
```

### Check What's Actually Running
```bash
# See all PM2 processes
pm2 list

# Check Redis
ps aux | grep redis

# Check ports
netstat -tlpn | grep 6379  # Redis port
```

---

**KEY POINT:** Redis MUST be running for the queue to work! The worker won't function without Redis.