// This file configures the initialization of Sentry on the server.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn:
      process.env.SENTRY_DSN ??
      'https://6815a3961dcd31df65a61a9cde822d41@o4508002478915584.ingest.de.sentry.io/4510743210688592',
    tracesSampleRate: 1,
    enableLogs: true,
    debug: false,
    sendDefaultPii: true,
  });
}
