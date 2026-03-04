/**
 * Analytics wrapper that guards PostHog calls in development
 * Only sends events in production to avoid polluting analytics data
 */
import posthog from 'posthog-js';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Safe wrapper for posthog.identify that only runs in production
 */
export function identifyUser(
  distinctId: string,
  properties?: Record<string, unknown>
): void {
  if (!isProduction) return;
  posthog.identify(distinctId, properties);
}

/**
 * Safe wrapper for posthog.capture that only runs in production
 */
export function captureEvent(
  eventName: string,
  properties?: Record<string, unknown>
): void {
  if (!isProduction) return;
  posthog.capture(eventName, properties);
}

/**
 * Safe wrapper for posthog.captureException that only runs in production
 */
export function captureException(
  error: Error | unknown,
  additionalInfo?: Record<string, unknown>
): void {
  if (!isProduction) return;
  posthog.captureException(error, additionalInfo);
}

/**
 * Safe wrapper for posthog.reset that only runs in production
 */
export function resetAnalytics(): void {
  if (!isProduction) return;
  posthog.reset();
}
