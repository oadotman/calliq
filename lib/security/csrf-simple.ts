import { cookies } from 'next/headers';

const CSRF_TOKEN_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generate a secure CSRF token using Web Crypto API
 */
export function generateCSRFToken(): string {
  // Use Web Crypto API which is available in both browser and Node.js runtime
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Set CSRF token in cookies and return it
 */
export async function setCSRFToken(): Promise<string> {
  const token = generateCSRFToken();
  const cookieStore = await cookies();

  cookieStore.set(CSRF_TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return token;
}

/**
 * Get CSRF token from cookies
 */
export async function getCSRFToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CSRF_TOKEN_NAME);
  return token?.value || null;
}

/**
 * Validate CSRF token from request
 * Implements Double-Submit Cookie pattern
 */
export async function validateCSRFToken(request: Request): Promise<boolean> {
  // Skip validation for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return true;
  }

  // Get token from cookie
  const cookieToken = await getCSRFToken();
  if (!cookieToken) {
    console.warn('[CSRF] No CSRF token in cookies');
    return false;
  }

  // Get token from header or body
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  let bodyToken: string | null = null;

  // Try to get token from body if it's JSON
  if (request.headers.get('content-type')?.includes('application/json')) {
    try {
      const body = await request.clone().json();
      bodyToken = body.csrf_token || body.csrfToken || null;
    } catch {
      // Body parsing failed, continue with header check
    }
  }

  const requestToken = headerToken || bodyToken;

  if (!requestToken) {
    console.warn('[CSRF] No CSRF token in request');
    return false;
  }

  // Simple string comparison (timing attacks are less of a concern for CSRF tokens)
  const valid = cookieToken === requestToken;

  if (!valid) {
    console.warn('[CSRF] Token mismatch');
  }

  return valid;
}

/**
 * Middleware to check CSRF tokens
 */
export async function csrfMiddleware(request: Request): Promise<Response | null> {
  // Skip for public paths and API keys
  const url = new URL(request.url);
  const isPublicPath =
    url.pathname === '/login' ||
    url.pathname === '/signup' ||
    url.pathname.startsWith('/api/webhooks/') ||
    url.pathname.startsWith('/api/cron/') ||
    url.pathname.startsWith('/api/public/') ||
    url.pathname.startsWith('/api/health');

  if (isPublicPath) {
    return null;
  }

  // Skip if API key is present (for programmatic access)
  const apiKey = request.headers.get('x-api-key');
  if (apiKey) {
    return null;
  }

  // Validate CSRF token for state-changing operations
  const valid = await validateCSRFToken(request);
  if (!valid && !['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return new Response(
      JSON.stringify({ error: 'Invalid or missing CSRF token' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  return null;
}

/**
 * Generate and inject CSRF token into response
 */
export async function injectCSRFToken(response: Response): Promise<Response> {
  const token = await setCSRFToken();

  // Add token to response headers for client to read
  const newHeaders = new Headers(response.headers);
  newHeaders.set('X-CSRF-Token', token);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}