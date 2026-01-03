/**
 * Session Helper
 * Bridges Supabase authentication with Redis session management
 * for horizontal scaling support
 */

import { sessionStore } from './redis-store';
import { cookies } from 'next/headers';
import { createHash } from 'crypto';

const SESSION_COOKIE_NAME = 'calliq-session-id';
const SESSION_TTL = 86400; // 24 hours

/**
 * Generate a secure session ID
 */
function generateSessionId(userId: string): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2);
  const data = `${userId}-${timestamp}-${random}`;
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Create or update a Redis session for a user
 */
export async function createRedisSession(
  userId: string,
  userData: {
    email: string;
    organizationId?: string;
    role?: string;
  }
): Promise<string | null> {
  try {
    const sessionId = generateSessionId(userId);

    const sessionData = {
      userId,
      email: userData.email,
      organizationId: userData.organizationId,
      role: userData.role,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    const success = await sessionStore.set(sessionId, sessionData, SESSION_TTL);

    if (success) {
      // Set session cookie
      const cookieStore = cookies();
      cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_TTL,
        path: '/',
      });

      return sessionId;
    }

    return null;
  } catch (error) {
    console.error('Error creating Redis session:', error);
    return null;
  }
}

/**
 * Get session from Redis
 */
export async function getRedisSession() {
  try {
    const cookieStore = cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionId) {
      return null;
    }

    const session = await sessionStore.get(sessionId);

    if (session) {
      // Update last activity
      await sessionStore.touch(sessionId, SESSION_TTL);
    }

    return session;
  } catch (error) {
    console.error('Error getting Redis session:', error);
    return null;
  }
}

/**
 * Destroy Redis session
 */
export async function destroyRedisSession() {
  try {
    const cookieStore = cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (sessionId) {
      await sessionStore.destroy(sessionId);

      // Clear cookie
      cookieStore.set(SESSION_COOKIE_NAME, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      });
    }

    return true;
  } catch (error) {
    console.error('Error destroying Redis session:', error);
    return false;
  }
}

/**
 * Validate session exists and is valid
 */
export async function validateSession(): Promise<boolean> {
  const session = await getRedisSession();
  return session !== null;
}

/**
 * Update session data
 */
export async function updateRedisSession(updates: Partial<{
  organizationId: string;
  role: string;
  [key: string]: any;
}>) {
  try {
    const cookieStore = cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionId) {
      return false;
    }

    const currentSession = await sessionStore.get(sessionId);

    if (!currentSession) {
      return false;
    }

    const updatedSession = {
      ...currentSession,
      ...updates,
      lastActivity: Date.now(),
    };

    return await sessionStore.set(sessionId, updatedSession, SESSION_TTL);
  } catch (error) {
    console.error('Error updating Redis session:', error);
    return false;
  }
}

/**
 * Clear all sessions for a user (logout from all devices)
 */
export async function clearAllUserSessions(userId: string): Promise<number> {
  try {
    return await sessionStore.clearUserSessions(userId);
  } catch (error) {
    console.error('Error clearing user sessions:', error);
    return 0;
  }
}

/**
 * Get session statistics for monitoring
 */
export async function getSessionStats() {
  try {
    const count = await sessionStore.getSessionCount();
    return {
      activeSessions: count,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error getting session stats:', error);
    return {
      activeSessions: 0,
      timestamp: new Date().toISOString(),
      error: true,
    };
  }
}