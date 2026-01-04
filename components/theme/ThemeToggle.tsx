"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className={cn(
        "flex items-center justify-center p-2 rounded-lg transition-colors",
        "hover:bg-gray-100 dark:hover:bg-slate-800",
        "text-gray-700 dark:text-slate-300",
        className
      )}
      aria-label="Toggle theme"
      title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
    >
      {theme === "light" ? (
        <Moon className="w-5 h-5" />
      ) : (
        <Sun className="w-5 h-5" />
      )}
    </button>
  );
}