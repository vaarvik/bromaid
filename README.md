# bromaid

> Diagrams-as-code, the way mermaid should have been.

bromaid is a small, fully-typed TypeScript toolkit for turning a tiny declarative DSL into great-looking architecture diagrams. The whole pipeline — `parse → layout → renderSVG` — runs as pure functions that emit a string of SVG. No DOM. No browser globals. No worker URLs to wire up. So it works the same in Node, in a Cloudflare Worker, on the edge, in a CLI, and — the killer feature — inside a **React Server Component**.

```ts
import { parse } from '@bromaid/core';
import { layout } from '@bromaid/layout';
import { renderSVG } from '@bromaid/renderer';
import { defaultTheme } from '@bromaid/theme';

const svg = renderSVG(
  await layout(parse(source)),
  { theme: defaultTheme, mode: 'dark' },
);
```

That's the whole API.

## DSL at a glance

```bro
actor user "User"
actor github "GitHub"

region aws:eu-west-1 "AWS EU-WEST-1" {
  vpc "Production VPC" {
    subnet.public "Public" {
      lb "Load Balancer"
      gateway "API Gateway"
    }
    subnet.private "Services" {
      auth "Auth Service"
      orders "Orders Service"
    }
  }
}

external stripe "Stripe"

edge user -> lb
edge lb -> gateway
edge gateway -> auth
edge gateway -> orders
edge orders -> stripe [label: payments]
```

See [`SPEC.md`](./SPEC.md) for the language reference and [`examples/`](./examples) for full samples.

## Use it in a Next.js page (zero client JS)

```tsx
// app/page.tsx — React Server Component
import { parse } from '@bromaid/core';
import { layout } from '@bromaid/layout';
import { renderSVG } from '@bromaid/renderer';
import { readFile } from 'node:fs/promises';

export default async function Page() {
  const source = await readFile('arch.bro', 'utf8');
  const svg = renderSVG(await layout(parse(source)), { mode: 'dark' });
  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
}
```

The whole thing renders at build time. The browser receives an inline SVG and nothing else.

## Packages (Phase 1 — shipping now)

| Package | What it does |
| --- | --- |
| [`@bromaid/core`](./packages/core) | Tokenizer, parser, AST, structured errors. Pure TS, no deps. |
| [`@bromaid/layout`](./packages/layout) | Wraps `elkjs` (no-worker bundle). `Program → LayoutGraph`. |
| [`@bromaid/renderer`](./packages/renderer) | `LayoutGraph → SVG string`. DOM-free. |
| [`@bromaid/theme`](./packages/theme) | Slug + type theme registry. Pluggable via `defineTheme` / `mergeTheme`. |

## Roadmap (Phase 2 / 3 — planned)

- `bromaid` — umbrella package with `bromaid.run()` auto-init for any HTML page (mermaid-style "drop a `<script>` tag and any `<pre class="bromaid">` blocks render automatically").
- `@bromaid/web-component` — `<bromaid-diagram>` custom element for vanilla HTML, Vue, Svelte, Angular.
- `@bromaid/react` — `<Bromaid source={...} />` (client) + `@bromaid/react/server` (RSC) bindings.
- `@bromaid/cli` — `bromaid in.bro -o out.svg`, watch mode, MDX/remark plugin.
- `apps/playground` — interactive editor with live preview + share URL.
- `apps/docs` — language spec, examples, theme catalog.

## Development

```bash
pnpm i
pnpm typecheck
pnpm test
pnpm build
pnpm smoke         # render examples/full.bro to architecture.svg
pnpm smoke:next    # build the Next.js App Router smoke test
```

## License

MIT
