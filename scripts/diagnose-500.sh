#!/bin/bash

echo "🔍 Diagnosing 500 Internal Server Error..."
echo "========================================="

# 1. Check PM2 logs for errors
echo -e "\n📝 Recent PM2 Error Logs:"
pm2 logs synqall --err --lines 30 --nostream

# 2. Check if all required environment variables are set
echo -e "\n🔐 Checking Environment Variables:"
cd /var/www/synqall

# Check .env.local exists
if [ -f .env.local ]; then
    echo "✅ .env.local exists"
    # Check for required variables
    grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local && echo "✅ NEXT_PUBLIC_SUPABASE_URL is set" || echo "❌ NEXT_PUBLIC_SUPABASE_URL is missing"
    grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local && echo "✅ NEXT_PUBLIC_SUPABASE_ANON_KEY is set" || echo "❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing"
    grep -q "SUPABASE_SERVICE_ROLE_KEY" .env.local && echo "✅ SUPABASE_SERVICE_ROLE_KEY is set" || echo "❌ SUPABASE_SERVICE_ROLE_KEY is missing"
    grep -q "DATABASE_URL" .env.local && echo "✅ DATABASE_URL is set" || echo "❌ DATABASE_URL is missing"
    grep -q "REDIS_URL" .env.local && echo "✅ REDIS_URL is set" || echo "❌ REDIS_URL is missing"
    grep -q "NEXTAUTH_SECRET" .env.local && echo "✅ NEXTAUTH_SECRET is set" || echo "❌ NEXTAUTH_SECRET is missing"
    grep -q "ASSEMBLYAI_API_KEY" .env.local && echo "✅ ASSEMBLYAI_API_KEY is set" || echo "❌ ASSEMBLYAI_API_KEY is missing"
else
    echo "❌ .env.local does not exist!"
    echo "   You need to create it with your environment variables"
fi

# 3. Check Redis connection
echo -e "\n📡 Checking Redis Connection:"
redis-cli ping && echo "✅ Redis is running" || echo "❌ Redis is not responding"

# 4. Check if standalone files exist
echo -e "\n📂 Checking Standalone Build Files:"
if [ -f .next/standalone/server.js ]; then
    echo "✅ Standalone server.js exists"
else
    echo "❌ Standalone server.js missing - build might have failed"
fi

if [ -d .next/standalone/.next/static ]; then
    echo "✅ Static files directory exists"
else
    echo "❌ Static files missing"
fi

if [ -d .next/standalone/public ]; then
    echo "✅ Public files directory exists"
else
    echo "❌ Public files missing"
fi

# 5. Check Node.js version
echo -e "\n🟢 Node.js Version:"
node --version
echo "   (Should be 18.x or higher)"

# 6. Check disk space
echo -e "\n💾 Disk Space:"
df -h / | grep -E "Filesystem|/"

# 7. Check memory usage
echo -e "\n🧠 Memory Usage:"
free -h

# 8. Test database connection
echo -e "\n🗄️ Testing Database Connection:"
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

supabase
  .from('organizations')
  .select('count')
  .limit(1)
  .then(({ error }) => {
    if (error) {
      console.log('❌ Database connection failed:', error.message);
    } else {
      console.log('✅ Database connection successful');
    }
    process.exit(0);
  })
  .catch(err => {
    console.log('❌ Database connection error:', err.message);
    process.exit(1);
  });
" 2>/dev/null || echo "❌ Could not test database connection"

# 9. Check for common issues
echo -e "\n⚠️ Common Issues to Check:"
echo "1. If you see 'Module not found' errors - run: npm install"
echo "2. If you see 'ECONNREFUSED' for Redis - start Redis: sudo systemctl start redis-server"
echo "3. If you see database errors - check your Supabase credentials in .env.local"
echo "4. If you see 'CSRF Token Missing' - clear cookies in your browser"
echo "5. If you see memory errors - increase Node memory limit"

echo -e "\n💡 Quick Fixes to Try:"
echo "1. pm2 restart synqall"
echo "2. pm2 logs synqall --lines 50"
echo "3. curl -I http://localhost:3000 (to test if server responds)"
echo ""
echo "📋 To see full error details, run: pm2 logs synqall --err"