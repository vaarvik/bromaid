'use client';

import type { CSSProperties } from 'react';

import { useConsent } from '../_lib/consent';

const rowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  alignItems: 'center',
  marginTop: 12,
};

const buttonStyle: CSSProperties = {
  padding: '8px 14px',
  borderRadius: 6,
  border: '1px solid rgba(255,255,255,0.16)',
  background: 'transparent',
  color: '#e7edf7',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

const acceptStyle: CSSProperties = {
  ...buttonStyle,
  background: '#3b82f6',
  borderColor: '#3b82f6',
  color: '#ffffff',
};

const statusStyle: CSSProperties = {
  fontSize: 13,
  opacity: 0.8,
};

function describeStatus(status: 'unset' | 'granted' | 'denied'): string {
  if (status === 'granted') return 'Analytics: enabled';
  if (status === 'denied') return 'Analytics: declined';
  return 'Analytics: no decision yet';
}

export function ConsentControls() {
  const { consent, grant, deny, revoke } = useConsent();

  return (
    <div>
      <div style={statusStyle}>
        {describeStatus(consent.status)}
        {consent.decidedAt !== null
          ? ` (decided ${new Date(consent.decidedAt).toLocaleString()})`
          : ''}
      </div>
      <div style={rowStyle}>
        {consent.status !== 'granted' ? (
          <button type="button" style={acceptStyle} onClick={grant}>
            Enable analytics
          </button>
        ) : null}
        {consent.status !== 'denied' ? (
          <button type="button" style={buttonStyle} onClick={deny}>
            Disable analytics
          </button>
        ) : null}
        {consent.status !== 'unset' ? (
          <button type="button" style={buttonStyle} onClick={revoke}>
            Reset choice
          </button>
        ) : null}
      </div>
    </div>
  );
}
