// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fitViewport, type GraphData } from '@bromaid/layout/graph';
import { graphCss, mount, type MountedGraph, type MountOptions } from '../src/client/index.js';
import { appTemplate } from '../src/graph/templates.js';

const sample: GraphData = {
  direction: 'LR',
  columns: [
    {
      id: 'clusters',
      nodes: [
        { id: 'c1', kind: 'cluster', label: 'main', lines: ['Azure'], state: 'ok', href: '/clusters/c1' },
        { id: 'c2', kind: 'cluster', label: 'preview', state: 'ok' },
      ],
    },
    {
      id: 'apps',
      nodes: [
        { id: 'a1', kind: 'app', label: 'web', meta: '3×', state: 'ok' },
        { id: 'a2', kind: 'app', label: 'docs', state: 'off' },
      ],
    },
  ],
  edges: [
    { from: 'c1', to: 'a1', state: 'ok' },
    { from: 'c2', to: 'a1', state: 'run' },
    { from: 'c1', to: 'a2', state: 'off' },
  ],
};

let graphs: MountedGraph[] = [];
function sized(e: HTMLElement, width: number, height: number): void {
  Object.defineProperty(e, 'clientWidth', { configurable: true, get: () => width });
  Object.defineProperty(e, 'clientHeight', { configurable: true, get: () => height });
}
async function make(data: GraphData, opts: MountOptions = {}) {
  const el = document.createElement('div');
  sized(el, 1000, 800);
  document.body.appendChild(el);
  const g = mount(el, data, { animate: 0, ...opts });
  graphs.push(g);
  await g.ready;
  const root = el.querySelector('.bm-graph') as HTMLElement;
  sized(root, 1000, 800);
  return { el, g, root };
}
const node = (el: HTMLElement, id: string) => el.querySelector(`[data-node="${id}"]`) as HTMLElement;
const edge = (el: HTMLElement, id: string) => el.querySelector(`[data-edge="${id}"]`) as SVGGElement;
const stage = (el: HTMLElement) => el.querySelector('.bm-stage') as HTMLElement;

afterEach(() => {
  for (const g of graphs) g.destroy();
  graphs = [];
  document.body.innerHTML = '';
});

/** First and last point of an SVG path `M x y C … x y`. */
function ends(d: string): { sx: number; sy: number; tx: number; ty: number } {
  const n = d.match(/-?[\d.]+/g)?.map(Number) ?? [];
  return { sx: n[0] ?? NaN, sy: n[1] ?? NaN, tx: n[n.length - 2] ?? NaN, ty: n[n.length - 1] ?? NaN };
}

describe('port dots sit on the edge (item 92)', () => {
  it('both dots are the path’s first and last point, also after an update moves the nodes', async () => {
    const { el, g } = await make(sample);
    const check = () => {
      for (const e of g.layout()?.edges ?? []) {
        const gEl = edge(el, e.id);
        const d = gEl.querySelector('.bm-edge-line')?.getAttribute('d') ?? '';
        const p = ends(d);
        const [start, end] = [...gEl.querySelectorAll('.bm-port')];
        expect(Number(start?.getAttribute('cx'))).toBeCloseTo(p.sx, 1);
        expect(Number(start?.getAttribute('cy'))).toBeCloseTo(p.sy, 1);
        expect(Number(end?.getAttribute('cx'))).toBeCloseTo(p.tx, 1);
        expect(Number(end?.getAttribute('cy'))).toBeCloseTo(p.ty, 1);
      }
    };
    check();
    const before = edge(el, 'c1->a1').querySelector('.bm-port--end')?.getAttribute('cy');
    await g.update({
      ...sample,
      columns: [
        sample.columns?.[0] as never,
        { id: 'apps', nodes: [{ id: 'x', kind: 'app', label: 'new first' }, { id: 'y', kind: 'app', label: 'second' }, ...(sample.columns?.[1]?.nodes ?? [])] },
      ],
    });
    expect(edge(el, 'c1->a1').querySelector('.bm-port--end')?.getAttribute('cy')).not.toBe(before);
    check();
  });
});

describe('node padding and lines (item 100)', () => {
  it('app nodes grow with their lines: min-height, 8px padding all round', () => {
    expect(graphCss).toContain('.bm-node--app{min-height:40px;align-items:center;gap:8px;padding:8px 10px}');
    expect(graphCss).not.toMatch(/\.bm-node--app\{height:/);
    const html = appTemplate({ id: 'a', kind: 'app', label: 'b-calendar-copy', lines: ['1 copy · calendar.johann.no'] });
    expect(html).toContain('<span class="bm-text"><span class="bm-label">b-calendar-copy</span><span class="bm-line">1 copy · calendar.johann.no</span></span>');
    expect(appTemplate({ id: 'a', kind: 'app', label: 'web' })).not.toContain('bm-text');
  });

  it('measures nodes rounded up, so a fractional width never cuts the text', async () => {
    const spy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 117.4, bottom: 50.2, width: 117.4, height: 50.2, toJSON: () => ({}) } as DOMRect);
    try {
      const { g } = await make(sample);
      for (const n of g.layout()?.nodes ?? []) expect(n.height).toBe(51);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('static by default (current users)', () => {
  it('no pan, no zoom, no controls, no tab stop on the canvas', async () => {
    const { el, g, root } = await make(sample);
    expect(root.className).not.toContain('bm-graph--pan');
    expect(root.hasAttribute('tabindex')).toBe(false);
    expect(el.querySelector('.bm-zoom')).toBeNull();
    root.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true }));
    expect(g.viewport()).toEqual({ x: 0, y: 0, k: 1 });
    expect(stage(el).style.transform).toBe('');
  });
});

describe('pan and zoom (item 95)', () => {
  const wide: GraphData = {
    ...sample,
    columns: sample.columns,
  };

  it('opens fitted and centred both ways, with zoom buttons', async () => {
    const { el, g, root } = await make(wide, { panZoom: true, fit: 'both' });
    g.fit();
    const laid = g.layout();
    expect(laid).not.toBeNull();
    if (laid === null) return;
    const want = fitViewport({ width: laid.width, height: laid.height }, { width: 1000, height: 800 }, { padding: 24 });
    expect(g.viewport()).toEqual(want);
    expect(want.y).toBeCloseTo((800 - laid.height * want.k) / 2, 6);
    expect(stage(el).style.transform).toBe(`translate(${want.x}px,${want.y}px) scale(${want.k})`);
    expect(root.className).toContain('bm-graph--pan');
    expect(root.tabIndex).toBe(0);
    const buttons = [...el.querySelectorAll('.bm-zoom button')].map((b) => b.getAttribute('aria-label'));
    expect(buttons).toEqual(['Zoom out', 'Zoom in', 'Fit to screen']);
  });

  it('a plain wheel pans, ctrl + wheel (pinch) zooms', async () => {
    const { g, root } = await make(wide, { panZoom: true });
    g.fit();
    const v0 = g.viewport();
    root.dispatchEvent(new WheelEvent('wheel', { deltaX: 10, deltaY: 40, bubbles: true, cancelable: true }));
    expect(g.viewport()).toEqual({ x: v0.x - 10, y: v0.y - 40, k: v0.k });
    const pinch = new WheelEvent('wheel', { deltaY: -20, ctrlKey: true, clientX: 500, clientY: 400, bubbles: true, cancelable: true });
    // happy-dom drops modifier keys from WheelEvent's init.
    Object.defineProperty(pinch, 'ctrlKey', { value: true });
    root.dispatchEvent(pinch);
    expect(g.viewport().k).toBeGreaterThan(v0.k);
  });

  it('+ / - / 0 keys and the buttons zoom and fit', async () => {
    const { el, g, root } = await make(wide, { panZoom: true });
    g.fit();
    const fitted = g.viewport();
    root.focus();
    root.dispatchEvent(new KeyboardEvent('keydown', { key: '+', bubbles: true, cancelable: true }));
    expect(g.viewport().k).toBeCloseTo(fitted.k * 1.25, 6);
    root.dispatchEvent(new KeyboardEvent('keydown', { key: '-', bubbles: true, cancelable: true }));
    root.dispatchEvent(new KeyboardEvent('keydown', { key: '-', bubbles: true, cancelable: true }));
    expect(g.viewport().k).toBeCloseTo(fitted.k / 1.25, 6);
    root.dispatchEvent(new KeyboardEvent('keydown', { key: '0', bubbles: true, cancelable: true }));
    expect(g.viewport()).toEqual(fitted);
    (el.querySelector('[data-zoom="in"]') as HTMLButtonElement).click();
    expect(g.viewport().k).toBeCloseTo(fitted.k * 1.25, 6);
    (el.querySelector('[data-zoom="fit"]') as HTMLButtonElement).click();
    expect(g.viewport()).toEqual(fitted);
    g.zoomOut();
    expect(g.viewport().k).toBeCloseTo(fitted.k / 1.25, 6);
    g.zoomIn();
    expect(g.viewport().k).toBeCloseTo(fitted.k, 6);
  });

  it('dragging the empty canvas pans; dragging a node does not', async () => {
    const onNodeClick = vi.fn();
    const { el, g, root } = await make(wide, { panZoom: true, onNodeClick });
    g.fit();
    const v0 = g.viewport();
    const ptr = (type: string, target: EventTarget, x: number, y: number) =>
      target.dispatchEvent(new PointerEvent(type, { pointerId: 1, button: 0, clientX: x, clientY: y, bubbles: true, cancelable: true }));
    ptr('pointerdown', stage(el), 100, 100);
    ptr('pointermove', root, 130, 90);
    ptr('pointerup', root, 130, 90);
    expect(g.viewport()).toEqual({ x: v0.x + 30, y: v0.y - 10, k: v0.k });
    const v1 = g.viewport();
    ptr('pointerdown', node(el, 'c2'), 100, 100);
    ptr('pointermove', root, 150, 150);
    ptr('pointerup', root, 150, 150);
    expect(g.viewport()).toEqual(v1);
  });

  it('Space + drag pans from anywhere, and the drag does not click the node', async () => {
    const onNodeClick = vi.fn();
    const { el, g, root } = await make(wide, { panZoom: true, onNodeClick });
    g.fit();
    const v0 = g.viewport();
    root.dispatchEvent(new PointerEvent('pointerenter'));
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    expect(root.className).toContain('bm-graph--grab');
    const ptr = (type: string, target: EventTarget, x: number, y: number) =>
      target.dispatchEvent(new PointerEvent(type, { pointerId: 2, button: 0, clientX: x, clientY: y, bubbles: true, cancelable: true }));
    ptr('pointerdown', node(el, 'c2'), 10, 10);
    ptr('pointermove', root, 60, 10);
    ptr('pointerup', root, 60, 10);
    node(el, 'c2').click();
    expect(onNodeClick).not.toHaveBeenCalled();
    expect(g.viewport().x).toBe(v0.x + 50);
    document.body.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
    expect(root.className).not.toContain('bm-graph--grab');
    // Nodes stay clickable and focusable while panning and zooming.
    node(el, 'c2').click();
    expect(onNodeClick).toHaveBeenCalledTimes(1);
    expect(node(el, 'c2').tabIndex).toBe(0);
    expect(node(el, 'c1').tagName).toBe('A');
  });

  it('double-click on the canvas zooms in at the pointer, shift zooms out', async () => {
    const { el, g } = await make(wide, { panZoom: true });
    g.fit();
    const k = g.viewport().k;
    stage(el).dispatchEvent(new MouseEvent('dblclick', { clientX: 400, clientY: 300, bubbles: true, cancelable: true }));
    expect(g.viewport().k).toBeCloseTo(Math.min(k * 2, 4), 6);
    stage(el).dispatchEvent(new MouseEvent('dblclick', { clientX: 400, clientY: 300, shiftKey: true, bubbles: true, cancelable: true }));
    expect(g.viewport().k).toBeCloseTo(k, 6);
  });

  it('turns off again on update: no transform, no controls, wheel ignored', async () => {
    const { el, g, root } = await make(wide, { panZoom: true });
    await g.update(wide, { panZoom: false });
    expect(el.querySelector('.bm-zoom')).toBeNull();
    expect(stage(el).style.transform).toBe('');
    expect(root.hasAttribute('tabindex')).toBe(false);
    root.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true }));
    expect(g.viewport()).toEqual({ x: 0, y: 0, k: 1 });
  });
});
