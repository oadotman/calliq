# Updated Deployment Commands for SynQall

## Your Current Deployment (Missing Public Files)
```bash
cd /var/www/synqall
git pull origin main
pm2 stop synqall
sudo rm -rf /var/www/synqall/.next
sudo chown -R www-data:www-data /var/www/synqall
sudo -u www-data npm install
cd /var/www/synqall
sudo -u www-data npm run build
sudo -u www-data cp -r .next/static .next/standalone/.next/static
pm2 start synqall
pm2 status
```

## FIXED Deployment (Includes Public Files)
```bash
cd /var/www/synqall
git pull origin main
pm2 stop synqall
sudo rm -rf /var/www/synqall/.next
sudo chown -R www-data:www-data /var/www/synqall
sudo -u www-data npm install
cd /var/www/synqall
sudo -u www-data npm run build

# Copy BOTH static AND public folders to standalone
sudo -u www-data cp -r .next/static .next/standalone/.next/static
sudo -u www-data cp -r public .next/standalone/public

# Update Nginx configuration
sudo cp /var/www/synqall/synqall.nginx.conf /etc/nginx/sites-available/synqall.com
sudo nginx -t
sudo systemctl reload nginx

pm2 start synqall
pm2 status
```

## Why This Fix Works
1. **Next.js standalone mode** doesn't automatically include the `public` folder
2. You must manually copy it to `.next/standalone/public`
3. The updated Nginx config serves favicon files directly from `/var/www/synqall/public`
4. This bypasses the Next.js server entirely for static files (much faster!)

## Alternative: If you don't want to copy public folder
Keep the Nginx config as updated (pointing to `/var/www/synqall/public`) and the favicon will be served directly from the main public folder.