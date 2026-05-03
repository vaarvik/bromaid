import Link from 'next/link';

const wrapStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  margin: '20px 0 28px',
  padding: '14px 18px',
  border: '1px solid rgba(120,170,255,0.25)',
  borderRadius: 10,
  background:
    'linear-gradient(135deg, rgba(120,170,255,0.08) 0%, rgba(120,170,255,0.03) 100%)',
} as const;

const textStyle = {
  fontSize: 14,
  lineHeight: 1.4,
  color: '#e7edf7',
} as const;

const buttonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  borderRadius: 6,
  background: '#9ec5ff',
  color: '#0b0f17',
  fontSize: 14,
  fontWeight: 600,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
} as const;

export function TryCta({
  label = 'Try bromaid in the live playground',
  cta = 'Open playground →',
}: {
  readonly label?: string;
  readonly cta?: string;
}) {
  return (
    <aside aria-label="Call to action" style={wrapStyle}>
      <div style={textStyle}>{label}</div>
      <Link href="/" style={buttonStyle}>
        {cta}
      </Link>
    </aside>
  );
}
