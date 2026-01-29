module.exports = {
  apps: [
    {
      name: 'synqall',
      script: '.next/standalone/server.js',
      cwd: '/var/www/synqall',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0', // Important: bind to all interfaces
        NEXT_TELEMETRY_DISABLED: 1,
        // Add your production URL
        NEXT_PUBLIC_APP_URL: 'https://synqall.com',
        // These will be loaded from .env.production or .env.local
        // but we need to explicitly pass them through
      },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '2G', // Increased memory limit
      autorestart: true,
      watch: false,
      error_file: '/var/www/synqall/logs/synqall-error.log',
      out_file: '/var/www/synqall/logs/synqall-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      min_uptime: '10s',
      max_restarts: 10,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
    {
      name: 'synqall-worker',
      script: 'scripts/worker.js',
      cwd: '/var/www/synqall',
      env: {
        NODE_ENV: 'production',
        WORKER_ENABLED: 'true',
        NEXT_PUBLIC_APP_URL: 'https://synqall.com',
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/var/www/synqall/logs/worker-error.log',
      out_file: '/var/www/synqall/logs/worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
    {
      name: 'retention-cleanup',
      script: './cron-retention.sh',
      cwd: '/var/www/synqall',
      interpreter: '/bin/bash',
      cron_restart: '0 2 * * *', // Daily at 2:00 AM
      autorestart: false,
      watch: false,
    },
  ],
};
