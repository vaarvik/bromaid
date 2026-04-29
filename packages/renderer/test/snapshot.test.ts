import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from '@bromaid/core';
import { layout } from '@bromaid/layout';
import { renderSVG } from '../src/index.js';
import type { RenderMode } from '../src/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const examples = resolve(here, '../../../examples');
const snapshotDir = resolve(here, 'snapshots');

const SAMPLES = ['simple', 'micro', 'full'] as const;
const MODES: ReadonlyArray<RenderMode> = ['dark', 'light'];

async function loadExample(name: string): Promise<string> {
  return readFile(resolve(examples, `${name}.bro`), 'utf8');
}

describe('SVG golden snapshots', () => {
  for (const sample of SAMPLES) {
    for (const mode of MODES) {
      it(`${sample} (${mode})`, async () => {
        const program = parse(await loadExample(sample));
        const graph = await layout(program);
        const svg = renderSVG(graph, { mode });
        await expect(svg).toMatchFileSnapshot(
          resolve(snapshotDir, `${sample}.${mode}.svg`),
        );
      });
    }
  }

  it('renders are deterministic across runs', async () => {
    const program = parse(await loadExample('simple'));
    const a = renderSVG(await layout(program), { mode: 'dark' });
    const b = renderSVG(await layout(program), { mode: 'dark' });
    expect(a).toBe(b);
  });
});
