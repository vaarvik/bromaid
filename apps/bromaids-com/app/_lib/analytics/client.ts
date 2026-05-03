import type { EventName, EventProperties } from './events';

/**
 * Common interface implemented by every analytics provider (posthog, noop, ...).
 *
 * The interface is intentionally narrow:
 *   - `track`   – capture a typed event
 *   - `pageview` – capture a pageview for the current URL
 *   - `identify` – associate the current session with a stable user id
 *   - `reset`    – clear identity / opt out (used when consent is revoked)
 */
export interface AnalyticsClient {
  readonly track: <K extends EventName>(name: K, properties: EventProperties<K>) => void;
  readonly pageview: (path: string) => void;
  readonly identify: (distinctId: string, properties?: Readonly<Record<string, string | number | boolean>>) => void;
  readonly reset: () => void;
}
