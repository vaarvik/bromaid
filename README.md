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

## Column graphs (and interactive graphs)

Besides the DSL, bromaid draws graphs from a plain data object, interactively in the browser: HTML nodes that inherit your page's fonts and CSS variables, smooth cubic edges with states, hover/focus highlighting, keyboard support and animated updates. The **column layout** is the new layout for this; the existing general (ELK) layout works with the same data and the same interaction.

```ts
import { mount } from 'bromaid/client'; // or '@bromaid/renderer/client'

const g = mount(el, {
  direction: 'LR',
  columns: [
    { id: 'clusters', nodes: [
      { id: 'c1', kind: 'cluster', label: 'aevy-k8s-sweden-central-001',
        lines: ['Azure · 6 machines', '$2,784/mo', '7 built-in apps running'],
        state: 'ok', href: '/clusters/c1' },
      { id: 'new', kind: 'ghost', label: 'New cluster', icon: 'plus', action: 'new-cluster' },
    ]},
    { id: 'apps', nodes: [
      { id: 'a1', kind: 'app', label: 'aevy-app', meta: '3×', state: 'ok', href: '/apps/a1' },
      { id: 'a8', kind: 'app', label: 'treetop', meta: '0', state: 'off' },
    ]},
  ],
  edges: [
    { from: 'c1', to: 'a1', state: 'ok', label: '2×' },
    { from: 'c1', to: 'a8', state: 'off' },
  ],
}, { onNodeClick: (node, e) => {}, onAction: (action) => {} });

g.update(nextData); // idempotent: diffs by id, animates moves (150 ms)
g.destroy();
```

React (a thin client-component wrapper around `mount`):

```tsx
import { Bromaid } from 'bromaid/react'; // or '@bromaid/renderer/react'

<Bromaid data={data} highlight="neighbours" grid onAction={(a) => open(a)} />
```

A full page with the sample above, a deploying (`run`) edge, a stopped app and a multi-level `chain` graph: [`examples/graphs`](./examples/graphs) (`pnpm example:graphs`, then open `examples/graphs/index.html`).

### Data shape

| Field | Meaning |
| --- | --- |
| `columns[]` `{ id, nodes[] }` | Column layout: each column is a fixed rank, nodes stay in the written order. |
| `nodes[]`, `groups[]` `{ id, label, group?, align? }` | General layout instead of columns: free nodes, placed by ELK, optionally inside (nested) groups. Nodes stacked in a group line up on the left with one shared width (`align: 'start'`, the default) or stay centred at their own width (`'center'`). |
| `edges[]` `{ from, to, state?, label?, id? }` | One cubic curve each. `id` defaults to `from->to`. |
| node `{ id, kind?, label, lines?, meta?, state?, icon?, href?, action?, tip?, group? }` | `kind` picks the template (default `app`); `lines` are muted lines (up to 3); `meta` is right-aligned mono text; `href` makes the node a link; `action` makes it a button that emits `onAction`; `tip` is a tooltip. |
| `state` | `ok`, `run`, `off`, `fail`, or any string (becomes the class `bm-node--<state>` / `bm-edge--<state>`). |

Built-in templates: **`cluster`** (state-coloured icon tile, label, up to 3 lines, text wraps), **`app`** (40px row, tile, label, mono meta; with `lines` it grows and stacks them under the label), **`ghost`** (dashed outline, centred icon + label, a button). Any other kind uses the cluster-style card. State `off` on any node: dashed border, no fill, muted label. Built-in icons: `cluster`, `app`, `plus`, `db`, `globe`, `user`, `box`; any other `icon` shows its first letter.

### Layout

- **Columns**: the container's width is split with a 64px gap; the first column is 1.35× each of the others. Every column is centred vertically against the tallest. A `ResizeObserver` re-lays out on width changes. Nodes keep the given order; `order: 'crossings'` reorders columns after the first to reduce crossings.
- **General**: `layout: 'layered'` (the default when the data has `nodes` instead of `columns`) uses bromaid's ELK layout, loaded on demand so column-only pages never download it. Any DSL diagram can be mounted with `graphFromProgram(parse(source))`.
- **Edges**: a cubic from the right-middle of the source flush to the left-middle of the target, control points at the horizontal midpoint, a port dot at each end. `ok` = solid 1.5px muted `--ok`; `run` = dashed 5/5 in `--run` with a moving dash (it holds still under `prefers-reduced-motion`); `off` = dashed 3/4 grey; `fail` = solid 1.5px in `--fail` (red), full `--fail` when highlighted.
- **Nodes** keep at least 8px between their text and their border on every side and grow with their lines. In the general layout `mount()` measures each node's HTML (rounded up, again when web fonts arrive), so text never runs out of its box.
- **Edge labels** sit at the source end, 8px in, on the side the curve leaves clear (above a curve that goes down, below one that goes up). Labels on edges from the same node stack outward and never overlap.

### Options

| Option | Default | |
| --- | --- | --- |
| `layout` | `columns` with `columns`, else `layered` | |
| `highlight` | `neighbours` | `neighbours`: the node, its edges and the nodes at their other ends. `chain`: every ancestor up to the top parents and every descendant down to the last children (cycle-safe); hovering an edge lights every path through it. `none`. |
| `templates` | | `{ [kind]: (node, { width }) => string \| Node }` — override a built-in or add a kind. Strings are HTML: escape your text (`escapeXml`). |
| `theme` | | CSS variables to set on the graph, e.g. `{ ok: '#3a3' }`. |
| `grid` | `false` | Dotted grid background. |
| `padding`, `gap`, `rowGap`, `weights`, `order` | `0`, `64`, `10`, `[1.35, 1…]`, `given` | Column layout spacing and order. |
| `animate` | `150` | Position animation on update, ms (off under reduced motion). |
| `css` | `true` | Inject the stylesheet; set `false` and include `graphCss` yourself (e.g. for a strict CSP). |
| `align` | `start` | General layout: how nodes stacked in a group line up when the group sets no `align`. |
| `panZoom` | `false` | A pan-and-zoom canvas, for a full-screen view (leave it off where the page should scroll). The graph fills `el` (give it a height). See below. |
| `fit` | `both` | With `panZoom`: on open and on `fit()` show the whole graph centred both ways, never past 100% (`none`: 100%, centred). `padding` is the space kept around it (default 24). |
| `controls` | `true` | With `panZoom`: zoom out / zoom in / fit buttons, bottom right. |
| `onViewport(viewport)` | | With `panZoom`: `{ x, y, k }` after every pan or zoom. |
| `onNodeClick(node, event)`, `onAction(action, node, event)`, `onEdgeClick(edge, event)`, `onLayout(layout)` | | `onNodeClick` runs before an `href` is followed; `event.preventDefault()` stops it (e.g. to use a client router). |

Interaction: hovering or focusing a node highlights it (edges go to full colour at 2px, the rest fades), hovering an edge highlights its ends, every node is focusable (Tab), Enter clicks, `tip` shows on hover and focus.

**Pan and zoom** (`mount(el, data, { panZoom: true, fit: 'both' })`), the usual canvas convention (Figma, Miro): a plain wheel or two-finger scroll pans (shift + wheel sideways); pinch, or ctrl/⌘ + wheel, zooms at the pointer (touch pinch too); dragging the empty canvas pans, and so does dragging anywhere while Space is held (grab cursor) or with the middle button; `+` / `-` zoom in and out, `0` fits; a double-click on the canvas zooms in at the pointer (shift: out). Nodes stay focusable and clickable; a node that takes keyboard focus off screen is panned into view. The handle has `zoomIn()`, `zoomOut()`, `fit()` and `viewport()`; `<Bromaid graphRef={ref} />` hands it to React. The maths are pure and exported from `@bromaid/layout/graph` (`fitViewport`, `zoomAt`, `wheelAction`, `keyAction`, `pinchStep`, `revealBox`).

### Theming

Only CSS variables, read from the host page: `--card --raised --bd2 --fg --fa --ok --run --fail --ok-t --run-t --fail-t --font-mono`. Dark-mode values are the defaults when a variable is missing; define the variables (or pass `theme`) for light mode.

### Server vs client

bromaid stays **pure-string and RSC-ready** for existing users. The graph layer is split the same way:

- **Pure** (server-safe, no DOM): `@bromaid/layout/graph` has the data model, `layoutColumns`, the edge maths (`edgePath`, `edgeEnds`, `placeEdgeLabels`) and the highlight walk; `@bromaid/layout` adds `layoutLayered` (ELK). `@bromaid/renderer` has `renderGraphEdgesSVG(layout)` (edges as an SVG string), `renderGraphHTML(layout)` (a static snapshot) and `graphCss`. All of it is re-exported from `bromaid`.
- **Client** (DOM): `mount` lives in a separate entry, `@bromaid/renderer/client` (`bromaid/client`), and the React wrapper in `@bromaid/renderer/react` (`bromaid/react`, marked `'use client'`, React is an optional peer). Server-only users never import DOM code, and the main entries keep their lint guard against `window` / `document`. Subpath entries instead of a new package keep one version line and one install. The client is about 6 KB gzipped; ELK is fetched only for the general layout.

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
| [`@bromaid/layout`](./packages/layout) | Wraps `elkjs` (no-worker bundle). `Program → LayoutGraph`. `/graph`: column layout + edge maths (no ELK). |
| [`@bromaid/renderer`](./packages/renderer) | `LayoutGraph → SVG string`. DOM-free. `/client`: interactive `mount()`; `/react`: `<Bromaid />`. |
| [`@bromaid/theme`](./packages/theme) | Slug + type theme registry. Pluggable via `defineTheme` / `mergeTheme`. |

---

## Examples

- [`examples/micro.bro`](./examples/micro.bro) — minimal three-node diagram.
- [`examples/simple.bro`](./examples/simple.bro) — single region, web + api + data.
- [`examples/full.bro`](./examples/full.bro) — production SaaS: edge, app, data, workers, third parties.
- [`examples/graphs`](./examples/graphs) — interactive column graph ("Where things run") and a chain-highlight graph.
- [`examples/next-app-smoke`](./examples/next-app-smoke) — Next.js App Router smoke test.

---

## Roadmap

Phase 1 (shipping): the packages above.

Phase 2 / 3 (planned):

- `@bromaid/web-component` — `<bromaid-diagram>` for vanilla HTML / Vue / Svelte / Angular.
- `<Bromaid source={...} />` for DSL source (today: `<Bromaid data={graphFromProgram(parse(source))} />`).
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
