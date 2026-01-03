"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, X } from "lucide-react";

export function StickyCTA() {
  const [showStickyCta, setShowStickyCta] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setShowStickyCta(scrollY > 600);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!showStickyCta) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-r from-violet-600 to-purple-600 shadow-2xl transform transition-transform duration-300">
      <div className="container mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-white">
          <p className="font-bold text-lg">Try Free (3 Calls Included)</p>
          <p className="text-sm text-violet-100">No card required. Setup in 5 minutes.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/signup">
            <Button size="lg" className="bg-white text-violet-600 hover:bg-slate-100 font-bold shadow-xl">
              Try It Free — No Card Required
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <button
            onClick={() => setShowStickyCta(false)}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            aria-label="Close sticky CTA"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}