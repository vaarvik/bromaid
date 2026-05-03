import { siteUrl } from '../_lib/site';

export const dynamic = 'force-static';

const body = `# bromaid

> Diagrams-as-code for TypeScript. Parse a tiny DSL, get an SVG string. Pure functions, zero DOM, runs anywhere.

bromaid is an open-source TypeScript toolkit. The pipeline is three pure functions: parse → layout → renderSVG. There are no browser globals, no worker URLs, no DOM. Works in Node 18+, Bun, Deno, Cloudflare Workers, the edge, CLIs, and React Server Components. License: MIT. Source: https://github.com/vaarvik/bromaid.

## Site

- [Playground](${siteUrl}/): Interactive editor that renders the bromaid DSL into SVG live.
- [Docs](${siteUrl}/docs): Install, quick start, API, theming, packages, examples.
- [DSL specification](${siteUrl}/spec): Canonical reference for the DSL grammar and semantics.
- [FAQ](${siteUrl}/faq): What bromaid is, where it runs, comparisons, license, install.
- [Privacy policy](${siteUrl}/privacy): Cookies, analytics, consent, data handling.

## Machine-readable

- [llms.txt](${siteUrl}/llms.txt): This file.
- [llms-full.txt](${siteUrl}/llms-full.txt): Full README + SPEC concatenated for ingestion.
- [Sitemap](${siteUrl}/sitemap.xml): All indexable pages.

## Packages

- [bromaid](https://www.npmjs.com/package/bromaid): Umbrella package, batteries-included.
- [@bromaid/core](https://www.npmjs.com/package/@bromaid/core): Parser and types.
- [@bromaid/layout](https://www.npmjs.com/package/@bromaid/layout): ELK-based layout (no-worker).
- [@bromaid/renderer](https://www.npmjs.com/package/@bromaid/renderer): SVG renderer.
- [@bromaid/theme](https://www.npmjs.com/package/@bromaid/theme): Theming primitives.

## Quick start

\`\`\`ts
import { renderFromSource } from 'bromaid';

const svg = await renderFromSource(\`
  actor user "User"
  service api "API"
  edge user -> api
\`);
\`\`\`

\`svg\` is a string — write to a file, return from an HTTP handler, or drop into HTML.

## Optional

- [GitHub repository](https://github.com/vaarvik/bromaid): Source, issues, releases.
`;

export async function GET(): Promise<Response> {
  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
