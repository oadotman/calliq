/**
 * Structured Logging Configuration
 * Phase 2.4: Production-ready logging with Pino
 *
 * This replaces console.log throughout the application
 * for better debugging and monitoring in production.
 */

import pino from 'pino';
import { getCurrentRequestId } from '@/lib/middleware/request-tracing';

// Determine log level based on environment
const logLevel = process.env.LOG_LEVEL ||
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// Define custom log levels
const customLevels = {
  fatal: 60,
  error: 50,
  warn: 40,
  info: 30,
  debug: 20,
  trace: 10,
};

// Create base logger configuration
const baseConfig: pino.LoggerOptions = {
  level: logLevel,
  customLevels,
  timestamp: pino.stdTimeFunctions.isoTime,
  messageKey: 'message',
  errorKey: 'error',
  base: {
    env: process.env.NODE_ENV,
    app: 'calliq',
    version: process.env.npm_package_version,
  },
  formatters: {
    level(label: string) {
      return { level: label.toUpperCase() };
    },
    bindings(bindings) {
      return {
        ...bindings,
        hostname: bindings.hostname || 'unknown',
        pid: bindings.pid,
      };
    },
  },
  serializers: {
    error: pino.stdSerializers.err,
    request: (req: any) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      headers: {
        'user-agent': req.headers?.['user-agent'],
        'x-request-id': req.headers?.['x-request-id'],
      },
    }),
    response: (res: any) => ({
      statusCode: res.statusCode,
      headers: {
        'x-request-id': res.headers?.['x-request-id'],
      },
    }),
  },
  hooks: {
    logMethod(inputArgs, method) {
      // Add request ID to every log
      const requestId = getCurrentRequestId();
      if (requestId && inputArgs[0] && typeof inputArgs[0] === 'object') {
        (inputArgs[0] as any).requestId = requestId;
      }
      return method.apply(this, inputArgs);
    },
  },
};

// Development vs Production configuration
const logger = process.env.NODE_ENV === 'production'
  ? pino(baseConfig)
  : pino({
      ...baseConfig,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          translateTime: 'HH:MM:ss.l',
          singleLine: false,
        },
      },
    });

/**
 * Create a child logger with specific context
 */
export function createLogger(context: Record<string, any>) {
  return logger.child(context);
}

/**
 * Logger for API routes
 */
export function createApiLogger(route: string, method: string) {
  return createLogger({
    component: 'api',
    route,
    method,
    requestId: getCurrentRequestId(),
  });
}

/**
 * Logger for background jobs
 */
export function createJobLogger(jobType: string, jobId: string) {
  return createLogger({
    component: 'job',
    jobType,
    jobId,
  });
}

/**
 * Logger for database operations
 */
export function createDbLogger(operation: string) {
  return createLogger({
    component: 'database',
    operation,
    requestId: getCurrentRequestId(),
  });
}

/**
 * Logger for external service calls
 */
export function createServiceLogger(service: string) {
  return createLogger({
    component: 'external',
    service,
    requestId: getCurrentRequestId(),
  });
}

/**
 * Performance logging helper
 */
export class PerformanceLogger {
  private logger: pino.Logger;
  private startTime: number;
  private operation: string;

  constructor(operation: string, context?: Record<string, any>) {
    this.operation = operation;
    this.startTime = Date.now();
    this.logger = createLogger({
      component: 'performance',
      operation,
      ...context,
    });

    this.logger.debug({ message: `Starting ${operation}` });
  }

  end(additionalContext?: Record<string, any>) {
    const duration = Date.now() - this.startTime;
    this.logger.info({
      message: `Completed ${this.operation}`,
      duration,
      ...additionalContext,
    });
    return duration;
  }

  error(error: Error | unknown, additionalContext?: Record<string, any>) {
    const duration = Date.now() - this.startTime;
    this.logger.error({
      message: `Failed ${this.operation}`,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration,
      ...additionalContext,
    });
  }
}

/**
 * Audit logger for security events
 */
export function createAuditLogger() {
  return createLogger({
    component: 'audit',
    level: 'info', // Always log audit events
  });
}

/**
 * Log security events
 */
export function logSecurityEvent(
  eventType: string,
  userId?: string,
  details?: Record<string, any>
) {
  const auditLogger = createAuditLogger();
  auditLogger.info({
    eventType,
    userId,
    timestamp: new Date().toISOString(),
    requestId: getCurrentRequestId(),
    ...details,
  });
}

/**
 * Error logging with context
 */
export function logError(
  error: Error | unknown,
  context: Record<string, any> = {}
) {
  const errorLogger = createLogger({ component: 'error' });

  if (error instanceof Error) {
    errorLogger.error({
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...context,
    });
  } else {
    errorLogger.error({
      message: 'Unknown error',
      error,
      ...context,
    });
  }
}

/**
 * Structured logging for HTTP requests
 */
export function logHttpRequest(
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  userId?: string
) {
  const httpLogger = createLogger({ component: 'http' });

  const logData = {
    method,
    path,
    statusCode,
    duration,
    userId,
    requestId: getCurrentRequestId(),
  };

  if (statusCode >= 500) {
    httpLogger.error(logData);
  } else if (statusCode >= 400) {
    httpLogger.warn(logData);
  } else {
    httpLogger.info(logData);
  }
}

/**
 * Business metrics logging
 */
export function logBusinessMetric(
  metricName: string,
  value: number | string,
  metadata?: Record<string, any>
) {
  const metricsLogger = createLogger({ component: 'metrics' });
  metricsLogger.info({
    metric: metricName,
    value,
    timestamp: Date.now(),
    ...metadata,
  });
}

/**
 * Replace console methods in production
 */
if (process.env.NODE_ENV === 'production') {
  // Override console methods to use structured logging
  console.log = (...args) => logger.info({ message: args.join(' ') });
  console.info = (...args) => logger.info({ message: args.join(' ') });
  console.warn = (...args) => logger.warn({ message: args.join(' ') });
  console.error = (...args) => logger.error({ message: args.join(' ') });
  console.debug = (...args) => logger.debug({ message: args.join(' ') });
}

// Export the main logger instance
export default logger;
export { logger };

// Export helper types
export type Logger = pino.Logger;

/**
 * Usage Examples:
 *
 * // In API routes:
 * const logger = createApiLogger('/api/calls/upload', 'POST');
 * logger.info({ userId, fileSize }, 'File upload started');
 *
 * // Performance tracking:
 * const perf = new PerformanceLogger('database.query', { query: 'SELECT...' });
 * // ... do work ...
 * perf.end({ rowCount: 10 });
 *
 * // Error logging:
 * try {
 *   // ... code ...
 * } catch (error) {
 *   logError(error, { userId, operation: 'payment.process' });
 * }
 *
 * // Security events:
 * logSecurityEvent('login.failed', userId, {
 *   ip: request.ip,
 *   reason: 'invalid_password'
 * });
 *
 * // Business metrics:
 * logBusinessMetric('subscription.created', 1, {
 *   planType: 'team',
 *   userId,
 *   amount: 99
 * });
 */