/**
 * Redis Session Store
 * Enables distributed session management across multiple server instances
 */

import redisClient from '@/lib/redis/client';

export interface SessionData {
  userId?: string;
  organizationId?: string;
  email?: string;
  role?: string;
  expiresAt?: number;
  [key: string]: any;
}

export class RedisSessionStore {
  private readonly prefix = 'session:';
  private readonly defaultTTL = 86400; // 24 hours in seconds

  /**
   * Get session data by session ID
   */
  async get(sessionId: string): Promise<SessionData | null> {
    try {
      const key = `${this.prefix}${sessionId}`;
      const data = await redisClient.get(key);

      if (!data) {
        return null;
      }

      const session = JSON.parse(data);

      // Check if session has expired
      if (session.expiresAt && session.expiresAt < Date.now()) {
        await this.destroy(sessionId);
        return null;
      }

      return session;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  /**
   * Set session data with TTL
   */
  async set(sessionId: string, data: SessionData, ttl?: number): Promise<boolean> {
    try {
      const key = `${this.prefix}${sessionId}`;
      const ttlSeconds = ttl || this.defaultTTL;

      // Add expiration timestamp to session data
      const sessionData = {
        ...data,
        expiresAt: Date.now() + (ttlSeconds * 1000)
      };

      await redisClient.setex(
        key,
        ttlSeconds,
        JSON.stringify(sessionData)
      );

      return true;
    } catch (error) {
      console.error('Error setting session:', error);
      return false;
    }
  }

  /**
   * Update session data (extends TTL)
   */
  async touch(sessionId: string, ttl?: number): Promise<boolean> {
    try {
      const key = `${this.prefix}${sessionId}`;
      const ttlSeconds = ttl || this.defaultTTL;

      const exists = await redisClient.expire(key, ttlSeconds);
      return exists === 1;
    } catch (error) {
      console.error('Error touching session:', error);
      return false;
    }
  }

  /**
   * Destroy a session
   */
  async destroy(sessionId: string): Promise<boolean> {
    try {
      const key = `${this.prefix}${sessionId}`;
      const deleted = await redisClient.del(key);
      return deleted === 1;
    } catch (error) {
      console.error('Error destroying session:', error);
      return false;
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<string[]> {
    try {
      const pattern = `${this.prefix}*`;
      const keys = await redisClient.keys(pattern);

      const userSessions: string[] = [];

      for (const key of keys) {
        const data = await redisClient.get(key);
        if (data) {
          const session = JSON.parse(data);
          if (session.userId === userId) {
            userSessions.push(key.replace(this.prefix, ''));
          }
        }
      }

      return userSessions;
    } catch (error) {
      console.error('Error getting user sessions:', error);
      return [];
    }
  }

  /**
   * Clear all sessions for a user (useful for logout from all devices)
   */
  async clearUserSessions(userId: string): Promise<number> {
    try {
      const sessions = await this.getUserSessions(userId);
      let cleared = 0;

      for (const sessionId of sessions) {
        if (await this.destroy(sessionId)) {
          cleared++;
        }
      }

      return cleared;
    } catch (error) {
      console.error('Error clearing user sessions:', error);
      return 0;
    }
  }

  /**
   * Get session count (for monitoring)
   */
  async getSessionCount(): Promise<number> {
    try {
      const pattern = `${this.prefix}*`;
      const keys = await redisClient.keys(pattern);
      return keys.length;
    } catch (error) {
      console.error('Error getting session count:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const sessionStore = new RedisSessionStore();