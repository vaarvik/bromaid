# `@bromaid/layout`

ELK-based layout engine for **bromaid**.

This package wraps `elkjs` in a server/edge-friendly way (no worker wiring) and turns a parsed `Program` into a `LayoutGraph` that can be rendered.

## Install

```bash
npm i @bromaid/layout elkjs
```

## Usage

```ts
import { parse } from '@bromaid/core';
import { layout } from '@bromaid/layout';

const graph = await layout(parse('actor user "User"'));
```

## Docs

- Root docs and examples: https://github.com/vaarvik/bromaid

