import type {
  EdgeEnds,
  GraphEdge,
  PlacedGraphEdge,
  PlacedGraphEdgeLabel,
  PlacedGraphNode,
} from './types.js';

/** The curve stops this far before the target's left side. */
export const EDGE_END_GAP = 6;
/** Labels start this far into the edge from the source port. */
export const EDGE_LABEL_INSET = 8;
/** Gap between the line and the nearest label. */
export const EDGE_LABEL_OFFSET = 3;
export const EDGE_LABEL_HEIGHT = 13;
/** Approximate advance of the 10px mono label font. */
export const EDGE_LABEL_CHAR_W = 6.1;
/** Minimum horizontal pull of the control points (keeps back-edges smooth). */
export const EDGE_MIN_PULL = 24;

/**
 * Stable ids for edges: the edge's own `id`, else `from->to`, with `#2`, `#3`…
 * appended for repeated pairs so every edge has a distinct key.
 */
export function edgeIds(edges: ReadonlyArray<GraphEdge>): ReadonlyArray<string> {
  const seen = new Map<string, number>();
  return edges.map((e) => {
    const base = e.id ?? `${e.from}->${e.to}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}#${n}`;
  });
}

interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** From the right-middle of `source` to `endGap` before the left-middle of `target`. */
export function edgeEnds(source: Box, target: Box, endGap: number = EDGE_END_GAP): EdgeEnds {
  return {
    sx: source.x + source.width,
    sy: source.y + source.height / 2,
    tx: target.x - endGap,
    ty: target.y + target.height / 2,
  };
}

/** Control points of the cubic: both at the horizontal midpoint (or `EDGE_MIN_PULL` out). */
export function edgeControls(ends: EdgeEnds): { c1x: number; c1y: number; c2x: number; c2y: number } {
  const pull = Math.max(Math.abs(ends.tx - ends.sx) / 2, EDGE_MIN_PULL);
  return { c1x: ends.sx + pull, c1y: ends.sy, c2x: ends.tx - pull, c2y: ends.ty };
}

const r = (n: number): string => String(Math.round(n * 100) / 100);

/** SVG path data for one smooth cubic edge. */
export function edgePath(ends: EdgeEnds): string {
  const c = edgeControls(ends);
  return `M${r(ends.sx)} ${r(ends.sy)}C${r(c.c1x)} ${r(c.c1y)} ${r(c.c2x)} ${r(c.c2y)} ${r(ends.tx)} ${r(ends.ty)}`;
}

/** Point on the edge's cubic at parameter `t` in [0, 1]. */
export function edgePoint(ends: EdgeEnds, t: number): { x: number; y: number } {
  const c = edgeControls(ends);
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const d = 3 * u * t * t;
  const e = t * t * t;
  return {
    x: a * ends.sx + b * c.c1x + d * c.c2x + e * ends.tx,
    y: a * ends.sy + b * c.c1y + d * c.c2y + e * ends.ty,
  };
}

export function labelWidth(text: string): number {
  return Math.ceil(text.length * EDGE_LABEL_CHAR_W) + 2;
}

/**
 * Label boxes at the source end of each labelled edge.
 *
 * Every label starts `EDGE_LABEL_INSET` px into the edge. A curve that goes up
 * (or runs flat) gets its label above the line, one that goes down gets it
 * below. Labels of edges leaving the same node stack outward on their side,
 * the flattest edge nearest the line, so they never overlap.
 */
export function placeEdgeLabels(
  edges: ReadonlyArray<{ readonly edge: GraphEdge; readonly ends: EdgeEnds }>,
): ReadonlyArray<PlacedGraphEdgeLabel | null> {
  const out: Array<PlacedGraphEdgeLabel | null> = edges.map(() => null);
  // Group by source port (same node => same port point).
  const bySource = new Map<string, number[]>();
  edges.forEach((e, i) => {
    if (e.edge.label === undefined || e.edge.label === '') return;
    const key = e.edge.from;
    const list = bySource.get(key);
    if (list === undefined) bySource.set(key, [i]);
    else list.push(i);
  });
  for (const list of bySource.values()) {
    const up: number[] = [];
    const down: number[] = [];
    for (const i of list) {
      const e = edges[i];
      if (e === undefined) continue;
      if (e.ends.ty > e.ends.sy + 0.5) down.push(i);
      else up.push(i);
    }
    const dy = (i: number): number => {
      const e = edges[i];
      return e === undefined ? 0 : Math.abs(e.ends.ty - e.ends.sy);
    };
    up.sort((a, b) => dy(a) - dy(b) || a - b);
    down.sort((a, b) => dy(a) - dy(b) || a - b);
    const place = (ids: number[], side: 'above' | 'below'): void => {
      ids.forEach((i, slot) => {
        const e = edges[i];
        if (e === undefined) return;
        const text = e.edge.label ?? '';
        const y =
          side === 'above'
            ? e.ends.sy - EDGE_LABEL_OFFSET - EDGE_LABEL_HEIGHT * (slot + 1)
            : e.ends.sy + EDGE_LABEL_OFFSET + EDGE_LABEL_HEIGHT * slot;
        out[i] = {
          text,
          x: e.ends.sx + EDGE_LABEL_INSET,
          y,
          width: labelWidth(text),
          height: EDGE_LABEL_HEIGHT,
          side,
        };
      });
    };
    place(up, 'above');
    place(down, 'below');
  }
  return out;
}

/** Cubic edges between placed nodes; edges to unknown nodes are dropped. */
export function routeEdges(
  nodes: ReadonlyArray<PlacedGraphNode>,
  edges: ReadonlyArray<GraphEdge>,
  endGap: number = EDGE_END_GAP,
): ReadonlyArray<PlacedGraphEdge> {
  const byId = new Map<string, PlacedGraphNode>();
  for (const n of nodes) byId.set(n.node.id, n);
  const ids = edgeIds(edges);
  const routed: Array<{ id: string; edge: GraphEdge; ends: EdgeEnds }> = [];
  edges.forEach((edge, i) => {
    const s = byId.get(edge.from);
    const t = byId.get(edge.to);
    if (s === undefined || t === undefined) return;
    routed.push({ id: ids[i] ?? `${edge.from}->${edge.to}`, edge, ends: edgeEnds(s, t, endGap) });
  });
  const labels = placeEdgeLabels(routed);
  return routed.map((e, i) => ({ ...e, d: edgePath(e.ends), label: labels[i] ?? null }));
}
