import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware to enforce request body size limits
 * Default max size: 500MB for file uploads, 10MB for regular requests
 */
export async function bodySizeLimit(
  req: NextRequest,
  options: {
    maxFileSize?: number;
    maxBodySize?: number;
  } = {}
) {
  const maxFileSize = options.maxFileSize || 500 * 1024 * 1024; // 500MB default for files
  const maxBodySize = options.maxBodySize || 10 * 1024 * 1024;  // 10MB default for regular requests

  const contentLength = req.headers.get('content-length');
  const contentType = req.headers.get('content-type') || '';

  if (!contentLength) {
    // If no content-length header, we can't validate size
    // Most modern browsers send this header
    return null;
  }

  const size = parseInt(contentLength, 10);

  // Check if this is a file upload
  const isFileUpload =
    contentType.includes('multipart/form-data') ||
    req.url.includes('/upload') ||
    req.url.includes('/import');

  const maxSize = isFileUpload ? maxFileSize : maxBodySize;

  if (size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return NextResponse.json(
      {
        error: `Request body too large. Maximum allowed size is ${maxSizeMB}MB`,
        details: {
          receivedSize: size,
          maxAllowedSize: maxSize,
          isFileUpload
        }
      },
      { status: 413 } // 413 Payload Too Large
    );
  }

  return null;
}

/**
 * Helper function to format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Configuration for different route patterns
 */
export const BODY_SIZE_LIMITS = {
  // File upload routes - 500MB
  '/api/calls/upload': 500 * 1024 * 1024,
  '/api/calls/import-url': 500 * 1024 * 1024,
  '/api/upload': 500 * 1024 * 1024,

  // Transcription routes - 100MB
  '/api/calls/[id]/transcribe': 100 * 1024 * 1024,
  '/api/calls/[id]/trim': 100 * 1024 * 1024,

  // Regular API routes - 10MB
  '/api/teams': 10 * 1024 * 1024,
  '/api/partners': 10 * 1024 * 1024,
  '/api/webhooks': 10 * 1024 * 1024,

  // Small data routes - 1MB
  '/api/auth': 1024 * 1024,
  '/api/settings': 1024 * 1024,

  // Default for unspecified routes - 10MB
  default: 10 * 1024 * 1024
};

/**
 * Get the appropriate body size limit for a given path
 */
export function getBodySizeLimit(pathname: string): number {
  // Check exact matches first
  if (BODY_SIZE_LIMITS[pathname as keyof typeof BODY_SIZE_LIMITS]) {
    return BODY_SIZE_LIMITS[pathname as keyof typeof BODY_SIZE_LIMITS] as number;
  }

  // Check pattern matches
  for (const [pattern, limit] of Object.entries(BODY_SIZE_LIMITS)) {
    if (pattern.includes('[') && pathname.match(new RegExp(pattern.replace(/\[.*?\]/g, '[^/]+')))) {
      return limit as number;
    }
    if (pathname.startsWith(pattern)) {
      return limit as number;
    }
  }

  return BODY_SIZE_LIMITS.default;
}