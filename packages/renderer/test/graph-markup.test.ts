import { describe, expect, it } from 'vitest';
import { layoutColumns, type GraphData } from '@bromaid/layout/graph';
import { graphCss, renderGraphEdgesSVG, renderGraphHTML } from '../src/index.js';

const data: GraphData = {
  columns: [
    { id: 'l', nodes: [{ id: 'c1', kind: 'cluster', label: 'A <b>', state: 'ok', href: '/c1' }] },
    { id: 'r', nodes: [{ id: 'a1', kind: 'app', label: 'app', meta: '2×', state: 'run' }] },
  ],
  edges: [{ from: 'c1', to: 'a1', state: 'run', label: '2×' }],
};

describe('graph markup (server)', () => {
  it('renders edges as an SVG string', () => {
    const svg = renderGraphEdgesSVG(layoutColumns(data, { width: 500 }));
    expect(svg.startsWith('<svg class="bm-edges"')).toBe(true);
    expect(svg).toContain('bm-edge--run');
    expect(svg).toContain('class="bm-port"');
    expect(svg).toContain('class="bm-port bm-port--end"');
    expect(svg).not.toContain('NaN');
    expect(svg).toContain('>2×</text>');
  });

  it('ends edges flush at the target with a port dot there', () => {
    const laid = layoutColumns(data, { width: 500 });
    const e = laid.edges[0]!;
    const target = laid.nodes.find((p) => p.node.id === 'a1')!;
    expect(e.ends.tx).toBe(target.x);
    expect(renderGraphEdgesSVG(laid)).toContain(`cx="${Math.round(target.x * 100) / 100}"`);
  });

  it('styles the fail edge state in --fail', () => {
    const svg = renderGraphEdgesSVG(layoutColumns({ ...data, edges: [{ from: 'c1', to: 'a1', state: 'fail' }] }, { width: 500 }));
    expect(svg).toContain('bm-edge--fail');
    expect(graphCss).toContain('.bm-edge--fail .bm-edge-line{stroke:color-mix(in srgb,var(--bm-fail)');
    expect(graphCss).toContain('.bm-edge--fail.bm-on .bm-edge-line{stroke:var(--bm-fail)}');
    expect(graphCss).toContain('--bm-fail:var(--fail,');
  });

  it('renders a static HTML snapshot with escaped text', () => {
    const html = renderGraphHTML(layoutColumns(data, { width: 500 }), { grid: true });
    expect(html).toContain('<a class="bm-node bm-node--cluster bm-node--ok"');
    expect(html).toContain('A &lt;b&gt;');
    expect(html).toContain('bm-graph--grid');
  });

  it('takes every colour from a CSS variable', () => {
    const outsideTokens = graphCss.replace(/\.bm-graph\{[^}]*\}/, '');
    expect(outsideTokens).not.toMatch(/#[0-9a-f]{3,6}\b|rgba?\(/i);
    expect(graphCss).toContain('prefers-reduced-motion');
  });
});
