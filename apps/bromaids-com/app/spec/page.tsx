import type { Metadata } from 'next';
import { marked } from 'marked';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { Breadcrumbs } from '../_components/breadcrumbs';
import { JsonLd } from '../_components/json-ld';
import { TryCta } from '../_components/try-cta';
import { siteName } from '../_lib/site';
import { breadcrumbLd, techArticleLd, webPageLd } from '../_lib/structured-data';

const specTitle = `${siteName} DSL specification — canonical reference`;
const specDescription =
  'Canonical reference for the bromaid diagrams-as-code DSL. Auto-generated from the parser schema. Covers grammar, statements, attributes, edges, groups, and rendering semantics.';

export const metadata: Metadata = {
  title: 'DSL specification',
  description: specDescription,
  alternates: { canonical: '/spec' },
  openGraph: {
    title: specTitle,
    description: specDescription,
    url: '/spec',
    type: 'article',
  },
  twitter: {
    title: specTitle,
    description: specDescription,
  },
};

export const dynamic = 'force-static';

const SPEC_PATH = resolve(process.cwd(), '../../SPEC.md');

const pageStyle = {
  maxWidth: 860,
  margin: '0 auto',
  padding: '40px 20px 80px',
  lineHeight: 1.6,
  fontSize: 15,
  color: '#e6e7e8',
} as const;

const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'Spec', path: '/spec' },
];

export default async function SpecPage() {
  const source = await readFile(SPEC_PATH, 'utf8');
  const html = await marked.parse(source, { async: true, gfm: true });

  return (
    <main style={pageStyle}>
      <JsonLd
        id="ld-page-spec"
        data={webPageLd({ name: specTitle, description: specDescription, path: '/spec' })}
      />
      <JsonLd
        id="ld-article-spec"
        data={techArticleLd({
          headline: specTitle,
          description: specDescription,
          path: '/spec',
          section: 'Specification',
        })}
      />
      <JsonLd id="ld-breadcrumb-spec" data={breadcrumbLd(crumbs)} />
      <Breadcrumbs crumbs={crumbs} />
      <TryCta label="See the spec in action — open the playground and edit a live diagram." />
      <article
        className="bromaid-spec"
        itemScope
        itemType="https://schema.org/TechArticle"
        dangerouslySetInnerHTML={{ __html: html }}
      />
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
