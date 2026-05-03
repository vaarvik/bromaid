import { Suspense, type ReactNode } from 'react';

import { ConsentBanner } from './_components/consent-banner';
import { PageviewTracker } from './_components/pageview-tracker';
import { ConsentProvider } from './_lib/consent';

export const metadata = {
  title: 'bromaids.com — diagrams-as-code playground',
  description: 'Parse and render bromaid diagrams into SVG.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
          background: '#0b0f17',
          color: '#e7edf7',
        }}
      >
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
