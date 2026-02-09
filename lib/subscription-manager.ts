// =====================================================
// SUBSCRIPTION MANAGEMENT UTILITIES
// Handles upgrades, downgrades, and plan changes
// =====================================================

import { openPaddleCheckout } from './paddle';
import type { PlanType } from './pricing';

/**
 * Determine proration billing mode based on plan change type
 */
export function getProrationMode(currentPlan: PlanType, newPlan: PlanType): string {
  const planHierarchy: Record<PlanType, number> = {
    free: 0,
    solo: 1,
    starter: 2,
    professional: 3,
    enterprise: 4,
  };

  const currentLevel = planHierarchy[currentPlan] || 0;
  const newLevel = planHierarchy[newPlan] || 0;

  if (newLevel > currentLevel) {
    // Upgrade - charge immediately with proration
    return 'prorated_immediately';
  } else if (newLevel < currentLevel) {
    // Downgrade - apply at end of billing period
    return 'prorated_next_billing_period';
  } else {
    // Same level (e.g., monthly to annual) - charge immediately with proration
    return 'prorated_immediately';
  }
}

/**
 * Handle subscription plan change (upgrade or downgrade)
 */
export function handlePlanChange(params: {
  currentPlan: PlanType;
  newPlan: PlanType;
  priceId: string;
  email: string;
  organizationId: string;
  userId: string;
  subscriptionId?: string;
  billingPeriod: 'monthly' | 'annual';
  onSuccess: () => void;
  onClose: () => void;
}) {
  const {
    currentPlan,
    newPlan,
    priceId,
    email,
    organizationId,
    userId,
    subscriptionId,
    billingPeriod,
    onSuccess,
    onClose,
  } = params;

  const isUpgrade = isPlanUpgrade(currentPlan, newPlan);
  const isDowngrade = isPlanDowngrade(currentPlan, newPlan);
  const prorationMode = getProrationMode(currentPlan, newPlan);

  // Open Paddle checkout with appropriate settings
  openPaddleCheckout({
    planId: priceId,
    email: email,
    customData: {
      organization_id: organizationId,
      user_id: userId,
      plan_type: newPlan,
      billing_period: billingPeriod,
      current_plan: currentPlan,
      is_upgrade: isUpgrade,
      is_downgrade: isDowngrade,
      proration_billing_mode: prorationMode,
    },
    isUpgrade: isUpgrade || isDowngrade,
    currentSubscriptionId: subscriptionId,
    successCallback: onSuccess,
    closeCallback: onClose,
  });
}

/**
 * Check if a plan change is an upgrade
 */
export function isPlanUpgrade(currentPlan: PlanType | string, newPlan: PlanType | string): boolean {
  const planHierarchy: Record<string, number> = {
    free: 0,
    solo: 1,
    starter: 2,
    professional: 3,
    enterprise: 4,
  };

  const currentLevel = planHierarchy[currentPlan] || 0;
  const newLevel = planHierarchy[newPlan] || 0;

  return newLevel > currentLevel;
}

/**
 * Check if a plan change is a downgrade
 */
export function isPlanDowngrade(
  currentPlan: PlanType | string,
  newPlan: PlanType | string
): boolean {
  const planHierarchy: Record<string, number> = {
    free: 0,
    solo: 1,
    starter: 2,
    professional: 3,
    enterprise: 4,
  };

  const currentLevel = planHierarchy[currentPlan] || 0;
  const newLevel = planHierarchy[newPlan] || 0;

  return newLevel < currentLevel;
}

/**
 * Get available plans for upgrade/downgrade
 */
export function getAvailablePlans(currentPlan: PlanType): {
  upgrades: PlanType[];
  downgrades: PlanType[];
} {
  const allPlans: PlanType[] = ['free', 'solo', 'starter', 'professional', 'enterprise'];
  const planHierarchy: Record<PlanType, number> = {
    free: 0,
    solo: 1,
    starter: 2,
    professional: 3,
    enterprise: 4,
  };

  const currentLevel = planHierarchy[currentPlan] || 0;

  const upgrades = allPlans.filter((plan) => {
    const level = planHierarchy[plan];
    return level > currentLevel;
  });

  const downgrades = allPlans.filter((plan) => {
    const level = planHierarchy[plan];
    return level < currentLevel && plan !== 'free'; // Don't show free as downgrade option
  });

  return { upgrades, downgrades };
}

/**
 * Format plan change message for user display
 */
export function getPlanChangeMessage(
  currentPlan: string,
  newPlan: string,
  isUpgrade: boolean
): string {
  if (isUpgrade) {
    return `You're upgrading from ${currentPlan} to ${newPlan}. The price difference will be prorated and charged immediately.`;
  } else {
    return `You're downgrading from ${currentPlan} to ${newPlan}. The change will take effect at the end of your current billing period.`;
  }
}

/**
 * Calculate estimated proration amount (for display purposes)
 * Note: Paddle calculates the actual proration
 */
export function estimateProration(params: {
  currentPlanPrice: number;
  newPlanPrice: number;
  daysRemainingInPeriod: number;
  totalDaysInPeriod: number;
}): {
  credit: number;
  charge: number;
  total: number;
} {
  const { currentPlanPrice, newPlanPrice, daysRemainingInPeriod, totalDaysInPeriod } = params;

  // Calculate the daily rate for each plan
  const currentDailyRate = currentPlanPrice / totalDaysInPeriod;
  const newDailyRate = newPlanPrice / totalDaysInPeriod;

  // Credit for unused time on current plan
  const credit = currentDailyRate * daysRemainingInPeriod;

  // Charge for remaining time on new plan
  const charge = newDailyRate * daysRemainingInPeriod;

  // Total amount to charge (charge - credit)
  const total = Math.max(0, charge - credit);

  return {
    credit: Math.round(credit * 100) / 100,
    charge: Math.round(charge * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}
