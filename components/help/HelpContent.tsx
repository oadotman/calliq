"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Rocket, FileText, CreditCard, Wrench, Mail, HelpCircle } from "lucide-react";
import Link from "next/link";

export function HelpContent() {
  const categories = [
    {
      icon: Rocket,
      title: "Getting Started",
      description: "Learn the basics",
      articles: [
        "How to upload your first call",
        "Understanding your CRM templates",
        "Quick start guide",
      ],
    },
    {
      icon: FileText,
      title: "Templates & Formatting",
      description: "Customize your output",
      articles: [
        "Creating custom templates",
        "Editing field mappings",
        "Supported CRM formats",
      ],
    },
    {
      icon: CreditCard,
      title: "Billing & Plans",
      description: "Manage your subscription",
      articles: [
        "Understanding your plan",
        "Upgrading or downgrading",
        "Payment methods",
      ],
    },
    {
      icon: Wrench,
      title: "Troubleshooting",
      description: "Fix common issues",
      articles: [
        "Audio upload problems",
        "Processing errors",
        "Missing data in output",
      ],
    },
  ];

  return (
    <>
      <div className="mb-8">
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for help articles..."
            className="pl-10 h-12"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <Card key={category.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-primary" />
                  {category.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {category.description}
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {category.articles.map((article) => (
                    <li key={article}>
                      <a
                        href="#"
                        className="text-sm hover:text-primary hover:underline"
                      >
                        {article}
                      </a>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-8 bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Mail className="h-5 w-5 text-primary mt-0.5" />
            <div className="space-y-2 flex-1">
              <h3 className="font-semibold">Still need help?</h3>
              <p className="text-sm text-muted-foreground">
                Our support team is here to help you with any questions.
              </p>
              <div className="flex gap-3">
                <Button asChild>
                  <Link href="/contact">Contact Support</Link>
                </Button>
                <Button variant="outline" asChild>
                  <a href="mailto:support@synqall.com">Email Us</a>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}