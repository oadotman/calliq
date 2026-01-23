/**
 * API Versioning System
 * Phase 5.1 - Implement API Versioning
 *
 * This module provides API versioning capabilities for backward compatibility
 */

import { NextRequest, NextResponse } from 'next/server';

// Supported API versions
export const API_VERSIONS = {
  V1: 'v1',
  V2: 'v2',
  LATEST: 'v2',
  DEFAULT: 'v1', // Default to v1 for backward compatibility
} as const;

export type ApiVersion = typeof API_VERSIONS[keyof typeof API_VERSIONS];

// Version deprecation schedule
export const VERSION_STATUS = {
  v1: {
    status: 'deprecated',
    deprecatedAt: '2024-01-01',
    sunsetDate: '2024-07-01',
    message: 'API v1 is deprecated and will be removed on July 1, 2024. Please migrate to v2.',
  },
  v2: {
    status: 'current',
    deprecatedAt: null,
    sunsetDate: null,
    message: null,
  },
} as const;

/**
 * Extract API version from request
 */
export function getApiVersion(req: NextRequest): ApiVersion {
  const path = req.nextUrl.pathname;

  // Check URL path for version
  const pathMatch = path.match(/\/api\/(v\d+)\//);
  if (pathMatch) {
    return pathMatch[1] as ApiVersion;
  }

  // Check header for version
  const headerVersion = req.headers.get('X-API-Version');
  if (headerVersion && isValidVersion(headerVersion)) {
    return headerVersion as ApiVersion;
  }

  // Check query parameter for version
  const queryVersion = req.nextUrl.searchParams.get('api_version');
  if (queryVersion && isValidVersion(queryVersion)) {
    return queryVersion as ApiVersion;
  }

  // Default to v1 for backward compatibility
  return API_VERSIONS.DEFAULT;
}

/**
 * Check if a version is valid
 */
export function isValidVersion(version: string): boolean {
  return Object.values(API_VERSIONS).includes(version as ApiVersion);
}

/**
 * Check if a version is deprecated
 */
export function isDeprecatedVersion(version: ApiVersion): boolean {
  return VERSION_STATUS[version]?.status === 'deprecated';
}

/**
 * Get deprecation warning for a version
 */
export function getDeprecationWarning(version: ApiVersion): string | null {
  return VERSION_STATUS[version]?.message || null;
}

/**
 * Add version headers to response
 */
export function addVersionHeaders(
  response: NextResponse,
  version: ApiVersion
): NextResponse {
  // Add current version header
  response.headers.set('X-API-Version', version);

  // Add deprecation warning if applicable
  const warning = getDeprecationWarning(version);
  if (warning) {
    response.headers.set('X-API-Deprecation-Warning', warning);
    response.headers.set('Sunset', VERSION_STATUS[version].sunsetDate || '');
  }

  // Add available versions header
  response.headers.set('X-API-Versions', Object.values(API_VERSIONS).join(', '));

  return response;
}

/**
 * Version-specific response transformer
 * Transforms responses to match the expected format for each API version
 */
export function transformResponse(data: any, fromVersion: ApiVersion, toVersion: ApiVersion): any {
  // If versions match, no transformation needed
  if (fromVersion === toVersion) {
    return data;
  }

  // Transform from v2 to v1 format
  if (fromVersion === 'v2' && toVersion === 'v1') {
    return transformV2ToV1(data);
  }

  // Transform from v1 to v2 format
  if (fromVersion === 'v1' && toVersion === 'v2') {
    return transformV1ToV2(data);
  }

  return data;
}

/**
 * Transform v2 response to v1 format (backward compatibility)
 */
function transformV2ToV1(data: any): any {
  // Handle array responses
  if (Array.isArray(data)) {
    return data.map(item => transformV2ToV1(item));
  }

  // Handle object responses
  if (typeof data === 'object' && data !== null) {
    const transformed: any = {};

    // Map new field names to old field names
    const fieldMappings: Record<string, string> = {
      // V2 -> V1 field mappings
      'organizationId': 'organization_id',
      'userId': 'user_id',
      'callId': 'call_id',
      'createdAt': 'created_at',
      'updatedAt': 'updated_at',
      'deletedAt': 'deleted_at',
      'fileUrl': 'file_url',
      'audioUrl': 'audio_url',
      'customerName': 'customer_name',
      'customerEmail': 'customer_email',
      'customerPhone': 'customer_phone',
      'processingStatus': 'status',
      'transcriptionStatus': 'transcription_status',
      'extractionStatus': 'extraction_status',
      // Pagination fields
      'currentPage': 'page',
      'totalPages': 'pages',
      'pageSize': 'per_page',
      'totalItems': 'total',
      'items': 'data',
    };

    for (const [key, value] of Object.entries(data)) {
      const mappedKey = fieldMappings[key] || key;
      transformed[mappedKey] = value;
    }

    // Handle nested pagination structure (v2 uses nested, v1 uses flat)
    if (data.pagination) {
      transformed.page = data.pagination.currentPage;
      transformed.pages = data.pagination.totalPages;
      transformed.per_page = data.pagination.pageSize;
      transformed.total = data.pagination.totalItems;
      delete transformed.pagination;
    }

    // Handle response envelope differences
    if (data.data && data.meta) {
      // V2 uses { data: [], meta: {} } structure
      // V1 uses flat structure with data at root
      return {
        ...data.data,
        ...data.meta,
        success: true,
      };
    }

    return transformed;
  }

  return data;
}

/**
 * Transform v1 response to v2 format (forward compatibility)
 */
function transformV1ToV2(data: any): any {
  // Handle array responses
  if (Array.isArray(data)) {
    return data.map(item => transformV1ToV2(item));
  }

  // Handle object responses
  if (typeof data === 'object' && data !== null) {
    const transformed: any = {};

    // Map old field names to new field names
    const fieldMappings: Record<string, string> = {
      // V1 -> V2 field mappings
      'organization_id': 'organizationId',
      'user_id': 'userId',
      'call_id': 'callId',
      'created_at': 'createdAt',
      'updated_at': 'updatedAt',
      'deleted_at': 'deletedAt',
      'file_url': 'fileUrl',
      'audio_url': 'audioUrl',
      'customer_name': 'customerName',
      'customer_email': 'customerEmail',
      'customer_phone': 'customerPhone',
      'status': 'processingStatus',
      'transcription_status': 'transcriptionStatus',
      'extraction_status': 'extractionStatus',
    };

    for (const [key, value] of Object.entries(data)) {
      const mappedKey = fieldMappings[key] || key;
      transformed[mappedKey] = value;
    }

    // Handle flat pagination structure (v1) to nested (v2)
    if (data.page !== undefined && data.total !== undefined) {
      transformed.pagination = {
        currentPage: data.page,
        totalPages: data.pages,
        pageSize: data.per_page,
        totalItems: data.total,
      };
      delete transformed.page;
      delete transformed.pages;
      delete transformed.per_page;
      delete transformed.total;
    }

    // Handle response envelope differences
    if (data.success !== undefined && !data.data && !data.meta) {
      // V1 uses flat structure
      // V2 uses { data: {}, meta: {} } structure
      const { success, error, message, ...rest } = transformed;
      return {
        data: rest,
        meta: {
          success,
          message,
        },
        ...(error && { error }),
      };
    }

    return transformed;
  }

  return data;
}

/**
 * API Version middleware
 */
export function withApiVersion(handler: Function) {
  return async (req: NextRequest, ...args: any[]) => {
    // Get API version from request
    const version = getApiVersion(req);

    // Check if version is valid
    if (!isValidVersion(version)) {
      return NextResponse.json(
        { error: 'Invalid API version' },
        { status: 400 }
      );
    }

    // Add version to request for handler to use
    (req as any).apiVersion = version;

    // Call the handler
    const response = await handler(req, ...args);

    // Add version headers to response
    return addVersionHeaders(response, version);
  };
}

/**
 * Route version compatibility decorator
 * Specifies which versions a route supports
 */
export function supportedVersions(versions: ApiVersion[]) {
  return function (handler: Function) {
    return async (req: NextRequest, ...args: any[]) => {
      const version = getApiVersion(req);

      if (!versions.includes(version)) {
        return NextResponse.json(
          {
            error: 'This endpoint is not available in the requested API version',
            supportedVersions: versions,
            requestedVersion: version,
          },
          { status: 400 }
        );
      }

      return handler(req, ...args);
    };
  };
}

/**
 * Create versioned route handler
 */
export function createVersionedHandler(handlers: Partial<Record<ApiVersion, Function>>) {
  return async (req: NextRequest, ...args: any[]) => {
    const version = getApiVersion(req);
    const handler = handlers[version] || handlers[API_VERSIONS.DEFAULT];

    if (!handler) {
      return NextResponse.json(
        {
          error: 'No handler available for this API version',
          requestedVersion: version,
          availableVersions: Object.keys(handlers),
        },
        { status: 501 }
      );
    }

    return handler(req, ...args);
  };
}