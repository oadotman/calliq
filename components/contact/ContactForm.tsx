"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Send } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export function ContactForm() {
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
  );
}