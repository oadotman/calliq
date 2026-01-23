#!/usr/bin/env node

/**
 * Pre-Deployment Checklist
 * Run this before deploying to VPS
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Colors
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

async function checkEnvFile() {
  log('\n📋 Checking environment configuration...', colors.cyan);

  const envExample = '.env.example';
  const envLocal = '.env.local';
  const envProduction = '.env.production';

  const checks = [];

  // Check if .env.example exists
  if (fs.existsSync(envExample)) {
    checks.push('✓ .env.example found');

    // Read required env vars from .env.example
    const exampleContent = fs.readFileSync(envExample, 'utf-8');
    const requiredVars = exampleContent
      .split('\n')
      .filter(line => line && !line.startsWith('#'))
      .map(line => line.split('=')[0]);

    log(`  Found ${requiredVars.length} required environment variables`, colors.blue);
  }

  // Check if .env.local exists (for development)
  if (fs.existsSync(envLocal)) {
    checks.push('✓ .env.local exists for development');
  }

  // Warn about production env
  if (!fs.existsSync(envProduction)) {
    log('  ⚠️  .env.production not found - make sure to configure on VPS', colors.yellow);
  }

  return checks.length > 0;
}

async function checkDependencies() {
  log('\n📦 Checking dependencies...', colors.cyan);

  try {
    const { stdout } = await execAsync('npm ls --depth=0 --json');
    const deps = JSON.parse(stdout);

    if (deps.problems && deps.problems.length > 0) {
      log('  ⚠️  Dependency issues found:', colors.yellow);
      deps.problems.forEach(problem => {
        log(`    - ${problem}`, colors.yellow);
      });
      return false;
    }

    log('  ✓ All dependencies properly installed', colors.green);
    return true;
  } catch (error) {
    log('  ✗ Error checking dependencies', colors.red);
    return false;
  }
}

async function checkDatabase() {
  log('\n🗄️  Checking database migrations...', colors.cyan);

  const migrationsDir = path.join(__dirname, 'supabase', 'migrations');

  if (fs.existsSync(migrationsDir)) {
    const migrations = fs.readdirSync(migrationsDir);
    log(`  ✓ Found ${migrations.length} migration files`, colors.green);

    // List recent migrations
    const recentMigrations = migrations.slice(-3);
    if (recentMigrations.length > 0) {
      log('  Recent migrations:', colors.blue);
      recentMigrations.forEach(migration => {
        log(`    - ${migration}`, colors.blue);
      });
    }

    return true;
  } else {
    log('  ⚠️  No migrations directory found', colors.yellow);
    return false;
  }
}

async function checkBuildSize() {
  log('\n📊 Checking build size...', colors.cyan);

  const nextDir = path.join(__dirname, '.next');

  if (!fs.existsSync(nextDir)) {
    log('  ⚠️  No build found. Run "npm run build" first', colors.yellow);
    return false;
  }

  // Get directory size
  const getDirSize = (dir) => {
    let size = 0;
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        size += getDirSize(filePath);
      } else {
        size += stat.size;
      }
    }

    return size;
  };

  const buildSize = getDirSize(nextDir);
  const sizeMB = (buildSize / (1024 * 1024)).toFixed(2);

  log(`  Build size: ${sizeMB} MB`, colors.blue);

  if (buildSize > 100 * 1024 * 1024) {
    log('  ⚠️  Build size is large. Consider optimization', colors.yellow);
  } else {
    log('  ✓ Build size is acceptable', colors.green);
  }

  return true;
}

async function checkSecurity() {
  log('\n🔒 Security checks...', colors.cyan);

  const securityChecks = [];

  // Check for sensitive files
  const sensitiveFiles = [
    '.env',
    '.env.production',
    'secrets.json',
    'credentials.json',
  ];

  sensitiveFiles.forEach(file => {
    if (fs.existsSync(file)) {
      // Check if it's in .gitignore
      const gitignore = fs.readFileSync('.gitignore', 'utf-8');
      if (!gitignore.includes(file)) {
        securityChecks.push(`⚠️  ${file} not in .gitignore`);
      }
    }
  });

  // Check for console.logs in production code
  const srcFiles = [
    'app',
    'components',
    'lib',
  ];

  let consoleLogCount = 0;
  srcFiles.forEach(dir => {
    if (fs.existsSync(dir)) {
      const checkForConsoleLogs = (dirPath) => {
        const files = fs.readdirSync(dirPath);
        files.forEach(file => {
          const filePath = path.join(dirPath, file);
          const stat = fs.statSync(filePath);

          if (stat.isDirectory()) {
            checkForConsoleLogs(filePath);
          } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
            const content = fs.readFileSync(filePath, 'utf-8');
            const matches = content.match(/console\.(log|debug|info)/g);
            if (matches) {
              consoleLogCount += matches.length;
            }
          }
        });
      };
      checkForConsoleLogs(dir);
    }
  });

  if (consoleLogCount > 0) {
    log(`  ⚠️  Found ${consoleLogCount} console.log statements`, colors.yellow);
  } else {
    log('  ✓ No console.log statements in production code', colors.green);
  }

  if (securityChecks.length === 0) {
    log('  ✓ Security checks passed', colors.green);
    return true;
  } else {
    securityChecks.forEach(check => log(`  ${check}`, colors.yellow));
    return false;
  }
}

async function main() {
  console.clear();
  log('\n🚀 CallIQ Pre-Deployment Checklist\n', colors.bright + colors.cyan);
  log('Running pre-deployment checks...', colors.blue);

  const results = [];

  // Run all checks
  results.push(await checkEnvFile());
  results.push(await checkDependencies());
  results.push(await checkDatabase());
  results.push(await checkBuildSize());
  results.push(await checkSecurity());

  // Summary
  log('\n' + '='.repeat(60), colors.cyan);
  log('DEPLOYMENT READINESS SUMMARY', colors.bright + colors.cyan);
  log('='.repeat(60), colors.cyan);

  const allPassed = results.every(r => r !== false);

  if (allPassed) {
    log('\n✅ All checks passed!', colors.bright + colors.green);
    log('\nYour application is ready for deployment.', colors.green);
    log('\nDeployment steps:', colors.cyan);
    log('  1. Run "npm run build" locally to verify', colors.blue);
    log('  2. Commit your changes', colors.blue);
    log('  3. Push to your VPS', colors.blue);
    log('  4. Run migrations on VPS if needed', colors.blue);
    log('  5. Restart the application', colors.blue);
  } else {
    log('\n⚠️  Some checks need attention', colors.bright + colors.yellow);
    log('\nPlease review the warnings above before deploying.', colors.yellow);
  }

  log('\n' + '='.repeat(60) + '\n', colors.cyan);
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    log('\n❌ Pre-deployment check failed:', colors.red);
    console.error(error);
    process.exit(1);
  });
}