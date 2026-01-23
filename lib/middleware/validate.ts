/**
 * Validation Middleware
 * Phase 1: Centralized input validation using Zod schemas
 *
 * This middleware provides centralized validation for API routes,
 * ensuring all input data is properly validated and sanitized.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError, ZodSchema } from 'zod';
import {
  EmailSchema,
  PasswordSchema,
  UUIDSchema,
  PhoneSchema,
  FileUploadSchema,
  TeamInviteSchema
} from '@/lib/security/validators';

/**
 * Standard error response format
 */
interface ValidationErrorResponse {
  error: string;
  details: {
    field?: string;
    message: string;
    code?: string;
  }[];
}

/**
 * Format Zod errors into user-friendly messages
 */
function formatZodError(error: ZodError): ValidationErrorResponse {
  return {
    error: 'Validation failed',
    details: error.issues.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }))
  };
}

/**
 * Validation middleware factory
 * Creates a validation middleware for a specific schema
 */
export function validate<T extends ZodSchema>(
  schema: T,
  target: 'body' | 'query' | 'params' = 'body'
) {
  return async function validationMiddleware(
    req: NextRequest,
    handler: (req: NextRequest, validatedData: z.infer<T>) => Promise<NextResponse>
  ): Promise<NextResponse> {
    try {
      let dataToValidate: any;

      // Extract data based on target
      switch (target) {
        case 'body':
          try {
            dataToValidate = await req.json();
          } catch (e) {
            return NextResponse.json(
              { error: 'Invalid JSON in request body' },
              { status: 400 }
            );
          }
          break;

        case 'query':
          const searchParams = new URL(req.url).searchParams;
          dataToValidate = Object.fromEntries(searchParams.entries());
          break;

        case 'params':
          // For params, they need to be passed from the route handler
          // This is handled differently in Next.js App Router
          throw new Error('Params validation must be handled in route handler');

        default:
          throw new Error(`Invalid validation target: ${target}`);
      }

      // Validate the data
      const validatedData = await schema.parseAsync(dataToValidate);

      // Call the handler with validated data
      return await handler(req, validatedData);

    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          formatZodError(error),
          { status: 400 }
        );
      }

      // Log unexpected errors
      console.error('Validation middleware error:', error);

      return NextResponse.json(
        { error: 'Internal validation error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Wrapper for route handlers with validation
 * Use this to wrap your route handlers with validation
 */
export function withValidation<T extends ZodSchema>(
  schema: T,
  handler: (req: NextRequest, data: z.infer<T>) => Promise<NextResponse>,
  options: { target?: 'body' | 'query' | 'params' } = {}
) {
  const { target = 'body' } = options;

  return async (req: NextRequest, context?: any) => {
    try {
      let dataToValidate: any;

      switch (target) {
        case 'body':
          try {
            const text = await req.text();
            if (!text) {
              dataToValidate = {};
            } else {
              dataToValidate = JSON.parse(text);
            }
          } catch (e) {
            return NextResponse.json(
              {
                error: 'Invalid request body',
                details: [{ message: 'Request body must be valid JSON' }]
              },
              { status: 400 }
            );
          }
          break;

        case 'query':
          const searchParams = new URL(req.url).searchParams;
          dataToValidate = Object.fromEntries(searchParams.entries());

          // Convert query string arrays if needed
          for (const [key, value] of Object.entries(dataToValidate)) {
            if (key.endsWith('[]')) {
              const cleanKey = key.slice(0, -2);
              dataToValidate[cleanKey] = searchParams.getAll(key);
              delete dataToValidate[key];
            }
          }
          break;

        case 'params':
          // Use context.params if available (App Router)
          dataToValidate = context?.params || {};
          break;
      }

      // Validate the data
      const validatedData = await schema.parseAsync(dataToValidate);

      // Call the handler with validated data
      // Pass through context for params access
      return await handler(req, validatedData);

    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          formatZodError(error),
          { status: 400 }
        );
      }

      console.error('Validation error:', error);
      return NextResponse.json(
        { error: 'Validation failed' },
        { status: 500 }
      );
    }
  };
}

/**
 * Common validation schemas for API routes
 */
export const CommonSchemas = {
  // Authentication
  login: z.object({
    email: EmailSchema,
    password: PasswordSchema,
    rememberMe: z.boolean().optional()
  }),

  register: z.object({
    email: EmailSchema,
    password: PasswordSchema,
    fullName: z.string().min(2).max(100),
    acceptTerms: z.boolean().refine(val => val === true, {
      message: 'You must accept the terms and conditions'
    })
  }),

  // Call operations
  callUpload: z.object({
    customerName: z.string().optional(),
    customerEmail: z.string().email().optional(),
    customerPhone: PhoneSchema.optional(),
    customerCompany: z.string().optional(),
    salesRep: z.string().optional(),
    callDate: z.string().datetime().optional(),
    callType: z.enum(['discovery', 'demo', 'follow_up', 'support', 'other']).optional(),
    templateId: UUIDSchema.optional()
  }),

  callUpdate: z.object({
    customerName: z.string().min(1).optional(),
    customerEmail: z.string().email().optional(),
    customerPhone: PhoneSchema.optional(),
    notes: z.string().optional(),
    extracted_data: z.record(z.string(), z.any()).optional()
  }),

  // Bulk operations
  bulkDelete: z.object({
    ids: z.array(UUIDSchema).min(1).max(100, 'Maximum 100 items per operation')
  }),

  // Team operations
  inviteTeamMember: z.object({
    email: EmailSchema,
    role: z.enum(['admin', 'member']),
    organizationId: UUIDSchema
  }),

  // Pagination
  listCalls: z.object({
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(10),
    status: z.enum(['uploaded', 'processing', 'completed', 'failed']).optional(),
    search: z.string().optional()
  }),

  // Search
  search: z.object({
    query: z.string().min(1),
    type: z.enum(['calls', 'customers', 'all']).default('all'),
    limit: z.number().min(1).max(100).default(10)
  })
};

/**
 * Validate file uploads (for use with FormData)
 */
export async function validateFileUpload(
  file: File | null,
  options: {
    required?: boolean;
    maxSize?: number;
    allowedTypes?: string[];
  } = {}
): Promise<{ valid: boolean; error?: string }> {
  const { required = true, maxSize, allowedTypes } = options;

  if (!file) {
    if (required) {
      return { valid: false, error: 'File is required' };
    }
    return { valid: true };
  }

  // Use FileUploadSchema for validation
  try {
    await FileUploadSchema.parseAsync({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type
    });

    // Additional custom validations
    if (maxSize && file.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds maximum of ${maxSize / (1024 * 1024)}MB`
      };
    }

    if (allowedTypes && !allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type ${file.type} is not allowed`
      };
    }

    return { valid: true };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        valid: false,
        error: error.issues[0].message
      };
    }
    return {
      valid: false,
      error: 'File validation failed'
    };
  }
}

/**
 * Sanitize and validate user input for text fields
 */
export function sanitizeInput(input: string, maxLength: number = 1000): string {
  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized;
}

/**
 * Validate and sanitize HTML content (for rich text fields)
 */
export function sanitizeHtml(html: string, maxLength: number = 10000): string {
  // Basic HTML sanitization - in production, use a library like DOMPurify
  let sanitized = html;

  // Remove script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove on* attributes
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

export default validate;