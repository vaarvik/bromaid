# `@bromaid/renderer`

DOM-free renderer that turns a `LayoutGraph` into an **SVG string**.

## Install

```bash
npm i @bromaid/renderer
```

## Usage

```ts
import { parse } from '@bromaid/core';
import { layout } from '@bromaid/layout';
import { renderSVG } from '@bromaid/renderer';
import { defaultTheme } from '@bromaid/theme';

const svg = renderSVG(await layout(parse(source)), { theme: defaultTheme, mode: 'dark' });
```

## Docs

- Root docs and examples: https://github.com/vaarvik/bromaid


## Interactive graphs

- `@bromaid/renderer/client`: `mount(el, data, options)` → `{ update, highlight, destroy }` (browser only).
- `@bromaid/renderer/react`: `<Bromaid data={…} />` (client component; React is an optional peer).
- Main entry (DOM-free): `renderGraphEdgesSVG`, `renderGraphHTML`, `graphCss`.

See "Column graphs" in the root README.
