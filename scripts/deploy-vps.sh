#!/bin/bash
# =====================================================
# VPS DEPLOYMENT SCRIPT FOR SYNQALL
# Fixes issues with public pages and standalone build
# =====================================================

set -e  # Exit on error

echo "🚀 Starting SynQall deployment..."

# Navigate to project directory
cd /var/www/synqall

# Pull latest changes
echo "📥 Pulling latest changes from main branch..."
git pull origin main

# Check Redis connection
echo "🔍 Checking Redis connection..."
redis-cli ping || echo "⚠️ Redis not responding, continuing anyway..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf .next/cache node_modules/.cache .next

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --prefer-offline --no-audit

# Set production environment
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1

# Build the application with increased memory
echo "🔨 Building application..."
NODE_OPTIONS="--max-old-space-size=8192" npm run build

# Prepare standalone deployment
echo "📁 Preparing standalone deployment..."

# Create standalone structure
mkdir -p .next/standalone/.next/server

# Copy ALL required static files
echo "📋 Copying static files..."
cp -r .next/static .next/standalone/.next/

# Copy public directory (if exists)
if [ -d "public" ]; then
  cp -r public .next/standalone/
fi

# Copy ALL server files (not just app and chunks)
echo "📋 Copying server files..."
cp -r .next/server/* .next/standalone/.next/server/ 2>/dev/null || true

# Copy required root files
echo "📋 Copying configuration files..."
cp package.json .next/standalone/
cp package-lock.json .next/standalone/ 2>/dev/null || true

# Copy environment files if they exist
if [ -f ".env.production" ]; then
  cp .env.production .next/standalone/
fi
if [ -f ".env.local" ]; then
  cp .env.local .next/standalone/
fi

# Copy the standalone server file if it exists
if [ -f ".next/standalone/server.js" ]; then
  echo "✅ Standalone server.js found"
else
  echo "⚠️ Warning: standalone/server.js not found - build might be incomplete"
fi

# Ensure middleware is included
if [ -f "middleware.ts" ] || [ -f "middleware.js" ]; then
  echo "✅ Middleware file detected"
fi

# Create a production startup script if it doesn't exist
cat > .next/standalone/start.sh << 'EOF'
#!/bin/bash
export NODE_ENV=production
export PORT=${PORT:-3000}
export HOSTNAME=${HOSTNAME:-0.0.0.0}
node server.js
EOF
chmod +x .next/standalone/start.sh

# Restart services
echo "🔄 Restarting services..."

# Restart worker first
pm2 restart synqall-worker || pm2 start ecosystem.config.js --only synqall-worker

# Restart main application
pm2 restart synqall || pm2 start ecosystem.config.js --only synqall

# Show status
echo "📊 Current PM2 status:"
pm2 status

# Verify deployment
echo "✅ Deployment complete!"
echo ""
echo "🔍 Checking application health..."

# Wait for application to start
sleep 5

# Check if application is responding
curl -f http://localhost:3000/api/health || echo "⚠️ Health check failed - please check logs"

echo ""
echo "📝 To view logs, run:"
echo "  pm2 logs synqall"
echo "  pm2 logs synqall-worker"