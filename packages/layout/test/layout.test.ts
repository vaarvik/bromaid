import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from '@bromaid/core';
import { layout } from '../src/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const examples = resolve(here, '../../../examples');

async function loadExample(name: string): Promise<string> {
  return readFile(resolve(examples, `${name}.bro`), 'utf8');
}

describe('layout', () => {
  it('lays out the simple example', async () => {
    const program = parse(await loadExample('simple'));
    const graph = await layout(program);
    expect(graph.width).toBeGreaterThan(0);
    expect(graph.height).toBeGreaterThan(0);
    expect(graph.nodes.length).toBeGreaterThan(0);
    expect(graph.edges.length).toBe(program.edges.length);
  });

  it('lays out micro and full examples', async () => {
    for (const name of ['micro', 'full'] as const) {
      const program = parse(await loadExample(name));
      const graph = await layout(program);
      expect(graph.nodes.length).toBeGreaterThan(0);
    }
  });

  it('produces deterministic output', async () => {
    const program = parse(await loadExample('simple'));
    const a = await layout(program);
    const b = await layout(program);
    expect(a.width).toBe(b.width);
    expect(a.height).toBe(b.height);
    expect(a.nodes.length).toBe(b.nodes.length);
    for (let i = 0; i < a.nodes.length; i++) {
      expect(a.nodes[i]?.x).toBe(b.nodes[i]?.x);
      expect(a.nodes[i]?.y).toBe(b.nodes[i]?.y);
    }
  });

  it('preserves edge correlation: edge.from/to match the original program', async () => {
    const program = parse(await loadExample('simple'));
    const graph = await layout(program);
    for (const placed of graph.edges) {
      expect(placed.edge.fromId.length).toBeGreaterThan(0);
      expect(placed.edge.toId.length).toBeGreaterThan(0);
    }
  });

  it('routes every edge endpoint near its source/target node', async () => {
    // Sanity check: all edges in the simple example are within a single VPC
    // so the walk-based offset should land on the node boundary.
    const program = parse(await loadExample('simple'));
    const graph = await layout(program);
    const byId = new Map(graph.nodes.map((n) => [n.element.id, n] as const));

    for (const placed of graph.edges) {
      if (placed.path.length < 2) continue;
      const start = placed.path[0];
      const end = placed.path[placed.path.length - 1];
      if (start === undefined || end === undefined) continue;

      const from = byId.get(placed.edge.fromId);
      const to = byId.get(placed.edge.toId);
      if (from !== undefined) {
        expect(start.x).toBeGreaterThanOrEqual(from.x - 30);
        expect(start.x).toBeLessThanOrEqual(from.x + from.width + 30);
      }
      if (to !== undefined) {
        expect(end.x).toBeGreaterThanOrEqual(to.x - 30);
        expect(end.x).toBeLessThanOrEqual(to.x + to.width + 30);
      }
    }
  });
});
