#!/bin/bash

# Fix deployment issues for Next.js standalone build
echo "🔧 Fixing deployment issues..."

# 1. Ensure we're in the right directory
cd /var/www/synqall

# 2. Check Redis connection
echo "📡 Checking Redis connection..."
redis-cli ping || {
    echo "❌ Redis is not running! Starting Redis..."
    sudo systemctl start redis-server || sudo service redis start
}

# 3. Clean all caches
echo "🧹 Cleaning caches..."
rm -rf .next/cache
rm -rf node_modules/.cache
rm -rf .next
rm -rf .next/standalone

# 4. Install dependencies
echo "📦 Installing dependencies..."
npm install

# 5. Build with increased memory
echo "🏗️ Building application..."
NODE_OPTIONS="--max-old-space-size=8192" npm run build

# 6. Copy ALL required files for standalone deployment
echo "📋 Copying files for standalone deployment..."
mkdir -p .next/standalone/.next/server
mkdir -p .next/standalone/.next/static

# Copy static files
cp -r .next/static/* .next/standalone/.next/static/ 2>/dev/null || true

# Copy public files
cp -r public .next/standalone/ 2>/dev/null || true

# Copy server files - IMPORTANT: Copy all server directories
cp -r .next/server/app .next/standalone/.next/server/ 2>/dev/null || true
cp -r .next/server/chunks .next/standalone/.next/server/ 2>/dev/null || true
cp -r .next/server/pages .next/standalone/.next/server/ 2>/dev/null || true
cp -r .next/server/vendor-chunks .next/standalone/.next/server/ 2>/dev/null || true

# Copy required config files
cp package.json .next/standalone/
cp -r node_modules .next/standalone/ 2>/dev/null || {
    echo "⚠️ node_modules too large, installing production deps instead..."
    cd .next/standalone
    npm install --production
    cd ../..
}

# 7. Copy environment files
echo "🔐 Copying environment files..."
cp .env.local .next/standalone/ 2>/dev/null || true
cp .env.production .next/standalone/ 2>/dev/null || true
cp .env .next/standalone/ 2>/dev/null || true

# 8. Create a proper PM2 ecosystem file if it doesn't exist
echo "⚙️ Creating PM2 ecosystem file..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'synqall',
      script: '.next/standalone/server.js',
      cwd: '/var/www/synqall',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      max_memory_restart: '2G',
      node_args: '--max-old-space-size=2048'
    },
    {
      name: 'synqall-worker',
      script: 'scripts/queue-worker.js',
      cwd: '/var/www/synqall',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/worker-err.log',
      out_file: './logs/worker-out.log',
      log_file: './logs/worker-combined.log',
      time: true,
      max_memory_restart: '1G'
    }
  ]
};
EOF

# 9. Create logs directory
mkdir -p logs

# 10. Restart PM2 services
echo "🔄 Restarting PM2 services..."
pm2 stop all
pm2 delete all
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 11. Check PM2 status
echo "✅ Checking PM2 status..."
pm2 status

# 12. Show recent logs
echo "📝 Recent logs:"
pm2 logs --lines 20

echo "✨ Deployment fix complete!"
echo ""
echo "🔍 To check for errors, run:"
echo "  pm2 logs synqall --err --lines 50"
echo ""
echo "💡 If you still see 500 errors, check:"
echo "  1. Environment variables: Make sure all required vars are in .env.local"
echo "  2. Database connection: Check Supabase is accessible"
echo "  3. Redis connection: Ensure Redis is running"