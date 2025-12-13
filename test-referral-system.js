// =====================================================
// REFERRAL SYSTEM TEST SCRIPT
// Tests the referral system end-to-end
// =====================================================

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_REFERRER_EMAIL = 'test-referrer@example.com';
const TEST_REFERRED_EMAIL = 'test-referred@example.com';

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

async function testEndpoint(name, endpoint, options = {}) {
  try {
    log(`\nTesting: ${name}`, 'cyan');

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const data = await response.json();

    if (response.ok) {
      log(`✓ ${name} successful`, 'green');
      if (options.showResult) {
        console.log(JSON.stringify(data, null, 2));
      }
      return data;
    } else {
      log(`✗ ${name} failed: ${data.error || 'Unknown error'}`, 'red');
      return null;
    }
  } catch (error) {
    log(`✗ ${name} error: ${error.message}`, 'red');
    return null;
  }
}

async function runTests() {
  log('\n==============================================', 'blue');
  log('REFERRAL SYSTEM END-TO-END TEST', 'blue');
  log('==============================================', 'blue');

  log('\nThis script will test the referral system components.', 'yellow');
  log('Note: Some tests require authentication. You may need to:', 'yellow');
  log('1. Be logged in to the application', 'yellow');
  log('2. Have valid session cookies', 'yellow');
  log('3. Run the database migration first\n', 'yellow');

  const proceed = await question('Do you want to continue? (y/n): ');
  if (proceed.toLowerCase() !== 'y') {
    log('Test cancelled.', 'yellow');
    process.exit(0);
  }

  // Test 1: Generate referral code
  log('\n--- Test 1: Generate Referral Code ---', 'blue');
  const referralData = await testEndpoint(
    'Generate referral code',
    '/api/referrals/generate',
    {
      method: 'POST',
      showResult: true
    }
  );

  if (referralData?.referralCode) {
    log(`Referral code: ${referralData.referralCode}`, 'green');
    log(`Referral link: ${referralData.referralLink}`, 'green');
  }

  // Test 2: Track referral click
  if (referralData?.referralCode) {
    log('\n--- Test 2: Track Referral Click ---', 'blue');
    await testEndpoint(
      'Track referral click',
      '/api/referrals/track',
      {
        method: 'POST',
        body: {
          code: referralData.referralCode,
          action: 'click'
        }
      }
    );
  }

  // Test 3: Send invitation
  log('\n--- Test 3: Send Referral Invitation ---', 'blue');
  const inviteResult = await testEndpoint(
    'Send referral invitation',
    '/api/referrals/send-invitation',
    {
      method: 'POST',
      body: {
        emails: [TEST_REFERRED_EMAIL],
        personalMessage: 'Join me on SynQall for amazing call transcription!'
      },
      showResult: true
    }
  );

  // Test 4: Get statistics
  log('\n--- Test 4: Get Referral Statistics ---', 'blue');
  await testEndpoint(
    'Get referral statistics',
    '/api/referrals/statistics',
    {
      showResult: true
    }
  );

  // Test 5: Get history
  log('\n--- Test 5: Get Referral History ---', 'blue');
  await testEndpoint(
    'Get referral history',
    '/api/referrals/history?page=1&limit=10',
    {
      showResult: true
    }
  );

  // Test 6: Check rewards
  log('\n--- Test 6: Check Available Rewards ---', 'blue');
  const rewards = await testEndpoint(
    'Check available rewards',
    '/api/referrals/rewards',
    {
      showResult: true
    }
  );

  // Test 7: Manual activation (for testing)
  log('\n--- Test 7: Manual Activation (Testing Only) ---', 'blue');
  const activateTest = await question('Do you want to test manual activation? (y/n): ');

  if (activateTest.toLowerCase() === 'y') {
    const emailToActivate = await question('Enter the email to activate (or press Enter to skip): ');

    if (emailToActivate) {
      await testEndpoint(
        'Manual activation',
        '/api/referrals/activate',
        {
          method: 'POST',
          body: {
            userEmail: emailToActivate
          },
          showResult: true
        }
      );
    }
  }

  log('\n==============================================', 'blue');
  log('TEST SUMMARY', 'blue');
  log('==============================================', 'blue');

  log('\n✓ Referral system components tested:', 'green');
  log('  - Code generation', 'cyan');
  log('  - Click tracking', 'cyan');
  log('  - Email invitations', 'cyan');
  log('  - Statistics retrieval', 'cyan');
  log('  - History viewing', 'cyan');
  log('  - Reward checking', 'cyan');

  log('\nNext steps for full testing:', 'yellow');
  log('1. Run the database migration: npm run db:migrate', 'yellow');
  log('2. Sign up a new user with a referral code', 'yellow');
  log('3. Have the referred user make a payment', 'yellow');
  log('4. Verify the referrer receives reward notification', 'yellow');
  log('5. Check that rewards appear in the dashboard', 'yellow');
  log('6. Test claiming rewards\n', 'yellow');

  rl.close();
}

// Run tests
runTests().catch(error => {
  log(`\nTest failed: ${error.message}`, 'red');
  rl.close();
  process.exit(1);
});