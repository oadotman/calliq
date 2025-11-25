# 🚀 Quick Deployment Guide for SynQall

This guide assumes you've already set up the server once and just need to deploy updates.

## Prerequisites on Server
- Node.js 20.x installed
- PM2 installed globally (`npm install -g pm2`)
- Nginx installed
- SSL certificate already configured

---

## Deploy Updates (After Git Push)

### On your local machine:
```bash
# Make your changes
git add .
git commit -m "Your update message"
git push origin main
```

### On the server:
```bash
# 1. Navigate to app directory
cd /var/www/synqall

# 2. Pull latest changes
git pull origin main

# 3. Run the deployment script
chmod +x deploy-synqall.sh
./deploy-synqall.sh
```

That's it! The script will:
- ✅ Install dependencies
- ✅ Build the application
- ✅ Update nginx configuration
- ✅ Restart PM2
- ✅ Verify everything is working

---

## Manual Deployment Steps

If you prefer to run commands manually:

```bash
cd /var/www/synqall

# 1. Pull code
git pull origin main

# 2. Install dependencies
npm install

# 3. Build
npm run build

# 4. Update nginx (only if nginx config changed)
sudo cp synqall.nginx.conf /etc/nginx/sites-available/synqall.com
sudo ln -sf /etc/nginx/sites-available/synqall.com /etc/nginx/sites-enabled/synqall.com
sudo nginx -t && sudo systemctl reload nginx

# 5. Restart PM2
pm2 stop synqall
pm2 delete synqall
pm2 start synqall-pm2.config.js
pm2 save

# 6. Verify
pm2 status
pm2 logs synqall --lines 20
curl http://localhost:3000/
curl -I https://synqall.com
```

---

## Troubleshooting

### App won't start
```bash
# Check build output
cd /var/www/synqall
ls -la .next/standalone/

# Check PM2 logs
pm2 logs synqall --lines 50

# Rebuild
npm run build
pm2 restart synqall
```

### Nginx errors
```bash
# Test config
sudo nginx -t

# Check logs
sudo tail -f /var/log/nginx/synqall-error.log

# Verify port
netstat -tlnp | grep 3000
```

### 502 Bad Gateway
```bash
# Check if app is running
pm2 status
curl http://localhost:3000/

# Check nginx upstream
sudo nginx -t
sudo systemctl status nginx

# Restart everything
pm2 restart synqall
sudo systemctl reload nginx
```

---

## Quick Commands

```bash
# View logs
pm2 logs synqall

# Restart app
pm2 restart synqall

# Reload nginx
sudo systemctl reload nginx

# Check status
pm2 status
sudo systemctl status nginx

# Test endpoints
curl http://localhost:3000/
curl -I https://synqall.com
```

---

## File Structure

```
/var/www/synqall/
├── .next/
│   └── standalone/
│       └── server.js          # The actual server that runs
├── synqall.nginx.conf         # Nginx configuration
├── synqall-pm2.config.js      # PM2 configuration
├── deploy-synqall.sh          # Deployment script
└── .env.production            # Environment variables
```

---

## Environment Variables

Make sure `/var/www/synqall/.env.production` exists and has:
```env
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=https://synqall.com
# ... all other required vars
```

---

## First Time Setup Only

If deploying for the first time, follow `PRODUCTION_READY.md` instead.

For updates, just use this quick guide! 🚀
