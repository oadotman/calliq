#!/bin/bash

echo "=========================================="
echo "FIXING ANALYTICS 404 ON PRODUCTION"
echo "=========================================="
echo ""

# SSH into the server and perform cache-busting rebuild
ssh root@datalix.eu << 'EOF'
cd /var/www/synqall

echo "1. Current git status:"
echo "----------------------------------------"
git status

echo ""
echo "2. Pulling latest changes:"
echo "----------------------------------------"
git pull origin main

echo ""
echo "3. Checking if analytics routes exist:"
echo "----------------------------------------"
ls -la app/api/analytics/comprehensive/

echo ""
echo "4. Clearing Next.js cache:"
echo "----------------------------------------"
rm -rf .next/cache
rm -rf node_modules/.cache

echo ""
echo "5. Installing dependencies (ensure latest):"
echo "----------------------------------------"
npm ci

echo ""
echo "6. Building with cache disabled:"
echo "----------------------------------------"
NODE_OPTIONS="--max-old-space-size=8192" npm run build

echo ""
echo "7. Checking build output for analytics routes:"
echo "----------------------------------------"
find .next -name "*analytics*" -type f | head -10

echo ""
echo "8. Restarting PM2 with flush logs:"
echo "----------------------------------------"
pm2 flush synqall
pm2 restart synqall --update-env

echo ""
echo "9. Testing analytics endpoint locally:"
echo "----------------------------------------"
sleep 5
curl -s -o /dev/null -w "Local test status: %{http_code}\n" http://localhost:3000/api/analytics/comprehensive

echo ""
echo "10. Checking PM2 logs for errors:"
echo "----------------------------------------"
pm2 logs synqall --lines 20 --nostream | grep -E "analytics|404|Error"

EOF

echo ""
echo "=========================================="
echo "DEPLOYMENT COMPLETE"
echo "=========================================="
echo ""
echo "Testing from external:"
curl -s -o /dev/null -w "External test status: %{http_code}\n" https://synqall.com/api/analytics/comprehensive

echo ""
echo "IMPORTANT: Clear your browser cache:"
echo "1. Open Chrome DevTools (F12)"
echo "2. Right-click the refresh button"
echo "3. Select 'Empty Cache and Hard Reload'"
echo ""
echo "Or test in incognito mode to bypass cache"
echo "=========================================="