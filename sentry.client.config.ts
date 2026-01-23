// This file configures the initialization of Sentry on the client side.
// The config you add here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  replaysOnErrorSampleRate: 1.0,

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes here
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],

  // Environment
  environment: process.env.NODE_ENV || "development",

  // Release tracking
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

  // Filtering
  beforeSend(event, hint) {
    // Filter out specific errors
    if (event.exception) {
      const error = hint.originalException;

      // Don't send network errors in development
      if (process.env.NODE_ENV === "development" &&
          error instanceof Error &&
          error.message?.includes("fetch")) {
        return null;
      }

      // Filter out known non-critical errors
      const ignoredErrors = [
        "ResizeObserver loop limit exceeded",
        "Non-Error promise rejection captured",
        "Network request failed"
      ];

      const errorMessage = error instanceof Error ? error.message : "";
      if (ignoredErrors.some(ignored => errorMessage.includes(ignored))) {
        return null;
      }
    }

    // Add user context
    if (typeof window !== "undefined") {
      const userId = window.localStorage?.getItem("userId");
      const organizationId = window.localStorage?.getItem("organizationId");

      if (userId || organizationId) {
        event.user = {
          ...event.user,
          id: userId || undefined,
          organizationId
        };
      }
    }

    return event;
  },

  // Ignore specific transactions
  ignoreTransactions: [
    "/api/health",
    "/_next/static",
    "/favicon.ico"
  ],
});