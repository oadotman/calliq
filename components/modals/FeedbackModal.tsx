'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { MessageSquarePlus, Bug, Lightbulb, Heart, Send, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { fetchWithCSRF } from '@/lib/client/csrf';

interface FeedbackModalProps {
  trigger?: React.ReactNode;
}

export function FeedbackModal({ trigger }: FeedbackModalProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'bug' | 'feedback' | 'feature'>('feedback');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Add keyboard shortcut (Ctrl/Cmd + Shift + F)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject || !message) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetchWithCSRF('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          subject,
          message,
          userEmail: user?.email,
          userId: user?.id,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send feedback');
      }

      toast({
        title: 'Feedback sent!',
        description: "Thank you for your feedback. We'll review it soon.",
      });

      // Reset form
      setSubject('');
      setMessage('');
      setType('feedback');
      setOpen(false);
    } catch (error) {
      console.error('Error sending feedback:', error);
      toast({
        title: 'Error',
        description: 'Failed to send feedback. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeIcon = () => {
    switch (type) {
      case 'bug':
        return <Bug className="w-4 h-4" />;
      case 'feature':
        return <Lightbulb className="w-4 h-4" />;
      default:
        return <Heart className="w-4 h-4" />;
    }
  };

  const getTypeColor = () => {
    switch (type) {
      case 'bug':
        return 'text-red-600';
      case 'feature':
        return 'text-blue-600';
      default:
        return 'text-purple-600';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" className="w-full justify-start">
            <MessageSquarePlus className="w-4 h-4 mr-2" />
            Send Feedback
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5 text-purple-600" />
            Send Feedback
            <span className="text-xs text-gray-500 font-normal ml-auto">Ctrl+Shift+F</span>
          </DialogTitle>
          <DialogDescription>
            Help us improve SynQall by sharing your feedback, reporting bugs, or requesting
            features.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select value={type} onValueChange={(value: any) => setType(value)}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bug">
                  <div className="flex items-center gap-2">
                    <Bug className="w-4 h-4 text-red-600" />
                    <span>Bug Report</span>
                  </div>
                </SelectItem>
                <SelectItem value="feedback">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-purple-600" />
                    <span>General Feedback</span>
                  </div>
                </SelectItem>
                <SelectItem value="feature">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-blue-600" />
                    <span>Feature Request</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <div className="relative">
              <div className={`absolute left-3 top-3 ${getTypeColor()}`}>{getTypeIcon()}</div>
              <Input
                id="subject"
                placeholder={
                  type === 'bug'
                    ? 'Brief description of the issue'
                    : type === 'feature'
                      ? 'What feature would you like?'
                      : "What's on your mind?"
                }
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">{type === 'bug' ? 'Steps to reproduce' : 'Details'}</Label>
            <Textarea
              id="message"
              placeholder={
                type === 'bug'
                  ? 'Please describe the steps to reproduce the bug...'
                  : type === 'feature'
                    ? 'Please describe the feature in detail...'
                    : 'Share your thoughts...'
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              required
            />
          </div>

          {type === 'bug' && (
            <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg text-sm text-red-700 dark:text-red-400">
              <p className="font-medium mb-1">Helpful information:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>What were you trying to do?</li>
                <li>What happened instead?</li>
                <li>Can you reproduce it consistently?</li>
              </ul>
            </div>
          )}

          {user?.email && (
            <div className="text-sm text-gray-500">
              Response will be sent to: <span className="font-medium">{user.email}</span>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Feedback
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
