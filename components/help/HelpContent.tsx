"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Rocket, FileText, CreditCard, Wrench, Mail, HelpCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { helpArticles, searchArticles } from "@/lib/help-articles";

// Simple markdown to HTML converter for basic formatting
function formatMarkdown(markdown: string): string {
  return markdown
    .replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold mt-6 mb-3">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-8 mb-4">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mb-6">$1</h1>')
    .replace(/^\* (.*$)/gim, '<li class="ml-4">$1</li>')
    .replace(/^- (.*$)/gim, '<li class="ml-4">$1</li>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline">$1</a>')
    .replace(/^(\d+)\. (.*$)/gim, '<li class="ml-4" style="list-style-type: decimal;">$2</li>')
    .replace(/\n\n/g, '</p><p class="mb-4">')
    .replace(/^<li/gm, '<ul class="list-disc mb-4"><li')
    .replace(/<\/li>\n(?!<li)/g, '</li></ul>')
    .replace(/^#### (.*$)/gim, '<h4 class="font-semibold mt-4 mb-2">$1</h4>')
    .replace(/✅/g, '✓')
    .replace(/❌/g, '✗')
    .replace(/^<p class="mb-4">/, '<p class="mb-4">')
    .replace(/$/, '</p>')
    .replace(/<\/p><\/p>/g, '</p>');
}

export function HelpContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);

  const categories = [
    {
      icon: Rocket,
      title: "Getting Started",
      description: "Learn the basics",
      articles: [
        { title: "How to upload your first call", slug: "upload-first-call" },
        { title: "Understanding your CRM templates", slug: "understanding-templates" },
        { title: "Quick start guide", slug: "quick-start" },
      ],
    },
    {
      icon: FileText,
      title: "Templates & Formatting",
      description: "Customize your output",
      articles: [
        { title: "Creating custom templates", slug: "creating-templates" },
        { title: "Editing field mappings", slug: "editing-mappings" },
        { title: "Supported CRM formats", slug: "crm-formats" },
      ],
    },
    {
      icon: CreditCard,
      title: "Billing & Plans",
      description: "Manage your subscription",
      articles: [
        { title: "Understanding your plan", slug: "understanding-plan" },
        { title: "Upgrading or downgrading", slug: "upgrading-downgrading" },
        { title: "Payment methods", slug: "payment-methods" },
      ],
    },
    {
      icon: Wrench,
      title: "Troubleshooting",
      description: "Fix common issues",
      articles: [
        { title: "Audio upload problems", slug: "audio-upload-problems" },
        { title: "Processing errors", slug: "processing-errors" },
        { title: "Missing data in output", slug: "missing-data" },
      ],
    },
  ];

  const searchResults = searchQuery ? searchArticles(searchQuery) : [];
  const currentArticle = helpArticles.find(a => a.slug === selectedArticle);

  // Render article view if one is selected
  if (currentArticle) {
    return (
      <div className="max-w-4xl mx-auto">
        <Button
          onClick={() => setSelectedArticle(null)}
          variant="ghost"
          className="mb-6"
        >
          ← Back to Help Center
        </Button>
        <article className="prose prose-slate dark:prose-invert max-w-none">
          <div dangerouslySetInnerHTML={{ __html: formatMarkdown(currentArticle.content) }} />
        </article>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for help articles..."
            className="pl-10 h-12"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Search Results */}
        {searchQuery && searchResults.length > 0 && (
          <div className="mt-4 max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Search Results</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {searchResults.map((article) => (
                    <li key={article.id}>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedArticle(article.slug);
                        }}
                        className="text-sm hover:text-primary hover:underline text-left w-full text-start"
                      >
                        {article.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
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
                    <li key={article.slug}>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedArticle(article.slug);
                        }}
                        className="text-sm hover:text-primary hover:underline text-left w-full text-start"
                      >
                        {article.title}
                      </button>
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