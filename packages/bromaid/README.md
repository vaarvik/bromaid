# `bromaid`

Batteries-included umbrella package for the bromaid pipeline:

`parse → layout → renderSVG` (pure SVG string output).

## Install

```bash
npm i bromaid
```

## Usage

```ts
import { renderFromSource } from 'bromaid';

const svg = await renderFromSource('actor user \"User\"', { mode: 'dark' });
```

You can also import the individual building blocks:

```ts
import { parse, layout, renderSVG, defaultTheme } from 'bromaid';

const svg = renderSVG(await layout(parse(source)), { theme: defaultTheme });
```

## Docs

- Root docs and examples: https://github.com/vaarvik/bromaid

