/**
 * Compression Middleware
 * Compresses API responses to reduce bandwidth usage
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * Compression configuration
 */
export const compressionConfig = {
  // Minimum size in bytes before compression (1KB)
  threshold: 1024,

  // MIME types to compress
  compressibleTypes: [
    'application/json',
    'application/javascript',
    'application/xml',
    'text/css',
    'text/html',
    'text/javascript',
    'text/plain',
    'text/xml',
  ],

  // Compression level (1-9, higher = better compression but slower)
  level: 6,
};

/**
 * Check if content should be compressed
 */
function shouldCompress(
  contentType: string | null,
  contentLength: number
): boolean {
  // Don't compress if no content type
  if (!contentType) return false;

  // Don't compress if too small
  if (contentLength < compressionConfig.threshold) return false;

  // Check if content type is compressible
  const type = contentType.split(';')[0].toLowerCase();
  return compressionConfig.compressibleTypes.some(t => type.includes(t));
}

/**
 * Get accepted encodings from request
 */
function getAcceptedEncodings(request: NextRequest): Set<string> {
  const acceptEncoding = request.headers.get('accept-encoding') || '';
  return new Set(
    acceptEncoding
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

/**
 * Compression middleware for Next.js
 * Note: Next.js automatically handles compression in production,
 * but this provides more control and works in development
 */
export function withCompression(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const response = await handler(req);

    // Skip if already compressed
    if (response.headers.get('content-encoding')) {
      return response;
    }

    // Get accepted encodings
    const acceptedEncodings = getAcceptedEncodings(req);

    // Check if client accepts compression
    if (!acceptedEncodings.has('gzip') && !acceptedEncodings.has('br')) {
      return response;
    }

    // Get content type and length
    const contentType = response.headers.get('content-type');
    const contentLength = parseInt(
      response.headers.get('content-length') || '0',
      10
    );

    // Check if we should compress
    if (!shouldCompress(contentType, contentLength)) {
      return response;
    }

    try {
      // Clone response to read body
      const clonedResponse = response.clone();
      const body = await clonedResponse.text();

      // Import compression library dynamically
      const zlib = await import('zlib');
      const { promisify } = await import('util');

      // Choose compression method
      let compressed: Buffer;
      let encoding: string;

      if (acceptedEncodings.has('br') && zlib.brotliCompress) {
        // Use Brotli if available and supported
        const brotliCompress = promisify(zlib.brotliCompress);
        compressed = await brotliCompress(body, {
          params: {
            [zlib.constants.BROTLI_PARAM_QUALITY]: compressionConfig.level,
          },
        });
        encoding = 'br';
      } else if (acceptedEncodings.has('gzip')) {
        // Fall back to gzip
        const gzip = promisify(zlib.gzip);
        compressed = await gzip(body, {
          level: compressionConfig.level,
        });
        encoding = 'gzip';
      } else {
        return response;
      }

      // Calculate compression ratio
      const originalSize = Buffer.byteLength(body);
      const compressedSize = compressed.length;
      const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

      // Log compression stats
      logger.debug({
        encoding,
        originalSize,
        compressedSize,
        ratio: `${ratio}%`,
        path: req.nextUrl.pathname,
      }, 'Response compressed');

      // Create new response with compressed body
      const compressedResponse = new NextResponse(compressed as any, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });

      // Update headers
      compressedResponse.headers.set('content-encoding', encoding);
      compressedResponse.headers.set('content-length', compressedSize.toString());
      compressedResponse.headers.set('vary', 'accept-encoding');
      compressedResponse.headers.set('x-compression-ratio', ratio);

      return compressedResponse;
    } catch (error) {
      logger.error({ error }, 'Compression error');
      // Return original response on error
      return response;
    }
  };
}

/**
 * Next.js configuration for compression
 * Add this to next.config.js
 */
export const nextConfigCompression = {
  compress: true,

  // Custom compression configuration
  experimental: {
    // Enable gzip compression for static files
    gzipSize: true,
  },

  // Headers for static assets
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'vary',
            value: 'accept-encoding',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'vary',
            value: 'accept-encoding',
          },
        ],
      },
    ];
  },
};

/**
 * Compression stats tracker
 */
export class CompressionStats {
  private static stats = {
    totalRequests: 0,
    compressedRequests: 0,
    totalOriginalSize: 0,
    totalCompressedSize: 0,
  };

  static recordCompression(originalSize: number, compressedSize: number) {
    this.stats.totalRequests++;
    this.stats.compressedRequests++;
    this.stats.totalOriginalSize += originalSize;
    this.stats.totalCompressedSize += compressedSize;
  }

  static recordUncompressed() {
    this.stats.totalRequests++;
  }

  static getStats() {
    const ratio = this.stats.totalOriginalSize > 0
      ? ((1 - this.stats.totalCompressedSize / this.stats.totalOriginalSize) * 100).toFixed(1)
      : '0';

    return {
      ...this.stats,
      compressionRatio: `${ratio}%`,
      averageOriginalSize: this.stats.compressedRequests > 0
        ? Math.round(this.stats.totalOriginalSize / this.stats.compressedRequests)
        : 0,
      averageCompressedSize: this.stats.compressedRequests > 0
        ? Math.round(this.stats.totalCompressedSize / this.stats.compressedRequests)
        : 0,
    };
  }

  static reset() {
    this.stats = {
      totalRequests: 0,
      compressedRequests: 0,
      totalOriginalSize: 0,
      totalCompressedSize: 0,
    };
  }
}