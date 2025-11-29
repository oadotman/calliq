# 🚀 DEPLOY FIXES NOW

## ⚠️ CRITICAL: Two-Step Deployment Required

The production server is currently showing HTTP parser errors. You need to:
1. Apply database migration (adds missing columns)
2. Deploy code fixes (fixes HTTP parser)

---

## Option A: Automated Deployment (Recommended)

**Run this single command on your VPS**:

```bash
ssh root@datalix.eu 'cd /var/www/synqall && bash deploy-with-migration.sh'
```

This script will:
- ✅ Pull latest code
- ✅ Apply database migration
- ✅ Verify migration succeeded
- ✅ Build and deploy
- ✅ Restart PM2

---

## Option B: Manual Step-by-Step

If Option A fails, run these commands individually:

### Step 1: Apply Database Migration

```bash
ssh root@datalix.eu
cd /var/www/synqall

# Pull latest code (includes migration file)
git fetch origin
git reset --hard origin/main

# Apply migration
# You'll need your Supabase database connection string
# Format: postgresql://postgres.[project-ref]:[password]@[host]:6543/postgres

# Replace with your actual connection string:
export DATABASE_URL="your-supabase-connection-string"

# Apply migration
psql $DATABASE_URL < database/migrations/004_fix_transcripts_schema.sql

# Verify it worked
psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'transcripts' AND column_name IN ('assemblyai_id', 'text', 'utterances');"
```

**Expected output**: Should show 3 rows (assemblyai_id, text, utterances)

### Step 2: Deploy Code

```bash
# Still on the VPS
cd /var/www/synqall

# Stop app
pm2 stop synqall

# Clean and rebuild
rm -rf .next node_modules/.cache
sudo -u www-data npm install
sudo -u www-data npm run build

# Copy static files
sudo -u www-data mkdir -p .next/standalone/.next
sudo -u www-data cp -r .next/static .next/standalone/.next/
sudo -u www-data cp -r public .next/standalone/

# Fix permissions
sudo chown -R www-data:www-data /var/www/synqall

# Restart
pm2 restart synqall
pm2 save

# Watch logs
pm2 logs synqall --lines 50
```

---

## Step 3: Test

After deployment:

1. The current upload should complete (may need to retry)
2. Upload a new test file
3. Watch logs: `pm2 logs synqall --lines 100`
4. Verify it reaches 100% without HTTP parser errors

---

## What Gets Fixed

### Before (Current State):
- ❌ HTTP parser errors in logs
- ❌ Calls stuck at 95%
- ❌ Database INSERT failures (missing columns)

### After (With Fixes):
- ✅ No HTTP parser errors
- ✅ Calls complete to 100%
- ✅ Transcripts saved correctly
- ✅ All data persisted

---

## Troubleshooting

### If migration fails:
```bash
# Check current database schema
psql $DATABASE_URL -c "\d transcripts"

# Migration is idempotent (safe to re-run)
psql $DATABASE_URL < database/migrations/004_fix_transcripts_schema.sql
```

### If build fails:
```bash
# Check Node version (should be 18+)
node --version

# Check for errors
npm run build 2>&1 | grep -i error
```

### If still getting HTTP errors after deployment:
```bash
# Verify new code is running
pm2 logs synqall --lines 20 | grep "Connection: close"

# Should see "Connection: close" in headers
```

---

## Need Help?

**Check deployment status**:
```bash
ssh root@datalix.eu 'cd /var/www/synqall && git log --oneline -5'
```

Should show recent commits:
- `5b3104c Add deployment script with database migration`
- `095186c CRITICAL: Add database migration to fix schema mismatch`
- `e824972 Fix HTTP parser error in background processing (95% stuck bug)`

---

**Ready to deploy?** Run Option A command above.
