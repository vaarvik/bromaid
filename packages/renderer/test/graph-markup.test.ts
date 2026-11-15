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
    expect(svg).toContain('>2×</text>');
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
