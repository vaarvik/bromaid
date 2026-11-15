/**
 * Stylesheet for interactive graphs (`mount()`) and for the static
 * `renderGraphHTML()` output. Every colour comes from a CSS variable:
 * the host's `--card --raised --bd2 --fg --fa --ok --run --ok-t --run-t
 * --font-mono`. The values after the commas are dark-mode defaults used only
 * when the host defines none of them.
 */
export const graphCss = `
.bm-graph{
  --bm-card:var(--card,#15181d);--bm-raised:var(--raised,#1d2128);--bm-bd2:var(--bd2,#2d333d);
  --bm-fg:var(--fg,#e7e9ec);--bm-fa:var(--fa,#8b929d);--bm-ok:var(--ok,#41b883);--bm-run:var(--run,#5a9cff);
  --bm-ok-t:var(--ok-t,rgba(65,184,131,.14));--bm-run-t:var(--run-t,rgba(90,156,255,.14));
  --bm-mono:var(--font-mono,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);
  position:relative;color:var(--bm-fg);font:inherit;box-sizing:border-box;
}
.bm-graph *,.bm-graph *::before,.bm-graph *::after{box-sizing:border-box}
.bm-graph--grid{background-image:radial-gradient(circle,var(--bm-bd2) 1px,transparent 1.3px);background-size:16px 16px}
.bm-stage{position:relative;margin:0 auto}
.bm-edges{position:absolute;left:0;top:0;overflow:visible;pointer-events:none}
.bm-edge{pointer-events:auto;transition:opacity .12s}
.bm-edge-hit{fill:none;stroke:transparent;stroke-width:12;cursor:default}
.bm-edge-line{fill:none;stroke:color-mix(in srgb,var(--bm-fa) 70%,transparent);stroke-width:1.5;stroke-linecap:round;transition:stroke .12s,stroke-width .12s}
.bm-port{fill:var(--bm-fa)}
.bm-edge--ok .bm-edge-line{stroke:color-mix(in srgb,var(--bm-ok) 55%,transparent)}
.bm-edge--ok .bm-port{fill:color-mix(in srgb,var(--bm-ok) 70%,transparent)}
.bm-edge--run .bm-edge-line{stroke:var(--bm-run);stroke-dasharray:5 5;animation:bm-dash .8s linear infinite}
.bm-edge--run .bm-port{fill:var(--bm-run)}
.bm-edge--off .bm-edge-line{stroke:color-mix(in srgb,var(--bm-fa) 60%,transparent);stroke-dasharray:3 4}
.bm-edge--off .bm-port{fill:color-mix(in srgb,var(--bm-fa) 60%,transparent)}
.bm-edge-label{font-family:var(--bm-mono);font-size:10px;fill:var(--bm-fa);pointer-events:none}
@keyframes bm-dash{to{stroke-dashoffset:-20}}
.bm-graph[data-hl] .bm-node:not(.bm-on),.bm-graph[data-hl] .bm-group:not(.bm-on){opacity:.3}
.bm-graph[data-hl] .bm-edge:not(.bm-on){opacity:.18}
.bm-edge.bm-on .bm-edge-line{stroke-width:2}
.bm-edge--ok.bm-on .bm-edge-line{stroke:var(--bm-ok)}
.bm-edge--ok.bm-on .bm-port{fill:var(--bm-ok)}
.bm-edge--off.bm-on .bm-edge-line{stroke:var(--bm-fa)}
.bm-edge.bm-on .bm-edge-label{fill:var(--bm-fg)}
.bm-group{position:absolute;left:0;top:0;border:1px dashed var(--bm-bd2);border-radius:12px;
  background:color-mix(in srgb,var(--bm-raised) 35%,transparent);transition:opacity .12s}
.bm-group-label{position:absolute;left:12px;top:9px;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--bm-fa);white-space:nowrap}
.bm-node{position:absolute;left:0;top:0;display:flex;gap:10px;margin:0;padding:12px;background:var(--bm-card);
  border:1px solid var(--bm-bd2);border-radius:10px;color:var(--bm-fg);font:inherit;text-align:left;text-decoration:none;
  transition:opacity .12s,border-color .12s;outline:none;-webkit-tap-highlight-color:transparent}
.bm-graph--layered .bm-node{width:max-content;min-width:150px;max-width:240px}
.bm-node[href],.bm-node--click,button.bm-node{cursor:pointer}
.bm-node[href]:hover,.bm-node--click:hover,button.bm-node:hover,.bm-node.bm-on{border-color:color-mix(in srgb,var(--bm-fa) 60%,var(--bm-bd2))}
.bm-node:focus-visible{box-shadow:0 0 0 2px var(--bm-card),0 0 0 4px var(--bm-ok)}
.bm-tile{flex:none;display:grid;place-items:center;width:36px;height:36px;border-radius:8px;background:var(--bm-raised);color:var(--bm-fa)}
.bm-tile svg{width:18px;height:18px}
.bm-tile-letter{font-size:13px;font-weight:600;line-height:1}
.bm-text{display:flex;flex-direction:column;min-width:0;flex:1}
.bm-label{font-size:13px;font-weight:600;line-height:18px;overflow-wrap:anywhere}
.bm-line{font-size:12px;line-height:16px;color:var(--bm-fa);overflow-wrap:anywhere}
.bm-node--ok .bm-tile{background:var(--bm-ok-t);color:var(--bm-ok)}
.bm-node--run .bm-tile{background:var(--bm-run-t);color:var(--bm-run)}
.bm-node--app{height:40px;align-items:center;gap:8px;padding:0 10px}
.bm-node--app .bm-tile{width:24px;height:24px;border-radius:6px}
.bm-node--app .bm-tile svg{width:14px;height:14px}
.bm-node--app .bm-label{font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0}
.bm-meta{margin-left:auto;padding-left:6px;font-family:var(--bm-mono);font-size:12px;color:var(--bm-fa);white-space:nowrap}
.bm-node--ghost{min-height:44px;align-items:center;justify-content:center;gap:8px;padding:10px;background:transparent;border-style:dashed;color:var(--bm-fa)}
.bm-node--ghost .bm-label{font-weight:500}
.bm-node--ghost svg{width:16px;height:16px}
.bm-node--ghost:hover,.bm-node--ghost:focus-visible{color:var(--bm-fg)}
.bm-node--off{border-style:dashed;background:transparent}
.bm-node--off .bm-label{color:var(--bm-fa)}
.bm-node--off .bm-tile{background:transparent;border:1px dashed var(--bm-bd2);color:var(--bm-fa)}
.bm-tip{position:absolute;left:0;top:0;z-index:2;max-width:260px;padding:6px 8px;border-radius:6px;background:var(--bm-raised);
  border:1px solid var(--bm-bd2);color:var(--bm-fg);font-size:12px;line-height:16px;pointer-events:none;opacity:0;
  transform:translate(-50%,calc(-100% - 8px));transition:opacity .1s}
.bm-tip--on{opacity:1}
@media (prefers-reduced-motion:reduce){.bm-edge--run .bm-edge-line{animation:none}.bm-graph *{transition:none!important}}
`;
