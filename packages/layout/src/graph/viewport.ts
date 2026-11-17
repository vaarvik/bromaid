/**
 * Pan and zoom maths for a full-screen graph canvas (`mount(…, { panZoom: true })`).
 * Pure: no DOM. A viewport maps a graph point `p` to the screen as
 * `p * k + (x, y)`, so `x`/`y` are the screen position of the graph's origin
 * and `k` is the zoom.
 *
 * The interaction follows the usual canvas convention (Figma, Miro): a plain
 * wheel or two-finger scroll pans, pinch (ctrl/⌘ + wheel) zooms at the
 * pointer, `+` / `-` zoom at the centre and `0` fits.
 */

export interface Viewport {
  readonly x: number;
  readonly y: number;
  readonly k: number;
}

export interface ZoomLimits {
  /** Smallest zoom. Default 0.1. */
  readonly min?: number;
  /** Largest zoom. Default 4. */
  readonly max?: number;
}

export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 4;
/** One `+` / `-` step (key or button). */
export const ZOOM_STEP = 1.25;
/** A double-click zooms in this much at the pointer. */
export const ZOOM_DBLCLICK = 2;
/** A fit never enlarges a small graph beyond 100%. */
export const FIT_MAX = 1;

export const IDENTITY: Viewport = { x: 0, y: 0, k: 1 };

export function clampZoom(k: number, limits: ZoomLimits = {}): number {
  const min = limits.min ?? ZOOM_MIN;
  const max = limits.max ?? ZOOM_MAX;
  if (!Number.isFinite(k)) return 1;
  return Math.min(Math.max(k, min), max);
}

export interface Size2 {
  readonly width: number;
  readonly height: number;
}

export interface FitOptions extends ZoomLimits {
  /** Space kept free around the graph, in screen px. Default 24. */
  readonly padding?: number;
  /** Largest zoom a fit picks. Default 1 (never enlarge). */
  readonly maxFit?: number;
}

/**
 * The viewport that shows the whole graph centred both ways in the view,
 * zoomed out as far as needed (and never in beyond `maxFit`).
 */
export function fitViewport(content: Size2, view: Size2, opts: FitOptions = {}): Viewport {
  const pad = opts.padding ?? 24;
  const cw = Math.max(content.width, 1);
  const ch = Math.max(content.height, 1);
  const vw = Math.max(view.width - pad * 2, 1);
  const vh = Math.max(view.height - pad * 2, 1);
  const k = clampZoom(Math.min(vw / cw, vh / ch, opts.maxFit ?? FIT_MAX), opts);
  return centreAt(content, view, k);
}

/** The viewport at zoom `k` with the graph centred both ways. */
export function centreAt(content: Size2, view: Size2, k: number): Viewport {
  return { x: (view.width - content.width * k) / 2, y: (view.height - content.height * k) / 2, k };
}

/**
 * Zoom by `factor` keeping the graph point under the screen point `(px, py)`
 * where it is (zoom at the pointer).
 */
export function zoomAt(v: Viewport, factor: number, px: number, py: number, limits: ZoomLimits = {}): Viewport {
  const k = clampZoom(v.k * factor, limits);
  const f = k / v.k;
  return { x: px - (px - v.x) * f, y: py - (py - v.y) * f, k };
}

export function panBy(v: Viewport, dx: number, dy: number): Viewport {
  return { x: v.x + dx, y: v.y + dy, k: v.k };
}

/** Screen point → graph point. */
export function toGraph(v: Viewport, sx: number, sy: number): { x: number; y: number } {
  return { x: (sx - v.x) / v.k, y: (sy - v.y) / v.k };
}

/** Graph point → screen point. */
export function toScreen(v: Viewport, gx: number, gy: number): { x: number; y: number } {
  return { x: gx * v.k + v.x, y: gy * v.k + v.y };
}

export interface WheelLike {
  readonly deltaX: number;
  readonly deltaY: number;
  /** 0 pixels, 1 lines, 2 pages (`WheelEvent.deltaMode`). */
  readonly deltaMode?: number;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  readonly shiftKey?: boolean;
}

export type WheelAction =
  | { readonly kind: 'pan'; readonly dx: number; readonly dy: number }
  | { readonly kind: 'zoom'; readonly factor: number };

const LINE_PX = 16;
/** How fast a pinch / ctrl+wheel zooms: factor = 2^(-deltaY * this). */
export const WHEEL_ZOOM_SPEED = 0.01;

/**
 * What a wheel event does: ctrl/⌘ + wheel (a trackpad pinch arrives as
 * ctrl + wheel) zooms; anything else pans the canvas the way the content
 * would scroll (shift + a plain mouse wheel pans sideways).
 */
export function wheelAction(e: WheelLike, pageHeight = 800): WheelAction {
  const unit = e.deltaMode === 1 ? LINE_PX : e.deltaMode === 2 ? pageHeight : 1;
  let dx = e.deltaX * unit;
  let dy = e.deltaY * unit;
  if (e.ctrlKey === true || e.metaKey === true) {
    // Mouse wheels in line mode send big steps; clamp so one notch is one ZOOM_STEP-ish.
    const d = Math.max(Math.min(dy, 50), -50);
    return { kind: 'zoom', factor: 2 ** (-d * WHEEL_ZOOM_SPEED) };
  }
  if (e.shiftKey === true && dx === 0) {
    dx = dy;
    dy = 0;
  }
  return { kind: 'pan', dx: -dx, dy: -dy };
}

export type KeyAction = 'in' | 'out' | 'fit';

/** `+` / `=` zoom in, `-` / `_` / `−` zoom out, `0` fits. Other keys (or with ctrl/⌘/alt) do nothing. */
export function keyAction(e: { readonly key: string; readonly ctrlKey?: boolean; readonly metaKey?: boolean; readonly altKey?: boolean }): KeyAction | null {
  if (e.ctrlKey === true || e.metaKey === true || e.altKey === true) return null;
  switch (e.key) {
    case '+':
    case '=':
      return 'in';
    case '-':
    case '_':
    case '−':
      return 'out';
    case '0':
      return 'fit';
    default:
      return null;
  }
}

interface Pt {
  readonly x: number;
  readonly y: number;
}

/**
 * One step of a two-finger touch gesture: zoom by the change in finger
 * distance at their midpoint, and pan by how far the midpoint moved.
 */
export function pinchStep(v: Viewport, from: readonly [Pt, Pt], to: readonly [Pt, Pt], limits: ZoomLimits = {}): Viewport {
  const dist = (p: readonly [Pt, Pt]): number => Math.hypot(p[1].x - p[0].x, p[1].y - p[0].y);
  const mid = (p: readonly [Pt, Pt]): Pt => ({ x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 });
  const d0 = dist(from);
  const factor = d0 > 0 ? dist(to) / d0 : 1;
  const m0 = mid(from);
  const m1 = mid(to);
  const zoomed = zoomAt(v, factor, m0.x, m0.y, limits);
  return panBy(zoomed, m1.x - m0.x, m1.y - m0.y);
}

/**
 * The smallest pan that brings a graph box fully into view (with `margin`
 * screen px around it), e.g. when a node takes keyboard focus. When it can't
 * fit, its top-left corner wins.
 */
export function revealBox(
  v: Viewport,
  box: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
  view: Size2,
  margin = 16,
): Viewport {
  const left = box.x * v.k + v.x;
  const top = box.y * v.k + v.y;
  const right = left + box.width * v.k;
  const bottom = top + box.height * v.k;
  const axis = (lo: number, hi: number, size: number): number => {
    if (lo < margin) return margin - lo;
    if (hi > size - margin) return Math.max(size - margin - hi, margin - lo);
    return 0;
  };
  const dx = axis(left, right, view.width);
  const dy = axis(top, bottom, view.height);
  return dx === 0 && dy === 0 ? v : panBy(v, dx, dy);
}

/** CSS transform for the stage. */
export function viewportTransform(v: Viewport): string {
  return `translate(${v.x}px,${v.y}px) scale(${v.k})`;
}
