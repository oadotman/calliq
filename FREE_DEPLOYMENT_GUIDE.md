# CallIQ Free Deployment Guide

## 🎉 Good News!

The CallIQ application has been designed to work with **completely free services** or low-cost alternatives. You don't need Inngest or any other paid queue service!

## Free Services Configuration

### 1. ✅ Database - Supabase (FREE)
Supabase offers a generous free tier:
- 500MB database
- 2GB bandwidth
- 50,000 monthly active users
- Unlimited API requests

**Required Environment Variables:**
```bash
NEXT_PUBLIC_SUPABASE_URL=your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

### 2. ✅ Queue Processing - Bull Queue with Redis (FREE OPTIONS)

The app uses Bull Queue instead of Inngest. You have several FREE options:

#### Option A: No Redis (Simplest - Works Out of Box)
- **Just don't set Redis variables**
- Calls will be processed synchronously
- Works fine for small to medium workloads
- No additional setup required!

#### Option B: Self-Host Redis (Completely Free)
If you have your own server:
```bash
# Install Redis on Ubuntu/Debian
sudo apt update
sudo apt install redis-server

# Environment variables
REDIS_HOST=localhost
REDIS_PORT=6379
# No password needed for local Redis
```

#### Option C: Free Cloud Redis Providers

**1. Upstash (Recommended for Serverless)**
- Free tier: 10,000 commands/day
- Perfect for Vercel deployments
- Sign up at: https://upstash.com
```bash
REDIS_URL=redis://default:your-password@your-endpoint.upstash.io:port
```

**2. Railway.app**
- Free tier: 500MB, 100GB bandwidth
- Sign up at: https://railway.app
```bash
REDIS_URL=redis://default:password@host.railway.app:port
```

**3. Redis Cloud (Redis Labs)**
- Free tier: 30MB
- Sign up at: https://redis.com/try-free/
```bash
REDIS_URL=redis://default:password@redis-endpoint.com:port
```

**4. Aiven**
- Free trial: $300 credits
- Sign up at: https://aiven.io
```bash
REDIS_URL=redis://default:password@redis-endpoint.aivencloud.com:port
```

### 3. 🤖 AI Services (Required but Affordable)

#### AssemblyAI (Audio Transcription)
- **Free tier: $50 credits** (about 83 hours of audio)
- Sign up at: https://www.assemblyai.com
- After free credits: $0.01/minute (very affordable)
```bash
ASSEMBLYAI_API_KEY=your-api-key
ASSEMBLYAI_WEBHOOK_SECRET=generate-random-string
```

#### OpenAI (Data Extraction)
- **Free trial: $5-18 credits** depending on signup date
- GPT-4o-mini: $0.15 per 1M input tokens (very cheap)
- Average cost: ~$0.001 per call extraction
```bash
OPENAI_API_KEY=sk-your-api-key
```

### 4. 📧 Email Service (Optional)

#### Resend (Recommended)
- **Free tier: 3,000 emails/month**
- Sign up at: https://resend.com
```bash
RESEND_API_KEY=re_your-api-key
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_REPLY_TO=support@yourdomain.com
```

#### Alternative: Postmark
- **Free tier: 100 emails/month**
- Sign up at: https://postmarkapp.com

### 5. 💳 Payment Processing (Optional)

If you're not charging users, skip this entirely!

#### Paddle (If Needed)
- No monthly fees, only per-transaction
- Acts as Merchant of Record (handles taxes)
- Only pay when you make money

### 6. 🔍 Monitoring (Optional but Recommended)

#### Sentry (Error Tracking)
- **Free tier: 5,000 errors/month**
- Sign up at: https://sentry.io
```bash
SENTRY_DSN=your-sentry-dsn
```

#### PostHog (Analytics)
- **Free tier: 1M events/month**
- Sign up at: https://posthog.com
```bash
NEXT_PUBLIC_POSTHOG_KEY=your-key
```

## Minimal Production Setup (Completely Free)

Here's the absolute minimum you need for a working production deployment:

```bash
# .env.production

# Core App Settings
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Supabase (Free tier)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# AI Services (Free credits then pay-as-you-go)
ASSEMBLYAI_API_KEY=your-key
ASSEMBLYAI_WEBHOOK_SECRET=random-string-32-chars
OPENAI_API_KEY=sk-your-key

# Security (Generate these!)
SESSION_SECRET=generate-32-char-random-string
CSRF_SECRET=generate-32-char-random-string
CRON_SECRET=generate-32-char-random-string

# All configuration settings (already in your list)
MAX_FILE_SIZE=524288000
UPLOAD_TIMEOUT=300000
# ... rest of your configuration
```

## Deployment Options (All with Free Tiers)

### 1. Vercel (Recommended)
- **Free tier: Unlimited personal projects**
- Automatic deployments from GitHub
- Great performance
- Deploy: `vercel deploy`

### 2. Netlify
- **Free tier: 100GB bandwidth/month**
- Similar to Vercel
- Deploy via Git

### 3. Railway.app
- **Free tier: $5 credits/month**
- Can host both app and Redis
- One-click deploy

### 4. Render.com
- **Free tier: 750 hours/month**
- Can host Node.js apps
- Automatic deploys from Git

## Running the Queue Worker

If you're using Redis for background processing:

### Development
```bash
npm run worker:dev
```

### Production (with PM2 - free process manager)
```bash
# Install PM2
npm install -g pm2

# Start worker
pm2 start scripts/queue-worker.js --name calliq-worker

# Save PM2 configuration
pm2 save
pm2 startup
```

### Production (without PM2)
```bash
# Run in background
nohup node scripts/queue-worker.js &
```

## Cost Breakdown for Typical Usage

For a small to medium application (1000 calls/month, 30 min average):

| Service | Monthly Cost | Notes |
|---------|-------------|-------|
| Supabase | $0 | Free tier |
| Redis | $0 | Free tier or self-host |
| AssemblyAI | ~$3 | After free credits |
| OpenAI | ~$1 | Very efficient |
| Email | $0 | Free tier |
| Hosting | $0 | Vercel free tier |
| **Total** | **~$4/month** | |

## Quick Start Commands

```bash
# 1. Clone and install
git clone your-repo
cd calliq
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local with your values

# 3. Set up database
# Run migrations in Supabase dashboard

# 4. Test locally
npm run dev

# 5. Deploy to Vercel
vercel deploy

# 6. (Optional) Start queue worker
npm run worker
```

## Security Notes for Free Deployment

1. **Always generate secure secrets:**
```bash
# Generate 32-character secrets
openssl rand -base64 32
```

2. **Use environment variables** - Never hardcode secrets

3. **Enable RLS** in Supabase for all tables

4. **Set proper CORS** in production

## Troubleshooting

### "Queue processing not working"
- Solution: Check if Redis is configured. If not, calls will process synchronously (which is fine for most use cases)

### "Emails not sending"
- Solution: Configure Resend or remove email features if not needed

### "File uploads timing out"
- Solution: Either configure Redis for background processing or reduce MAX_FILE_SIZE

## Summary

You can run CallIQ completely free with:
- ✅ Supabase free tier
- ✅ No queue service needed (or free Redis)
- ✅ Vercel free hosting
- ✅ ~$4/month for AI services after free credits

The app has been specifically designed to work without expensive services like Inngest. Everything can be self-hosted or use generous free tiers!