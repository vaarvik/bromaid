import type { AnalyticsClient } from './client';

/**
 * No-op analytics client. Used when consent is unset/denied, when the
 * PostHog token is missing, and during SSR.
 *
 * Keeping a real object (rather than `null` checks at every call site) lets
 * callers always do `analytics.track(...)` without nullable plumbing.
 */
export const noopAnalyticsClient: AnalyticsClient = {
  track: () => {},
  pageview: () => {},
  identify: () => {},
  reset: () => {},
};
