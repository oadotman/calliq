// =====================================================
// RATE LIMITING MIDDLEWARE
// Simple in-memory rate limiting for API endpoints
// =====================================================

import { NextRequest, NextResponse } from 'next/server';

// In-memory store for rate limiting
// In production, use Redis or a similar solution
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
}

// Default rate limits for different endpoints
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Auth endpoints - stricter limits
  '/api/auth/login': { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 attempts per 15 minutes
  '/api/auth/signup': { windowMs: 60 * 60 * 1000, maxRequests: 3 }, // 3 signups per hour
  '/api/auth/reset-password': { windowMs: 60 * 60 * 1000, maxRequests: 3 }, // 3 resets per hour

  // File upload endpoints
  '/api/calls/upload': { windowMs: 60 * 1000, maxRequests: 10 }, // 10 uploads per minute

  // General API endpoints
  '/api/feedback': { windowMs: 60 * 60 * 1000, maxRequests: 10 }, // 10 feedback submissions per hour
  '/api/preferences': { windowMs: 60 * 1000, maxRequests: 30 }, // 30 updates per minute

  // Default for all other API endpoints
  default: { windowMs: 60 * 1000, maxRequests: 60 }, // 60 requests per minute
};

/**
 * Get client identifier from request
 * Uses IP address and user agent for identification
 */
function getClientId(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  // Create a simple hash of IP + User Agent
  const identifier = `${ip}-${userAgent}`;
  return Buffer.from(identifier).toString('base64').substring(0, 32);
}

/**
 * Clean up expired entries from the store
 * Should be called periodically to prevent memory leaks
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}

// Clean up every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

/**
 * Rate limiting middleware function
 */
export async function rateLimit(
  request: NextRequest,
  config?: RateLimitConfig
): Promise<NextResponse | null> {
  // Skip rate limiting in development
  if (process.env.NODE_ENV === 'development') {
    return null;
  }

  const pathname = request.nextUrl.pathname;

  // Get rate limit config for this endpoint
  const limitConfig = config || RATE_LIMITS[pathname] || RATE_LIMITS.default;

  // Get client identifier
  const clientId = getClientId(request);
  const key = `${clientId}:${pathname}`;

  const now = Date.now();
  const windowStart = now - limitConfig.windowMs;

  // Get or create rate limit entry
  let entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime < now) {
    // Create new entry
    entry = {
      count: 1,
      resetTime: now + limitConfig.windowMs,
    };
    rateLimitStore.set(key, entry);
    return null; // Allow request
  }

  // Increment count
  entry.count++;

  // Check if limit exceeded
  if (entry.count > limitConfig.maxRequests) {
    // Calculate retry time
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

    return NextResponse.json(
      {
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': limitConfig.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
        },
      }
    );
  }

  // Update entry
  rateLimitStore.set(key, entry);

  // Allow request and add rate limit headers
  return null;
}

/**
 * Express-style middleware wrapper for rate limiting
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config?: RateLimitConfig
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const rateLimitResponse = await rateLimit(request, config);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    return handler(request);
  };
}
