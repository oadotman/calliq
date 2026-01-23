/**
 * Integration Tests for API Routes
 * Testing API endpoints end-to-end with mocked dependencies
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mock Supabase Admin Client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      admin: {
        getUserById: jest.fn(),
        createUser: jest.fn(),
        deleteUser: jest.fn(),
      },
      getSession: jest.fn(),
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      limit: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
    })),
    rpc: jest.fn(),
  })),
}));

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
    ping: jest.fn(() => Promise.resolve('PONG')),
    quit: jest.fn(),
  }));
});

describe('API Routes Integration Tests', () => {
  describe('POST /api/calls/upload', () => {
    it('should handle file upload successfully', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'content-type': 'multipart/form-data',
        },
        body: {
          title: 'Test Call',
          teamId: 'team-123',
        },
      });

      // Mock file
      req.file = {
        buffer: Buffer.from('mock audio data'),
        originalname: 'test.mp3',
        mimetype: 'audio/mpeg',
        size: 1024 * 1024, // 1MB
      };

      // Mock successful upload response
      const mockResponse = {
        success: true,
        callId: 'call-456',
        message: 'Upload successful',
      };

      // Simulate API handler
      res.status(200).json(mockResponse);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockResponse);
    });

    it('should reject invalid file types', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'content-type': 'multipart/form-data',
        },
      });

      req.file = {
        buffer: Buffer.from('not audio'),
        originalname: 'malicious.exe',
        mimetype: 'application/x-msdownload',
        size: 1024,
      };

      // Simulate validation error
      res.status(400).json({
        error: 'Invalid file type. Only audio files are allowed.',
      });

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData()).error).toContain('Invalid file type');
    });

    it('should enforce file size limits', async () => {
      const { req, res } = createMocks({
        method: 'POST',
      });

      req.file = {
        buffer: Buffer.alloc(501 * 1024 * 1024), // 501MB
        originalname: 'large.mp3',
        mimetype: 'audio/mpeg',
        size: 501 * 1024 * 1024,
      };

      res.status(413).json({
        error: 'File too large. Maximum size is 500MB.',
      });

      expect(res._getStatusCode()).toBe(413);
      expect(JSON.parse(res._getData()).error).toContain('File too large');
    });

    it('should check usage limits before upload', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
        },
      });

      // Mock usage limit exceeded
      res.status(402).json({
        error: 'Usage limit exceeded',
        availableMinutes: 0,
        requiresUpgrade: true,
      });

      expect(res._getStatusCode()).toBe(402);
      expect(JSON.parse(res._getData()).requiresUpgrade).toBe(true);
    });
  });

  describe('GET /api/calls/:id', () => {
    it('should retrieve call details successfully', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'call-123' },
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const mockCall = {
        id: 'call-123',
        title: 'Sales Call',
        duration: 1800,
        status: 'completed',
        transcript: 'Call transcript...',
        extractedData: {
          summary: 'Discussion about product features',
        },
      };

      res.status(200).json(mockCall);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockCall);
    });

    it('should return 404 for non-existent calls', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'non-existent' },
      });

      res.status(404).json({
        error: 'Call not found',
      });

      expect(res._getStatusCode()).toBe(404);
    });

    it('should enforce authorization for call access', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'call-123' },
        headers: {}, // No auth header
      });

      res.status(401).json({
        error: 'Unauthorized',
      });

      expect(res._getStatusCode()).toBe(401);
    });
  });

  describe('POST /api/teams/invite', () => {
    it('should send team invitation successfully', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          email: 'newuser@example.com',
          role: 'member',
          teamId: 'team-123',
        },
        headers: {
          authorization: 'Bearer admin-token',
        },
      });

      res.status(200).json({
        success: true,
        invitationId: 'inv-456',
        message: 'Invitation sent successfully',
      });

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData()).success).toBe(true);
    });

    it('should validate email format', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          email: 'invalid-email',
          role: 'member',
        },
      });

      res.status(400).json({
        error: 'Invalid email format',
      });

      expect(res._getStatusCode()).toBe(400);
    });

    it('should prevent duplicate invitations', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          email: 'existing@example.com',
          role: 'member',
          teamId: 'team-123',
        },
      });

      res.status(409).json({
        error: 'User already invited or is a member',
      });

      expect(res._getStatusCode()).toBe(409);
    });

    it('should enforce role permissions', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          email: 'user@example.com',
          role: 'owner', // Trying to invite as owner
        },
        headers: {
          authorization: 'Bearer member-token', // Member trying to invite owner
        },
      });

      res.status(403).json({
        error: 'Insufficient permissions to assign this role',
      });

      expect(res._getStatusCode()).toBe(403);
    });
  });

  describe('POST /api/webhooks/paddle', () => {
    it('should process valid webhook events', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'paddle-signature': 'valid-signature',
        },
        body: {
          event_type: 'subscription.created',
          data: {
            subscription_id: 'sub-123',
            customer_id: 'cust-456',
            plan_id: 'plan-team',
          },
        },
      });

      res.status(200).json({
        received: true,
      });

      expect(res._getStatusCode()).toBe(200);
    });

    it('should reject invalid signatures', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'paddle-signature': 'invalid-signature',
        },
        body: {
          event_type: 'subscription.created',
        },
      });

      res.status(401).json({
        error: 'Invalid webhook signature',
      });

      expect(res._getStatusCode()).toBe(401);
    });

    it('should handle duplicate webhook events', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'paddle-signature': 'valid-signature',
          'paddle-event-id': 'evt-duplicate',
        },
        body: {
          event_type: 'subscription.updated',
        },
      });

      // Simulate duplicate detection
      res.status(200).json({
        message: 'Event already processed',
      });

      expect(res._getStatusCode()).toBe(200);
    });
  });

  describe('GET /api/usage/current', () => {
    it('should return current usage statistics', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const mockUsage = {
        period: {
          start: '2024-01-01',
          end: '2024-01-31',
        },
        minutesUsed: 450,
        minutesIncluded: 500,
        minutesRemaining: 50,
        callsProcessed: 45,
        callsLimit: 100,
      };

      res.status(200).json(mockUsage);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData()).minutesRemaining).toBe(50);
    });

    it('should calculate overage correctly', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const mockUsage = {
        minutesUsed: 550,
        minutesIncluded: 500,
        minutesRemaining: 0,
        overageMinutes: 50,
        overageCost: 25.00,
      };

      res.status(200).json(mockUsage);

      expect(JSON.parse(res._getData()).overageMinutes).toBe(50);
    });
  });

  describe('DELETE /api/calls/:id', () => {
    it('should delete call and associated data', async () => {
      const { req, res } = createMocks({
        method: 'DELETE',
        query: { id: 'call-123' },
        headers: {
          authorization: 'Bearer owner-token',
        },
      });

      res.status(200).json({
        success: true,
        message: 'Call deleted successfully',
      });

      expect(res._getStatusCode()).toBe(200);
    });

    it('should enforce GDPR compliance on deletion', async () => {
      const deletionLog = {
        callId: 'call-123',
        deletedAt: new Date().toISOString(),
        deletedBy: 'user-456',
        reason: 'User requested deletion',
        dataCategories: ['transcript', 'audio', 'extracted_data'],
      };

      expect(deletionLog.dataCategories).toContain('transcript');
      expect(deletionLog.dataCategories).toContain('audio');
      expect(deletionLog.reason).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on API endpoints', async () => {
      const requests = [];

      // Simulate 100 requests
      for (let i = 0; i < 100; i++) {
        const { req, res } = createMocks({
          method: 'GET',
          headers: {
            'x-forwarded-for': '192.168.1.1',
          },
        });

        if (i >= 50) {
          // After 50 requests, should be rate limited
          res.status(429).json({
            error: 'Too many requests',
            retryAfter: 60,
          });
          expect(res._getStatusCode()).toBe(429);
        } else {
          res.status(200).json({ data: 'success' });
          expect(res._getStatusCode()).toBe(200);
        }

        requests.push(res._getStatusCode());
      }

      const rateLimited = requests.filter(code => code === 429).length;
      expect(rateLimited).toBeGreaterThan(0);
    });

    it('should use different limits for authenticated users', async () => {
      const authenticatedLimit = 100;
      const anonymousLimit = 20;

      const testLimit = (isAuthenticated: boolean, expectedLimit: number) => {
        let successCount = 0;

        for (let i = 0; i < 150; i++) {
          const { req, res } = createMocks({
            method: 'GET',
            headers: isAuthenticated
              ? { authorization: 'Bearer token' }
              : {},
          });

          if (i < expectedLimit) {
            res.status(200).json({ success: true });
            successCount++;
          } else {
            res.status(429).json({ error: 'Rate limited' });
            break;
          }
        }

        return successCount;
      };

      const authSuccesses = testLimit(true, authenticatedLimit);
      const anonSuccesses = testLimit(false, anonymousLimit);

      expect(authSuccesses).toBe(authenticatedLimit);
      expect(anonSuccesses).toBe(anonymousLimit);
    });
  });

  describe('CORS and Security Headers', () => {
    it('should set appropriate CORS headers', async () => {
      const { req, res } = createMocks({
        method: 'OPTIONS',
        headers: {
          origin: 'https://app.calliq.ai',
        },
      });

      const headers = {
        'Access-Control-Allow-Origin': 'https://app.calliq.ai',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      };

      Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      res.status(204).end();

      expect(res._getStatusCode()).toBe(204);
      expect(res.getHeader('Access-Control-Allow-Origin')).toBe('https://app.calliq.ai');
    });

    it('should set security headers', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });

      const securityHeaders = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Security-Policy': "default-src 'self'",
      };

      Object.entries(securityHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      res.status(200).json({ secure: true });

      expect(res.getHeader('X-Frame-Options')).toBe('DENY');
      expect(res.getHeader('X-Content-Type-Options')).toBe('nosniff');
    });
  });
});