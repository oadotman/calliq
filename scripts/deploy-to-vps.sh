#!/bin/bash

# =====================================================
# SYNQALL VPS DEPLOYMENT SCRIPT
# Complete deployment with Redis and queue worker
# =====================================================

echo "========================================="
echo "Starting SynQall Deployment"
echo "========================================="

# Navigate to project directory
cd /var/www/synqall

# 1. Check Redis status
echo "Checking Redis status..."
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is running"
else
    echo "❌ Redis is not running. Starting Redis..."
    sudo systemctl start redis-server || sudo service redis start
    sleep 2
    if redis-cli ping > /dev/null 2>&1; then
        echo "✅ Redis started successfully"
    else
        echo "❌ Failed to start Redis. Please check Redis installation."
        exit 1
    fi
fi

# 2. Clear caches
echo "Clearing caches..."
rm -rf .next/cache
rm -rf node_modules/.cache
rm -rf .next

# 3. Install dependencies
echo "Installing dependencies..."
npm install

# 4. Build the application
echo "Building application..."
NODE_OPTIONS="--max-old-space-size=8192" npm run build

# 5. Prepare standalone build
echo "Preparing standalone build..."
mkdir -p .next/standalone/.next/server
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/
cp -r .next/server/app .next/standalone/.next/server/
cp -r .next/server/chunks .next/standalone/.next/server/
cp package.json .next/standalone/

# 6. Restart queue worker
echo "Restarting queue worker..."
pm2 restart synqall-worker || pm2 start scripts/queue-worker.js --name synqall-worker

# 7. Restart main application
echo "Restarting main application..."
pm2 restart synqall

# 8. Check PM2 status
echo "Checking PM2 status..."
pm2 status

# 9. Check for stuck calls
echo "Checking for stuck calls..."
node scripts/diagnose-stuck-calls.js || true

# 10. Test Redis connection
echo "Testing Redis connection..."
node scripts/test-redis-connection.js || true

echo "========================================="
echo "Deployment complete!"
echo "========================================="