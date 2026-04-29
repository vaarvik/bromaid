import { measureText, wrapTextToLines } from '@bromaid/core';
import {
  NODE_LABEL_LINE_H,
  NODE_LABEL_SUBLABEL_GAP,
  NODE_SUBLABEL_LINE_H,
  NODE_TEXT_LEFT_PAD,
  NODE_TEXT_RIGHT_PAD,
} from '@bromaid/layout';
import type {
  LayoutGraph,
  PlacedContainer,
  PlacedEdge,
  PlacedNode,
  Point,
} from '@bromaid/layout';
import type { BromaidElement } from '@bromaid/core';
import {
  defaultTheme,
  resolveNodeAccent,
  resolveSlugTheme,
  type Theme,
} from '@bromaid/theme';
import { escapeXml } from './escape.js';
import type { RenderMode, RenderOptions } from './types.js';

// Font sizes are renderer-only concerns; the line heights and char widths
// they imply live in `@bromaid/layout/src/node-metrics.ts` so layout can
// reserve box dimensions that exactly match what we draw here.
const NODE_LABEL_FONT_SIZE = 11.5;
const NODE_SUBLABEL_FONT_SIZE = 10;

const DEFAULT_FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif";
const DEFAULT_ACCENT = '#888888';
const DEFAULT_EDGE_STROKE_WIDTH = 1;
const DEFAULT_EDGE_CORNER_RADIUS = 5;

interface SlugIconPath {
  readonly d: string;
  readonly fillRule?: 'nonzero' | 'evenodd';
}

interface SlugIcon {
  readonly viewBox: string;
  readonly paths: ReadonlyArray<SlugIconPath>;
}

const DEFAULT_NODE_ICON: SlugIcon = {
  viewBox: '0 0 24 24',
  // Simple “app tile” glyph; intentionally generic.
  paths: [
    { d: 'M7 7h4v4H7V7z' },
    { d: 'M13 7h4v4h-4V7z' },
    { d: 'M7 13h4v4H7v-4z' },
    { d: 'M13 13h4v4h-4v-4z' },
  ],
};

const DB_ICON: SlugIcon = {
  viewBox: '0 0 24 24',
  // Simple database cylinder.
  paths: [
    { d: 'M12 3c-4.42 0-8 1.34-8 3v12c0 1.66 3.58 3 8 3s8-1.34 8-3V6c0-1.66-3.58-3-8-3zm0 2c3.87 0 6 .99 6 1s-2.13 1-6 1-6-.99-6-1 2.13-1 6-1z' },
    { d: 'M6 9.25V12c0 .71 2.13 1.75 6 1.75s6-1.04 6-1.75V9.25C16.6 10.02 14.5 10.5 12 10.5s-4.6-.48-6-1.25z' },
    { d: 'M6 14.25V17c0 .71 2.13 1.75 6 1.75s6-1.04 6-1.75v-2.75C16.6 15.02 14.5 15.5 12 15.5s-4.6-.48-6-1.25z' },
  ],
};

const BLOB_ICON: SlugIcon = {
  viewBox: '0 0 24 24',
  // Generic “bucket/storage” glyph.
  paths: [
    { d: 'M21 7l-1.5 14h-15L3 7h18zm-2.2 2H5.2l1.08 10h11.44L18.8 9z' },
    { d: 'M9 3h6l1 2H8l1-2z' },
  ],
};

// Generic settings/cog glyph used as the default icon for container titles
// when no slug-specific icon is available. The inner circle is cut out via
// even-odd fill so the gear has a transparent center.
const CONTAINER_GROUP_ICON: SlugIcon = {
  viewBox: '0 0 24 24',
  paths: [
    {
      fillRule: 'evenodd',
      d: 'M19.43 12.98c.04-.32.07-.64.07-.98 0-.34-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98 0 .33.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z',
    },
  ],
};

const CONTAINER_REGION_ICON: SlugIcon = {
  viewBox: '0 0 24 24',
  // Simple “globe” glyph (legible at 12px).
  paths: [
    { d: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 2c1.55 0 3.05.62 4.12 1.72-.74.5-1.92.9-3.47 1.04A15.6 15.6 0 0 0 12 5Zm-1.06.22c-.22.64-.4 1.43-.52 2.33-1.27-.14-2.33-.47-3.05-.92A7 7 0 0 1 10.94 5.22ZM6.1 8.26c.9.6 2.25 1.05 3.9 1.2-.03.5-.04 1.03-.04 1.54 0 .5.01 1.03.04 1.54-1.65.15-3 .6-3.9 1.2A7 7 0 0 1 5 12c0-1.32.38-2.55 1.1-3.74Zm1.27 7.11c.72-.45 1.78-.78 3.05-.92.12.9.3 1.69.52 2.33a7 7 0 0 1-3.57-1.41Zm4.63 3.41a15.6 15.6 0 0 0 .65-2.76c1.55.14 2.73.54 3.47 1.04A7 7 0 0 1 12 19Zm1.02-4.75c.06-.59.1-1.23.1-1.98 0-.75-.04-1.39-.1-1.98 1.66-.16 2.96-.58 3.78-1.13A7 7 0 0 1 19 12a7 7 0 0 1-2.2 5.06c-.82-.55-2.12-.97-3.78-1.13Z' },
  ],
};

const CONTAINER_VPC_ICON: SlugIcon = {
  viewBox: '0 0 24 24',
  // Small “network” glyph.
  paths: [
    { d: 'M7 7a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM12 13a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z' },
    { d: 'M8.7 10.3 10.9 13m4.4 0 2.2-2.7M9 9h6' },
  ],
};

const CONTAINER_PUBLIC_ICON: SlugIcon = {
  viewBox: '0 0 24 24',
  // “Sun” glyph for public subnet.
  paths: [
    { d: 'M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Zm0 2a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z' },
    { d: 'M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.1 5.1l1.6 1.6M17.3 17.3l1.6 1.6M18.9 5.1l-1.6 1.6M6.7 17.3l-1.6 1.6' },
  ],
};

const CONTAINER_PRIVATE_ICON: SlugIcon = {
  viewBox: '0 0 24 24',
  // “Lock” glyph for private subnet.
  paths: [
    { d: 'M7 11h10v9H7v-9Zm2-1V8.5A3.5 3.5 0 0 1 12.5 5 3.5 3.5 0 0 1 16 8.5V10h-2V8.5A1.5 1.5 0 0 0 12.5 7 1.5 1.5 0 0 0 11 8.5V10H9Z' },
  ],
};

function normalizeSlugParts(slug: string): ReadonlyArray<string> {
  const s = slug.trim().toLowerCase();
  if (s === '') return [];
  return s
    .split(':')
    .flatMap((p) => p.split(/[-_/.\s]+/))
    .map((p) => p.trim())
    .filter((p) => p !== '');
}

function normalizeTypeParts(type: string): ReadonlyArray<string> {
  return normalizeSlugParts(type);
}

function isBlobLikeSlug(slug: string | null): boolean {
  if (slug === null) return false;
  const parts = normalizeSlugParts(slug);
  if (parts.length === 0) return false;
  return parts.some((p) =>
    p === 's3' ||
    p === 'blob' ||
    p === 'storage' ||
    p === 'bucket' ||
    p === 'buckets' ||
    p === 'gcs' ||
    p === 'r2'
      ? true
      : p.includes('blob') || p.includes('bucket'),
  );
}

function isDbLikeSlug(slug: string | null): boolean {
  if (slug === null) return false;
  const parts = normalizeSlugParts(slug);
  if (parts.length === 0) return false;
  return parts.some((p) =>
    p === 'db' ||
    p.includes('postgres') ||
    p.includes('mysql') ||
    p.includes('mariadb') ||
    p.includes('mongodb') ||
    p.includes('redis') ||
    p.includes('cassandra') ||
    p.includes('dynamo') ||
    p === 'dynamodb' ||
    p.includes('mssql') ||
    p.includes('sqlserver') ||
    p.includes('cockroach') ||
    p.includes('sqlite'),
  );
}

function renderSlugIcon(
  icon: SlugIcon | undefined,
  x: number,
  y: number,
  size: number,
  fill: string,
): string {
  if (icon === undefined) return '';
  const m = icon.viewBox.trim().split(/\s+/).map((s) => Number(s));
  const vbWRaw = m.length === 4 ? (m[2] ?? 24) : 24;
  const vbHRaw = m.length === 4 ? (m[3] ?? 24) : 24;
  const vbW = Number.isFinite(vbWRaw) && vbWRaw > 0 ? vbWRaw : 24;
  const vbH = Number.isFinite(vbHRaw) && vbHRaw > 0 ? vbHRaw : 24;
  const scale = Math.min(size / vbW, size / vbH);
  const tx = x + (size - vbW * scale) / 2;
  const ty = y + (size - vbH * scale) / 2;
  const paths = icon.paths
    .map((p) => {
      const fr = p.fillRule !== undefined ? ` fill-rule="${p.fillRule}"` : '';
      return `<path d="${escapeXml(p.d)}"${fr}/>`;
    })
    .join('');
  return `<g transform="translate(${tx} ${ty}) scale(${scale})" fill="${escapeXml(fill)}">${paths}</g>`;
}

interface ResolvedRenderConfig {
  readonly theme: Theme;
  readonly mode: RenderMode;
  readonly fontFamily: string;
  readonly background: string | null;
}

/**
 * Build the inner `<tspan>` markup for a multi-line `<text>` element. The
 * containing `<text>` provides the initial `x`/`y`; subsequent lines repeat
 * `x` and advance vertically with `dy`.
 */
function renderTspans(
  lines: ReadonlyArray<string>,
  x: number,
  lineHeight: number,
): string {
  if (lines.length === 0) return '';
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (i === 0) {
      out.push(`<tspan x="${x}">${escapeXml(line)}</tspan>`);
    } else {
      out.push(`<tspan x="${x}" dy="${lineHeight}">${escapeXml(line)}</tspan>`);
    }
  }
  return out.join('');
}

function resolveConfig(opts: RenderOptions): ResolvedRenderConfig {
  const theme = opts.theme ?? defaultTheme;
  const mode = opts.mode ?? 'dark';
  const surface = theme.surface[mode];
  let background: string | null = null;
  if (opts.background === 'surface') background = surface.bg;
  else if (typeof opts.background === 'string') background = opts.background;
  else if (opts.background === null) background = null;
  return {
    theme,
    mode,
    fontFamily: opts.fontFamily ?? DEFAULT_FONT,
    background,
  };
}

/**
 * Render a `LayoutGraph` to an SVG string.
 *
 * The output is fully self-contained: every fill and stroke is a literal
 * color (not a CSS variable) so the SVG looks identical when rendered in
 * Node, in a `<img src="data:image/svg+xml...">`, exported to PNG, or
 * dropped into any web page.
 */
export function renderSVG(graph: LayoutGraph, opts: RenderOptions = {}): string {
  const config = resolveConfig(opts);
  const surface = config.theme.surface[config.mode];

  const W = Math.ceil(graph.width || 1200);
  const H = Math.ceil(graph.height || 800);

  const parts: string[] = [];
  parts.push(
    `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="${escapeXml(config.fontFamily)}">`,
  );

  const edgeStroke = surface.fgDim;
  parts.push(
    '<defs>',
    `<marker id="bromaid-arr" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6" markerHeight="6" orient="auto" markerUnits="strokeWidth">`,
    `<path d="M0 1 L9.5 5 L0 9 z" fill="${escapeXml(edgeStroke)}"/>`,
    '</marker>',
    '</defs>',
  );

  if (config.background !== null) {
    parts.push(
      `<rect x="0" y="0" width="${W}" height="${H}" fill="${escapeXml(config.background)}"/>`,
    );
  }

  for (const c of graph.containers) {
    parts.push(renderContainer(c, config.theme));
  }
  for (const placed of graph.edges) {
    parts.push(renderEdge(placed, surface));
  }
  for (const n of graph.nodes) {
    parts.push(renderNode(n, config.theme, surface));
  }

  parts.push('</svg>');
  return parts.join('');
}

function renderContainer(c: PlacedContainer, theme: Theme): string {
  const containerTheme =
    theme.containers.get(c.element.type) ?? theme.containers.get('group');
  if (containerTheme === undefined) return '';

  const slugTheme = resolveSlugTheme(theme, c.element.slug);
  const stroke = slugTheme !== null ? slugTheme.color : containerTheme.stroke;
  const dash = containerTheme.dashed ? '4 3' : '';

  // Compact "pill" title label with icon, like the reference screenshot.
  // The pill always carries an icon: a slug-specific glyph when available,
  // a database glyph for db-like slugs, otherwise a generic cog.
  const pillPadX = 6;
  const pillVPad = 3;
  const pillRx = 3.5;
  const pillX = c.x + 7;
  const pillY = c.y + 6;
  const iconSize = 17;
  const iconGap = 5;
  const titleFontSize = 9.5;
  const titleLineH = 12;
  const rawLabel = c.element.label.toUpperCase();
  // Letter-spacing looks great on pure alphanumerics, but it visually
  // over-emphasizes punctuation (e.g. `EDGE / PUBLIC`, `A * B`). Reduce it
  // when symbols are present so spacing feels consistent.
  const titleLetterSpacing = /[^A-Z0-9 ]/.test(rawLabel) ? 0.35 : 0.6;
  const measureTitle = (s: string): number =>
    measureText(s, titleFontSize, { letterSpacing: titleLetterSpacing });

  const defaultIconForContainerType: SlugIcon =
    c.element.type === 'region'
      ? CONTAINER_REGION_ICON
      : c.element.type === 'vpc'
        ? CONTAINER_VPC_ICON
        : c.element.type === 'subnet.public'
          ? CONTAINER_PUBLIC_ICON
          : c.element.type === 'subnet.private'
            ? CONTAINER_PRIVATE_ICON
            : CONTAINER_GROUP_ICON;

  const effectiveIcon: SlugIcon =
    slugTheme?.icon ??
    (isDbLikeSlug(c.element.slug)
      ? DB_ICON
      : isBlobLikeSlug(c.element.slug)
        ? BLOB_ICON
        : defaultIconForContainerType);

  // Wrap the title to fit the pill, which is bounded by the container's width.
  const maxPillW = Math.max(0, c.width - 14);
  const maxTextW = Math.max(0, maxPillW - (pillPadX * 2 + iconSize + iconGap));
  const wrapped = wrapTextToLines(rawLabel, maxTextW, measureTitle);
  const titleLines = wrapped.lines.length > 0 ? wrapped.lines : [rawLabel];

  const textBlockH = titleLines.length * titleLineH;
  const pillContentH = Math.max(iconSize, textBlockH);
  const pillH = pillContentH + pillVPad * 2;
  // Size the pill from the widest *actually rendered* line so right padding
  // stays visually consistent across labels with different glyph mixes.
  const pillW = Math.min(
    maxPillW,
    pillPadX * 2 + iconSize + iconGap + wrapped.width,
  );

  const iconX = pillX + pillPadX;
  const iconY = pillY + (pillH - iconSize) / 2;
  const textX = pillX + pillPadX + iconSize + iconGap;
  // Baseline of the first line so the wrapped block is vertically centered.
  const textBlockTop = pillY + (pillH - textBlockH) / 2;
  const firstBaselineY = textBlockTop + titleFontSize - 1;

  const iconColor = slugTheme?.color ?? stroke;

  return [
    `<rect x="${c.x}" y="${c.y}" width="${c.width}" height="${c.height}" rx="5" fill="${escapeXml(containerTheme.fill)}" stroke="${escapeXml(stroke)}" stroke-width="1"${dash !== '' ? ` stroke-dasharray="${dash}"` : ''}/>`,
    `<rect x="${pillX}" y="${pillY}" width="${pillW}" height="${pillH}" rx="${pillRx}" fill="rgba(0,0,0,0.55)" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>`,
    `<rect x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" rx="3" fill="${escapeXml(iconColor)}" opacity="0.16"/>`,
    renderSlugIcon(effectiveIcon, iconX, iconY, iconSize, escapeXml(iconColor)),
    `<text x="${textX}" y="${firstBaselineY}" font-size="${titleFontSize}" font-weight="650" fill="#ffffff" letter-spacing="${titleLetterSpacing}">${renderTspans(titleLines, textX, titleLineH)}</text>`,
  ].join('');
}

function renderEdge(
  placed: PlacedEdge,
  surface: Theme['surface']['light'],
): string {
  const out: string[] = [];
  if (placed.path.length >= 2) {
    out.push(
      `<path d="${pathFromPointsRounded(placed.path, DEFAULT_EDGE_CORNER_RADIUS)}" fill="none" stroke="${escapeXml(surface.fgDim)}" stroke-width="${DEFAULT_EDGE_STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#bromaid-arr)"/>`,
    );
  }
  const lbl = placed.label;
  if (lbl !== null) {
    out.push(
      `<rect x="${lbl.x - 3}" y="${lbl.y - 1}" width="${lbl.width + 6}" height="${lbl.height + 2}" rx="1.5" fill="${escapeXml(surface.bg2)}" stroke="${escapeXml(surface.border)}" stroke-width="0.5"/>`,
      `<text x="${lbl.x}" y="${lbl.y + 10}" font-size="10" fill="${escapeXml(surface.fgDim)}">${escapeXml(lbl.text)}</text>`,
    );
  }
  return out.join('');
}

function renderNode(
  n: PlacedNode,
  theme: Theme,
  surface: Theme['surface']['light'],
): string {
  if (n.element.type === 'addon') {
    return renderAddonChip(n, theme, surface);
  }
  const slugTheme = resolveSlugTheme(theme, n.element.slug);
  const accent = resolveNodeAccent(theme, n.element) ?? DEFAULT_ACCENT;
  const { x, y, width: w, height: h } = n;
  const out: string[] = [];

  const inferredNodeIcon: SlugIcon | null = inferIconFromElement(n.element);

  out.push(
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${escapeXml(surface.bg2)}" stroke="${escapeXml(surface.border)}" stroke-width="1"/>`,
  );

  const typeBadge = renderTypeBadge(n.element.type, x, y, w, surface);
  if (typeBadge !== '') out.push(typeBadge);

  const badgeY = y + (h - 22) / 2;
  out.push(
    `<rect x="${x + 8}" y="${badgeY}" width="22" height="22" rx="3" fill="${escapeXml(accent)}" opacity="0.14"/>`,
  );

  // If a slug theme exists and provides no icon, show its short label text.
  // This keeps themes expressive (e.g. a custom `label: "CUSTOM"`) and avoids
  // an inferred glyph unexpectedly overriding the theme's intent.
  if (slugTheme !== null && slugTheme.icon === undefined) {
    out.push(
      `<text x="${x + 19}" y="${y + h / 2 + 4}" font-size="9.5" font-weight="650" fill="${escapeXml(accent)}" text-anchor="middle">${escapeXml(slugTheme.label)}</text>`,
    );
  } else {
    out.push(
      renderSlugIcon(
        slugTheme?.icon ?? inferredNodeIcon ?? DEFAULT_NODE_ICON,
        x + 8,
        badgeY,
        22,
        accent,
      ),
    );
  }

  const textX = x + NODE_TEXT_LEFT_PAD;
  const textW = Math.max(0, w - NODE_TEXT_LEFT_PAD - NODE_TEXT_RIGHT_PAD);

  // Wrap label and sublabel using the same per-glyph measurement the layout
  // pass used to size the node, so wrapped lines always fit inside the box.
  const measureLabel = (s: string): number => measureText(s, NODE_LABEL_FONT_SIZE);
  const measureSublabel = (s: string): number =>
    measureText(s, NODE_SUBLABEL_FONT_SIZE);
  const labelLines = wrapTextToLines(n.element.label, textW, measureLabel).lines;
  const drawnLabelLines = labelLines.length > 0 ? labelLines : [n.element.label];

  const sublabelLines =
    n.element.sublabel !== null
      ? wrapTextToLines(n.element.sublabel, textW, measureSublabel).lines
      : [];

  const labelBlockH = drawnLabelLines.length * NODE_LABEL_LINE_H;
  const sublabelBlockH = sublabelLines.length * NODE_SUBLABEL_LINE_H;
  const gap = sublabelLines.length > 0 ? NODE_LABEL_SUBLABEL_GAP : 0;
  const totalTextH = labelBlockH + gap + sublabelBlockH;

  // Vertically center the whole text block inside the node.
  const blockTop = y + (h - totalTextH) / 2;
  const labelBaselineY = blockTop + NODE_LABEL_FONT_SIZE - 1;
  out.push(
    `<text x="${textX}" y="${labelBaselineY}" font-size="${NODE_LABEL_FONT_SIZE}" font-weight="500" fill="${escapeXml(surface.fg)}">${renderTspans(drawnLabelLines, textX, NODE_LABEL_LINE_H)}</text>`,
  );

  if (sublabelLines.length > 0) {
    const sublabelBaselineY =
      blockTop + labelBlockH + gap + NODE_SUBLABEL_FONT_SIZE - 1;
    out.push(
      `<text x="${textX}" y="${sublabelBaselineY}" font-size="${NODE_SUBLABEL_FONT_SIZE}" fill="${escapeXml(surface.fgDim)}">${renderTspans(sublabelLines, textX, NODE_SUBLABEL_LINE_H)}</text>`,
    );
  }

  return out.join('');
}

function renderAddonChip(
  n: PlacedNode,
  theme: Theme,
  surface: Theme['surface']['light'],
): string {
  const slugTheme = resolveSlugTheme(theme, n.element.slug);
  const accent = slugTheme?.color ?? resolveNodeAccent(theme, n.element) ?? DEFAULT_ACCENT;
  const { x, y, width: w, height: h } = n;
  const out: string[] = [];

  const rx = Math.min(999, h / 2);
  out.push(
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${escapeXml(surface.bg2)}" stroke="${escapeXml(surface.border)}" stroke-width="1"/>`,
  );

  const hasSlug = slugTheme !== null;
  const iconSize = hasSlug ? 14 : 0;
  const iconPadL = 8;
  const iconGap = hasSlug ? 6 : 0;

  if (hasSlug) {
    const inferredIcon: SlugIcon | null = inferIconFromElement(n.element);
    out.push(
      `<rect x="${x + iconPadL}" y="${y + (h - iconSize) / 2}" width="${iconSize}" height="${iconSize}" rx="3" fill="${escapeXml(accent)}" opacity="0.16"/>`,
    );
    out.push(
      renderSlugIcon(
        slugTheme.icon ?? inferredIcon ?? DEFAULT_NODE_ICON,
        x + iconPadL,
        y + (h - iconSize) / 2,
        iconSize,
        accent,
      ),
    );
  }

  const textX = x + iconPadL + iconSize + iconGap;
  const textY = y + h / 2 + 3.6;
  out.push(
    `<text x="${textX}" y="${textY}" font-size="10.5" font-weight="600" fill="${escapeXml(surface.fg)}">${escapeXml(n.element.label)}</text>`,
  );

  return out.join('');
}

function inferIconFromElement(el: BromaidElement): SlugIcon | null {
  if (el.kind !== 'node') return null;

  if (isDbLikeSlug(el.slug) || isDbLikeType(el.type)) return DB_ICON;
  if (isBlobLikeSlug(el.slug) || isBlobLikeType(el.type)) return BLOB_ICON;
  return null;
}

function renderTypeBadge(
  type: string,
  x: number,
  y: number,
  w: number,
  surface: Theme['surface']['light'],
): string {
  const text = formatTypeBadgeText(type);
  if (text === '') return '';
  const badgeX = x + w - 6;
  const badgeY = y + 10;
  return `<text x="${badgeX}" y="${badgeY}" font-size="8.2" font-weight="600" fill="${escapeXml(surface.fgFaint)}" text-anchor="end">${escapeXml(text)}</text>`;
}

function formatTypeBadgeText(type: string): string {
  const raw = type.trim();
  if (raw.length === 0) return '';
  const lower = raw.toLowerCase();
  if (lower === 'node') return '';
  // Prefer the most specific segment (e.g. "aws:s3" -> "s3", "subnet.private" -> "private").
  const colon = lower.lastIndexOf(':');
  if (colon >= 0 && colon < lower.length - 1) return lower.slice(colon + 1);
  const dot = lower.lastIndexOf('.');
  if (dot >= 0 && dot < lower.length - 1) return lower.slice(dot + 1);
  return lower;
}

function isDbLikeType(type: string): boolean {
  const parts = normalizeTypeParts(type);
  if (parts.length === 0) return false;
  return parts.some((p) =>
    p === 'db' ||
    p.includes('postgres') ||
    p.includes('mysql') ||
    p.includes('mariadb') ||
    p.includes('mongodb') ||
    p.includes('redis') ||
    p.includes('cassandra') ||
    p.includes('dynamo') ||
    p === 'dynamodb' ||
    p.includes('mssql') ||
    p.includes('sqlserver') ||
    p.includes('cockroach') ||
    p.includes('sqlite'),
  );
}

function isBlobLikeType(type: string): boolean {
  const parts = normalizeTypeParts(type);
  if (parts.length === 0) return false;
  return parts.some((p) =>
    p === 's3' ||
    p === 'blob' ||
    p === 'storage' ||
    p === 'bucket' ||
    p === 'buckets' ||
    p === 'gcs' ||
    p === 'r2'
      ? true
      : p.includes('blob') || p.includes('bucket'),
  );
}

function pathFromPoints(points: ReadonlyArray<Point>): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  if (first === undefined) return '';
  const head = `M ${first.x} ${first.y}`;
  const tail = rest.map((p) => `L ${p.x} ${p.y}`).join(' ');
  return tail.length > 0 ? `${head} ${tail}` : head;
}

function clampCornerRadius(r: number, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (!Number.isFinite(len) || len <= 0) return 0;
  return Math.max(0, Math.min(r, len / 2));
}

function pathFromPointsRounded(points: ReadonlyArray<Point>, radius: number): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const p = points[0];
    return p ? `M ${p.x} ${p.y}` : '';
  }

  const first = points[0];
  if (first === undefined) return '';

  const cmds: string[] = [`M ${first.x} ${first.y}`];

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];
    if (prev === undefined || curr === undefined) continue;

    if (next === undefined) {
      cmds.push(`L ${curr.x} ${curr.y}`);
      continue;
    }

    const v1x = curr.x - prev.x;
    const v1y = curr.y - prev.y;
    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;

    const len1 = Math.hypot(v1x, v1y);
    const len2 = Math.hypot(v2x, v2y);
    if (!Number.isFinite(len1) || !Number.isFinite(len2) || len1 === 0 || len2 === 0) {
      cmds.push(`L ${curr.x} ${curr.y}`);
      continue;
    }

    // If the direction doesn't change, keep it a straight segment.
    const dot = (v1x / len1) * (v2x / len2) + (v1y / len1) * (v2y / len2);
    if (Math.abs(dot - 1) < 1e-6) {
      cmds.push(`L ${curr.x} ${curr.y}`);
      continue;
    }

    const r1 = clampCornerRadius(radius, prev, curr);
    const r2 = clampCornerRadius(radius, curr, next);
    const r = Math.min(r1, r2);
    if (r <= 0) {
      cmds.push(`L ${curr.x} ${curr.y}`);
      continue;
    }

    const p1x = curr.x - (v1x / len1) * r;
    const p1y = curr.y - (v1y / len1) * r;
    const p2x = curr.x + (v2x / len2) * r;
    const p2y = curr.y + (v2y / len2) * r;

    cmds.push(`L ${p1x} ${p1y}`, `Q ${curr.x} ${curr.y} ${p2x} ${p2y}`);
  }

  return cmds.join(' ');
}
