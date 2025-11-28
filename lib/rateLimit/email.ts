// =====================================================
// EMAIL GENERATION RATE LIMITER
// 10 emails per user per hour
// =====================================================

import { RateLimiter } from '../rateLimit';

// Create rate limiter for email generation
// 10 requests per hour (3600 seconds) per user
export const emailRateLimiter = new RateLimiter({
  interval: 60 * 60 * 1000, // 1 hour
  uniqueTokenPerInterval: 500,
  tokensPerInterval: 10,
});
