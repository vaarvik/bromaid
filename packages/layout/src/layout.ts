import type { BromaidEdge, Program } from '@bromaid/core';
import ELK from 'elkjs/lib/elk.bundled.js';
import type {
  ElkEdgeSection,
  ElkExtendedEdge,
  ElkNode,
} from 'elkjs/lib/elk-api.js';
import { buildElkGraph } from './elk-graph.js';
import type {
  LayoutGraph,
  LayoutOptions,
  PlacedContainer,
  PlacedEdge,
  PlacedEdgeLabel,
  PlacedNode,
  Point,
} from './types.js';

/**
 * Lay out a parsed Program with ELK and return a fully-typed LayoutGraph.
 *
 * Uses the no-worker bundle (`elkjs/lib/elk.bundled.js`) so this runs in Node,
 * Cloudflare Workers, the edge runtime, and React Server Components without
 * any bundler-specific worker URL fixup.
 */
export async function layout(
  program: Program,
  opts: LayoutOptions = {},
): Promise<LayoutGraph> {
  const elk = new ELK();
  const root = buildElkGraph(program, opts.elkOptions);
  const laid = await elk.layout(root);
  return flatten(program, laid);
}

interface Offset {
  readonly x: number;
  readonly y: number;
}

/**
 * elkjs adds a non-standard `container` property to each edge in the output
 * tree, naming the lowest common ancestor in whose local coordinate space the
 * edge sections live. The official `ElkExtendedEdge` type does not declare it,
 * so we narrow at this single boundary instead of casting at every read site.
 */
function getEdgeContainer(edge: ElkExtendedEdge): string | null {
  const candidate = (edge as { readonly container?: unknown }).container;
  return typeof candidate === 'string' ? candidate : null;
}

function flatten(program: Program, laid: ElkNode): LayoutGraph {
  const containers: PlacedContainer[] = [];
  const nodes: PlacedNode[] = [];
  const placed: PlacedEdge[] = [];

  // First pass: walk the tree and record absolute offsets for every container,
  // plus collect node/container positions and a flat list of edges with their
  // owning ELK parent (the level the edge was authored at).
  const containerOffsets = new Map<string, Offset>();
  const flatEdges: ElkExtendedEdge[] = [];

  // The synthetic root has id "root" in our buildElkGraph output; the program
  // root container in the AST has id "__root__". Both should map to (0,0).
  containerOffsets.set('root', { x: 0, y: 0 });
  containerOffsets.set('__root__', { x: 0, y: 0 });
  if (typeof laid.id === 'string') {
    containerOffsets.set(laid.id, { x: 0, y: 0 });
  }

  walk(laid, 0, 0, -1);

  function walk(parent: ElkNode, ox: number, oy: number, depth: number): void {
    if (typeof parent.id === 'string' && !containerOffsets.has(parent.id)) {
      containerOffsets.set(parent.id, { x: ox, y: oy });
    }

    for (const child of parent.children ?? []) {
      const cx = ox + (child.x ?? 0);
      const cy = oy + (child.y ?? 0);
      const element = program.elements.get(child.id);
      const w = child.width ?? 0;
      const h = child.height ?? 0;
      if (element !== undefined) {
        if (element.kind === 'container') {
          containerOffsets.set(element.id, { x: cx, y: cy });
          containers.push({
            element,
            x: cx,
            y: cy,
            width: w,
            height: h,
            depth: depth + 1,
          });
        } else {
          nodes.push({ element, x: cx, y: cy, width: w, height: h });
        }
      } else if (typeof child.id === 'string') {
        // Anonymous (uid'd) container — track its offset so cross-container
        // edges that target it can resolve their LCA.
        containerOffsets.set(child.id, { x: cx, y: cy });
      }
      walk(child, cx, cy, depth + 1);
    }

    for (const edge of parent.edges ?? []) {
      flatEdges.push(edge);
    }
  }

  // Second pass: place each edge using the offset of its `container` (the LCA
  // computed by ELK). Falling back to (0, 0) is correct for root-level edges.
  for (const elkEdge of flatEdges) {
    const containerId = getEdgeContainer(elkEdge);
    const offset =
      containerId !== null
        ? (containerOffsets.get(containerId) ?? { x: 0, y: 0 })
        : { x: 0, y: 0 };
    const result = placeEdge(program.edges, elkEdge, offset.x, offset.y);
    if (result !== null) placed.push(result);
  }

  containers.sort((a, b) => a.depth - b.depth);
  const alignedNodes = leftAlignEdgelessNodesInContainers(program, containers, nodes);
  const deoverlappedNodes = deoverlapEdgelessNodes(program, containers, alignedNodes);

  return {
    width: laid.width ?? 0,
    height: laid.height ?? 0,
    containers,
    nodes: deoverlappedNodes,
    edges: placed,
    program,
  };
}

const ROOT_INNER_LEFT = 24;
const CONTAINER_INNER_LEFT = 18;
const EDGELESS_NODE_MIN_GAP_Y = 10;

function leftAlignEdgelessNodesInContainers(
  program: Program,
  containers: ReadonlyArray<PlacedContainer>,
  nodes: ReadonlyArray<PlacedNode>,
): ReadonlyArray<PlacedNode> {
  const degree = new Map<string, number>();
  for (const e of program.edges) {
    degree.set(e.fromId, (degree.get(e.fromId) ?? 0) + 1);
    degree.set(e.toId, (degree.get(e.toId) ?? 0) + 1);
  }

  const containerById = new Map<string, PlacedContainer>();
  for (const c of containers) containerById.set(c.element.id, c);

  const parentContainer = new Map<string, string>();
  const walk = (c: typeof program.root): void => {
    for (const ch of c.children) {
      if (ch.kind === 'container') walk(ch);
      else parentContainer.set(ch.id, c.id);
    }
  };
  walk(program.root);

  return nodes.map((n) => {
    if ((degree.get(n.element.id) ?? 0) > 0) return n;
    const pid = parentContainer.get(n.element.id) ?? program.root.id;
    const pc = containerById.get(pid);
    const targetX = pc ? pc.x + CONTAINER_INNER_LEFT : ROOT_INNER_LEFT;
    if (n.x <= targetX + 0.01) return n;
    return { ...n, x: targetX };
  });
}

function deoverlapEdgelessNodes(
  program: Program,
  containers: ReadonlyArray<PlacedContainer>,
  nodes: ReadonlyArray<PlacedNode>,
): ReadonlyArray<PlacedNode> {
  const degree = new Map<string, number>();
  for (const e of program.edges) {
    degree.set(e.fromId, (degree.get(e.fromId) ?? 0) + 1);
    degree.set(e.toId, (degree.get(e.toId) ?? 0) + 1);
  }

  // Build parent container mapping (node id -> container id).
  const parentContainer = new Map<string, string>();
  const walk = (c: typeof program.root): void => {
    for (const ch of c.children) {
      if (ch.kind === 'container') walk(ch);
      else parentContainer.set(ch.id, c.id);
    }
  };
  walk(program.root);

  const containerById = new Map<string, PlacedContainer>();
  for (const c of containers) containerById.set(c.element.id, c);

  // Group edgeless nodes per parent container (or root).
  const groups = new Map<string, PlacedNode[]>();
  for (const n of nodes) {
    if ((degree.get(n.element.id) ?? 0) > 0) continue;
    const pid = parentContainer.get(n.element.id) ?? program.root.id;
    const list = groups.get(pid);
    if (list === undefined) groups.set(pid, [n]);
    else list.push(n);
  }

  // For each group, sort by y then enforce a minimum vertical separation.
  const yOverride = new Map<string, number>();
  for (const [pid, list] of groups) {
    const sorted = [...list].sort((a, b) => a.y - b.y || a.x - b.x);
    let cursorY: number | null = null;

    // If the group lives in a known container, keep within its inner top padding.
    const pc = containerById.get(pid);
    const minY = pc ? pc.y + 32 : 24;

    for (const n of sorted) {
      const desiredY: number =
        cursorY === null ? Math.max(n.y, minY) : Math.max(n.y, cursorY);
      yOverride.set(n.element.id, desiredY);
      cursorY = desiredY + n.height + EDGELESS_NODE_MIN_GAP_Y;
    }
  }

  if (yOverride.size === 0) return nodes;
  return nodes.map((n) => {
    const y = yOverride.get(n.element.id);
    return y === undefined ? n : { ...n, y };
  });
}

function placeEdge(
  programEdges: ReadonlyArray<BromaidEdge>,
  elkEdge: ElkExtendedEdge,
  ox: number,
  oy: number,
): PlacedEdge | null {
  const id = elkEdge.id;
  if (typeof id !== 'string' || !id.startsWith('e')) return null;
  const idx = Number.parseInt(id.slice(1), 10);
  if (!Number.isFinite(idx)) return null;
  const original = programEdges[idx];
  if (original === undefined) return null;

  const path: Point[] = [];
  const sections: ReadonlyArray<ElkEdgeSection> = elkEdge.sections ?? [];
  for (const section of sections) {
    path.push({
      x: ox + section.startPoint.x,
      y: oy + section.startPoint.y,
    });
    for (const bp of section.bendPoints ?? []) {
      path.push({ x: ox + bp.x, y: oy + bp.y });
    }
    path.push({
      x: ox + section.endPoint.x,
      y: oy + section.endPoint.y,
    });
  }

  let label: PlacedEdgeLabel | null = null;
  const lbl = elkEdge.labels?.[0];
  if (lbl !== undefined && typeof lbl.text === 'string') {
    label = {
      text: lbl.text,
      x: ox + (lbl.x ?? 0),
      y: oy + (lbl.y ?? 0),
      width: lbl.width ?? 40,
      height: lbl.height ?? 14,
    };
  }

  return { edge: original, path, label };
}
