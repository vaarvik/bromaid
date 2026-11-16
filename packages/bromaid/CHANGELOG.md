# bromaid

## 0.2.1

### Patch Changes

- 062f84c: Graph fixes from the first client mounts:

  - The hidden tooltip no longer carries `role="tooltip"` (it is `aria-hidden` until shown), so an empty tooltip no longer fails axe.
  - Edges end flush at the target's left edge (`EDGE_END_GAP` is now 0) with a port dot at the target too, mirroring the source.
  - New edge and node state `fail`: solid 1.5px in `--fail` (red), full `--fail` when highlighted.

- Updated dependencies [062f84c]
  - @bromaid/layout@0.2.1
  - @bromaid/renderer@0.2.1

## 0.2.0

### Minor Changes

- 65a6f85: Interactive graphs from plain data. New column layout (fixed columns in the given order, centred, 1.35 : 1 widths, fits the container), smooth cubic edges with a port dot and states `ok` / `run` (animated dash, reduced-motion aware) / `off`, non-overlapping edge labels at the source end, HTML node templates (`cluster`, `app`, `ghost`, custom per kind), CSS-variable theming, hover/focus highlight in `neighbours` or `chain` mode, click/href/`onAction`, keyboard and tooltips, and idempotent `update()` with 150 ms position animation. Works with the column layout and with bromaid's general ELK layout (`layoutLayered`, `graphFromProgram` for any DSL diagram).

  - `@bromaid/layout/graph` (pure, no ELK): `layoutColumns`, `edgePath`, `placeEdgeLabels`, `highlightForNode` / `highlightForEdge`; `@bromaid/layout` adds `layoutLayered`.
  - `@bromaid/renderer/client`: `mount(el, data, options)`; `@bromaid/renderer/react`: `<Bromaid data />`. The main renderer entry stays DOM-free and adds `renderGraphEdgesSVG`, `renderGraphHTML`, `graphCss`.
  - `bromaid/client` and `bromaid/react` re-export the client entries; `bromaid` re-exports the pure graph functions.

### Patch Changes

- Updated dependencies [65a6f85]
  - @bromaid/layout@0.2.0
  - @bromaid/renderer@0.2.0

## 0.1.2

### Patch Changes

- Updated dependencies [6123ef1]
  - @bromaid/layout@0.1.2
  - @bromaid/renderer@0.1.2

## 0.1.1

### Patch Changes

- 0057835: Add `bromaid` umbrella package (batteries-included) and improve npm metadata/READMEs for all packages.
- Updated dependencies [0057835]
  - @bromaid/core@0.1.1
  - @bromaid/layout@0.1.1
  - @bromaid/renderer@0.1.1
  - @bromaid/theme@0.1.1
