'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';

import { useConsent } from '../_lib/consent';

const wrapperStyle: CSSProperties = {
  position: 'fixed',
  left: 12,
  right: 12,
  bottom: 12,
  zIndex: 50,
  display: 'flex',
  justifyContent: 'center',
  pointerEvents: 'none',
};

const cardStyle: CSSProperties = {
  pointerEvents: 'auto',
  maxWidth: 720,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  padding: '14px 16px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(15,21,33,0.92)',
  backdropFilter: 'blur(12px)',
  color: '#e7edf7',
  boxShadow: '0 18px 48px rgba(0,0,0,0.45)',
  fontSize: 13.5,
  lineHeight: 1.5,
};

const buttonRowStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
};

const baseButtonStyle: CSSProperties = {
  padding: '8px 14px',
  borderRadius: 6,
  border: '1px solid rgba(255,255,255,0.16)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  letterSpacing: 0.1,
};

const acceptButtonStyle: CSSProperties = {
  ...baseButtonStyle,
  background: '#3b82f6',
  borderColor: '#3b82f6',
  color: '#ffffff',
};

const declineButtonStyle: CSSProperties = {
  ...baseButtonStyle,
  background: 'transparent',
  color: '#e7edf7',
};

const linkStyle: CSSProperties = {
  color: '#9ec5ff',
  textDecoration: 'underline',
  textUnderlineOffset: 2,
};

export function ConsentBanner() {
  const { consent, grant, deny } = useConsent();

  if (consent.status !== 'unset') return null;

  return (
    <div style={wrapperStyle} role="region" aria-label="Cookie consent">
      <div style={cardStyle}>
        <div>
          <strong style={{ display: 'block', marginBottom: 4 }}>Analytics cookies</strong>
          <span style={{ opacity: 0.85 }}>
            We&apos;d like to use PostHog analytics to understand how the playground is used so
            we can improve it. See our{' '}
            <Link href="/privacy" style={linkStyle}>
              privacy policy
            </Link>{' '}
            for details.
          </span>
        </div>
        <div style={buttonRowStyle}>
          <button type="button" style={declineButtonStyle} onClick={deny}>
            Decline
          </button>
          <button type="button" style={acceptButtonStyle} onClick={grant}>
            Accept analytics
          </button>
        </div>
      </div>
    </div>
  );
}
