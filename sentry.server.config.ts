// This file configures the initialization of Sentry on the server side.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Environment
  environment: process.env.NODE_ENV || "development",

  // Release tracking
  release: process.env.SENTRY_RELEASE || process.env.NEXT_PUBLIC_SENTRY_RELEASE,

  // Server-specific integrations
  integrations: [],

  // Filtering
  beforeSend(event, hint) {
    // Filter out specific errors
    if (event.exception) {
      const error = hint.originalException;

      // Filter out known non-critical errors
      const ignoredErrors = [
        "ECONNRESET",
        "ECONNREFUSED",
        "ETIMEDOUT",
        "ENOTFOUND",
        "Invalid refresh token",
        "User not found"
      ];

      const errorMessage = error instanceof Error ? error.message : "";
      if (ignoredErrors.some(ignored => errorMessage.includes(ignored))) {
        return null;
      }
    }

    // Add additional context
    event.extra = {
      ...event.extra,
      nodeVersion: process.version,
      platform: process.platform,
      memoryUsage: process.memoryUsage(),
    };

    return event;
  },

  // Ignore specific transactions
  ignoreTransactions: [
    "/api/health",
    "/api/metrics",
    "/_next/static",
    "/favicon.ico"
  ],

  // Configure sampling for performance monitoring
  tracesSampler: (samplingContext) => {
    // Drop all health check transactions
    if (samplingContext.transactionContext.name === "/api/health") {
      return 0;
    }

    // Sample 100% of critical business transactions in production
    const criticalTransactions = [
      "/api/calls/upload",
      "/api/payments/webhook",
      "/api/auth/signup",
      "/api/teams/invite"
    ];

    if (process.env.NODE_ENV === "production" &&
        criticalTransactions.includes(samplingContext.transactionContext.name)) {
      return 1.0;
    }

    // Default sampling rate
    return process.env.NODE_ENV === "production" ? 0.1 : 1.0;
  },
});