import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  Target,
  Heart,
  Users,
  ArrowRight,
  Lightbulb,
  Award,
  TrendingUp,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About - SynQall",
  description: "Learn about SynQall's mission to eliminate manual CRM data entry for sales teams worldwide. Discover our story and values.",
  openGraph: {
    title: "About SynQall - Our Mission & Story",
    description: "We're on a mission to give sales teams their time back by automating CRM data entry with AI.",
    url: "https://synqall.com/about",
  },
  alternates: {
    canonical: "https://synqall.com/about",
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-purple-600 rounded-lg flex items-center justify-center">
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
                <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 lg:px-8 bg-gradient-to-br from-slate-50 via-white to-violet-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-violet-950/30">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center">
            <Badge className="bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-700 px-4 py-1.5 text-sm font-semibold mb-6">
              About SynQall
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-slate-900 dark:text-slate-100 mb-6">
              We're Giving Sales Teams <br />
              <span className="text-violet-600 dark:text-violet-400">Their Time Back</span>
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
              Every day, sales reps waste hours on manual data entry instead of selling.
              We built SynQall to fix this broken process once and for all.
            </p>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-20 px-4 lg:px-8 bg-white dark:bg-slate-950">
        <div className="container mx-auto max-w-4xl">
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-8 text-center">
              Our Story
            </h2>
            <Card className="border-2 border-violet-100 dark:border-violet-900 p-8 mb-8">
              <CardContent className="space-y-6">
                <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">It started with a simple observation:</span> Sales
                  teams everywhere were drowning in administrative work. After every call, reps would spend 15-20 minutes
                  typing up notes, updating CRM fields, and trying to remember important details.
                </p>
                <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                  We watched talented salespeople lose 2+ hours daily to data entry. Worse, the data was often incomplete,
                  inconsistent, and unreliable. Sales managers couldn't trust their forecasts, and valuable insights were
                  lost between calls.
                </p>
                <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">We knew there had to be a better way.</span> With
                  advances in AI transcription and natural language processing, we saw an opportunity to automate the entire
                  process—turning calls into perfect CRM data in under 2 minutes.
                </p>
                <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                  That's how SynQall was born: a tool that gives sales teams their time back, ensures data accuracy, and
                  works with any CRM—no integration required.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 px-4 lg:px-8 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-12 text-center">
            Mission & Vision
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-2 border-violet-200 dark:border-violet-700">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl flex items-center justify-center mb-6">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">Our Mission</h3>
                <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                  To eliminate manual CRM data entry for every sales team in the world, giving reps back 15+ hours
                  per week to focus on what they do best: building relationships and closing deals.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-emerald-200 dark:border-emerald-700">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center mb-6">
                  <Lightbulb className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">Our Vision</h3>
                <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                  A world where sales teams never waste time on data entry again. Where every conversation is
                  perfectly captured, every insight is preserved, and CRM data is always accurate and complete.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-20 px-4 lg:px-8 bg-white dark:bg-slate-950">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-12 text-center">
            Our Values
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2 border-slate-200 dark:border-slate-700 hover:border-violet-200 dark:hover:border-violet-700 transition-colors">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">Customer First</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Every decision we make starts with one question: Will this help sales teams save time and sell more?
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-slate-200 dark:border-slate-700 hover:border-violet-200 dark:hover:border-violet-700 transition-colors">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">Simplicity Wins</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Complex integrations fail. Simple copy-paste works. We choose the path that gets you results in 5 minutes, not 5 weeks.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-slate-200 dark:border-slate-700 hover:border-violet-200 dark:hover:border-violet-700 transition-colors">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Award className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">Trust & Security</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Your sales data is sacred. We protect it with bank-level encryption and never compromise on security.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Why We Built This */}
      <section className="py-20 px-4 lg:px-8 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30">
        <div className="container mx-auto max-w-4xl">
          <Card className="border-0 shadow-xl bg-white dark:bg-slate-900">
            <CardContent className="p-12">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-8 text-center">
                Why We Built SynQall
              </h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-violet-100 dark:bg-violet-900 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-violet-600 dark:text-violet-400 font-bold">1</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      Sales Reps Deserve Better
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      Talented salespeople shouldn't spend their evenings catching up on CRM updates. They should be
                      closing deals and going home on time.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-violet-100 dark:bg-violet-900 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-violet-600 dark:text-violet-400 font-bold">2</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      Existing Solutions Don't Work
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      Enterprise tools take months to implement. ChatGPT requires manual formatting. We needed something
                      that works instantly with any CRM.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-violet-100 dark:bg-violet-900 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-violet-600 dark:text-violet-400 font-bold">3</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      The Technology Finally Exists
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      With modern AI, we can now transcribe calls with 98% accuracy and extract CRM fields automatically.
                      The future of sales is here—we just built the bridge to it.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Company Info */}
      <section className="py-20 px-4 lg:px-8 bg-white dark:bg-slate-950">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-8">
            Company Information
          </h2>
          <Card className="border-2 border-slate-200 dark:border-slate-700">
            <CardContent className="p-8">
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-4">
                SynQall is owned and operated by
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
                Nikola Innovations Limited
              </p>
              <div className="space-y-2 text-slate-600 dark:text-slate-400">
                <p>Founded: 2024</p>
                <p>Location: United States</p>
                <p>Contact: <a href="mailto:support@synqall.com" className="text-violet-600 dark:text-violet-400 hover:underline">support@synqall.com</a></p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 lg:px-8 bg-gradient-to-br from-violet-600 to-purple-600 text-white">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Join the Movement
          </h2>
          <p className="text-xl mb-8 text-violet-100">
            Be part of the revolution that's giving sales teams their time back
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="bg-white text-violet-600 hover:bg-slate-100 shadow-2xl px-8 py-6 text-lg font-semibold rounded-xl">
                Try SynQall Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 px-8 py-6 text-lg font-semibold rounded-xl">
                Get in Touch
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 px-4 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center text-sm text-slate-400">
            <p>&copy; 2025 SynQall. All rights reserved.</p>
            <p className="mt-2">SynQall is owned and operated by Nikola Innovations Limited.</p>
            <div className="mt-4 flex justify-center gap-6">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <Link href="/features" className="hover:text-white transition-colors">Features</Link>
              <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}