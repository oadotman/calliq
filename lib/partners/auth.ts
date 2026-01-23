// =====================================================
// PARTNER AUTHENTICATION SYSTEM
// Handles partner login, session management, and verification
// =====================================================

import { createServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import type { Partner, PartnerSession } from './types';

const PARTNER_SESSION_COOKIE = 'partner_session';
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days
const BCRYPT_ROUNDS = 12; // Secure number of rounds for bcrypt

export class PartnerAuth {
  /**
   * Generate a secure session token
   */
  static generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * SECURITY FIX: Use bcrypt for password hashing instead of SHA256
   * bcrypt is specifically designed for password hashing with built-in salting
   */
  static async hashPassword(password: string): Promise<string> {
    // Validate password length
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Use bcrypt with automatic salt generation
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    return hashedPassword;
  }

  /**
   * SECURITY FIX: Use bcrypt for password verification
   * bcrypt.compare handles timing-safe comparison automatically
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      // Check if hash is in old SHA256 format (64 chars hex)
      if (hash.length === 64 && /^[a-f0-9]+$/i.test(hash)) {
        // Legacy SHA256 hash detected - force password reset
        console.warn('Legacy SHA256 password hash detected - user should reset password');
        // For backward compatibility, check SHA256 but require update
        const legacyHash = crypto.createHash('sha256').update(password).digest('hex');
        if (legacyHash === hash) {
          // Password is correct but needs rehashing
          // This should trigger a password update flow
          return true; // Allow login but flag for update
        }
        return false;
      }

      // Use bcrypt for comparison (timing-safe)
      const isValid = await bcrypt.compare(password, hash);
      return isValid;
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  /**
   * Create a partner session
   */
  static async createSession(partnerId: string, req?: NextRequest): Promise<PartnerSession> {
    const supabase = createServerClient();
    const token = this.generateSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION);

    // Store session in database
    const session: PartnerSession = {
      id: crypto.randomUUID(),
      partner_id: partnerId,
      token,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
      ip_address: req?.headers.get('x-forwarded-for') || req?.ip,
      user_agent: req?.headers.get('user-agent') || undefined,
    };

    // Note: In production, this will be stored in the partners_sessions table
    // For now, we'll store it in a temporary way
    const { error } = await supabase
      .from('partners_sessions')
      .insert(session);

    if (error) {
      console.error('Error creating partner session:', error);
      throw new Error('Failed to create session');
    }

    // Set session cookie
    const cookieStore = cookies();
    cookieStore.set(PARTNER_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    });

    return session;
  }

  /**
   * Get current partner session
   */
  static async getCurrentSession(): Promise<PartnerSession | null> {
    const cookieStore = cookies();
    const sessionToken = cookieStore.get(PARTNER_SESSION_COOKIE)?.value;

    if (!sessionToken) {
      return null;
    }

    const supabase = createServerClient();

    // Get session from database
    const { data: session, error } = await supabase
      .from('partners_sessions')
      .select('*')
      .eq('token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !session) {
      return null;
    }

    return session as PartnerSession;
  }

  /**
   * Get current partner
   */
  static async getCurrentPartner(): Promise<Partner | null> {
    const session = await this.getCurrentSession();

    if (!session) {
      return null;
    }

    const supabase = createServerClient();

    // Get partner from database
    const { data: partner, error } = await supabase
      .from('partners')
      .select('*')
      .eq('id', session.partner_id)
      .eq('status', 'active')
      .single();

    if (error || !partner) {
      return null;
    }

    // Update last login
    await supabase
      .from('partners')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', partner.id);

    return partner as Partner;
  }

  /**
   * Login partner
   */
  static async login(email: string, password: string, req?: NextRequest): Promise<{ success: boolean; partner?: Partner; error?: string; requiresPasswordReset?: boolean; email?: string }> {
    const supabase = createServerClient();

    // Get partner by email
    const { data: partner, error: fetchError } = await supabase
      .from('partners')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (fetchError || !partner) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Check if partner is active
    if (partner.status !== 'active') {
      return { success: false, error: 'Your partner account is not active. Please contact support.' };
    }

    // Verify password
    const passwordValid = await this.verifyPassword(password, partner.password_hash || '');

    if (!passwordValid) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Check if this is a legacy SHA256 password that needs to be updated
    const isLegacyPassword = partner.password_hash &&
                            partner.password_hash.length === 64 &&
                            /^[a-f0-9]+$/i.test(partner.password_hash);

    if (isLegacyPassword) {
      // Password is correct but using legacy SHA256 - force reset
      console.warn(`Partner ${partner.id} is using legacy SHA256 password - forcing reset`);

      // Update partner record to mark password as requiring reset
      const { error: updateError } = await supabase
        .from('partners')
        .update({
          requires_password_reset: true,
          password_reset_token: crypto.randomUUID(),
          password_reset_expires: new Date(Date.now() + 3600000).toISOString() // 1 hour
        })
        .eq('id', partner.id);

      if (updateError) {
        console.error('Error marking partner for password reset:', updateError);
      }

      // Return a special response indicating password reset is required
      return {
        success: false,
        error: 'Your password needs to be updated for security reasons. Please check your email for reset instructions.',
        requiresPasswordReset: true,
        email: partner.email
      };
    }

    // Create session
    await this.createSession(partner.id, req);

    return { success: true, partner: partner as Partner };
  }

  /**
   * Logout partner
   */
  static async logout(): Promise<void> {
    const session = await this.getCurrentSession();

    if (session) {
      const supabase = createServerClient();

      // Delete session from database
      await supabase
        .from('partners_sessions')
        .delete()
        .eq('token', session.token);
    }

    // Clear session cookie
    const cookieStore = cookies();
    cookieStore.delete(PARTNER_SESSION_COOKIE);
  }

  /**
   * Check if partner is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    const partner = await this.getCurrentPartner();
    return !!partner;
  }

  /**
   * Require partner authentication (for use in API routes)
   */
  static async requireAuth(): Promise<Partner> {
    const partner = await this.getCurrentPartner();

    if (!partner) {
      throw new Error('Authentication required');
    }

    return partner;
  }

  /**
   * Generate temporary password for new partners
   */
  static generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Validate partner has required tier
   */
  static async requireTier(requiredTier: 'standard' | 'premium'): Promise<Partner> {
    const partner = await this.requireAuth();

    if (requiredTier === 'premium' && partner.tier !== 'premium') {
      throw new Error('Premium tier required');
    }

    return partner;
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(): Promise<void> {
    const supabase = createServerClient();

    await supabase
      .from('partners_sessions')
      .delete()
      .lt('expires_at', new Date().toISOString());
  }
}

/**
 * Verify partner session (standalone function for API routes)
 */
export async function verifyPartnerSession(): Promise<Partner | null> {
  return await PartnerAuth.getCurrentPartner();
}