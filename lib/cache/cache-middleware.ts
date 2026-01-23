/**
 * Cache Middleware for API Routes
 * Provides automatic caching for GET requests with intelligent invalidation
 */

import { NextRequest, NextResponse } from 'next/server';
import { cacheService, cacheKeys } from './cache-service';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

interface CacheMiddlewareOptions {
  ttl?: number;
  tags?: string[];
  keyGenerator?: (req: NextRequest) => string;
  shouldCache?: (req: NextRequest) => boolean;
  varyBy?: string[]; // Headers to vary cache by
}

/**
 * Cache middleware for API routes
 */
export function withCache(options: CacheMiddlewareOptions = {}) {
  return (handler: (req: NextRequest, params: any) => Promise<NextResponse>) => {
    return async (req: NextRequest, params: any): Promise<NextResponse> => {
      // Only cache GET requests by default
      if (req.method !== 'GET') {
        return handler(req, params);
      }

      // Check if we should cache this request
      if (options.shouldCache && !options.shouldCache(req)) {
        return handler(req, params);
      }

      // Generate cache key
      const cacheKey = options.keyGenerator
        ? options.keyGenerator(req)
        : generateCacheKey(req, options.varyBy);

      try {
        // Try to get from cache
        const cached = await cacheService.get<any>(cacheKey);
        if (cached) {
          logger.debug({ key: cacheKey, url: req.url }, 'Cache hit');

          // Return cached response
          return NextResponse.json(cached.body, {
            status: cached.status || 200,
            headers: {
              ...cached.headers,
              'X-Cache': 'HIT',
              'X-Cache-Key': cacheKey,
            }
          });
        }

        // Cache miss - execute handler
        logger.debug({ key: cacheKey, url: req.url }, 'Cache miss');
        const response = await handler(req, params);

        // Only cache successful responses
        if (response.status >= 200 && response.status < 300) {
          // Clone response to read body
          const clonedResponse = response.clone();
          const body = await clonedResponse.json();

          // Cache the response
          await cacheService.set(
            cacheKey,
            {
              body,
              status: response.status,
              headers: Object.fromEntries(response.headers.entries()),
            },
            {
              ttl: options.ttl,
              tags: options.tags,
            }
          );

          // Add cache headers to original response
          response.headers.set('X-Cache', 'MISS');
          response.headers.set('X-Cache-Key', cacheKey);
        }

        return response;
      } catch (error) {
        logger.error({ error, key: cacheKey }, 'Cache middleware error');
        // On error, just execute the handler without caching
        return handler(req, params);
      }
    };
  };
}

/**
 * Generate cache key from request
 */
function generateCacheKey(req: NextRequest, varyBy?: string[]): string {
  const url = new URL(req.url);
  const parts = [
    req.method,
    url.pathname,
    url.search,
  ];

  // Add headers to vary by
  if (varyBy && varyBy.length > 0) {
    varyBy.forEach(header => {
      const value = req.headers.get(header);
      if (value) {
        parts.push(`${header}:${value}`);
      }
    });
  }

  // Generate hash for consistent key
  const hash = crypto
    .createHash('sha256')
    .update(parts.join('|'))
    .digest('hex')
    .substring(0, 16);

  return `api:${hash}`;
}

/**
 * Invalidate cache after mutations
 */
export async function invalidateCache(tags: string[]): Promise<void> {
  try {
    const promises = tags.map(tag => cacheService.invalidateTag(tag));
    await Promise.all(promises);
    logger.info({ tags }, 'Cache invalidated');
  } catch (error) {
    logger.error({ error, tags }, 'Cache invalidation error');
  }
}

/**
 * Preset cache configurations
 */
export const cachePresets = {
  // Short cache for frequently changing data
  short: {
    ttl: 60, // 1 minute
  },

  // Medium cache for semi-static data
  medium: {
    ttl: 300, // 5 minutes
  },

  // Long cache for static data
  long: {
    ttl: 3600, // 1 hour
  },

  // User-specific cache
  user: (userId: string) => ({
    ttl: 300,
    tags: [`user:${userId}`],
    varyBy: ['authorization'],
  }),

  // Organization-specific cache
  organization: (orgId: string) => ({
    ttl: 300,
    tags: [`org:${orgId}`],
  }),

  // Public cache (no auth required)
  public: {
    ttl: 600,
    varyBy: ['accept-language'],
  },
};