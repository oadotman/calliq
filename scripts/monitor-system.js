#!/usr/bin/env node
/**
 * System Monitoring Script
 * Runs continuous monitoring and sends alerts
 */

const Redis = require('ioredis');
const fetch = require('node-fetch');

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const CHECK_INTERVAL = parseInt(process.env.MONITOR_INTERVAL || '60000'); // 1 minute default

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  const timestamp = new Date().toISOString();
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

class SystemMonitor {
  constructor() {
    this.redis = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    this.stats = {
      checks: 0,
      healthy: 0,
      degraded: 0,
      unhealthy: 0,
      alerts: 0
    };

    this.lastAlerts = new Map();
    this.alertCooldown = 300000; // 5 minutes
  }

  async start() {
    log('🚀 Starting System Monitor', 'cyan');
    log(`Monitoring interval: ${CHECK_INTERVAL}ms`, 'blue');
    log(`Redis: ${REDIS_HOST}:${REDIS_PORT}`, 'blue');
    log(`API: ${BASE_URL}`, 'blue');

    // Initial check
    await this.checkSystem();

    // Schedule regular checks
    setInterval(() => this.checkSystem(), CHECK_INTERVAL);

    // Handle shutdown gracefully
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  async checkSystem() {
    this.stats.checks++;
    log(`Check #${this.stats.checks}`, 'cyan');

    const results = await Promise.allSettled([
      this.checkHealth(),
      this.checkMetrics(),
      this.checkRedis(),
      this.checkErrors(),
      this.checkQueues()
    ]);

    // Summarize results
    const summary = {
      healthy: results.filter(r => r.status === 'fulfilled' && r.value?.status === 'healthy').length,
      degraded: results.filter(r => r.status === 'fulfilled' && r.value?.status === 'degraded').length,
      unhealthy: results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value?.status === 'unhealthy')).length
    };

    // Update stats
    if (summary.unhealthy > 0) {
      this.stats.unhealthy++;
      log(`System Status: UNHEALTHY (${summary.unhealthy} issues)`, 'red');
    } else if (summary.degraded > 0) {
      this.stats.degraded++;
      log(`System Status: DEGRADED (${summary.degraded} warnings)`, 'yellow');
    } else {
      this.stats.healthy++;
      log(`System Status: HEALTHY ✅`, 'green');
    }

    // Show statistics
    this.showStats();
  }

  async checkHealth() {
    try {
      const response = await fetch(`${BASE_URL}/api/health/v2`);
      const health = await response.json();

      if (health.status === 'healthy') {
        log('  ✅ Health check: OK', 'green');
        return { status: 'healthy' };
      } else if (health.status === 'degraded') {
        log(`  ⚠️  Health check: DEGRADED`, 'yellow');

        // Check individual services
        for (const [service, status] of Object.entries(health.services)) {
          if (status.status !== 'healthy') {
            log(`    - ${service}: ${status.status} ${status.error || ''}`, 'yellow');
          }
        }

        return { status: 'degraded', details: health.services };
      } else {
        log(`  ❌ Health check: UNHEALTHY`, 'red');
        this.sendAlert('health', 'Health check failed', health);
        return { status: 'unhealthy', details: health };
      }
    } catch (error) {
      log(`  ❌ Health check failed: ${error.message}`, 'red');
      this.sendAlert('health', 'Health endpoint unreachable', { error: error.message });
      return { status: 'unhealthy', error: error.message };
    }
  }

  async checkMetrics() {
    try {
      const response = await fetch(`${BASE_URL}/api/monitoring/metrics?type=summary`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const metrics = await response.json();

      // Check response times
      if (metrics.responseTime?.avg > 1000) {
        log(`  ⚠️  Response time high: ${metrics.responseTime.avg}ms`, 'yellow');
        this.sendAlert('response_time', `High response time: ${metrics.responseTime.avg}ms`, metrics.responseTime);
        return { status: 'degraded', metric: 'response_time', value: metrics.responseTime.avg };
      }

      // Check error rate
      if (metrics.errors?.rate > 10) {
        log(`  ⚠️  Error rate high: ${metrics.errors.rate}/min`, 'yellow');
        this.sendAlert('error_rate', `High error rate: ${metrics.errors.rate}/min`, metrics.errors);
        return { status: 'degraded', metric: 'error_rate', value: metrics.errors.rate };
      }

      // Check cache hit rate
      if (metrics.cache?.hitRate < 70 && metrics.cache?.hits > 100) {
        log(`  ⚠️  Cache hit rate low: ${metrics.cache.hitRate}%`, 'yellow');
        return { status: 'degraded', metric: 'cache_hit_rate', value: metrics.cache.hitRate };
      }

      log('  ✅ Metrics: OK', 'green');
      return { status: 'healthy', metrics };

    } catch (error) {
      log(`  ❌ Metrics check failed: ${error.message}`, 'red');
      return { status: 'unhealthy', error: error.message };
    }
  }

  async checkRedis() {
    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;

      if (latency > 100) {
        log(`  ⚠️  Redis latency high: ${latency}ms`, 'yellow');
        return { status: 'degraded', latency };
      }

      // Check memory usage
      const info = await this.redis.info('memory');
      const usedMemory = info.match(/used_memory_human:(\S+)/)?.[1];

      log(`  ✅ Redis: OK (${latency}ms, ${usedMemory})`, 'green');
      return { status: 'healthy', latency, memory: usedMemory };

    } catch (error) {
      log(`  ❌ Redis check failed: ${error.message}`, 'red');
      this.sendAlert('redis', 'Redis connection failed', { error: error.message });
      return { status: 'unhealthy', error: error.message };
    }
  }

  async checkErrors() {
    try {
      const errorCount = await this.redis.get('metrics:errors:total');
      const errors = parseInt(errorCount || '0');

      if (errors > 100) {
        log(`  ⚠️  High error count: ${errors}`, 'yellow');
        this.sendAlert('errors', `${errors} errors detected`, { count: errors });
        return { status: 'degraded', errors };
      }

      // Check for recent errors
      const recentErrors = await this.redis.lrange('errors:recent', 0, 4);
      if (recentErrors.length > 0) {
        log(`  ℹ️  Recent errors: ${recentErrors.length}`, 'blue');

        // Parse and show error types
        const errorTypes = new Set();
        for (const error of recentErrors) {
          try {
            const parsed = JSON.parse(error);
            errorTypes.add(parsed.type);
          } catch {}
        }

        if (errorTypes.size > 0) {
          log(`    Types: ${Array.from(errorTypes).join(', ')}`, 'blue');
        }
      }

      return { status: errors > 50 ? 'degraded' : 'healthy', errors };

    } catch (error) {
      log(`  ❌ Error check failed: ${error.message}`, 'red');
      return { status: 'unhealthy', error: error.message };
    }
  }

  async checkQueues() {
    try {
      const queues = ['transcription', 'extraction', 'email'];
      const queueStatus = {};
      let maxDepth = 0;

      for (const queue of queues) {
        const depth = await this.redis.get(`metrics:queue:${queue}`);
        const size = parseInt(depth || '0');
        queueStatus[queue] = size;
        maxDepth = Math.max(maxDepth, size);
      }

      if (maxDepth > 1000) {
        log(`  ⚠️  Queue backlog detected: ${JSON.stringify(queueStatus)}`, 'yellow');
        this.sendAlert('queue', `Queue backlog: ${maxDepth} jobs`, queueStatus);
        return { status: 'degraded', queues: queueStatus };
      }

      if (maxDepth > 100) {
        log(`  ℹ️  Queue depths: ${JSON.stringify(queueStatus)}`, 'blue');
      }

      return { status: 'healthy', queues: queueStatus };

    } catch (error) {
      log(`  ❌ Queue check failed: ${error.message}`, 'red');
      return { status: 'unhealthy', error: error.message };
    }
  }

  sendAlert(type, message, details) {
    // Check cooldown
    const lastAlert = this.lastAlerts.get(type);
    if (lastAlert && Date.now() - lastAlert < this.alertCooldown) {
      return; // Skip duplicate alerts
    }

    this.stats.alerts++;
    this.lastAlerts.set(type, Date.now());

    log(`🚨 ALERT: ${message}`, 'red');
    if (details) {
      console.log('  Details:', details);
    }

    // Here you could send to external services
    // e.g., email, Slack, PagerDuty
  }

  showStats() {
    const uptime = Math.floor(process.uptime());
    const healthPercentage = this.stats.checks > 0
      ? Math.round((this.stats.healthy / this.stats.checks) * 100)
      : 0;

    log('─'.repeat(50), 'cyan');
    log(`Stats: Checks: ${this.stats.checks} | Healthy: ${healthPercentage}% | Alerts: ${this.stats.alerts} | Uptime: ${this.formatUptime(uptime)}`, 'magenta');
  }

  formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  }

  async shutdown() {
    log('\n👋 Shutting down monitor...', 'yellow');

    // Final stats
    log('\nFinal Statistics:', 'cyan');
    log(`Total checks: ${this.stats.checks}`, 'blue');
    log(`Healthy: ${this.stats.healthy}`, 'green');
    log(`Degraded: ${this.stats.degraded}`, 'yellow');
    log(`Unhealthy: ${this.stats.unhealthy}`, 'red');
    log(`Alerts sent: ${this.stats.alerts}`, 'magenta');

    await this.redis.quit();
    process.exit(0);
  }
}

// Start the monitor
const monitor = new SystemMonitor();
monitor.start().catch(error => {
  log(`Failed to start monitor: ${error.message}`, 'red');
  process.exit(1);
});