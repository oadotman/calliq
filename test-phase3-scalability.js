/**
 * Phase 3 Scalability Testing Script
 * Tests Redis, caching, sessions, and health checks
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

// Test Redis connectivity
async function testRedisConnection() {
  logSection('Testing Redis Connection');

  const redis = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    retryStrategy: (times) => {
      if (times > 3) {
        return null; // Stop retrying after 3 attempts
      }
      return Math.min(times * 100, 2000);
    }
  });

  try {
    // Test ping
    const pingResult = await redis.ping();
    log(`✅ Redis PING: ${pingResult}`, 'green');

    // Test set/get
    await redis.set('test:key', 'test-value', 'EX', 10);
    const value = await redis.get('test:key');
    if (value === 'test-value') {
      log('✅ Redis SET/GET working correctly', 'green');
    } else {
      log('❌ Redis SET/GET failed', 'red');
    }

    // Test delete
    await redis.del('test:key');
    const deleted = await redis.get('test:key');
    if (deleted === null) {
      log('✅ Redis DELETE working correctly', 'green');
    } else {
      log('❌ Redis DELETE failed', 'red');
    }

    // Get Redis info
    const info = await redis.info('server');
    const versionMatch = info.match(/redis_version:(\S+)/);
    if (versionMatch) {
      log(`ℹ️  Redis version: ${versionMatch[1]}`, 'blue');
    }

    await redis.quit();
    return true;
  } catch (error) {
    log(`❌ Redis connection failed: ${error.message}`, 'red');
    await redis.quit();
    return false;
  }
}

// Test health endpoint
async function testHealthEndpoint() {
  logSection('Testing Health Endpoints');

  try {
    // Test simple health check
    log('Testing simple health check...', 'yellow');
    const simpleResponse = await fetch(`${BASE_URL}/api/health/v2?simple=true`);
    if (simpleResponse.ok) {
      log('✅ Simple health check passed', 'green');
    } else {
      log(`❌ Simple health check failed: ${simpleResponse.status}`, 'red');
    }

    // Test full health check
    log('\nTesting full health check...', 'yellow');
    const fullResponse = await fetch(`${BASE_URL}/api/health/v2`);
    const healthData = await fullResponse.json();

    log(`Overall status: ${healthData.status}`, healthData.status === 'healthy' ? 'green' : 'red');
    log(`Timestamp: ${healthData.timestamp}`, 'blue');
    log(`Uptime: ${Math.round(healthData.uptime)}s`, 'blue');

    // Check individual services
    log('\nService Status:', 'yellow');
    for (const [service, status] of Object.entries(healthData.services)) {
      const icon = status.status === 'healthy' ? '✅' : status.status === 'degraded' ? '⚠️' : '❌';
      const color = status.status === 'healthy' ? 'green' : status.status === 'degraded' ? 'yellow' : 'red';
      log(`  ${icon} ${service}: ${status.status} ${status.responseTime ? `(${status.responseTime}ms)` : ''}`, color);
      if (status.error) {
        log(`     Error: ${status.error}`, 'red');
      }
    }

    // Test with metrics
    log('\nTesting health check with metrics...', 'yellow');
    const metricsResponse = await fetch(`${BASE_URL}/api/health/v2?metrics=true`);
    const metricsData = await metricsResponse.json();

    if (metricsData.metrics) {
      log('✅ Metrics collection working', 'green');
      if (metricsData.metrics.cacheStats) {
        log(`  Cache keys: ${metricsData.metrics.cacheStats.totalKeys}`, 'blue');
        log(`  Redis memory: ${metricsData.metrics.cacheStats.memoryUsage}`, 'blue');
      }
      if (metricsData.metrics.memoryUsage) {
        log(`  Node.js heap: ${metricsData.metrics.memoryUsage.heapUsed}`, 'blue');
      }
    }

    return fullResponse.ok;
  } catch (error) {
    log(`❌ Health endpoint test failed: ${error.message}`, 'red');
    return false;
  }
}

// Test session management
async function testSessionManagement() {
  logSection('Testing Session Management');

  const redis = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT
  });

  try {
    // Create test sessions
    log('Creating test sessions...', 'yellow');
    const sessionData = {
      userId: 'test-user-123',
      email: 'test@example.com',
      organizationId: 'test-org-456',
      role: 'member',
      createdAt: Date.now()
    };

    // Create multiple sessions for the same user (simulating multiple devices)
    const sessionIds = [];
    for (let i = 0; i < 3; i++) {
      const sessionId = `session:test-${Date.now()}-${i}`;
      await redis.setex(sessionId, 3600, JSON.stringify(sessionData));
      sessionIds.push(sessionId);
    }

    log(`✅ Created ${sessionIds.length} test sessions`, 'green');

    // Retrieve sessions
    log('Retrieving sessions...', 'yellow');
    for (const sessionId of sessionIds) {
      const data = await redis.get(sessionId);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.userId === sessionData.userId) {
          log(`✅ Session ${sessionId} retrieved successfully`, 'green');
        }
      }
    }

    // Test session expiry
    log('Testing session expiry...', 'yellow');
    const shortLivedSession = `session:short-${Date.now()}`;
    await redis.setex(shortLivedSession, 1, JSON.stringify(sessionData));
    await new Promise(resolve => setTimeout(resolve, 1500));
    const expired = await redis.get(shortLivedSession);
    if (expired === null) {
      log('✅ Session expiry working correctly', 'green');
    } else {
      log('❌ Session did not expire as expected', 'red');
    }

    // Clean up test sessions
    for (const sessionId of sessionIds) {
      await redis.del(sessionId);
    }

    await redis.quit();
    return true;
  } catch (error) {
    log(`❌ Session management test failed: ${error.message}`, 'red');
    await redis.quit();
    return false;
  }
}

// Test cache functionality
async function testCacheManagement() {
  logSection('Testing Cache Management');

  const redis = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT
  });

  try {
    // Test cache key patterns
    log('Testing cache key patterns...', 'yellow');

    const cacheKeys = [
      'cache:user:123',
      'cache:org:456:members',
      'cache:dashboard:456:stats',
      'cache:call:789:transcript'
    ];

    // Set test cache values
    for (const key of cacheKeys) {
      const data = {
        type: key.split(':')[1],
        timestamp: Date.now(),
        data: `Test data for ${key}`
      };
      await redis.setex(key, 300, JSON.stringify(data));
    }
    log(`✅ Created ${cacheKeys.length} cache entries`, 'green');

    // Test pattern-based cache invalidation
    log('Testing pattern-based cache invalidation...', 'yellow');
    const userCacheKeys = await redis.keys('cache:user:*');
    if (userCacheKeys.length > 0) {
      await redis.del(...userCacheKeys);
      log(`✅ Invalidated ${userCacheKeys.length} user cache entries`, 'green');
    }

    // Test cache statistics
    log('Testing cache statistics...', 'yellow');
    const remainingKeys = await redis.keys('cache:*');
    log(`  Remaining cache entries: ${remainingKeys.length}`, 'blue');

    const memoryInfo = await redis.info('memory');
    const usedMemory = memoryInfo.match(/used_memory_human:(\S+)/);
    if (usedMemory) {
      log(`  Redis memory usage: ${usedMemory[1]}`, 'blue');
    }

    // Clean up
    if (remainingKeys.length > 0) {
      await redis.del(...remainingKeys);
    }

    await redis.quit();
    return true;
  } catch (error) {
    log(`❌ Cache management test failed: ${error.message}`, 'red');
    await redis.quit();
    return false;
  }
}

// Load test for cache performance
async function testCachePerformance() {
  logSection('Testing Cache Performance');

  const redis = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT
  });

  try {
    const iterations = 1000;
    const keyPrefix = 'cache:perf:';

    // Test write performance
    log(`Testing write performance (${iterations} operations)...`, 'yellow');
    const writeStart = Date.now();
    for (let i = 0; i < iterations; i++) {
      await redis.setex(`${keyPrefix}${i}`, 60, JSON.stringify({ index: i, data: 'x'.repeat(100) }));
    }
    const writeTime = Date.now() - writeStart;
    const writeOpsPerSec = Math.round(iterations / (writeTime / 1000));
    log(`✅ Write performance: ${writeOpsPerSec} ops/sec (${writeTime}ms total)`, 'green');

    // Test read performance
    log(`Testing read performance (${iterations} operations)...`, 'yellow');
    const readStart = Date.now();
    for (let i = 0; i < iterations; i++) {
      await redis.get(`${keyPrefix}${i}`);
    }
    const readTime = Date.now() - readStart;
    const readOpsPerSec = Math.round(iterations / (readTime / 1000));
    log(`✅ Read performance: ${readOpsPerSec} ops/sec (${readTime}ms total)`, 'green');

    // Clean up
    const perfKeys = await redis.keys(`${keyPrefix}*`);
    if (perfKeys.length > 0) {
      await redis.del(...perfKeys);
    }

    // Performance thresholds
    log('\nPerformance Analysis:', 'yellow');
    if (writeOpsPerSec > 5000) {
      log('  ✅ Write performance: Excellent', 'green');
    } else if (writeOpsPerSec > 1000) {
      log('  ⚠️  Write performance: Good', 'yellow');
    } else {
      log('  ❌ Write performance: Poor', 'red');
    }

    if (readOpsPerSec > 10000) {
      log('  ✅ Read performance: Excellent', 'green');
    } else if (readOpsPerSec > 5000) {
      log('  ⚠️  Read performance: Good', 'yellow');
    } else {
      log('  ❌ Read performance: Poor', 'red');
    }

    await redis.quit();
    return true;
  } catch (error) {
    log(`❌ Cache performance test failed: ${error.message}`, 'red');
    await redis.quit();
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('');
  log('🚀 Starting Phase 3 Scalability Tests', 'cyan');
  console.log('');

  const results = {
    redis: false,
    health: false,
    sessions: false,
    cache: false,
    performance: false
  };

  // Run tests
  results.redis = await testRedisConnection();

  if (results.redis) {
    results.sessions = await testSessionManagement();
    results.cache = await testCacheManagement();
    results.performance = await testCachePerformance();
  } else {
    log('\n⚠️  Skipping Redis-dependent tests due to connection failure', 'yellow');
  }

  results.health = await testHealthEndpoint();

  // Summary
  logSection('Test Summary');

  const tests = [
    { name: 'Redis Connection', result: results.redis },
    { name: 'Health Endpoints', result: results.health },
    { name: 'Session Management', result: results.sessions },
    { name: 'Cache Management', result: results.cache },
    { name: 'Cache Performance', result: results.performance }
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

  // Overall result
  if (passed === tests.length) {
    log('\n🎉 All Phase 3 scalability tests passed!', 'green');
  } else {
    log('\n⚠️  Some tests failed. Please review the output above.', 'yellow');
  }

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  log(`\n❌ Test runner error: ${error.message}`, 'red');
  process.exit(1);
});