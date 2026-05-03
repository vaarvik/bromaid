import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from '@bromaid/core';
import { layout } from '@bromaid/layout';
import { defaultTheme, mergeTheme } from '@bromaid/theme';
import { renderSVG } from '../src/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const examples = resolve(here, '../../../examples');

async function loadExample(name: string): Promise<string> {
  return readFile(resolve(examples, `${name}.bro`), 'utf8');
}

describe('renderSVG', () => {
  it('emits a valid <svg> string', async () => {
    const program = parse(await loadExample('simple'));
    const graph = await layout(program);
    const svg = renderSVG(graph);
    expect(svg.startsWith('<svg ')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    expect(svg).toContain('viewBox="0 0');
  });

  it('contains every node label as text', async () => {
    const program = parse(await loadExample('simple'));
    const graph = await layout(program);
    const svg = renderSVG(graph);
    expect(svg).toContain('Load Balancer');
    expect(svg).toContain('PostgreSQL');
    expect(svg).toContain('GitHub');
  });

  it('does not emit any CSS variable references', async () => {
    const program = parse(await loadExample('full'));
    const graph = await layout(program);
    for (const mode of ['light', 'dark'] as const) {
      const svg = renderSVG(graph, { mode });
      expect(svg).not.toMatch(/var\(--/);
    }
  });

  it('uses different colors for light and dark mode surfaces', async () => {
    const program = parse(await loadExample('simple'));
    const graph = await layout(program);
    const dark = renderSVG(graph, { mode: 'dark' });
    const light = renderSVG(graph, { mode: 'light' });
    expect(dark).toContain(defaultTheme.surface.dark.bg2);
    expect(light).toContain(defaultTheme.surface.light.bg2);
    expect(dark).not.toBe(light);
  });

  it('honors custom themes', async () => {
    // Use a source that has an `aws:s3` *node* — slug badge labels are only
    // rendered on nodes, not on containers (which show the user-provided
    // container label instead).
    const program = parse(`actor user "User"
aws:s3 mybucket "Storage"
edge user -> mybucket`);
    const graph = await layout(program);
    const customTheme = mergeTheme(defaultTheme, {
      slugs: { 'aws:s3': { color: '#ff00ff', label: 'CUSTOM' } },
    });
    const svg = renderSVG(graph, { theme: customTheme, mode: 'dark' });
    expect(svg).toContain('#ff00ff');
    expect(svg).toContain('CUSTOM');
  });

  it('escapes XML-special characters in labels', async () => {
    const program = parse(`actor a "<b>&\\"'</b>"
actor b "B"
edge a -> b`);
    const graph = await layout(program);
    const svg = renderSVG(graph);
    expect(svg).toContain('&lt;b&gt;');
    expect(svg).not.toContain('<b>');
  });

  it('does not reference any browser globals at module load', async () => {
    // Re-import in a fresh evaluation context to ensure the module is RSC-safe.
    const mod = await import('../src/index.js');
    expect(typeof mod.renderSVG).toBe('function');
  });
});
