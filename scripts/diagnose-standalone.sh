#!/bin/bash

echo "=========================================="
echo "DIAGNOSING STANDALONE BUILD ISSUE"
echo "=========================================="
echo ""

cd /var/www/synqall

echo "1. Check PM2 configuration:"
echo "------------------------------------------"
pm2 show synqall | grep -E "script|cwd|error" || echo "Could not get PM2 config"

echo ""
echo "2. Check how the app is being started:"
echo "------------------------------------------"
cat ecosystem.config.js 2>/dev/null || echo "No ecosystem.config.js"
ls -la server.js 2>/dev/null || echo "No server.js in root"
ls -la .next/standalone/server.js 2>/dev/null || echo "No server.js in standalone"

echo ""
echo "3. Check if standalone server.js exists:"
echo "------------------------------------------"
if [ -f ".next/standalone/server.js" ]; then
    echo "✅ Standalone server.js exists"
    echo "First 20 lines of server.js:"
    head -20 .next/standalone/server.js
else
    echo "❌ Standalone server.js NOT FOUND!"
fi

echo ""
echo "4. Check API route files in standalone:"
echo "------------------------------------------"
echo "Looking for analytics API files:"
find .next/standalone -type f -path "*api/analytics*" 2>/dev/null | while read -r file; do
    echo "  Found: $file"
    echo "  Size: $(du -h "$file" | cut -f1)"
done

echo ""
echo "5. Test running standalone directly:"
echo "------------------------------------------"
echo "Stopping PM2 temporarily..."
pm2 stop synqall

echo "Starting standalone server directly..."
cd .next/standalone
timeout 10 node server.js &
STANDALONE_PID=$!
sleep 5

echo "Testing API directly:"
curl -s -o /dev/null -w "Direct test status: %{http_code}\n" http://localhost:3000/api/analytics/comprehensive

kill $STANDALONE_PID 2>/dev/null

cd /var/www/synqall
echo "Restarting PM2..."
pm2 start synqall

echo ""
echo "6. Check Next.js route manifest:"
echo "------------------------------------------"
if [ -f ".next/routes-manifest.json" ]; then
    echo "Checking for analytics in routes manifest:"
    grep -o '"src":"[^"]*analytics[^"]*"' .next/routes-manifest.json | head -5 || echo "No analytics routes in manifest"
fi

echo ""
echo "7. Check build output:"
echo "------------------------------------------"
if [ -f ".next/BUILD_ID" ]; then
    echo "Build ID: $(cat .next/BUILD_ID)"
fi
echo "Build trace:"
ls -la .next/trace 2>/dev/null || echo "No trace file"

echo ""
echo "=========================================="
echo "DIAGNOSIS COMPLETE"
echo "=========================================="