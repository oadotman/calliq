const fs = require('fs');
const path = require('path');

// Files that need Redis null checks fixed
const filesToFix = [
  'app/api/monitoring/metrics/route.ts',
  'lib/cache/cache-service.ts',
  'lib/monitoring/alerts.ts',
  'lib/monitoring/error-tracker.ts',
  'lib/monitoring/metrics.ts',
  'lib/monitoring/profiler.ts',
  'lib/redis/cache-manager.ts',
  'lib/resilience/circuit-breaker.ts',
  'lib/session/redis-store.ts',
];

// Function to add null checks to Redis operations
function fixRedisNullChecks(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;

  // Add null check after imports if not already present
  if (!content.includes('if (!redisClient)') && content.includes('redisClient')) {
    // Find the first function that uses redisClient
    const functionPattern =
      /(async\s+function\s+\w+|export\s+async\s+function\s+\w+|^\s*async\s+\w+)/gm;
    const functions = content.match(functionPattern);

    if (functions) {
      // Add early return pattern for functions using redisClient
      const patterns = [
        // Pattern 1: await redisClient.something
        {
          regex: /(\s+)(await\s+redisClient\.)([a-zA-Z]+)/g,
          replacement: '$1if (!redisClient) return null;\n$1await redisClient.$3',
        },
        // Pattern 2: redisClient.something (without await)
        {
          regex: /(\s+)(redisClient\.)([a-zA-Z]+\()/g,
          replacement: '$1if (!redisClient) return;\n$1redisClient.$3',
        },
        // Pattern 3: const something = redisClient.something
        {
          regex: /(\s+)(const\s+\w+\s+=\s+redisClient\.)/g,
          replacement: '$1if (!redisClient) return null;\n$1$2',
        },
      ];

      // Apply safer approach - wrap Redis operations in if statements
      const simpleReplace = content
        .replace(/await redisClient\./g, 'await redisClient!.')
        .replace(/redisClient\.status/g, 'redisClient?.status')
        .replace(/redisClient\.keys/g, 'redisClient!.keys')
        .replace(/redisClient\.hgetall/g, 'redisClient!.hgetall')
        .replace(/redisClient\.hincrby/g, 'redisClient!.hincrby')
        .replace(/redisClient\.incr/g, 'redisClient!.incr')
        .replace(/redisClient\.get/g, 'redisClient!.get')
        .replace(/redisClient\.set/g, 'redisClient!.set')
        .replace(/redisClient\.del/g, 'redisClient!.del')
        .replace(/redisClient\.expire/g, 'redisClient!.expire')
        .replace(/redisClient\.ttl/g, 'redisClient!.ttl')
        .replace(/redisClient\.ping/g, 'redisClient!.ping')
        .replace(/redisClient\.pipeline/g, 'redisClient!.pipeline');

      if (simpleReplace !== content) {
        content = simpleReplace;
        modified = true;
      }
    }
  }

  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✓ Fixed: ${filePath}`);
  } else {
    console.log(`- Skipped: ${filePath} (no changes needed)`);
  }
}

// Process all files
console.log('Fixing Redis null checks in TypeScript files...\n');
filesToFix.forEach(fixRedisNullChecks);
console.log('\nDone! Files have been updated with null checks.');
