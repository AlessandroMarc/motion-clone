// A faulty API route to test Sentry's error monitoring
export default function handler(_req, res) {
  try {
    throw new Error('Sentry Example API Route Error');
  } catch (error) {
    // Optionally capture the error with Sentry here
    // Sentry.captureException(error);
    res.status(500).json({ error: error.message });
  }
}
