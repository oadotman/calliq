const fs = require('fs');
const path = require('path');

// Directory containing blog posts
const blogDir = path.join(process.cwd(), 'content/blog');

// Get all MDX files
const files = fs.readdirSync(blogDir).filter(file => file.endsWith('.mdx'));

console.log(`Found ${files.length} blog posts to update...`);

// Process each file
files.forEach((file, index) => {
  const filePath = path.join(blogDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace CallIQ with SynQall (case-sensitive)
  const originalContent = content;
  content = content.replace(/CallIQ/g, 'SynQall');
  content = content.replace(/calliq\.ai/g, 'synqall.com');

  // Update dates from 2026/2025 to more reasonable dates
  // We'll distribute posts from Nov 2024 to Dec 2024
  const dateMatch = content.match(/date:\s*"(\d{4}-\d{2}-\d{2})"/);
  if (dateMatch) {
    const originalDate = dateMatch[1];
    const year = parseInt(originalDate.substring(0, 4));

    if (year >= 2025) {
      // Calculate a new date based on file index
      // Distribute posts over the last 30 days
      const daysAgo = Math.floor(index * 30 / files.length);
      const newDate = new Date();
      newDate.setDate(newDate.getDate() - daysAgo - 1); // Start from yesterday

      const newDateStr = newDate.toISOString().split('T')[0];
      content = content.replace(/date:\s*"(\d{4}-\d{2}-\d{2})"/, `date: "${newDateStr}"`);

      console.log(`  ${file}: Date ${originalDate} -> ${newDateStr}`);
    }
  }

  // Count replacements
  const replacements = (content.match(/SynQall/g) || []).length - (originalContent.match(/SynQall/g) || []).length;
  if (replacements > 0) {
    console.log(`  ${file}: Replaced ${replacements} instances of CallIQ`);
  }

  // Write back only if changes were made
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
});

console.log('\nBlog posts updated successfully!');
console.log('Note: Posts are now scheduled from the last 30 days.');
console.log('The blog.ts file already filters out future posts.')