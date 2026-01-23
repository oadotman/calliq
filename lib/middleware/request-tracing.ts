/**
 * Request Tracing Middleware
 * Phase 1: Adds request tracing for debugging and monitoring
 *
 * This middleware adds X-Request-ID headers to all requests and responses,
 * enabling end-to-end request tracing across the application.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

/**
 * Request context for storing trace information
 */
interface RequestContext {
  requestId: string;
  startTime: number;
  method: string;
  path: string;
  userId?: string;
  organizationId?: string;
}

// Store for active request contexts (in production, use AsyncLocalStorage)
const requestContexts = new Map<string, RequestContext>();

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${randomUUID()}`;
}

/**
 * Extract request ID from headers or generate new one
 */
export function getRequestId(req: NextRequest): string {
  // Check for existing request ID from upstream services
  const existingId = req.headers.get('x-request-id') ||
                     req.headers.get('x-correlation-id') ||
                     req.headers.get('x-trace-id');

  return existingId || generateRequestId();
}

/**
 * Add request tracing to a response
 */
export function addTracingHeaders(
  response: NextResponse,
  requestId: string,
  processingTime?: number
): NextResponse {
  // Add request ID to response headers
  response.headers.set('x-request-id', requestId);

  // Add processing time if available
  if (processingTime !== undefined) {
    response.headers.set('x-processing-time', processingTime.toString());
  }

  // Add timestamp
  response.headers.set('x-response-time', new Date().toISOString());

  return response;
}

/**
 * Request tracing middleware for Next.js middleware.ts
 */
export function withRequestTracing(
  handler: (req: NextRequest, requestId: string) => Promise<NextResponse> | NextResponse
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    const requestId = getRequestId(req);

    // Create request context
    const context: RequestContext = {
      requestId,
      startTime,
      method: req.method,
      path: new URL(req.url).pathname
    };

    // Store context
    requestContexts.set(requestId, context);

    try {
      // Log request start
      console.log(`[${requestId}] ${req.method} ${context.path} - Started`);

      // Call the handler
      const response = await handler(req, requestId);

      // Calculate processing time
      const processingTime = Date.now() - startTime;

      // Add tracing headers
      const tracedResponse = addTracingHeaders(response, requestId, processingTime);

      // Log request completion
      console.log(
        `[${requestId}] ${req.method} ${context.path} - Completed in ${processingTime}ms`
      );

      return tracedResponse;

    } catch (error) {
      const processingTime = Date.now() - startTime;

      // Log error with request ID
      console.error(
        `[${requestId}] ${req.method} ${context.path} - Failed after ${processingTime}ms:`,
        error
      );

      // Create error response with tracing
      const errorResponse = NextResponse.json(
        {
          error: 'Internal server error',
          requestId // Include request ID in error response for debugging
        },
        { status: 500 }
      );

      return addTracingHeaders(errorResponse, requestId, processingTime);

    } finally {
      // Clean up context
      requestContexts.delete(requestId);
    }
  };
}

/**
 * Request tracing for API route handlers
 */
export function withApiTracing<T extends any[], R>(
  handler: (req: NextRequest, requestId: string, ...args: T) => Promise<R>
) {
  return async (req: NextRequest, ...args: T): Promise<R> => {
    const requestId = getRequestId(req);
    const startTime = Date.now();
    const path = new URL(req.url).pathname;

    try {
      // Log API request
      console.log(`[${requestId}] API ${req.method} ${path} - Started`);

      // Add request ID to any supabase or external API calls
      // This would be done through AsyncLocalStorage in production
      (global as any).__currentRequestId = requestId;

      const result = await handler(req, requestId, ...args);

      const processingTime = Date.now() - startTime;
      console.log(`[${requestId}] API ${req.method} ${path} - Completed in ${processingTime}ms`);

      // If result is a NextResponse, add tracing headers
      if (result instanceof NextResponse) {
        return addTracingHeaders(result, requestId, processingTime) as R;
      }

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(
        `[${requestId}] API ${req.method} ${path} - Failed after ${processingTime}ms:`,
        error
      );
      throw error;

    } finally {
      // Clean up global request ID
      delete (global as any).__currentRequestId;
    }
  };
}

/**
 * Get current request ID from context
 * Use this in service functions to maintain trace context
 */
export function getCurrentRequestId(): string | undefined {
  return (global as any).__currentRequestId;
}

/**
 * Create a child span for async operations
 */
export function createSpan(operation: string, parentRequestId?: string): string {
  const requestId = parentRequestId || getCurrentRequestId();
  const spanId = `${requestId}_${operation}_${Date.now()}`;

  console.log(`[${spanId}] Starting ${operation}`);

  return spanId;
}

/**
 * Complete a span
 */
export function completeSpan(spanId: string, operation: string, success: boolean = true): void {
  const status = success ? 'completed' : 'failed';
  console.log(`[${spanId}] ${operation} ${status}`);
}

/**
 * Structured logging with request context
 */
export class TracedLogger {
  private context: Record<string, any>;

  constructor(context: Record<string, any> = {}) {
    this.context = context;
  }

  private getRequestId(): string {
    return this.context.requestId || getCurrentRequestId() || 'no-request-id';
  }

  private formatMessage(level: string, message: string, extra?: Record<string, any>): string {
    const requestId = this.getRequestId();
    const timestamp = new Date().toISOString();
    const contextStr = extra ? ` ${JSON.stringify({ ...this.context, ...extra })}` : '';
    return `[${timestamp}] [${requestId}] [${level}] ${message}${contextStr}`;
  }

  info(message: string, extra?: Record<string, any>): void {
    console.log(this.formatMessage('INFO', message, extra));
  }

  warn(message: string, extra?: Record<string, any>): void {
    console.warn(this.formatMessage('WARN', message, extra));
  }

  error(message: string, error?: Error | unknown, extra?: Record<string, any>): void {
    const errorDetails = error instanceof Error ? {
      error: error.message,
      stack: error.stack
    } : error ? { error } : {};

    console.error(this.formatMessage('ERROR', message, { ...errorDetails, ...extra }));
  }

  debug(message: string, extra?: Record<string, any>): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('DEBUG', message, extra));
    }
  }
}

/**
 * Create a logger instance with request context
 */
export function createTracedLogger(context?: Record<string, any>): TracedLogger {
  return new TracedLogger({
    requestId: getCurrentRequestId(),
    ...context
  });
}

/**
 * Express-style middleware wrapper for backwards compatibility
 */
export function requestTracingMiddleware(
  req: NextRequest,
  res: NextResponse,
  next: () => void
): void {
  const requestId = getRequestId(req);
  (req as any).requestId = requestId;

  // Add to response headers
  res.headers.set('x-request-id', requestId);

  next();
}

export default withRequestTracing;