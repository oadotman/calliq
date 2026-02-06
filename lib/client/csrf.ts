/**
 * Client-side CSRF token management
 * This module helps include CSRF tokens in client-side requests
 */

let cachedToken: string | null = null;

/**
 * Get CSRF token from meta tag or fetch from API
 */
export async function getCSRFToken(): Promise<string | null> {
  // Return cached token if available
  if (cachedToken) {
    return cachedToken;
  }

  // Try to get from meta tag first (for SSR)
  const metaTag = document.querySelector('meta[name="csrf-token"]');
  if (metaTag) {
    cachedToken = metaTag.getAttribute('content');
    return cachedToken;
  }

  // Fetch token from API endpoint
  try {
    const response = await fetch('/api/csrf');
    if (response.ok) {
      const data = await response.json();
      cachedToken = data.token;
      return cachedToken;
    }
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
  }

  return null;
}

/**
 * Clear cached CSRF token (useful after logout or errors)
 */
export function clearCSRFToken(): void {
  cachedToken = null;
}

/**
 * Add CSRF token to fetch headers
 */
export async function addCSRFHeader(headers: HeadersInit = {}): Promise<HeadersInit> {
  const token = await getCSRFToken();
  if (token) {
    return {
      ...headers,
      'X-CSRF-Token': token,
    };
  }
  return headers;
}

/**
 * Wrapper for fetch that automatically includes CSRF token
 */
export async function fetchWithCSRF(url: string, options: RequestInit = {}): Promise<Response> {
  // Skip CSRF for GET requests
  if (!options.method || options.method === 'GET') {
    return fetch(url, options);
  }

  const headers = await addCSRFHeader(options.headers);

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Helper to add CSRF token to form data
 */
export async function addCSRFToFormData(formData: FormData): Promise<FormData> {
  const token = await getCSRFToken();
  if (token) {
    formData.append('csrf_token', token);
  }
  return formData;
}

/**
 * Helper to add CSRF token to JSON body
 */
export async function addCSRFToBody(body: any): Promise<any> {
  const token = await getCSRFToken();
  if (token && typeof body === 'object') {
    return {
      ...body,
      csrf_token: token,
    };
  }
  return body;
}
