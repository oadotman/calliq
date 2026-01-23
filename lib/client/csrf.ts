/**
 * Client-side CSRF token management
 * This module helps include CSRF tokens in client-side requests
 */

/**
 * Get CSRF token from meta tag or response header
 */
export function getCSRFToken(): string | null {
  // Try to get from meta tag first (for SSR)
  const metaTag = document.querySelector('meta[name="csrf-token"]');
  if (metaTag) {
    return metaTag.getAttribute('content');
  }

  // Try to get from cookie (httpOnly cookies won't be accessible)
  // This is for reference only - actual token should come from server
  return null;
}

/**
 * Add CSRF token to fetch headers
 */
export function addCSRFHeader(headers: HeadersInit = {}): HeadersInit {
  const token = getCSRFToken();
  if (token) {
    return {
      ...headers,
      'X-CSRF-Token': token
    };
  }
  return headers;
}

/**
 * Wrapper for fetch that automatically includes CSRF token
 */
export async function fetchWithCSRF(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Skip CSRF for GET requests
  if (!options.method || options.method === 'GET') {
    return fetch(url, options);
  }

  const headers = addCSRFHeader(options.headers);

  return fetch(url, {
    ...options,
    headers
  });
}

/**
 * Helper to add CSRF token to form data
 */
export function addCSRFToFormData(formData: FormData): FormData {
  const token = getCSRFToken();
  if (token) {
    formData.append('csrf_token', token);
  }
  return formData;
}

/**
 * Helper to add CSRF token to JSON body
 */
export function addCSRFToBody(body: any): any {
  const token = getCSRFToken();
  if (token && typeof body === 'object') {
    return {
      ...body,
      csrf_token: token
    };
  }
  return body;
}