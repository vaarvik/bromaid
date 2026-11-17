import type { ElkNode } from 'elkjs/lib/elk-api.js';
import { createElk } from './layout.js';
import { routeEdges } from './graph/edges.js';
import { estimateNodeHeight } from './graph/columns.js';
import { graphNodes } from './graph/program.js';
import { alignStacks } from './graph/align.js';
import type {
  GraphData,
  GraphLayout,
  GraphNode,
  PlacedGraphGroup,
  PlacedGraphNode,
  Size,
} from './graph/types.js';

export interface LayeredLayoutOptions {
  /** Measured node sizes. Missing ones fall back to an estimate. */
  readonly sizeOf?: (node: GraphNode) => Size;
  /** Gap between layers. Default 64 (same as the column gap). */
  readonly layerGap?: number;
  /** Gap between nodes in a layer. Default 16. */
  readonly nodeGap?: number;
  /** Space the curve leaves before the target. Default 0 (flush). */
  readonly endGap?: number;
  /** How nodes stacked in a group line up when the group sets no `align`. Default `"start"`. */
  readonly align?: 'start' | 'center';
  /** Override ELK options. */
  readonly elkOptions?: Readonly<Record<string, string>>;
}

/** Inner padding of a group frame: the sides, and the top that also holds the label. */
export const GROUP_PAD_SIDE = 16;
/** Label (9px from the top, ~13px tall) + the same 16px gap as the sides. */
export const GROUP_PAD_TOP = 38;
const GROUP_PAD = `[top=${GROUP_PAD_TOP},left=${GROUP_PAD_SIDE},bottom=${GROUP_PAD_SIDE},right=${GROUP_PAD_SIDE}]`;

export function estimateNodeSize(node: GraphNode): Size {
  const kind = node.kind ?? 'app';
  const width = kind === 'app' ? 200 : kind === 'ghost' ? 160 : 240;
  return { width, height: estimateNodeHeight(node, width) };
}

/**
 * General (layered) layout of a `GraphData` with ELK: free nodes, nested
 * groups, left to right. When the data has columns, each column becomes an
 * ELK partition so the column order still holds. Edges are drawn as the same
 * cubic curves as the column layout (ELK's own routes are not used).
 */
export async function layoutLayered(
  data: GraphData,
  opts: LayeredLayoutOptions = {},
): Promise<GraphLayout> {
  const sizeOf = opts.sizeOf ?? estimateNodeSize;
  const nodes = graphNodes(data);
  const columnOf = new Map<string, number>();
  data.columns?.forEach((c, i) => c.nodes.forEach((n) => columnOf.set(n.id, i)));
  const partitioned = columnOf.size > 0;

  const groups = data.groups ?? [];
  const groupIds = new Set(groups.map((g) => g.id));
  const elkById = new Map<string, ElkNode>();
  for (const g of groups) {
    elkById.set(g.id, {
      id: g.id,
      children: [],
      layoutOptions: {
        'elk.padding': GROUP_PAD,
        'elk.nodeSize.constraints': 'MINIMUM_SIZE',
        'elk.nodeSize.minimum': `(${Math.ceil(g.label.length * 7 + GROUP_PAD_SIDE * 2 + 8)},60)`,
      },
    });
  }
  const root: ElkNode = {
    id: '__graph_root__',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'elk.layered.spacing.nodeNodeBetweenLayers': String(opts.layerGap ?? 64),
      'elk.spacing.nodeNode': String(opts.nodeGap ?? 16),
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.padding': '[top=0,left=0,bottom=0,right=0]',
      ...(partitioned ? { 'elk.partitioning.activate': 'true' } : {}),
      ...opts.elkOptions,
    },
    children: [],
    edges: [],
  };
  const parentOf = (id: string | undefined): ElkNode =>
    id !== undefined && groupIds.has(id) ? (elkById.get(id) ?? root) : root;
  for (const g of groups) parentOf(g.group === g.id ? undefined : g.group).children?.push(elkById.get(g.id) as ElkNode);
  const nodeIds = new Set<string>();
  for (const n of nodes) {
    const s = sizeOf(n);
    nodeIds.add(n.id);
    const col = columnOf.get(n.id);
    parentOf(n.group).children?.push({
      id: n.id,
      width: s.width,
      height: s.height,
      ...(col !== undefined && n.group === undefined
        ? { layoutOptions: { 'elk.partitioning.partition': String(col) } }
        : {}),
    });
  }
  root.edges = data.edges
    .filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to))
    .map((e, i) => ({ id: `ge${i}`, sources: [e.from], targets: [e.to] }));

  const laid = await createElk().layout(root);

  const placedNodes: PlacedGraphNode[] = [];
  const placedGroups: PlacedGraphGroup[] = [];
  const byId = new Map(nodes.map((n) => [n.id, n] as const));
  const groupById = new Map(groups.map((g) => [g.id, g] as const));
  const walk = (parent: ElkNode, ox: number, oy: number, depth: number): void => {
    for (const c of parent.children ?? []) {
      const x = ox + (c.x ?? 0);
      const y = oy + (c.y ?? 0);
      const g = groupById.get(c.id);
      if (g !== undefined) {
        placedGroups.push({ group: g, x, y, width: c.width ?? 0, height: c.height ?? 0, depth });
        walk(c, x, y, depth + 1);
        continue;
      }
      const n = byId.get(c.id);
      if (n !== undefined) {
        placedNodes.push({ node: n, x, y, width: c.width ?? 0, height: c.height ?? 0, column: null });
      }
    }
  };
  walk(laid, 0, 0, 0);
  placedGroups.sort((a, b) => a.depth - b.depth);

  const aligned = alignStacks(placedNodes, placedGroups, {
    ...(opts.align !== undefined ? { align: opts.align } : {}),
    padRight: GROUP_PAD_SIDE,
  });

  return {
    width: laid.width ?? 0,
    height: laid.height ?? 0,
    nodes: aligned,
    groups: placedGroups,
    edges: routeEdges(aligned, data.edges, opts.endGap),
  };
}
