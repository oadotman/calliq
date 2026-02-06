'use client';

import { useAuth } from '@/lib/AuthContext';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { CookieConsent } from './CookieConsent';
import { FloatingFeedback } from './FloatingFeedback';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Track if initial auth check is complete to prevent redirect loops
  const initialAuthCheckComplete = useRef(false);
  const lastPathname = useRef(pathname);

  // Pages that don't require authentication and don't show sidebar
  const publicPages = [
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/invite',
    '/invite-signup',
    '/pricing',
    '/blog',
    '/about',
    '/contact',
    '/features',
    '/terms',
    '/privacy',
    '/security',
    '/gdpr',
    '/cookies',
    '/partners', // Partner landing and public pages
  ];
  const isPublicPage = pathname === '/' || publicPages.some((page) => pathname?.startsWith(page));

  // Pages that show sidebar (all authenticated pages)
  const protectedPages = [
    '/dashboard',
    '/calls',
    '/analytics',
    '/templates',
    '/settings',
    '/help',
    '/referrals',
    '/upgrade',
    '/team',
    '/admin',
    '/overage', // Overage purchase page
  ];
  const isProtectedPage = protectedPages.some((page) => pathname?.startsWith(page));

  // Log for debugging with more detail
  useEffect(() => {
    console.log('🔍 AuthLayout render state:', {
      loading,
      hasUser: !!user,
      userId: user?.id,
      pathname,
      isPublicPage,
      isProtectedPage,
      timestamp: new Date().toISOString(),
    });
  }, [loading, user, pathname, isPublicPage, isProtectedPage]);

  // Handle authentication and redirects
  useEffect(() => {
    const isNavigatingBetweenProtectedPages =
      lastPathname.current &&
      protectedPages.some((page) => lastPathname.current?.startsWith(page)) &&
      isProtectedPage;

    console.log('🔄 AuthLayout redirect check:', {
      pathname,
      loading,
      hasUser: !!user,
      isProtectedPage,
      isPublicPage,
      isNavigatingBetweenProtectedPages,
      initialAuthCheckComplete: initialAuthCheckComplete.current,
    });

    // Update last pathname for next comparison
    lastPathname.current = pathname;

    // CRITICAL FIX: Only make redirect decisions after auth has fully loaded
    // This prevents race conditions when navigating between protected routes
    if (loading && !initialAuthCheckComplete.current) {
      console.log('⏳ Auth still loading, skipping redirect logic');
      return;
    }

    // Mark initial auth check as complete once loading is false
    if (!loading && !initialAuthCheckComplete.current) {
      initialAuthCheckComplete.current = true;
      console.log('✅ Initial auth check complete');
    }

    // Skip redirect logic when navigating between protected pages if user is already authenticated
    if (isNavigatingBetweenProtectedPages && user) {
      console.log(
        '✅ Navigating between protected pages with authenticated user, no redirect needed'
      );
      return;
    }

    // Only redirect if auth state is definitively resolved
    if (!loading || initialAuthCheckComplete.current) {
      // If on a protected page without user, redirect to login
      if (isProtectedPage && !user) {
        console.log('AuthLayout: No user on protected page, redirecting to /login');
        router.replace('/login');
      }
      // If user is logged in and on login/signup pages, redirect to dashboard
      else if (user && (pathname === '/login' || pathname === '/signup')) {
        console.log('AuthLayout: User logged in on auth page, redirecting to /dashboard');
        router.replace('/dashboard');
      }
    }
  }, [user, loading, isProtectedPage, router, pathname, protectedPages]);

  // For public pages, render without sidebar
  if (isPublicPage) {
    return (
      <>
        <div className="flex flex-col min-h-screen">
          <main className="flex-1">{children}</main>
          {/* Don't show Footer on landing page as it has its own footer */}
          {pathname !== '/' && <Footer />}
        </div>
        <CookieConsent />
      </>
    );
  }

  // For protected pages, show loading only during initial auth check
  // If user exists and we're on a protected page, show the page immediately
  if (loading && !initialAuthCheckComplete.current && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // For protected pages with authenticated user, ALWAYS show sidebar
  if (user && isProtectedPage) {
    console.log('🎯 Rendering protected page with sidebar for user:', user.id);
    return (
      <>
        <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
          <Sidebar />
          <div className="flex-1 lg:ml-56 transition-all duration-300 ease-out flex flex-col">
            <main className="flex-1">{children}</main>
          </div>
        </div>
        <FloatingFeedback />
        <CookieConsent />
      </>
    );
  }

  // For authenticated users on any other page (fallback to show sidebar)
  if (user && !isPublicPage) {
    console.log('🔄 Fallback: Rendering with sidebar for authenticated user on:', pathname);
    return (
      <>
        <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
          <Sidebar />
          <div className="flex-1 lg:ml-56 transition-all duration-300 ease-out flex flex-col">
            <main className="flex-1">{children}</main>
          </div>
        </div>
        <FloatingFeedback />
        <CookieConsent />
      </>
    );
  }

  // For unauthenticated users or edge cases
  console.log('⚠️ Rendering without sidebar - user:', !!user, 'pathname:', pathname);
  return (
    <>
      <div className="flex flex-col min-h-screen">
        <main className="flex-1">{children}</main>
      </div>
      <CookieConsent />
    </>
  );
}
