/**
 * Centralized Application Configuration
 * Phase 5.2 - Extract Configuration to Environment
 *
 * This file centralizes all configuration values and magic numbers
 * that were previously scattered throughout the codebase.
 */

// Helper function to parse environment variables
const parseEnvNumber = (value: string | undefined, defaultValue: number): number => {
  const parsed = parseInt(value || '', 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

const parseEnvBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
};

export const config = {
  // Application Settings
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'CallIQ',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    environment: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
  },

  // API Configuration
  api: {
    version: process.env.API_VERSION || 'v1',
    baseUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
    timeout: parseEnvNumber(process.env.API_TIMEOUT, 30000), // 30 seconds
  },

  // Upload Configuration
  uploads: {
    maxFileSize: parseEnvNumber(process.env.MAX_FILE_SIZE, 500 * 1024 * 1024), // 500MB default
    maxFileSizeMB: parseEnvNumber(process.env.MAX_FILE_SIZE_MB, 500),
    timeout: parseEnvNumber(process.env.UPLOAD_TIMEOUT, 300000), // 5 minutes
    allowedMimeTypes: (process.env.ALLOWED_MIME_TYPES || 'audio/mp3,audio/mpeg,audio/wav,audio/webm,audio/ogg,video/mp4,video/webm').split(','),
    chunkSize: parseEnvNumber(process.env.UPLOAD_CHUNK_SIZE, 1024 * 1024), // 1MB chunks
    maxConcurrentUploads: parseEnvNumber(process.env.MAX_CONCURRENT_UPLOADS, 3),
  },

  // Pagination Configuration
  pagination: {
    defaultPageSize: parseEnvNumber(process.env.DEFAULT_PAGE_SIZE, 10),
    maxPageSize: parseEnvNumber(process.env.MAX_PAGE_SIZE, 100),
    callsPerPage: parseEnvNumber(process.env.CALLS_PER_PAGE, 10),
  },

  // Rate Limiting Configuration
  rateLimit: {
    windowMs: parseEnvNumber(process.env.RATE_LIMIT_WINDOW, 60000), // 1 minute
    maxRequests: parseEnvNumber(process.env.RATE_LIMIT_MAX, 100),
    maxRequestsPerMinute: parseEnvNumber(process.env.RATE_LIMIT_PER_MINUTE, 60),
    uploadLimit: parseEnvNumber(process.env.UPLOAD_RATE_LIMIT, 10), // max uploads per hour
    apiKeyLimit: parseEnvNumber(process.env.API_KEY_RATE_LIMIT, 1000), // for partner API
  },

  // Processing Configuration
  processing: {
    maxRetries: parseEnvNumber(process.env.MAX_PROCESSING_RETRIES, 3),
    retryDelay: parseEnvNumber(process.env.RETRY_DELAY_MS, 5000),
    processingTimeout: parseEnvNumber(process.env.PROCESSING_TIMEOUT, 600000), // 10 minutes
    batchSize: parseEnvNumber(process.env.PROCESSING_BATCH_SIZE, 5),
    maxConcurrentJobs: parseEnvNumber(process.env.MAX_CONCURRENT_JOBS, 3),
  },

  // Usage and Quotas
  quotas: {
    freeMinutes: parseEnvNumber(process.env.FREE_PLAN_MINUTES, 30),
    soloMinutes: parseEnvNumber(process.env.SOLO_PLAN_MINUTES, 500),
    teamMinutes: parseEnvNumber(process.env.TEAM_PLAN_MINUTES, 2000),
    enterpriseMinutes: parseEnvNumber(process.env.ENTERPRISE_PLAN_MINUTES, 10000),
    reservationTimeout: parseEnvNumber(process.env.RESERVATION_TIMEOUT, 3600000), // 1 hour
    overageRatePerMinute: parseEnvNumber(process.env.OVERAGE_RATE_CENTS, 10), // cents
  },

  // Team Configuration
  teams: {
    maxMembersFree: parseEnvNumber(process.env.MAX_MEMBERS_FREE, 1),
    maxMembersSolo: parseEnvNumber(process.env.MAX_MEMBERS_SOLO, 1),
    maxMembersTeam: parseEnvNumber(process.env.MAX_MEMBERS_TEAM, 5),
    maxMembersEnterprise: parseEnvNumber(process.env.MAX_MEMBERS_ENTERPRISE, 999),
    invitationExpiryDays: parseEnvNumber(process.env.INVITATION_EXPIRY_DAYS, 7),
  },

  // Transcription Configuration
  transcription: {
    minConfidenceScore: parseEnvNumber(process.env.MIN_CONFIDENCE_SCORE, 70),
    lowConfidenceThreshold: parseEnvNumber(process.env.LOW_CONFIDENCE_THRESHOLD, 50),
    autoApprovalThreshold: parseEnvNumber(process.env.AUTO_APPROVAL_THRESHOLD, 90),
    maxTranscriptionLength: parseEnvNumber(process.env.MAX_TRANSCRIPTION_LENGTH, 100000),
  },

  // Data Extraction
  extraction: {
    maxFieldsPerCall: parseEnvNumber(process.env.MAX_FIELDS_PER_CALL, 50),
    maxFieldValueLength: parseEnvNumber(process.env.MAX_FIELD_VALUE_LENGTH, 1000),
    lowConfidenceFieldThreshold: parseEnvNumber(process.env.LOW_CONFIDENCE_FIELD_THRESHOLD, 60),
    maxExtractionRetries: parseEnvNumber(process.env.MAX_EXTRACTION_RETRIES, 2),
  },

  // Referral System
  referrals: {
    tier1Threshold: parseEnvNumber(process.env.REFERRAL_TIER1_THRESHOLD, 3),
    tier2Threshold: parseEnvNumber(process.env.REFERRAL_TIER2_THRESHOLD, 10),
    tier3Threshold: parseEnvNumber(process.env.REFERRAL_TIER3_THRESHOLD, 25),
    tier1Minutes: parseEnvNumber(process.env.REFERRAL_TIER1_MINUTES, 100),
    tier2Minutes: parseEnvNumber(process.env.REFERRAL_TIER2_MINUTES, 300),
    tier3Minutes: parseEnvNumber(process.env.REFERRAL_TIER3_MINUTES, 1000),
    expiryDays: parseEnvNumber(process.env.REFERRAL_EXPIRY_DAYS, 90),
  },

  // Partner System
  partners: {
    defaultCommissionRate: parseEnvNumber(process.env.DEFAULT_COMMISSION_RATE, 20), // percentage
    tierBronzeRate: parseEnvNumber(process.env.TIER_BRONZE_RATE, 20),
    tierSilverRate: parseEnvNumber(process.env.TIER_SILVER_RATE, 25),
    tierGoldRate: parseEnvNumber(process.env.TIER_GOLD_RATE, 30),
    minPayoutAmount: parseEnvNumber(process.env.MIN_PAYOUT_AMOUNT, 10000), // cents ($100)
    payoutDelayDays: parseEnvNumber(process.env.PAYOUT_DELAY_DAYS, 30),
  },

  // Security Configuration
  security: {
    sessionTimeout: parseEnvNumber(process.env.SESSION_TIMEOUT, 86400000), // 24 hours
    refreshTokenExpiry: parseEnvNumber(process.env.REFRESH_TOKEN_EXPIRY, 604800000), // 7 days
    maxLoginAttempts: parseEnvNumber(process.env.MAX_LOGIN_ATTEMPTS, 5),
    lockoutDuration: parseEnvNumber(process.env.LOCKOUT_DURATION, 900000), // 15 minutes
    passwordMinLength: parseEnvNumber(process.env.PASSWORD_MIN_LENGTH, 8),
    requireMFA: parseEnvBoolean(process.env.REQUIRE_MFA, false),
  },

  // GDPR and Data Retention
  gdpr: {
    dataExportTimeout: parseEnvNumber(process.env.DATA_EXPORT_TIMEOUT, 86400000), // 24 hours
    deletionGracePeriod: parseEnvNumber(process.env.DELETION_GRACE_PERIOD, 2592000000), // 30 days
    retentionDaysFree: parseEnvNumber(process.env.RETENTION_DAYS_FREE, 30),
    retentionDaysPaid: parseEnvNumber(process.env.RETENTION_DAYS_PAID, 365),
    retentionDaysEnterprise: parseEnvNumber(process.env.RETENTION_DAYS_ENTERPRISE, 730), // 2 years
    anonymizationDelay: parseEnvNumber(process.env.ANONYMIZATION_DELAY, 7776000000), // 90 days
  },

  // Notification Settings
  notifications: {
    emailEnabled: parseEnvBoolean(process.env.NOTIFICATIONS_EMAIL_ENABLED, true),
    maxNotificationsPerUser: parseEnvNumber(process.env.MAX_NOTIFICATIONS_PER_USER, 100),
    cleanupAfterDays: parseEnvNumber(process.env.NOTIFICATION_CLEANUP_DAYS, 30),
    batchSize: parseEnvNumber(process.env.NOTIFICATION_BATCH_SIZE, 50),
  },

  // Performance Settings
  performance: {
    dbConnectionPoolSize: parseEnvNumber(process.env.DB_POOL_SIZE, 10),
    cacheEnabled: parseEnvBoolean(process.env.CACHE_ENABLED, true),
    cacheTTL: parseEnvNumber(process.env.CACHE_TTL, 300000), // 5 minutes
    queryTimeout: parseEnvNumber(process.env.QUERY_TIMEOUT, 30000), // 30 seconds
    slowQueryThreshold: parseEnvNumber(process.env.SLOW_QUERY_THRESHOLD, 1000), // 1 second
  },

  // External Services
  services: {
    assemblyAI: {
      apiKey: process.env.ASSEMBLYAI_API_KEY || '',
      webhookUrl: process.env.ASSEMBLYAI_WEBHOOK_URL || '',
      timeout: parseEnvNumber(process.env.ASSEMBLYAI_TIMEOUT, 300000),
      maxRetries: parseEnvNumber(process.env.ASSEMBLYAI_MAX_RETRIES, 3),
    },
    openAI: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-4',
      maxTokens: parseEnvNumber(process.env.OPENAI_MAX_TOKENS, 2000),
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.3'),
    },
    paddle: {
      vendorId: process.env.PADDLE_VENDOR_ID || '',
      apiKey: process.env.PADDLE_API_KEY || '',
      publicKey: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || '',
      sandbox: parseEnvBoolean(process.env.PADDLE_SANDBOX, false),
      webhookSecret: process.env.PADDLE_WEBHOOK_SECRET || '',
    },
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    },
    resend: {
      apiKey: process.env.RESEND_API_KEY || '',
      fromEmail: process.env.RESEND_FROM_EMAIL || 'noreply@calliq.com',
      replyToEmail: process.env.RESEND_REPLY_TO || 'support@calliq.com',
    },
  },

  // Feature Flags
  features: {
    enablePartnerProgram: parseEnvBoolean(process.env.FEATURE_PARTNER_PROGRAM, true),
    enableReferrals: parseEnvBoolean(process.env.FEATURE_REFERRALS, true),
    enableGDPR: parseEnvBoolean(process.env.FEATURE_GDPR, true),
    enableAutoApproval: parseEnvBoolean(process.env.FEATURE_AUTO_APPROVAL, true),
    enableBulkUpload: parseEnvBoolean(process.env.FEATURE_BULK_UPLOAD, false),
    enableAdvancedAnalytics: parseEnvBoolean(process.env.FEATURE_ADVANCED_ANALYTICS, false),
    enableCustomTemplates: parseEnvBoolean(process.env.FEATURE_CUSTOM_TEMPLATES, true),
    maintenanceMode: parseEnvBoolean(process.env.MAINTENANCE_MODE, false),
  },
};

// Type-safe config getter
export function getConfig<T extends keyof typeof config>(section: T): typeof config[T] {
  return config[section];
}

// Validate required configuration
export function validateConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required API keys
  if (!config.services.supabase.url) errors.push('NEXT_PUBLIC_SUPABASE_URL is required');
  if (!config.services.supabase.anonKey) errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
  if (config.app.isProduction) {
    if (!config.services.assemblyAI.apiKey) errors.push('ASSEMBLYAI_API_KEY is required in production');
    if (!config.services.openAI.apiKey) errors.push('OPENAI_API_KEY is required in production');
    if (!config.services.paddle.apiKey) errors.push('PADDLE_API_KEY is required in production');
    if (!config.services.resend.apiKey) errors.push('RESEND_API_KEY is required in production');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export default config;