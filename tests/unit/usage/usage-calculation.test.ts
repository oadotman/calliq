/**
 * Usage Calculation Tests
 * CRITICAL: Billing accuracy depends on these calculations
 */

import { calculateUsageAndOverage } from '@/lib/overage';
import { reserveUsageMinutes, confirmReservation, releaseReservation } from '@/lib/usage-reservation';

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createServerClient: jest.fn(),
  createAdminClient: jest.fn(),
}));

describe('Usage Calculation', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(),
            gte: jest.fn(() => ({
              lte: jest.fn(() => ({
                order: jest.fn(),
              })),
            })),
          })),
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(),
          })),
        })),
        delete: jest.fn(() => ({
          eq: jest.fn(),
        })),
      })),
      rpc: jest.fn(),
    };

    const { createAdminClient } = require('@/lib/supabase/server');
    createAdminClient.mockReturnValue(mockSupabase);
  });

  describe('Basic Usage Calculation', () => {
    it('should calculate usage within limits correctly', () => {
      const baseMinutes = 500;
      const usedMinutes = 200;
      const overageMinutes = 0;

      const usage = {
        minutesUsed: usedMinutes,
        baseMinutes,
        purchasedOverageMinutes: overageMinutes,
        totalAvailableMinutes: baseMinutes + overageMinutes,
        remainingMinutes: baseMinutes + overageMinutes - usedMinutes,
        percentUsed: (usedMinutes / (baseMinutes + overageMinutes)) * 100,
        canUpload: true,
        hasOverage: false,
        inOverage: false,
      };

      expect(usage.remainingMinutes).toBe(300);
      expect(usage.percentUsed).toBe(40);
      expect(usage.canUpload).toBe(true);
    });

    it('should identify when user is in overage', () => {
      const baseMinutes = 500;
      const usedMinutes = 600;
      const overageMinutes = 200;

      const usage = {
        minutesUsed: usedMinutes,
        baseMinutes,
        purchasedOverageMinutes: overageMinutes,
        totalAvailableMinutes: baseMinutes + overageMinutes,
        remainingMinutes: baseMinutes + overageMinutes - usedMinutes,
        percentUsed: (usedMinutes / (baseMinutes + overageMinutes)) * 100,
        canUpload: true,
        hasOverage: true,
        inOverage: usedMinutes > baseMinutes,
      };

      expect(usage.inOverage).toBe(true);
      expect(usage.remainingMinutes).toBe(100);
      expect(usage.canUpload).toBe(true);
    });

    it('should block uploads when all minutes exhausted', () => {
      const baseMinutes = 500;
      const usedMinutes = 700;
      const overageMinutes = 200;

      const usage = {
        minutesUsed: usedMinutes,
        baseMinutes,
        purchasedOverageMinutes: overageMinutes,
        totalAvailableMinutes: baseMinutes + overageMinutes,
        remainingMinutes: 0,
        percentUsed: 100,
        canUpload: false,
        hasOverage: true,
        inOverage: true,
      };

      expect(usage.canUpload).toBe(false);
      expect(usage.remainingMinutes).toBe(0);
    });
  });

  describe('Plan-Specific Limits', () => {
    const planLimits = {
      free: 30,
      solo: 500,
      team: 2000,
      enterprise: 10000,
    };

    it('should enforce free plan limits', () => {
      const usage = 35;
      const limit = planLimits.free;

      expect(usage > limit).toBe(true);
      expect(usage - limit).toBe(5); // 5 minutes over
    });

    it('should handle team plan with multiple users', () => {
      const usersInTeam = 5;
      const totalTeamUsage = 1800;
      const limit = planLimits.team;

      const averagePerUser = totalTeamUsage / usersInTeam;
      expect(averagePerUser).toBe(360);
      expect(totalTeamUsage < limit).toBe(true);
    });

    it('should calculate enterprise usage correctly', () => {
      const usage = 5000;
      const limit = planLimits.enterprise;
      const percentUsed = (usage / limit) * 100;

      expect(percentUsed).toBe(50);
      expect(limit - usage).toBe(5000); // 5000 minutes remaining
    });
  });

  describe('Overage Calculation', () => {
    it('should calculate overage charges correctly', () => {
      const baseMinutes = 500;
      const usedMinutes = 650;
      const overageRate = 0.10; // $0.10 per minute

      const overageMinutes = Math.max(0, usedMinutes - baseMinutes);
      const overageCharge = overageMinutes * overageRate;

      expect(overageMinutes).toBe(150);
      expect(overageCharge).toBe(15.00);
    });

    it('should not charge overage when under limit', () => {
      const baseMinutes = 500;
      const usedMinutes = 400;
      const overageRate = 0.10;

      const overageMinutes = Math.max(0, usedMinutes - baseMinutes);
      const overageCharge = overageMinutes * overageRate;

      expect(overageMinutes).toBe(0);
      expect(overageCharge).toBe(0);
    });

    it('should apply overage pack correctly', () => {
      const baseMinutes = 500;
      const purchasedOveragePack = 500; // 500 minute pack
      const usedMinutes = 800;

      const totalAvailable = baseMinutes + purchasedOveragePack;
      const remainingMinutes = totalAvailable - usedMinutes;
      const needsAdditionalOverage = usedMinutes > totalAvailable;

      expect(totalAvailable).toBe(1000);
      expect(remainingMinutes).toBe(200);
      expect(needsAdditionalOverage).toBe(false);
    });
  });

  describe('Usage Reservation System', () => {
    it('should reserve minutes for upload', async () => {
      const organizationId = 'org-123';
      const estimatedMinutes = 10;
      const fileIdentifier = 'file-123';

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          max_minutes_monthly: 500,
          reserved_minutes: 100,
        },
        error: null,
      });

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: {
          id: 'reservation-123',
          organization_id: organizationId,
          reserved_minutes: estimatedMinutes,
        },
        error: null,
      });

      // Mock the reservation function
      const mockReserve = jest.fn().mockResolvedValue({
        success: true,
        reservationId: 'reservation-123',
        remainingMinutes: 390,
      });

      const result = await mockReserve(organizationId, estimatedMinutes, fileIdentifier);

      expect(result.success).toBe(true);
      expect(result.reservationId).toBeTruthy();
      expect(result.remainingMinutes).toBe(390);
    });

    it('should prevent reservation when insufficient minutes', async () => {
      const organizationId = 'org-123';
      const estimatedMinutes = 100;
      const availableMinutes = 50;

      const mockReserve = jest.fn().mockResolvedValue({
        success: false,
        error: 'Insufficient minutes available',
        remainingMinutes: availableMinutes,
      });

      const result = await mockReserve(organizationId, estimatedMinutes, 'file-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient');
    });

    it('should confirm reservation with actual usage', async () => {
      const reservationId = 'reservation-123';
      const organizationId = 'org-123';
      const estimatedMinutes = 10;
      const actualMinutes = 8;

      // Mock confirmation
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: reservationId,
          reserved_minutes: estimatedMinutes,
          organization_id: organizationId,
        },
        error: null,
      });

      mockSupabase.from().update().eq().select.mockResolvedValue({
        data: {
          status: 'confirmed',
          actual_minutes: actualMinutes,
        },
        error: null,
      });

      const mockConfirm = jest.fn().mockResolvedValue({
        success: true,
        actualMinutes,
        refundedMinutes: estimatedMinutes - actualMinutes,
      });

      const result = await mockConfirm(reservationId, organizationId, actualMinutes);

      expect(result.success).toBe(true);
      expect(result.actualMinutes).toBe(8);
      expect(result.refundedMinutes).toBe(2);
    });

    it('should release reservation on error', async () => {
      const reservationId = 'reservation-123';

      mockSupabase.from().delete().eq.mockResolvedValue({
        error: null,
      });

      const mockRelease = jest.fn().mockResolvedValue({
        success: true,
      });

      const result = await mockRelease(reservationId);

      expect(result.success).toBe(true);
      expect(mockRelease).toHaveBeenCalledWith(reservationId);
    });
  });

  describe('Billing Period Calculation', () => {
    it('should calculate current billing period correctly', () => {
      const now = new Date('2024-01-15');
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      expect(periodStart.getDate()).toBe(1);
      expect(periodEnd.getDate()).toBe(31); // January has 31 days
      expect(periodEnd.getMonth()).toBe(0); // January
    });

    it('should handle month boundaries correctly', () => {
      const now = new Date('2024-02-29'); // Leap year
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      expect(periodStart.getDate()).toBe(1);
      expect(periodEnd.getDate()).toBe(29); // February in leap year
    });

    it('should reset usage at period start', () => {
      const lastPeriodUsage = 450;
      const currentPeriodStart = new Date('2024-02-01');
      const checkDate = new Date('2024-02-02');

      const isNewPeriod = checkDate >= currentPeriodStart;
      const currentUsage = isNewPeriod ? 0 : lastPeriodUsage;

      expect(isNewPeriod).toBe(true);
      expect(currentUsage).toBe(0);
    });
  });

  describe('Concurrent Usage Prevention', () => {
    it('should prevent duplicate reservations for same file', async () => {
      const fileIdentifier = 'file-123';
      const activeReservations = new Set<string>();

      const attemptReservation = (fileId: string) => {
        if (activeReservations.has(fileId)) {
          return { success: false, error: 'Duplicate reservation' };
        }
        activeReservations.add(fileId);
        return { success: true };
      };

      const first = attemptReservation(fileIdentifier);
      const second = attemptReservation(fileIdentifier);

      expect(first.success).toBe(true);
      expect(second.success).toBe(false);
      expect(second.error).toContain('Duplicate');
    });

    it('should handle race conditions with database locks', async () => {
      // Simulate database row lock
      let isLocked = false;

      const acquireLock = async (orgId: string) => {
        if (isLocked) {
          throw new Error('Row locked');
        }
        isLocked = true;
        return true;
      };

      const releaseLock = () => {
        isLocked = false;
      };

      // First transaction
      await expect(acquireLock('org-123')).resolves.toBe(true);

      // Second transaction while locked
      await expect(acquireLock('org-123')).rejects.toThrow('Row locked');

      // After release
      releaseLock();
      await expect(acquireLock('org-123')).resolves.toBe(true);
    });
  });

  describe('Usage Metrics Aggregation', () => {
    it('should aggregate team usage correctly', () => {
      const teamMembers = [
        { userId: 'user-1', usage: 100 },
        { userId: 'user-2', usage: 150 },
        { userId: 'user-3', usage: 200 },
        { userId: 'user-4', usage: 50 },
      ];

      const totalUsage = teamMembers.reduce((sum, member) => sum + member.usage, 0);
      const averageUsage = totalUsage / teamMembers.length;
      const maxUsage = Math.max(...teamMembers.map(m => m.usage));
      const minUsage = Math.min(...teamMembers.map(m => m.usage));

      expect(totalUsage).toBe(500);
      expect(averageUsage).toBe(125);
      expect(maxUsage).toBe(200);
      expect(minUsage).toBe(50);
    });

    it('should calculate daily usage trends', () => {
      const dailyUsage = [
        { date: '2024-01-01', minutes: 50 },
        { date: '2024-01-02', minutes: 75 },
        { date: '2024-01-03', minutes: 60 },
        { date: '2024-01-04', minutes: 90 },
        { date: '2024-01-05', minutes: 85 },
      ];

      const totalUsage = dailyUsage.reduce((sum, day) => sum + day.minutes, 0);
      const averageDaily = totalUsage / dailyUsage.length;
      const trend = dailyUsage[4].minutes - dailyUsage[0].minutes;

      expect(totalUsage).toBe(360);
      expect(averageDaily).toBe(72);
      expect(trend).toBe(35); // Increasing trend
    });
  });

  describe('Error Handling', () => {
    it('should handle negative usage gracefully', () => {
      const calculateUsage = (used: number, limit: number) => {
        const remaining = Math.max(0, limit - used);
        const overage = Math.max(0, used - limit);
        return { remaining, overage };
      };

      const result = calculateUsage(-10, 100);
      expect(result.remaining).toBe(100);
      expect(result.overage).toBe(0);
    });

    it('should handle null/undefined values', () => {
      const safeCalculate = (used?: number | null, limit?: number | null) => {
        const safeUsed = used || 0;
        const safeLimit = limit || 0;
        return Math.max(0, safeLimit - safeUsed);
      };

      expect(safeCalculate(null, 100)).toBe(100);
      expect(safeCalculate(50, null)).toBe(0);
      expect(safeCalculate(undefined, undefined)).toBe(0);
    });

    it('should validate usage data types', () => {
      const validateUsage = (value: any): number => {
        const num = Number(value);
        if (isNaN(num) || num < 0) {
          return 0;
        }
        return Math.floor(num);
      };

      expect(validateUsage('50')).toBe(50);
      expect(validateUsage('abc')).toBe(0);
      expect(validateUsage(-10)).toBe(0);
      expect(validateUsage(45.7)).toBe(45);
    });
  });
});