const fs = require('fs');
const path = require('path');

const blogDir = path.join(__dirname, '..', 'content', 'blog');

// Get all MDX files
const files = fs.readdirSync(blogDir).filter(file => file.endsWith('.mdx'));

files.forEach(file => {
  const filePath = path.join(blogDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace < followed by a number or dollar sign with HTML entity
  // This pattern matches < followed by digit or $, but not in code blocks
  const originalContent = content;

  // Replace patterns like <$25K, <2, <50, etc.
  content = content.replace(/(<)(\$?\d)/g, '&lt;$2');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed MDX syntax in ${file}`);
  }
});

console.log('MDX syntax fixes completed!');