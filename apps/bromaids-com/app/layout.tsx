import type { Metadata, Viewport } from 'next';
import { Suspense, type ReactNode } from 'react';

import { ConsentBanner } from './_components/consent-banner';
import { JsonLd } from './_components/json-ld';
import { PageviewTracker } from './_components/pageview-tracker';
import { ConsentProvider } from './_lib/consent';
import {
  siteAuthor,
  siteDescription,
  siteKeywords,
  siteLocale,
  siteName,
  siteRepo,
  siteTagline,
  siteThemeColor,
  siteUrl,
} from './_lib/site';
import {
  organizationLd,
  softwareApplicationLd,
  websiteLd,
} from './_lib/structured-data';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} — ${siteTagline}`,
    template: `%s — ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  generator: 'Next.js',
  keywords: siteKeywords,
  authors: [{ name: siteAuthor.name, url: siteAuthor.url }],
  creator: siteAuthor.name,
  publisher: siteAuthor.name,
  category: 'technology',
  referrer: 'strict-origin-when-cross-origin',
  formatDetection: { email: false, address: false, telephone: false },
  alternates: {
    canonical: '/',
    types: {
      'text/plain': [
        { url: '/llms.txt', title: 'llms.txt' },
        { url: '/llms-full.txt', title: 'llms-full.txt' },
      ],
    },
  },
  openGraph: {
    type: 'website',
    locale: siteLocale,
    url: siteUrl,
    siteName,
    title: `${siteName} — ${siteTagline}`,
    description: siteDescription,
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: `${siteName} — ${siteTagline}`,
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteName} — ${siteTagline}`,
    description: siteDescription,
    images: ['/opengraph-image'],
    creator: '@vaarvik',
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/icon', type: 'image/png', sizes: '32x32' },
      { url: '/icon', type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: '/apple-icon', type: 'image/png', sizes: '180x180' }],
    shortcut: ['/icon'],
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: siteName,
    statusBarStyle: 'black-translucent',
  },
  other: {
    'github:repo': siteRepo,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: siteThemeColor },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
  colorScheme: 'dark light',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <link rel="preconnect" href="https://eu.i.posthog.com" />
      </head>
      <body
        style={{
          margin: 0,
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
          background: '#0b0f17',
          color: '#e7edf7',
        }}
      >
        <JsonLd id="ld-organization" data={organizationLd()} />
        <JsonLd id="ld-website" data={websiteLd()} />
        <JsonLd id="ld-software" data={softwareApplicationLd()} />
        <ConsentProvider>
          <Suspense fallback={null}>
            <PageviewTracker />
          </Suspense>
          {children}
          <ConsentBanner />
        </ConsentProvider>
      </body>
    </html>
  );
}
