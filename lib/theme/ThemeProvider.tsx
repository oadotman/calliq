"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Helper function to get system preference
  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  };

  // Helper function to apply theme to DOM
  const applyThemeToDOM = (theme: 'light' | 'dark') => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    root.setAttribute('data-theme', theme);
  };

  // Initialize from localStorage or system
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      // First try to get saved preference
      try {
        const saved = localStorage.getItem('theme') as Theme | null;
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          return saved;
        }
      } catch (e) {
        console.warn('Failed to read theme preference:', e);
      }

      // If no saved preference, use 'system' as default
      return 'system';
    }
    return 'system';
  });

  // Update DOM and localStorage when theme changes
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);

    if (typeof window !== 'undefined') {
      // Determine actual theme to apply
      const actualTheme = newTheme === 'system' ? getSystemTheme() : newTheme;

      // Update DOM
      applyThemeToDOM(actualTheme);

      // Update localStorage
      try {
        localStorage.setItem('theme', newTheme);
      } catch (e) {
        console.warn('Failed to save theme preference:', e);
      }
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  // Apply theme on mount and when it changes
  useEffect(() => {
    const actualTheme = theme === 'system' ? getSystemTheme() : theme;
    applyThemeToDOM(actualTheme);
  }, [theme]);

  // Sync with system changes or storage events from other tabs
  useEffect(() => {
    // Handle storage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme' && e.newValue) {
        const newTheme = e.newValue as Theme;
        if (newTheme === 'light' || newTheme === 'dark' || newTheme === 'system') {
          setThemeState(newTheme);
          const actualTheme = newTheme === 'system' ? getSystemTheme() : newTheme;
          applyThemeToDOM(actualTheme);
        }
      }
    };

    // Handle system theme changes
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        applyThemeToDOM(e.matches ? 'dark' : 'light');
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Listen for system theme changes
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleSystemThemeChange);
      } else {
        // Fallback for older browsers
        mediaQuery.addListener(handleSystemThemeChange);
      }

      return () => {
        window.removeEventListener('storage', handleStorageChange);
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', handleSystemThemeChange);
        } else {
          mediaQuery.removeListener(handleSystemThemeChange);
        }
      };
    }

    return () => window.removeEventListener('storage', handleStorageChange);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}