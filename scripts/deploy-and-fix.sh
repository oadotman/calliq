#!/bin/bash

echo "================================================"
echo "DEPLOYING CSRF FIX AND RECOVERING STUCK CALLS"
echo "================================================"
echo ""

# Navigate to the application directory
cd /var/www/synqall

echo "1. PULLING LATEST CODE FROM GITHUB"
echo "----------------------------------------"
git pull origin main
echo ""

echo "2. INSTALLING DEPENDENCIES"
echo "----------------------------------------"
npm install
echo ""

echo "3. BUILDING THE APPLICATION"
echo "----------------------------------------"
npm run build
echo ""

echo "4. RESTARTING PM2 PROCESS"
echo "----------------------------------------"
pm2 restart synqall
echo ""

echo "5. WAITING FOR APP TO START (15 seconds)"
echo "----------------------------------------"
sleep 15
echo ""

echo "6. CHECKING PM2 STATUS"
echo "----------------------------------------"
pm2 status
echo ""

echo "7. RUNNING RECOVERY SCRIPT FOR STUCK CALLS"
echo "----------------------------------------"
node scripts/recover-stuck-calls.js
echo ""

echo "8. CHECKING RECENT LOGS"
echo "----------------------------------------"
pm2 logs synqall --lines 20 --nostream
echo ""

echo "================================================"
echo "DEPLOYMENT COMPLETE!"
echo "The CSRF fix has been deployed and stuck calls should now be processing."
echo "Check your dashboard to verify calls are completing."
echo "================================================"