"use client";

import { useState } from "react";
import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Zap,
  Mail,
  MessageSquare,
  Clock,
  CheckCircle2,
  Send,
  HelpCircle,
  FileText,
  Users,
  Headphones,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500));

    toast({
      title: "Message sent successfully!",
      description: "We'll get back to you within 24 hours.",
    });

    setFormData({
      name: "",
      email: "",
      company: "",
      subject: "",
      message: "",
    });
    setIsSubmitting(false);
  };

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
              Get in Touch
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-slate-900 dark:text-slate-100 mb-6">
              How Can We <span className="text-violet-600 dark:text-violet-400">Help You?</span>
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Have questions about SynQall? Need help getting started? We're here to help and typically respond within 24 hours.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Options */}
      <section className="py-12 px-4 lg:px-8 bg-white dark:bg-slate-950">
        <div className="container mx-auto max-w-5xl">
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card className="border-2 border-slate-200 dark:border-slate-700 hover:border-violet-200 dark:hover:border-violet-700 transition-colors">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Email Support</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  Get help via email
                </p>
                <a href="mailto:support@synqall.com" className="text-violet-600 dark:text-violet-400 font-medium hover:underline">
                  support@synqall.com
                </a>
              </CardContent>
            </Card>

            <Card className="border-2 border-slate-200 dark:border-slate-700 hover:border-violet-200 dark:hover:border-violet-700 transition-colors">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Response Time</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  We typically respond within
                </p>
                <p className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">24 hours</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-slate-200 dark:border-slate-700 hover:border-violet-200 dark:hover:border-violet-700 transition-colors">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Headphones className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Priority Support</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  For enterprise customers
                </p>
                <p className="text-amber-600 dark:text-amber-400 font-medium">Available on Pro plans</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-20 px-4 lg:px-8 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto max-w-2xl">
          <Card className="border-2 border-violet-200 dark:border-violet-700 shadow-xl">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-2xl">Send Us a Message</CardTitle>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                Fill out the form below and we'll get back to you as soon as possible
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Your Name *</Label>
                    <Input
                      id="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="John Doe"
                      className="border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@company.com"
                      className="border-slate-200 dark:border-slate-700"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="Acme Inc."
                      className="border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject *</Label>
                    <select
                      id="subject"
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    >
                      <option value="">Select a subject</option>
                      <option value="sales">Sales Inquiry</option>
                      <option value="support">Technical Support</option>
                      <option value="billing">Billing Question</option>
                      <option value="partnership">Partnership Opportunity</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Tell us how we can help..."
                    rows={6}
                    className="border-slate-200 dark:border-slate-700"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
                >
                  {isSubmitting ? (
                    "Sending..."
                  ) : (
                    <>
                      Send Message
                      <Send className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
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
              <Card className="border-2 border-slate-200 dark:border-slate-700 hover:border-violet-200 dark:hover:border-violet-700 transition-colors cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900 rounded-lg flex items-center justify-center">
                      <HelpCircle className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">Help Center</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Browse FAQs and guides</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/features">
              <Card className="border-2 border-slate-200 dark:border-slate-700 hover:border-violet-200 dark:hover:border-violet-700 transition-colors cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">Documentation</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Learn about features</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/pricing">
              <Card className="border-2 border-slate-200 dark:border-slate-700 hover:border-violet-200 dark:hover:border-violet-700 transition-colors cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">Sales Team</h3>
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
                  You can be up and running in 5 minutes. Sign up, create your CRM template, and start uploading calls immediately.
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
                  Our support team is happy to help you get started. Just send us a message and we'll guide you through the setup process.
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