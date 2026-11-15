import { parse, type BromaidError, type BromaidErrorCode, type BromaidErrorOptions, type Program } from '@bromaid/core';
import { layout, type LayoutGraph, type LayoutOptions } from '@bromaid/layout';
import { renderGraphEdgesSVG, renderGraphHTML, graphCss, type GraphHTMLOptions } from '@bromaid/renderer';
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
  renderGraphEdgesSVG,
  renderGraphHTML,
  graphCss,
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
  GraphHTMLOptions,
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


// Graphs from plain data (column layout, cubic edges, highlight walk). Pure;
// the interactive part lives in `bromaid/client` and `bromaid/react`.
export {
  columnWidths,
  edgeEnds,
  edgeIds,
  edgePath,
  edgePoint,
  estimateNodeHeight,
  estimateNodeSize,
  graphFromProgram,
  graphNodes,
  highlightForEdge,
  highlightForNode,
  layoutColumns,
  layoutLayered,
  orderByCrossings,
  placeEdgeLabels,
  routeEdges,
  type ColumnLayoutOptions,
  type ColumnOrder,
  type GraphColumn,
  type GraphData,
  type GraphEdge,
  type GraphGroup,
  type GraphLayout,
  type GraphNode,
  type GraphState,
  type HighlightMode,
  type HighlightSet,
  type LayeredLayoutOptions,
  type PlacedGraphEdge,
  type PlacedGraphNode,
} from '@bromaid/layout';
