/// <reference lib="dom" />
import { createElement, useEffect, useRef, type CSSProperties, type ReactElement } from 'react';
import type { GraphData, GraphEdge, GraphNode, GraphLayout, Viewport } from '@bromaid/layout/graph';
import { mount, type MountOptions, type MountedGraph } from '@bromaid/renderer/client';

export interface BromaidProps extends MountOptions {
  readonly data: GraphData;
  /** Receives the mounted graph (`zoomIn()`, `zoomOut()`, `fit()`, `highlight()`…), `null` after unmount. */
  readonly graphRef?: { current: MountedGraph | null };
  readonly className?: string;
  readonly style?: CSSProperties;
}

const CALLBACKS = ['onNodeClick', 'onAction', 'onEdgeClick', 'onLayout', 'onViewport', 'graphRef'] as const;

/**
 * Thin React wrapper around `mount()`: mounts once, calls `update()` when
 * `data` or an option changes, destroys on unmount. Callbacks may change on
 * every render without re-rendering the graph.
 */
export function Bromaid(props: BromaidProps): ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const graph = useRef<MountedGraph | null>(null);
  const latest = useRef(props);
  latest.current = props;

  const { data, className, style, templates, theme, ...plain } = props;
  const options = (): MountOptions => {
    const p = latest.current;
    return {
      ...stripCallbacks(p),
      ...(p.onNodeClick !== undefined
        ? { onNodeClick: (n: GraphNode, e: Event) => latest.current.onNodeClick?.(n, e) }
        : {}),
      ...(p.onAction !== undefined
        ? { onAction: (a: string, n: GraphNode, e: Event) => latest.current.onAction?.(a, n, e) }
        : {}),
      ...(p.onEdgeClick !== undefined
        ? { onEdgeClick: (x: GraphEdge, e: Event) => latest.current.onEdgeClick?.(x, e) }
        : {}),
      ...(p.onLayout !== undefined ? { onLayout: (l: GraphLayout) => latest.current.onLayout?.(l) } : {}),
      ...(p.onViewport !== undefined ? { onViewport: (v: Viewport) => latest.current.onViewport?.(v) } : {}),
    };
  };
  const key = JSON.stringify(plain, (k, v: unknown) =>
    (CALLBACKS as ReadonlyArray<string>).includes(k) ? v !== undefined : v,
  );
  const themeKey = JSON.stringify(theme ?? null);

  useEffect(() => {
    const el = ref.current;
    if (el === null) return undefined;
    graph.current = mount(el, latest.current.data, options());
    const handle = latest.current.graphRef;
    if (handle !== undefined) handle.current = graph.current;
    return () => {
      graph.current?.destroy();
      graph.current = null;
      if (handle !== undefined) handle.current = null;
    };
    // Mount once; later changes go through update().
  }, []);

  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    void graph.current?.update(data, options());
  }, [data, key, templates, themeKey]);

  return createElement('div', { ref, className, style });
}

function stripCallbacks(p: BromaidProps): MountOptions {
  const { data: _d, className: _c, style: _s, graphRef: _r, onNodeClick: _1, onAction: _2, onEdgeClick: _3, onLayout: _4, onViewport: _5, ...rest } = p;
  return rest;
}

export type { MountOptions, MountedGraph } from '@bromaid/renderer/client';
export type * from '@bromaid/layout/graph';
