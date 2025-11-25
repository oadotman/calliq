# 🚀 SynQall Deployment Checklist

Use this checklist to deploy to your Datalix Debian server.

---

## Pre-Deployment

- [ ] DNS A record points to Datalix server IP
- [ ] `.env.production` file reviewed and ready
- [ ] Build completed successfully (`npm run build`)
- [ ] All secrets generated in `.env.production`

---

## Server Setup

- [ ] SSH access to Datalix server confirmed
- [ ] Node.js 20.x installed on server
- [ ] Nginx installed on server
- [ ] Port 80 and 443 open in firewall

---

## File Transfer

- [ ] Upload project to `/var/www/calliq`
- [ ] Set ownership: `sudo chown -R www-data:www-data /var/www/calliq`
- [ ] Verify `.env.production` exists on server
- [ ] Check file permissions are correct

---

## Application Setup

- [ ] Install dependencies: `npm ci --production`
- [ ] Build application: `npm run build`
- [ ] Verify build artifacts in `.next/standalone`

---

## Nginx Configuration

- [ ] Copy `synqall.nginx.conf` to `/etc/nginx/sites-available/synqall.com`
- [ ] Create symlink: `ln -s /etc/nginx/sites-available/synqall.com /etc/nginx/sites-enabled/synqall.com`
- [ ] Test nginx config: `nginx -t`
- [ ] Reload nginx: `systemctl reload nginx`

---

## SSL Certificate

- [ ] Install certbot: `apt install certbot python3-certbot-nginx`
- [ ] Obtain certificate: `certbot --nginx -d synqall.com -d www.synqall.com`
- [ ] Verify SSL: `curl -I https://synqall.com`
- [ ] Check auto-renewal: `certbot renew --dry-run`

---

## Systemd Service

- [ ] Copy `calliq.service` to `/etc/systemd/system/`
- [ ] Reload systemd: `systemctl daemon-reload`
- [ ] Start service: `systemctl start calliq`
- [ ] Enable auto-start: `systemctl enable calliq`
- [ ] Check status: `systemctl status calliq`

---

## Database Setup

- [ ] Open Supabase SQL editor
- [ ] Run `database/001_COMPREHENSIVE_SCHEMA.sql`
- [ ] Run `database/002_FIX_PERMISSIONS.sql`
- [ ] Run `database/003_ADD_OVERAGE_SYSTEM.sql`
- [ ] Verify tables created successfully

---

## Webhook Configuration

### AssemblyAI
- [ ] Add webhook URL: `https://synqall.com/api/webhooks/assemblyai`
- [ ] Set webhook secret from `.env.production`
- [ ] Test webhook delivery

### Paddle (Optional - can do later)
- [ ] Add webhook URL: `https://synqall.com/api/paddle/webhook`
- [ ] Set webhook secret from `.env.production`

---

## Verification Tests

- [ ] Service running: `systemctl status calliq`
- [ ] Health check works: `curl https://synqall.com/api/health`
- [ ] Website loads: Visit https://synqall.com
- [ ] SSL certificate valid (green padlock)
- [ ] Sign up works
- [ ] Login works
- [ ] Upload audio file
- [ ] Transcription completes
- [ ] Check logs: `journalctl -u calliq -n 50`

---

## Monitoring Setup (Optional)

- [ ] Check nginx access logs: `/var/log/nginx/calliq-access.log`
- [ ] Check nginx error logs: `/var/log/nginx/calliq-error.log`
- [ ] Check application logs: `journalctl -u calliq -f`
- [ ] Set up log rotation if needed

---

## Post-Deployment

- [ ] Test all major features
- [ ] Verify rate limiting works
- [ ] Check SSRF protection (try uploading from localhost)
- [ ] Test team invitations
- [ ] Verify usage tracking
- [ ] Test GDPR export

---

## Payment Setup (When Ready)

- [ ] Create Paddle products (Solo, Team 5, Team 10, Team 20)
- [ ] Create Paddle overage packs (500, 1000, 2500, 5000 minutes)
- [ ] Copy Paddle price IDs to `.env.production`
- [ ] Add Paddle API keys
- [ ] Test subscription flow
- [ ] Test overage purchase

---

## Backup & Maintenance

- [ ] Document server credentials securely
- [ ] Set up automated backups (Supabase handles database)
- [ ] Set up SSL certificate auto-renewal (certbot does this automatically)
- [ ] Schedule regular updates: `apt update && apt upgrade`

---

## Emergency Contacts

**Services:**
- Supabase: https://app.supabase.com/project/jycftehizpmmbprqhpvq
- AssemblyAI: https://www.assemblyai.com/dashboard
- OpenAI: https://platform.openai.com/
- Inngest: https://www.inngest.com/

**Quick Commands:**
```bash
# Restart service
sudo systemctl restart calliq

# View logs
sudo journalctl -u calliq -f

# Check nginx
sudo nginx -t
sudo systemctl reload nginx

# SSL renewal
sudo certbot renew --nginx
```

---

## ✅ Deployment Complete!

Once all items are checked, your SynQall application is live at:
**https://synqall.com**

🎉 Congratulations on your deployment!
