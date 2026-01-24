/**
 * Test script to verify upload functionality works with CSRF protection
 * This tests that our exemptions are working correctly
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Read environment variables
require('dotenv').config({ path: '.env.local' });

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

console.log('🧪 Testing Upload CSRF Exemption...');
console.log('==========================================');

// Test 1: Check if upload endpoints are accessible without CSRF token
async function testUploadEndpoints() {
  const endpoints = ['/api/upload/audio', '/api/upload/complete', '/api/calls/import-url'];

  console.log('\n📍 Testing upload endpoints accessibility:\n');

  for (const endpoint of endpoints) {
    try {
      const url = new URL(endpoint, BASE_URL);
      console.log(`Testing ${endpoint}...`);

      // Make a simple OPTIONS request to check if endpoint is accessible
      const response = await fetch(url, {
        method: 'OPTIONS',
        headers: {
          Origin: BASE_URL,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type',
        },
      });

      if (response.status === 200 || response.status === 204) {
        console.log(`✅ ${endpoint} - Accessible (Status: ${response.status})`);
      } else if (response.status === 403) {
        console.log(`❌ ${endpoint} - CSRF blocking detected (Status: 403)`);
      } else {
        console.log(`⚠️  ${endpoint} - Status: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint} - Error: ${error.message}`);
    }
  }
}

// Test 2: Check team invite and referral activation endpoints
async function testPublicEndpoints() {
  const endpoints = ['/api/teams/invite', '/api/referrals/activate'];

  console.log('\n📍 Testing public API endpoints:\n');

  for (const endpoint of endpoints) {
    try {
      const url = new URL(endpoint, BASE_URL);
      console.log(`Testing ${endpoint}...`);

      // Make a simple GET request to check if endpoint is accessible
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      // These endpoints might return various status codes, but shouldn't return 403
      if (response.status !== 403) {
        console.log(`✅ ${endpoint} - Not blocked by CSRF (Status: ${response.status})`);
      } else {
        console.log(`❌ ${endpoint} - CSRF blocking detected (Status: 403)`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint} - Error: ${error.message}`);
    }
  }
}

// Test 3: Verify middleware CSRF exemption paths
async function verifyMiddlewareExemptions() {
  console.log('\n📍 Verifying middleware CSRF exemptions:\n');

  const middlewarePath = path.join(__dirname, 'middleware.ts');
  const csrfPath = path.join(__dirname, 'lib', 'security', 'csrf-simple.ts');

  try {
    const middlewareContent = fs.readFileSync(middlewarePath, 'utf8');
    const csrfContent = fs.readFileSync(csrfPath, 'utf8');

    // Check if critical paths are exempted in middleware.ts
    const middlewareExemptions = [
      '/api/upload/',
      '/api/calls/import-url',
      '/api/teams/invite',
      '/api/referrals/activate',
    ];

    console.log('Middleware.ts exemptions:');
    for (const path of middlewareExemptions) {
      if (middlewareContent.includes(path)) {
        console.log(`✅ ${path} - Found in csrfExemptPaths`);
      } else {
        console.log(`❌ ${path} - NOT found in csrfExemptPaths`);
      }
    }

    // Check if paths are also exempted in csrf-simple.ts
    console.log('\nCsrf-simple.ts exemptions:');
    for (const path of middlewareExemptions) {
      if (csrfContent.includes(path)) {
        console.log(`✅ ${path} - Found in isPublicPath check`);
      } else {
        console.log(`❌ ${path} - NOT found in isPublicPath check`);
      }
    }
  } catch (error) {
    console.error('Error reading files:', error.message);
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting CSRF exemption tests...\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log('==========================================');

  await verifyMiddlewareExemptions();

  // Only test endpoints if we're running locally or have a test server
  if (BASE_URL.includes('localhost') || process.env.TEST_ENDPOINTS === 'true') {
    await testUploadEndpoints();
    await testPublicEndpoints();
  } else {
    console.log('\n⚠️  Skipping endpoint tests (not on localhost)');
    console.log('Set TEST_ENDPOINTS=true to test remote endpoints');
  }

  console.log('\n==========================================');
  console.log('✨ CSRF exemption test complete!');

  // Summary
  console.log('\n📊 Summary:');
  console.log('- Upload endpoints should be exempted from CSRF');
  console.log('- Team invite and referral endpoints should be public');
  console.log('- Both middleware.ts and csrf-simple.ts need exemptions');
}

// Run the tests
runTests().catch(console.error);
