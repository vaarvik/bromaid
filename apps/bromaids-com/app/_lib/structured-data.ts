import {
  absoluteUrl,
  siteAuthor,
  siteDescription,
  siteName,
  siteRepo,
  siteShortDescription,
  siteUrl,
} from './site';

export type Breadcrumb = { readonly name: string; readonly path: string };

export function organizationLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteUrl}/#organization`,
    name: siteName,
    url: siteUrl,
    logo: absoluteUrl('/icon'),
    sameAs: [siteRepo],
    founder: {
      '@type': 'Person',
      name: siteAuthor.name,
      url: siteAuthor.url,
    },
  } as const;
}

export function websiteLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteUrl}/#website`,
    url: siteUrl,
    name: siteName,
    description: siteDescription,
    inLanguage: 'en',
    publisher: { '@id': `${siteUrl}/#organization` },
  } as const;
}

export function softwareApplicationLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${siteUrl}/#software`,
    name: siteName,
    description: siteShortDescription,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Cross-platform (Node 18+, Bun, Deno, Cloudflare Workers, browsers)',
    url: siteUrl,
    downloadUrl: 'https://www.npmjs.com/package/bromaid',
    softwareVersion: 'latest',
    license: 'https://opensource.org/licenses/MIT',
    codeRepository: siteRepo,
    programmingLanguage: 'TypeScript',
    author: {
      '@type': 'Person',
      name: siteAuthor.name,
      url: siteAuthor.url,
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  } as const;
}

export function breadcrumbLd(crumbs: readonly Breadcrumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  } as const;
}

export function techArticleLd(args: {
  readonly headline: string;
  readonly description: string;
  readonly path: string;
  readonly section?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: args.headline,
    description: args.description,
    url: absoluteUrl(args.path),
    inLanguage: 'en',
    isPartOf: { '@id': `${siteUrl}/#website` },
    author: {
      '@type': 'Person',
      name: siteAuthor.name,
      url: siteAuthor.url,
    },
    publisher: { '@id': `${siteUrl}/#organization` },
    articleSection: args.section ?? 'Documentation',
    mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(args.path) },
  } as const;
}

export function faqLd(items: readonly { readonly q: string; readonly a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    })),
  } as const;
}

export function webPageLd(args: {
  readonly name: string;
  readonly description: string;
  readonly path: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': absoluteUrl(args.path),
    url: absoluteUrl(args.path),
    name: args.name,
    description: args.description,
    isPartOf: { '@id': `${siteUrl}/#website` },
    inLanguage: 'en',
    publisher: { '@id': `${siteUrl}/#organization` },
  } as const;
}

