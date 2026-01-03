import { Metadata } from 'next'
import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/LoginForm'
import { Loader2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Login - SynQall | Access Your CRM Automation Account',
  description: 'Sign in to SynQall to access your AI-powered CRM data automation dashboard. Transform sales calls into CRM-ready data instantly.',
  keywords: [
    'synqall login',
    'sign in',
    'crm automation login',
    'synqall account',
    'sales software login',
  ],
  alternates: {
    canonical: 'https://synqall.com/login',
  },
  openGraph: {
    title: 'Login to SynQall - CRM Data Automation Platform',
    description: 'Access your SynQall account to manage sales call transcriptions and CRM data automation.',
    url: 'https://synqall.com/login',
    siteName: 'SynQall',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Login to SynQall',
    description: 'Access your AI-powered CRM data automation account.',
  },
  robots: {
    index: false,
    follow: true,
    googleBot: {
      index: false,
      follow: true,
    },
  },
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}