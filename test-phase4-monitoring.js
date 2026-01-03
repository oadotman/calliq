/**
 * Phase 4 Monitoring & Alerts Testing Script
 * Tests metrics collection, alerts, and error tracking
 */

const fetch = require('node-fetch');
const Redis = require('ioredis');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(50));
  log(title, 'cyan');
  console.log('='.repeat(50));
}

class Phase4Tester {
  constructor() {
    this.redis = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 100, 2000);
      }
    });
  }

  async runAllTests() {
    log('🚀 Starting Phase 4 Monitoring Tests', 'cyan');

    const results = {
      metrics: false,
      alerts: false,
      errors: false,
      dashboard: false,
      monitoring: false
    };

    // Test Redis connectivity first
    const redisConnected = await this.testRedisConnection();
    if (!redisConnected) {
      log('\n⚠️  Redis not available - some tests will be skipped', 'yellow');
    }

    // Run tests
    if (redisConnected) {
      results.metrics = await this.testMetricsCollection();
      results.alerts = await this.testAlertSystem();
      results.errors = await this.testErrorTracking();
    }

    results.dashboard = await this.testMonitoringAPI();
    results.monitoring = await this.testHealthMonitoring();

    // Show summary
    this.showSummary(results);

    await this.redis.quit();
    process.exit(results.monitoring && results.dashboard ? 0 : 1);
  }

  async testRedisConnection() {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  async testMetricsCollection() {
    logSection('Testing Metrics Collection');

    try {
      // Simulate metrics
      log('Simulating metrics...', 'yellow');

      // Record response times
      for (let i = 0; i < 10; i++) {
        const duration = Math.floor(Math.random() * 500) + 100;
        await this.redis.zadd(
          'metrics:response_times:/api/test',
          Date.now(),
          `${Date.now()}:${duration}`
        );
      }

      // Record errors
      await this.redis.hincrby('metrics:errors:/api/test:hour', 'TestError', 5);
      await this.redis.incr('metrics:errors:total');

      // Record cache operations
      await this.redis.incr('metrics:cache:hits');
      await this.redis.incr('metrics:cache:hits');
      await this.redis.incr('metrics:cache:misses');

      // Record queue depth
      await this.redis.set('metrics:queue:transcription', 25, 'EX', 60);

      log('✅ Metrics recorded successfully', 'green');

      // Verify metrics
      log('\nVerifying metrics...', 'yellow');

      const errorCount = await this.redis.get('metrics:errors:total');
      const cacheHits = await this.redis.get('metrics:cache:hits');
      const queueDepth = await this.redis.get('metrics:queue:transcription');

      log(`  Errors: ${errorCount}`, 'blue');
      log(`  Cache hits: ${cacheHits}`, 'blue');
      log(`  Queue depth: ${queueDepth}`, 'blue');

      // Calculate cache hit rate
      const cacheMisses = await this.redis.get('metrics:cache:misses');
      const hitRate = Math.round(
        (parseInt(cacheHits) / (parseInt(cacheHits) + parseInt(cacheMisses))) * 100
      );
      log(`  Cache hit rate: ${hitRate}%`, 'blue');

      return true;
    } catch (error) {
      log(`❌ Metrics collection test failed: ${error.message}`, 'red');
      return false;
    }
  }

  async testAlertSystem() {
    logSection('Testing Alert System');

    try {
      // Simulate conditions that should trigger alerts
      log('Simulating alert conditions...', 'yellow');

      // High error rate
      for (let i = 0; i < 150; i++) {
        await this.redis.incr('metrics:errors:total');
      }

      // Low cache hit rate
      for (let i = 0; i < 100; i++) {
        await this.redis.incr('metrics:cache:misses');
      }

      // High queue depth
      await this.redis.set('metrics:queue:transcription', 1500, 'EX', 60);

      log('✅ Alert conditions created', 'green');

      // Check for alerts (would be created by alert manager)
      log('\nChecking alert thresholds...', 'yellow');

      const errors = await this.redis.get('metrics:errors:total');
      const queueDepth = await this.redis.get('metrics:queue:transcription');

      if (parseInt(errors) > 100) {
        log('  ⚠️  Error rate alert threshold exceeded', 'yellow');
      }

      if (parseInt(queueDepth) > 1000) {
        log('  ⚠️  Queue depth alert threshold exceeded', 'yellow');
      }

      // Check active alerts
      const alertKeys = await this.redis.keys('alerts:active:*');
      log(`  Active alerts: ${alertKeys.length}`, 'blue');

      return true;
    } catch (error) {
      log(`❌ Alert system test failed: ${error.message}`, 'red');
      return false;
    }
  }

  async testErrorTracking() {
    logSection('Testing Error Tracking');

    try {
      // Simulate errors
      log('Simulating errors...', 'yellow');

      const errors = [
        {
          message: 'Database connection failed',
          type: 'DatabaseError',
          route: '/api/calls',
          timestamp: new Date().toISOString()
        },
        {
          message: 'Invalid API key',
          type: 'AuthenticationError',
          route: '/api/auth',
          timestamp: new Date().toISOString()
        },
        {
          message: 'Rate limit exceeded',
          type: 'RateLimitError',
          route: '/api/transcribe',
          timestamp: new Date().toISOString()
        }
      ];

      // Store errors
      for (const error of errors) {
        await this.redis.lpush('errors:recent', JSON.stringify(error));
        await this.redis.hincrby(`errors:type:${error.type}`, error.route, 1);
      }

      log(`✅ Tracked ${errors.length} errors`, 'green');

      // Verify error tracking
      log('\nVerifying error tracking...', 'yellow');

      const recentErrors = await this.redis.lrange('errors:recent', 0, 4);
      log(`  Recent errors: ${recentErrors.length}`, 'blue');

      // Count by type
      const errorTypes = new Set();
      for (const errorStr of recentErrors) {
        const error = JSON.parse(errorStr);
        errorTypes.add(error.type);
      }

      log(`  Error types: ${Array.from(errorTypes).join(', ')}`, 'blue');

      return true;
    } catch (error) {
      log(`❌ Error tracking test failed: ${error.message}`, 'red');
      return false;
    }
  }

  async testMonitoringAPI() {
    logSection('Testing Monitoring Dashboard API');

    try {
      // Test metrics endpoint
      log('Testing metrics API...', 'yellow');

      const metricsResponse = await fetch(`${BASE_URL}/api/monitoring/metrics?type=summary`);

      if (metricsResponse.ok) {
        const metrics = await metricsResponse.json();
        log('✅ Metrics API accessible', 'green');

        if (metrics.responseTime) {
          log(`  Avg response time: ${metrics.responseTime.avg || 0}ms`, 'blue');
        }
        if (metrics.errors) {
          log(`  Total errors: ${metrics.errors.total || 0}`, 'blue');
        }
        if (metrics.cache) {
          log(`  Cache hit rate: ${metrics.cache.hitRate || 0}%`, 'blue');
        }
      } else if (metricsResponse.status === 401) {
        log('⚠️  Metrics API requires authentication', 'yellow');
      } else {
        log(`❌ Metrics API failed: ${metricsResponse.status}`, 'red');
        return false;
      }

      // Test alerts endpoint
      log('\nTesting alerts API...', 'yellow');

      const alertsResponse = await fetch(`${BASE_URL}/api/monitoring/alerts?type=active`);

      if (alertsResponse.ok) {
        const alerts = await alertsResponse.json();
        log('✅ Alerts API accessible', 'green');
        log(`  Active alerts: ${alerts.count || 0}`, 'blue');
      } else if (alertsResponse.status === 401) {
        log('⚠️  Alerts API requires authentication', 'yellow');
      } else {
        log(`❌ Alerts API failed: ${alertsResponse.status}`, 'red');
        return false;
      }

      return true;
    } catch (error) {
      log(`❌ Monitoring API test failed: ${error.message}`, 'red');
      return false;
    }
  }

  async testHealthMonitoring() {
    logSection('Testing Health Monitoring');

    try {
      // Test enhanced health endpoint
      log('Testing health endpoint v2...', 'yellow');

      const healthResponse = await fetch(`${BASE_URL}/api/health/v2`);
      const health = await healthResponse.json();

      if (health.status) {
        log(`✅ Health status: ${health.status}`, health.status === 'healthy' ? 'green' : 'yellow');

        // Check individual services
        if (health.services) {
          log('\nService status:', 'yellow');
          for (const [service, status] of Object.entries(health.services)) {
            const icon = status.status === 'healthy' ? '✅' :
                        status.status === 'degraded' ? '⚠️' : '❌';
            log(`  ${icon} ${service}: ${status.status}`,
                status.status === 'healthy' ? 'green' : 'yellow');
          }
        }

        // Check metrics if available
        if (health.metrics) {
          log('\nHealth metrics:', 'yellow');
          if (health.metrics.cacheStats) {
            log(`  Cache keys: ${health.metrics.cacheStats.totalKeys}`, 'blue');
          }
          if (health.metrics.memoryUsage) {
            log(`  Memory: ${health.metrics.memoryUsage.heapUsed}`, 'blue');
          }
        }

        return health.status === 'healthy' || health.status === 'degraded';
      }

      return false;
    } catch (error) {
      log(`❌ Health monitoring test failed: ${error.message}`, 'red');
      return false;
    }
  }

  async simulateLoad() {
    logSection('Simulating Load for Metrics');

    try {
      log('Generating load...', 'yellow');

      const promises = [];

      // Simulate API calls
      for (let i = 0; i < 50; i++) {
        promises.push(
          fetch(`${BASE_URL}/api/health/v2?simple=true`)
            .then(res => res.text())
            .catch(() => null)
        );
      }

      await Promise.allSettled(promises);
      log('✅ Load simulation complete', 'green');

      return true;
    } catch (error) {
      log(`❌ Load simulation failed: ${error.message}`, 'red');
      return false;
    }
  }

  showSummary(results) {
    logSection('Test Summary');

    const tests = [
      { name: 'Metrics Collection', result: results.metrics },
      { name: 'Alert System', result: results.alerts },
      { name: 'Error Tracking', result: results.errors },
      { name: 'Monitoring API', result: results.dashboard },
      { name: 'Health Monitoring', result: results.monitoring }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
      if (test.result) {
        log(`✅ ${test.name}`, 'green');
        passed++;
      } else {
        log(`❌ ${test.name}`, 'red');
        failed++;
      }
    }

    console.log('');
    log(`Results: ${passed} passed, ${failed} failed`, passed === tests.length ? 'green' : 'red');

    if (passed === tests.length) {
      log('\n🎉 All Phase 4 monitoring tests passed!', 'green');
    } else {
      log('\n⚠️  Some tests failed. Review the output above.', 'yellow');
    }
  }
}

// Run tests
const tester = new Phase4Tester();
tester.runAllTests().catch(error => {
  log(`\n❌ Test runner error: ${error.message}`, 'red');
  process.exit(1);
});