import type {
  BromaidContainer,
  BromaidEdge,
  BromaidNode,
  Program,
} from '@bromaid/core';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Bounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface PlacedContainer extends Bounds {
  readonly element: BromaidContainer;
  readonly depth: number;
}

export interface PlacedNode extends Bounds {
  readonly element: BromaidNode;
}

export interface PlacedEdgeLabel extends Bounds {
  readonly text: string;
}

export interface PlacedEdge {
  readonly edge: BromaidEdge;
  /** Connected polyline path in absolute coordinates. */
  readonly path: ReadonlyArray<Point>;
  readonly label: PlacedEdgeLabel | null;
}

export interface LayoutGraph {
  readonly width: number;
  readonly height: number;
  /** Containers, ordered shallow-to-deep so the renderer can paint outermost first. */
  readonly containers: ReadonlyArray<PlacedContainer>;
  readonly nodes: ReadonlyArray<PlacedNode>;
  readonly edges: ReadonlyArray<PlacedEdge>;
  /** Source program, kept for downstream tools that need to re-resolve elements. */
  readonly program: Program;
}

export interface LayoutOptions {
  /** Override default ELK layout options. Useful for tweaking spacing in tests. */
  readonly elkOptions?: Readonly<Record<string, string>>;
}
