import type { GraphLayout, PlacedGraphEdge } from '@bromaid/layout/graph';
import { escapeXml } from '../escape.js';
import { graphCss } from './css.js';
import { builtinTemplateFor, cssIdent, nodeClass } from './templates.js';

export const EDGE_PORT_R = 2.5;

const n = (v: number): string => String(Math.round(v * 100) / 100);

export function edgeClass(e: PlacedGraphEdge): string {
  return `bm-edge bm-edge--${cssIdent(e.edge.state ?? 'ok')}`;
}

/** Baseline of an edge label's text inside its box. */
export function edgeLabelBaseline(label: { y: number; height: number }): number {
  return label.y + label.height - 3;
}

/** One edge as an SVG `<g>`: hit area, line, port dots at both ends and optional label. */
export function renderGraphEdge(e: PlacedGraphEdge): string {
  const d = escapeXml(e.d);
  const label =
    e.label !== null
      ? `<text class="bm-edge-label" x="${n(e.label.x)}" y="${n(edgeLabelBaseline(e.label))}">${escapeXml(e.label.text)}</text>`
      : '';
  return (
    `<g class="${edgeClass(e)}" data-edge="${escapeXml(e.id)}">` +
    `<path class="bm-edge-hit" d="${d}"/><path class="bm-edge-line" d="${d}"/>` +
    `<circle class="bm-port" cx="${n(e.ends.sx)}" cy="${n(e.ends.sy)}" r="${EDGE_PORT_R}"/>` +
    `<circle class="bm-port bm-port--end" cx="${n(e.ends.tx)}" cy="${n(e.ends.ty)}" r="${EDGE_PORT_R}"/>${label}</g>`
  );
}

/**
 * The edges of a laid-out graph as one SVG string, positioned in the same
 * coordinates as the nodes. Pure: works on the server.
 */
export function renderGraphEdgesSVG(layout: GraphLayout): string {
  const w = n(Math.max(layout.width, 1));
  const h = n(Math.max(layout.height, 1));
  return (
    `<svg class="bm-edges" xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    layout.edges.map(renderGraphEdge).join('') +
    '</svg>'
  );
}

export interface GraphHTMLOptions {
  /** Include the `<style>` block. Default true. */
  readonly css?: boolean;
  /** Dotted grid background. */
  readonly grid?: boolean;
  /** Accessible name of the graph. */
  readonly label?: string;
}

/**
 * A static HTML snapshot of a laid-out graph (nodes as HTML with the
 * built-in templates, edges as SVG). No script, no interaction: for server
 * rendering, email, or a placeholder until `mount()` takes over.
 */
export function renderGraphHTML(layout: GraphLayout, opts: GraphHTMLOptions = {}): string {
  const groups = layout.groups
    .map(
      (g) =>
        `<div class="bm-group" data-group="${escapeXml(g.group.id)}" style="transform:translate(${n(g.x)}px,${n(g.y)}px);width:${n(g.width)}px;height:${n(g.height)}px"><span class="bm-group-label">${escapeXml(g.group.label)}</span></div>`,
    )
    .join('');
  const nodes = layout.nodes
    .map((p) => {
      const node = p.node;
      const tag = node.href !== undefined ? 'a' : 'div';
      const href = node.href !== undefined ? ` href="${escapeXml(node.href)}"` : '';
      const title = node.tip !== undefined ? ` title="${escapeXml(node.tip)}"` : '';
      return `<${tag} class="${nodeClass(node, false)}" data-node="${escapeXml(node.id)}"${href}${title} style="transform:translate(${n(p.x)}px,${n(p.y)}px);width:${n(p.width)}px">${builtinTemplateFor(node.kind ?? 'app')(node)}</${tag}>`;
    })
    .join('');
  const style = opts.css === false ? '' : `<style>${graphCss}</style>`;
  const cls = `bm-graph${opts.grid === true ? ' bm-graph--grid' : ''}${layout.nodes.some((p) => p.column === null) ? ' bm-graph--layered' : ''}`;
  const aria = opts.label !== undefined ? ` aria-label="${escapeXml(opts.label)}"` : '';
  return (
    `${style}<div class="${cls}" role="group"${aria}><div class="bm-stage" style="width:${n(layout.width)}px;height:${n(layout.height)}px">` +
    `${groups}${renderGraphEdgesSVG(layout)}${nodes}</div></div>`
  );
}
