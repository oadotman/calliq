# 🚀 SynQall - Production Ready for Deployment

**Domain:** synqall.com
**Environment:** Datalix Debian Server
**Date Prepared:** November 25, 2025

---

## ✅ Production Readiness Checklist

### 1. Build Status
- [x] **Build Successful** - No compilation errors
- [x] **TypeScript Validation** - All types valid
- [x] **Edge Runtime Warnings** - Non-blocking (Node.js runtime used)
- [x] **Standalone Output** - Configured for production deployment

### 2. Domain Configuration
- [x] **Domain:** synqall.com
- [x] **.env.production** - Updated with synqall.com
- [x] **nginx.conf** - Updated with synqall.com
- [x] **deploy-to-datalix.sh** - Updated with synqall.com
- [x] **.env.example** - Updated with synqall.com

### 3. Security Configuration
- [x] **SESSION_SECRET** - Generated (32-byte base64)
- [x] **CSRF_SECRET** - Generated (32-byte base64)
- [x] **ENCRYPTION_KEY** - Generated (32-byte base64)
- [x] **ASSEMBLYAI_WEBHOOK_SECRET** - Generated (64-char hex)
- [x] **PADDLE_WEBHOOK_SECRET** - Generated (64-char hex)
- [x] **SSRF Protection** - Implemented in URL import
- [x] **Rate Limiting** - Applied to all critical endpoints
- [x] **Authorization Checks** - Admin-only for overage purchases
- [x] **Webhook Verification** - Required for AssemblyAI
- [x] **Email Validation** - RFC 5322 compliant

### 4. Environment Variables Status

#### ✅ Production Ready (Already Configured)
- NEXT_PUBLIC_APP_URL=https://synqall.com
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- ASSEMBLYAI_API_KEY
- OPENAI_API_KEY
- INNGEST_EVENT_KEY
- INNGEST_SIGNING_KEY
- SESSION_SECRET (generated)
- CSRF_SECRET (generated)
- ENCRYPTION_KEY (generated)
- ASSEMBLYAI_WEBHOOK_SECRET (generated)
- PADDLE_WEBHOOK_SECRET (generated)

#### ⚠️ Optional (Can Deploy Without These)
- RESEND_API_KEY (email service)
- RESEND_FROM_EMAIL=noreply@synqall.com
- RESEND_REPLY_TO=support@synqall.com
- NEXT_PUBLIC_SENTRY_DSN (error monitoring)
- NEXT_PUBLIC_POSTHOG_KEY (analytics)

#### 🔴 Required Before Payment Features Work
- PADDLE_API_KEY
- PADDLE_CLIENT_TOKEN
- NEXT_PUBLIC_PADDLE_VENDOR_ID
- NEXT_PUBLIC_PADDLE_PRICE_ID_SOLO
- NEXT_PUBLIC_PADDLE_PRICE_ID_TEAM_5
- NEXT_PUBLIC_PADDLE_PRICE_ID_TEAM_10
- NEXT_PUBLIC_PADDLE_PRICE_ID_TEAM_20
- NEXT_PUBLIC_PADDLE_PRICE_ID_OVERAGE_500
- NEXT_PUBLIC_PADDLE_PRICE_ID_OVERAGE_1000
- NEXT_PUBLIC_PADDLE_PRICE_ID_OVERAGE_2500
- NEXT_PUBLIC_PADDLE_PRICE_ID_OVERAGE_5000

---

## 🔧 Next Steps for Deployment

### Step 1: DNS Configuration
Point your DNS A record for synqall.com to your Datalix server IP:
```
A     synqall.com        -> YOUR_SERVER_IP
A     www.synqall.com    -> YOUR_SERVER_IP
```

Wait for DNS propagation (usually 5-15 minutes).

### Step 2: Upload Files to Server
```bash
# From your local machine, upload the project to Datalix
scp -r /path/to/calliq user@your-datalix-ip:/tmp/calliq

# SSH into Datalix
ssh user@your-datalix-ip

# Move to production location
sudo mv /tmp/calliq /var/www/calliq
sudo chown -R www-data:www-data /var/www/calliq
```

### Step 3: Install Dependencies on Server
```bash
cd /var/www/calliq

# Install Node.js 20.x (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs

# Install dependencies
npm ci --production

# Build the application
npm run build
```

### Step 4: Configure Nginx
```bash
# Copy nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/synqall

# Create symbolic link
sudo ln -s /etc/nginx/sites-available/synqall /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### Step 5: Obtain SSL Certificate
```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate for synqall.com
sudo certbot --nginx -d synqall.com -d www.synqall.com

# Certbot will automatically update nginx.conf with SSL paths
```

### Step 6: Setup Systemd Service
```bash
# Copy service file
sudo cp calliq.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Start the service
sudo systemctl start calliq

# Enable auto-start on boot
sudo systemctl enable calliq

# Check status
sudo systemctl status calliq
```

### Step 7: Configure Supabase Webhooks

#### AssemblyAI Webhook
In your Supabase dashboard, add the webhook URL:
```
https://synqall.com/api/webhooks/assemblyai
```
Use the secret from .env.production:
```
ASSEMBLYAI_WEBHOOK_SECRET=0c6cc3d9ba2598cb1d3e85c69d234dea8edfc6fa0d495a6ca953c95b8ec58fbf
```

#### Paddle Webhook (when Paddle is configured)
In your Paddle dashboard, add:
```
https://synqall.com/api/paddle/webhook
```
Use the secret from .env.production:
```
PADDLE_WEBHOOK_SECRET=0c34334322f76eb38b9a0028f7f1d9149f2e8d39b6c43278fa637cc9c2bd9738
```

### Step 8: Database Setup
Run these SQL migrations in your Supabase SQL editor:
1. `database/001_COMPREHENSIVE_SCHEMA.sql`
2. `database/002_FIX_PERMISSIONS.sql`
3. `database/003_ADD_OVERAGE_SYSTEM.sql`

### Step 9: Verify Deployment
```bash
# Check if service is running
sudo systemctl status calliq

# Check logs
sudo journalctl -u calliq -f

# Test health endpoint
curl https://synqall.com/api/health

# Check nginx logs
sudo tail -f /var/log/nginx/calliq-access.log
sudo tail -f /var/log/nginx/calliq-error.log
```

### Step 10: Initial Testing
1. Visit https://synqall.com
2. Sign up for a new account
3. Upload a test audio file
4. Verify transcription works
5. Check usage tracking
6. Test team invitation (if applicable)

---

## 📊 What Works NOW vs What Needs Paddle

### ✅ Works Now (No Paddle Required)
- User authentication (Supabase)
- Audio file upload
- Transcription (AssemblyAI)
- CRM data extraction (OpenAI)
- Usage tracking
- Team management
- GDPR features (export, delete)
- Approval workflows
- Security features (SSRF, rate limiting)

### 🔴 Requires Paddle Configuration
- Subscription plans (Solo, Team tiers)
- Payment processing
- Overage pack purchases
- Billing management
- Payment webhooks

**Note:** You can deploy and use the application NOW. Payment features can be added later when Paddle is configured.

---

## 🔐 Security Secrets Reference

These are already set in `.env.production`. Keep these secure!

```bash
SESSION_SECRET=uACI9SSQtl7HddZcOzu73JAunyQP897E+X1uUSX6DFc=
CSRF_SECRET=KKItf+dP1IDiRLuY2wLwAOZoCg38mB3dlD9iKXyc6zw=
ENCRYPTION_KEY=KtrRGrzOTifTaqC538qHKueRpniNxa38SAjCuPC8QW4=
ASSEMBLYAI_WEBHOOK_SECRET=0c6cc3d9ba2598cb1d3e85c69d234dea8edfc6fa0d495a6ca953c95b8ec58fbf
PADDLE_WEBHOOK_SECRET=0c34334322f76eb38b9a0028f7f1d9149f2e8d39b6c43278fa637cc9c2bd9738
```

**⚠️ NEVER commit these to version control!**

---

## 🐛 Troubleshooting

### Service won't start
```bash
# Check logs
sudo journalctl -u calliq -n 50 --no-pager

# Check if port 3000 is in use
sudo lsof -i :3000

# Verify .env.production exists
ls -la /var/www/calliq/.env.production
```

### Nginx errors
```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Verify upstream is running
curl http://localhost:3000/api/health
```

### SSL certificate issues
```bash
# Renew certificate manually
sudo certbot renew --nginx

# Test SSL configuration
curl -I https://synqall.com
```

### Database connection issues
```bash
# Verify Supabase credentials
cat .env.production | grep SUPABASE

# Test connection from server
curl https://jycftehizpmmbprqhpvq.supabase.co
```

---

## 📞 Support & Resources

- **Application Logs:** `sudo journalctl -u calliq -f`
- **Nginx Logs:** `/var/log/nginx/calliq-*.log`
- **Next.js Docs:** https://nextjs.org/docs
- **Supabase Docs:** https://supabase.com/docs
- **Nginx Docs:** https://nginx.org/en/docs/

---

## 🎉 You're Ready to Deploy!

Your application is **production-ready** with:
- ✅ Secure secrets generated
- ✅ Domain configured (synqall.com)
- ✅ All security patches applied
- ✅ Build successful
- ✅ Rate limiting configured
- ✅ SSL ready (via Let's Encrypt)
- ✅ Overage system fully implemented

**Follow the 10 steps above to deploy to your Datalix Debian server.**

Good luck with your deployment! 🚀
