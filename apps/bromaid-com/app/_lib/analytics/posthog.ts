import posthog, { type PostHogConfig } from 'posthog-js';

import type { AnalyticsClient } from './client';
import type { EventName, EventProperties } from './events';

type PostHogEnv = {
  readonly token: string;
  readonly host: string;
};

/**
 * Reads PostHog environment variables. Returns `null` when not configured,
 * so we can fall back to the noop client without crashing.
 */
export function readPostHogEnv(): PostHogEnv | null {
  const token = process.env.NEXT_PUBLIC_POSTHOG_TOKEN;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
  if (typeof token !== 'string' || token.length === 0) return null;
  return { token, host };
}

let initialized = false;

/**
 * Lazily initialize the PostHog SDK. Safe to call multiple times.
 *
 * We rely on the caller (the consent provider) to only invoke this once
 * the user has actively granted consent. As an extra defensive layer, we
 * also start with `opt_out_capturing_by_default: true` and explicitly
 * `opt_in_capturing()` after init.
 */
function ensureInitialized(env: PostHogEnv): void {
  if (initialized) return;
  if (typeof window === 'undefined') return;

  const config: Partial<PostHogConfig> = {
    api_host: env.host,
    capture_pageview: false,
    capture_pageleave: true,
    persistence: 'localStorage+cookie',
    opt_out_capturing_by_default: true,
    disable_session_recording: true,
    autocapture: false,
    loaded: (instance) => {
      instance.opt_in_capturing();
    },
  };

  posthog.init(env.token, config);
  initialized = true;
}

export function createPostHogAnalyticsClient(env: PostHogEnv): AnalyticsClient {
  ensureInitialized(env);

  return {
    track: <K extends EventName>(name: K, properties: EventProperties<K>) => {
      posthog.capture(name, { ...properties });
    },
    pageview: (path: string) => {
      posthog.capture('$pageview', { $current_url: path });
    },
    identify: (distinctId, properties) => {
      posthog.identify(distinctId, properties ? { ...properties } : undefined);
    },
    reset: () => {
      posthog.opt_out_capturing();
      posthog.reset();
    },
  };
}

export function shutdownPostHog(): void {
  if (!initialized) return;
  if (typeof window === 'undefined') return;
  posthog.opt_out_capturing();
  posthog.reset();
}
