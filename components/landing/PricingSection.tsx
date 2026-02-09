'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { getPublicPlans } from '@/lib/pricing';

export function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const plans = getPublicPlans();

  return (
    <section id="pricing" className="py-20 px-4 lg:px-8 bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
            Start free. Scale as you grow.
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
        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative ${
                plan.isPopular
                  ? 'border-2 border-purple-200 dark:border-purple-800 shadow-2xl shadow-purple-700/20'
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
  );
}
