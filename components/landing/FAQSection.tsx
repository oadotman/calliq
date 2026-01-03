"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";

const faqs = [
  {
    q: "Why not just use Gong/Chorus?",
    a: "They're full coaching platforms. Great for large teams, but heavy to implement. SynQall is the fastest path to accurate CRM data.",
  },
  {
    q: "Why not use ChatGPT?",
    a: "You'll spend 8–10 minutes formatting fields. SynQall formats for you automatically with 1-time setup.",
  },
  {
    q: "How accurate is it?",
    a: "High accuracy for clear audio—much better than rushed manual notes. The accuracy improves when you add your own notes.",
  },
  {
    q: "Is copy-paste really better than API integration?",
    a: "If you want speed, flexibility, and no IT involvement—yes. You can be live in 5 minutes with any CRM, including custom ones.",
  },
  {
    q: "Is my data secure?",
    a: "Encrypted in transit and at rest, auto-delete options, no training on your data, and enterprise agreements available.",
  },
  {
    q: "Can I include my own notes?",
    a: "Yes. After the transcript is generated, you can optionally paste any typed notes you took during or after the call. SynQall uses both sources together to improve extraction accuracy. This step is 100% optional.",
  },
];

export function FAQSection() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <section id="faq" className="py-20 px-4 lg:px-8 bg-white dark:bg-slate-950">
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Frequently Asked Questions
          </h2>
        </div>
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <Card
              key={idx}
              className="border-2 border-slate-200 dark:border-slate-700 cursor-pointer hover:border-violet-300 dark:hover:border-violet-600 transition-colors"
              onClick={() => toggleFaq(idx)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-lg">{faq.q}</h3>
                  {openFaq === idx ? (
                    <ChevronUp className="w-5 h-5 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                  )}
                </div>
                {openFaq === idx && (
                  <p className="mt-4 text-slate-600 dark:text-slate-400 leading-relaxed">{faq.a}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}