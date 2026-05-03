'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import { useAnalytics } from '../_lib/consent';

/**
 * Tracks a `$pageview` event whenever the route or query string changes.
 * Safe to mount unconditionally: when consent is not granted the analytics
 * client is a no-op, so nothing is sent.
 */
export function PageviewTracker() {
  const analytics = useAnalytics();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname === null) return;
    const query = searchParams?.toString() ?? '';
    const path = query.length > 0 ? `${pathname}?${query}` : pathname;
    analytics.pageview(path);
  }, [analytics, pathname, searchParams]);

  return null;
}
