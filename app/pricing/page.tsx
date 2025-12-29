import { Metadata } from "next";
import PricingPageClient from "./pricing-client";

export const metadata: Metadata = {
  title: "Pricing - SynQall",
  description: "Simple, transparent pricing for AI-powered CRM data automation. Start free with 3 calls. Scale as you grow.",
  openGraph: {
    title: "SynQall Pricing - Transform Sales Calls into CRM Data",
    description: "Start free with 3 calls. No credit card required. Scale as you grow with flexible pricing plans.",
    url: "https://synqall.com/pricing",
  },
  alternates: {
    canonical: "https://synqall.com/pricing",
  },
};

export default function PricingPage() {
  return <PricingPageClient />;
}