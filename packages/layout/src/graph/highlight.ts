import { edgeIds } from './edges.js';
import type { GraphEdge } from './types.js';

/**
 * `neighbours`: one hop — the node, its edges and the nodes at their other ends.
 * `chain`: the full path — every ancestor up to the top parents and every
 * descendant down to the last children, transitively, in both directions.
 * `none`: no highlighting.
 */
export type HighlightMode = 'neighbours' | 'chain' | 'none';

export interface HighlightSet {
  readonly nodes: ReadonlySet<string>;
  readonly edges: ReadonlySet<string>;
}

interface Indexed {
  readonly id: string;
  readonly from: string;
  readonly to: string;
}

function index(edges: ReadonlyArray<GraphEdge>): ReadonlyArray<Indexed> {
  const ids = edgeIds(edges);
  return edges.map((e, i) => ({ id: ids[i] ?? '', from: e.from, to: e.to }));
}

/**
 * Walk one direction from `start` (`up` follows edges backwards to parents,
 * `down` forwards to children). A visited set makes cycles terminate.
 */
function walk(
  edges: ReadonlyArray<Indexed>,
  start: string,
  dir: 'up' | 'down',
  nodes: Set<string>,
  seenEdges: Set<string>,
): void {
  const visited = new Set<string>([start]);
  const queue = [start];
  while (queue.length > 0) {
    const at = queue.shift() as string;
    for (const e of edges) {
      const here = dir === 'down' ? e.from : e.to;
      if (here !== at) continue;
      const next = dir === 'down' ? e.to : e.from;
      seenEdges.add(e.id);
      nodes.add(next);
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
}

/** What to highlight when a node is hovered or focused. */
export function highlightForNode(
  edges: ReadonlyArray<GraphEdge>,
  nodeId: string,
  mode: HighlightMode,
): HighlightSet {
  const nodes = new Set<string>();
  const hit = new Set<string>();
  if (mode === 'none') return { nodes, edges: hit };
  nodes.add(nodeId);
  const list = index(edges);
  if (mode === 'neighbours') {
    for (const e of list) {
      if (e.from === nodeId || e.to === nodeId) {
        hit.add(e.id);
        nodes.add(e.from);
        nodes.add(e.to);
      }
    }
  } else {
    walk(list, nodeId, 'up', nodes, hit);
    walk(list, nodeId, 'down', nodes, hit);
  }
  return { nodes, edges: hit };
}

/**
 * What to highlight when an edge is hovered. `neighbours`: the edge and its two
 * ends. `chain`: every path through the edge — the ancestors of its source,
 * the edge, and the descendants of its target.
 */
export function highlightForEdge(
  edges: ReadonlyArray<GraphEdge>,
  edgeId: string,
  mode: HighlightMode,
): HighlightSet {
  const nodes = new Set<string>();
  const hit = new Set<string>();
  if (mode === 'none') return { nodes, edges: hit };
  const list = index(edges);
  const e = list.find((x) => x.id === edgeId);
  if (e === undefined) return { nodes, edges: hit };
  hit.add(e.id);
  nodes.add(e.from);
  nodes.add(e.to);
  if (mode === 'chain') {
    walk(list, e.from, 'up', nodes, hit);
    walk(list, e.to, 'down', nodes, hit);
  }
  return { nodes, edges: hit };
}
