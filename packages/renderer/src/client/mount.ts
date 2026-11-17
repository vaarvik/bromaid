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
  IDENTITY,
  ZOOM_DBLCLICK,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
  centreAt,
  fitViewport,
  keyAction,
  panBy,
  pinchStep,
  revealBox,
  viewportTransform,
  wheelAction,
  zoomAt,
  type KeyAction,
  type Viewport,
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
  /**
   * Layered layout: how nodes stacked in a group line up when the group has
   * no `align` of its own. `start` (default): left, one shared width.
   */
  readonly align?: 'start' | 'center';
  /**
   * A pan-and-zoom canvas (for a full-screen view; leave off where the page
   * should scroll). The graph fills `el` (give it a height), a plain wheel or
   * two-finger scroll pans, pinch or ctrl/⌘ + wheel zooms at the pointer,
   * dragging the empty canvas (or anything while Space is held, or with the
   * middle button) pans, `+` / `-` / `0` zoom in, out and fit, a double-click
   * on the canvas zooms in (shift: out). Nodes stay focusable and clickable;
   * a focused node is panned into view. Default false.
   */
  readonly panZoom?: boolean;
  /**
   * Pan and zoom: the view on open and on `fit()`. `both` (default): the whole
   * graph, centred both ways, never enlarged past 100%. `none`: 100%, centred.
   * `padding` is the space kept around it (default 24).
   */
  readonly fit?: 'both' | 'none';
  /** Pan and zoom: the zoom out / zoom in / fit buttons (bottom right). Default true. */
  readonly controls?: boolean;
  /** Pan and zoom: called whenever the view moves or zooms. */
  readonly onViewport?: (viewport: Viewport) => void;
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
  /** Pan and zoom: zoom in one step at the view's centre. */
  zoomIn(): void;
  /** Pan and zoom: zoom out one step at the view's centre. */
  zoomOut(): void;
  /** Pan and zoom: show the whole graph, centred both ways (the `fit` option). */
  fit(): void;
  /** The current pan and zoom (identity when `panZoom` is off). */
  viewport(): Viewport;
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
  portEnd: SVGCircleElement | null;
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
  let lastHeight = -1;
  // Pan and zoom.
  let panOn = false;
  let vp: Viewport = IDENTITY;
  /** The person moved or zoomed: a relayout or resize keeps their view instead of refitting. */
  let moved = false;

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
  let controls: HTMLElement | null = null;

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

  /**
   * A node's size in graph px, rounded up: `offsetWidth` rounds to the nearest
   * pixel, and a box a fraction too narrow cuts its text with "…".
   */
  function measure(e: HTMLElement): { width: number; height: number } {
    const r = e.getBoundingClientRect();
    const k = panOn ? vp.k : 1;
    const up = (v: number): number => (v > 0 ? Math.ceil(v / k - 0.01) : 0);
    return { width: Math.max(e.offsetWidth, up(r.width)), height: Math.max(e.offsetHeight, up(r.height)) };
  }

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
    root.className = `bm-graph bm-graph--${mode()}${opts.grid === true ? ' bm-graph--grid' : ''}${panOn ? ' bm-graph--pan' : ''}`;
    if (spaceHeld) root.classList.add('bm-graph--grab');
    if (drag !== null) root.classList.add('bm-graph--grabbing');
    // Pan and zoom: the padding is the space a fit keeps free, not a frame.
    root.style.padding = panOn ? '0' : `${pad}px`;
    if (mode() === 'columns') {
      const cols = current.columns ?? [];
      const width = Math.max(el.clientWidth - pad * 2, 0);
      lastWidth = el.clientWidth;
      lastHeight = el.clientHeight;
      const widths = columnWidths(cols.length, width, opts.gap ?? COLUMN_GAP, opts.weights);
      // Write every width first, then read every height (one reflow).
      cols.forEach((c, ci) => c.nodes.forEach((node) => {
        const w = widths[ci] ?? 0;
        syncNode(node, w);
        const v = nodeViews.get(node.id);
        if (v !== undefined) v.el.style.width = `${w}px`;
      }));
      const heights = new Map<string, number>();
      for (const [id, v] of nodeViews) heights.set(id, measure(v.el).height);
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
    for (const [id, v] of nodeViews) sizes.set(id, measure(v.el));
    // ELK is only loaded when a general layout is asked for.
    const { layoutLayered, estimateNodeSize } = await import('@bromaid/layout');
    return layoutLayered(current, {
      ...(opts.align !== undefined ? { align: opts.align } : {}),
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
          portEnd: g.querySelector('.bm-port--end'),
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
      // Both dots sit on the path's first and last point, also mid-animation.
      v.portEnd?.setAttribute('cx', String(ends.tx));
      v.portEnd?.setAttribute('cy', String(ends.ty));
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
    if (panOn) {
      if (!moved) fitView();
      else applyViewport();
    }
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
    syncPanZoom();
    const next = await computeLayout();
    if (mine !== token || destroyed) return;
    place(next);
  }

  // ---- pan and zoom ------------------------------------------------------------

  function viewSize(): { width: number; height: number } {
    return { width: root.clientWidth, height: root.clientHeight };
  }

  function applyViewport(): void {
    if (!panOn) return;
    stage.style.transform = viewportTransform(vp);
    if (opts.grid === true) {
      const size = 16 * vp.k;
      root.style.backgroundSize = `${size}px ${size}px`;
      root.style.backgroundPosition = `${vp.x}px ${vp.y}px`;
    }
    if (controls !== null) {
      const zin = controls.querySelector<HTMLButtonElement>('[data-zoom="in"]');
      const zout = controls.querySelector<HTMLButtonElement>('[data-zoom="out"]');
      if (zin !== null) zin.disabled = vp.k >= ZOOM_MAX - 1e-9;
      if (zout !== null) zout.disabled = vp.k <= ZOOM_MIN + 1e-9;
    }
    opts.onViewport?.(vp);
  }

  function setView(next: Viewport): void {
    vp = next;
    moved = true;
    applyViewport();
  }

  function fitView(): void {
    if (!panOn || laid === null) return;
    const pad = opts.padding ?? 24;
    let view = viewSize();
    if (view.height === 0) {
      // The host gave the canvas no height: show the graph at its own.
      root.style.height = `${laid.height + pad * 2}px`;
      view = { width: view.width, height: root.clientHeight || laid.height + pad * 2 };
    }
    const content = { width: laid.width, height: laid.height };
    vp = opts.fit === 'none' ? centreAt(content, view, 1) : fitViewport(content, view, { padding: pad });
    moved = false;
    applyViewport();
  }

  function act(a: KeyAction): void {
    if (a === 'fit') {
      fitView();
      return;
    }
    const view = viewSize();
    setView(zoomAt(vp, a === 'in' ? ZOOM_STEP : 1 / ZOOM_STEP, view.width / 2, view.height / 2));
  }

  const ZOOM_BUTTONS = [
    { id: 'out', name: 'Zoom out', key: '−', icon: '<path d="M5 12h14"/>' },
    { id: 'in', name: 'Zoom in', key: '+', icon: '<path d="M12 5v14M5 12h14"/>' },
    { id: 'fit', name: 'Fit to screen', key: '0', icon: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>' },
  ] as const;

  function makeControls(): HTMLElement {
    const bar = doc.createElement('div');
    bar.className = 'bm-zoom';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Zoom');
    for (const z of ZOOM_BUTTONS) {
      const b = doc.createElement('button');
      b.type = 'button';
      b.setAttribute('data-zoom', z.id);
      b.setAttribute('aria-label', z.name);
      b.setAttribute('aria-keyshortcuts', z.id === 'out' ? '-' : z.key);
      b.title = `${z.name} (${z.key})`;
      b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${z.icon}</svg>`;
      b.addEventListener('click', (ev) => {
        ev.stopPropagation();
        act(z.id);
      });
      bar.appendChild(b);
    }
    return bar;
  }

  function point(ev: { clientX: number; clientY: number }): { x: number; y: number } {
    const r = root.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }

  const isEditable = (t: EventTarget | null): boolean => {
    const e = t as HTMLElement | null;
    if (e === null || typeof e.tagName !== 'string') return false;
    return /^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName) || e.isContentEditable === true;
  };
  const inControls = (t: EventTarget | null): boolean => {
    const e = t as Element | null;
    return e !== null && typeof e.closest === 'function' && e.closest('.bm-zoom') !== null;
  };

  let pointerInside = false;
  let spaceHeld = false;
  let drag: { id: number; x: number; y: number; dist: number } | null = null;
  const touches = new Map<number, { x: number; y: number }>();
  let swallowClick = false;
  let gestureK = 1;

  const onWheel = (ev: Event): void => {
    const w = ev as WheelEvent;
    w.preventDefault();
    const a = wheelAction(w, root.clientHeight);
    if (a.kind === 'pan') setView(panBy(vp, a.dx, a.dy));
    else {
      const p = point(w);
      setView(zoomAt(vp, a.factor, p.x, p.y));
    }
  };
  let lastPointerDown = -Infinity;
  const onDownCapture = (): void => {
    swallowClick = false;
    lastPointerDown = Date.now();
  };
  const onDown = (ev: Event): void => {
    const p = ev as PointerEvent;
    if (inControls(p.target)) return;
    if (p.pointerType === 'touch') {
      touches.set(p.pointerId, point(p));
      if (touches.size >= 2) {
        drag = null;
        return;
      }
    }
    const onThing = targetOf(p.target) !== null;
    const wants = p.button === 1 || (p.button === 0 && (spaceHeld || !onThing));
    if (!wants) return;
    if (p.button === 1 || spaceHeld) p.preventDefault();
    drag = { id: p.pointerId, x: p.clientX, y: p.clientY, dist: 0 };
    try {
      root.setPointerCapture(p.pointerId);
    } catch {
      // not an active pointer (synthetic events): panning still follows the moves over the canvas
    }
    root.classList.add('bm-graph--grabbing');
  };
  const onMove = (ev: Event): void => {
    const p = ev as PointerEvent;
    if (p.pointerType === 'touch' && touches.has(p.pointerId) && touches.size >= 2) {
      const before = [...touches.values()];
      touches.set(p.pointerId, point(p));
      const after = [...touches.values()];
      const [a0, b0] = before;
      const [a1, b1] = after;
      if (a0 !== undefined && b0 !== undefined && a1 !== undefined && b1 !== undefined) {
        setView(pinchStep(vp, [a0, b0], [a1, b1]));
        swallowClick = true;
      }
      return;
    }
    if (p.pointerType === 'touch' && touches.has(p.pointerId)) touches.set(p.pointerId, point(p));
    if (drag === null || drag.id !== p.pointerId) return;
    const dx = p.clientX - drag.x;
    const dy = p.clientY - drag.y;
    drag.x = p.clientX;
    drag.y = p.clientY;
    drag.dist += Math.abs(dx) + Math.abs(dy);
    setView(panBy(vp, dx, dy));
  };
  const onUp = (ev: Event): void => {
    const p = ev as PointerEvent;
    touches.delete(p.pointerId);
    if (drag === null || drag.id !== p.pointerId) return;
    if (drag.dist > 3) swallowClick = true;
    drag = null;
    try {
      if (root.hasPointerCapture(p.pointerId)) root.releasePointerCapture(p.pointerId);
    } catch {
      // already released
    }
    root.classList.remove('bm-graph--grabbing');
  };
  // A drag that started on a node (Space held) doesn't also click it.
  const onClickCapture = (ev: Event): void => {
    if (!swallowClick) return;
    swallowClick = false;
    ev.preventDefault();
    ev.stopPropagation();
  };
  const onDblClick = (ev: Event): void => {
    const m = ev as MouseEvent;
    if (inControls(m.target) || targetOf(m.target) !== null) return;
    m.preventDefault();
    const p = point(m);
    setView(zoomAt(vp, m.shiftKey ? 1 / ZOOM_DBLCLICK : ZOOM_DBLCLICK, p.x, p.y));
  };
  const onEnter = (): void => {
    pointerInside = true;
  };
  const onLeave = (): void => {
    pointerInside = false;
  };
  const releaseSpace = (): void => {
    spaceHeld = false;
    root.classList.remove('bm-graph--grab');
  };
  const onDocKeyDown = (ev: Event): void => {
    const k = ev as KeyboardEvent;
    if (isEditable(k.target)) return;
    const active = doc.activeElement;
    const focusedIn = active !== null && root.contains(active);
    if (!focusedIn && !(pointerInside && !isEditable(active))) return;
    if (k.key === ' ') {
      // Keyboard only (pointer elsewhere): Space keeps activating the focused node.
      if (!pointerInside) return;
      k.preventDefault();
      k.stopPropagation();
      if (!spaceHeld) {
        spaceHeld = true;
        root.classList.add('bm-graph--grab');
      }
      return;
    }
    const a = keyAction(k);
    if (a === null) return;
    k.preventDefault();
    act(a);
  };
  const onDocKeyUp = (ev: Event): void => {
    if ((ev as KeyboardEvent).key === ' ' && spaceHeld) releaseSpace();
  };
  const onGestureStart = (ev: Event): void => {
    ev.preventDefault();
    gestureK = vp.k;
  };
  const onGestureChange = (ev: Event): void => {
    ev.preventDefault();
    const g = ev as unknown as { scale: number; clientX: number; clientY: number };
    const p = point(g);
    setView(zoomAt(vp, (gestureK * g.scale) / vp.k, p.x, p.y));
  };
  // Keyboard focus on a node off screen pans it into view.
  const onFocusReveal = (ev: Event): void => {
    if (Date.now() - lastPointerDown < 600) return; // a click, not the keyboard
    const t = targetOf(ev.target);
    if (t === null || t.kind !== 'node') return;
    const b = nodeBoxes.get(t.id);
    if (b === undefined) return;
    const next = revealBox(vp, { x: b.x, y: b.y, width: b.w, height: b.h }, viewSize());
    if (next !== vp) setView(next);
  };

  const panListeners: ReadonlyArray<readonly [EventTarget, string, (ev: Event) => void, AddEventListenerOptions | boolean]> = [
    [root, 'wheel', onWheel, { passive: false }],
    [root, 'pointerdown', onDownCapture, true],
    [root, 'pointerdown', onDown, false],
    [root, 'pointermove', onMove, false],
    [root, 'pointerup', onUp, false],
    [root, 'pointercancel', onUp, false],
    [root, 'click', onClickCapture, true],
    [root, 'dblclick', onDblClick, false],
    [root, 'pointerenter', onEnter, false],
    [root, 'pointerleave', onLeave, false],
    [root, 'gesturestart', onGestureStart, { passive: false }],
    [root, 'gesturechange', onGestureChange, { passive: false }],
    [root, 'focusin', onFocusReveal, false],
    [doc, 'keydown', onDocKeyDown, true],
    [doc, 'keyup', onDocKeyUp, true],
  ];

  function syncPanZoom(): void {
    const want = opts.panZoom === true;
    const wantControls = want && opts.controls !== false;
    if (wantControls && controls === null) {
      controls = makeControls();
      root.appendChild(controls);
    } else if (!wantControls && controls !== null) {
      controls.remove();
      controls = null;
    }
    if (want === panOn) return;
    panOn = want;
    vp = IDENTITY;
    moved = false;
    if (want) {
      for (const [t, type, fn, o] of panListeners) t.addEventListener(type, fn, o);
      win?.addEventListener('blur', releaseSpace);
      root.tabIndex = 0;
      root.classList.add('bm-graph--pan');
    } else {
      for (const [t, type, fn, o] of panListeners) t.removeEventListener(type, fn, o);
      win?.removeEventListener('blur', releaseSpace);
      root.removeAttribute('tabindex');
      root.classList.remove('bm-graph--pan', 'bm-graph--grabbing');
      releaseSpace();
      drag = null;
      touches.clear();
      stage.style.transform = '';
      root.style.height = '';
      root.style.backgroundSize = '';
      root.style.backgroundPosition = '';
    }
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
      if (resizeQueued) return;
      const relayout = mode() === 'columns' && el.clientWidth !== lastWidth;
      const refit = panOn && (el.clientWidth !== lastWidth || el.clientHeight !== lastHeight);
      if (!relayout && !refit) return;
      resizeQueued = true;
      win.requestAnimationFrame(() => {
        resizeQueued = false;
        if (destroyed) return;
        if (mode() === 'columns' && el.clientWidth !== lastWidth) void render();
        else if (panOn) {
          lastWidth = el.clientWidth;
          lastHeight = el.clientHeight;
          // A view the person hasn't moved stays fitted to the new size.
          if (!moved) fitView();
        }
      });
    });
    ro.observe(el);
  }

  // Web fonts that arrive after the first layout change the nodes' sizes:
  // measure again and lay out again only when a size moved.
  const fonts = (doc as Document & { fonts?: FontFaceSet }).fonts;
  const onFonts = (): void => {
    if (destroyed || laid === null) return;
    for (const p of laid.nodes) {
      const v = nodeViews.get(p.node.id);
      if (v === undefined) continue;
      const m = measure(v.el);
      const wider = mode() === 'layered' && m.width > p.width + 0.5;
      if (wider || (m.height > 0 && Math.abs(m.height - p.height) > 0.5)) {
        void render();
        return;
      }
    }
  };
  fonts?.addEventListener?.('loadingdone', onFonts);

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
    zoomIn() {
      if (panOn) act('in');
    },
    zoomOut() {
      if (panOn) act('out');
    },
    fit() {
      fitView();
    },
    viewport() {
      return vp;
    },
    destroy() {
      destroyed = true;
      token++;
      fonts?.removeEventListener?.('loadingdone', onFonts);
      if (panOn) {
        opts = { ...opts, panZoom: false };
        syncPanZoom();
      }
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

