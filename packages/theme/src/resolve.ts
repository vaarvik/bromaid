import type { BromaidElement, CloudSlug, NodeKind } from '@bromaid/core';
import type { SlugTheme, Theme } from './types.js';

/**
 * Resolve a slug to its palette by walking from the most specific match
 * (`aws:s3`) to the least specific (`aws`).
 *
 * Returns null if no slug or no palette matches.
 */
export function resolveSlugTheme(
  theme: Theme,
  slug: CloudSlug | null,
): SlugTheme | null {
  if (slug === null) return null;
  const parts = slug.split(':');
  for (let i = parts.length; i > 0; i--) {
    const key = parts.slice(0, i).join(':');
    const hit = theme.slugs.get(key);
    if (hit !== undefined) return hit;
  }
  return null;
}

/**
 * The accent color for a node, in priority order:
 *   1. The slug palette (e.g. AWS orange)
 *   2. The node-type palette (e.g. db purple)
 *   3. null (caller picks a fallback)
 */
export function resolveNodeAccent(theme: Theme, el: BromaidElement): string | null {
  if (el.kind !== 'node') return null;
  const slugHit = resolveSlugTheme(theme, el.slug);
  if (slugHit !== null) return slugHit.color;
  const typeHit = theme.nodeTypes.get(el.type satisfies NodeKind);
  if (typeHit !== undefined) return typeHit.color;
  return null;
}
