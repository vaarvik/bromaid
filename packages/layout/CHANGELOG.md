# @bromaid/layout

## 0.2.2

### Patch Changes

- 8590f51: Graph 0.2.2: pan and zoom, aligned stacks, roomier nodes.

  - `mount(el, data, { panZoom: true, fit: 'both' })`: a full-screen canvas by the usual convention — wheel / two-finger scroll pans, pinch or ctrl/⌘ + wheel zooms at the pointer, drag the empty canvas or Space + drag pans, `+` / `-` / `0` keys and zoom buttons, double-click zooms in, opens centred both ways. Nodes stay focusable and clickable. Handle: `zoomIn()`, `zoomOut()`, `fit()`, `viewport()`; React: `graphRef`, `onViewport`. Off by default (the graph stays static so the page scrolls). Pure maths in `@bromaid/layout/graph` (`fitViewport`, `zoomAt`, `wheelAction`, `keyAction`, `pinchStep`, `revealBox`).
  - Nodes stacked in a group line up on the left with one shared width (`GraphGroup.align` / option `align`, default `start`; `center` keeps the old placement).
  - The end port dot follows its edge on every update (it stayed at its first position).
  - Nodes are measured rounded up (and again when web fonts load), so text no longer gets cut or runs out of its box.
  - `app` nodes grow with their `lines` (min-height 40px, 8px padding on all sides) instead of clipping at 40px; the built-in app template shows the lines.
  - Group frames: the label has the same 16px gap to the nodes as the sides.

## 0.2.1

### Patch Changes

- 062f84c: Graph fixes from the first client mounts:

  - The hidden tooltip no longer carries `role="tooltip"` (it is `aria-hidden` until shown), so an empty tooltip no longer fails axe.
  - Edges end flush at the target's left edge (`EDGE_END_GAP` is now 0) with a port dot at the target too, mirroring the source.
  - New edge and node state `fail`: solid 1.5px in `--fail` (red), full `--fail` when highlighted.

## 0.2.0

### Minor Changes

- 65a6f85: Interactive graphs from plain data. New column layout (fixed columns in the given order, centred, 1.35 : 1 widths, fits the container), smooth cubic edges with a port dot and states `ok` / `run` (animated dash, reduced-motion aware) / `off`, non-overlapping edge labels at the source end, HTML node templates (`cluster`, `app`, `ghost`, custom per kind), CSS-variable theming, hover/focus highlight in `neighbours` or `chain` mode, click/href/`onAction`, keyboard and tooltips, and idempotent `update()` with 150 ms position animation. Works with the column layout and with bromaid's general ELK layout (`layoutLayered`, `graphFromProgram` for any DSL diagram).

  - `@bromaid/layout/graph` (pure, no ELK): `layoutColumns`, `edgePath`, `placeEdgeLabels`, `highlightForNode` / `highlightForEdge`; `@bromaid/layout` adds `layoutLayered`.
  - `@bromaid/renderer/client`: `mount(el, data, options)`; `@bromaid/renderer/react`: `<Bromaid data />`. The main renderer entry stays DOM-free and adds `renderGraphEdgesSVG`, `renderGraphHTML`, `graphCss`.
  - `bromaid/client` and `bromaid/react` re-export the client entries; `bromaid` re-exports the pure graph functions.

## 0.1.2

### Patch Changes

- 6123ef1: Edges that leave the same node with the same label now leave from one point and run as one line that splits close to its targets (they share an ELK port, which ELK routes as a hyperedge), instead of a bundle of parallel lines. Only on the way out: edges from different nodes never share a line, so no false links appear.

## 0.1.1

### Patch Changes

- 0057835: Add `bromaid` umbrella package (batteries-included) and improve npm metadata/READMEs for all packages.
- Updated dependencies [0057835]
  - @bromaid/core@0.1.1
