// =====================================================
// IMPORTANT: Admin Access Control
// Only adeliyitomiwa@yahoo.com (the system owner) can access admin pages
// All /admin/* routes are restricted to this single email address
// =====================================================

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAllowedOrigins, getBaseUrlOrFallback } from './lib/utils/urls';
import { partnerAuthMiddleware } from './middleware/partner-auth';
import { csrfMiddleware, injectCSRFToken, setCSRFToken } from './lib/security/csrf-simple';
import { bodySizeLimit, getBodySizeLimit } from './middleware/body-size-limit';
import { getRequestId, addTracingHeaders } from './lib/middleware/request-tracing';

export async function middleware(req: NextRequest) {
  // Generate or extract request ID for tracing
  const requestId = getRequestId(req);
  const startTime = Date.now();

  console.log(
    `[${requestId}] Middleware: Processing request for`,
    req.nextUrl.pathname,
    'Method:',
    req.method
  );

  // =====================================================
  // SEARCH BOT DETECTION
  // Skip all cookie operations for search engine bots
  // =====================================================
  const userAgent = req.headers.get('user-agent') || '';
  const isSearchBot =
    /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|whatsapp|applebot/i.test(
      userAgent
    );

  // For search bots, return a clean response without any cookie operations
  if (isSearchBot) {
    console.log('Middleware: Search bot detected, skipping cookie operations', userAgent);
    return NextResponse.next();
  }

  // =====================================================
  // REQUEST BODY SIZE LIMIT CHECK
  // Prevent large request payloads based on route
  // =====================================================
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
    const maxSize = getBodySizeLimit(req.nextUrl.pathname);
    const sizeCheckResult = await bodySizeLimit(req, { maxBodySize: maxSize });
    if (sizeCheckResult) {
      return sizeCheckResult;
    }
  }

  // =====================================================
  // URL REDIRECTS FOR SEO
  // Handle legacy URLs and common routing issues
  // =====================================================
  const pathname = req.nextUrl.pathname;

  // Redirect /signin to /login (301 permanent redirect for SEO)
  if (pathname === '/signin') {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url, 301);
  }

  // =====================================================
  // EARLY CHECK FOR PUBLIC PATHS
  // Check if this is a public path BEFORE any auth operations
  // This prevents unnecessary session checks for public routes
  // =====================================================
  const publicPaths = [
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/',
    '/pricing', // Pricing page should be public
    '/blog', // Blog should be public
    '/partners', // Partner pages are public
    '/api/auth/signup',
    '/api/auth/callback',
    '/api/health',
    '/api/partners/apply', // Public partner application API
    '/api/partners/auth/login', // Public partner login API
    '/api/partners/tracking', // Public partner tracking API
    '/invite', // Invitation pages are public
    '/invite-signup', // Invitation signup pages are public
  ];

  // Check if current path is public
  const isPublicPath = publicPaths.some((path) => {
    if (path === '/') {
      return pathname === '/'; // Exact match for root
    }
    return pathname === path || pathname.startsWith(path + '/');
  });

  // Log invitation paths for debugging
  if (pathname.startsWith('/invite')) {
    console.log('Middleware: Invitation path detected', {
      pathname,
      isPublicPath,
      willSkipAuth: isPublicPath,
    });
  }

  // If it's a public path (except root which needs special handling), skip auth entirely
  // For invite paths, ALWAYS skip auth
  if (pathname.startsWith('/invite')) {
    console.log('Middleware: Invitation path detected, skipping all auth checks', pathname);
    return NextResponse.next();
  }

  // For other public paths (not root)
  if (isPublicPath && pathname !== '/') {
    console.log('Middleware: Public path, skipping authentication', pathname);
    return NextResponse.next();
  }

  // =====================================================
  // ADMIN ROUTES PROTECTION
  // Protect all admin routes - check before partner routes
  // =====================================================

  // =====================================================
  // PARTNER ROUTES HANDLING
  // Handle partner-specific authentication and tracking
  // =====================================================
  if (pathname.startsWith('/partners') || pathname.startsWith('/api/partners')) {
    // Check for partner referral tracking
    const ref = req.nextUrl.searchParams.get('ref');
    if (ref && pathname === '/partners') {
      // Track the partner click (search bots already filtered out above)
      try {
        const { PartnerTracking } = await import('./lib/partners/tracking');
        await PartnerTracking.trackClick(ref, req);
      } catch (error) {
        console.error('Failed to track partner click:', error);
      }
    }

    // Apply partner authentication middleware
    const partnerResponse = await partnerAuthMiddleware(req);
    // Only return the partnerResponse if it's a redirect or error (not a normal 200 OK)
    if (partnerResponse.status !== 200 || partnerResponse.headers.get('Location')) {
      return partnerResponse;
    }
    // If the partner middleware returns 200 OK, continue processing
  }

  // =====================================================
  // CSRF PROTECTION
  // Verify origin for state-changing requests
  // =====================================================
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    // Check for internal processing header FIRST
    const internalProcessingHeader = req.headers.get('x-internal-processing');

    // Skip CSRF checks entirely for internal processing
    if (internalProcessingHeader === 'true') {
      console.log('Middleware: Internal processing request detected, skipping CSRF checks');
      // Continue to next middleware without CSRF validation
    } else {
      const origin = req.headers.get('origin');
      const host = req.headers.get('host');
      const referer = req.headers.get('referer');

      // Webhook endpoints, cron jobs, internal processing, and public endpoints are exempt from CSRF checks
      const webhookPaths = ['/api/webhooks/', '/api/paddle/webhook'];
      const cronPaths = ['/api/cron/'];
      const internalProcessingPaths = ['/process'];
      const publicApiPaths = [
        '/api/partners/apply', // Public partner application
        '/api/auth/signup', // Public signup
        '/api/auth/callback', // Auth callback
      ];
      // These paths need special handling or are called by external services
      const csrfExemptPaths = [
        '/api/upload/', // File upload endpoints
        '/api/calls/import-url', // URL import (external fetch)
        '/api/teams/invite', // Team invitations (may come from email links)
        '/api/teams/accept-invitation', // Accept team invitation
        '/api/referrals/activate', // Referral activation
        '/api/referrals/send-invitation', // Send referral invitations
        '/api/referrals/generate', // Generate referral code
        '/api/invitations/verify', // Verify invitations
        '/api/partners/auth/reset-password', // Partner password reset
        '/api/partners/admin/applications/', // Partner application reviews
      ];

      const isWebhook = webhookPaths.some((path) => req.nextUrl.pathname.startsWith(path));
      const isCron = cronPaths.some((path) => req.nextUrl.pathname.startsWith(path));
      const isInternalProcessing = internalProcessingPaths.some((path) =>
        req.nextUrl.pathname.includes(path)
      );
      const isPublicApi = publicApiPaths.some((path) => req.nextUrl.pathname.startsWith(path));
      const isCsrfExempt = csrfExemptPaths.some((path) => req.nextUrl.pathname.startsWith(path));

      if (!isWebhook && !isCron && !isInternalProcessing && !isPublicApi && !isCsrfExempt) {
        // Get allowed origins - must be exact matches
        const allowedOrigins = getAllowedOrigins();
        const appUrl = new URL(getBaseUrlOrFallback());

        // Check if request comes from allowed origin
        let isValidOrigin = false;

        if (origin) {
          // Strict exact match - no startsWith
          isValidOrigin = allowedOrigins.includes(origin);
        } else if (referer) {
          // Parse referer and check origin
          try {
            const refererUrl = new URL(referer);
            isValidOrigin = allowedOrigins.includes(refererUrl.origin);
          } catch {
            isValidOrigin = false;
          }
        } else {
          // No origin or referer header - reject for API routes
          if (req.nextUrl.pathname.startsWith('/api/')) {
            isValidOrigin = false;
          } else {
            // For page requests (form submissions), allow if host matches
            const expectedHost = appUrl.host;
            isValidOrigin = host === expectedHost;
          }
        }

        if (!isValidOrigin) {
          console.error(
            `🚨 CSRF: Blocked request from origin: ${origin}, referer: ${referer}, host: ${host}`
          );
          console.error(`🚨 CSRF: Allowed origins: ${allowedOrigins.join(', ')}`);

          return NextResponse.json({ error: 'Forbidden - Invalid origin' }, { status: 403 });
        }
      }
    }
  }

  // =====================================================
  // CSRF TOKEN VALIDATION
  // Validate CSRF tokens for state-changing operations
  // =====================================================
  // Skip CSRF token validation for internal processing requests AND public API endpoints
  const isInternalRequest = req.headers.get('x-internal-processing') === 'true';

  // Check if this is an endpoint that should skip CSRF token validation
  const csrfTokenExemptPaths = [
    // Public endpoints
    '/api/partners/apply', // Public partner application
    '/api/auth/signup', // Public signup
    '/api/auth/callback', // Auth callback
    // Email and invitation endpoints (authenticated but need CSRF exemption)
    '/api/teams/invite', // Team invitations
    '/api/teams/accept-invitation', // Accept team invitation
    '/api/referrals/send-invitation', // Send referral invitations
    '/api/referrals/activate', // Referral activation
    '/api/referrals/generate', // Generate referral code
    '/api/invitations/verify', // Verify invitations
    '/api/partners/auth/reset-password', // Partner password reset
    '/api/partners/admin/applications/', // Partner application reviews
    // File operations
    '/api/upload/', // File uploads
    '/api/calls/import-url', // URL imports
  ];
  const isCsrfTokenExempt = csrfTokenExemptPaths.some((path) =>
    req.nextUrl.pathname.startsWith(path)
  );

  if (!isInternalRequest && !isCsrfTokenExempt) {
    const csrfResponse = await csrfMiddleware(req);
    if (csrfResponse) {
      console.log('[Middleware] CSRF validation failed for:', req.nextUrl.pathname);
      return csrfResponse;
    }
  } else {
    console.log('[Middleware] Skipping CSRF token validation for:', req.nextUrl.pathname);
  }

  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  // Add security headers
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Create a Supabase client configured to use cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value,
            ...options,
          });
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          res.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          });
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          res.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Refresh session if expired - required for Server Components
  let session = null;
  let user = null;

  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      // Only redirect to login for critical auth errors
      // Refresh token errors mean the user is truly logged out
      if (error.message?.includes('Refresh Token') || error.code === 'refresh_token_not_found') {
        console.log('Middleware: Invalid refresh token detected, clearing session');
        // Don't log the full error to avoid cluttering logs
        await supabase.auth.signOut();

        // Only redirect to login if we're not already on a public page
        const publicPathsForError = ['/login', '/signup', '/', '/pricing', '/blog', '/partners'];
        const isOnPublicPage = publicPathsForError.some(
          (path) => pathname === path || pathname.startsWith(path + '/')
        );

        if (!isOnPublicPage) {
          // Explicitly clear all auth-related cookies
          const response = NextResponse.redirect(new URL('/login', req.url));
          response.cookies.delete('sb-access-token');
          response.cookies.delete('sb-refresh-token');
          response.cookies.delete('sb-auth-token');
          response.cookies.delete('csrf_token');
          // Add header to clear all site cookies (browser support varies)
          response.headers.set('Clear-Site-Data', '"cookies"');
          return response;
        }
      } else {
        // For other errors, just log them but don't redirect
        // This could be a temporary network issue
        console.error('Middleware: Non-critical session error:', error.message);
        // Try to get the user from the existing cookies
        // The session might still be valid
      }
    }

    // Always try to get session data, even if there was a non-critical error
    session = data?.session || null;
    user = session?.user || null;
  } catch (err) {
    console.error('Middleware: Unexpected error getting session:', err);
  }

  console.log(`[${requestId}] Middleware: Session check`, {
    pathname: req.nextUrl.pathname,
    hasSession: !!session,
    hasUser: !!user,
    userId: user?.id?.substring(0, 8) || 'none',
  });

  // =====================================================
  // ADMIN ROUTES ACCESS CHECK
  // Check admin access for ALL /admin routes
  // =====================================================
  if (pathname.startsWith('/admin')) {
    // Admin routes need authentication first
    if (!user) {
      console.log('Middleware: No user for admin route, redirecting to login');
      const redirectUrl = new URL('/login', req.url);
      redirectUrl.searchParams.set('redirect', req.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Check if user has admin/owner role AND plan allows admin access
    try {
      const { data: userOrg, error: userOrgError } = await supabase
        .from('user_organizations')
        .select(
          `
          role,
          organization:organizations (
            id,
            plan_type
          )
        `
        )
        .eq('user_id', user.id)
        .single();

      console.log('Middleware: Admin check for path', pathname, {
        userId: user.id,
        userOrg,
        userOrgError,
        role: userOrg?.role,
        planType: userOrg?.organization?.[0]?.plan_type,
      });

      if (userOrgError || !userOrg) {
        console.error('Middleware: Failed to fetch user org:', userOrgError);
        const errorUrl = new URL('/dashboard', req.url);
        errorUrl.searchParams.set('error', 'admin_check_failed');
        return NextResponse.redirect(errorUrl);
      }

      // IMPORTANT: Only adeliyitomiwa@yahoo.com (the owner) can access admin pages
      // Check if the user is the owner by email
      const OWNER_EMAIL = 'adeliyitomiwa@yahoo.com';
      const isOwner = user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();

      // Also check role for additional security (they should have owner role)
      const hasOwnerRole = userOrg.role === 'owner';
      const planAllowsAdmin =
        userOrg.organization?.[0]?.plan_type &&
        !['free', 'solo'].includes(userOrg.organization[0].plan_type);

      if (!isOwner) {
        console.log(`Middleware: User ${user.email} is not the owner (${OWNER_EMAIL})`);
        const errorUrl = new URL('/dashboard', req.url);
        errorUrl.searchParams.set('error', 'admin_access_denied');
        errorUrl.searchParams.set('reason', 'Only the system owner can access admin features');
        return NextResponse.redirect(errorUrl);
      }

      if (!hasOwnerRole) {
        console.log(
          `Middleware: Owner email ${user.email} doesn't have owner role: ${userOrg.role}`
        );
        const errorUrl = new URL('/dashboard', req.url);
        errorUrl.searchParams.set('error', 'admin_role_mismatch');
        errorUrl.searchParams.set('reason', 'Please run the admin role fix SQL query');
        return NextResponse.redirect(errorUrl);
      }

      if (!planAllowsAdmin) {
        console.log(
          'Middleware: Plan does not allow admin access, plan:',
          userOrg.organization?.[0]?.plan_type
        );
        const errorUrl = new URL('/dashboard', req.url);
        errorUrl.searchParams.set('error', 'admin_feature_requires_upgrade');
        errorUrl.searchParams.set(
          'reason',
          'Admin features are only available for Team and Enterprise plans'
        );
        return NextResponse.redirect(errorUrl);
      }
    } catch (error) {
      console.error('Middleware: Error checking admin role:', error);
      // On error, redirect to dashboard with error
      const errorUrl = new URL('/dashboard', req.url);
      errorUrl.searchParams.set('error', 'admin_check_failed');
      return NextResponse.redirect(errorUrl);
    }
  }

  // Check if user is authenticated (either via session or user)
  const isAuthenticated = !!(session || user);

  // If user is signed in and on root path, redirect to dashboard
  if (isAuthenticated && req.nextUrl.pathname === '/') {
    console.log('Middleware: User authenticated on root path, redirecting to /dashboard');
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Re-check public paths (we need this because we might have gotten here after auth check)
  // This handles cases where we checked auth for admin routes, etc.
  const publicPathsForRedirect = [
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/pricing', // Pricing page should be public
    '/blog', // Blog should be public
    '/api/auth/signup',
    '/api/auth/callback',
    '/api/health',
    '/api/partners/apply', // Public partner application API
    '/api/partners/auth/login', // Public partner login API
    '/api/partners/tracking', // Public partner tracking API
    '/invite',
    '/invite-signup',
    '/partners', // Public partner pages (landing, apply, login)
  ];

  const isPublicForRedirect = publicPathsForRedirect.some((path) => {
    return pathname === path || pathname.startsWith(path + '/');
  });

  // Allow internal processing calls (from queue worker) to bypass auth
  const isInternalProcessingCall =
    req.headers.get('x-internal-processing') === 'true' &&
    pathname.startsWith('/api/calls/') &&
    pathname.includes('/process');

  if (isInternalProcessingCall) {
    console.log('Middleware: Internal processing call detected, bypassing auth', pathname);
    return res;
  }

  // If user is not signed in and trying to access protected route, redirect to login
  if (!isAuthenticated && !isPublicForRedirect && pathname !== '/') {
    console.log('Middleware: No authentication on protected route, redirecting to /login');
    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('redirect', req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If user is signed in and trying to access auth pages, redirect to dashboard
  const isAuthPage = ['/login', '/signup', '/forgot-password', '/reset-password'].some((path) =>
    req.nextUrl.pathname.startsWith(path)
  );
  if (isAuthenticated && isAuthPage) {
    console.log('Middleware: User authenticated on auth page, redirecting to /dashboard');
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Add tracing headers to the response
  const processingTime = Date.now() - startTime;
  const tracedResponse = addTracingHeaders(res, requestId, processingTime);

  console.log(`[${requestId}] Middleware: Completed in ${processingTime}ms`);
  return tracedResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
