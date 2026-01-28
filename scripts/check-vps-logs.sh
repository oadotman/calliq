#!/bin/bash

# Script to check VPS logs for CallIQ issues
# SSH into your VPS and run: bash check-vps-logs.sh

echo "================================================"
echo "CHECKING VPS LOGS FOR CALLIQ ISSUES"
echo "================================================"
echo ""

# Check PM2 logs
echo "1. PM2 APPLICATION LOGS (Last 100 lines)"
echo "----------------------------------------"
pm2 logs synqall --lines 100 --nostream || echo "PM2 not found or app not running"
echo ""

# Check for recent errors
echo "2. RECENT ERRORS IN PM2"
echo "----------------------------------------"
pm2 logs synqall --err --lines 50 --nostream || echo "No error logs"
echo ""

# Check system resources
echo "3. SYSTEM RESOURCES"
echo "----------------------------------------"
free -h
df -h /
echo ""

# Check if app is running
echo "4. APPLICATION STATUS"
echo "----------------------------------------"
pm2 status
echo ""

echo "Log check complete!"