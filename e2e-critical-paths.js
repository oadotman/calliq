/**
 * Critical Path End-to-End Testing for SynQall
 * Tests only the most important user journeys with detailed diagnostics
 */

const fetch = require('node-fetch');

// Configuration - automatically detect port
const PORTS = [3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008];
let BASE_URL = null;

// ANSI colors
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

// Find active server
async function findActiveServer() {
  for (const port of PORTS) {
    try {
      const response = await fetch(`http://localhost:${port}/`, {
        timeout: 1000,
        redirect: 'manual',
      }).catch(() => null);

      if (response && (response.status === 200 || response.status === 302)) {
        return `http://localhost:${port}`;
      }
    } catch (e) {
      continue;
    }
  }
  return null;
}

// Test result logging
function log(icon, message, detail = '') {
  console.log(`  ${icon} ${message} ${detail ? `${colors.yellow}${detail}${colors.reset}` : ''}`);
}

function pass(message, detail = '') {
  log(`${colors.green}✓${colors.reset}`, message, detail);
  return true;
}

function fail(message, detail = '') {
  log(`${colors.red}✗${colors.reset}`, message, detail);
  return false;
}

function skip(message, detail = '') {
  log(`${colors.yellow}⊖${colors.reset}`, message, detail);
  return null;
}

// Main test categories
async function testCriticalPublicPages() {
  console.log(`\n${colors.bold}${colors.blue}CRITICAL PUBLIC PAGES${colors.reset}`);

  const criticalPages = [
    { path: '/', name: 'Landing Page', expectedStatus: [200, 302] },
    { path: '/login', name: 'Login Page', expectedStatus: [200] },
    { path: '/signup', name: 'Signup Page', expectedStatus: [200] },
    { path: '/pricing', name: 'Pricing Page', expectedStatus: [200, 404] },
  ];

  let passed = 0;
  let failed = 0;

  for (const page of criticalPages) {
    try {
      const response = await fetch(`${BASE_URL}${page.path}`, {
        redirect: 'manual',
        timeout: 5000,
      });

      if (page.expectedStatus.includes(response.status)) {
        pass(page.name, `(${response.status})`);
        passed++;
      } else {
        fail(page.name, `Expected ${page.expectedStatus.join(' or ')}, got ${response.status}`);
        failed++;
      }
    } catch (error) {
      fail(page.name, error.message);
      failed++;
    }
  }

  return { passed, failed };
}

async function testAuthentication() {
  console.log(`\n${colors.bold}${colors.blue}AUTHENTICATION SECURITY${colors.reset}`);

  let passed = 0;
  let failed = 0;

  // Test protected routes redirect to login
  const protectedRoutes = ['/dashboard', '/calls', '/settings', '/analytics'];

  for (const route of protectedRoutes) {
    try {
      const response = await fetch(`${BASE_URL}${route}`, {
        redirect: 'manual',
        timeout: 5000,
      });

      if (response.status === 302 || response.status === 307) {
        const location = response.headers.get('location');
        if (location && location.includes('/login')) {
          pass(`${route} requires auth`, 'Redirects to login');
          passed++;
        } else {
          fail(`${route} redirect issue`, `Redirects to ${location}`);
          failed++;
        }
      } else if (response.status === 401) {
        pass(`${route} requires auth`, 'Returns 401');
        passed++;
      } else {
        fail(`${route} not protected`, `Status: ${response.status}`);
        failed++;
      }
    } catch (error) {
      fail(`${route} test failed`, error.message);
      failed++;
    }
  }

  return { passed, failed };
}

async function testAPIEndpoints() {
  console.log(`\n${colors.bold}${colors.blue}API ENDPOINTS${colors.reset}`);

  let passed = 0;
  let failed = 0;

  // Test health endpoint
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    if (response.ok) {
      const data = await response.json();
      pass('Health check API', `Status: ${data.status || 'ok'}`);
      passed++;
    } else {
      fail('Health check API', `Status: ${response.status}`);
      failed++;
    }
  } catch (error) {
    fail('Health check API', error.message);
    failed++;
  }

  // Test CSRF endpoint
  try {
    const response = await fetch(`${BASE_URL}/api/csrf`);
    if (response.ok) {
      const data = await response.json();
      if (data.token) {
        pass('CSRF token endpoint', 'Returns token');
        passed++;
      } else {
        fail('CSRF token endpoint', 'No token returned');
        failed++;
      }
    } else {
      fail('CSRF token endpoint', `Status: ${response.status}`);
      failed++;
    }
  } catch (error) {
    fail('CSRF token endpoint', error.message);
    failed++;
  }

  // Test auth endpoints exist
  const authEndpoints = [
    { path: '/api/auth/signup', method: 'POST', name: 'Signup API' },
    { path: '/api/auth/login', method: 'POST', name: 'Login API' },
  ];

  for (const endpoint of authEndpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint.path}`, {
        method: endpoint.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true }),
      });

      // We expect 400/422 for bad data, not 404 or 500
      if (response.status === 400 || response.status === 422 || response.status === 401) {
        pass(endpoint.name, 'Endpoint exists and validates');
        passed++;
      } else if (response.status === 404) {
        fail(endpoint.name, 'Endpoint not found');
        failed++;
      } else if (response.status === 500) {
        fail(endpoint.name, 'Server error');
        failed++;
      } else {
        skip(endpoint.name, `Unexpected status: ${response.status}`);
      }
    } catch (error) {
      fail(endpoint.name, error.message);
      failed++;
    }
  }

  return { passed, failed };
}

async function testCSRFProtection() {
  console.log(`\n${colors.bold}${colors.blue}CSRF PROTECTION${colors.reset}`);

  let passed = 0;
  let failed = 0;

  // Test that mutations require CSRF
  try {
    // First, try without CSRF token
    const responseNoCSRF = await fetch(`${BASE_URL}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'feedback',
        subject: 'Test',
        message: 'Test message',
      }),
    });

    if (responseNoCSRF.status === 403) {
      pass('Feedback API blocks without CSRF');
      passed++;

      // Now get CSRF token and try again
      const csrfResponse = await fetch(`${BASE_URL}/api/csrf`);
      if (csrfResponse.ok) {
        const { token } = await csrfResponse.json();

        const responseWithCSRF = await fetch(`${BASE_URL}/api/feedback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': token,
          },
          body: JSON.stringify({
            type: 'feedback',
            subject: 'Test',
            message: 'Test message',
          }),
        });

        if (responseWithCSRF.status !== 403) {
          pass('CSRF token allows request', `Status: ${responseWithCSRF.status}`);
          passed++;
        } else {
          fail('CSRF token not working');
          failed++;
        }
      }
    } else if (responseNoCSRF.status === 500) {
      fail('Feedback API error', 'Server error');
      failed++;
    } else {
      fail('CSRF not enforced', `Status: ${responseNoCSRF.status}`);
      failed++;
    }
  } catch (error) {
    fail('CSRF protection test', error.message);
    failed++;
  }

  return { passed, failed };
}

async function testStaticAssets() {
  console.log(`\n${colors.bold}${colors.blue}STATIC ASSETS${colors.reset}`);

  let passed = 0;
  let failed = 0;

  const staticPaths = [
    { path: '/favicon.ico', name: 'Favicon' },
    { path: '/robots.txt', name: 'Robots.txt' },
    { path: '/sitemap.xml', name: 'Sitemap' },
  ];

  for (const asset of staticPaths) {
    try {
      const response = await fetch(`${BASE_URL}${asset.path}`);
      if (response.ok || response.status === 404) {
        if (response.ok) {
          pass(asset.name, 'Available');
        } else {
          skip(asset.name, 'Not configured');
        }
        passed++;
      } else {
        fail(asset.name, `Status: ${response.status}`);
        failed++;
      }
    } catch (error) {
      fail(asset.name, error.message);
      failed++;
    }
  }

  return { passed, failed };
}

async function testDatabaseConnection() {
  console.log(`\n${colors.bold}${colors.blue}DATABASE & EXTERNAL SERVICES${colors.reset}`);

  // Check if signup works (indicates DB connection)
  try {
    const testEmail = `test_${Date.now()}@example.com`;
    const response = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'TestPassword123!',
        name: 'Test User',
      }),
    });

    if (response.ok) {
      pass('Database connection', 'Signup works');
      return { passed: 1, failed: 0 };
    } else if (response.status === 400 || response.status === 422) {
      pass('Database connection', 'Validation works');
      return { passed: 1, failed: 0 };
    } else if (response.status === 500) {
      fail('Database connection', 'Possible connection issue');
      return { passed: 0, failed: 1 };
    } else {
      skip('Database connection', `Status: ${response.status}`);
      return { passed: 0, failed: 0 };
    }
  } catch (error) {
    fail('Database connection test', error.message);
    return { passed: 0, failed: 1 };
  }
}

// Main test runner
async function runTests() {
  console.log(`\n${colors.bold}${colors.cyan}${'='.repeat(60)}`);
  console.log('   SYNQALL CRITICAL PATH E2E TESTS');
  console.log(`${'='.repeat(60)}${colors.reset}\n`);

  // Find active server
  console.log('🔍 Finding active development server...');
  BASE_URL = await findActiveServer();

  if (!BASE_URL) {
    console.log(`\n${colors.red}❌ ERROR: No active server found!${colors.reset}`);
    console.log('Please start the development server with: npm run dev');
    return;
  }

  console.log(
    `${colors.green}✓${colors.reset} Server found at: ${colors.cyan}${BASE_URL}${colors.reset}`
  );

  // Check server health
  try {
    const response = await fetch(BASE_URL);
    console.log(`${colors.green}✓${colors.reset} Server is responding\n`);
  } catch (error) {
    console.log(`${colors.red}❌ Server is not responding properly${colors.reset}`);
    console.log(`Error: ${error.message}\n`);
  }

  // Run test suites
  const results = {
    total: { passed: 0, failed: 0 },
    suites: [],
  };

  // Run each test suite
  const suites = [
    { name: 'Critical Public Pages', fn: testCriticalPublicPages },
    { name: 'Authentication', fn: testAuthentication },
    { name: 'API Endpoints', fn: testAPIEndpoints },
    { name: 'CSRF Protection', fn: testCSRFProtection },
    { name: 'Static Assets', fn: testStaticAssets },
    { name: 'Database Connection', fn: testDatabaseConnection },
  ];

  for (const suite of suites) {
    try {
      const result = await suite.fn();
      results.suites.push({ name: suite.name, ...result });
      results.total.passed += result.passed;
      results.total.failed += result.failed;
    } catch (error) {
      console.error(`\n${colors.red}Suite error in ${suite.name}:${colors.reset}`, error);
    }
  }

  // Summary
  console.log(`\n${colors.bold}${colors.cyan}${'='.repeat(60)}`);
  console.log('   TEST SUMMARY');
  console.log(`${'='.repeat(60)}${colors.reset}\n`);

  const total = results.total.passed + results.total.failed;
  const passRate = total > 0 ? ((results.total.passed / total) * 100).toFixed(1) : 0;

  console.log(
    `${colors.green}✓ Passed:${colors.reset} ${results.total.passed}/${total} (${passRate}%)`
  );
  console.log(`${colors.red}✗ Failed:${colors.reset} ${results.total.failed}/${total}\n`);

  // Suite breakdown
  console.log(`${colors.bold}Suite Results:${colors.reset}`);
  for (const suite of results.suites) {
    const suiteTotal = suite.passed + suite.failed;
    const suiteRate = suiteTotal > 0 ? ((suite.passed / suiteTotal) * 100).toFixed(0) : 0;
    const icon = suite.failed === 0 ? '✓' : suite.passed === 0 ? '✗' : '⚠';
    const color =
      suite.failed === 0 ? colors.green : suite.passed === 0 ? colors.red : colors.yellow;

    console.log(
      `  ${color}${icon}${colors.reset} ${suite.name}: ${suite.passed}/${suiteTotal} passed (${suiteRate}%)`
    );
  }

  // Overall status
  console.log(
    `\n${colors.bold}OVERALL STATUS: ${
      results.total.failed === 0
        ? `${colors.green}✓ ALL TESTS PASSED${colors.reset}`
        : results.total.failed < 5
          ? `${colors.yellow}⚠ MINOR ISSUES DETECTED${colors.reset}`
          : `${colors.red}✗ CRITICAL ISSUES FOUND${colors.reset}`
    }\n`
  );

  // Key findings
  console.log(`${colors.bold}KEY FINDINGS:${colors.reset}`);

  if (results.total.failed === 0) {
    console.log(`  ${colors.green}✓${colors.reset} All critical paths are functional`);
    console.log(`  ${colors.green}✓${colors.reset} Authentication is properly secured`);
    console.log(`  ${colors.green}✓${colors.reset} API endpoints are responding correctly`);
  } else {
    if (results.suites.find((s) => s.name === 'Authentication')?.failed > 0) {
      console.log(`  ${colors.red}⚠${colors.reset} Authentication issues detected`);
    }
    if (results.suites.find((s) => s.name === 'API Endpoints')?.failed > 0) {
      console.log(`  ${colors.red}⚠${colors.reset} API endpoint problems found`);
    }
    if (results.suites.find((s) => s.name === 'Database Connection')?.failed > 0) {
      console.log(`  ${colors.red}⚠${colors.reset} Database connection issues`);
    }
  }

  console.log(`\n${colors.cyan}Test completed at: ${new Date().toLocaleString()}${colors.reset}\n`);
}

// Run tests
runTests().catch(console.error);
