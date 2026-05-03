import { ImageResponse } from 'next/og';

export const alt = 'bromaid — diagrams-as-code for TypeScript';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 80,
          backgroundColor: '#0b0f17',
          backgroundImage:
            'radial-gradient(circle at 20% 20%, #1a2540 0%, #0b0f17 60%)',
          color: '#e7edf7',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 18,
              background: 'linear-gradient(135deg, #9ec5ff 0%, #4a7dff 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0b0f17',
              fontSize: 64,
              fontWeight: 800,
              letterSpacing: '-0.04em',
            }}
          >
            b
          </div>
          <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.02em' }}>
            bromaid
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.05,
              color: '#ffffff',
              maxWidth: 1000,
            }}
          >
            Diagrams-as-code for TypeScript
          </div>
          <div
            style={{
              fontSize: 30,
              color: '#9ec5ff',
              opacity: 0.92,
              maxWidth: 980,
              lineHeight: 1.3,
            }}
          >
            Parse a tiny DSL, get an SVG string. Pure functions, zero DOM. Runs in Node, Bun, Deno, Workers, and RSC.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 22,
            color: '#9ec5ff',
            opacity: 0.85,
          }}
        >
          <div style={{ display: 'flex', gap: 24 }}>
            <span>parse → layout → renderSVG</span>
          </div>
          <div>bromaid.com</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
