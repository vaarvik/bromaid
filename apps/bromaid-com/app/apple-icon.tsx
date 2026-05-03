import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0b0f17 0%, #1a2540 100%)',
          color: '#9ec5ff',
          fontSize: 120,
          fontWeight: 800,
          letterSpacing: '-0.04em',
          fontFamily: 'system-ui, sans-serif',
          borderRadius: 36,
        }}
      >
        b
      </div>
    ),
    { ...size },
  );
}
