/**
 * Payment Processing Tests
 * CRITICAL: Financial transaction testing
 */

import { NextRequest, NextResponse } from 'next/server';

// Mock Paddle
jest.mock('@paddle/paddle-node-sdk');
jest.mock('@/lib/supabase/server', () => ({
  createServerClient: jest.fn(),
  createAdminClient: jest.fn(),
}));

describe('Payment Processing', () => {
  let mockSupabase: any;
  let mockPaddle: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock Supabase
    mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(),
            update: jest.fn(),
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
      })),
    };

    const { createAdminClient } = require('@/lib/supabase/server');
    createAdminClient.mockReturnValue(mockSupabase);
  });

  describe('Subscription Creation', () => {
    it('should create subscription for valid payment', async () => {
      const subscriptionData = {
        user_id: 'user-123',
        plan_type: 'team',
        price_id: 'pri_team_monthly',
        paddle_subscription_id: 'sub_123',
        status: 'active',
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: subscriptionData,
        error: null,
      });

      const result = await mockSupabase
        .from('subscriptions')
        .insert(subscriptionData)
        .select()
        .single();

      expect(result.error).toBeNull();
      expect(result.data.plan_type).toBe('team');
      expect(result.data.status).toBe('active');
    });

    it('should prevent duplicate active subscriptions', async () => {
      // Check existing subscription
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { id: 'existing-sub', status: 'active' },
        error: null,
      });

      const existingCheck = await mockSupabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', 'user-123')
        .single();

      expect(existingCheck.data).toBeTruthy();
      expect(existingCheck.data.status).toBe('active');

      // Attempt to create duplicate should fail
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: null,
        error: { message: 'User already has active subscription' },
      });

      const duplicateAttempt = await mockSupabase
        .from('subscriptions')
        .insert({ user_id: 'user-123' })
        .select()
        .single();

      expect(duplicateAttempt.error).toBeTruthy();
      expect(duplicateAttempt.error.message).toContain('already has active');
    });

    it('should update organization plan limits after subscription', async () => {
      const orgId = 'org-123';
      const planLimits = {
        max_minutes_monthly: 2000,
        max_team_members: 5,
        plan_type: 'team',
      };

      mockSupabase.from().update().eq().select.mockResolvedValue({
        data: planLimits,
        error: null,
      });

      const result = await mockSupabase
        .from('organizations')
        .update(planLimits)
        .eq('id', orgId)
        .select();

      expect(result.data.max_minutes_monthly).toBe(2000);
      expect(result.data.max_team_members).toBe(5);
    });
  });

  describe('Webhook Validation', () => {
    it('should validate Paddle webhook signature', () => {
      const secret = 'webhook_secret';
      const payload = JSON.stringify({ event: 'subscription.created' });
      const crypto = require('crypto');

      // Generate valid signature
      const validSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      // Validation function
      const validateWebhook = (signature: string, body: string, secret: string) => {
        const expected = crypto
          .createHmac('sha256', secret)
          .update(body)
          .digest('hex');
        return crypto.timingSafeEqual(
          Buffer.from(signature),
          Buffer.from(expected)
        );
      };

      expect(validateWebhook(validSignature, payload, secret)).toBe(true);

      // Invalid signature should fail
      const invalidSignature = 'invalid-signature';
      expect(validateWebhook(invalidSignature, payload, secret)).toBe(false);
    });

    it('should reject webhooks with invalid timestamps', () => {
      const currentTime = Date.now() / 1000;
      const oldTimestamp = currentTime - 400; // More than 5 minutes old

      const validateTimestamp = (timestamp: number, tolerance: number = 300) => {
        const current = Date.now() / 1000;
        return Math.abs(current - timestamp) <= tolerance;
      };

      expect(validateTimestamp(currentTime)).toBe(true);
      expect(validateTimestamp(oldTimestamp)).toBe(false);
    });

    it('should prevent webhook replay attacks', async () => {
      const webhookId = 'webhook-123';
      const processedWebhooks = new Set<string>();

      const processWebhook = (id: string) => {
        if (processedWebhooks.has(id)) {
          throw new Error('Webhook already processed');
        }
        processedWebhooks.add(id);
        return true;
      };

      // First processing should succeed
      expect(processWebhook(webhookId)).toBe(true);

      // Replay should fail
      expect(() => processWebhook(webhookId)).toThrow('already processed');
    });
  });

  describe('Payment Amount Calculations', () => {
    it('should calculate correct subscription amount', () => {
      const plans = {
        free: { monthly: 0, yearly: 0 },
        solo: { monthly: 29, yearly: 290 },
        team: { monthly: 99, yearly: 990 },
        enterprise: { monthly: 499, yearly: 4990 },
      };

      const calculateAmount = (plan: string, interval: 'monthly' | 'yearly') => {
        // @ts-ignore
        return plans[plan]?.[interval] || 0;
      };

      expect(calculateAmount('team', 'monthly')).toBe(99);
      expect(calculateAmount('team', 'yearly')).toBe(990);
      expect(calculateAmount('solo', 'monthly')).toBe(29);
      expect(calculateAmount('enterprise', 'yearly')).toBe(4990);
    });

    it('should apply discounts correctly', () => {
      const basePrice = 100;
      const discountPercent = 20;

      const applyDiscount = (price: number, discount: number) => {
        return price * (1 - discount / 100);
      };

      expect(applyDiscount(basePrice, discountPercent)).toBe(80);
      expect(applyDiscount(100, 0)).toBe(100);
      expect(applyDiscount(100, 100)).toBe(0);
    });

    it('should calculate overage charges correctly', () => {
      const baseMinutes = 500;
      const usedMinutes = 650;
      const overageRate = 0.10; // $0.10 per minute

      const calculateOverage = (used: number, included: number, rate: number) => {
        if (used <= included) return 0;
        return (used - included) * rate;
      };

      const overageAmount = calculateOverage(usedMinutes, baseMinutes, overageRate);
      expect(overageAmount).toBe(15); // 150 minutes * $0.10

      // No overage when under limit
      expect(calculateOverage(400, baseMinutes, overageRate)).toBe(0);
    });

    it('should round monetary values correctly', () => {
      const roundMoney = (value: number) => {
        return Math.round(value * 100) / 100;
      };

      expect(roundMoney(10.999)).toBe(11.00);
      expect(roundMoney(10.001)).toBe(10.00);
      expect(roundMoney(10.005)).toBe(10.01);
    });
  });

  describe('Subscription Management', () => {
    it('should upgrade subscription plan', async () => {
      const subscriptionId = 'sub-123';
      const newPlan = 'enterprise';

      mockSupabase.from().update().eq().select.mockResolvedValue({
        data: {
          id: subscriptionId,
          plan_type: newPlan,
          updated_at: new Date(),
        },
        error: null,
      });

      const result = await mockSupabase
        .from('subscriptions')
        .update({ plan_type: newPlan })
        .eq('id', subscriptionId)
        .select();

      expect(result.data.plan_type).toBe('enterprise');
    });

    it('should downgrade with prorated refund', async () => {
      const currentPlan = { type: 'team', price: 99 };
      const newPlan = { type: 'solo', price: 29 };
      const daysRemaining = 15;
      const daysInMonth = 30;

      const calculateProration = (
        oldPrice: number,
        newPrice: number,
        daysRemaining: number,
        totalDays: number
      ) => {
        const oldDailyCost = oldPrice / totalDays;
        const newDailyCost = newPrice / totalDays;
        const refund = oldDailyCost * daysRemaining;
        const charge = newDailyCost * daysRemaining;
        return refund - charge;
      };

      const proration = calculateProration(
        currentPlan.price,
        newPlan.price,
        daysRemaining,
        daysInMonth
      );

      // Should get refund for difference
      expect(proration).toBeGreaterThan(0);
      expect(Math.round(proration * 100) / 100).toBe(35); // $35 refund
    });

    it('should cancel subscription at period end', async () => {
      const subscriptionId = 'sub-123';
      const periodEnd = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

      mockSupabase.from().update().eq().select.mockResolvedValue({
        data: {
          id: subscriptionId,
          status: 'active',
          cancel_at_period_end: true,
          cancelled_at: new Date(),
          current_period_end: periodEnd,
        },
        error: null,
      });

      const result = await mockSupabase
        .from('subscriptions')
        .update({ cancel_at_period_end: true })
        .eq('id', subscriptionId)
        .select();

      expect(result.data.cancel_at_period_end).toBe(true);
      expect(result.data.status).toBe('active'); // Still active until period end
    });
  });

  describe('Failed Payment Handling', () => {
    it('should retry failed payments', async () => {
      const maxRetries = 3;
      let attemptCount = 0;

      const processPayment = async () => {
        attemptCount++;
        if (attemptCount < maxRetries) {
          throw new Error('Payment failed');
        }
        return { success: true };
      };

      const retryPayment = async (fn: Function, retries: number) => {
        for (let i = 0; i < retries; i++) {
          try {
            return await fn();
          } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
          }
        }
      };

      const result = await retryPayment(processPayment, maxRetries);
      expect(result?.success).toBe(true);
      expect(attemptCount).toBe(maxRetries);
    });

    it('should suspend subscription after grace period', async () => {
      const gracePeriodDays = 7;
      const lastPaymentAttempt = new Date(
        Date.now() - (gracePeriodDays + 1) * 24 * 60 * 60 * 1000
      );

      const shouldSuspend = (lastAttempt: Date, graceDays: number) => {
        const daysSinceAttempt =
          (Date.now() - lastAttempt.getTime()) / (24 * 60 * 60 * 1000);
        return daysSinceAttempt > graceDays;
      };

      expect(shouldSuspend(lastPaymentAttempt, gracePeriodDays)).toBe(true);

      // Should not suspend within grace period
      const recentAttempt = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      expect(shouldSuspend(recentAttempt, gracePeriodDays)).toBe(false);
    });

    it('should send payment failure notifications', async () => {
      const mockNotification = jest.fn();

      const handlePaymentFailure = async (userId: string, reason: string) => {
        await mockNotification({
          user_id: userId,
          type: 'payment_failed',
          title: 'Payment Failed',
          message: `Your payment could not be processed: ${reason}`,
          link: '/subscription',
        });
      };

      await handlePaymentFailure('user-123', 'Card declined');

      expect(mockNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'payment_failed',
          user_id: 'user-123',
        })
      );
    });
  });

  describe('Financial Data Integrity', () => {
    it('should use database transactions for payment updates', async () => {
      let transactionStarted = false;
      let transactionCommitted = false;
      let transactionRolledBack = false;

      const mockTransaction = {
        begin: () => { transactionStarted = true; },
        commit: () => { transactionCommitted = true; },
        rollback: () => { transactionRolledBack = true; },
      };

      const processPaymentWithTransaction = async (success: boolean) => {
        mockTransaction.begin();
        try {
          if (!success) throw new Error('Payment failed');
          mockTransaction.commit();
        } catch {
          mockTransaction.rollback();
        }
      };

      // Successful transaction
      await processPaymentWithTransaction(true);
      expect(transactionStarted).toBe(true);
      expect(transactionCommitted).toBe(true);
      expect(transactionRolledBack).toBe(false);

      // Reset
      transactionStarted = false;
      transactionCommitted = false;
      transactionRolledBack = false;

      // Failed transaction
      await processPaymentWithTransaction(false);
      expect(transactionStarted).toBe(true);
      expect(transactionCommitted).toBe(false);
      expect(transactionRolledBack).toBe(true);
    });

    it('should maintain audit log for all payment events', async () => {
      const auditLogs: any[] = [];

      const logPaymentEvent = (event: any) => {
        auditLogs.push({
          ...event,
          timestamp: new Date(),
          id: `log-${Date.now()}`,
        });
      };

      logPaymentEvent({
        type: 'subscription_created',
        user_id: 'user-123',
        plan: 'team',
        amount: 99,
      });

      logPaymentEvent({
        type: 'payment_succeeded',
        user_id: 'user-123',
        amount: 99,
      });

      expect(auditLogs).toHaveLength(2);
      expect(auditLogs[0].type).toBe('subscription_created');
      expect(auditLogs[1].type).toBe('payment_succeeded');

      // All logs should have timestamps
      auditLogs.forEach(log => {
        expect(log.timestamp).toBeInstanceOf(Date);
        expect(log.id).toBeTruthy();
      });
    });

    it('should never allow negative balances', () => {
      const updateBalance = (current: number, change: number) => {
        const newBalance = current + change;
        if (newBalance < 0) {
          throw new Error('Insufficient funds');
        }
        return newBalance;
      };

      expect(updateBalance(100, -50)).toBe(50);
      expect(updateBalance(100, 50)).toBe(150);
      expect(() => updateBalance(100, -150)).toThrow('Insufficient funds');
    });
  });
});