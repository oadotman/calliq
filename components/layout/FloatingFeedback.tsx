'use client';

import { FeedbackModal } from '@/components/modals/FeedbackModal';
import { MessageSquarePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

export function FloatingFeedback() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show the button after a short delay to avoid layout shift
    const timer = setTimeout(() => setIsVisible(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <FeedbackModal
        trigger={
          <button
            className={cn(
              'group flex items-center gap-2 px-4 py-3 rounded-full',
              'bg-gradient-to-r from-purple-600 to-blue-600 text-white',
              'shadow-lg hover:shadow-xl transform transition-all duration-200',
              'hover:scale-105 hover:from-purple-700 hover:to-blue-700',
              'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2'
            )}
            aria-label="Send feedback"
            title="Send feedback (Ctrl+Shift+F)"
          >
            <MessageSquarePlus className="w-5 h-5" />
            <span className="hidden sm:inline font-medium">Feedback</span>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
            </span>
          </button>
        }
      />
    </div>
  );
}
