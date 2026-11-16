// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GraphData } from '@bromaid/layout/graph';
import { mount, type MountedGraph } from '../src/client/index.js';

const sample: GraphData = {
  direction: 'LR',
  columns: [
    {
      id: 'clusters',
      nodes: [
        { id: 'c1', kind: 'cluster', label: 'aevy-k8s-sweden-central-001', lines: ['Azure · 6 machines'], state: 'ok', href: '/clusters/c1', tip: 'Main cluster' },
        { id: 'c2', kind: 'cluster', label: 'preview-cluster', state: 'ok' },
        { id: 'new', kind: 'ghost', label: 'New cluster', icon: 'plus', action: 'new-cluster' },
      ],
    },
    {
      id: 'apps',
      nodes: [
        { id: 'a1', kind: 'app', label: 'aevy-app', meta: '3×', state: 'ok' },
        { id: 'a8', kind: 'app', label: 'treetop', meta: '0', state: 'off' },
      ],
    },
  ],
  edges: [
    { from: 'c1', to: 'a1', state: 'ok', label: '2×' },
    { from: 'c2', to: 'a1', state: 'run', label: '1×' },
    { from: 'c1', to: 'a8', state: 'off' },
  ],
};

let graphs: MountedGraph[] = [];
function host(width = 664): HTMLElement {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { configurable: true, get: () => width });
  document.body.appendChild(el);
  return el;
}
async function make(data: GraphData, opts: Parameters<typeof mount>[2] = {}) {
  const el = host();
  const g = mount(el, data, opts);
  graphs.push(g);
  await g.ready;
  return { el, g };
}
const node = (el: HTMLElement, id: string) => el.querySelector(`[data-node="${id}"]`) as HTMLElement;
const edge = (el: HTMLElement, id: string) => el.querySelector(`[data-edge="${id}"]`) as SVGGElement;
const on = (x: Element) => x.classList.contains('bm-on');

afterEach(() => {
  for (const g of graphs) g.destroy();
  graphs = [];
  document.body.innerHTML = '';
});

describe('mount', () => {
  it('renders HTML nodes with templates and SVG edges with states', async () => {
    const { el } = await make(sample);
    expect(document.head.querySelector('style[data-bromaid]')).not.toBeNull();
    expect(node(el, 'c1').tagName).toBe('A');
    expect(node(el, 'c1').getAttribute('href')).toBe('/clusters/c1');
    expect(node(el, 'new').tagName).toBe('BUTTON');
    expect(node(el, 'a8').className).toContain('bm-node--off');
    expect(node(el, 'a1').querySelector('.bm-meta')?.textContent).toBe('3×');
    expect(node(el, 'c1').querySelectorAll('.bm-line')).toHaveLength(1);
    expect(edge(el, 'c2->a1').getAttribute('class')).toContain('bm-edge--run');
    expect(edge(el, 'c1->a8').querySelector('.bm-edge-label')).toBeNull();
    expect(edge(el, 'c1->a1').querySelector('.bm-edge-label')?.textContent).toBe('2×');
    expect(edge(el, 'c1->a1').querySelector('.bm-edge-line')?.getAttribute('d')).toMatch(/^M[\d.]+ [\d.]+C/);
  });

  it('updates in place: same elements, new classes, removed nodes go', async () => {
    const { el, g } = await make(sample);
    const before = node(el, 'a1');
    const beforeEdge = edge(el, 'c1->a1');
    const next: GraphData = {
      ...sample,
      columns: [sample.columns?.[0] as never, { id: 'apps', nodes: [{ id: 'a1', kind: 'app', label: 'aevy-app', meta: '3×', state: 'run' }] }],
      edges: [{ from: 'c1', to: 'a1', state: 'run', label: '2×' }],
    };
    await g.update(next);
    expect(node(el, 'a1')).toBe(before);
    expect(edge(el, 'c1->a1')).toBe(beforeEdge);
    expect(before.className).toContain('bm-node--run');
    expect(beforeEdge.getAttribute('class')).toContain('bm-edge--run');
    expect(node(el, 'a8')).toBeNull();
    expect(edge(el, 'c1->a8')).toBeNull();
    // Idempotent: same data twice leaves the DOM as it was.
    const html = el.innerHTML;
    await g.update(next);
    expect(el.innerHTML).toBe(html);
  });

  it('highlights one hop on hover and fades the rest', async () => {
    const { el } = await make(sample);
    node(el, 'c2').dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
    const graph = el.querySelector('.bm-graph') as HTMLElement;
    expect(graph.hasAttribute('data-hl')).toBe(true);
    expect(on(node(el, 'c2'))).toBe(true);
    expect(on(node(el, 'a1'))).toBe(true);
    expect(on(node(el, 'c1'))).toBe(false);
    expect(on(edge(el, 'c2->a1'))).toBe(true);
    expect(on(edge(el, 'c1->a1'))).toBe(false);
    node(el, 'c2').dispatchEvent(new PointerEvent('pointerout', { bubbles: true, relatedTarget: document.body }));
    expect(graph.hasAttribute('data-hl')).toBe(false);
  });

  it('hovering an edge highlights its two ends', async () => {
    const { el } = await make(sample);
    edge(el, 'c1->a8').querySelector('.bm-edge-hit')?.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
    expect(on(node(el, 'c1'))).toBe(true);
    expect(on(node(el, 'a8'))).toBe(true);
    expect(on(node(el, 'a1'))).toBe(false);
  });

  it('chain mode follows ancestors and descendants on the general layout', async () => {
    const data: GraphData = {
      nodes: ['web', 'api', 'worker', 'db', 'cache', 'other'].map((id) => ({ id, label: id })),
      edges: [
        { from: 'web', to: 'api' }, { from: 'api', to: 'db' }, { from: 'worker', to: 'db' },
        { from: 'api', to: 'cache' }, { from: 'other', to: 'cache' },
      ],
    };
    const { el, g } = await make(data, { highlight: 'chain' });
    expect(el.querySelector('.bm-graph--layered')).not.toBeNull();
    expect(g.layout()?.nodes).toHaveLength(6);
    g.highlight('web');
    expect(['web', 'api', 'db', 'cache'].every((id) => on(node(el, id)))).toBe(true);
    expect(on(node(el, 'worker'))).toBe(false);
    expect(on(node(el, 'other'))).toBe(false);
    g.highlight('db');
    expect(['db', 'api', 'web', 'worker'].every((id) => on(node(el, id)))).toBe(true);
    expect(on(node(el, 'cache'))).toBe(false);
    g.highlight('not-in-this-graph');
    expect(el.querySelector('.bm-graph')?.hasAttribute('data-hl')).toBe(false);
  });

  it('focus highlights, Enter clicks, ghosts emit actions, tips show', async () => {
    const onNodeClick = vi.fn();
    const onAction = vi.fn();
    const { el } = await make(sample, { onNodeClick, onAction });
    const c2 = node(el, 'c2');
    expect(c2.getAttribute('role')).toBe('button');
    expect(c2.tabIndex).toBe(0);
    c2.focus();
    expect(on(node(el, 'a1'))).toBe(true);
    c2.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onNodeClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'c2' }), expect.anything());
    node(el, 'new').click();
    expect(onAction).toHaveBeenCalledWith('new-cluster', expect.objectContaining({ id: 'new' }), expect.anything());
    const tip = el.querySelector('.bm-tip') as HTMLElement;
    c2.blur();
    // Hidden and empty: no tooltip role (axe aria-tooltip-name), hidden from AT.
    expect(tip.hasAttribute('role')).toBe(false);
    expect(tip.getAttribute('aria-hidden')).toBe('true');
    node(el, 'c1').dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
    expect(tip.getAttribute('role')).toBe('tooltip');
    expect(tip.hasAttribute('aria-hidden')).toBe(false);
    expect(tip.textContent).toBe('Main cluster');
    expect(tip.classList.contains('bm-tip--on')).toBe(true);
    expect(node(el, 'c1').getAttribute('aria-describedby')).toBe(tip.id);
    node(el, 'c1').dispatchEvent(new PointerEvent('pointerout', { bubbles: true }));
    expect(tip.classList.contains('bm-tip--on')).toBe(false);
    expect(tip.hasAttribute('role')).toBe(false);
    expect(tip.getAttribute('aria-hidden')).toBe('true');
  });

  it('takes custom templates, CSS-variable themes and a grid', async () => {
    const { el } = await make(sample, {
      templates: { app: (n) => `<b class="mine">${n.label}</b>` },
      theme: { ok: 'lime', '--run': 'teal' },
      grid: true,
    });
    expect(node(el, 'a1').querySelector('.mine')?.textContent).toBe('aevy-app');
    expect(node(el, 'a1').className).toContain('bm-node--app');
    const graph = el.querySelector('.bm-graph') as HTMLElement;
    expect(graph.style.getPropertyValue('--ok')).toBe('lime');
    expect(graph.style.getPropertyValue('--run')).toBe('teal');
    expect(graph.className).toContain('bm-graph--grid');
  });

  it('destroy removes everything', async () => {
    const { el, g } = await make(sample);
    g.destroy();
    expect(el.children).toHaveLength(0);
  });
});
