// =====================================================
// PM2 CONFIGURATION FOR SYNQALL PRODUCTION
// =====================================================
//
// Usage:
// 1. Copy this file to the server: /var/www/synqall/
// 2. Start: pm2 start synqall-pm2.config.js
// 3. Save: pm2 save
// 4. Startup: pm2 startup
// =====================================================

module.exports = {
  apps: [{
    name: 'synqall',
    script: '.next/standalone/server.js',
    cwd: '/var/www/synqall',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOSTNAME: '0.0.0.0'
    },
    error_file: '/var/log/pm2/synqall-error.log',
    out_file: '/var/log/pm2/synqall-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true
  }]
};
