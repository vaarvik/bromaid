import type { Metadata } from 'next';

import { Breadcrumbs } from '../_components/breadcrumbs';
import { JsonLd } from '../_components/json-ld';
import { TryCta } from '../_components/try-cta';
import { faqs } from '../_lib/faqs';
import { siteName } from '../_lib/site';
import { breadcrumbLd, faqLd, webPageLd } from '../_lib/structured-data';

const faqTitle = `Frequently asked questions`;
const faqDescription = `Answers about ${siteName}: what it is, where it runs, how it differs from Mermaid and Graphviz, licensing, and installation.`;

export const metadata: Metadata = {
  title: faqTitle,
  description: faqDescription,
  alternates: { canonical: '/faq' },
  openGraph: {
    title: `${faqTitle} — ${siteName}`,
    description: faqDescription,
    url: '/faq',
    type: 'article',
  },
  twitter: {
    title: `${faqTitle} — ${siteName}`,
    description: faqDescription,
  },
};

export const dynamic = 'force-static';

const pageStyle = {
  maxWidth: 760,
  margin: '0 auto',
  padding: '40px 20px 80px',
  lineHeight: 1.6,
  fontSize: 15,
  color: '#e6e7e8',
} as const;

const h1Style = {
  fontSize: 28,
  margin: '0 0 8px',
  letterSpacing: 0.2,
} as const;

const subtitleStyle = {
  opacity: 0.75,
  fontSize: 15,
  margin: '0 0 8px',
} as const;

const listStyle = {
  margin: '8px 0 0',
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
} as const;

const itemStyle = {
  scrollMarginTop: 24,
  padding: '8px 0',
  borderTop: '1px solid rgba(255,255,255,0.08)',
} as const;

const questionStyle = {
  fontSize: 18,
  fontWeight: 600,
  color: '#ffffff',
  margin: '16px 0 8px',
  letterSpacing: 0.1,
} as const;

const anchorStyle = {
  color: 'inherit',
  textDecoration: 'none',
} as const;

const answerStyle = {
  margin: '0 0 4px',
  color: '#d6d7d8',
} as const;

const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'FAQ', path: '/faq' },
];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export default function FaqPage() {
  return (
    <main style={pageStyle}>
      <JsonLd
        id="ld-page-faq"
        data={webPageLd({ name: faqTitle, description: faqDescription, path: '/faq' })}
      />
      <JsonLd id="ld-breadcrumb-faq" data={breadcrumbLd(crumbs)} />
      <JsonLd id="ld-faq" data={faqLd(faqs)} />

      <Breadcrumbs crumbs={crumbs} />

      <h1 style={h1Style}>Frequently asked questions</h1>
      <p style={subtitleStyle}>{faqDescription}</p>

      <TryCta />

      <div
        itemScope
        itemType="https://schema.org/FAQPage"
        style={listStyle}
        role="list"
      >
        {faqs.map((item) => {
          const id = slugify(item.q);
          return (
            <section
              key={item.q}
              id={id}
              itemScope
              itemProp="mainEntity"
              itemType="https://schema.org/Question"
              role="listitem"
              style={itemStyle}
            >
              <h2 itemProp="name" style={questionStyle}>
                <a href={`#${id}`} style={anchorStyle}>
                  {item.q}
                </a>
              </h2>
              <div
                itemScope
                itemProp="acceptedAnswer"
                itemType="https://schema.org/Answer"
              >
                <div itemProp="text">
                  <p style={answerStyle}>{item.a}</p>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
