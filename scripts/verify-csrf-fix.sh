#!/bin/bash

echo "================================================"
echo "VERIFYING CSRF FIX DEPLOYMENT STATUS"
echo "================================================"
echo ""

# Check if the middleware.ts has our fix
echo "1. CHECKING FOR CSRF FIX IN MIDDLEWARE"
echo "----------------------------------------"

# Look for our specific fix: checking x-internal-processing BEFORE CSRF
if grep -q "Check for internal processing header FIRST" middleware.ts; then
    echo "✅ CSRF FIX IS PRESENT in middleware.ts"
    echo ""

    # Check if it's actually checking the header first
    if grep -A2 "internalProcessingHeader === 'true'" middleware.ts | grep -q "skipping CSRF checks"; then
        echo "✅ Internal processing bypass is implemented correctly"
    else
        echo "❌ Internal processing bypass is NOT working correctly"
    fi
else
    echo "❌ CSRF FIX IS NOT DEPLOYED - middleware.ts needs update"
    echo ""
    echo "The fix is missing. You need to:"
    echo "1. Pull the latest code: git pull origin main"
    echo "2. Rebuild: npm run build"
    echo "3. Restart: pm2 restart synqall"
fi

echo ""
echo "2. CHECKING LAST GIT PULL"
echo "----------------------------------------"
git log -1 --oneline
echo ""
echo "Last pull was:"
stat -c "Last modified: %y" .git/FETCH_HEAD 2>/dev/null || echo "Never pulled"

echo ""
echo "3. CHECKING IF BUILD IS UP TO DATE"
echo "----------------------------------------"
if [ -d ".next" ]; then
    echo "Build directory exists"
    echo "Last build: $(stat -c "%y" .next/BUILD_ID 2>/dev/null || echo "Unknown")"
else
    echo "❌ No build directory found"
fi

echo ""
echo "================================================"