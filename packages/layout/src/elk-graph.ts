import type {
  BromaidContainer,
  BromaidElement,
  BromaidNode,
  Program,
} from '@bromaid/core';
import { measureText, wrapTextToLines } from '@bromaid/core';
import type { ElkNode } from 'elkjs/lib/elk-api.js';
import {
  NODE_LABEL_LINE_H,
  NODE_SUBLABEL_LINE_H,
  NODE_TEXT_LEFT_PAD,
  NODE_TEXT_RIGHT_PAD,
  NODE_TEXT_VERTICAL_PAD,
  NODE_LABEL_SUBLABEL_GAP,
  NODE_WIDTH_MAX,
  NODE_WIDTH_MIN,
  SLUG_BADGE_WIDTH,
} from './node-metrics.js';

const DEFAULT_ROOT_OPTIONS: Readonly<Record<string, string>> = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
  'elk.partitioning.activate': 'true',
  // Ensure disconnected components (and isolated nodes) are aligned to the left
  // instead of being centered by component separation + packing.
  'elk.separateConnectedComponents': 'false',
  'elk.contentAlignment': 'H_LEFT',
  'elk.layered.spacing.nodeNodeBetweenLayers': '70',
  'elk.spacing.nodeNode': '32',
  'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
  'elk.layered.thoroughness': '10',
  // Keep nodes aligned consistently even when they are (locally) disconnected.
  // Otherwise ELK may center "free" nodes within a container while connected
  // nodes get aligned by edge constraints, which looks visually inconsistent.
  'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
  'elk.layered.nodePlacement.bk.fixedAlignment': 'LEFTUP',
  'elk.edgeRouting': 'ORTHOGONAL',
  'elk.padding': '[top=24,left=24,bottom=24,right=24]',
};

const CONTAINER_OPTIONS: Readonly<Record<string, string>> = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  // Give a bit more breathing room on the right than the left.
  'elk.padding': '[top=32,left=18,bottom=18,right=28]',
  'elk.separateConnectedComponents': 'false',
  'elk.contentAlignment': 'H_LEFT',
  'elk.spacing.nodeNode': '20',
  'elk.layered.spacing.nodeNodeBetweenLayers': '40',
  'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
  'elk.layered.nodePlacement.bk.fixedAlignment': 'LEFTUP',
  'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
};

function isExternalNode(n: BromaidNode): boolean {
  if (n.type === 'external') return true;
  if (n.slug !== null && (n.slug.startsWith('azure:') || n.slug.startsWith('gcp:'))) {
    return true;
  }
  return false;
}

function isExternalSubtree(el: BromaidElement): boolean {
  if (el.kind === 'node') return isExternalNode(el);
  if (el.children.length === 0) return false;
  return el.children.every(isExternalSubtree);
}

/**
 * Top-level partition assignment: actors flow on the left (0), services in
 * the middle (1), externals on the right (2). Mirrors the prototype's
 * intent of "user → app → 3rd-party" reading order.
 */
function partitionFor(el: BromaidElement): number {
  if (el.kind === 'node' && el.type === 'actor') return 0;
  if (el.kind === 'container' && isExternalSubtree(el)) return 2;
  if (el.kind === 'node' && isExternalNode(el)) return 2;
  return 1;
}

function nodeAccentExists(n: BromaidNode): boolean {
  return n.slug !== null;
}

/**
 * Derive a node's box from its labels using the same wrap function the
 * renderer will use. Width is bounded by [`NODE_WIDTH_MIN`, `NODE_WIDTH_MAX`];
 * height grows with the wrapped line count so wrapped text never overflows.
 *
 * Natural widths are measured per-glyph via `measureText` rather than
 * `chars × avg`, so labels with very different glyph mixes (e.g. `IIIIIII`
 * vs `MMMMMMM`) get correctly proportioned boxes and the rendered text
 * sits with consistent right padding.
 */
function measureNodeBox(n: BromaidNode): { width: number; height: number } {
  if (n.type === 'addon') {
    const CHIP_FONT = 10.5;
    const hasSlug = nodeAccentExists(n);
    const CHIP_ICON = hasSlug ? 14 : 0;
    const CHIP_ICON_GAP = hasSlug ? 6 : 0;
    const CHIP_PAD_X = 10;
    const CHIP_PAD_Y = 6;
    const CHIP_MIN_W = 84;
    const CHIP_MAX_W = 190;

    const textW = measureText(n.label, CHIP_FONT);
    const width = Math.min(
      CHIP_MAX_W,
      Math.max(CHIP_MIN_W, CHIP_PAD_X * 2 + CHIP_ICON + CHIP_ICON_GAP + textW),
    );
    const height = CHIP_FONT + CHIP_PAD_Y * 2 + 2;
    return { width: Math.ceil(width), height: Math.ceil(height) };
  }

  const slugBadge = nodeAccentExists(n) ? SLUG_BADGE_WIDTH : 0;
  const sideChrome = NODE_TEXT_LEFT_PAD + NODE_TEXT_RIGHT_PAD;

  const naturalLabelW = measureText(n.label, 11.5);
  const naturalSubW =
    n.sublabel !== null ? measureText(n.sublabel, 10) : 0;
  const naturalContentW = Math.max(naturalLabelW, naturalSubW);

  const width = Math.min(
    NODE_WIDTH_MAX,
    Math.max(NODE_WIDTH_MIN, naturalContentW + sideChrome + slugBadge),
  );

  const textW = Math.max(0, width - sideChrome);
  const measureLabel = (s: string): number => measureText(s, 11.5);
  const measureSublabel = (s: string): number => measureText(s, 10);
  const labelLines = wrapTextToLines(n.label, textW, measureLabel).lines;
  const sublabelLines =
    n.sublabel !== null
      ? wrapTextToLines(n.sublabel, textW, measureSublabel).lines
      : [];

  const labelH = Math.max(1, labelLines.length) * NODE_LABEL_LINE_H;
  const sublabelH = sublabelLines.length * NODE_SUBLABEL_LINE_H;
  const gap = sublabelLines.length > 0 ? NODE_LABEL_SUBLABEL_GAP : 0;

  const height = Math.max(
    NODE_TEXT_VERTICAL_PAD * 2 + labelH + gap + sublabelH,
    SLUG_BADGE_WIDTH + NODE_TEXT_VERTICAL_PAD * 2,
  );
  return { width, height };
}

function toElkChild(el: BromaidElement, depth: number): ElkNode {
  if (el.kind === 'container') {
    // The renderer draws a small pill in the container's top-left holding
    // an icon (~13px) + uppercased label. We do two things to keep that
    // pill on a single line:
    //
    //   1. Tell ELK the label has the same width as the pill via `labels`,
    //      so layout reserves room for it.
    //   2. Force the container's minimum width to fit pill + side insets
    //      (`MINIMUM_SIZE` constraint), because ELK otherwise sizes the
    //      container purely from its children and ignores the label.
    //
    // Both use per-glyph `measureText` so the reservation matches the
    // pill the renderer will actually draw.
    const titleText = el.label.toUpperCase();
    const titleLetterSpacing = /[^A-Z0-9 ]/.test(titleText) ? 0.35 : 0.6;
    const titleTextWidth = measureText(titleText, 9.5, { letterSpacing: titleLetterSpacing });
    const PILL_CHROME = 48; // pillPadX*2 + iconSize + iconGap + a couple px slack
    const PILL_TO_CONTAINER_INSET = 14; // 7 px each side
    const pillWidth = titleTextWidth + PILL_CHROME;
    const minContainerWidth = Math.ceil(pillWidth + PILL_TO_CONTAINER_INSET);

    const child: ElkNode = {
      id: el.id,
      layoutOptions: {
        ...CONTAINER_OPTIONS,
        'elk.nodeSize.constraints': 'MINIMUM_SIZE',
        'elk.nodeSize.minimum': `(${minContainerWidth},60)`,
      },
      children: el.children.map((c) => toElkChild(c, depth + 1)),
      labels: [{ text: el.label, width: pillWidth, height: 22 }],
    };
    if (depth === 0 && child.layoutOptions !== undefined) {
      child.layoutOptions['elk.partitioning.partition'] = String(partitionFor(el));
    }
    return child;
  }
  const box = measureNodeBox(el);
  const child: ElkNode = {
    id: el.id,
    width: box.width,
    height: box.height,
  };
  if (depth === 0) {
    child.layoutOptions = {
      'elk.partitioning.partition': String(partitionFor(el)),
    };
  }
  return child;
}

export function buildElkGraph(
  program: Program,
  rootOptions: Readonly<Record<string, string>> = DEFAULT_ROOT_OPTIONS,
): ElkNode {
  const elkEdges = program.edges.map((e, i) => ({
    id: `e${i}`,
    sources: [e.fromId],
    targets: [e.toId],
    labels:
      e.label !== null
        ? [
            {
              text: e.label,
              width: e.label.length * 6,
              height: 14,
            },
          ]
        : [],
  }));

  return {
    id: 'root',
    layoutOptions: { ...rootOptions },
    children: program.root.children.map((c) => toElkChild(c, 0)),
    edges: elkEdges,
  } satisfies ElkNode;
}

/**
 * Build a flat id → element index for the program (re-derived from `program.elements`).
 * Layout output never references our element types directly, so we look them up here.
 */
export function buildElementIndex(program: Program): ReadonlyMap<string, BromaidElement> {
  return program.elements;
}

export { partitionFor, isExternalNode, isExternalSubtree };
export type { BromaidContainer, BromaidNode };
