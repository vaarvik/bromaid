import type { ReactNode } from 'react';

export const metadata = {
  title: 'bromaid — RSC smoke test',
  description: 'Verifies that all four bromaid Phase 1 packages run inside a React Server Component.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>{children}</body>
    </html>
  );
}
