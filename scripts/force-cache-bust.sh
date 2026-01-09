#!/bin/bash

echo "=========================================="
echo "FORCE CACHE BUST FOR ANALYTICS FIX"
echo "=========================================="
echo ""

# This script forces a complete rebuild with new build ID
# to ensure browsers load fresh JavaScript files

cd /var/www/synqall

echo "1. Stopping PM2 processes..."
pm2 stop synqall
pm2 stop synqall-worker

echo ""
echo "2. Completely removing old build..."
rm -rf .next
rm -rf node_modules/.cache

echo ""
echo "3. Installing dependencies fresh..."
npm ci

echo ""
echo "4. Building with forced new build ID..."
# Force a new build ID based on timestamp
export BUILD_ID=$(date +%s)
echo "Build ID: $BUILD_ID"
NODE_OPTIONS="--max-old-space-size=8192" npm run build

echo ""
echo "5. Checking if API routes are in the build..."
echo "Looking for analytics routes in build output:"
find .next -type f -path "*/server/app/api/analytics/*" 2>/dev/null | head -10

echo ""
echo "6. Creating standalone directory structure..."
# Ensure standalone directory exists
if [ ! -d ".next/standalone" ]; then
    echo "ERROR: Standalone build failed!"
    exit 1
fi

echo ""
echo "7. Copying ALL necessary files..."
# Copy static files
cp -r .next/static .next/standalone/.next/ 2>/dev/null || echo "No static files"

# Copy public files
cp -r public .next/standalone/ 2>/dev/null || echo "No public files"

# CRITICAL: Copy the ENTIRE server directory
echo "Copying entire server directory..."
cp -r .next/server .next/standalone/.next/ 2>/dev/null || {
    echo "Trying alternative copy method..."
    mkdir -p .next/standalone/.next/server
    cp -r .next/server/* .next/standalone/.next/server/ 2>/dev/null
}

# Copy package files
cp package.json .next/standalone/
cp package-lock.json .next/standalone/ 2>/dev/null || true

echo ""
echo "8. Verifying analytics routes in standalone..."
if find .next/standalone -type f -name "*analytics*" 2>/dev/null | grep -q "comprehensive"; then
    echo "✅ Analytics routes found in standalone build"
else
    echo "❌ WARNING: Analytics routes NOT found in standalone!"
    echo "Checking what's in the standalone server directory:"
    ls -la .next/standalone/.next/server/ | head -20
fi

echo ""
echo "9. Setting permissions..."
chown -R www-data:www-data /var/www/synqall

echo ""
echo "10. Starting PM2 processes..."
pm2 start synqall-worker || pm2 start scripts/queue-worker.js --name synqall-worker
pm2 start synqall

echo ""
echo "11. Waiting for app to start..."
sleep 10

echo ""
echo "12. Testing endpoints..."
echo "Test endpoint:"
curl -s http://localhost:3000/api/test-analytics | jq . || curl -s http://localhost:3000/api/test-analytics

echo ""
echo "Analytics endpoint:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:3000/api/analytics/comprehensive

echo ""
echo "13. Checking PM2 logs for errors..."
pm2 logs synqall --lines 30 --nostream | grep -E "error|Error|404|analytics" || echo "No errors in recent logs"

echo ""
echo "=========================================="
echo "IMPORTANT: Browser Cache Clearing"
echo "=========================================="
echo "The old JavaScript files are cached in browsers!"
echo ""
echo "Users MUST do one of these:"
echo "1. Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)"
echo "2. Open DevTools (F12) → Network tab → Check 'Disable cache' → Refresh"
echo "3. Open DevTools → Right-click refresh button → 'Empty Cache and Hard Reload'"
echo "4. Test in a new incognito/private window"
echo ""
echo "The new build ID is: $BUILD_ID"
echo "Old cached file: page-a76d38a846da9697.js"
echo "This file should be replaced after cache clear"
echo "=========================================="