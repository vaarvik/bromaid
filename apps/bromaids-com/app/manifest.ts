import type { MetadataRoute } from 'next';

import { siteDescription, siteName, siteTagline, siteThemeColor } from './_lib/site';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteName} — ${siteTagline}`,
    short_name: siteName,
    description: siteDescription,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: siteThemeColor,
    theme_color: siteThemeColor,
    categories: ['developer', 'productivity', 'utilities'],
    lang: 'en',
    dir: 'ltr',
    icons: [
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
