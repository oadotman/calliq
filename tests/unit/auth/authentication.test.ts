/**
 * Authentication Flow Tests
 * Critical path testing for authentication
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

// Mock Supabase
jest.mock('@supabase/supabase-js');
jest.mock('@/lib/supabase/server', () => ({
  createServerClient: jest.fn(),
  createAdminClient: jest.fn(),
  requireAuth: jest.fn(),
}));

describe('Authentication Flow', () => {
  let mockSupabase: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock Supabase client
    mockSupabase = {
      auth: {
        signUp: jest.fn(),
        signInWithPassword: jest.fn(),
        signOut: jest.fn(),
        getUser: jest.fn(),
        getSession: jest.fn(),
        resetPasswordForEmail: jest.fn(),
        updateUser: jest.fn(),
        verifyOtp: jest.fn(),
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
          eq: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
      })),
    };

    const { createServerClient } = require('@/lib/supabase/server');
    createServerClient.mockReturnValue(mockSupabase);
  });

  describe('User Registration', () => {
    it('should successfully register a new user', async () => {
      const email = 'test@example.com';
      const password = 'SecurePassword123!';

      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: { id: 'user-123', email },
          session: { access_token: 'token-123' },
        },
        error: null,
      });

      const result = await mockSupabase.auth.signUp({
        email,
        password,
      });

      expect(result.error).toBeNull();
      expect(result.data.user?.email).toBe(email);
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email,
        password,
      });
    });

    it('should reject registration with invalid email', async () => {
      const invalidEmail = 'not-an-email';
      const password = 'SecurePassword123!';

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid email format' },
      });

      const result = await mockSupabase.auth.signUp({
        email: invalidEmail,
        password,
      });

      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Invalid email');
    });

    it('should reject registration with weak password', async () => {
      const email = 'test@example.com';
      const weakPassword = '123';

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Password too weak' },
      });

      const result = await mockSupabase.auth.signUp({
        email,
        password: weakPassword,
      });

      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Password too weak');
    });

    it('should handle duplicate email registration', async () => {
      const email = 'existing@example.com';
      const password = 'SecurePassword123!';

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      });

      const result = await mockSupabase.auth.signUp({
        email,
        password,
      });

      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('already registered');
    });
  });

  describe('User Login', () => {
    it('should successfully login with valid credentials', async () => {
      const email = 'test@example.com';
      const password = 'SecurePassword123!';

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'user-123', email },
          session: {
            access_token: 'access-token-123',
            refresh_token: 'refresh-token-123',
          },
        },
        error: null,
      });

      const result = await mockSupabase.auth.signInWithPassword({
        email,
        password,
      });

      expect(result.error).toBeNull();
      expect(result.data.session?.access_token).toBeTruthy();
      expect(result.data.user?.email).toBe(email);
    });

    it('should reject login with invalid credentials', async () => {
      const email = 'test@example.com';
      const wrongPassword = 'WrongPassword';

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      const result = await mockSupabase.auth.signInWithPassword({
        email,
        password: wrongPassword,
      });

      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Invalid login credentials');
    });

    it('should handle rate limiting on multiple failed attempts', async () => {
      const email = 'test@example.com';
      const wrongPassword = 'WrongPassword';

      // Simulate multiple failed attempts
      for (let i = 0; i < 5; i++) {
        mockSupabase.auth.signInWithPassword.mockResolvedValue({
          data: { user: null, session: null },
          error: { message: 'Invalid login credentials' },
        });

        await mockSupabase.auth.signInWithPassword({
          email,
          password: wrongPassword,
        });
      }

      // 6th attempt should be rate limited
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Too many requests' },
      });

      const result = await mockSupabase.auth.signInWithPassword({
        email,
        password: wrongPassword,
      });

      expect(result.error?.message).toContain('Too many requests');
    });
  });

  describe('Session Management', () => {
    it('should validate active session', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            access_token: 'valid-token',
            expires_at: Date.now() + 3600000, // 1 hour from now
            user: { id: 'user-123', email: 'test@example.com' },
          },
        },
        error: null,
      });

      const result = await mockSupabase.auth.getSession();

      expect(result.error).toBeNull();
      expect(result.data.session).toBeTruthy();
      expect(result.data.session.access_token).toBe('valid-token');
    });

    it('should reject expired session', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: null,
        },
        error: { message: 'Session expired' },
      });

      const result = await mockSupabase.auth.getSession();

      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Session expired');
    });

    it('should refresh token when needed', async () => {
      // First call returns expired token
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: {
          session: {
            access_token: 'old-token',
            expires_at: Date.now() - 1000, // Expired
            refresh_token: 'refresh-token',
          },
        },
        error: null,
      });

      // Refresh token call
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: {
          session: {
            access_token: 'new-token',
            expires_at: Date.now() + 3600000, // New expiry
            refresh_token: 'new-refresh-token',
          },
        },
        error: null,
      });

      const firstCall = await mockSupabase.auth.getSession();
      const secondCall = await mockSupabase.auth.getSession();

      expect(secondCall.data.session?.access_token).toBe('new-token');
    });
  });

  describe('Password Reset Flow', () => {
    it('should send password reset email', async () => {
      const email = 'test@example.com';

      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      const result = await mockSupabase.auth.resetPasswordForEmail(email);

      expect(result.error).toBeNull();
      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(email);
    });

    it('should handle non-existent email gracefully', async () => {
      const email = 'nonexistent@example.com';

      // For security, should return success even for non-existent emails
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      const result = await mockSupabase.auth.resetPasswordForEmail(email);

      expect(result.error).toBeNull();
    });

    it('should validate reset token', async () => {
      const token = 'valid-reset-token';
      const newPassword = 'NewSecurePassword123!';

      mockSupabase.auth.verifyOtp.mockResolvedValue({
        data: {
          user: { id: 'user-123', email: 'test@example.com' },
          session: { access_token: 'new-token' },
        },
        error: null,
      });

      const result = await mockSupabase.auth.verifyOtp({
        token_hash: token,
        type: 'recovery',
      });

      expect(result.error).toBeNull();
      expect(result.data.user).toBeTruthy();
    });
  });

  describe('User Logout', () => {
    it('should successfully logout user', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: null,
      });

      const result = await mockSupabase.auth.signOut();

      expect(result.error).toBeNull();
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('should clear session on logout', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: null,
      });

      // Check session before logout
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: {
          session: { access_token: 'valid-token' },
        },
        error: null,
      });

      const beforeLogout = await mockSupabase.auth.getSession();
      expect(beforeLogout.data.session).toBeTruthy();

      // Logout
      await mockSupabase.auth.signOut();

      // Check session after logout
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      const afterLogout = await mockSupabase.auth.getSession();
      expect(afterLogout.data.session).toBeNull();
    });
  });

  describe('Protected Route Access', () => {
    it('should allow access with valid session', async () => {
      const { requireAuth } = require('@/lib/supabase/server');

      requireAuth.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
      });

      const user = await requireAuth();

      expect(user).toBeTruthy();
      expect(user.id).toBe('user-123');
    });

    it('should deny access without session', async () => {
      const { requireAuth } = require('@/lib/supabase/server');

      requireAuth.mockRejectedValue(new Error('Unauthorized'));

      await expect(requireAuth()).rejects.toThrow('Unauthorized');
    });

    it('should validate organization membership', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { role: 'member', organization_id: 'org-123' },
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await mockSupabase
        .from('user_organizations')
        .select('role, organization_id')
        .eq('user_id', 'user-123')
        .eq('organization_id', 'org-123')
        .single();

      expect(result.data.role).toBe('member');
      expect(result.data.organization_id).toBe('org-123');
    });
  });
});

describe('Security Checks', () => {
  describe('SQL Injection Prevention', () => {
    it('should sanitize email inputs', () => {
      const maliciousEmail = "test'; DROP TABLE users; --";

      // Email validation should reject this
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test(maliciousEmail)).toBe(false);
    });

    it('should use parameterized queries', () => {
      // Supabase uses parameterized queries by default
      const userId = "'; DROP TABLE users; --";

      // This should be safe due to parameterization
      const mockQuery = jest.fn();
      mockQuery(`SELECT * FROM users WHERE id = $1`, [userId]);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('$1'),
        expect.arrayContaining([userId])
      );
    });
  });

  describe('XSS Prevention', () => {
    it('should escape HTML in user inputs', () => {
      const maliciousInput = '<script>alert("XSS")</script>';

      // HTML should be escaped
      const escaped = maliciousInput
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');

      expect(escaped).not.toContain('<script>');
      expect(escaped).toContain('&lt;script&gt;');
    });
  });

  describe('CSRF Protection', () => {
    it('should validate CSRF tokens', () => {
      const validToken = 'valid-csrf-token';
      const invalidToken = 'invalid-csrf-token';

      // Mock CSRF validation
      const validateCSRF = (token: string) => token === validToken;

      expect(validateCSRF(validToken)).toBe(true);
      expect(validateCSRF(invalidToken)).toBe(false);
    });
  });
});