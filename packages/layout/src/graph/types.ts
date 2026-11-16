/**
 * Graph data model for bromaid's interactive graphs (`mount()` in
 * `@bromaid/renderer/client`) and for the pure layouts that place them.
 *
 * Everything here is plain data: no DOM, no ELK. The same object can be laid
 * out on the server (string SVG edges) and mounted in the browser.
 */

/** Well-known node kinds that ship with a template; any other string works too. */
export type KnownGraphNodeKind = 'cluster' | 'app' | 'ghost';
export type GraphNodeKind = KnownGraphNodeKind | (string & Record<never, never>);

/**
 * `ok` / `run` / `off` / `fail` get their own styles; any other string is passed through
 * as a class (`bm-node--<state>`) so hosts can style their own states.
 */
export type GraphState = 'ok' | 'run' | 'off' | 'fail' | (string & Record<never, never>);

export interface GraphNode {
  readonly id: string;
  /** Picks the template. Defaults to `"app"`. */
  readonly kind?: GraphNodeKind;
  readonly label: string;
  /** Muted lines under the label (cluster template shows up to 3). */
  readonly lines?: ReadonlyArray<string>;
  /** Short right-aligned mono text (app template), e.g. `"3×"`. */
  readonly meta?: string;
  readonly state?: GraphState;
  /** Built-in icon name (`cluster`, `app`, `plus`, `db`, `globe`, `box`) or any string. */
  readonly icon?: string;
  /** Clicking the node follows this link. */
  readonly href?: string;
  /** Ghost nodes emit `onAction(action)` when clicked. */
  readonly action?: string;
  /** Tooltip text shown on hover / focus. */
  readonly tip?: string;
  /** Id of the group this node sits in (general layout only). */
  readonly group?: string;
}

export interface GraphColumn {
  readonly id: string;
  readonly nodes: ReadonlyArray<GraphNode>;
}

/** A labelled box around nodes (the DSL's containers). General layout only. */
export interface GraphGroup {
  readonly id: string;
  readonly label: string;
  /** Id of the enclosing group, for nesting. */
  readonly group?: string;
}

export interface GraphEdge {
  /** Defaults to `"<from>-><to>"` (with `#2`, `#3`… for repeats). */
  readonly id?: string;
  readonly from: string;
  readonly to: string;
  readonly state?: GraphState;
  readonly label?: string;
}

export interface GraphData {
  /** Only left-to-right is supported today. */
  readonly direction?: 'LR';
  /** Column layout: nodes in fixed columns, in the given order. */
  readonly columns?: ReadonlyArray<GraphColumn>;
  /** General (layered) layout: free nodes, placed by ELK. */
  readonly nodes?: ReadonlyArray<GraphNode>;
  readonly groups?: ReadonlyArray<GraphGroup>;
  readonly edges: ReadonlyArray<GraphEdge>;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface PlacedGraphNode {
  readonly node: GraphNode;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** Column index for the column layout, `null` for the general layout. */
  readonly column: number | null;
}

export interface PlacedGraphGroup {
  readonly group: GraphGroup;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly depth: number;
}

export interface EdgeEnds {
  /** Right-middle of the source. */
  readonly sx: number;
  readonly sy: number;
  /** Where the curve ends: left-middle of the target (minus the end gap, default 0). */
  readonly tx: number;
  readonly ty: number;
}

export interface PlacedGraphEdgeLabel {
  readonly text: string;
  /** Top-left of the label box. Text starts at `x` (left aligned). */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly side: 'above' | 'below';
}

export interface PlacedGraphEdge {
  readonly id: string;
  readonly edge: GraphEdge;
  readonly ends: EdgeEnds;
  /** SVG path `d` (one cubic). */
  readonly d: string;
  readonly label: PlacedGraphEdgeLabel | null;
}

export interface GraphLayout {
  readonly width: number;
  readonly height: number;
  readonly nodes: ReadonlyArray<PlacedGraphNode>;
  readonly groups: ReadonlyArray<PlacedGraphGroup>;
  readonly edges: ReadonlyArray<PlacedGraphEdge>;
}
