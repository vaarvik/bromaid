import type { GraphGroup, PlacedGraphGroup, PlacedGraphNode } from './types.js';

export interface StackAlignOptions {
  /** Default alignment for groups without their own `align`. Default `"start"`. */
  readonly align?: 'start' | 'center';
  /** The group's inner padding on the right (its content edge), in px. Default 16. */
  readonly padRight?: number;
}

/**
 * Line up nodes stacked in a group. Nodes of one group whose horizontal spans
 * overlap form a vertical list (one layer of the layered layout); with
 * `align: "start"` every node of such a list starts at the list's left edge
 * and takes the widest node's width (never past the group's content edge), so
 * icons and texts line up. `"center"` keeps the layout's own placement.
 * Returns new placed nodes; others are passed through unchanged.
 */
export function alignStacks(
  nodes: ReadonlyArray<PlacedGraphNode>,
  groups: ReadonlyArray<PlacedGraphGroup>,
  opts: StackAlignOptions = {},
): ReadonlyArray<PlacedGraphNode> {
  const padRight = opts.padRight ?? 16;
  const out = nodes.slice();
  const index = new Map<PlacedGraphNode, number>();
  nodes.forEach((n, i) => index.set(n, i));
  for (const g of groups) {
    const align = alignOf(g.group, opts.align);
    if (align !== 'start') continue;
    const members = nodes.filter((n) => n.node.group === g.group.id).sort((a, b) => a.x - b.x || a.y - b.y);
    for (const stack of stacksOf(members)) {
      if (stack.length < 2) continue;
      const x = Math.min(...stack.map((n) => n.x));
      const widest = Math.max(...stack.map((n) => n.width));
      const room = g.x + g.width - padRight - x;
      const width = room > 0 ? Math.min(widest, room) : widest;
      for (const n of stack) {
        const i = index.get(n);
        if (i !== undefined) out[i] = { ...n, x, width };
      }
    }
  }
  return out;
}

function alignOf(group: GraphGroup, fallback: 'start' | 'center' | undefined): 'start' | 'center' {
  return group.align ?? fallback ?? 'start';
}

/** Nodes (sorted by x) split into runs whose horizontal spans overlap. */
function stacksOf(sorted: ReadonlyArray<PlacedGraphNode>): PlacedGraphNode[][] {
  const stacks: PlacedGraphNode[][] = [];
  let current: PlacedGraphNode[] = [];
  let right = -Infinity;
  for (const n of sorted) {
    if (current.length > 0 && n.x < right - 0.5) {
      current.push(n);
      right = Math.max(right, n.x + n.width);
    } else {
      if (current.length > 0) stacks.push(current);
      current = [n];
      right = n.x + n.width;
    }
  }
  if (current.length > 0) stacks.push(current);
  return stacks;
}
