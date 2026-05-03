const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');

export const siteUrl = envUrl ?? 'https://bromaid.com';

export const siteName = 'bromaid';

export const siteTagline = 'Diagrams-as-code for TypeScript';

export const siteDescription =
  'Open-source TypeScript toolkit for diagrams-as-code. Parse a tiny DSL, get an SVG string. Pure functions, zero DOM. Runs in Node, Bun, Deno, Cloudflare Workers, and React Server Components.';

export const siteShortDescription =
  'Parse a tiny DSL, get an SVG string. Pure functions, zero DOM, runs anywhere.';

export const siteKeywords = [
  'diagrams as code',
  'diagram dsl',
  'svg diagrams',
  'typescript diagrams',
  'react server component diagrams',
  'mermaid alternative',
  'graphviz alternative',
  'architecture diagrams',
  'sequence diagrams',
  'flowchart dsl',
  'bromaid',
  'elk layout',
  'open source diagram tool',
];

export const siteAuthor = {
  name: 'vaarvik',
  url: 'https://github.com/vaarvik',
};

export const siteRepo = 'https://github.com/vaarvik/bromaid';

export const siteLocale = 'en_US';

export const siteThemeColor = '#0b0f17';

export function absoluteUrl(path: string): string {
  if (path.startsWith('http')) return path;
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${siteUrl}${clean}`;
}
