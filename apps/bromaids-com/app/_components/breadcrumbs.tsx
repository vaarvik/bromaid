import Link from 'next/link';

export type Crumb = { readonly name: string; readonly path: string };

const navStyle = {
  margin: '0 0 16px',
  fontSize: 13,
} as const;

const listStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
  alignItems: 'center',
  padding: 0,
  margin: 0,
  listStyle: 'none',
} as const;

const linkStyle = {
  color: '#9ec5ff',
  textDecoration: 'underline',
  textUnderlineOffset: 2,
} as const;

const sepStyle = {
  opacity: 0.45,
  userSelect: 'none',
} as const;

const currentStyle = {
  opacity: 0.7,
} as const;

export function Breadcrumbs({ crumbs }: { readonly crumbs: readonly Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" style={navStyle}>
      <ol style={listStyle}>
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <li key={c.path} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              {isLast ? (
                <span aria-current="page" style={currentStyle}>
                  {c.name}
                </span>
              ) : (
                <Link href={c.path} style={linkStyle}>
                  {c.name}
                </Link>
              )}
              {!isLast ? (
                <span aria-hidden="true" style={sepStyle}>
                  ›
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
