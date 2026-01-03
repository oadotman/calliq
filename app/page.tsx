import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Clock,
  Zap,
  Users,
  Shield,
  ArrowRight,
  Play,
  X,
  Check,
  Sparkles,
  FileText,
  BarChart3,
  Folder,
  Award,
} from "lucide-react";

// Client Components
import { Navigation } from "@/components/landing/Navigation";
import { ROICalculator } from "@/components/landing/ROICalculator";
import { PricingSection } from "@/components/landing/PricingSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { StickyCTA } from "@/components/landing/StickyCTA";

export const metadata: Metadata = {
  title: "SynQall - AI-Powered CRM Data Entry Automation for Sales Teams",
  description: "Transform sales calls into CRM-ready data instantly with AI. Save 15+ minutes per call. Upload audio, get transcripts, extract key insights. No CRM integration required. Try free!",
  keywords: [
    "CRM automation",
    "sales call transcription",
    "AI data entry",
    "sales productivity",
    "call recording software",
    "CRM data extraction",
    "sales automation tool",
    "call analytics",
    "AssemblyAI transcription",
    "OpenAI integration",
    "automated CRM updates",
    "sales efficiency",
    "multi-party call support",
    "enterprise sales tools"
  ],
  alternates: {
    canonical: 'https://synqall.com',
  },
  openGraph: {
    title: "SynQall - AI-Powered CRM Data Entry Automation",
    description: "Upload sales calls and get CRM-ready data instantly. Save 15+ minutes per call with AI-powered transcription and data extraction.",
    url: 'https://synqall.com',
    siteName: 'SynQall',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: 'https://synqall.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SynQall - CRM Data Entry Automation',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SynQall - AI-Powered CRM Data Entry Automation',
    description: 'Transform sales calls into CRM-ready data instantly. Save 15+ minutes per call.',
    images: ['https://synqall.com/og-image.png'],
    creator: '@synqall',
  },
  robots: {
    index: true,
    follow: true,
    'max-video-preview': -1,
    'max-image-preview': 'large',
    'max-snippet': -1,
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <Navigation />

      {/* Hero Section - Server Rendered */}
      <section className="pt-32 pb-20 px-4 lg:px-8 bg-gradient-to-br from-slate-50 via-white to-violet-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-violet-950/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-8">
            <Badge className="bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-700 px-4 py-1.5 text-sm font-semibold">
              Save 15+ minutes per call
            </Badge>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
              <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                Turn Sales Calls Into Perfect CRM Data
              </span>
              <br />
              <span className="text-slate-900 dark:text-slate-100">in Under 2 Minutes.</span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
              Upload your sales call → SynQall transcribes it → 60 seconds extraction → Perfect CRM-ready data.<br />
              <span className="font-semibold text-slate-900 dark:text-slate-100">Zero IT involvement. Just accurate data.</span>
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup">
                <Button size="lg" className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-2xl shadow-violet-500/40 px-8 py-6 text-lg font-semibold rounded-xl hover-glow animate-pulse-glow">
                  Try It Free — No Card Required
                  <span className="ml-2 px-2 py-0.5 bg-white/20 rounded text-sm">3 Calls Free</span>
                </Button>
              </Link>
              <Link href="https://youtu.be/NXpuKIH28Nk" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="border-2 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 px-8 py-6 text-lg font-semibold rounded-xl">
                  <Play className="w-5 h-5 mr-2" />
                  Watch Demo
                </Button>
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-8 pt-8 text-sm font-medium text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                Save 15+ minutes per call
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                Setup in 5 minutes
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                Works with any CRM
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CRM Compatibility Logos */}
      <section className="py-16 px-4 lg:px-8 bg-white dark:bg-slate-950 border-y border-slate-200 dark:border-slate-800">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-10">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider">Works With Any CRM—Zero IT Required</p>
            <p className="text-sm text-slate-500 dark:text-slate-500 mb-6">Works even with custom, internal, or legacy CRMs.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 md:gap-8 items-center justify-items-center">
              {/* Salesforce */}
              <div className="flex items-center gap-2 group">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">SF</span>
                </div>
                <span className="text-slate-700 dark:text-slate-300 font-semibold group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">Salesforce</span>
              </div>
              {/* HubSpot */}
              <div className="flex items-center gap-2 group">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">HS</span>
                </div>
                <span className="text-slate-700 dark:text-slate-300 font-semibold group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">HubSpot</span>
              </div>
              {/* Pipedrive */}
              <div className="flex items-center gap-2 group">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">PD</span>
                </div>
                <span className="text-slate-700 dark:text-slate-300 font-semibold group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">Pipedrive</span>
              </div>
              {/* Zoho */}
              <div className="flex items-center gap-2 group">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">Z</span>
                </div>
                <span className="text-slate-700 dark:text-slate-300 font-semibold group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">Zoho CRM</span>
              </div>
              {/* Freshsales */}
              <div className="flex items-center gap-2 group">
                <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">FS</span>
                </div>
                <span className="text-slate-700 dark:text-slate-300 font-semibold group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">Freshsales</span>
              </div>
              {/* Monday */}
              <div className="flex items-center gap-2 group">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">M</span>
                </div>
                <span className="text-slate-700 dark:text-slate-300 font-semibold group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">Monday.com</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="py-20 px-4 lg:px-8 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
              The Real Cost of Manual CRM Updates
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed">
              Sales reps lose 2+ hours daily on data entry—time that should be spent selling.<br /><br />
              The result: incomplete data, inconsistent fields across reps, and forecasts nobody trusts.
            </p>
          </div>
        </div>
      </section>

      {/* The Solution Section */}
      <section className="py-20 px-4 lg:px-8 bg-white dark:bg-slate-950">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
              Turn Every Call Into Perfect CRM Data—<span className="text-violet-600 dark:text-violet-400">in Under 2 Minutes Total</span>
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl mx-auto">
              SynQall automatically transcribes your call and converts it into your exact CRM structure.<br />
              Your reps just <span className="font-semibold text-slate-900 dark:text-slate-100">review and paste</span>.
            </p>
          </div>
          <div className="grid md:grid-cols-5 gap-3 mb-12">
            <div className="text-center p-4 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950 dark:to-purple-950 rounded-2xl border-2 border-violet-200 dark:border-violet-700 hover-lift animate-fade-in-up animate-stagger-1">
              <div className="w-10 h-10 bg-violet-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold">1</span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1 text-sm">Upload</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">Drop your recording or meeting link</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 rounded-2xl border-2 border-blue-200 dark:border-blue-700 hover-lift animate-fade-in-up animate-stagger-2">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold">2</span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1 text-sm">Transcription</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">SynQall generates a clean, accurate transcript</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950 dark:to-cyan-950 rounded-2xl border-2 border-teal-200 dark:border-teal-700 hover-lift animate-fade-in-up animate-stagger-3">
              <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold">3</span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1 text-sm">Instant Extraction</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">60 seconds to extract all CRM fields</p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Optional: You can also paste your typed notes to help improve the accuracy for certain CRM fields.</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950 rounded-2xl border-2 border-emerald-200 dark:border-emerald-700 hover-lift animate-fade-in-up animate-stagger-4">
              <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold">4</span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1 text-sm">Quick Review</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">≈30 sec to verify accuracy</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 rounded-2xl border-2 border-amber-200 dark:border-amber-700 hover-lift animate-fade-in-up animate-stagger-5">
              <div className="w-10 h-10 bg-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold">5</span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1 text-sm">Paste</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">Copy into your CRM — done</p>
            </div>
          </div>
          <Card className="bg-gradient-to-br from-violet-600 to-purple-600 text-white border-0 shadow-2xl">
            <CardContent className="p-8">
              <div className="grid md:grid-cols-3 gap-8 text-center">
                <div>
                  <div className="text-4xl font-bold mb-2">{"< 2 minutes"}</div>
                  <p className="text-violet-100">Total time (60 seconds extraction + 30s review)</p>
                </div>
                <div>
                  <div className="text-4xl font-bold mb-2">High</div>
                  <p className="text-violet-100">Detail accuracy</p>
                </div>
                <div>
                  <div className="text-4xl font-bold mb-2">15+ minutes</div>
                  <p className="text-violet-100">Saved per call</p>
                </div>
              </div>
              <p className="text-center mt-6 text-lg font-medium">
                <span className="font-bold">Total Active Work Time: 90 seconds</span><br />
                <span className="text-violet-100">(because reps only review → not type)</span>
              </p>
              <p className="text-center mt-4 text-lg font-medium">
                Your team instantly recovers 15+ hours weekly, and your CRM becomes a reliable source of truth.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works - Before/After Comparison */}
      <section className="py-20 px-4 lg:px-8 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
              Less Typing. Better Data. <span className="text-violet-600 dark:text-violet-400">Done Faster.</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-2 border-slate-200 dark:border-slate-700">
              <CardHeader className="bg-slate-100 dark:bg-slate-800">
                <CardTitle className="text-slate-900 dark:text-slate-100">Before SynQall</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-950/50 rounded-lg">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Time per call</span>
                  <span className="font-bold text-red-600 dark:text-red-500">15+ minutes</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-950/50 rounded-lg">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Notes quality</span>
                  <span className="font-bold text-red-600 dark:text-red-500">Incomplete</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-950/50 rounded-lg">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Accuracy</span>
                  <span className="font-bold text-red-600 dark:text-red-500">60–70%</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-950/50 rounded-lg">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Context retention</span>
                  <span className="font-bold text-red-600 dark:text-red-500">Lost between calls</span>
                </div>
              </CardContent>
            </Card>
            <Card className="border-2 border-violet-200 dark:border-violet-700 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-violet-600 to-purple-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  With SynQall
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Time per call</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-500">90 seconds</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Notes quality</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-500">Complete + structured</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Accuracy</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-500">High accuracy</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Context retention</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-500">100% captured</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section id="features" className="py-20 px-4 lg:px-8 bg-white dark:bg-slate-950">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
              Everything Reps Need. <span className="text-violet-600 dark:text-violet-400">Nothing They Don't.</span>
            </h2>
          </div>
          {/* Multi-Party Call Highlight - USP */}
          <div className="mb-12 p-8 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border-2 border-violet-200 dark:border-violet-800 rounded-2xl">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Multi-Party Call Support</h3>
                  <Badge className="bg-violet-600 text-white border-0">Key Feature</Badge>
                </div>
                <p className="text-lg text-slate-700 dark:text-slate-300 mb-4">
                  Handles complex calls with <span className="font-semibold text-violet-600 dark:text-violet-400">multiple stakeholders</span>. Add unlimited participants, assign roles, and get clear speaker identification—even on enterprise deals.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">Track Every Participant</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Name, role, company for each person</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">Automatic Speaker Labels</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">AI identifies who said what</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">Enterprise Sales Ready</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Perfect for complex buying committees</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">Unlimited Participants</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">No limits on team size</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card className="border-2 border-blue-100 dark:border-blue-900 hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <CardTitle>Automatic Extraction</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Full transcript with speaker labels</p>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Company and contact details</p>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Pain points, challenges, budget</p>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Timeline, next steps, decision makers</p>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Objections, competitors, sentiment</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-violet-100 dark:border-violet-900 hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-violet-600 rounded-xl flex items-center justify-center mb-4">
                  <Folder className="w-6 h-6 text-white" />
                </div>
                <CardTitle>CRM-Ready Output</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Salesforce, HubSpot, Pipedrive templates</p>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Custom templates for any CRM</p>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">One-time setup, auto-format forever</p>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Export multiple formats from one call</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-emerald-100 dark:border-emerald-900 hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <CardTitle>Additional Tools</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">Follow-up email drafts</span> (auto-generated from the call)
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Search across past calls</p>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">PDF export for sharing</p>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Analytics dashboard</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Enhanced ROI Calculator - Client Component */}
      <section className="py-20 px-4 lg:px-8 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950 dark:to-purple-950">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <Badge className="bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-700 px-4 py-1.5 text-sm font-semibold mb-6">
              Calculate Your Savings
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
              See Your Team's <span className="text-violet-600 dark:text-violet-400">Time & Cost Savings</span>
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Enter your team size and call volume to see how much time and money SynQall saves you monthly
            </p>
          </div>
          <ROICalculator />
        </div>
      </section>

      {/* Why No Integration Is a Feature */}
      <section className="py-20 px-4 lg:px-8 bg-gradient-to-br from-slate-50 to-violet-50/30 dark:from-slate-900 dark:to-violet-950/30">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
              Works With Any CRM—<span className="text-violet-600 dark:text-violet-400">Because It Doesn't Rely on Integrations</span>
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
              Most tools require IT approval, API access, and weeks of setup. SynQall avoids that entirely.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-2 border-red-100 dark:border-red-900 bg-red-50/50 dark:bg-red-950/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-900 dark:text-red-300">
                  <X className="w-6 h-6" />
                  Traditional Integrations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700 dark:text-slate-300">6–12 week security reviews</p>
                </div>
                <div className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700 dark:text-slate-300">Only support certain CRMs</p>
                </div>
                <div className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700 dark:text-slate-300">Break when APIs change</p>
                </div>
                <div className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700 dark:text-slate-300">Can't handle custom CRMs</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-2 border-emerald-200 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/50 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-900 dark:text-emerald-300">
                  <CheckCircle2 className="w-6 h-6" />
                  SynQall's Copy-Paste Approach
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700 dark:text-slate-300 font-medium">Live in 5 minutes</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700 dark:text-slate-300 font-medium">Works with any CRM, including custom</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700 dark:text-slate-300 font-medium">Never breaks</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700 dark:text-slate-300 font-medium">Supports multiple CRMs at once</p>
                </div>
              </CardContent>
            </Card>
          </div>
          <p className="text-center mt-8 text-lg font-semibold text-slate-900 dark:text-slate-100">
            A few seconds of copy-paste = total flexibility.
          </p>
        </div>
      </section>

      {/* Security & Trust Section */}
      <section id="security" className="py-20 px-4 lg:px-8 bg-white dark:bg-slate-950">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <Badge className="bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700 px-4 py-1.5 text-sm font-semibold mb-6">
              Enterprise-Grade Security
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
              Your CRM Data is <span className="text-emerald-600 dark:text-emerald-400">Sacred to Us</span>
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
              We handle sensitive sales data with bank-level security and compliance standards
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
            {/* Bank-Level Encryption */}
            <Card className="border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-700 hover:shadow-xl transition-all">
              <CardContent className="pt-8 pb-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-2 text-center">Bank-Level Encryption</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
                  AES-256 encryption for all data at rest, SSL/TLS in transit
                </p>
              </CardContent>
            </Card>

            {/* Smart Data Retention */}
            <Card className="border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-700 hover:shadow-xl transition-all">
              <CardContent className="pt-8 pb-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Clock className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-2 text-center">Smart Retention</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
                  Audio deleted after 7 days • CRM data kept • Logs anonymized at 90 days
                </p>
              </CardContent>
            </Card>

            {/* GDPR Compliant */}
            <Card className="border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-700 hover:shadow-xl transition-all">
              <CardContent className="pt-8 pb-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Award className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-2 text-center">GDPR Compliant</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
                  Full GDPR compliance with data export and deletion rights
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Additional Security Features */}
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6 text-center">
              Additional Security Measures
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">SSL/TLS encryption in transit</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">RBAC (Role-based access control)</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">Regular security audits</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">Security-first architecture</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">24/7 security monitoring</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">Data residency options</span>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <div className="bg-violet-100 dark:bg-violet-900/30 border-2 border-violet-300 dark:border-violet-700 rounded-xl p-4 mb-6 max-w-2xl mx-auto">
              <p className="text-lg font-bold text-violet-900 dark:text-violet-100">
                🔐 We do NOT store your CRM credentials
              </p>
              <p className="text-sm text-violet-700 dark:text-violet-300 mt-1">
                Your CRM login details never touch our servers. Data is copied directly by you.
              </p>
            </div>
            <div className="flex items-center justify-center gap-4 mt-8">
              <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                🔒 Bank-Level Encryption
              </Badge>
              <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                🛡️ Security-First Architecture
              </Badge>
              <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                ✓ GDPR Compliant
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 px-4 lg:px-8 bg-gradient-to-br from-slate-50 to-violet-50/30 dark:from-slate-900 dark:to-violet-950/30">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
              How SynQall Stacks Up
            </h2>
          </div>
          {/* Visual Comparison Grid */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
              <thead className="bg-slate-100 dark:bg-slate-900">
                <tr>
                  <th className="text-left p-4 font-bold text-slate-900 dark:text-slate-100 border-b-2 border-slate-200 dark:border-slate-700">Features</th>
                  <th className="text-center p-4 font-bold text-slate-900 dark:text-slate-100 border-b-2 border-slate-200 dark:border-slate-700">Gong/Chorus</th>
                  <th className="text-center p-4 font-bold text-slate-900 dark:text-slate-100 border-b-2 border-slate-200 dark:border-slate-700">ChatGPT</th>
                  <th className="text-center p-4 font-bold border-b-2 border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/50">
                    <div className="flex flex-col items-center">
                      <span className="text-violet-900 dark:text-violet-300">SynQall</span>
                      <Badge className="bg-violet-600 text-white text-xs mt-1">Best Value</Badge>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-900">
                  <td className="p-4 font-medium text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700">Setup Time</td>
                  <td className="text-center p-4 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-red-600 dark:text-red-400 font-semibold">6-12 weeks</span>
                  </td>
                  <td className="text-center p-4 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Instant</span>
                  </td>
                  <td className="text-center p-4 border-b border-slate-100 dark:border-slate-700 bg-violet-50/50 dark:bg-violet-950/30">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">5 minutes</span>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-900">
                  <td className="p-4 font-medium text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700">CRM Flexibility</td>
                  <td className="text-center p-4 border-b border-slate-100 dark:border-slate-700">
                    <X className="w-5 h-5 text-red-600 dark:text-red-400 inline" />
                  </td>
                  <td className="text-center p-4 border-b border-slate-100 dark:border-slate-700">
                    <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 inline" />
                  </td>
                  <td className="text-center p-4 border-b border-slate-100 dark:border-slate-700 bg-violet-50/50 dark:bg-violet-950/30">
                    <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 inline" />
                  </td>
                </tr>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-900">
                  <td className="p-4 font-medium text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700">CRM-Ready Output</td>
                  <td className="text-center p-4 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">Partial</span>
                  </td>
                  <td className="text-center p-4 border-b border-slate-100 dark:border-slate-700">
                    <X className="w-5 h-5 text-red-600 dark:text-red-400 inline" />
                  </td>
                  <td className="text-center p-4 border-b border-slate-100 dark:border-slate-700 bg-violet-50/50 dark:bg-violet-950/30">
                    <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 inline" />
                  </td>
                </tr>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-900">
                  <td className="p-4 font-medium text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700">Custom CRM Support</td>
                  <td className="text-center p-4 border-b border-slate-100 dark:border-slate-700">
                    <X className="w-5 h-5 text-red-600 dark:text-red-400 inline" />
                  </td>
                  <td className="text-center p-4 border-b border-slate-100 dark:border-slate-700">
                    <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 inline" />
                  </td>
                  <td className="text-center p-4 border-b border-slate-100 dark:border-slate-700 bg-violet-50/50 dark:bg-violet-950/30">
                    <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 inline" />
                  </td>
                </tr>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-900">
                  <td className="p-4 font-medium text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700">No IT Required</td>
                  <td className="text-center p-4 border-b border-slate-100 dark:border-slate-700">
                    <X className="w-5 h-5 text-red-600 dark:text-red-400 inline" />
                  </td>
                  <td className="text-center p-4 border-b border-slate-100 dark:border-slate-700">
                    <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 inline" />
                  </td>
                  <td className="text-center p-4 border-b border-slate-100 dark:border-slate-700 bg-violet-50/50 dark:bg-violet-950/30">
                    <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 inline" />
                  </td>
                </tr>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-900">
                  <td className="p-4 font-medium text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700">Price</td>
                  <td className="text-center p-4 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-red-600 dark:text-red-400 font-semibold">$$$$$</span>
                  </td>
                  <td className="text-center p-4 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">$</span>
                  </td>
                  <td className="text-center p-4 border-b border-slate-100 dark:border-slate-700 bg-violet-50/50 dark:bg-violet-950/30">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">$$</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pricing Section - Client Component */}
      <PricingSection />

      {/* FAQ - Client Component */}
      <FAQSection />

      {/* Who It's For */}
      <section className="py-20 px-4 lg:px-8 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
              Is SynQall Right for You?
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-2 border-emerald-200 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-900 dark:text-emerald-300">
                  <CheckCircle2 className="w-6 h-6" />
                  Perfect Fit
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700 dark:text-slate-300">Teams with 5–50 reps</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700 dark:text-slate-300">Companies using custom or multi-CRM setups</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700 dark:text-slate-300">Teams needing fast deployment</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700 dark:text-slate-300">Organizations with inconsistent CRM data</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-2 border-red-100 dark:border-red-900 bg-red-50/50 dark:bg-red-950/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-900 dark:text-red-300">
                  <X className="w-6 h-6" />
                  Not a Fit
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700 dark:text-slate-300">Solo reps with &lt;5 calls weekly</p>
                </div>
                <div className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700 dark:text-slate-300">Teams already using Gong/Chorus for full enablement</p>
                </div>
                <div className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700 dark:text-slate-300">Very low call volume organizations</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 lg:px-8 bg-gradient-to-br from-violet-600 to-purple-600 text-white">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Give Your Reps Their Time Back
          </h2>
          <p className="text-xl md:text-2xl mb-12 text-violet-100">
            More selling. Better data. Faster workflows.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link href="/signup">
              <Button size="lg" className="bg-white text-violet-600 hover:bg-slate-100 shadow-2xl px-8 py-6 text-lg font-semibold rounded-xl">
                Try It Free — No Card Required
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="https://youtu.be/NXpuKIH28Nk" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 px-8 py-6 text-lg font-semibold rounded-xl">
                <Play className="w-5 h-5 mr-2" />
                Watch Demo
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Free trial
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              3 calls included
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              No card required
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              5-minute setup
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Cancel anytime
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 px-4 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">SynQall</span>
              </div>
              <p className="text-slate-400 text-sm">
                Turn sales calls into perfect CRM data in 60 seconds.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/signup" className="hover:text-white transition-colors">Sign Up</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Contact</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="mailto:support@synqall.com" className="hover:text-white transition-colors">support@synqall.com</a></li>
                <li className="text-slate-400">United States</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
                <li><Link href="/security" className="hover:text-white transition-colors">Security</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-sm text-slate-400">
            <p>&copy; 2025 SynQall. All rights reserved.</p>
            <p className="mt-2">SynQall is owned and operated by Nikola Innovations Limited.</p>
          </div>
        </div>
      </footer>

      {/* Sticky CTA - Client Component */}
      <StickyCTA />
    </div>
  );
}