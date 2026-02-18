import * as Sentry from '@sentry/nextjs';
import posthog from 'posthog-js';

const isProduction = process.env.NODE_ENV === 'production';

// Initialize Sentry only in production (skip in local/dev)
if (isProduction) {
  Sentry.init({
    dsn:
      process.env.NEXT_PUBLIC_SENTRY_DSN ??
      'https://6815a3961dcd31df65a61a9cde822d41@o4508002478915584.ingest.de.sentry.io/4510743210688592',
    integrations: [Sentry.replayIntegration()],
    tracesSampleRate: 1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    sendDefaultPii: true,
    debug: false,
    enableLogs: true,
  });
}

// Initialize PostHog for analytics
if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: '/ingest',
    ui_host: 'https://eu.posthog.com',
    defaults: '2025-05-24',
    capture_exceptions: true,
    debug: process.env.NODE_ENV === 'development',
  });
} else if (process.env.NODE_ENV === 'production') {
  console.error(
    'PostHog key is missing in production! Analytics will not be captured.'
  );
} else {
  console.warn('PostHog key is missing. Analytics is disabled in development.');
}

// IMPORTANT: Never combine this approach with other client-side PostHog initialization approaches,
// especially components like a PostHogProvider. instrumentation-client.js is the correct solution
// for initializing client-side PostHog in Next.js 15.3+ apps.

export const onRouterTransitionStart = isProduction
  ? Sentry.captureRouterTransitionStart
  : () => {};
