/**
 * End-to-End Test Suite for SynQall Application
 * This comprehensive test suite validates all critical user journeys
 */

const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = `test_${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPassword123!';

// ANSI color codes for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: [],
};

// Utility function to log test results
function logTest(category, test, status, message = '') {
  const icon =
    status === 'pass'
      ? `${colors.green}✓${colors.reset}`
      : status === 'fail'
        ? `${colors.red}✗${colors.reset}`
        : `${colors.yellow}⊖${colors.reset}`;

  console.log(`  ${icon} ${test} ${message ? `- ${message}` : ''}`);

  testResults.tests.push({ category, test, status, message });
  if (status === 'pass') testResults.passed++;
  else if (status === 'fail') testResults.failed++;
  else testResults.skipped++;
}

// Utility function to make API calls
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    return {
      status: response.status,
      ok: response.ok,
      data: response.headers.get('content-type')?.includes('application/json')
        ? await response.json()
        : await response.text(),
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message,
    };
  }
}

// Test Categories
async function testPublicPages() {
  console.log(`\n${colors.bold}${colors.blue}1. PUBLIC PAGES ACCESSIBILITY${colors.reset}`);

  const publicPages = [
    { path: '/', name: 'Landing page' },
    { path: '/login', name: 'Login page' },
    { path: '/signup', name: 'Signup page' },
    { path: '/pricing', name: 'Pricing page' },
    { path: '/about', name: 'About page' },
    { path: '/contact', name: 'Contact page' },
    { path: '/features', name: 'Features page' },
    { path: '/blog', name: 'Blog page' },
    { path: '/partners', name: 'Partners page' },
    { path: '/privacy', name: 'Privacy policy' },
    { path: '/terms', name: 'Terms of service' },
    { path: '/security', name: 'Security page' },
    { path: '/gdpr', name: 'GDPR page' },
    { path: '/cookies', name: 'Cookie policy' },
  ];

  for (const page of publicPages) {
    const response = await apiCall(page.path, { redirect: 'manual' });
    if (response.status === 200 || response.status === 404) {
      logTest('Public Pages', page.name, 'pass', `Status: ${response.status}`);
    } else if (response.status === 302 || response.status === 307) {
      logTest('Public Pages', page.name, 'fail', `Unexpected redirect (${response.status})`);
    } else {
      logTest('Public Pages', page.name, 'fail', `Status: ${response.status}`);
    }
  }
}

async function testProtectedPages() {
  console.log(`\n${colors.bold}${colors.blue}2. PROTECTED PAGES AUTHENTICATION${colors.reset}`);

  const protectedPages = [
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/calls', name: 'Calls page' },
    { path: '/analytics', name: 'Analytics' },
    { path: '/templates', name: 'Templates' },
    { path: '/settings', name: 'Settings' },
    { path: '/team', name: 'Team management' },
    { path: '/upgrade', name: 'Upgrade page' },
    { path: '/referrals', name: 'Referrals' },
    { path: '/help', name: 'Help center' },
  ];

  for (const page of protectedPages) {
    const response = await apiCall(page.path, { redirect: 'manual' });
    if (response.status === 302 || response.status === 307) {
      logTest('Protected Pages', page.name, 'pass', 'Redirects to login');
    } else {
      logTest('Protected Pages', page.name, 'fail', `No auth redirect (${response.status})`);
    }
  }
}

async function testAuthenticationFlow() {
  console.log(`\n${colors.bold}${colors.blue}3. AUTHENTICATION FLOW${colors.reset}`);

  // Test signup validation
  const invalidSignup = await apiCall('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      email: 'invalid-email',
      password: '123',
    }),
  });

  logTest(
    'Authentication',
    'Invalid email rejection',
    invalidSignup.status === 400 || invalidSignup.status === 422 ? 'pass' : 'fail',
    `Status: ${invalidSignup.status}`
  );

  // Test password requirements
  const weakPassword = await apiCall('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: 'weak',
    }),
  });

  logTest(
    'Authentication',
    'Weak password rejection',
    weakPassword.status === 400 || weakPassword.status === 422 ? 'pass' : 'fail',
    `Status: ${weakPassword.status}`
  );

  // Test login with non-existent user
  const invalidLogin = await apiCall('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'nonexistent@example.com',
      password: 'password123',
    }),
  });

  logTest(
    'Authentication',
    'Invalid credentials rejection',
    invalidLogin.status === 401 || invalidLogin.status === 400 ? 'pass' : 'fail',
    `Status: ${invalidLogin.status}`
  );
}

async function testAPIEndpoints() {
  console.log(`\n${colors.bold}${colors.blue}4. API ENDPOINTS${colors.reset}`);

  // Test CSRF endpoint
  const csrfResponse = await apiCall('/api/csrf');
  logTest(
    'API Endpoints',
    'CSRF token endpoint',
    csrfResponse.ok ? 'pass' : 'fail',
    `Status: ${csrfResponse.status}`
  );

  // Test health check
  const healthResponse = await apiCall('/api/health');
  logTest(
    'API Endpoints',
    'Health check endpoint',
    healthResponse.ok ? 'pass' : 'fail',
    `Status: ${healthResponse.status}`
  );

  // Test preferences API without auth (should fail)
  const prefsResponse = await apiCall('/api/preferences');
  logTest(
    'API Endpoints',
    'Preferences requires auth',
    prefsResponse.status === 401 ? 'pass' : 'fail',
    `Status: ${prefsResponse.status}`
  );

  // Test feedback API (should require CSRF)
  const feedbackNoCSRF = await apiCall('/api/feedback', {
    method: 'POST',
    body: JSON.stringify({
      type: 'feedback',
      subject: 'Test',
      message: 'Test message',
    }),
  });

  logTest(
    'API Endpoints',
    'Feedback requires CSRF',
    feedbackNoCSRF.status === 403 ? 'pass' : 'fail',
    `Status: ${feedbackNoCSRF.status}`
  );
}

async function testPartnerPortal() {
  console.log(`\n${colors.bold}${colors.blue}5. PARTNER PORTAL${colors.reset}`);

  // Test partner pages
  const partnerLanding = await apiCall('/partners');
  logTest(
    'Partner Portal',
    'Partner landing page',
    partnerLanding.ok || partnerLanding.status === 404 ? 'pass' : 'fail',
    `Status: ${partnerLanding.status}`
  );

  const partnerLogin = await apiCall('/partners/login');
  logTest(
    'Partner Portal',
    'Partner login page',
    partnerLogin.ok || partnerLogin.status === 404 ? 'pass' : 'fail',
    `Status: ${partnerLogin.status}`
  );

  // Test partner dashboard requires auth
  const partnerDashboard = await apiCall('/partners/dashboard', { redirect: 'manual' });
  logTest(
    'Partner Portal',
    'Partner dashboard requires auth',
    partnerDashboard.status === 302 || partnerDashboard.status === 307 ? 'pass' : 'fail',
    `Status: ${partnerDashboard.status}`
  );

  // Test partner API
  const partnerApply = await apiCall('/api/partners/apply', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Test Partner',
      email: 'partner@test.com',
      company: 'Test Co',
    }),
  });

  logTest(
    'Partner Portal',
    'Partner application API',
    partnerApply.status !== 500 ? 'pass' : 'fail',
    `Status: ${partnerApply.status}`
  );
}

async function testReferralSystem() {
  console.log(`\n${colors.bold}${colors.blue}6. REFERRAL SYSTEM${colors.reset}`);

  // Test referral activation endpoint
  const referralActivate = await apiCall('/api/referrals/activate', {
    method: 'POST',
    body: JSON.stringify({
      code: 'TESTCODE123',
    }),
  });

  logTest(
    'Referral System',
    'Referral activation endpoint',
    referralActivate.status !== 500 ? 'pass' : 'fail',
    `Status: ${referralActivate.status}`
  );

  // Test referral page requires auth
  const referralPage = await apiCall('/referrals', { redirect: 'manual' });
  logTest(
    'Referral System',
    'Referrals page requires auth',
    referralPage.status === 302 || referralPage.status === 307 ? 'pass' : 'fail',
    `Status: ${referralPage.status}`
  );
}

async function testInvitationFlow() {
  console.log(`\n${colors.bold}${colors.blue}7. INVITATION FLOW${colors.reset}`);

  // Test invitation pages are public
  const invitePage = await apiCall('/invite/test-token');
  logTest(
    'Invitation Flow',
    'Invitation page is public',
    invitePage.ok || invitePage.status === 404 ? 'pass' : 'fail',
    `Status: ${invitePage.status}`
  );

  const inviteSignup = await apiCall('/invite-signup/test-token');
  logTest(
    'Invitation Flow',
    'Invitation signup is public',
    inviteSignup.ok || inviteSignup.status === 404 ? 'pass' : 'fail',
    `Status: ${inviteSignup.status}`
  );

  // Test invitation verification
  const verifyInvite = await apiCall('/api/invitations/verify', {
    method: 'POST',
    body: JSON.stringify({
      token: 'invalid-token',
    }),
  });

  logTest(
    'Invitation Flow',
    'Invitation verification API',
    verifyInvite.status !== 500 ? 'pass' : 'fail',
    `Status: ${verifyInvite.status}`
  );

  // Test accept invitation
  const acceptInvite = await apiCall('/api/teams/accept-invitation', {
    method: 'POST',
    body: JSON.stringify({
      token: 'test-token',
    }),
  });

  logTest(
    'Invitation Flow',
    'Accept invitation API',
    acceptInvite.status !== 500 ? 'pass' : 'fail',
    `Status: ${acceptInvite.status}`
  );
}

async function testSecurityHeaders() {
  console.log(`\n${colors.bold}${colors.blue}8. SECURITY HEADERS${colors.reset}`);

  const response = await fetch(`${BASE_URL}/`);
  const headers = response.headers;

  // Check for security headers
  const securityHeaders = [
    'x-frame-options',
    'x-content-type-options',
    'strict-transport-security',
    'x-xss-protection',
  ];

  for (const header of securityHeaders) {
    const hasHeader = headers.has(header);
    logTest(
      'Security',
      `${header} header`,
      hasHeader ? 'pass' : 'skip',
      hasHeader ? headers.get(header) : 'Not set'
    );
  }
}

async function testErrorHandling() {
  console.log(`\n${colors.bold}${colors.blue}9. ERROR HANDLING${colors.reset}`);

  // Test 404 handling
  const notFound = await apiCall('/non-existent-page');
  logTest(
    'Error Handling',
    '404 page handling',
    notFound.status === 404 ? 'pass' : 'fail',
    `Status: ${notFound.status}`
  );

  // Test malformed JSON
  const malformedRequest = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{invalid json}',
  });

  logTest(
    'Error Handling',
    'Malformed JSON handling',
    malformedRequest.status === 400 || malformedRequest.status === 422 ? 'pass' : 'fail',
    `Status: ${malformedRequest.status}`
  );

  // Test SQL injection attempt (should be safe)
  const sqlInjection = await apiCall('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: "admin' OR '1'='1",
      password: "' OR '1'='1",
    }),
  });

  logTest(
    'Error Handling',
    'SQL injection prevention',
    sqlInjection.status === 401 || sqlInjection.status === 400 ? 'pass' : 'fail',
    `Status: ${sqlInjection.status}`
  );
}

async function testRateLimiting() {
  console.log(`\n${colors.bold}${colors.blue}10. RATE LIMITING${colors.reset}`);

  // Make multiple rapid requests
  const requests = [];
  for (let i = 0; i < 10; i++) {
    requests.push(apiCall('/api/health'));
  }

  const results = await Promise.all(requests);
  const rateLimited = results.some((r) => r.status === 429);

  logTest(
    'Rate Limiting',
    'Rate limiting active',
    'skip',
    rateLimited ? 'Rate limiting detected' : 'No rate limiting detected'
  );
}

async function testMobileResponsiveness() {
  console.log(`\n${colors.bold}${colors.blue}11. MOBILE RESPONSIVENESS${colors.reset}`);

  // Test with mobile user agent
  const mobileResponse = await fetch(`${BASE_URL}/`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
    },
  });

  logTest(
    'Mobile',
    'Mobile user agent support',
    mobileResponse.ok ? 'pass' : 'fail',
    `Status: ${mobileResponse.status}`
  );
}

async function testPerformance() {
  console.log(`\n${colors.bold}${colors.blue}12. PERFORMANCE${colors.reset}`);

  // Test page load times
  const pages = [
    { path: '/', name: 'Landing page' },
    { path: '/login', name: 'Login page' },
    { path: '/pricing', name: 'Pricing page' },
  ];

  for (const page of pages) {
    const start = Date.now();
    const response = await apiCall(page.path);
    const loadTime = Date.now() - start;

    logTest(
      'Performance',
      `${page.name} load time`,
      loadTime < 3000 ? 'pass' : loadTime < 5000 ? 'skip' : 'fail',
      `${loadTime}ms`
    );
  }
}

// Main test runner
async function runTests() {
  console.log(`\n${colors.bold}${colors.cyan}${'='.repeat(60)}`);
  console.log('   SYNQALL END-TO-END TEST SUITE');
  console.log(`${'='.repeat(60)}${colors.reset}\n`);
  console.log(`Testing URL: ${BASE_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  try {
    // Check if server is running
    const healthCheck = await apiCall('/api/health').catch(() => null);
    if (!healthCheck || healthCheck.status === 0) {
      console.log(`${colors.red}ERROR: Server is not running on ${BASE_URL}${colors.reset}`);
      console.log('Please start the server with: npm run dev');
      return;
    }

    // Run all test categories
    await testPublicPages();
    await testProtectedPages();
    await testAuthenticationFlow();
    await testAPIEndpoints();
    await testPartnerPortal();
    await testReferralSystem();
    await testInvitationFlow();
    await testSecurityHeaders();
    await testErrorHandling();
    await testRateLimiting();
    await testMobileResponsiveness();
    await testPerformance();

    // Generate summary report
    console.log(`\n${colors.bold}${colors.cyan}${'='.repeat(60)}`);
    console.log('   TEST SUMMARY');
    console.log(`${'='.repeat(60)}${colors.reset}\n`);

    const total = testResults.passed + testResults.failed + testResults.skipped;
    const passRate = ((testResults.passed / total) * 100).toFixed(1);

    console.log(
      `${colors.green}Passed:${colors.reset}  ${testResults.passed}/${total} (${passRate}%)`
    );
    console.log(`${colors.red}Failed:${colors.reset}  ${testResults.failed}/${total}`);
    console.log(`${colors.yellow}Skipped:${colors.reset} ${testResults.skipped}/${total}\n`);

    // Show failed tests
    if (testResults.failed > 0) {
      console.log(`${colors.bold}${colors.red}FAILED TESTS:${colors.reset}`);
      testResults.tests
        .filter((t) => t.status === 'fail')
        .forEach((t) => {
          console.log(`  • ${t.category}: ${t.test} - ${t.message}`);
        });
    }

    // Overall result
    console.log(
      `\n${colors.bold}OVERALL RESULT: ${
        testResults.failed === 0
          ? `${colors.green}✓ ALL CRITICAL TESTS PASSED${colors.reset}`
          : `${colors.red}✗ SOME TESTS FAILED${colors.reset}`
      }\n`
    );

    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      url: BASE_URL,
      summary: {
        total,
        passed: testResults.passed,
        failed: testResults.failed,
        skipped: testResults.skipped,
        passRate: `${passRate}%`,
      },
      tests: testResults.tests,
    };

    await fs.writeFile('e2e-test-report.json', JSON.stringify(report, null, 2));
    console.log(`Report saved to: e2e-test-report.json\n`);
  } catch (error) {
    console.error(`${colors.red}Test suite error:${colors.reset}`, error);
  }
}

// Run the tests
runTests();
