---
"bromaid": patch
"@bromaid/layout": patch
"@bromaid/renderer": patch
---

Graph fixes from the first client mounts:

- The hidden tooltip no longer carries `role="tooltip"` (it is `aria-hidden` until shown), so an empty tooltip no longer fails axe.
- Edges end flush at the target's left edge (`EDGE_END_GAP` is now 0) with a port dot at the target too, mirroring the source.
- New edge and node state `fail`: solid 1.5px in `--fail` (red), full `--fail` when highlighted.
