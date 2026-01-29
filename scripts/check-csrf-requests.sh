#!/bin/bash

echo "================================================"
echo "ANALYZING CSRF BLOCKED REQUESTS"
echo "================================================"
echo ""

echo "1. CHECKING WHAT PATHS ARE BEING BLOCKED"
echo "----------------------------------------"
# Check the full logs to see what URLs are triggering CSRF
pm2 logs synqall --lines 200 --nostream | grep -B2 -A2 "CSRF: Blocked" | grep "Middleware: Processing request" | tail -10
echo ""

echo "2. CHECKING IF INTERNAL PROCESSING IS WORKING"
echo "----------------------------------------"
# Look for successful internal processing logs
pm2 logs synqall --lines 200 --nostream | grep -i "internal processing" | tail -5
echo ""

echo "3. CHECKING RECENT CALL PROCESSING"
echo "----------------------------------------"
# Check if calls are being processed successfully
pm2 logs synqall --lines 200 --nostream | grep -E "(Processing call|Transcription complete|AssemblyAI)" | tail -10
echo ""

echo "4. CHECKING ERROR PATTERNS"
echo "----------------------------------------"
# Group CSRF errors by host to see patterns
echo "CSRF blocks by host:"
pm2 logs synqall --err --lines 500 --nostream | grep "host:" | sed 's/.*host: //' | sort | uniq -c | sort -rn
echo ""

echo "5. CHECKING IF IT'S BOT TRAFFIC"
echo "----------------------------------------"
# Check for bot/scanner patterns
pm2 logs synqall --lines 200 --nostream | grep -E "(bot|scanner|crawler|curl|python|fetch)" -i | tail -5
echo ""

echo "================================================"