# CallIQ Blog System Guide

## Overview
The CallIQ blog is built using MDX (Markdown + React components) for optimal SEO performance and ease of content management. Blog posts are stored as `.mdx` files in the `content/blog/` directory.

## Quick Start

### Creating a New Blog Post

#### Method 1: Using the Helper Script
```bash
node scripts/new-blog-post.js
```
Follow the prompts to create a new blog post with all the necessary metadata.

#### Method 2: Manual Creation
1. Create a new `.mdx` file in `content/blog/` directory
2. Name it using kebab-case: `my-blog-post-title.mdx`
3. Add the frontmatter and content (see template below)

### Blog Post Template
```mdx
---
title: "Your Blog Post Title"
date: "2024-01-15"
author: "Author Name"
excerpt: "A brief description of your blog post that appears in listings and SEO meta tags."
categories: ["Category1", "Category2"]
tags: ["tag1", "tag2", "tag3"]
featuredImage: "https://example.com/image.jpg"
published: true
---

# Your Blog Post Title

Your content here...

## Section Title

More content...

### Subsection

- Bullet points
- More points

## Code Examples

```javascript
// Your code here
const example = "Hello World";
```

## Conclusion

Final thoughts...
```

## Frontmatter Fields

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `title` | Yes | The title of your blog post | "How AI Transforms Call Analytics" |
| `date` | Yes | Publication date (ISO format) | "2024-01-15" |
| `author` | Yes | Author name | "John Doe" or "CallIQ Team" |
| `excerpt` | Yes | Short description (150-160 chars) | "Learn how AI is revolutionizing..." |
| `categories` | Yes | Main categories (1-3) | ["AI", "Analytics"] |
| `tags` | No | Specific tags (3-5) | ["machine-learning", "sales"] |
| `featuredImage` | No | Hero image URL | "https://images.unsplash.com/..." |
| `published` | Yes | Whether to show the post | true/false |

## Content Guidelines

### SEO Best Practices
1. **Title**: 50-60 characters, include primary keyword
2. **Excerpt**: 150-160 characters for meta description
3. **Headings**: Use H2 (##) for main sections, H3 (###) for subsections
4. **Keywords**: Naturally include target keywords 3-5 times
5. **Links**: Include internal links to other blog posts and CallIQ features
6. **Images**: Use descriptive alt text for all images

### Content Structure
1. **Introduction** (1-2 paragraphs): Hook the reader, state the problem
2. **Main Content** (3-5 sections): Deliver value, use examples
3. **Key Takeaways**: Bullet points summarizing main points
4. **Conclusion**: Recap and call-to-action
5. **Footer**: Link to contact or sign up

### Writing Style
- **Tone**: Professional yet conversational
- **Voice**: Active voice preferred
- **Length**: Aim for 800-1500 words
- **Formatting**: Use bold for emphasis, lists for clarity
- **Examples**: Include real-world scenarios

## Managing Categories & Tags

### Categories (Broad Topics)
Recommended categories for CallIQ:
- **Product Updates** - New features and improvements
- **Best Practices** - How-to guides and tips
- **Industry Insights** - Market trends and analysis
- **Case Studies** - Success stories
- **Technology** - AI, ML, and technical topics
- **Getting Started** - Onboarding and tutorials

### Tags (Specific Topics)
Examples of good tags:
- `ai-transcription`
- `sales-optimization`
- `customer-service`
- `gdpr-compliance`
- `team-collaboration`
- `analytics`
- `integration`

## Publishing Workflow

### Draft Stage
1. Create post with `published: false`
2. Test locally with `npm run dev`
3. Preview at `http://localhost:3000/blog/your-post-slug`

### Review Stage
1. Check SEO metadata
2. Verify all links work
3. Proofread for grammar and clarity
4. Test images load correctly

### Publishing
1. Set `published: true` in frontmatter
2. Build and test: `npm run build`
3. Commit to git
4. Deploy to production

## Advanced Features

### Embedding React Components
You can embed React components in MDX:
```mdx
import { CallToAction } from '@/components/blog/CallToAction'

<CallToAction
  title="Ready to get started?"
  buttonText="Start Free Trial"
  href="/signup"
/>
```

### Adding Custom Styles
Use Tailwind classes with markdown:
```mdx
<div className="bg-blue-50 p-4 rounded-lg">
  **Pro Tip:** This is a highlighted tip box.
</div>
```

### Code Syntax Highlighting
Supported languages:
- javascript/js
- typescript/ts
- python
- sql
- json
- bash
- markdown

## Blog Performance

### Image Optimization
- Use WebP or optimized JPEG/PNG
- Recommended dimensions: 1200x630 for featured images
- Use Unsplash or similar for high-quality stock photos
- Always include alt text

### Loading Performance
- Blog posts are statically generated at build time
- No database queries on page load
- Automatic code splitting for optimal performance
- Built-in lazy loading for images

## Useful Commands

```bash
# Create new blog post
node scripts/new-blog-post.js

# Test blog locally
npm run dev

# Build and check for errors
npm run build

# List all blog posts
ls content/blog/

# Search blog content
grep -r "keyword" content/blog/
```

## Topic Ideas for CallIQ Blog

### Getting Started Series
1. "How to Upload and Transcribe Your First Call"
2. "Setting Up Custom CRM Templates for Your Industry"
3. "Understanding Call Analytics Dashboard"
4. "Team Collaboration Features in CallIQ"

### Best Practices
1. "5 Ways to Improve Sales Call Performance"
2. "Creating Effective Call Scripts with AI Insights"
3. "GDPR Compliance in Call Recording"
4. "Optimizing Customer Service with Call Analytics"

### Industry Insights
1. "The Future of AI in Call Centers"
2. "How Machine Learning Improves Transcription Accuracy"
3. "Call Analytics Trends for 2024"
4. "ROI of Call Recording Software"

### Case Studies
1. "How [Company] Increased Sales by 30% with CallIQ"
2. "Reducing Customer Churn with Call Analytics"
3. "Scaling Customer Support with AI Transcription"

### Technical Deep Dives
1. "Understanding AssemblyAI Integration"
2. "How CallIQ Ensures Data Security"
3. "API Integration Guide for Developers"
4. "Custom Template Variables Explained"

## Troubleshooting

### Common Issues

**Blog post not showing up:**
- Check `published: true` in frontmatter
- Ensure file has `.mdx` extension
- Run `npm run build` to rebuild

**Images not loading:**
- Verify image URL is accessible
- Use HTTPS URLs only
- Check image dimensions

**Build errors:**
- Check frontmatter syntax (proper YAML)
- Ensure all imported components exist
- Verify markdown syntax is correct

## Support

For questions about the blog system:
1. Check this guide first
2. Review existing blog posts for examples
3. Contact the development team

---

*Last updated: January 2024*