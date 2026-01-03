import { Metadata } from 'next';
import { Suspense } from 'react';
import { SignupForm } from '@/components/auth/SignupForm';
import { Loader2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Sign Up - Free Trial | SynQall',
  description: 'Start your free trial with SynQall. Transform sales calls into CRM-ready data instantly with AI. No credit card required. Get 3 free calls to test our service.',
  keywords: [
    'sign up',
    'free trial',
    'CRM automation signup',
    'sales tool registration',
    'AI transcription trial',
    'free account',
    'get started',
    'SynQall registration'
  ],
  alternates: {
    canonical: 'https://synqall.com/signup',
  },
  openGraph: {
    title: 'Start Your Free Trial - SynQall',
    description: 'Join thousands of sales teams saving 15+ minutes per call. Get started with 3 free calls. No credit card required.',
    url: 'https://synqall.com/signup',
    type: 'website',
    images: [
      {
        url: 'https://synqall.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Sign up for SynQall - AI-powered CRM automation',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Start Your Free Trial - SynQall',
    description: 'Transform sales calls into CRM data instantly. Start with 3 free calls.',
    images: ['https://synqall.com/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading signup form...</p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-muted/20">
      <div className="w-full max-w-md space-y-8">
        <Suspense fallback={<LoadingFallback />}>
          <SignupForm />
        </Suspense>

        {/* Trust badges for SEO and conversion */}
        <div className="text-center space-y-4 mt-8">
          <div className="flex items-center justify-center gap-8 text-muted-foreground">
            <div className="text-sm">
              <div className="font-semibold">No Credit Card</div>
              <div>Required</div>
            </div>
            <div className="text-sm">
              <div className="font-semibold">3 Free Calls</div>
              <div>To Start</div>
            </div>
            <div className="text-sm">
              <div className="font-semibold">GDPR</div>
              <div>Compliant</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}