import type { GraphNode } from '@bromaid/layout/graph';
import { escapeXml } from '../escape.js';

const svg = (body: string): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

/** Built-in node icons (stroke = `currentColor`). */
export const graphIcons: Readonly<Record<string, string>> = {
  cluster: svg('<rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/><path d="M7 7h.01M7 17h.01"/>'),
  app: svg('<path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Z"/><path d="M4 7.5 12 12l8-4.5M12 12v9"/>'),
  box: svg('<rect x="4" y="4" width="16" height="16" rx="3"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  db: svg('<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>'),
  globe: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z"/>'),
  user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>'),
};

const KIND_ICON: Readonly<Record<string, string>> = {
  cluster: 'cluster',
  app: 'app',
  ghost: 'plus',
  db: 'db',
  actor: 'user',
  external: 'globe',
};

/** Icon markup for a node: a built-in icon, else the first letter of `icon`. */
export function nodeIconHTML(node: GraphNode): string {
  const name = node.icon ?? KIND_ICON[node.kind ?? 'app'] ?? 'box';
  const builtin = graphIcons[name];
  if (builtin !== undefined) return builtin;
  const letter = (name.split(':').pop() ?? name).charAt(0).toUpperCase();
  return `<span class="bm-tile-letter" aria-hidden="true">${escapeXml(letter)}</span>`;
}

/** cluster (and any kind without its own template): tile + label + up to 3 muted lines. */
export function cardTemplate(node: GraphNode): string {
  const lines = (node.lines ?? []).slice(0, 3).map((l) => `<span class="bm-line">${escapeXml(l)}</span>`).join('');
  return `<span class="bm-tile">${nodeIconHTML(node)}</span><span class="bm-text"><span class="bm-label">${escapeXml(node.label)}</span>${lines}</span>`;
}

/** app: compact 40px row, tile + label + right-aligned mono meta. */
export function appTemplate(node: GraphNode): string {
  const meta = node.meta !== undefined && node.meta !== '' ? `<span class="bm-meta">${escapeXml(node.meta)}</span>` : '';
  return `<span class="bm-tile">${nodeIconHTML(node)}</span><span class="bm-label">${escapeXml(node.label)}</span>${meta}`;
}

/** ghost: centred icon + label (dashed outline comes from the class). */
export function ghostTemplate(node: GraphNode): string {
  return `${nodeIconHTML(node)}<span class="bm-label">${escapeXml(node.label)}</span>`;
}

export type StringTemplate = (node: GraphNode) => string;

export const builtinTemplates: Readonly<Record<string, StringTemplate>> = {
  cluster: cardTemplate,
  app: appTemplate,
  ghost: ghostTemplate,
};

/** The template name a node's kind resolves to among the built-ins. */
export function builtinTemplateFor(kind: string): StringTemplate {
  return builtinTemplates[kind] ?? cardTemplate;
}

/** Wrapper classes of a node element. */
export function nodeClass(node: GraphNode, clickable: boolean): string {
  const kind = node.kind ?? 'app';
  const builtin = kind in builtinTemplates ? kind : 'card';
  const cls = ['bm-node', `bm-node--${builtin}`];
  if (builtin !== kind) cls.push(`bm-kind--${cssIdent(kind)}`);
  if (node.state !== undefined) cls.push(`bm-node--${cssIdent(node.state)}`);
  if (clickable) cls.push('bm-node--click');
  return cls.join(' ');
}

export function cssIdent(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, '-');
}
