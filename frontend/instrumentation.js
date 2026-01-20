import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn: 'https://6815a3961dcd31df65a61a9cde822d41@o4508002478915584.ingest.de.sentry.io/4510743210688592',
      tracesSampleRate: 1,
      debug: process.env.NODE_ENV === 'development',
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn: 'https://6815a3961dcd31df65a61a9cde822d41@o4508002478915584.ingest.de.sentry.io/4510743210688592',
      tracesSampleRate: 1,
      debug: process.env.NODE_ENV === 'development',
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
