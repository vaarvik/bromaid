import type { ReactNode } from 'react';

export const metadata = {
  title: 'bromaid — playground',
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
        {children}
      </body>
    </html>
  );
}
