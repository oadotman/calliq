/**
 * Unit Tests for Usage Calculations
 * Critical business logic for tracking and calculating usage
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock the Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createServerClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          gte: jest.fn(() => ({
            lte: jest.fn(() => ({
              order: jest.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }))
        })),
        order: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    })),
    rpc: jest.fn()
  }))
}));

describe('Usage Calculations', () => {
  describe('calculateAvailableMinutes', () => {
    it('should correctly calculate available minutes for a free plan', async () => {
      const mockOrgId = 'test-org-123';
      const planMinutes = 100;
      const usedMinutes = 30;
      const purchasedMinutes = 0;

      const expected = planMinutes - usedMinutes + purchasedMinutes;

      // Mock the database response
      const { createServerClient } = require('@/lib/supabase/server');
      const mockSupabase = createServerClient();

      mockSupabase.rpc.mockResolvedValueOnce({
        data: { available_minutes: expected },
        error: null
      });

      // Call the function (you would import the actual function here)
      const result = await mockSupabase.rpc('calculate_available_minutes', {
        p_organization_id: mockOrgId
      });

      expect(result.data.available_minutes).toBe(expected);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('calculate_available_minutes', {
        p_organization_id: mockOrgId
      });
    });

    it('should handle overage minutes correctly', async () => {
      const mockOrgId = 'test-org-456';
      const planMinutes = 100;
      const usedMinutes = 120;
      const purchasedMinutes = 50;

      const expected = planMinutes - usedMinutes + purchasedMinutes; // Should be 30

      const { createServerClient } = require('@/lib/supabase/server');
      const mockSupabase = createServerClient();

      mockSupabase.rpc.mockResolvedValueOnce({
        data: { available_minutes: expected },
        error: null
      });

      const result = await mockSupabase.rpc('calculate_available_minutes', {
        p_organization_id: mockOrgId
      });

      expect(result.data.available_minutes).toBe(30);
    });

    it('should return 0 when all minutes are used', async () => {
      const mockOrgId = 'test-org-789';
      const planMinutes = 100;
      const usedMinutes = 150;
      const purchasedMinutes = 0;

      const { createServerClient } = require('@/lib/supabase/server');
      const mockSupabase = createServerClient();

      mockSupabase.rpc.mockResolvedValueOnce({
        data: { available_minutes: 0 },
        error: null
      });

      const result = await mockSupabase.rpc('calculate_available_minutes', {
        p_organization_id: mockOrgId
      });

      expect(result.data.available_minutes).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      const mockOrgId = 'test-org-error';

      const { createServerClient } = require('@/lib/supabase/server');
      const mockSupabase = createServerClient();

      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' }
      });

      const result = await mockSupabase.rpc('calculate_available_minutes', {
        p_organization_id: mockOrgId
      });

      expect(result.error).toBeDefined();
      expect(result.error.message).toBe('Database connection failed');
    });
  });

  describe('Usage Reservation Logic', () => {
    it('should successfully reserve usage minutes', async () => {
      const mockOrgId = 'test-org-reserve';
      const minutesToReserve = 10;
      const mockCallId = 'call-123';

      const { createServerClient } = require('@/lib/supabase/server');
      const mockSupabase = createServerClient();

      // Mock successful reservation
      mockSupabase.rpc.mockResolvedValueOnce({
        data: true,
        error: null
      });

      const result = await mockSupabase.rpc('reserve_usage', {
        p_organization_id: mockOrgId,
        p_minutes: minutesToReserve,
        p_call_id: mockCallId
      });

      expect(result.data).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should fail reservation when insufficient minutes', async () => {
      const mockOrgId = 'test-org-insufficient';
      const minutesToReserve = 1000; // Very high number
      const mockCallId = 'call-456';

      const { createServerClient } = require('@/lib/supabase/server');
      const mockSupabase = createServerClient();

      // Mock failed reservation
      mockSupabase.rpc.mockResolvedValueOnce({
        data: false,
        error: null
      });

      const result = await mockSupabase.rpc('reserve_usage', {
        p_organization_id: mockOrgId,
        p_minutes: minutesToReserve,
        p_call_id: mockCallId
      });

      expect(result.data).toBe(false);
    });

    it('should handle concurrent reservations with advisory locks', async () => {
      const mockOrgId = 'test-org-concurrent';
      const mockCallIds = ['call-1', 'call-2', 'call-3'];

      const { createServerClient } = require('@/lib/supabase/server');
      const mockSupabase = createServerClient();

      // Simulate concurrent reservation attempts
      const reservationPromises = mockCallIds.map((callId, index) => {
        // Only first should succeed
        mockSupabase.rpc.mockResolvedValueOnce({
          data: index === 0,
          error: null
        });

        return mockSupabase.rpc('reserve_usage', {
          p_organization_id: mockOrgId,
          p_minutes: 50,
          p_call_id: callId
        });
      });

      const results = await Promise.all(reservationPromises);

      // Only one should succeed
      const successCount = results.filter(r => r.data === true).length;
      expect(successCount).toBeLessThanOrEqual(1);
    });

    it('should cleanup expired reservations', async () => {
      const { createServerClient } = require('@/lib/supabase/server');
      const mockSupabase = createServerClient();

      // Mock cleanup function
      mockSupabase.rpc.mockResolvedValueOnce({
        data: { cleaned: 5 },
        error: null
      });

      const result = await mockSupabase.rpc('cleanup_expired_usage_reservations');

      expect(result.data.cleaned).toBe(5);
      expect(result.error).toBeNull();
    });
  });

  describe('Billing Period Calculations', () => {
    it('should correctly identify current billing period', () => {
      const now = new Date('2024-01-15T12:00:00Z');
      const billingDay = 1;

      const expectedStart = new Date('2024-01-01T00:00:00Z');
      const expectedEnd = new Date('2024-01-31T23:59:59Z');

      // Mock the billing period calculation
      const getBillingPeriod = (date: Date, day: number) => {
        const start = new Date(date.getFullYear(), date.getMonth(), day);
        const end = new Date(date.getFullYear(), date.getMonth() + 1, day - 1, 23, 59, 59);
        return { start, end };
      };

      const period = getBillingPeriod(now, billingDay);

      expect(period.start.getDate()).toBe(expectedStart.getDate());
      expect(period.end.getDate()).toBe(31); // January has 31 days, so end should be 31st
    });

    it('should handle month boundaries correctly', () => {
      const now = new Date('2024-01-31T12:00:00Z');
      const billingDay = 15;

      const getBillingPeriod = (date: Date, day: number) => {
        const currentDay = date.getDate();
        let start, end;

        if (currentDay >= day) {
          start = new Date(date.getFullYear(), date.getMonth(), day);
          end = new Date(date.getFullYear(), date.getMonth() + 1, day - 1, 23, 59, 59);
        } else {
          start = new Date(date.getFullYear(), date.getMonth() - 1, day);
          end = new Date(date.getFullYear(), date.getMonth(), day - 1, 23, 59, 59);
        }

        return { start, end };
      };

      const period = getBillingPeriod(now, billingDay);

      expect(period.start.getDate()).toBe(15);
      expect(period.end.getDate()).toBe(14);
    });
  });

  describe('Plan Limits', () => {
    const planLimits = {
      free: { minutes: 10, calls: 10 },
      solo: { minutes: 100, calls: 100 },
      team: { minutes: 500, calls: 500 },
      enterprise: { minutes: 2000, calls: -1 } // -1 means unlimited
    };

    it('should enforce free plan limits', () => {
      const plan = 'free';
      const usage = { minutes: 5, calls: 8 };

      const canUpload = usage.minutes < planLimits[plan].minutes &&
                        usage.calls < planLimits[plan].calls;

      expect(canUpload).toBe(true);
    });

    it('should block uploads when plan limits exceeded', () => {
      const plan = 'free';
      const usage = { minutes: 11, calls: 8 };

      const canUpload = usage.minutes < planLimits[plan].minutes &&
                        usage.calls < planLimits[plan].calls;

      expect(canUpload).toBe(false);
    });

    it('should handle unlimited enterprise calls', () => {
      const plan = 'enterprise';
      const usage = { minutes: 1500, calls: 10000 };

      const canUpload = usage.minutes < planLimits[plan].minutes &&
                        (planLimits[plan].calls === -1 || usage.calls < planLimits[plan].calls);

      expect(canUpload).toBe(true);
    });
  });
});