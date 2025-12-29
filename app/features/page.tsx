import { Metadata } from "next";
import FeaturesPageClient from "./features-client";

export const metadata: Metadata = {
  title: "Features - SynQall",
  description: "Discover all the powerful features of SynQall's AI-powered CRM data automation platform. Transform sales calls into perfect CRM data in under 2 minutes.",
  openGraph: {
    title: "SynQall Features - AI-Powered CRM Data Automation",
    description: "Automatic transcription, multi-party call support, CRM-ready output, GDPR compliance, and more.",
    url: "https://synqall.com/features",
  },
  alternates: {
    canonical: "https://synqall.com/features",
  },
};

export default function FeaturesPage() {
  return <FeaturesPageClient />;
}