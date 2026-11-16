/// <reference lib="dom" />
import {
  columnWidths,
  COLUMN_GAP,
  edgePath,
  estimateNodeHeight,
  graphNodes,
  highlightForEdge,
  highlightForNode,
  layoutColumns,
  type ColumnOrder,
  type EdgeEnds,
  type GraphData,
  type GraphEdge,
  type GraphLayout,
  type GraphNode,
  type HighlightMode,
  type HighlightSet,
  type PlacedGraphEdge,
  type PlacedGraphEdgeLabel,
} from '@bromaid/layout/graph';
import { graphCss } from '../graph/css.js';
import { edgeClass, edgeLabelBaseline, renderGraphEdge } from '../graph/markup.js';
import { builtinTemplateFor, nodeClass } from '../graph/templates.js';

export interface NodeTemplateContext {
  /** Width the node will be laid out at (`null` = natural width, general layout). */
  readonly width: number | null;
}

/**
 * Custom template: return an HTML string (escape your own text — see
 * `escapeXml`) or a DOM node. It fills the node's wrapper element, which keeps
 * the `bm-node bm-node--<kind> bm-node--<state>` classes and the interaction.
 */
export type NodeTemplate = (node: GraphNode, ctx: NodeTemplateContext) => string | Node;

export interface MountOptions {
  /**
   * `columns` (the default when `data.columns` is set): fixed columns that fit
   * the container's width. `layered`: bromaid's general ELK layout (loaded on
   * demand), default when the data has free `nodes`.
   */
  readonly layout?: 'columns' | 'layered';
  /** `neighbours` (default): one hop. `chain`: all ancestors + descendants. `none`. */
  readonly highlight?: HighlightMode;
  /** Templates per node kind; override `cluster`, `app`, `ghost` or add your own. */
  readonly templates?: Readonly<Record<string, NodeTemplate>>;
  /** CSS variables to set on the graph, e.g. `{ ok: '#3a3', '--run': '#36f' }`. */
  readonly theme?: Readonly<Record<string, string>>;
  /** Dotted grid background. */
  readonly grid?: boolean;
  /** Inner padding around the graph, in px. Default 0. */
  readonly padding?: number;
  /** Column layout: gap between columns (64), between rows (10), relative widths, ordering. */
  readonly gap?: number;
  readonly rowGap?: number;
  readonly weights?: ReadonlyArray<number>;
  readonly order?: ColumnOrder;
  /** Position animation on update, in ms. Default 150; 0 = off. Off under reduced motion. */
  readonly animate?: number;
  /** Inject the stylesheet into `document.head` (default true). Use `graphCss` yourself when false. */
  readonly css?: boolean;
  /** Accessible name of the graph. */
  readonly label?: string;
  /** A node was clicked (or Enter pressed). Call `event.preventDefault()` to stop an `href`. */
  readonly onNodeClick?: (node: GraphNode, event: Event) => void;
  /** A node with an `action` (ghost nodes) was clicked. */
  readonly onAction?: (action: string, node: GraphNode, event: Event) => void;
  readonly onEdgeClick?: (edge: GraphEdge, event: Event) => void;
  /** Called after every layout with the result (positions, size). */
  readonly onLayout?: (layout: GraphLayout) => void;
}

export interface MountedGraph {
  /** Re-render with new data (and optionally changed options). Idempotent; animates moves. */
  update(data: GraphData, options?: MountOptions): Promise<void>;
  /** Highlight a node as if hovered (`null` clears). */
  highlight(nodeId: string | null): void;
  /** Resolves when the current render (including an async layered layout) is placed. */
  readonly ready: Promise<void>;
  /** The latest layout. */
  layout(): GraphLayout | null;
  destroy(): void;
}

interface NodeView {
  el: HTMLElement;
  key: string;
  node: GraphNode;
}

interface EdgeView {
  g: SVGGElement;
  line: SVGPathElement;
  hit: SVGPathElement;
  port: SVGCircleElement;
  label: SVGTextElement | null;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
function injectCss(doc: Document): void {
  if (doc.querySelector('style[data-bromaid]') !== null) return;
  const style = doc.createElement('style');
  style.setAttribute('data-bromaid', '');
  style.textContent = graphCss;
  doc.head.appendChild(style);
}

function reducedMotion(win: Window | null): boolean {
  return win?.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const ease = (t: number): number => 1 - (1 - t) ** 3;

function lerpEnds(a: EdgeEnds, b: EdgeEnds, t: number): EdgeEnds {
  return { sx: lerp(a.sx, b.sx, t), sy: lerp(a.sy, b.sy, t), tx: lerp(a.tx, b.tx, t), ty: lerp(a.ty, b.ty, t) };
}

/**
 * Mount an interactive graph into `el`. Nodes are HTML (they inherit the
 * page's fonts and CSS variables), edges are one SVG layer under them.
 */
export function mount(el: HTMLElement, data: GraphData, options: MountOptions = {}): MountedGraph {
  const doc = el.ownerDocument;
  const win = doc.defaultView;
  let opts = options;
  let current = data;
  let laid: GraphLayout | null = null;
  let token = 0;
  let raf = 0;
  let destroyed = false;
  let hovered: { kind: 'node' | 'edge'; id: string } | null = null;
  let lastWidth = -1;

  const root = doc.createElement('div');
  const stage = doc.createElement('div');
  stage.className = 'bm-stage';
  const groupsLayer = doc.createElement('div');
  const svg = doc.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'bm-edges');
  const nodesLayer = doc.createElement('div');
  const tip = doc.createElement('div');
  tip.className = 'bm-tip';
  // Hidden and empty until shown: no tooltip role (axe: aria-tooltip-name).
  tip.setAttribute('aria-hidden', 'true');
  const tipId = `bm-tip-${Math.random().toString(36).slice(2, 9)}`;
  tip.id = tipId;
  stage.append(groupsLayer, svg, nodesLayer, tip);
  root.appendChild(stage);
  el.appendChild(root);

  const nodeViews = new Map<string, NodeView>();
  const edgeViews = new Map<string, EdgeView>();
  const groupViews = new Map<string, HTMLElement>();
  const nodeBoxes = new Map<string, Box>();
  const edgeEnds = new Map<string, EdgeEnds>();
  const labelPos = new Map<string, { x: number; y: number }>();
  const groupBoxes = new Map<string, Box>();

  const mode = (): 'columns' | 'layered' =>
    opts.layout ?? (current.columns !== undefined && current.columns.length > 0 ? 'columns' : 'layered');

  // ---- nodes ---------------------------------------------------------------

  function tagFor(node: GraphNode): 'a' | 'button' | 'div' {
    if (node.href !== undefined) return 'a';
    if (node.action !== undefined || node.kind === 'ghost') return 'button';
    return 'div';
  }

  function syncNode(node: GraphNode, width: number | null): void {
    const template = opts.templates?.[node.kind ?? 'app'];
    const key = JSON.stringify(node) + (template === undefined ? '' : '#custom');
    let view = nodeViews.get(node.id);
    const tag = tagFor(node);
    if (view !== undefined && view.el.tagName.toLowerCase() !== tag) {
      view.el.remove();
      view = undefined;
    }
    if (view === undefined) {
      const created = doc.createElement(tag);
      created.setAttribute('data-node', node.id);
      if (tag === 'button') created.setAttribute('type', 'button');
      nodesLayer.appendChild(created);
      view = { el: created, key: '', node };
      nodeViews.set(node.id, view);
    }
    const e = view.el;
    const clickable = tag === 'div' && opts.onNodeClick !== undefined;
    e.className = nodeClass(node, clickable);
    if (tag === 'div') {
      e.tabIndex = 0;
      if (clickable) e.setAttribute('role', 'button');
      else e.removeAttribute('role');
    }
    if (tag === 'a') e.setAttribute('href', node.href ?? '');
    if (node.tip !== undefined) e.setAttribute('aria-describedby', tipId);
    else e.removeAttribute('aria-describedby');
    if (view.key !== key) {
      const out = template !== undefined ? template(node, { width }) : builtinTemplateFor(node.kind ?? 'app')(node);
      if (typeof out === 'string') e.innerHTML = out;
      else e.replaceChildren(out);
      view.key = key;
    }
    view.node = node;
  }

  // ---- layout ----------------------------------------------------------------

  async function computeLayout(): Promise<GraphLayout> {
    const pad = opts.padding ?? 0;
    const nodes = graphNodes(current);
    const keep = new Set(nodes.map((x) => x.id));
    for (const [id, v] of nodeViews) {
      if (!keep.has(id)) {
        v.el.remove();
        nodeViews.delete(id);
        nodeBoxes.delete(id);
      }
    }
    root.className = `bm-graph bm-graph--${mode()}${opts.grid === true ? ' bm-graph--grid' : ''}`;
    root.style.padding = `${pad}px`;
    if (mode() === 'columns') {
      const cols = current.columns ?? [];
      const width = Math.max(el.clientWidth - pad * 2, 0);
      lastWidth = el.clientWidth;
      const widths = columnWidths(cols.length, width, opts.gap ?? COLUMN_GAP, opts.weights);
      // Write every width first, then read every height (one reflow).
      cols.forEach((c, ci) => c.nodes.forEach((node) => {
        const w = widths[ci] ?? 0;
        syncNode(node, w);
        const v = nodeViews.get(node.id);
        if (v !== undefined) v.el.style.width = `${w}px`;
      }));
      const heights = new Map<string, number>();
      for (const [id, v] of nodeViews) heights.set(id, v.el.offsetHeight);
      return layoutColumns(current, {
        width,
        ...(opts.gap !== undefined ? { gap: opts.gap } : {}),
        ...(opts.rowGap !== undefined ? { rowGap: opts.rowGap } : {}),
        ...(opts.weights !== undefined ? { weights: opts.weights } : {}),
        ...(opts.order !== undefined ? { order: opts.order } : {}),
        heightOf: (node, w) => {
          const h = heights.get(node.id) ?? 0;
          return h > 0 ? h : estimateNodeHeight(node, w);
        },
      });
    }
    for (const node of nodes) {
      syncNode(node, null);
      const v = nodeViews.get(node.id);
      if (v !== undefined) v.el.style.width = '';
    }
    const sizes = new Map<string, { width: number; height: number }>();
    for (const [id, v] of nodeViews) sizes.set(id, { width: v.el.offsetWidth, height: v.el.offsetHeight });
    // ELK is only loaded when a general layout is asked for.
    const { layoutLayered, estimateNodeSize } = await import('@bromaid/layout');
    return layoutLayered(current, {
      sizeOf: (node) => {
        const s = sizes.get(node.id);
        return s !== undefined && s.width > 0 && s.height > 0 ? s : estimateNodeSize(node);
      },
    });
  }

  // ---- placing ---------------------------------------------------------------

  function syncEdges(edges: ReadonlyArray<PlacedGraphEdge>): void {
    const keep = new Set(edges.map((e) => e.id));
    for (const [id, v] of edgeViews) {
      if (!keep.has(id)) {
        v.g.remove();
        edgeViews.delete(id);
        edgeEnds.delete(id);
        labelPos.delete(id);
      }
    }
    for (const e of edges) {
      let v = edgeViews.get(e.id);
      if (v === undefined) {
        const holder = doc.createElementNS(SVG_NS, 'svg');
        holder.innerHTML = renderGraphEdge(e);
        const g = holder.firstElementChild as SVGGElement;
        svg.appendChild(g);
        v = {
          g,
          hit: g.querySelector('.bm-edge-hit') as SVGPathElement,
          line: g.querySelector('.bm-edge-line') as SVGPathElement,
          port: g.querySelector('.bm-port') as SVGCircleElement,
          label: g.querySelector('.bm-edge-label'),
        };
        edgeViews.set(e.id, v);
      }
      v.g.setAttribute('class', edgeClass(e));
      if (e.label === null && v.label !== null) {
        v.label.remove();
        v.label = null;
      } else if (e.label !== null) {
        if (v.label === null) {
          v.label = doc.createElementNS(SVG_NS, 'text');
          v.label.setAttribute('class', 'bm-edge-label');
          v.g.appendChild(v.label);
        }
        if (v.label.textContent !== e.label.text) v.label.textContent = e.label.text;
      }
    }
  }

  function syncGroups(next: GraphLayout): void {
    const keep = new Set(next.groups.map((g) => g.group.id));
    for (const [id, gEl] of groupViews) {
      if (!keep.has(id)) {
        gEl.remove();
        groupViews.delete(id);
        groupBoxes.delete(id);
      }
    }
    for (const g of next.groups) {
      let gEl = groupViews.get(g.group.id);
      if (gEl === undefined) {
        gEl = doc.createElement('div');
        gEl.className = 'bm-group';
        gEl.setAttribute('data-group', g.group.id);
        const lbl = doc.createElement('span');
        lbl.className = 'bm-group-label';
        gEl.appendChild(lbl);
        groupsLayer.appendChild(gEl);
        groupViews.set(g.group.id, gEl);
      }
      const lbl = gEl.firstElementChild;
      if (lbl !== null && lbl.textContent !== g.group.label) lbl.textContent = g.group.label;
    }
  }

  function draw(next: GraphLayout, t: number, from: {
    nodes: Map<string, Box>;
    edges: Map<string, EdgeEnds>;
    labels: Map<string, { x: number; y: number }>;
    groups: Map<string, Box>;
  }): void {
    const k = ease(t);
    for (const p of next.nodes) {
      const v = nodeViews.get(p.node.id);
      if (v === undefined) continue;
      const a = from.nodes.get(p.node.id);
      const x = a === undefined ? p.x : lerp(a.x, p.x, k);
      const y = a === undefined ? p.y : lerp(a.y, p.y, k);
      v.el.style.transform = `translate(${x}px,${y}px)`;
      v.el.style.width = `${p.width}px`;
      nodeBoxes.set(p.node.id, { x, y, w: p.width, h: p.height });
    }
    for (const g of next.groups) {
      const gEl = groupViews.get(g.group.id);
      if (gEl === undefined) continue;
      const a = from.groups.get(g.group.id);
      const b = { x: g.x, y: g.y, w: g.width, h: g.height };
      const c = a === undefined ? b : { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), w: lerp(a.w, b.w, k), h: lerp(a.h, b.h, k) };
      gEl.style.transform = `translate(${c.x}px,${c.y}px)`;
      gEl.style.width = `${c.w}px`;
      gEl.style.height = `${c.h}px`;
      groupBoxes.set(g.group.id, c);
    }
    for (const e of next.edges) {
      const v = edgeViews.get(e.id);
      if (v === undefined) continue;
      const a = from.edges.get(e.id);
      const ends = a === undefined ? e.ends : lerpEnds(a, e.ends, k);
      const d = a === undefined ? e.d : edgePath(ends);
      v.line.setAttribute('d', d);
      v.hit.setAttribute('d', d);
      v.port.setAttribute('cx', String(ends.sx));
      v.port.setAttribute('cy', String(ends.sy));
      edgeEnds.set(e.id, ends);
      if (v.label !== null && e.label !== null) {
        const la = from.labels.get(e.id);
        const lx = la === undefined ? e.label.x : lerp(la.x, e.label.x, k);
        const ly = la === undefined ? e.label.y : lerp(la.y, e.label.y, k);
        v.label.setAttribute('x', String(lx));
        v.label.setAttribute('y', String(edgeLabelBaseline({ y: ly, height: (e.label as PlacedGraphEdgeLabel).height })));
        labelPos.set(e.id, { x: lx, y: ly });
      }
    }
  }

  function place(next: GraphLayout): void {
    const w = Math.max(next.width, 1);
    const h = Math.max(next.height, 1);
    stage.style.width = `${w}px`;
    stage.style.height = `${h}px`;
    svg.setAttribute('width', String(w));
    svg.setAttribute('height', String(h));
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    syncGroups(next);
    syncEdges(next.edges);
    const from = {
      nodes: new Map(nodeBoxes),
      edges: new Map(edgeEnds),
      labels: new Map(labelPos),
      groups: new Map(groupBoxes),
    };
    if (win !== null) win.cancelAnimationFrame(raf);
    const duration = opts.animate ?? 150;
    const animate = laid !== null && duration > 0 && win !== null && !reducedMotion(win);
    laid = next;
    if (!animate) {
      draw(next, 1, { nodes: new Map(), edges: new Map(), labels: new Map(), groups: new Map() });
    } else {
      const start = win.performance.now();
      const frame = (now: number): void => {
        if (destroyed) return;
        const t = Math.min((now - start) / duration, 1);
        draw(next, t, from);
        if (t < 1) raf = win.requestAnimationFrame(frame);
      };
      draw(next, 0, from);
      raf = win.requestAnimationFrame(frame);
    }
    applyHighlight();
    opts.onLayout?.(next);
  }

  async function render(): Promise<void> {
    const mine = ++token;
    if (opts.css !== false) injectCss(doc);
    root.setAttribute('role', 'group');
    if (opts.label !== undefined) root.setAttribute('aria-label', opts.label);
    else root.removeAttribute('aria-label');
    for (const [k, v] of Object.entries(opts.theme ?? {})) {
      root.style.setProperty(k.startsWith('--') ? k : `--${k}`, v);
    }
    const next = await computeLayout();
    if (mine !== token || destroyed) return;
    place(next);
  }

  // ---- highlight + tooltip -----------------------------------------------------

  function applyHighlight(): void {
    let set: HighlightSet | null = null;
    const hl = opts.highlight ?? 'neighbours';
    const known = hovered !== null && (hovered.kind === 'edge' || nodeViews.has(hovered.id));
    if (hovered !== null && known && hl !== 'none') {
      set = hovered.kind === 'node'
        ? highlightForNode(current.edges, hovered.id, hl)
        : highlightForEdge(current.edges, hovered.id, hl);
      if (set.nodes.size === 0) set = null;
    }
    if (set === null) root.removeAttribute('data-hl');
    else root.setAttribute('data-hl', '');
    for (const [id, v] of nodeViews) v.el.classList.toggle('bm-on', set?.nodes.has(id) === true);
    // Edge ids: the layout and the highlight walk both key edges by edgeIds().
    for (const [id, v] of edgeViews) {
      const on = set?.edges.has(id) === true;
      v.g.classList.toggle('bm-on', on);
      if (on) svg.appendChild(v.g); // paint highlighted edges on top
    }
    for (const g of laid?.groups ?? []) {
      const members = (laid?.nodes ?? []).filter((p) => p.node.group === g.group.id);
      groupViews.get(g.group.id)?.classList.toggle('bm-on', members.some((p) => set?.nodes.has(p.node.id) === true));
    }
    const node = hovered?.kind === 'node' ? nodeViews.get(hovered.id)?.node : undefined;
    const box = hovered?.kind === 'node' ? nodeBoxes.get(hovered.id) : undefined;
    if (node?.tip !== undefined && box !== undefined) {
      tip.textContent = node.tip;
      tip.style.left = `${box.x + box.w / 2}px`;
      tip.style.top = `${box.y}px`;
      tip.setAttribute('role', 'tooltip');
      tip.removeAttribute('aria-hidden');
      tip.classList.add('bm-tip--on');
    } else {
      tip.classList.remove('bm-tip--on');
      tip.removeAttribute('role');
      tip.setAttribute('aria-hidden', 'true');
    }
  }

  function setHovered(next: { kind: 'node' | 'edge'; id: string } | null): void {
    if (next?.kind === hovered?.kind && next?.id === hovered?.id) return;
    hovered = next;
    applyHighlight();
  }

  function targetOf(t: EventTarget | null): { kind: 'node' | 'edge'; id: string } | null {
    const elt = t as Element | null;
    if (elt === null || typeof elt.closest !== 'function') return null;
    const n = elt.closest('[data-node]');
    if (n !== null && root.contains(n)) return { kind: 'node', id: n.getAttribute('data-node') ?? '' };
    const e = elt.closest('[data-edge]');
    if (e !== null && root.contains(e)) return { kind: 'edge', id: e.getAttribute('data-edge') ?? '' };
    return null;
  }

  const onOver = (ev: Event): void => {
    const t = targetOf(ev.target);
    if (t !== null) setHovered(t);
  };
  const onOut = (ev: Event): void => {
    const rel = (ev as MouseEvent).relatedTarget;
    const t = targetOf(rel);
    if (t !== null) return;
    const focused = targetOf(doc.activeElement);
    setHovered(focused?.kind === 'node' ? focused : null);
  };
  const onFocusIn = (ev: Event): void => {
    const t = targetOf(ev.target);
    if (t !== null) setHovered(t);
  };
  const onFocusOut = (ev: Event): void => {
    const t = targetOf((ev as FocusEvent).relatedTarget);
    setHovered(t);
  };
  const onClick = (ev: Event): void => {
    const t = targetOf(ev.target);
    if (t === null) return;
    if (t.kind === 'edge') {
      const e = laid?.edges.find((x) => x.id === t.id);
      if (e !== undefined) opts.onEdgeClick?.(e.edge, ev);
      return;
    }
    const node = nodeViews.get(t.id)?.node;
    if (node === undefined) return;
    opts.onNodeClick?.(node, ev);
    if (node.action !== undefined) opts.onAction?.(node.action, node, ev);
  };
  const onKey = (ev: Event): void => {
    const k = ev as KeyboardEvent;
    if (k.key !== 'Enter' && k.key !== ' ') return;
    const elt = k.target as HTMLElement | null;
    // <a> and <button> already turn Enter into a click.
    if (elt === null || elt.tagName !== 'DIV' || elt.getAttribute('data-node') === null) return;
    k.preventDefault();
    elt.click();
  };
  root.addEventListener('pointerover', onOver);
  root.addEventListener('pointerout', onOut);
  root.addEventListener('focusin', onFocusIn);
  root.addEventListener('focusout', onFocusOut);
  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKey);

  // ---- resize ------------------------------------------------------------------

  let ro: ResizeObserver | null = null;
  let resizeQueued = false;
  if (win !== null && typeof win.ResizeObserver === 'function') {
    ro = new win.ResizeObserver(() => {
      if (resizeQueued || mode() !== 'columns' || el.clientWidth === lastWidth) return;
      resizeQueued = true;
      win.requestAnimationFrame(() => {
        resizeQueued = false;
        if (!destroyed && el.clientWidth !== lastWidth) void render();
      });
    });
    ro.observe(el);
  }

  let ready = render();

  return {
    get ready() {
      return ready;
    },
    update(nextData, nextOptions) {
      current = nextData;
      if (nextOptions !== undefined) opts = { ...opts, ...nextOptions };
      ready = render();
      return ready;
    },
    highlight(nodeId) {
      setHovered(nodeId === null ? null : { kind: 'node', id: nodeId });
    },
    layout() {
      return laid;
    },
    destroy() {
      destroyed = true;
      token++;
      if (win !== null) win.cancelAnimationFrame(raf);
      ro?.disconnect();
      root.removeEventListener('pointerover', onOver);
      root.removeEventListener('pointerout', onOut);
      root.removeEventListener('focusin', onFocusIn);
      root.removeEventListener('focusout', onFocusOut);
      root.removeEventListener('click', onClick);
      root.removeEventListener('keydown', onKey);
      root.remove();
    },
  };
}

