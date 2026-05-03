'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  type AnalyticsClient,
  createPostHogAnalyticsClient,
  noopAnalyticsClient,
  readPostHogEnv,
  shutdownPostHog,
} from '../analytics';
import { clearConsent, initialConsent, readConsent, writeConsent } from './storage';
import type { ConsentRecord } from './types';

type ConsentContextValue = {
  readonly consent: ConsentRecord;
  readonly analytics: AnalyticsClient;
  readonly grant: () => void;
  readonly deny: () => void;
  readonly revoke: () => void;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

export function ConsentProvider({ children }: { readonly children: ReactNode }) {
  const [consent, setConsent] = useState<ConsentRecord>(initialConsent);
  const [hydrated, setHydrated] = useState(false);

  // Lazily create the PostHog client, but only once consent is granted.
  // Once created we keep the same instance so React identity is stable.
  const posthogClientRef = useRef<AnalyticsClient | null>(null);

  useEffect(() => {
    setConsent(readConsent());
    setHydrated(true);
  }, []);

  const analytics = useMemo<AnalyticsClient>(() => {
    if (!hydrated) return noopAnalyticsClient;
    if (consent.status !== 'granted') return noopAnalyticsClient;
    const env = readPostHogEnv();
    if (env === null) return noopAnalyticsClient;
    if (posthogClientRef.current === null) {
      posthogClientRef.current = createPostHogAnalyticsClient(env);
    }
    return posthogClientRef.current;
  }, [consent.status, hydrated]);

  const grant = useCallback(() => {
    const next = writeConsent('granted');
    setConsent(next);
  }, []);

  const deny = useCallback(() => {
    const next = writeConsent('denied');
    setConsent(next);
    if (posthogClientRef.current !== null) {
      posthogClientRef.current.reset();
      posthogClientRef.current = null;
    }
    shutdownPostHog();
  }, []);

  const revoke = useCallback(() => {
    clearConsent();
    setConsent(initialConsent);
    if (posthogClientRef.current !== null) {
      posthogClientRef.current.reset();
      posthogClientRef.current = null;
    }
    shutdownPostHog();
  }, []);

  // Fire the consent_* event using the analytics client that exists right
  // *after* the state transition, so a freshly-granted consent gets tracked.
  const previousStatusRef = useRef<ConsentRecord['status']>(initialConsent.status);
  useEffect(() => {
    const previous = previousStatusRef.current;
    if (previous !== consent.status) {
      if (consent.status === 'granted') {
        analytics.track('consent_granted', {});
      } else if (previous === 'granted') {
        analytics.track('consent_revoked', {});
      }
      previousStatusRef.current = consent.status;
    }
  }, [consent.status, analytics]);

  const value = useMemo<ConsentContextValue>(
    () => ({ consent, analytics, grant, deny, revoke }),
    [consent, analytics, grant, deny, revoke],
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

function useConsentContext(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (ctx === null) {
    throw new Error('useConsent / useAnalytics must be used inside <ConsentProvider />');
  }
  return ctx;
}

export function useConsent(): {
  readonly consent: ConsentRecord;
  readonly grant: () => void;
  readonly deny: () => void;
  readonly revoke: () => void;
} {
  const { consent, grant, deny, revoke } = useConsentContext();
  return { consent, grant, deny, revoke };
}

export function useAnalytics(): AnalyticsClient {
  return useConsentContext().analytics;
}
