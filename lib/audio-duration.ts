// =====================================================
// AUDIO DURATION ESTIMATION UTILITY
// Server-side duration estimation for audio files
// =====================================================

/**
 * Estimate audio duration from file size and bitrate
 * This provides a reasonable estimate before actual transcription
 */
export function estimateAudioDuration(
  fileSize: number,
  mimeType: string
): { estimatedSeconds: number; estimatedMinutes: number; confidence: 'high' | 'medium' | 'low' } {
  // Common audio bitrates (in bits per second)
  // These are typical values for different formats
  const bitrates: Record<string, { typical: number; min: number; max: number }> = {
    'audio/mpeg': { typical: 128000, min: 96000, max: 320000 }, // MP3
    'audio/mp3': { typical: 128000, min: 96000, max: 320000 },
    'audio/mp4': { typical: 128000, min: 96000, max: 256000 }, // M4A/AAC
    'audio/x-m4a': { typical: 128000, min: 96000, max: 256000 },
    'audio/m4a': { typical: 128000, min: 96000, max: 256000 },
    'audio/wav': { typical: 1411000, min: 705600, max: 1411000 }, // WAV (44.1kHz, 16-bit, stereo)
    'audio/x-wav': { typical: 1411000, min: 705600, max: 1411000 },
    'audio/wave': { typical: 1411000, min: 705600, max: 1411000 },
    'audio/webm': { typical: 128000, min: 64000, max: 192000 }, // WebM/Opus
    'audio/ogg': { typical: 160000, min: 96000, max: 320000 }, // OGG Vorbis
    'audio/flac': { typical: 800000, min: 600000, max: 1200000 }, // FLAC
  };

  // Get bitrate info for the mime type
  const bitrateInfo = bitrates[mimeType.toLowerCase()] || bitrates['audio/mpeg']; // Default to MP3 rates

  // Calculate duration using typical bitrate
  const fileSizeInBits = fileSize * 8;
  const estimatedSeconds = Math.round(fileSizeInBits / bitrateInfo.typical);
  const estimatedMinutes = Math.ceil(estimatedSeconds / 60);

  // Calculate min/max possible durations for confidence
  const maxDurationSeconds = fileSizeInBits / bitrateInfo.min;
  const minDurationSeconds = fileSizeInBits / bitrateInfo.max;

  // Determine confidence based on variance
  let confidence: 'high' | 'medium' | 'low';
  const variance = (maxDurationSeconds - minDurationSeconds) / estimatedSeconds;

  if (variance < 0.3) {
    confidence = 'high';
  } else if (variance < 0.6) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  // For speech/call recordings, we can be more confident as they typically use consistent bitrates
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
 * Validate if estimated duration would exceed available minutes
 * Returns detailed information about the validation result
 */
export function validateDurationAgainstLimit(
  estimatedMinutes: number,
  availableMinutes: number,
  planType: string
): {
  allowed: boolean;
  reason?: string;
  estimatedMinutes: number;
  availableMinutes: number;
  overageMinutes: number;
  requiresUpgrade: boolean;
} {
  const overageMinutes = Math.max(0, estimatedMinutes - availableMinutes);

  if (estimatedMinutes <= availableMinutes) {
    return {
      allowed: true,
      estimatedMinutes,
      availableMinutes,
      overageMinutes: 0,
      requiresUpgrade: false
    };
  }

  // File would exceed available minutes
  return {
    allowed: false,
    reason: `This ${estimatedMinutes}-minute recording would exceed your available ${availableMinutes} minutes by ${overageMinutes} minutes. Please upgrade your plan or purchase additional minutes.`,
    estimatedMinutes,
    availableMinutes,
    overageMinutes,
    requiresUpgrade: true
  };
}

/**
 * Get a user-friendly message for duration validation
 */
export function getDurationValidationMessage(
  estimatedMinutes: number,
  availableMinutes: number,
  planType: string,
  confidence: 'high' | 'medium' | 'low'
): string {
  const prefix = confidence === 'high'
    ? `This recording is approximately ${estimatedMinutes} minutes long`
    : confidence === 'medium'
    ? `This recording appears to be around ${estimatedMinutes} minutes long`
    : `This recording is estimated at ${estimatedMinutes} minutes`;

  if (estimatedMinutes > availableMinutes) {
    const overage = estimatedMinutes - availableMinutes;
    if (availableMinutes === 0) {
      return `${prefix}. You have no minutes remaining this month. Please upgrade your plan or purchase an overage pack to continue.`;
    }
    return `${prefix}, but you only have ${availableMinutes} minutes remaining. This would exceed your limit by ${overage} minutes. Please upgrade your plan or purchase additional minutes.`;
  }

  const remaining = availableMinutes - estimatedMinutes;
  if (remaining < 5) {
    return `${prefix}. After processing, you'll have only ${remaining} minute${remaining === 1 ? '' : 's'} left this month.`;
  }

  return `${prefix}. You have ${availableMinutes} minutes available.`;
}

/**
 * Calculate the cost of overage if the file were to be processed
 */
export function calculateOverageCost(
  estimatedMinutes: number,
  availableMinutes: number,
  pricePerMinute: number = 0.02
): {
  overageMinutes: number;
  overageCost: number;
  totalCost: string;
} {
  const overageMinutes = Math.max(0, estimatedMinutes - availableMinutes);
  const overageCost = overageMinutes * pricePerMinute;

  return {
    overageMinutes,
    overageCost,
    totalCost: `$${overageCost.toFixed(2)}`
  };
}