import type { SlugIcon, SlugIconPath } from './types.js';

export interface SimpleIconsIcon {
  readonly svg: string;
  readonly path: string;
}

export interface SimpleIconsSlugMapping {
  /** Bromaid slug (e.g. "slack", "aws"). */
  readonly bromaidSlug: string;
  /** Simple Icons slug (e.g. "slack", "amazonwebservices"). */
  readonly simpleIconsSlug: string;
}

export function simpleIconToSlugIcon(icon: SimpleIconsIcon): SlugIcon {
  const viewBox = extractSvgViewBox(icon.svg);
  const d = icon.path.trim();
  if (d.length === 0) {
    throw new Error('Simple Icons icon has empty path');
  }
  const paths: ReadonlyArray<SlugIconPath> = [{ d }];
  return { viewBox, paths };
}

export function extractSvgViewBox(svg: string): string {
  const m = svg.match(/\bviewBox="([^"]+)"/i);
  const viewBox = m?.[1]?.trim() ?? '';
  if (viewBox.length === 0) {
    throw new Error('Could not extract viewBox from SVG');
  }
  return viewBox;
}

