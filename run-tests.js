#!/usr/bin/env node

/**
 * Local Test Runner Script
 * Run all tests before deployment
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(`  ${title}`, colors.bright + colors.cyan);
  console.log('='.repeat(60) + '\n');
}

async function runCommand(command, description) {
  log(`Running: ${description}`, colors.blue);

  try {
    const startTime = Date.now();
    const { stdout, stderr } = await execAsync(command);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes('warning')) {
      console.error(stderr);
    }

    log(`✓ ${description} completed in ${duration}s`, colors.green);
    return true;
  } catch (error) {
    log(`✗ ${description} failed`, colors.red);
    console.error(error.message);
    return false;
  }
}

async function runTests() {
  console.clear();
  log('\n🧪 CallIQ Test Suite Runner\n', colors.bright + colors.cyan);

  const results = {
    lint: false,
    unit: false,
    integration: false,
    build: false,
  };

  // Run linting
  logSection('1. Code Quality (Linting)');
  results.lint = await runCommand(
    'npm run lint',
    'ESLint code quality check'
  );

  if (!results.lint) {
    log('\n💡 Tip: Run "npm run lint:fix" to auto-fix issues\n', colors.yellow);
  }

  // Run unit tests
  logSection('2. Unit Tests');
  results.unit = await runCommand(
    'npm run test:unit',
    'Unit tests'
  );

  // Run integration tests
  logSection('3. Integration Tests');
  results.integration = await runCommand(
    'npm run test:integration',
    'Integration tests'
  );

  // Check build
  logSection('4. Build Verification');
  results.build = await runCommand(
    'npm run build',
    'Next.js production build'
  );

  // Summary
  logSection('Test Results Summary');

  const testTypes = [
    { name: 'Linting', result: results.lint },
    { name: 'Unit Tests', result: results.unit },
    { name: 'Integration Tests', result: results.integration },
    { name: 'Build', result: results.build },
  ];

  let allPassed = true;
  testTypes.forEach(({ name, result }) => {
    const status = result ? '✓' : '✗';
    const color = result ? colors.green : colors.red;
    log(`  ${status} ${name}`, color);
    if (!result) allPassed = false;
  });

  console.log('\n' + '='.repeat(60) + '\n');

  if (allPassed) {
    log('🎉 All tests passed! Ready for deployment.', colors.bright + colors.green);
    log('\nYou can now safely deploy to your VPS.', colors.green);
    process.exit(0);
  } else {
    log('⚠️  Some tests failed. Please fix issues before deploying.', colors.bright + colors.red);
    log('\nDeployment is not recommended until all tests pass.', colors.yellow);
    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  log('\n\nTest run interrupted by user', colors.yellow);
  process.exit(1);
});

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch((error) => {
    log('\n❌ Test runner encountered an error:', colors.red);
    console.error(error);
    process.exit(1);
  });
}

module.exports = { runTests };