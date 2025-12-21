'use client'

import Link from 'next/link'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { format } from 'date-fns'
import type { BlogPost, BlogPostMeta } from '@/lib/blog-types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CalendarIcon, ClockIcon, UserIcon, ArrowLeftIcon, CopyIcon } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { useState } from 'react'

interface BlogPostClientProps {
  post: BlogPost
  relatedPosts: BlogPostMeta[]
}

// MDX Components
const components = {
  h1: ({ children }: any) => <h1 className="text-4xl font-bold mt-8 mb-4">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-3xl font-semibold mt-8 mb-4">{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-2xl font-semibold mt-6 mb-3">{children}</h3>,
  h4: ({ children }: any) => <h4 className="text-xl font-semibold mt-4 mb-2">{children}</h4>,
  p: ({ children }: any) => <p className="mb-4 leading-relaxed">{children}</p>,
  ul: ({ children }: any) => <ul className="list-disc list-inside mb-4 space-y-2">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal list-inside mb-4 space-y-2">{children}</ol>,
  li: ({ children }: any) => <li className="ml-4">{children}</li>,
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-primary pl-4 italic my-4 text-gray-600 dark:text-gray-400">
      {children}
    </blockquote>
  ),
  code: ({ children }: any) => (
    <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm">
      {children}
    </code>
  ),
  pre: ({ children }: any) => (
    <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto mb-4">
      {children}
    </pre>
  ),
  a: ({ href, children }: any) => (
    <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  img: ({ src, alt }: any) => (
    <img src={src} alt={alt} className="rounded-lg my-8 w-full" />
  ),
  hr: () => <Separator className="my-8" />
}

export default function BlogPostClient({ post, relatedPosts }: BlogPostClientProps) {
  const [copied, setCopied] = useState(false)

  // Share functionality
  const shareUrl = `https://calliq.ai/blog/${post.slug}`
  const shareTitle = post.title

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleTwitterShare = () => {
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`, '_blank')
  }

  const handleLinkedInShare = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-black">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Back to Blog */}
          <Link href="/blog">
            <Button variant="ghost" className="mb-8 hover:bg-white/10">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Blog
            </Button>
          </Link>

          {/* Post Header */}
          <div className="text-center">
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {post.categories.map((category) => (
                <Badge key={category} variant="secondary">
                  {category}
                </Badge>
              ))}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
              {post.title}
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
              {post.excerpt}
            </p>

            {/* Post Meta */}
            <div className="flex items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <UserIcon className="h-4 w-4" />
                {post.author}
              </span>
              <span className="flex items-center gap-1">
                <CalendarIcon className="h-4 w-4" />
                {format(new Date(post.date), 'MMMM d, yyyy')}
              </span>
              <span className="flex items-center gap-1">
                <ClockIcon className="h-4 w-4" />
                {post.readingTime}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Image */}
      {post.featuredImage && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
          <img
            src={post.featuredImage}
            alt={post.title}
            className="w-full rounded-2xl shadow-2xl"
          />
        </div>
      )}

      {/* Post Content */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <MDXRemote source={post.content} components={components} />
        </div>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="mt-12 pt-8 border-t">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Link key={tag} href={`/blog/tag/${tag.toLowerCase().replace(/ /g, '-')}`}>
                  <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-white transition-colors">
                    #{tag}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Share Section */}
        <div className="mt-12 p-6 bg-gray-100 dark:bg-gray-800 rounded-xl">
          <h3 className="font-semibold mb-4">Share this article</h3>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTwitterShare}
            >
              Twitter
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLinkedInShare}
            >
              LinkedIn
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
            >
              <CopyIcon className="h-4 w-4 mr-2" />
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
          </div>
        </div>

        {/* Author Bio */}
        <Card className="mt-12">
          <CardHeader>
            <CardTitle>About the Author</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                {post.author.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-lg mb-2">{post.author}</h4>
                <p className="text-gray-600 dark:text-gray-400">
                  Contributing to CallIQ's mission to revolutionize call analytics with AI-powered insights
                  and helping businesses extract maximum value from their customer conversations.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold mb-6">Related Articles</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {relatedPosts.map((relatedPost) => (
                <Link key={relatedPost.slug} href={`/blog/${relatedPost.slug}`}>
                  <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                    {relatedPost.featuredImage && (
                      <div className="relative h-32 overflow-hidden rounded-t-lg">
                        <img
                          src={relatedPost.featuredImage}
                          alt={relatedPost.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="text-lg line-clamp-2">{relatedPost.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {relatedPost.excerpt}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {format(new Date(relatedPost.date), 'MMM d, yyyy')} • {relatedPost.readingTime}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Newsletter CTA */}
        <Card className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Get More Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-blue-100">
              Subscribe to our newsletter for the latest CallIQ updates and call analytics best practices.
            </p>
            <form className="flex gap-3">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
              />
              <Button className="bg-white text-blue-600 hover:bg-gray-100">
                Subscribe
              </Button>
            </form>
          </CardContent>
        </Card>
      </article>
    </div>
  )
}