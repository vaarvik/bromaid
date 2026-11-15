import type { BromaidElement, Program } from '@bromaid/core';
import type { GraphData, GraphGroup, GraphNode } from './types.js';

/**
 * Turn a parsed DSL `Program` into `GraphData`, so any bromaid diagram can be
 * mounted interactively: nodes keep their type as `kind` and their slug as
 * `icon`, the sublabel becomes the first muted line, containers become groups.
 */
export function graphFromProgram(program: Program): GraphData {
  const nodes: GraphNode[] = [];
  const groups: GraphGroup[] = [];
  const visit = (children: ReadonlyArray<BromaidElement>, parent: string | null): void => {
    for (const el of children) {
      if (el.kind === 'container') {
        groups.push({ id: el.id, label: el.label, ...(parent !== null ? { group: parent } : {}) });
        visit(el.children, el.id);
      } else {
        nodes.push({
          id: el.id,
          kind: el.type,
          label: el.label,
          ...(el.sublabel !== null ? { lines: [el.sublabel] } : {}),
          ...(el.slug !== null ? { icon: el.slug } : {}),
          ...(parent !== null ? { group: parent } : {}),
        });
      }
    }
  };
  visit(program.root.children, null);
  const isNode = new Set(nodes.map((n) => n.id));
  return {
    direction: 'LR',
    nodes,
    groups,
    // Edges to a container have no node end in the graph model; keep node↔node.
    edges: program.edges
      .filter((e) => isNode.has(e.fromId) && isNode.has(e.toId))
      .map((e) => ({ from: e.fromId, to: e.toId, ...(e.label !== null ? { label: e.label } : {}) })),
  };
}

/** All nodes of a graph, flattening columns when present. */
export function graphNodes(data: GraphData): ReadonlyArray<GraphNode> {
  if (data.columns !== undefined && data.columns.length > 0) {
    return data.columns.flatMap((c) => c.nodes);
  }
  return data.nodes ?? [];
}
