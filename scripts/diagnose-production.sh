#!/bin/bash
# =====================================================
# PRODUCTION DIAGNOSTICS FOR SYNQALL
# Diagnose issues with public pages loading endlessly
# =====================================================

set -e

echo "🔍 SynQall Production Diagnostics"
echo "================================="
echo ""

# Check if running on VPS
if [ -d "/var/www/synqall" ]; then
  cd /var/www/synqall
  echo "✅ Running on VPS at /var/www/synqall"
else
  echo "❌ Not on VPS, exiting..."
  exit 1
fi

echo ""
echo "1. Checking Next.js build output..."
echo "------------------------------------"
if [ -f ".next/standalone/server.js" ]; then
  echo "✅ Standalone server.js exists"
else
  echo "❌ Standalone server.js NOT found - build incomplete!"
fi

if [ -d ".next/static" ]; then
  echo "✅ Static files directory exists"
  echo "   Static files count: $(find .next/static -type f | wc -l)"
else
  echo "❌ Static files directory NOT found"
fi

if [ -d ".next/server" ]; then
  echo "✅ Server directory exists"
  echo "   Server files count: $(find .next/server -type f | wc -l)"
else
  echo "❌ Server directory NOT found"
fi

echo ""
echo "2. Checking middleware..."
echo "-------------------------"
if [ -f "middleware.ts" ] || [ -f "middleware.js" ]; then
  echo "✅ Middleware file exists in root"
else
  echo "⚠️  No middleware file in root"
fi

if [ -f ".next/server/middleware.js" ]; then
  echo "✅ Compiled middleware exists"
else
  echo "❌ Compiled middleware NOT found"
fi

echo ""
echo "3. Checking public directory..."
echo "-------------------------------"
if [ -d "public" ]; then
  echo "✅ Public directory exists"
  ls -la public | head -10
else
  echo "❌ Public directory NOT found"
fi

if [ -f "public/site.webmanifest" ]; then
  echo "✅ site.webmanifest exists"
  echo "   Content preview:"
  head -5 public/site.webmanifest
else
  echo "❌ site.webmanifest NOT found"
fi

echo ""
echo "4. Checking environment..."
echo "-------------------------"
if [ -f ".env.production" ]; then
  echo "✅ .env.production exists"
  echo "   Variables defined: $(grep -c "=" .env.production || echo "0")"
else
  echo "⚠️  .env.production NOT found"
fi

if [ -f ".env.local" ]; then
  echo "✅ .env.local exists"
  echo "   Variables defined: $(grep -c "=" .env.local || echo "0")"
else
  echo "⚠️  .env.local NOT found"
fi

echo ""
echo "5. Checking PM2 status..."
echo "-------------------------"
pm2 status

echo ""
echo "6. Checking recent logs..."
echo "-------------------------"
echo "Last 20 lines of PM2 logs for synqall:"
pm2 logs synqall --lines 20 --nostream || echo "No logs available"

echo ""
echo "7. Testing endpoints..."
echo "----------------------"
echo "Testing localhost:3000..."
curl -I http://localhost:3000 2>/dev/null | head -5 || echo "❌ Failed to connect to localhost:3000"

echo ""
echo "Testing /api/health..."
curl http://localhost:3000/api/health 2>/dev/null || echo "❌ Health check failed"

echo ""
echo "Testing /partners (public page)..."
curl -I http://localhost:3000/partners 2>/dev/null | head -5 || echo "❌ Failed to load /partners"

echo ""
echo "8. Checking Redis..."
echo "-------------------"
redis-cli ping && echo "✅ Redis is running" || echo "❌ Redis not responding"

echo ""
echo "9. Checking disk space..."
echo "------------------------"
df -h / | grep -E "^/|Filesystem"

echo ""
echo "10. Checking memory..."
echo "---------------------"
free -h

echo ""
echo "================================="
echo "Diagnostics complete!"
echo ""
echo "Common issues to check:"
echo "1. If server.js is missing: Run 'npm run build' again"
echo "2. If middleware is not compiled: Check build logs for errors"
echo "3. If public pages hang: Check middleware.ts for infinite loops"
echo "4. If Redis is down: Run 'systemctl start redis'"
echo "5. If out of memory: Increase swap or upgrade VPS"
echo ""
echo "To fix deployment issues, run:"
echo "  bash scripts/deploy-vps.sh"