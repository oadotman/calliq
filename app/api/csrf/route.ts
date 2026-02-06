import { NextResponse } from 'next/server';
import { setCSRFToken } from '@/lib/security/csrf-simple';

/**
 * GET /api/csrf
 *
 * Returns a CSRF token for the client to use in subsequent requests.
 * The token is also set as an httpOnly cookie.
 */
export async function GET() {
  try {
    // Generate and set a new CSRF token
    const token = await setCSRFToken();

    // Return the token to the client
    // The client can then include this in the X-CSRF-Token header
    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    return NextResponse.json({ error: 'Failed to generate CSRF token' }, { status: 500 });
  }
}
