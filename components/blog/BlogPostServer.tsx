import { MDXRemote } from 'next-mdx-remote/rsc'
import { Separator } from '@/components/ui/separator'
import type { BlogPost } from '@/lib/blog-types'

// MDX Components for server-side rendering
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
    <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm">{children}</code>
  ),
  pre: ({ children }: any) => (
    <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto mb-4">
      {children}
    </pre>
  ),
  hr: () => <Separator className="my-8" />
}

interface BlogPostServerProps {
  content: string
}

export default function BlogPostServer({ content }: BlogPostServerProps) {
  return (
    <div className="prose prose-lg dark:prose-invert max-w-none">
      <MDXRemote source={content} components={components} />
    </div>
  )
}