---
'bromaid': patch
'@bromaid/layout': patch
'@bromaid/renderer': patch
---

Graph 0.2.2: pan and zoom, aligned stacks, roomier nodes.

- `mount(el, data, { panZoom: true, fit: 'both' })`: a full-screen canvas by the usual convention — wheel / two-finger scroll pans, pinch or ctrl/⌘ + wheel zooms at the pointer, drag the empty canvas or Space + drag pans, `+` / `-` / `0` keys and zoom buttons, double-click zooms in, opens centred both ways. Nodes stay focusable and clickable. Handle: `zoomIn()`, `zoomOut()`, `fit()`, `viewport()`; React: `graphRef`, `onViewport`. Off by default (the graph stays static so the page scrolls). Pure maths in `@bromaid/layout/graph` (`fitViewport`, `zoomAt`, `wheelAction`, `keyAction`, `pinchStep`, `revealBox`).
- Nodes stacked in a group line up on the left with one shared width (`GraphGroup.align` / option `align`, default `start`; `center` keeps the old placement).
- The end port dot follows its edge on every update (it stayed at its first position).
- Nodes are measured rounded up (and again when web fonts load), so text no longer gets cut or runs out of its box.
- `app` nodes grow with their `lines` (min-height 40px, 8px padding on all sides) instead of clipping at 40px; the built-in app template shows the lines.
- Group frames: the label has the same 16px gap to the nodes as the sides.
