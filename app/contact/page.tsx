import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Mail, Clock, HelpCircle, FileText, Users, Headphones } from 'lucide-react';
import { ContactForm } from '@/components/contact/ContactForm';

export const metadata: Metadata = {
  title: 'Contact Us - Get Help with SynQall | CRM Data Automation Support',
  description:
    'Contact SynQall support team for help with CRM data automation, sales call transcription, or technical assistance. 24-hour response time. Free setup help available.',
  keywords: [
    'contact synqall',
    'customer support',
    'sales inquiry',
    'technical support',
    'crm automation help',
    'call transcription support',
    'enterprise sales',
    'synqall support',
  ],
  alternates: {
    canonical: 'https://synqall.com/contact',
  },
  openGraph: {
    title: 'Contact SynQall - Get Expert Help with CRM Automation',
    description:
      'Need help with SynQall? Our support team responds within 24 hours. Get assistance with setup, integrations, or enterprise solutions.',
    url: 'https://synqall.com/contact',
    siteName: 'SynQall',
    type: 'website',
    images: [
      {
        url: 'https://synqall.com/og-contact.jpg',
        width: 1200,
        height: 630,
        alt: 'Contact SynQall Support',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact SynQall - Expert CRM Automation Support',
    description: "Get help with SynQall's AI-powered CRM data automation. 24-hour response time.",
    images: ['https://synqall.com/og-contact.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-700 to-purple-700 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-slate-100">SynQall</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/features">
                <Button variant="ghost">Features</Button>
              </Link>
              <Link href="/pricing">
                <Button variant="ghost">Pricing</Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-gradient-to-r from-purple-700 to-purple-700 hover:from-purple-800 hover:to-purple-700 text-white">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 lg:px-8 bg-gradient-to-br from-slate-50 via-white to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950/30">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center">
            <Badge className="bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800 px-4 py-1.5 text-sm font-semibold mb-6">
              Get in Touch
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-slate-900 dark:text-slate-100 mb-6">
              How Can We <span className="text-purple-700 dark:text-purple-700">Help You?</span>
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Have questions about SynQall? Need help getting started? We're here to help and
              typically respond within 24 hours.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Options */}
      <section className="py-12 px-4 lg:px-8 bg-white dark:bg-slate-950">
        <div className="container mx-auto max-w-5xl">
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card className="border-2 border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-800 transition-colors">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-950 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-6 h-6 text-purple-700 dark:text-purple-700" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Email Support
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  Get help via email
                </p>
                <a
                  href="mailto:support@synqall.com"
                  className="text-purple-700 dark:text-purple-700 font-medium hover:underline"
                >
                  support@synqall.com
                </a>
              </CardContent>
            </Card>

            <Card className="border-2 border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-800 transition-colors">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Response Time
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  We typically respond within
                </p>
                <p className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">24 hours</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-800 transition-colors">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Headphones className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Priority Support
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  For enterprise customers
                </p>
                <p className="text-amber-600 dark:text-amber-400 font-medium">
                  Available on Pro plans
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-20 px-4 lg:px-8 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto max-w-2xl">
          <ContactForm />
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-20 px-4 lg:px-8 bg-white dark:bg-slate-950">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-8 text-center">
            Helpful Resources
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Link href="/help">
              <Card className="border-2 border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-800 transition-colors cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-950 rounded-lg flex items-center justify-center">
                      <HelpCircle className="w-5 h-5 text-purple-700 dark:text-purple-700" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                        Help Center
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Browse FAQs and guides
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/features">
              <Card className="border-2 border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-800 transition-colors cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                        Documentation
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Learn about features
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/pricing">
              <Card className="border-2 border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-800 transition-colors cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                        Sales Team
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Talk to sales</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Preview */}
      <section className="py-20 px-4 lg:px-8 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-8 text-center">
            Common Questions
          </h2>
          <div className="space-y-4">
            <Card className="border-2 border-slate-200 dark:border-slate-700">
              <CardContent className="p-6">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  How quickly can I get started?
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  You can be up and running in 5 minutes. Sign up, create your CRM template, and
                  start uploading calls immediately.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-slate-200 dark:border-slate-700">
              <CardContent className="p-6">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Do you offer a free trial?
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Yes! Every new account gets 3 free calls to test SynQall. No credit card required.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-slate-200 dark:border-slate-700">
              <CardContent className="p-6">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  What if I need help with setup?
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Our support team is happy to help you get started. Just send us a message and
                  we'll guide you through the setup process.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 px-4 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center text-sm text-slate-400">
            <p>&copy; 2025 SynQall. All rights reserved.</p>
            <div className="mt-4 flex justify-center gap-6">
              <Link href="/" className="hover:text-white transition-colors">
                Home
              </Link>
              <Link href="/features" className="hover:text-white transition-colors">
                Features
              </Link>
              <Link href="/pricing" className="hover:text-white transition-colors">
                Pricing
              </Link>
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
