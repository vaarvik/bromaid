# @bromaid/layout

## 0.1.2

### Patch Changes

- 6123ef1: Edges that leave the same node with the same label now leave from one point and run as one line that splits close to its targets (they share an ELK port, which ELK routes as a hyperedge), instead of a bundle of parallel lines. Only on the way out: edges from different nodes never share a line, so no false links appear.

## 0.1.1

### Patch Changes

- 0057835: Add `bromaid` umbrella package (batteries-included) and improve npm metadata/READMEs for all packages.
- Updated dependencies [0057835]
  - @bromaid/core@0.1.1
