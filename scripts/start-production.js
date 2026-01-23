#!/usr/bin/env node

/**
 * Production server starter for Next.js standalone build
 * This ensures all environment variables are loaded properly
 */

const path = require('path');
const { spawn } = require('child_process');

// Load environment variables
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env.production' });
require('dotenv').config({ path: '.env' });

// Set production environment
process.env.NODE_ENV = 'production';

// Set port if not already set
process.env.PORT = process.env.PORT || '3000';

// Log startup info
console.log('🚀 Starting CallIQ/SynQall production server...');
console.log('📍 Environment:', process.env.NODE_ENV);
console.log('🔌 Port:', process.env.PORT);
console.log('🔗 Database URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not set');
console.log('🔗 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Not set');
console.log('🔗 Redis URL:', process.env.REDIS_URL ? '✅ Set' : '❌ Not set');

// Check for critical environment variables
const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
  'REDIS_URL'
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\n📝 Please ensure these are set in your .env.local file');
  process.exit(1);
}

// Determine the correct path for the standalone server
const standaloneServerPath = path.join(__dirname, '..', '.next', 'standalone', 'server.js');
const regularServerPath = path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'server', 'next-server.js');

// Try to use standalone server first, fall back to regular if not found
const fs = require('fs');
let serverPath;

if (fs.existsSync(standaloneServerPath)) {
  serverPath = standaloneServerPath;
  console.log('✅ Using standalone server');
} else {
  console.log('⚠️ Standalone server not found, using regular Next.js server');
  // For non-standalone, we need to use next start
  const next = spawn('npx', ['next', 'start', '-p', process.env.PORT], {
    stdio: 'inherit',
    env: process.env,
    cwd: path.join(__dirname, '..')
  });

  next.on('error', (err) => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  });

  next.on('close', (code) => {
    if (code !== 0) {
      console.error(`❌ Server process exited with code ${code}`);
    }
    process.exit(code);
  });

  return;
}

// Start the standalone server
try {
  require(serverPath);
} catch (error) {
  console.error('❌ Failed to start standalone server:', error);
  console.error('\n💡 Try running: npm run build');
  process.exit(1);
}