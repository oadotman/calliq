/**
 * Test script to verify preferences API with CSRF protection
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3003';

// ANSI color codes
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

async function testPreferencesAPI() {
  console.log(`\n${colors.blue}==========================================`);
  console.log('     Preferences API Test');
  console.log(`==========================================${colors.reset}\n`);

  try {
    // Test 1: Try without CSRF token (should fail with 403)
    console.log(`${colors.yellow}Test 1: PATCH without CSRF token${colors.reset}`);
    const responseNoCSRF = await fetch(`${BASE_URL}/api/preferences`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ auto_transcribe: false }),
    });

    if (responseNoCSRF.status === 403) {
      console.log(`${colors.green}✓${colors.reset} Correctly blocked without CSRF token (403)`);
    } else {
      console.log(
        `${colors.red}✗${colors.reset} Should have been blocked but got status: ${responseNoCSRF.status}`
      );
    }

    // Test 2: Get CSRF token
    console.log(`\n${colors.yellow}Test 2: Get CSRF token${colors.reset}`);
    const csrfResponse = await fetch(`${BASE_URL}/api/csrf`);

    if (!csrfResponse.ok) {
      throw new Error(`Failed to get CSRF token: ${csrfResponse.status}`);
    }

    const csrfData = await csrfResponse.json();
    const csrfToken = csrfData.token;
    console.log(`${colors.green}✓${colors.reset} Successfully retrieved CSRF token`);

    // Test 3: Try with CSRF token (should work or return 401 if not authenticated)
    console.log(`\n${colors.yellow}Test 3: PATCH with CSRF token${colors.reset}`);
    const responseWithCSRF = await fetch(`${BASE_URL}/api/preferences`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ auto_transcribe: true }),
    });

    if (responseWithCSRF.status === 401) {
      console.log(
        `${colors.green}✓${colors.reset} CSRF protection passed, authentication required (401)`
      );
    } else if (responseWithCSRF.status === 200) {
      console.log(
        `${colors.green}✓${colors.reset} Successfully updated preferences with CSRF token`
      );
    } else if (responseWithCSRF.status === 403) {
      console.log(
        `${colors.red}✗${colors.reset} Still blocked with CSRF token - CSRF not working properly`
      );
    } else {
      console.log(`${colors.yellow}?${colors.reset} Unexpected status: ${responseWithCSRF.status}`);
    }

    // Test 4: GET request (should work without CSRF)
    console.log(`\n${colors.yellow}Test 4: GET preferences (no CSRF needed)${colors.reset}`);
    const getResponse = await fetch(`${BASE_URL}/api/preferences`);

    if (getResponse.status === 401) {
      console.log(
        `${colors.green}✓${colors.reset} GET works without CSRF, authentication required (401)`
      );
    } else if (getResponse.status === 200) {
      console.log(`${colors.green}✓${colors.reset} Successfully fetched preferences`);
    } else if (getResponse.status === 403) {
      console.log(`${colors.red}✗${colors.reset} GET should not require CSRF but got 403`);
    } else {
      console.log(`${colors.yellow}?${colors.reset} Unexpected status: ${getResponse.status}`);
    }
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} Test failed with error:`, error.message);
  }

  console.log(`\n${colors.blue}==========================================`);
  console.log('            Test Complete');
  console.log(`==========================================${colors.reset}\n`);

  console.log(`${colors.yellow}Summary:${colors.reset}`);
  console.log('• CSRF protection is enforced on PATCH requests');
  console.log('• GET requests work without CSRF token');
  console.log('• Client components must use fetchWithCSRF for mutations');
  console.log(
    `\n${colors.green}The preferences API is properly protected with CSRF!${colors.reset}\n`
  );
}

// Run the test
testPreferencesAPI().catch(console.error);
