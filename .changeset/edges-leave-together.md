---
"@bromaid/layout": patch
---

Edges that leave the same node with the same label now leave from one point and run as one line that splits close to its targets (they share an ELK port, which ELK routes as a hyperedge), instead of a bundle of parallel lines. Only on the way out: edges from different nodes never share a line, so no false links appear.
