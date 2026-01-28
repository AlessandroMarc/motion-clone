import * as Sentry from '@sentry/nextjs';

const isProduction = process.env.NODE_ENV === 'production';

export async function register() {
  if (!isProduction) return;

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN ?? 'https://6815a3961dcd31df65a61a9cde822d41@o4508002478915584.ingest.de.sentry.io/4510743210688592',
      tracesSampleRate: 1,
      debug: false,
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN ?? 'https://6815a3961dcd31df65a61a9cde822d41@o4508002478915584.ingest.de.sentry.io/4510743210688592',
      tracesSampleRate: 1,
      debug: false,
    });
  }
}

export const onRequestError = isProduction ? Sentry.captureRequestError : () => {};
