import { Metadata } from 'next';
import { HelpCircle } from "lucide-react";
import { HelpContent } from '@/components/help/HelpContent';

export const metadata: Metadata = {
  title: 'Help Center | SynQall',
  description: 'Get help with SynQall. Find guides on uploading calls, creating templates, managing billing, and troubleshooting common issues.',
  keywords: [
    'help center',
    'support',
    'documentation',
    'user guide',
    'FAQ',
    'troubleshooting',
    'SynQall help'
  ],
  alternates: {
    canonical: 'https://synqall.com/help',
  },
  openGraph: {
    title: 'Help Center - SynQall',
    description: 'Find answers to your questions about using SynQall',
    url: 'https://synqall.com/help',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <HelpCircle className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-4">How can we help?</h1>
          <p className="text-muted-foreground text-lg">
            Find answers to common questions and learn how to get the most out of SynQall
          </p>
        </div>

        <HelpContent />
      </div>
    </div>
  );
}