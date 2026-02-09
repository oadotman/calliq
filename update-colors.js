const fs = require('fs');
const path = require('path');

// Color replacement mappings
const colorReplacements = [
  // Violet to Purple mappings (darker shades)
  { from: /violet-50/g, to: 'purple-50' },
  { from: /violet-100/g, to: 'purple-100' },
  { from: /violet-200/g, to: 'purple-200' },
  { from: /violet-300/g, to: 'purple-300' },
  { from: /violet-400/g, to: 'purple-500' },
  { from: /violet-500/g, to: 'purple-600' },
  { from: /violet-600/g, to: 'purple-700' },
  { from: /violet-700/g, to: 'purple-800' },
  { from: /violet-800/g, to: 'purple-900' },
  { from: /violet-900/g, to: 'purple-950' },
  { from: /violet-950/g, to: 'purple-950' },

  // Update purple colors to darker shades
  { from: /purple-500(?!0)/g, to: 'purple-600' },
  { from: /purple-600(?!0)/g, to: 'purple-700' },

  // Hover states
  { from: /hover:bg-purple-100/g, to: 'hover:bg-purple-200' },
  { from: /hover:bg-purple-50/g, to: 'hover:bg-purple-100' },
  { from: /hover:border-purple-200/g, to: 'hover:border-purple-300' },
  { from: /hover:text-purple-600/g, to: 'hover:text-purple-700' },
];

// File extensions to process
const extensions = ['.tsx', '.ts', '.css'];

// Directories to skip
const skipDirs = ['node_modules', '.next', '.git', 'dist', 'build'];

function shouldProcessFile(filePath) {
  const ext = path.extname(filePath);
  const dir = path.dirname(filePath);

  // Check if any skip directory is in the path
  for (const skipDir of skipDirs) {
    if (dir.includes(skipDir)) return false;
  }

  return extensions.includes(ext);
}

function processFile(filePath) {
  if (!shouldProcessFile(filePath)) return false;

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Apply all color replacements
    for (const replacement of colorReplacements) {
      content = content.replace(replacement.from, replacement.to);
    }

    // Only write if content changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Updated: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

function walkDirectory(dir, fileList = []) {
  try {
    const files = fs.readdirSync(dir);

    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // Skip certain directories
        if (!skipDirs.some((skipDir) => file === skipDir)) {
          walkDirectory(filePath, fileList);
        }
      } else {
        fileList.push(filePath);
      }
    });
  } catch (error) {
    // Silently skip directories we can't access
  }

  return fileList;
}

// Main execution
console.log('Starting color update...\n');

const rootDirs = ['app', 'components', 'lib'];
let totalUpdated = 0;

for (const rootDir of rootDirs) {
  const dirPath = path.join(__dirname, rootDir);
  if (fs.existsSync(dirPath)) {
    const files = walkDirectory(dirPath);

    for (const file of files) {
      if (processFile(file)) {
        totalUpdated++;
      }
    }
  }
}

console.log(`\n✨ Color update complete! Updated ${totalUpdated} files.`);
console.log(
  'All violet colors have been replaced with darker purple shades for a more sophisticated look.'
);
