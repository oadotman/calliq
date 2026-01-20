#!/bin/bash

# =====================================================
# VPS LOG CHECKING SCRIPT
# Check various logs to diagnose issues
# =====================================================

echo "========================================="
echo "VPS Diagnostic Log Check"
echo "========================================="

# 1. Check PM2 logs for the main app
echo -e "\n📋 PM2 Application Logs (last 50 lines):"
echo "----------------------------------------"
pm2 logs synqall --lines 50 --nostream

# 2. Check PM2 logs for the queue worker
echo -e "\n📋 PM2 Queue Worker Logs (last 50 lines):"
echo "----------------------------------------"
pm2 logs synqall-worker --lines 50 --nostream

# 3. Check PM2 status
echo -e "\n📊 PM2 Process Status:"
echo "----------------------------------------"
pm2 status

# 4. Check Redis status
echo -e "\n🔴 Redis Status:"
echo "----------------------------------------"
redis-cli ping && echo "Redis is running" || echo "Redis is NOT running"
redis-cli info server | grep redis_version

# 5. Check if Redis has any queued jobs
echo -e "\n📦 Redis Queue Status:"
echo "----------------------------------------"
redis-cli -h localhost -p 6379 <<EOF
KEYS bull:call-processing:*
LLEN bull:call-processing:wait
LLEN bull:call-processing:failed
EOF

# 6. Check Node.js error logs
echo -e "\n🚨 Node.js Error Logs (if any):"
echo "----------------------------------------"
if [ -f "/var/log/nodejs/error.log" ]; then
    tail -50 /var/log/nodejs/error.log
else
    echo "No Node.js error log found"
fi

# 7. Check system logs for Node/NPM errors
echo -e "\n💻 System Logs (Node related):"
echo "----------------------------------------"
journalctl -u node -n 50 --no-pager 2>/dev/null || echo "No systemd logs for node"

# 8. Check disk space
echo -e "\n💾 Disk Space:"
echo "----------------------------------------"
df -h /

# 9. Check memory usage
echo -e "\n🧠 Memory Usage:"
echo "----------------------------------------"
free -m

# 10. Check for any crashed processes
echo -e "\n💥 Recent crashes in dmesg:"
echo "----------------------------------------"
dmesg | grep -i "killed\|error\|fail" | tail -20

# 11. Check environment variables (without exposing secrets)
echo -e "\n🔐 Environment Check:"
echo "----------------------------------------"
if [ -f "/var/www/synqall/.env.local" ]; then
    echo "✅ .env.local exists"
    grep -c "REDIS_URL" /var/www/synqall/.env.local && echo "✅ REDIS_URL is set" || echo "❌ REDIS_URL is NOT set"
    grep -c "ASSEMBLYAI_API_KEY" /var/www/synqall/.env.local && echo "✅ ASSEMBLYAI_API_KEY is set" || echo "❌ ASSEMBLYAI_API_KEY is NOT set"
    grep -c "OPENAI_API_KEY" /var/www/synqall/.env.local && echo "✅ OPENAI_API_KEY is set" || echo "❌ OPENAI_API_KEY is NOT set"
else
    echo "❌ .env.local not found"
fi

# 12. Check if the worker process is actually running
echo -e "\n🔄 Queue Worker Process:"
echo "----------------------------------------"
ps aux | grep -i "queue-worker" | grep -v grep

# 13. Check recent API errors in the application
echo -e "\n🌐 Recent API Errors (from app logs):"
echo "----------------------------------------"
if [ -d "/var/www/synqall/.next" ]; then
    find /var/www/synqall/.next -name "*.log" -type f -exec tail -20 {} \; 2>/dev/null
else
    echo "No .next directory found"
fi

echo -e "\n========================================="
echo "Diagnostic complete!"
echo "========================================="