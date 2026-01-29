#!/bin/bash

echo "================================================"
echo "FORCE DEPLOYING CSRF FIX WITH COMPLETE REBUILD"
echo "================================================"
echo ""

# 1. Check if the fix is in the source code
echo "1. VERIFYING FIX IS IN SOURCE CODE"
echo "----------------------------------------"
if grep -q "Skip CSRF token validation for internal processing requests" middleware.ts; then
    echo "✅ Fix IS present in middleware.ts source"
else
    echo "❌ Fix NOT in middleware.ts - pulling latest"
    git pull origin main
fi
echo ""

# 2. Stop PM2 completely to force reload
echo "2. STOPPING PM2 PROCESS"
echo "----------------------------------------"
pm2 stop synqall
echo ""

# 3. Clear the Next.js cache and build
echo "3. CLEARING OLD BUILD AND CACHE"
echo "----------------------------------------"
rm -rf .next
rm -rf node_modules/.cache
echo "✅ Cleared old build and cache"
echo ""

# 4. Rebuild the application
echo "4. REBUILDING APPLICATION"
echo "----------------------------------------"
npm run build
echo ""

# 5. Start PM2 with --update-env to reload environment
echo "5. STARTING PM2 WITH FRESH ENVIRONMENT"
echo "----------------------------------------"
pm2 start synqall --update-env
echo ""

# 6. Show status
echo "6. CHECKING PM2 STATUS"
echo "----------------------------------------"
pm2 status
echo ""

# 7. Wait for startup
echo "7. WAITING FOR APPLICATION TO START (20 seconds)"
echo "----------------------------------------"
sleep 20
echo ""

# 8. Check if CSRF fix is working
echo "8. CHECKING LOGS FOR CSRF FIX"
echo "----------------------------------------"
echo "Recent logs (should NOT show CSRF blocked errors):"
pm2 logs synqall --lines 20 --nostream | grep -i csrf || echo "No CSRF errors found (good!)"
echo ""

echo "================================================"
echo "DEPLOYMENT COMPLETE!"
echo "Now run: node scripts/recover-stuck-calls-prod.js"
echo "================================================"