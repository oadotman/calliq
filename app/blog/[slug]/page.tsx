import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPostBySlug, getAllPosts, getRelatedPosts } from '@/lib/blog'
import BlogPostClient from '@/components/blog/BlogPostClient'

interface BlogPostPageProps {
  params: {
    slug: string
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const post = getPostBySlug(params.slug)

  if (!post) {
    return {
      title: 'Post Not Found - SynQall Blog',
      description: 'The blog post you are looking for could not be found.'
    }
  }

  return {
    title: `${post.title} - SynQall Blog`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
      url: `https://synqall.com/blog/${post.slug}`,
      images: post.featuredImage ? [{
        url: post.featuredImage,
        width: 1200,
        height: 630,
        alt: post.title
      }] : []
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: post.featuredImage ? [post.featuredImage] : []
    }
  }
}

// Generate static params for all blog posts
export async function generateStaticParams() {
  const posts = getAllPosts()
  return posts.map((post) => ({
    slug: post.slug
  }))
}

export default function BlogPostPage({ params }: BlogPostPageProps) {
  const post = getPostBySlug(params.slug)

  if (!post) {
    notFound()
  }

  const relatedPosts = getRelatedPosts(params.slug, 3)

  return <BlogPostClient post={post} relatedPosts={relatedPosts} />
}