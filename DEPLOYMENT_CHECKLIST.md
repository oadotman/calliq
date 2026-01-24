# CallIQ/SynQall Deployment Checklist

## Critical Fixes Applied

### ✅ 1. Edge Runtime Compatibility
- **Fixed**: Removed all Node.js crypto module usage
- **Files Modified**:
  - `lib/security/csrf-simple.ts` - Uses Math.random() instead of crypto
  - `lib/middleware/request-tracing.ts` - Custom UUID generation without crypto

### ✅ 2. CSRF Protection Adjustments
- **Fixed**: Added exemptions for critical workflows
- **Files Modified**:
  - `middleware.ts` - Added csrfExemptPaths array
  - `lib/security/csrf-simple.ts` - Added isPublicPath checks
- **Exempted Paths**:
  - `/api/upload/*` - File upload endpoints
  - `/api/calls/import-url` - URL import functionality
  - `/api/teams/invite` - Team invitations
  - `/api/referrals/activate` - Referral activation

### ✅ 3. React Hooks Order
- **Fixed**: Moved useMemo hooks before conditional returns
- **Files Modified**:
  - `app/dashboard/dashboard-content.tsx` - planDisplay useMemo moved up

### ✅ 4. Database Table Names
- **Fixed**: Corrected table name from 'organization_members' to 'user_organizations'
- **Files Modified**:
  - `lib/client-usage.ts`
  - `app/api/analytics/cached-comprehensive/route.ts`

### ✅ 5. Public Routes
- **Fixed**: Made pricing and blog pages public
- **Files Modified**:
  - `middleware.ts` - Added '/pricing' and '/blog' to publicPaths

## Production Deployment Steps

### 1. Pre-Deployment Verification
```bash
# On local machine
npm run build              # Verify build succeeds
npm run test:quick         # Run basic tests
```

### 2. Server Deployment
```bash
# SSH to production server
ssh root@datalix.eu

# Navigate to app directory
cd /var/www/synqall

# Pull latest changes
git pull origin main

# Install dependencies (if package.json changed)
npm install

# Build the application
npm run build

# Verify build output
ls -la .next/standalone/
ls -la .next/static/

# Copy static files (REQUIRED for standalone build)
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/

# Restart PM2 process
pm2 restart synqall
pm2 save

# Check status
pm2 status
pm2 logs synqall --lines 50
```

### 3. Post-Deployment Verification

#### A. Health Check
```bash
# Check application health
curl https://app.synqall.com/api/health

# Check middleware is working
curl -I https://app.synqall.com
```

#### B. Test Public Pages (no auth required)
- [ ] Landing page: https://app.synqall.com/
- [ ] Pricing page: https://app.synqall.com/pricing
- [ ] Blog page: https://app.synqall.com/blog
- [ ] Partner pages: https://app.synqall.com/partners

#### C. Test Authentication Flow
- [ ] Login page loads
- [ ] Can log in successfully
- [ ] Dashboard loads without errors
- [ ] No infinite loading on dashboard

#### D. Test Critical Workflows
- [ ] **Upload Flow**:
  - Upload modal opens
  - File selection works
  - Upload completes without CSRF errors
  - Call appears in dashboard

- [ ] **Team Invitations**:
  - Can send team invitations
  - Invitation links work
  - No CSRF errors on `/api/teams/invite`

- [ ] **Import from URL**:
  - Import URL feature works
  - No CSRF blocking

#### E. Monitor Logs
```bash
# Watch PM2 logs for errors
pm2 logs synqall --lines 100

# Check for specific errors
pm2 logs synqall | grep -E "CSRF|403|500|crypto|hook"
```

## Rollback Plan (if needed)

```bash
# If deployment fails, rollback to previous version
cd /var/www/synqall
git log --oneline -5          # Find previous commit
git reset --hard <commit-id>  # Rollback to previous commit
npm install
npm run build
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/
pm2 restart synqall
```

## Common Issues & Solutions

### Issue: 500 Internal Server Error
**Solution**: Check PM2 logs for crypto module errors. Ensure all crypto usage is removed.

### Issue: 403 CSRF Token Errors
**Solution**: Verify exemptions are in both middleware.ts AND csrf-simple.ts

### Issue: Dashboard Loading Forever
**Solution**: Check for React hook errors in PM2 logs. Verify hooks are called before returns.

### Issue: 404 on API calls
**Solution**: Check table names match database schema (user_organizations not organization_members)

### Issue: Build Fails
**Solution**:
- Run `npm install` to ensure all dependencies are installed
- Check for TypeScript errors with `npm run type-check`
- Verify .env.local has all required variables

## Environment Variables Required

Ensure `.env.local` on production has:
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_BASE_URL=https://app.synqall.com
NODE_ENV=production
ASSEMBLYAI_API_KEY=
OPENAI_API_KEY=
REDIS_URL=
# ... other required variables
```

## Success Criteria

✅ Application loads without 500 errors
✅ Public pages accessible without authentication
✅ Dashboard loads successfully for logged-in users
✅ Upload functionality works without CSRF errors
✅ Team invitations can be sent and accepted
✅ No errors in PM2 logs related to:
  - Crypto module
  - CSRF validation
  - React hooks
  - Database queries

## Support Contacts

- PM2 Process Name: `synqall`
- Server: datalix.eu
- App URL: https://app.synqall.com
- Logs: `pm2 logs synqall`

---

Last Updated: January 24, 2025
Version: 1.0.0