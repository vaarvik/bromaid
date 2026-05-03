# bromaid

> Diagrams-as-code for TypeScript. Parse a tiny DSL, get an SVG string. Pure functions, zero DOM, runs anywhere.

`parse → layout → renderSVG`. Each step is a pure function. No browser globals, no worker URLs, no DOM. Works in Node, Bun, Deno, Cloudflare Workers, the edge, a CLI — and inside a **React Server Component**.

---

## Install

```bash
npm install bromaid
# or
pnpm add bromaid
# or
yarn add bromaid
```

The `bromaid` package is the batteries-included umbrella — it bundles `@bromaid/core`, `@bromaid/layout`, `@bromaid/renderer`, and `@bromaid/theme`. It has one runtime dep: [`elkjs`](https://github.com/kieler/elkjs) (no-worker bundle).

If you want finer control, install the individual packages — see [Packages](#packages) below.

**Requires:** Node 18+ (or any modern runtime with ES2022 + `fetch`).

---

## Quick start

```ts
import { renderFromSource } from 'bromaid';

const svg = await renderFromSource(`
  actor user "User"
  service api "API"
  edge user -> api
`);

console.log(svg); // <svg xmlns="..."> … </svg>
```

That's it. `svg` is a string you can write to a file, return from an HTTP handler, or drop into HTML.

---

## Usage

### Node script

```ts
import { writeFile } from 'node:fs/promises';
import { renderFromSource } from 'bromaid';

const svg = await renderFromSource(source, { mode: 'dark' });
await writeFile('diagram.svg', svg);
```

### Next.js (App Router, RSC)

```tsx
// app/page.tsx
import { readFile } from 'node:fs/promises';
import { renderFromSource } from 'bromaid';

export default async function Page() {
  const source = await readFile('arch.bro', 'utf8');
  const svg = await renderFromSource(source, { mode: 'dark' });
  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
}
```

Renders at build time. The browser receives inline SVG and nothing else.

### Step-by-step (when you want the intermediate stages)

```ts
import { parse, layout, renderSVG, defaultTheme } from 'bromaid';

const program = parse(source);          // source → AST
const graph = await layout(program);    // AST → laid-out graph (uses elkjs)
const svg = renderSVG(graph, {          // graph → SVG string
  theme: defaultTheme,
  mode: 'dark',
});
```

Useful if you want to inspect the AST, cache the layout, or swap renderers.

### Cloudflare Worker / edge

Works as-is. No special config. The layout uses `elkjs` configured without web workers, so it runs in any V8 isolate.

```ts
export default {
  async fetch(request: Request) {
    const source = await request.text();
    const svg = await renderFromSource(source);
    return new Response(svg, { headers: { 'content-type': 'image/svg+xml' } });
  },
};
```

---

## DSL

The DSL is intentionally small. Full reference: [`SPEC.md`](./SPEC.md) (also at [bromaid.com/spec](https://bromaid.com/spec)).

```bro
actor user "User"

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

More samples in [`examples/`](./examples) (`micro.bro`, `simple.bro`, `full.bro`).

For LLMs / AI agents: the spec is also served as plain text at [bromaid.com/llms.txt](https://bromaid.com/llms.txt).

---

## API

```ts
import {
  parse,
  layout,
  renderSVG,
  renderFromSource,
  defaultTheme,
  defineTheme,
  mergeTheme,
} from 'bromaid';
```

| Export | Signature | What it does |
| --- | --- | --- |
| `parse` | `(source: string) => Program` | Tokenize + parse DSL. Throws `BromaidError` on syntax errors with line/col info. |
| `layout` | `(program: Program, opts?: LayoutOptions) => Promise<LayoutGraph>` | Run elkjs layout. Async because elkjs is async. |
| `renderSVG` | `(graph: LayoutGraph, opts?: RenderOptions) => string` | Serialize graph to SVG. Sync. DOM-free. |
| `renderFromSource` | `(source: string, opts?: RenderOptions) => Promise<string>` | Convenience: `parse → layout → renderSVG`. |
| `defaultTheme` | `Theme` | The shipped theme. |
| `defineTheme` | `(input: DefineThemeInput) => Theme` | Build a theme from a partial spec. |
| `mergeTheme` | `(base: Theme, overrides: ThemeOverrides) => Theme` | Override slots of an existing theme. |

### `RenderOptions`

```ts
type RenderOptions = {
  theme?: Theme;        // default: defaultTheme
  mode?: 'light' | 'dark';  // default: 'dark'
};
```

### Errors

`parse` throws `BromaidError` with a stable `code` (`BromaidErrorCode`), the offending source `span`, and a human message. Catch it and render a friendly diagnostic.

```ts
import { parse, type BromaidError } from 'bromaid';

try {
  parse(source);
} catch (err) {
  const e = err as BromaidError;
  console.error(`[${e.code}] ${e.message} at ${e.span?.start.line}:${e.span?.start.col}`);
}
```

---

## Theming

```ts
import { defineTheme, mergeTheme, defaultTheme, renderFromSource } from 'bromaid';

const myTheme = mergeTheme(defaultTheme, {
  slugs: {
    'aws:*': { accent: '#ff9900' },
    'stripe': { accent: '#635bff' },
  },
});

const svg = await renderFromSource(source, { theme: myTheme, mode: 'dark' });
```

Themes resolve in this order: explicit slug match → type default → theme fallback. See [`packages/theme`](./packages/theme) for the full slot list.

---

## Packages

If you don't want the umbrella, install pieces directly:

| Package | What it does |
| --- | --- |
| [`bromaid`](./packages/bromaid) | Umbrella. Re-exports everything below + `renderFromSource`. |
| [`@bromaid/core`](./packages/core) | Tokenizer, parser, AST, structured errors. Pure TS, no deps. |
| [`@bromaid/layout`](./packages/layout) | Wraps `elkjs` (no-worker bundle). `Program → LayoutGraph`. |
| [`@bromaid/renderer`](./packages/renderer) | `LayoutGraph → SVG string`. DOM-free. |
| [`@bromaid/theme`](./packages/theme) | Slug + type theme registry. Pluggable via `defineTheme` / `mergeTheme`. |

---

## Examples

- [`examples/micro.bro`](./examples/micro.bro) — minimal three-node diagram.
- [`examples/simple.bro`](./examples/simple.bro) — single region, a few services.
- [`examples/full.bro`](./examples/full.bro) — multi-region production architecture.
- [`examples/next-app-smoke`](./examples/next-app-smoke) — Next.js App Router smoke test.

---

## Roadmap

Phase 1 (shipping): the packages above.

Phase 2 / 3 (planned):

- `@bromaid/web-component` — `<bromaid-diagram>` for vanilla HTML / Vue / Svelte / Angular.
- `@bromaid/react` — `<Bromaid source={...} />` (client) + `@bromaid/react/server` (RSC).
- `@bromaid/cli` — `bromaid in.bro -o out.svg`, watch mode, MDX/remark plugin.
- mermaid-style auto-init: drop a `<script>` tag, any `<pre class="bromaid">` block renders.

---

## Development

```bash
pnpm i
pnpm typecheck
pnpm test
pnpm build
pnpm smoke         # render examples/full.bro to architecture.svg
pnpm smoke:next    # build the Next.js App Router smoke test
```

Source of truth for the DSL is [`packages/core/src/schema.ts`](./packages/core/src/schema.ts) — enums, regex, descriptions, and Zod schemas live there. `SPEC.md` is regenerated from it via `pnpm gen:spec`.

---

## License

MIT
