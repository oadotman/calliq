#!/bin/bash

echo "========================================"
echo "VERIFYING ANALYTICS API DEPLOYMENT"
echo "========================================"
echo ""

# Test the analytics API directly with curl
echo "1. Testing API endpoint directly:"
echo "----------------------------------------"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" https://synqall.com/api/analytics/comprehensive

echo ""
echo "2. Checking if the route file exists on server:"
echo "----------------------------------------"
ssh root@datalix.eu "ls -la /var/www/synqall/.next/server/app/api/analytics/comprehensive/ 2>&1" || echo "Directory might not exist"

echo ""
echo "3. Checking build info:"
echo "----------------------------------------"
ssh root@datalix.eu "ls -la /var/www/synqall/.next/BUILD_ID 2>&1 && cat /var/www/synqall/.next/BUILD_ID 2>&1" || echo "BUILD_ID not found"

echo ""
echo "4. Checking if standalone server has the route:"
echo "----------------------------------------"
ssh root@datalix.eu "find /var/www/synqall/.next -name '*comprehensive*' -type f 2>&1 | head -5"

echo ""
echo "5. Checking PM2 logs for errors:"
echo "----------------------------------------"
ssh root@datalix.eu "pm2 logs synqall --lines 10 --nostream 2>&1 | grep -E 'error|Error|404|comprehensive' || echo 'No errors found'"

echo ""
echo "6. Testing with server-side curl:"
echo "----------------------------------------"
ssh root@datalix.eu "curl -s -o /dev/null -w 'Local test HTTP Status: %{http_code}\n' http://localhost:3000/api/analytics/comprehensive"

echo ""
echo "========================================"
echo "DIAGNOSTICS COMPLETE"
echo "========================================"