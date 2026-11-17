import { describe, expect, it } from 'vitest';
import {
  APP_NODE_HEIGHT,
  GROUP_PAD_SIDE,
  GROUP_PAD_TOP,
  NODE_LABEL_LINE,
  NODE_LINE,
  NODE_PAD,
  alignStacks,
  centreAt,
  clampZoom,
  estimateNodeHeight,
  fitViewport,
  keyAction,
  layoutLayered,
  panBy,
  pinchStep,
  revealBox,
  toGraph,
  toScreen,
  wheelAction,
  zoomAt,
  type GraphData,
  type GraphNode,
  type PlacedGraphGroup,
  type PlacedGraphNode,
} from '../src/index.js';

const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 6);

describe('node padding (item 100)', () => {
  const lines = (n: number): GraphNode => ({
    id: `n${n}`,
    kind: 'app',
    label: 'b-calendar-copy',
    ...(n > 1 ? { lines: Array.from({ length: n - 1 }, (_, i) => `line ${i + 1}`) } : {}),
  });
  it.each([1, 2, 3])('a %i-line node keeps >= 8px from text to border on all sides', (n) => {
    const h = estimateNodeHeight(lines(n), 240);
    const text = n === 1 ? 24 : NODE_LABEL_LINE + (n - 1) * NODE_LINE; // one line: the 24px tile
    expect(NODE_PAD).toBeGreaterThanOrEqual(8);
    expect((h - text) / 2).toBeGreaterThanOrEqual(8);
  });
  it('grows with its lines instead of clipping at 40px', () => {
    expect(estimateNodeHeight(lines(1), 240)).toBe(APP_NODE_HEIGHT);
    expect(estimateNodeHeight(lines(2), 240)).toBeGreaterThan(APP_NODE_HEIGHT);
    expect(estimateNodeHeight(lines(3), 240)).toBeGreaterThan(estimateNodeHeight(lines(2), 240));
  });
});

describe('stacked nodes in a group (item 99)', () => {
  const group: PlacedGraphGroup = { group: { id: 'g', label: 'Built-in apps' }, x: 0, y: 0, width: 232, height: 200, depth: 0 };
  // As ELK places them: one layer, each centred at its own width.
  const placed: PlacedGraphNode[] = [
    { node: { id: 'm', label: 'Malware scan', group: 'g' }, x: 46, y: 38, width: 140, height: 50, column: null },
    { node: { id: 'a', label: 'Attack detection', group: 'g' }, x: 36, y: 98, width: 160, height: 50, column: null },
    { node: { id: 'v', label: 'Vulnerability scanning', group: 'g' }, x: 16, y: 158, width: 200, height: 50, column: null },
  ];

  it('a 3-node vertical group gets equal x and equal width (the widest), left on the content edge', () => {
    const out = alignStacks(placed, [group]);
    expect(new Set(out.map((n) => n.x))).toEqual(new Set([16]));
    expect(new Set(out.map((n) => n.width))).toEqual(new Set([200]));
    expect(out.map((n) => n.y)).toEqual([38, 98, 158]);
  });

  it('never runs past the group content edge', () => {
    const narrow = { ...group, width: 180 };
    const out = alignStacks(placed, [narrow]);
    for (const n of out) expect(n.x + n.width).toBeLessThanOrEqual(narrow.x + narrow.width - GROUP_PAD_SIDE);
  });

  it('align "center" keeps the layout placement', () => {
    const out = alignStacks(placed, [{ ...group, group: { ...group.group, align: 'center' } }]);
    expect(out).toEqual(placed);
    expect(alignStacks(placed, [group], { align: 'center' })).toEqual(placed);
  });

  it('separate layers in one group align each on its own', () => {
    const two: PlacedGraphNode[] = [
      ...placed,
      { node: { id: 'x', label: 'X', group: 'g' }, x: 300, y: 38, width: 100, height: 40, column: null },
      { node: { id: 'y', label: 'Y long', group: 'g' }, x: 290, y: 90, width: 120, height: 40, column: null },
    ];
    const out = alignStacks(two, [{ ...group, width: 500 }]);
    const by = (id: string) => out.find((n) => n.node.id === id);
    expect(by('x')?.x).toBe(290);
    expect(by('x')?.width).toBe(120);
    expect(by('m')?.x).toBe(16);
  });

  it('layoutLayered left-aligns a real vertical group with one shared width', async () => {
    const data: GraphData = {
      groups: [{ id: 'g', label: 'Built-in apps' }],
      nodes: [
        { id: 'c', label: 'Cluster' },
        { id: 'm', label: 'Malware scan', group: 'g' },
        { id: 'a', label: 'Attack detection', group: 'g' },
        { id: 'v', label: 'Vulnerability scanning', group: 'g' },
      ],
      edges: [{ from: 'c', to: 'm' }, { from: 'c', to: 'a' }, { from: 'c', to: 'v' }],
    };
    const widths: Record<string, number> = { c: 120, m: 130, a: 150, v: 190 };
    const g = await layoutLayered(data, { sizeOf: (n) => ({ width: widths[n.id] ?? 100, height: 50 }) });
    const ins = g.nodes.filter((n) => n.node.group === 'g');
    expect(new Set(ins.map((n) => n.x)).size).toBe(1);
    expect(new Set(ins.map((n) => n.width))).toEqual(new Set([190]));
    const grp = g.groups[0];
    expect(grp).toBeDefined();
    if (grp === undefined) return;
    expect(ins[0]?.x).toBeCloseTo(grp.x + GROUP_PAD_SIDE, 0);
    // The label has as much room under it as the sides have.
    expect(Math.min(...ins.map((n) => n.y)) - grp.y).toBeGreaterThanOrEqual(GROUP_PAD_TOP);
    // Edges end on the aligned boxes.
    for (const e of g.edges) {
      const t = ins.find((n) => n.node.id === e.edge.to);
      if (t !== undefined) close(e.ends.tx, t.x);
    }
  });
});

describe('viewport maths (item 95)', () => {
  it('fits a large graph centred both ways', () => {
    const v = fitViewport({ width: 2000, height: 500 }, { width: 1000, height: 800 }, { padding: 0 });
    close(v.k, 0.5);
    close(v.x, 0);
    close(v.y, (800 - 250) / 2);
  });

  it('fits a small graph at 100% and centres it vertically too', () => {
    const v = fitViewport({ width: 400, height: 200 }, { width: 1000, height: 800 });
    expect(v).toEqual({ x: 300, y: 300, k: 1 });
    expect(centreAt({ width: 400, height: 200 }, { width: 1000, height: 800 }, 2)).toEqual({ x: 100, y: 200, k: 2 });
  });

  it('keeps padding free when fitting', () => {
    const v = fitViewport({ width: 1000, height: 100 }, { width: 1048, height: 800 }, { padding: 24 });
    close(v.k, 1);
    close(v.x, 24);
  });

  it('zooms at the pointer: the graph point under it stays put', () => {
    const v0 = { x: 40, y: -20, k: 0.8 };
    const before = toGraph(v0, 300, 200);
    const v1 = zoomAt(v0, 1.5, 300, 200);
    const after = toScreen(v1, before.x, before.y);
    close(after.x, 300);
    close(after.y, 200);
    close(v1.k, 1.2);
  });

  it('clamps the zoom between the limits, and still keeps the pointer point', () => {
    expect(clampZoom(100)).toBe(4);
    expect(clampZoom(0.001)).toBe(0.1);
    expect(clampZoom(Number.NaN)).toBe(1);
    const v = zoomAt({ x: 0, y: 0, k: 3 }, 10, 100, 100);
    expect(v.k).toBe(4);
    const p = toScreen(v, ...(Object.values(toGraph({ x: 0, y: 0, k: 3 }, 100, 100)) as [number, number]));
    close(p.x, 100);
  });

  it('a plain wheel / two-finger scroll pans; pinch (ctrl or ⌘ + wheel) zooms', () => {
    expect(wheelAction({ deltaX: 10, deltaY: 30 })).toEqual({ kind: 'pan', dx: -10, dy: -30 });
    expect(wheelAction({ deltaX: 0, deltaY: 3, deltaMode: 1 })).toEqual({ kind: 'pan', dx: -0, dy: -48 });
    expect(wheelAction({ deltaX: 0, deltaY: 30, shiftKey: true })).toEqual({ kind: 'pan', dx: -30, dy: -0 });
    const pinchOut = wheelAction({ deltaX: 0, deltaY: -10, ctrlKey: true });
    expect(pinchOut.kind).toBe('zoom');
    if (pinchOut.kind === 'zoom') expect(pinchOut.factor).toBeGreaterThan(1);
    const pinchIn = wheelAction({ deltaX: 0, deltaY: 10, metaKey: true });
    if (pinchIn.kind === 'zoom') expect(pinchIn.factor).toBeLessThan(1);
    // A big mouse-wheel notch zooms a bounded step.
    const notch = wheelAction({ deltaX: 0, deltaY: -500, ctrlKey: true });
    if (notch.kind === 'zoom') expect(notch.factor).toBeLessThanOrEqual(2 ** 0.5 + 1e-9);
  });

  it('keys: + / = in, - / − out, 0 fits; with a modifier nothing', () => {
    expect(['+', '=', '-', '_', '−', '0', 'a'].map((key) => keyAction({ key }))).toEqual(['in', 'in', 'out', 'out', 'out', 'fit', null]);
    expect(keyAction({ key: '0', ctrlKey: true })).toBeNull();
    expect(keyAction({ key: '+', metaKey: true })).toBeNull();
  });

  it('pans by a delta', () => {
    expect(panBy({ x: 1, y: 2, k: 3 }, 10, -5)).toEqual({ x: 11, y: -3, k: 3 });
  });

  it('pinch: fingers apart zoom in at their midpoint; moving both pans', () => {
    const v0 = { x: 0, y: 0, k: 1 };
    const zoom = pinchStep(v0, [{ x: 100, y: 100 }, { x: 200, y: 100 }], [{ x: 50, y: 100 }, { x: 250, y: 100 }]);
    close(zoom.k, 2);
    const mid = toScreen(zoom, 150, 100);
    close(mid.x, 150);
    close(mid.y, 100);
    const pan = pinchStep(v0, [{ x: 0, y: 0 }, { x: 10, y: 0 }], [{ x: 5, y: 7 }, { x: 15, y: 7 }]);
    expect(pan).toEqual({ x: 5, y: 7, k: 1 });
  });

  it('reveals a focused node: the smallest pan that brings it into view', () => {
    const view = { width: 800, height: 600 };
    const v = { x: 0, y: 0, k: 1 };
    expect(revealBox(v, { x: 100, y: 100, width: 100, height: 40 }, view)).toBe(v);
    expect(revealBox(v, { x: 900, y: 100, width: 100, height: 40 }, view)).toEqual({ x: -216, y: 0, k: 1 });
    expect(revealBox(v, { x: -50, y: -60, width: 100, height: 40 }, view)).toEqual({ x: 66, y: 76, k: 1 });
    const z = revealBox({ x: 0, y: 0, k: 2 }, { x: 500, y: 0, width: 50, height: 20 }, view);
    expect(z.x).toBe(800 - 16 - 1100);
  });
});
