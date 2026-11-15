import { describe, expect, it } from 'vitest';
import { parse } from '@bromaid/core';
import {
  EDGE_END_GAP,
  EDGE_LABEL_INSET,
  columnWidths,
  edgeControls,
  edgeEnds,
  edgeIds,
  edgePath,
  edgePoint,
  graphFromProgram,
  highlightForEdge,
  highlightForNode,
  layoutColumns,
  layoutLayered,
  placeEdgeLabels,
  type GraphData,
  type GraphEdge,
  type PlacedGraphEdgeLabel,
} from '../src/index.js';

const sample: GraphData = {
  direction: 'LR',
  columns: [
    {
      id: 'clusters',
      nodes: [
        { id: 'c1', kind: 'cluster', label: 'aevy-k8s-sweden-central-001', lines: ['Azure · 6 machines', '$2,784/mo', '7 built-in apps running'], state: 'ok' },
        { id: 'c2', kind: 'cluster', label: 'preview-cluster', lines: ['AWS · 2 machines'], state: 'ok' },
        { id: 'new', kind: 'ghost', label: 'New cluster', icon: 'plus', action: 'new-cluster' },
      ],
    },
    {
      id: 'apps',
      nodes: [
        { id: 'a1', kind: 'app', label: 'aevy-app', meta: '3×', state: 'ok' },
        { id: 'a2', kind: 'app', label: 'docs', meta: '1×', state: 'run' },
        { id: 'a8', kind: 'app', label: 'treetop', meta: '0', state: 'off' },
      ],
    },
  ],
  edges: [
    { from: 'c1', to: 'a1', state: 'ok', label: '2×' },
    { from: 'c2', to: 'a1', state: 'ok', label: '1×' },
    { from: 'c2', to: 'a2', state: 'run', label: '1×' },
    { from: 'c1', to: 'a8', state: 'off' },
  ],
};

const fixedHeights = (h: Record<string, number>) => (n: { id: string }) => h[n.id] ?? 40;

describe('column layout', () => {
  it('splits the width 1.35 : 1 with a 64px gap', () => {
    const [left, right] = columnWidths(2, 664, 64);
    expect(left).toBe(Math.floor((600 * 1.35) / 2.35));
    expect(right).toBe(Math.floor(600 / 2.35));
    expect((left ?? 0) / (right ?? 1)).toBeCloseTo(1.35, 1);
  });

  it('ranks nodes by column and keeps the given order', () => {
    const g = layoutColumns(sample, { width: 664 });
    const byId = new Map(g.nodes.map((n) => [n.node.id, n]));
    expect(g.nodes.map((n) => [n.node.id, n.column])).toEqual([
      ['c1', 0], ['c2', 0], ['new', 0], ['a1', 1], ['a2', 1], ['a8', 1],
    ]);
    const c1 = byId.get('c1');
    const a1 = byId.get('a1');
    expect(c1?.x).toBe(0);
    expect(a1?.x).toBe((c1?.width ?? 0) + 64);
    expect(g.width).toBe((c1?.width ?? 0) + 64 + (a1?.width ?? 0));
    // Given order is top-to-bottom.
    expect((byId.get('c1')?.y ?? 0) < (byId.get('c2')?.y ?? 0)).toBe(true);
    expect((byId.get('a2')?.y ?? 0) < (byId.get('a8')?.y ?? 0)).toBe(true);
  });

  it('centres every column vertically against the tallest', () => {
    const g = layoutColumns(sample, {
      width: 600,
      rowGap: 10,
      heightOf: fixedHeights({ c1: 100, c2: 80, new: 44, a1: 40, a2: 40, a8: 40 }),
    });
    const tallest = 100 + 80 + 44 + 20;
    expect(g.height).toBe(tallest);
    const apps = g.nodes.filter((n) => n.column === 1);
    const appsH = 40 * 3 + 20;
    expect(apps[0]?.y).toBe((tallest - appsH) / 2);
    const top = apps[0]?.y ?? 0;
    const last = apps[apps.length - 1];
    const bottom = (last?.y ?? 0) + (last?.height ?? 0);
    expect(top).toBeCloseTo(g.height - bottom);
    expect(g.nodes.find((n) => n.node.id === 'c1')?.y).toBe(0);
  });

  it('reorders to reduce crossings only when asked', () => {
    const data: GraphData = {
      columns: [
        { id: 'l', nodes: [{ id: 'x', label: 'x' }, { id: 'y', label: 'y' }] },
        { id: 'r', nodes: [{ id: 'q', label: 'q' }, { id: 'p', label: 'p' }] },
      ],
      edges: [{ from: 'x', to: 'p' }, { from: 'y', to: 'q' }],
    };
    const ids = (o: 'given' | 'crossings') =>
      layoutColumns(data, { width: 500, order: o }).nodes.filter((n) => n.column === 1).map((n) => n.node.id);
    expect(ids('given')).toEqual(['q', 'p']);
    expect(ids('crossings')).toEqual(['p', 'q']);
  });

  it('drops edges to unknown nodes', () => {
    const g = layoutColumns({ ...sample, edges: [...sample.edges, { from: 'c1', to: 'nope' }] }, { width: 600 });
    expect(g.edges).toHaveLength(4);
  });
});

describe('edge maths', () => {
  const s = { x: 0, y: 0, width: 100, height: 40 };
  const t = { x: 200, y: 100, width: 80, height: 40 };

  it('runs from the right-middle of the source to 6px before the left-middle of the target', () => {
    const e = edgeEnds(s, t);
    expect(e).toEqual({ sx: 100, sy: 20, tx: 200 - EDGE_END_GAP, ty: 120 });
  });

  it('puts both control points at the horizontal midpoint', () => {
    const e = edgeEnds(s, t);
    const c = edgeControls(e);
    const mid = (e.sx + e.tx) / 2;
    expect(c).toEqual({ c1x: mid, c1y: e.sy, c2x: mid, c2y: e.ty });
    expect(edgePath(e)).toBe(`M100 20C${mid} 20 ${mid} 120 194 120`);
  });

  it('evaluates the cubic at its ends and centre', () => {
    const e = edgeEnds(s, t);
    expect(edgePoint(e, 0)).toEqual({ x: 100, y: 20 });
    expect(edgePoint(e, 1)).toEqual({ x: 194, y: 120 });
    const m = edgePoint(e, 0.5);
    expect(m.x).toBeCloseTo(147);
    expect(m.y).toBeCloseTo(70);
  });

  it('keeps a minimum pull for back edges', () => {
    const c = edgeControls({ sx: 100, sy: 0, tx: 90, ty: 50 });
    expect(c.c1x).toBeGreaterThan(100);
    expect(c.c2x).toBeLessThan(90);
  });

  it('gives repeated pairs distinct ids', () => {
    expect(edgeIds([{ from: 'a', to: 'b' }, { from: 'a', to: 'b' }, { id: 'k', from: 'b', to: 'c' }]))
      .toEqual(['a->b', 'a->b#2', 'k']);
  });
});

describe('edge labels', () => {
  const overlaps = (a: PlacedGraphEdgeLabel, b: PlacedGraphEdgeLabel) =>
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

  it('sits 8px in from the source, above a rising curve and below a falling one', () => {
    const labels = placeEdgeLabels([
      { edge: { from: 's', to: 'up', label: 'up' }, ends: { sx: 100, sy: 100, tx: 200, ty: 20 } },
      { edge: { from: 's', to: 'dn', label: 'dn' }, ends: { sx: 100, sy: 100, tx: 200, ty: 180 } },
    ]);
    expect(labels[0]?.x).toBe(100 + EDGE_LABEL_INSET);
    expect(labels[0]?.side).toBe('above');
    expect((labels[0]?.y ?? 0) + (labels[0]?.height ?? 0)).toBeLessThan(100);
    expect(labels[1]?.side).toBe('below');
    expect(labels[1]?.y).toBeGreaterThan(100);
  });

  it('never overlaps for many edges from one node', () => {
    const ends = [-90, -40, -5, 0, 5, 30, 60, 120].map((dy) => ({
      edge: { from: 's', to: `t${dy}`, label: `${Math.abs(dy)}×` } as GraphEdge,
      ends: { sx: 100, sy: 100, tx: 200, ty: 100 + dy },
    }));
    const labels = placeEdgeLabels(ends).filter((l): l is PlacedGraphEdgeLabel => l !== null);
    expect(labels).toHaveLength(8);
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        expect(overlaps(labels[i] as PlacedGraphEdgeLabel, labels[j] as PlacedGraphEdgeLabel)).toBe(false);
      }
    }
  });

  it('places the sample labels without overlap', () => {
    const g = layoutColumns(sample, { width: 664 });
    const labels = g.edges.map((e) => e.label).filter((l): l is PlacedGraphEdgeLabel => l !== null);
    expect(labels).toHaveLength(3);
    const c2 = g.edges.filter((e) => e.edge.from === 'c2').map((e) => e.label as PlacedGraphEdgeLabel);
    expect(overlaps(c2[0] as PlacedGraphEdgeLabel, c2[1] as PlacedGraphEdgeLabel)).toBe(false);
    expect(g.edges.find((e) => e.edge.to === 'a8')?.label).toBeNull();
  });
});

describe('highlight walk', () => {
  // r1 → m → leaf1, r2 → m → leaf2, side → leaf2 ; unrelated: u
  const tree: GraphEdge[] = [
    { from: 'r1', to: 'm' },
    { from: 'r2', to: 'm' },
    { from: 'm', to: 'leaf1' },
    { from: 'm', to: 'leaf2' },
    { from: 'side', to: 'leaf2' },
    { from: 'u', to: 'v' },
  ];
  const sorted = (s: ReadonlySet<string>) => [...s].sort();

  it('neighbours: one hop only', () => {
    const h = highlightForNode(tree, 'r1', 'neighbours');
    expect(sorted(h.nodes)).toEqual(['m', 'r1']);
    expect(sorted(h.edges)).toEqual(['r1->m']);
  });

  it('chain: all ancestors and all descendants, not siblings of descendants', () => {
    const h = highlightForNode(tree, 'r1', 'chain');
    expect(sorted(h.nodes)).toEqual(['leaf1', 'leaf2', 'm', 'r1']);
    expect(h.nodes.has('r2')).toBe(false);
    expect(h.nodes.has('side')).toBe(false);
    const fromLeaf = highlightForNode(tree, 'leaf2', 'chain');
    expect(sorted(fromLeaf.nodes)).toEqual(['leaf2', 'm', 'r1', 'r2', 'side']);
    expect(fromLeaf.edges.has('m->leaf1')).toBe(false);
  });

  it('chain: a diamond reaches the bottom once through both sides', () => {
    const diamond: GraphEdge[] = [
      { from: 'a', to: 'b' }, { from: 'a', to: 'c' }, { from: 'b', to: 'd' }, { from: 'c', to: 'd' }, { from: 'd', to: 'e' },
    ];
    const h = highlightForNode(diamond, 'a', 'chain');
    expect(sorted(h.nodes)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(h.edges.size).toBe(5);
    const fromB = highlightForNode(diamond, 'b', 'chain');
    expect(sorted(fromB.nodes)).toEqual(['a', 'b', 'd', 'e']);
  });

  it('chain: terminates on a cycle', () => {
    const cycle: GraphEdge[] = [
      { from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'c', to: 'a' }, { from: 'c', to: 'x' },
    ];
    const h = highlightForNode(cycle, 'a', 'chain');
    expect(sorted(h.nodes)).toEqual(['a', 'b', 'c', 'x']);
    expect(h.edges.size).toBe(4);
    const self = highlightForNode([{ from: 'a', to: 'a' }], 'a', 'chain');
    expect(sorted(self.nodes)).toEqual(['a']);
  });

  it('edge hover: both ends, or the chains through the edge', () => {
    expect(sorted(highlightForEdge(tree, 'm->leaf1', 'neighbours').nodes)).toEqual(['leaf1', 'm']);
    const h = highlightForEdge(tree, 'm->leaf1', 'chain');
    expect(sorted(h.nodes)).toEqual(['leaf1', 'm', 'r1', 'r2']);
    expect(h.edges.has('m->leaf2')).toBe(false);
    expect(highlightForEdge(tree, 'nope', 'chain').nodes.size).toBe(0);
  });

  it('none: nothing', () => {
    expect(highlightForNode(tree, 'm', 'none').nodes.size).toBe(0);
  });
});

describe('general (layered) layout', () => {
  it('lays out free nodes left to right with groups', async () => {
    const g = await layoutLayered({
      groups: [{ id: 'g', label: 'Group' }],
      nodes: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B', group: 'g' },
        { id: 'c', label: 'C', group: 'g' },
      ],
      edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }],
    });
    const x = (id: string) => g.nodes.find((n) => n.node.id === id)?.x ?? -1;
    expect(x('a')).toBeLessThan(x('b'));
    expect(x('b')).toBeLessThan(x('c'));
    expect(g.groups).toHaveLength(1);
    const grp = g.groups[0];
    const b = g.nodes.find((n) => n.node.id === 'b');
    expect(b && grp && b.x >= grp.x && b.y >= grp.y).toBe(true);
    expect(g.edges).toHaveLength(2);
  });

  it('keeps column order as partitions', async () => {
    const g = await layoutLayered(sample);
    const col = (id: string) => g.nodes.find((n) => n.node.id === id)?.x ?? -1;
    expect(col('new')).toBeLessThan(col('a8'));
  });

  it('takes any DSL program', async () => {
    const data = graphFromProgram(parse('actor u "User"\ngroup "G" {\n  service api "API"\n}\nedge u -> api [label: calls]'));
    expect(data.nodes?.map((n) => n.id)).toEqual(['u', 'api']);
    expect(data.groups).toHaveLength(1);
    const g = await layoutLayered(data);
    expect(g.edges[0]?.label?.text).toBe('calls');
  });
});
