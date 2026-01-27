/**
 * CLIENT-SIDE USAGE TRACKING V2
 *
 * Uses the new unified usage API for accurate, real-time usage information
 */

import { createClient } from '@/lib/supabase/client';

export interface UsageInfoV2 {
  organizationId: string | null;
  planType: string;
  baseMinutes: number;
  purchasedOverageMinutes: number;
  minutesUsed: number;
  totalAvailableMinutes: number;
  remainingMinutes: number;
  percentUsed: number;
  hasOverage: boolean;
  canUpload: boolean;
  isOverLimit: boolean;
  periodStart: string;
  periodEnd: string;
  syncStatus: 'synced' | 'mismatch' | 'unknown';
  warningLevel: 'none' | 'low' | 'medium' | 'high' | 'exceeded';
  callsProcessed: number;
}

/**
 * Fetch current usage information with automatic sync
 */
export async function fetchCurrentUsageV2(forceSync: boolean = false): Promise<UsageInfoV2 | null> {
  try {
    const supabase = createClient();

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.log('[UsageV2] No authenticated user');
      return null;
    }

    // Fetch from the new V2 API endpoint
    const response = await fetch(`/api/usage/v2${forceSync ? '?forceSync=true' : ''}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Disable caching to always get fresh data
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('[UsageV2] Failed to fetch usage:', response.statusText);

      // Try to get error details
      try {
        const errorData = await response.json();
        console.error('[UsageV2] Error details:', errorData);
      } catch (e) {
        // Ignore JSON parse errors
      }

      return null;
    }

    const data = await response.json();

    if (!data.success || !data.usage) {
      console.error('[UsageV2] Invalid response format:', data);
      return null;
    }

    return data.usage as UsageInfoV2;
  } catch (error) {
    console.error('[UsageV2] Error fetching usage:', error);
    return null;
  }
}

/**
 * Force synchronize usage data
 */
export async function syncUsage(organizationId: string): Promise<boolean> {
  try {
    const response = await fetch('/api/usage/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ organizationId }),
    });

    if (!response.ok) {
      console.error('[UsageV2] Failed to sync usage:', response.statusText);
      return false;
    }

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('[UsageV2] Error syncing usage:', error);
    return false;
  }
}

/**
 * Check if a file duration would exceed limits
 */
export function checkDurationLimitV2(
  estimatedMinutes: number,
  usage: UsageInfoV2
): {
  allowed: boolean;
  warning?: string;
  error?: string;
  requiresUpgrade: boolean;
  recommendedAction?: string;
} {
  // No minutes remaining
  if (usage.remainingMinutes <= 0) {
    return {
      allowed: false,
      error: `You have no minutes remaining this month. This ${estimatedMinutes}-minute recording cannot be processed. Please upgrade your plan or purchase additional minutes.`,
      requiresUpgrade: true,
      recommendedAction: usage.hasOverage
        ? 'Your overage minutes have been exhausted. Purchase more overage minutes to continue.'
        : 'Upgrade your plan or purchase overage minutes to continue uploading.',
    };
  }

  // Would exceed available minutes
  if (estimatedMinutes > usage.remainingMinutes) {
    const overage = estimatedMinutes - usage.remainingMinutes;
    return {
      allowed: false,
      error: `This ${estimatedMinutes}-minute recording would exceed your ${usage.remainingMinutes} available minutes by ${overage} minutes. Please upgrade your plan or purchase additional minutes before uploading.`,
      requiresUpgrade: true,
      recommendedAction: `You need at least ${overage} more minutes. Consider purchasing an overage pack.`,
    };
  }

  // Warning when using significant portion of remaining minutes
  const afterUpload = usage.remainingMinutes - estimatedMinutes;
  const percentAfterUpload =
    ((usage.minutesUsed + estimatedMinutes) / usage.totalAvailableMinutes) * 100;

  if (percentAfterUpload >= 90) {
    return {
      allowed: true,
      warning: `This ${estimatedMinutes}-minute recording will use most of your remaining minutes. You'll have only ${afterUpload} minute${afterUpload === 1 ? '' : 's'} left (${Math.round(100 - percentAfterUpload)}% remaining).`,
      requiresUpgrade: false,
      recommendedAction: 'Consider purchasing overage minutes to avoid interruption.',
    };
  }

  if (percentAfterUpload >= 80) {
    return {
      allowed: true,
      warning: `After this ${estimatedMinutes}-minute upload, you'll have ${afterUpload} minutes remaining this month.`,
      requiresUpgrade: false,
    };
  }

  return {
    allowed: true,
    requiresUpgrade: false,
  };
}

/**
 * Estimate audio duration from file (unchanged from original)
 */
export function estimateAudioDurationClient(
  fileSize: number,
  mimeType: string
): { estimatedSeconds: number; estimatedMinutes: number; confidence: 'high' | 'medium' | 'low' } {
  const bitrates: Record<string, { typical: number; min: number; max: number }> = {
    'audio/mpeg': { typical: 128000, min: 96000, max: 320000 },
    'audio/mp3': { typical: 128000, min: 96000, max: 320000 },
    'audio/mp4': { typical: 128000, min: 96000, max: 256000 },
    'audio/x-m4a': { typical: 128000, min: 96000, max: 256000 },
    'audio/m4a': { typical: 128000, min: 96000, max: 256000 },
    'audio/wav': { typical: 1411000, min: 705600, max: 1411000 },
    'audio/x-wav': { typical: 1411000, min: 705600, max: 1411000 },
    'audio/wave': { typical: 1411000, min: 705600, max: 1411000 },
    'audio/webm': { typical: 128000, min: 64000, max: 192000 },
    'audio/ogg': { typical: 160000, min: 96000, max: 320000 },
    'audio/flac': { typical: 800000, min: 600000, max: 1200000 },
  };

  const bitrateInfo = bitrates[mimeType.toLowerCase()] || bitrates['audio/mpeg'];

  const fileSizeInBits = fileSize * 8;
  const estimatedSeconds = Math.round(fileSizeInBits / bitrateInfo.typical);
  const estimatedMinutes = Math.ceil(estimatedSeconds / 60);

  const maxDurationSeconds = fileSizeInBits / bitrateInfo.min;
  const minDurationSeconds = fileSizeInBits / bitrateInfo.max;

  let confidence: 'high' | 'medium' | 'low';
  const variance = (maxDurationSeconds - minDurationSeconds) / estimatedSeconds;

  if (variance < 0.3) {
    confidence = 'high';
  } else if (variance < 0.6) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  if (mimeType.includes('mp3') || mimeType.includes('m4a') || mimeType.includes('mp4')) {
    confidence = confidence === 'low' ? 'medium' : 'high';
  }

  return {
    estimatedSeconds,
    estimatedMinutes,
    confidence,
  };
}
