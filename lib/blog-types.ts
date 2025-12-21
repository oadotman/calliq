// Shared types for blog functionality
// This file contains only types, no server-side code

export interface BlogPost {
  slug: string
  title: string
  date: string
  excerpt: string
  content: string
  author: string
  categories: string[]
  tags: string[]
  featuredImage?: string
  readingTime: string
  published: boolean
}

export interface BlogPostMeta {
  slug: string
  title: string
  date: string
  excerpt: string
  author: string
  categories: string[]
  tags: string[]
  featuredImage?: string
  readingTime: string
  published: boolean
}