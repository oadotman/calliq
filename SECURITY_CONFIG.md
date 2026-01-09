# Security Configuration Guide

## Critical Security Fixes Applied (Jan 9, 2026)

### 1. Fixed IDOR Vulnerability in Call Processing
- **File**: `/app/api/calls/[id]/process/route.ts`
- **Issue**: No authentication or authorization checks
- **Fix**: Added user authentication and organization-level access control
- **Impact**: Prevented unauthorized call processing

### 2. Removed Hardcoded Admin Token
- **File**: `/app/api/admin/billing-maintenance/route.ts`
- **Issue**: Fallback to hardcoded token 'your-secret-admin-key'
- **Fix**: Requires ADMIN_API_KEY environment variable, no fallback
- **Impact**: Prevented unauthorized admin access

### 3. Upgraded Password Hashing
- **File**: `/lib/partners/auth.ts`
- **Issue**: Using SHA256 for password hashing (vulnerable to brute force)
- **Fix**: Implemented bcrypt with 12 rounds and backward compatibility
- **Impact**: Significantly improved password security

## Required Environment Variables

```bash
# CRITICAL - Must be set in production
ADMIN_API_KEY=<generate-secure-random-token>  # For admin API endpoints

# Example to generate secure token:
# openssl rand -hex 32
```

## Security Recommendations

### Immediate Actions Required:
1. ✅ Set `ADMIN_API_KEY` environment variable on production server
2. ✅ Force password reset for all partner accounts (to upgrade from SHA256 to bcrypt)
3. ⚠️ Review and standardize authorization patterns across all API routes
4. ⚠️ Implement Redis-based distributed rate limiting

### Additional Security Measures to Consider:

#### 1. API Key Generation
```bash
# Generate secure API key
openssl rand -hex 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 2. Environment Variables Template
```env
# Security Configuration
ADMIN_API_KEY=<32-byte-hex-token>
ENCRYPTION_KEY=<32-byte-hex-token>
SESSION_SECRET=<32-byte-hex-token>

# Rate Limiting (if using Redis)
REDIS_URL=redis://localhost:6379
RATE_LIMIT_ENABLED=true
```

#### 3. Security Headers (Already Implemented)
- CSRF Protection ✅
- XSS Protection ✅
- Clickjacking Protection ✅
- Content Type Validation ✅

#### 4. Database Security
- Row Level Security (RLS) enabled ✅
- Parameterized queries only ✅
- Connection pooling with timeouts ✅

## Audit Summary

### Strengths:
- ✅ No SQL injection vulnerabilities (using Supabase ORM)
- ✅ Strong encryption (AES-256-GCM)
- ✅ Proper webhook signature verification
- ✅ Comprehensive rate limiting
- ✅ Good CSRF protection
- ✅ Secure session management

### Fixed Vulnerabilities:
- ✅ IDOR in call processing endpoint
- ✅ Hardcoded admin token
- ✅ Weak password hashing

### Remaining Considerations:
- ⚠️ Implement distributed rate limiting (currently in-memory only)
- ⚠️ Standardize authorization patterns across all routes
- ⚠️ Add comprehensive audit logging
- ⚠️ Consider implementing WAF (Web Application Firewall)

## Testing Security

### 1. Test Authentication
```bash
# Should fail without token
curl -X POST https://synqall.com/api/admin/billing-maintenance

# Should fail with wrong token
curl -X POST https://synqall.com/api/admin/billing-maintenance \
  -H "Authorization: Bearer wrong-token"

# Should succeed with correct token (if ADMIN_API_KEY is set)
curl -X POST https://synqall.com/api/admin/billing-maintenance \
  -H "Authorization: Bearer $ADMIN_API_KEY"
```

### 2. Test IDOR Protection
```bash
# Try to process a call without authentication (should fail)
curl -X POST https://synqall.com/api/calls/some-call-id/process

# Try to process another user's call (should fail if not in same org)
```

### 3. Password Security
- New partner passwords will use bcrypt
- Existing SHA256 passwords still work but should be migrated
- Minimum password length: 8 characters

## Deployment Checklist

Before deploying to production:
1. [ ] Set `ADMIN_API_KEY` environment variable
2. [ ] Test all admin endpoints with new authentication
3. [ ] Verify call processing requires authentication
4. [ ] Check rate limiting is working
5. [ ] Monitor for any legacy SHA256 password warnings
6. [ ] Review audit logs for unauthorized access attempts

## Support

For security concerns or questions:
- Review the full audit report in the codebase
- Check application logs for security warnings
- Monitor PM2 logs for unauthorized access attempts

---

Last Updated: January 9, 2026
Security Audit Performed By: Claude Code