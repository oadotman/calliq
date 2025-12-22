import { Metadata } from 'next'
import Link from 'next/link'
import { format } from 'date-fns'
import { getAllPosts, getAllCategories } from '@/lib/blog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CalendarIcon, ClockIcon, UserIcon, ArrowRightIcon } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Blog - SynQall | AI-Powered Call Analytics Insights',
  description: 'Learn about call analytics, AI transcription, sales optimization, and best practices for managing customer conversations with SynQall.',
  openGraph: {
    title: 'SynQall Blog - Insights on Call Analytics & AI',
    description: 'Expert insights on call recording, transcription, and analytics to help you optimize your sales and customer service operations.',
    type: 'website',
    url: 'https://synqall.com/blog',
    images: [{
      url: 'https://synqall.com/og-blog.png',
      width: 1200,
      height: 630,
      alt: 'SynQall Blog'
    }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SynQall Blog - Call Analytics Insights',
    description: 'Expert insights on call recording, transcription, and analytics.',
    images: ['https://synqall.com/og-blog.png']
  }
}

export default function BlogPage() {
  const posts = getAllPosts()
  const categories = getAllCategories()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-black">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 mb-6">
              SynQall Blog
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
              Insights, tutorials, and best practices for leveraging AI-powered call analytics to transform your business conversations
            </p>

            {/* Categories */}
            {categories.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mt-8">
                {categories.map((category) => (
                  <Link
                    key={category}
                    href={`/blog/category/${category.toLowerCase().replace(/ /g, '-')}`}
                  >
                    <Badge variant="secondary" className="cursor-pointer hover:bg-primary hover:text-white transition-colors">
                      {category}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Blog Posts Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {posts.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
              <CalendarIcon className="h-10 w-10 text-gray-400" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              No blog posts yet
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Check back soon for insights on call analytics and AI-powered transcription!
            </p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`}>
                <Card className="h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
                  {post.featuredImage && (
                    <div className="relative h-48 overflow-hidden rounded-t-lg">
                      <img
                        src={post.featuredImage}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">
                      {post.title}
                    </CardTitle>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {post.categories.map((category) => (
                        <Badge key={category} variant="outline" className="text-xs">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-400 line-clamp-3 mb-4">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-4 w-4" />
                          {format(new Date(post.date), 'MMM d, yyyy')}
                        </span>
                        <span className="flex items-center gap-1">
                          <ClockIcon className="h-4 w-4" />
                          {post.readingTime}
                        </span>
                      </div>
                      <ArrowRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                      <UserIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {post.author}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Newsletter CTA */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Stay Updated with SynQall Insights
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Get the latest tips on call analytics and AI-powered transcription delivered to your inbox
          </p>
          <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
            >
              Subscribe
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}