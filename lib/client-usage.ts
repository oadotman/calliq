// =====================================================
// CLIENT-SIDE USAGE TRACKING
// Fetch current usage and available minutes for the client
// =====================================================

import { createClient } from '@/lib/supabase/client';

export interface UsageInfo {
  minutesUsed: number;
  totalAvailableMinutes: number;
  remainingMinutes: number;
  baseMinutes: number;
  purchasedOverageMinutes: number;
  hasOverage: boolean;
  canUpload: boolean;
  planType: string;
}

/**
 * Fetch current usage information for the user's organization
 */
export async function fetchCurrentUsage(): Promise<UsageInfo | null> {
  try {
    const supabase = createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Get user's organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!membership) return null;

    // Get organization details
    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', membership.organization_id)
      .single();

    if (!org) return null;

    // Calculate current period
    const now = new Date();
    const periodStart = org.current_period_start || new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const periodEnd = org.current_period_end || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    // Fetch usage API to get detailed usage info
    const response = await fetch('/api/usage', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch usage:', response.statusText);
      return null;
    }

    const usageData = await response.json();

    return {
      minutesUsed: usageData.minutesUsed || 0,
      totalAvailableMinutes: usageData.totalAvailableMinutes || org.max_minutes_monthly || 0,
      remainingMinutes: usageData.remainingMinutes || 0,
      baseMinutes: usageData.baseMinutes || org.max_minutes_monthly || 0,
      purchasedOverageMinutes: usageData.purchasedOverageMinutes || 0,
      hasOverage: usageData.hasOverage || false,
      canUpload: usageData.canUpload !== false,
      planType: org.plan_type || 'free',
    };
  } catch (error) {
    console.error('Error fetching usage:', error);
    return null;
  }
}

/**
 * Estimate audio duration from file size (client-side version)
 */
export function estimateAudioDurationClient(
  fileSize: number,
  mimeType: string
): { estimatedSeconds: number; estimatedMinutes: number; confidence: 'high' | 'medium' | 'low' } {
  // Common audio bitrates (in bits per second)
  const bitrates: Record<string, { typical: number; min: number; max: number }> = {
    'audio/mpeg': { typical: 128000, min: 96000, max: 320000 }, // MP3
    'audio/mp3': { typical: 128000, min: 96000, max: 320000 },
    'audio/mp4': { typical: 128000, min: 96000, max: 256000 }, // M4A/AAC
    'audio/x-m4a': { typical: 128000, min: 96000, max: 256000 },
    'audio/m4a': { typical: 128000, min: 96000, max: 256000 },
    'audio/wav': { typical: 1411000, min: 705600, max: 1411000 }, // WAV
    'audio/x-wav': { typical: 1411000, min: 705600, max: 1411000 },
    'audio/wave': { typical: 1411000, min: 705600, max: 1411000 },
    'audio/webm': { typical: 128000, min: 64000, max: 192000 }, // WebM
    'audio/ogg': { typical: 160000, min: 96000, max: 320000 }, // OGG
    'audio/flac': { typical: 800000, min: 600000, max: 1200000 }, // FLAC
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

  // For common formats, increase confidence
  if (mimeType.includes('mp3') || mimeType.includes('m4a') || mimeType.includes('mp4')) {
    confidence = confidence === 'low' ? 'medium' : 'high';
  }

  return {
    estimatedSeconds,
    estimatedMinutes,
    confidence
  };
}

/**
 * Check if a file would exceed available minutes
 */
export function checkDurationLimit(
  estimatedMinutes: number,
  remainingMinutes: number
): {
  allowed: boolean;
  warning?: string;
  error?: string;
  requiresUpgrade: boolean;
} {
  if (remainingMinutes <= 0) {
    return {
      allowed: false,
      error: `You have no minutes remaining this month. This ${estimatedMinutes}-minute recording cannot be processed. Please upgrade your plan or purchase additional minutes.`,
      requiresUpgrade: true
    };
  }

  if (estimatedMinutes > remainingMinutes) {
    const overage = estimatedMinutes - remainingMinutes;
    return {
      allowed: false,
      error: `This ${estimatedMinutes}-minute recording would exceed your ${remainingMinutes} available minutes by ${overage} minutes. Please upgrade your plan or purchase additional minutes before uploading.`,
      requiresUpgrade: true
    };
  }

  if (estimatedMinutes > remainingMinutes * 0.8) {
    // Warning when using more than 80% of remaining minutes
    const afterUpload = remainingMinutes - estimatedMinutes;
    return {
      allowed: true,
      warning: `This ${estimatedMinutes}-minute recording will use most of your remaining minutes. You'll have only ${afterUpload} minute${afterUpload === 1 ? '' : 's'} left this month.`,
      requiresUpgrade: false
    };
  }

  return {
    allowed: true,
    requiresUpgrade: false
  };
}