'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowRight, Zap } from 'lucide-react';
import Link from 'next/link';
import { getPublicPlans } from '@/lib/pricing';

export default function PricingPageClient() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const plans = getPublicPlans();

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
              <Link href="/login">
                <Button variant="ghost" className="text-sm font-medium">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-gradient-to-r from-purple-700 to-purple-700 hover:from-purple-800 hover:to-purple-700 text-white shadow-lg">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 lg:px-8 bg-gradient-to-br from-slate-50 via-white to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <Badge className="bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800 px-4 py-1.5 text-sm font-semibold mb-6">
              Simple, Transparent Pricing
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-slate-900 dark:text-slate-100 mb-6">
              Choose Your Plan
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
              Start free with 3 calls. No credit card required. Scale as you grow with flexible
              pricing that fits your team.
            </p>
            <div className="inline-flex items-center gap-4 p-1 bg-white dark:bg-slate-800 rounded-full shadow-md">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 rounded-full font-semibold transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-purple-700 text-white shadow-lg'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-6 py-2 rounded-full font-semibold transition-all ${
                  billingCycle === 'annual'
                    ? 'bg-purple-700 text-white shadow-lg'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Annual
                <span className="ml-2 text-xs px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-full">
                  Save 17%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative ${
                  plan.isPopular
                    ? 'border-2 border-purple-200 dark:border-purple-800 shadow-2xl shadow-purple-700/20 scale-105'
                    : 'border-2 border-slate-200 dark:border-slate-700'
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-purple-700 to-purple-700 text-white px-4 py-1.5">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                  <div className="mb-4">
                    {plan.price === 0 ? (
                      <div className="text-4xl font-bold text-slate-900 dark:text-slate-100">
                        {plan.priceDisplay}
                      </div>
                    ) : (
                      <>
                        <div className="text-4xl font-bold text-slate-900 dark:text-slate-100">
                          $
                          {billingCycle === 'monthly'
                            ? plan.price
                            : Math.round(plan.priceAnnual / 12)}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          {billingCycle === 'monthly' ? '/month' : '/month, billed annually'}
                        </div>
                      </>
                    )}
                  </div>
                  <Link href={plan.id === 'free' ? '/signup' : '/signup'}>
                    <Button
                      className={`w-full ${
                        plan.isPopular
                          ? 'bg-gradient-to-r from-purple-700 to-purple-700 hover:from-purple-800 hover:to-purple-700 text-white'
                          : 'bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white'
                      }`}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-slate-600 dark:text-slate-400">{feature}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 lg:px-8 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
              Pricing FAQs
            </h2>
          </div>
          <div className="space-y-6">
            <Card className="border-2 border-slate-200 dark:border-slate-700">
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 mb-3">
                  Can I change plans anytime?
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Yes! You can upgrade or downgrade your plan at any time. Changes take effect
                  immediately, and we'll prorate any differences.
                </p>
              </CardContent>
            </Card>
            <Card className="border-2 border-slate-200 dark:border-slate-700">
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 mb-3">
                  What happens if I exceed my call limit?
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  You can continue using SynQall with our transparent overage pricing. Each
                  additional call is billed at a standard rate based on your plan.
                </p>
              </CardContent>
            </Card>
            <Card className="border-2 border-slate-200 dark:border-slate-700">
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 mb-3">
                  Do you offer enterprise pricing?
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Yes! For teams larger than 50 users or with custom requirements, contact us for
                  enterprise pricing and features.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 lg:px-8 bg-gradient-to-br from-purple-700 to-purple-700 text-white">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Transform Your Sales Process?
          </h2>
          <p className="text-xl mb-8 text-purple-100">
            Join thousands of sales teams saving 15+ minutes per call
          </p>
          <Link href="/signup">
            <Button
              size="lg"
              className="bg-white text-purple-700 hover:bg-slate-100 shadow-2xl px-8 py-6 text-lg font-semibold rounded-xl"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <p className="mt-4 text-sm text-purple-200">
            No credit card required • 3 free calls included • Setup in 5 minutes
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 px-4 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center text-sm text-slate-400">
            <p>&copy; 2025 SynQall. All rights reserved.</p>
            <div className="mt-4 flex justify-center gap-6">
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms
              </Link>
              <Link href="/security" className="hover:text-white transition-colors">
                Security
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
