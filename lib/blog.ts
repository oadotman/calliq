import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import readingTime from 'reading-time'

const postsDirectory = path.join(process.cwd(), 'content/blog')

// Re-export types from blog-types.ts
export type { BlogPost, BlogPostMeta } from './blog-types'
import type { BlogPost, BlogPostMeta } from './blog-types'

// Get all blog post files
export function getPostFiles(): string[] {
  try {
    // Create directory if it doesn't exist
    if (!fs.existsSync(postsDirectory)) {
      fs.mkdirSync(postsDirectory, { recursive: true })
      return []
    }
    return fs.readdirSync(postsDirectory).filter((file) => file.endsWith('.mdx'))
  } catch (error) {
    console.error('Error reading posts directory:', error)
    return []
  }
}

// Get a single post by slug
export function getPostBySlug(slug: string): BlogPost | null {
  try {
    const realSlug = slug.replace(/\.mdx$/, '')
    const fullPath = path.join(postsDirectory, `${realSlug}.mdx`)

    if (!fs.existsSync(fullPath)) {
      return null
    }

    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data, content } = matter(fileContents)

    const readTime = readingTime(content)

    return {
      slug: realSlug,
      title: data.title || 'Untitled',
      date: data.date || new Date().toISOString(),
      excerpt: data.excerpt || '',
      content,
      author: data.author || 'SynQall Team',
      categories: data.categories || [],
      tags: data.tags || [],
      featuredImage: data.featuredImage,
      readingTime: readTime.text,
      published: data.published !== false, // Default to true if not specified
    }
  } catch (error) {
    console.error(`Error reading post ${slug}:`, error)
    return null
  }
}

// Get all posts (metadata only for listing)
export function getAllPosts(): BlogPostMeta[] {
  const files = getPostFiles()
  const now = new Date()

  const posts = files
    .map((file) => {
      const post = getPostBySlug(file.replace(/\.mdx$/, ''))
      if (!post) return null

      // Return only metadata, not full content
      const { content, ...meta } = post
      return meta
    })
    .filter((post): post is BlogPostMeta => post !== null)
    .filter((post) => post.published) // Only show published posts
    .filter((post) => new Date(post.date) <= now) // Only show posts with dates in the past
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return posts
}

// Get posts by category
export function getPostsByCategory(category: string): BlogPostMeta[] {
  const allPosts = getAllPosts()
  return allPosts.filter((post) =>
    post.categories.map(c => c.toLowerCase()).includes(category.toLowerCase())
  )
}

// Get posts by tag
export function getPostsByTag(tag: string): BlogPostMeta[] {
  const allPosts = getAllPosts()
  return allPosts.filter((post) =>
    post.tags.map(t => t.toLowerCase()).includes(tag.toLowerCase())
  )
}

// Get related posts (by shared categories or tags)
export function getRelatedPosts(slug: string, limit: number = 3): BlogPostMeta[] {
  const currentPost = getPostBySlug(slug)
  if (!currentPost) return []

  const allPosts = getAllPosts().filter(post => post.slug !== slug)

  // Score posts based on shared categories and tags
  const scoredPosts = allPosts.map(post => {
    let score = 0

    // Add points for shared categories
    currentPost.categories.forEach(cat => {
      if (post.categories.includes(cat)) score += 2
    })

    // Add points for shared tags
    currentPost.tags.forEach(tag => {
      if (post.tags.includes(tag)) score += 1
    })

    return { post, score }
  })

  // Sort by score and return top posts
  return scoredPosts
    .sort((a, b) => b.score - a.score)
    .filter(item => item.score > 0)
    .slice(0, limit)
    .map(item => item.post)
}

// Get all unique categories
export function getAllCategories(): string[] {
  const posts = getAllPosts()
  const categories = new Set<string>()

  posts.forEach(post => {
    post.categories.forEach(cat => categories.add(cat))
  })

  return Array.from(categories).sort()
}

// Get all unique tags
export function getAllTags(): string[] {
  const posts = getAllPosts()
  const tags = new Set<string>()

  posts.forEach(post => {
    post.tags.forEach(tag => tags.add(tag))
  })

  return Array.from(tags).sort()
}

// Search posts by query
export function searchPosts(query: string): BlogPostMeta[] {
  const posts = getAllPosts()
  const searchTerm = query.toLowerCase()

  return posts.filter(post =>
    post.title.toLowerCase().includes(searchTerm) ||
    post.excerpt.toLowerCase().includes(searchTerm) ||
    post.categories.some(cat => cat.toLowerCase().includes(searchTerm)) ||
    post.tags.some(tag => tag.toLowerCase().includes(searchTerm))
  )
}