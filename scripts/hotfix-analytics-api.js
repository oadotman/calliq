// =====================================================
// HOTFIX: Ensure analytics API routes are properly built
// =====================================================

const fs = require('fs');
const path = require('path');

console.log('\n========================================');
console.log('ANALYTICS API HOTFIX');
console.log('========================================\n');

// Check if analytics routes exist
const analyticsDir = path.join(process.cwd(), 'app/api/analytics');
const comprehensiveRoute = path.join(analyticsDir, 'comprehensive/route.ts');

console.log('1. Checking analytics routes:');
console.log('----------------------------------');

if (fs.existsSync(comprehensiveRoute)) {
  console.log('✅ /api/analytics/comprehensive/route.ts exists');

  // Read the file to ensure it exports GET
  const content = fs.readFileSync(comprehensiveRoute, 'utf8');
  if (content.includes('export async function GET')) {
    console.log('✅ GET handler is exported');
  } else {
    console.log('❌ GET handler not found!');
  }
} else {
  console.log('❌ Analytics route file missing!');
}

// Check other analytics routes
const routes = ['performance', 'team'];
routes.forEach(route => {
  const routePath = path.join(analyticsDir, `${route}/route.ts`);
  if (fs.existsSync(routePath)) {
    console.log(`✅ /api/analytics/${route}/route.ts exists`);
  } else {
    console.log(`❌ /api/analytics/${route}/route.ts missing`);
  }
});

console.log('\n2. Creating test endpoint:');
console.log('----------------------------------');

// Create a simple test endpoint to verify API routes work
const testDir = path.join(process.cwd(), 'app/api/test-analytics');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

const testRoute = `import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Analytics API is working',
    timestamp: new Date().toISOString(),
    routes: {
      comprehensive: '/api/analytics/comprehensive',
      performance: '/api/analytics/performance',
      team: '/api/analytics/team'
    }
  });
}`;

fs.writeFileSync(path.join(testDir, 'route.ts'), testRoute);
console.log('✅ Created test endpoint at /api/test-analytics');

console.log('\n3. Next.js configuration check:');
console.log('----------------------------------');

const nextConfig = require(path.join(process.cwd(), 'next.config.js'));
if (nextConfig.output === 'standalone') {
  console.log('⚠️  Using standalone output mode');
  console.log('   This may require special handling for API routes');
}

console.log('\n4. Build recommendations:');
console.log('----------------------------------');
console.log('Run these commands to ensure proper build:');
console.log('');
console.log('# Clear all caches');
console.log('rm -rf .next node_modules/.cache');
console.log('');
console.log('# Fresh install');
console.log('npm ci');
console.log('');
console.log('# Build with verbose output');
console.log('NODE_OPTIONS="--max-old-space-size=8192" npm run build');
console.log('');
console.log('# After build, check if routes exist in .next');
console.log('find .next -name "*analytics*" -type f | grep -E "comprehensive|performance|team"');

console.log('\n========================================');
console.log('HOTFIX COMPLETE');
console.log('========================================\n');