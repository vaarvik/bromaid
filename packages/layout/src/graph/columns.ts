import { routeEdges } from './edges.js';
import type { GraphColumn, GraphData, GraphLayout, GraphNode, PlacedGraphNode } from './types.js';

export const COLUMN_GAP = 64;
export const COLUMN_ROW_GAP = 10;
/** The first column is this much wider than each of the others. */
export const FIRST_COLUMN_WEIGHT = 1.35;
export const COLUMN_MIN_WIDTH = 80;

export type ColumnOrder = 'given' | 'crossings';

export interface ColumnLayoutOptions {
  /** Width to fit (the container's width). */
  readonly width: number;
  /** Horizontal gap between columns. Default 64. */
  readonly gap?: number;
  /** Vertical gap between nodes in a column. Default 10. */
  readonly rowGap?: number;
  /** Relative column widths. Default: first column 1.35, the others 1. */
  readonly weights?: ReadonlyArray<number>;
  /**
   * `given` (default) keeps every column in the order it was written.
   * `crossings` reorders columns after the first to reduce edge crossings.
   */
  readonly order?: ColumnOrder;
  /** Node height at a given column width. Defaults to `estimateNodeHeight`. */
  readonly heightOf?: (node: GraphNode, columnWidth: number) => number;
  /** Space the curve leaves before the target. Default 0 (flush). */
  readonly endGap?: number;
}

/** Padding inside every built-in node, all four sides (text box to border), in px. */
export const NODE_PAD = 8;
/** Line heights of the built-in templates: the label and each muted line. */
export const NODE_LABEL_LINE = 18;
export const NODE_LINE = 16;
/** A one-line app node (24px tile + padding). */
export const APP_NODE_HEIGHT = 40;

/**
 * Rough height of a built-in template at a given width, for server-side
 * layout. In the browser `mount()` measures the real HTML instead.
 * Every node keeps at least `NODE_PAD` between its text and its border on
 * all sides and grows with its lines.
 */
export function estimateNodeHeight(node: GraphNode, columnWidth: number): number {
  const kind = node.kind ?? 'app';
  const lines = (node.lines ?? []).slice(0, 3);
  if (kind === 'app') {
    if (lines.length === 0) return APP_NODE_HEIGHT;
    return NODE_PAD * 2 + NODE_LABEL_LINE + lines.length * NODE_LINE;
  }
  if (kind === 'ghost') return 44;
  // cluster (and unknown kinds): 12px padding, 36px icon tile, wrapped text.
  const textWidth = Math.max(columnWidth - 24 - 36 - 10, 40);
  const perLine = Math.max(Math.floor(textWidth / 7), 1);
  const labelLines = Math.max(1, Math.ceil(node.label.length / perLine));
  const extra = lines.reduce(
    (n, l) => n + Math.max(1, Math.ceil(l.length / Math.floor(perLine * 1.1))),
    0,
  );
  const text = labelLines * NODE_LABEL_LINE + extra * NODE_LINE;
  return Math.max(text, 36) + 24;
}

/** Column widths that fill `width` with the given weights and gap. */
export function columnWidths(
  count: number,
  width: number,
  gap: number = COLUMN_GAP,
  weights?: ReadonlyArray<number>,
): ReadonlyArray<number> {
  if (count <= 0) return [];
  const w = Array.from({ length: count }, (_, i) =>
    weights?.[i] ?? (i === 0 && count > 1 ? FIRST_COLUMN_WEIGHT : 1),
  );
  const total = w.reduce((a, b) => a + b, 0);
  const free = Math.max(width - gap * (count - 1), 0);
  return w.map((x) => Math.max(Math.floor((free * x) / total), COLUMN_MIN_WIDTH));
}

/**
 * Reorder every column after the first by the mean position of its neighbours
 * in the column before (barycentre heuristic). Nodes without such neighbours
 * keep their written slot. Stable and deterministic.
 */
export function orderByCrossings(
  columns: ReadonlyArray<GraphColumn>,
  edges: GraphData['edges'],
): ReadonlyArray<GraphColumn> {
  const out: GraphColumn[] = columns.slice(0, 1).map((c) => c);
  for (let ci = 1; ci < columns.length; ci++) {
    const prev = out[ci - 1];
    const col = columns[ci];
    if (prev === undefined || col === undefined) continue;
    const pos = new Map<string, number>();
    prev.nodes.forEach((n, i) => pos.set(n.id, i));
    const scored = col.nodes.map((n, i) => {
      const ps: number[] = [];
      for (const e of edges) {
        if (e.to === n.id && pos.has(e.from)) ps.push(pos.get(e.from) ?? 0);
        else if (e.from === n.id && pos.has(e.to)) ps.push(pos.get(e.to) ?? 0);
      }
      const scale = prev.nodes.length / Math.max(col.nodes.length, 1);
      const bary = ps.length > 0 ? ps.reduce((a, b) => a + b, 0) / ps.length : i * scale;
      return { n, i, bary };
    });
    scored.sort((a, b) => a.bary - b.bary || a.i - b.i);
    out.push({ ...col, nodes: scored.map((s) => s.n) });
  }
  return out;
}

/**
 * Column layout: each column is a fixed rank, nodes stack top-down in the
 * written order, and every column is centred vertically against the tallest.
 * Pure and synchronous; no ELK.
 */
export function layoutColumns(data: GraphData, opts: ColumnLayoutOptions): GraphLayout {
  const gap = opts.gap ?? COLUMN_GAP;
  const rowGap = opts.rowGap ?? COLUMN_ROW_GAP;
  const heightOf = opts.heightOf ?? estimateNodeHeight;
  const written = data.columns ?? [];
  const columns = opts.order === 'crossings' ? orderByCrossings(written, data.edges) : written;
  const widths = columnWidths(columns.length, opts.width, gap, opts.weights);

  const stacks = columns.map((col, ci) => {
    const w = widths[ci] ?? COLUMN_MIN_WIDTH;
    const heights = col.nodes.map((n) => heightOf(n, w));
    const total = heights.reduce((a, b) => a + b, 0) + rowGap * Math.max(col.nodes.length - 1, 0);
    return { col, w, heights, total };
  });
  const height = stacks.reduce((m, s) => Math.max(m, s.total), 0);

  const nodes: PlacedGraphNode[] = [];
  let x = 0;
  stacks.forEach((s, ci) => {
    let y = (height - s.total) / 2;
    s.col.nodes.forEach((node, i) => {
      const h = s.heights[i] ?? 0;
      nodes.push({ node, x, y, width: s.w, height: h, column: ci });
      y += h + rowGap;
    });
    x += s.w + gap;
  });
  const width = Math.max(x - gap, 0);

  return {
    width,
    height,
    nodes,
    groups: [],
    edges: routeEdges(nodes, data.edges, opts.endGap),
  };
}
