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

