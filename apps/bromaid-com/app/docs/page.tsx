import { marked } from 'marked';
import Link from 'next/link';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const metadata = {
  title: 'bromaids — docs',
  description:
    'Install instructions and overview for bromaid, the diagrams-as-code TypeScript toolkit.',
};

export const dynamic = 'force-static';

const README_PATH = resolve(process.cwd(), '../../README.md');

const pageStyle = {
  maxWidth: 860,
  margin: '0 auto',
  padding: '40px 20px 80px',
  lineHeight: 1.6,
  fontSize: 15,
  color: '#e6e7e8',
} as const;

const linkStyle = {
  color: '#9ec5ff',
  textDecoration: 'underline',
  textUnderlineOffset: 2,
} as const;

export default async function DocsPage() {
  const source = await readFile(README_PATH, 'utf8');
  const html = await marked.parse(source, { async: true, gfm: true });

  return (
    <main style={pageStyle}>
      <Link href="/" style={linkStyle}>
        ← Back to playground
      </Link>
      <div className="bromaid-spec" dangerouslySetInnerHTML={{ __html: html }} />
      <style>{`
        .bromaid-spec h1 { font-size: 28px; margin: 24px 0 12px; }
        .bromaid-spec h2 { font-size: 21px; margin: 32px 0 10px; border-bottom: 1px solid #2c2f31; padding-bottom: 6px; }
        .bromaid-spec h3 { font-size: 17px; margin: 24px 0 8px; }
        .bromaid-spec p, .bromaid-spec li { color: #d6d7d8; }
        .bromaid-spec a { color: #9ec5ff; text-decoration: underline; text-underline-offset: 2px; }
        .bromaid-spec code { background: #1f2223; padding: 2px 5px; border-radius: 3px; font-size: 0.9em; color: #e6db74; }
        .bromaid-spec pre { background: #1f2223; padding: 12px; border-radius: 6px; overflow-x: auto; }
        .bromaid-spec pre code { background: transparent; padding: 0; color: #f8f8f2; }
        .bromaid-spec table { border-collapse: collapse; margin: 12px 0; width: 100%; font-size: 14px; }
        .bromaid-spec th, .bromaid-spec td { border: 1px solid #2c2f31; padding: 6px 10px; text-align: left; vertical-align: top; }
        .bromaid-spec th { background: #1f2223; }
        .bromaid-spec blockquote { border-left: 3px solid #66d9ef; margin: 12px 0; padding: 4px 12px; color: #b9bbbd; background: #1a1d1e; }
        .bromaid-spec ul { padding-left: 22px; }
      `}</style>
    </main>
  );
}
