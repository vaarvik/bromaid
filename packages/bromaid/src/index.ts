import { parse, type BromaidError, type BromaidErrorCode, type BromaidErrorOptions, type Program } from '@bromaid/core';
import { layout, type LayoutGraph, type LayoutOptions } from '@bromaid/layout';
import { renderSVG, type RenderOptions } from '@bromaid/renderer';
import {
  defaultTheme,
  defineTheme,
  mergeTheme,
  resolveNodeAccent,
  resolveSlugTheme,
  type DefineThemeInput,
  type RenderMode,
  type Theme,
  type ThemeOverrides,
} from '@bromaid/theme';

export {
  parse,
  layout,
  renderSVG,
  defaultTheme,
  defineTheme,
  mergeTheme,
  resolveNodeAccent,
  resolveSlugTheme,
};

export type {
  Program,
  LayoutGraph,
  LayoutOptions,
  RenderOptions,
  RenderMode,
  Theme,
  ThemeOverrides,
  DefineThemeInput,
  BromaidError,
  BromaidErrorCode,
  BromaidErrorOptions,
};

/**
 * Convenience helper for the common pipeline:
 *
 * `parse(source) → layout(program) → renderSVG(graph, options)`
 */
export async function renderFromSource(
  source: string,
  options?: RenderOptions,
): Promise<string> {
  return renderSVG(await layout(parse(source)), options);
}

