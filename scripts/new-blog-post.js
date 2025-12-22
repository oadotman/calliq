#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createBlogPost() {
  console.log('📝 Create a new blog post for SynQall\n');

  const title = await question('Title: ');
  const author = await question('Author (default: SynQall Team): ') || 'SynQall Team';
  const excerpt = await question('Excerpt (short description): ');
  const categories = await question('Categories (comma-separated): ');
  const tags = await question('Tags (comma-separated): ');
  const featuredImage = await question('Featured image URL (optional): ');

  const date = new Date().toISOString().split('T')[0];
  const slug = title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const filename = `${slug}.mdx`;
  const filepath = path.join(process.cwd(), 'content', 'blog', filename);

  const categoriesArray = categories.split(',').map(c => c.trim()).filter(c => c);
  const tagsArray = tags.split(',').map(t => t.trim()).filter(t => t);

  const frontmatter = `---
title: "${title}"
date: "${date}"
author: "${author}"
excerpt: "${excerpt}"
categories: [${categoriesArray.map(c => `"${c}"`).join(', ')}]
tags: [${tagsArray.map(t => `"${t}"`).join(', ')}]
${featuredImage ? `featuredImage: "${featuredImage}"` : '# featuredImage: "https://example.com/image.jpg"'}
published: false
---

# ${title}

Start writing your blog post here...

## Introduction

[Your introduction paragraph]

## Main Content

[Your main content]

## Key Takeaways

- Point 1
- Point 2
- Point 3

## Conclusion

[Your conclusion]

---

*Have questions? Contact us at [support@synqall.com](mailto:support@synqall.com)*
`;

  // Ensure content/blog directory exists
  const blogDir = path.join(process.cwd(), 'content', 'blog');
  if (!fs.existsSync(blogDir)) {
    fs.mkdirSync(blogDir, { recursive: true });
  }

  // Check if file already exists
  if (fs.existsSync(filepath)) {
    const overwrite = await question(`\n⚠️  File ${filename} already exists. Overwrite? (y/N): `);
    if (overwrite.toLowerCase() !== 'y') {
      console.log('\n❌ Cancelled');
      rl.close();
      return;
    }
  }

  // Write the file
  fs.writeFileSync(filepath, frontmatter);

  console.log(`
✅ Blog post created successfully!

📁 File: ${filename}
📍 Location: content/blog/${filename}

Next steps:
1. Edit the file to add your content
2. Set "published: true" when ready to publish
3. Run "npm run build" to test
4. Commit and deploy

Happy writing! 🚀
`);

  rl.close();
}

createBlogPost().catch(console.error);