import { mount, type GraphData } from '@bromaid/renderer/client';

// "Where things run": clusters (left) → apps (right), the exact sample from
// the brief plus a deploying edge (state "run") and a stopped app (treetop).
const whereThingsRun: GraphData = {
  direction: 'LR',
  columns: [
    {
      id: 'clusters',
      nodes: [
        {
          id: 'c1', kind: 'cluster', label: 'aevy-k8s-sweden-central-001',
          lines: ['Azure · 6 machines', '$2,784/mo', '7 built-in apps running'],
          state: 'ok', href: '#/clusters/c1', tip: 'Production, Sweden Central',
        },
        {
          id: 'c2', kind: 'cluster', label: 'preview-cluster',
          lines: ['AWS · 2 machines', '$212/mo', '5 built-in apps running'], state: 'ok',
        },
        { id: 'new', kind: 'ghost', label: 'New cluster', icon: 'plus', action: 'new-cluster' },
      ],
    },
    {
      id: 'apps',
      nodes: [
        { id: 'a1', kind: 'app', label: 'aevy-app', meta: '3×', state: 'ok', href: '#/apps/a1' },
        { id: 'a2', kind: 'app', label: 'core-api', meta: '2×', state: 'run', tip: 'Deploying v1.42' },
        { id: 'a3', kind: 'app', label: 'hatchet-worker', meta: '1×', state: 'ok' },
        { id: 'a8', kind: 'app', label: 'treetop', meta: '0', state: 'off', tip: 'Stopped' },
      ],
    },
  ],
  edges: [
    { from: 'c1', to: 'a1', state: 'ok', label: '2×' },
    { from: 'c2', to: 'a1', state: 'ok', label: '1×' },
    { from: 'c1', to: 'a2', state: 'run', label: '2×' },
    { from: 'c1', to: 'a3', state: 'ok', label: '1×' },
    { from: 'c1', to: 'a8', state: 'off' },
  ],
};

const log = document.getElementById('log') as HTMLElement;
const say = (s: string): void => {
  log.textContent = s;
};

const g = mount(document.getElementById('home') as HTMLElement, whereThingsRun, {
  grid: true,
  padding: 16,
  label: 'Where things run',
  onNodeClick: (n, e) => {
    e.preventDefault();
    say(`onNodeClick: ${n.id}${n.href !== undefined ? ` (href ${n.href})` : ''}`);
  },
  onAction: (a) => say(`onAction: ${a}`),
});

let deploying = true;
let extra = false;
document.getElementById('toggle')?.addEventListener('click', () => {
  deploying = !deploying;
  void g.update(state());
});
document.getElementById('add')?.addEventListener('click', () => {
  extra = !extra;
  void g.update(state());
});
function state(): GraphData {
  const apps = whereThingsRun.columns?.[1]?.nodes ?? [];
  const nodes = apps.map((n) => (n.id === 'a2' ? { ...n, state: deploying ? 'run' : 'ok' } : n));
  if (extra) nodes.splice(1, 0, { id: 'a9', kind: 'app', label: 'nala', meta: '1×', state: 'ok' });
  return {
    ...whereThingsRun,
    columns: [whereThingsRun.columns?.[0] as never, { id: 'apps', nodes }],
    edges: [
      ...whereThingsRun.edges.map((e) => (e.to === 'a2' ? { ...e, state: deploying ? 'run' : 'ok' } : e)),
      ...(extra ? [{ from: 'c2', to: 'a9', state: 'ok', label: '1×' }] : []),
    ],
  };
}

// A multi-level graph on the general (ELK) layout, highlighted in chain mode:
// hover a node to see every ancestor and every descendant.
const connections: GraphData = {
  groups: [{ id: 'data', label: 'Data' }],
  nodes: [
    { id: 'users', kind: 'actor', label: 'Users' },
    { id: 'web', kind: 'app', label: 'web', meta: '3×', state: 'ok' },
    { id: 'admin', kind: 'app', label: 'admin', meta: '1×', state: 'ok' },
    { id: 'api', kind: 'app', label: 'core-api', meta: '2×', state: 'run' },
    { id: 'worker', kind: 'app', label: 'hatchet-worker', meta: '1×', state: 'ok' },
    { id: 'pg', kind: 'db', label: 'Postgres', lines: ['RDS · Multi-AZ'], state: 'ok', group: 'data' },
    { id: 'redis', kind: 'db', label: 'Redis', lines: ['cache'], state: 'ok', group: 'data' },
    { id: 's3', kind: 'db', label: 'Uploads', lines: ['S3 bucket'], icon: 'box', state: 'off', group: 'data' },
  ],
  edges: [
    { from: 'users', to: 'web' }, { from: 'users', to: 'admin' },
    { from: 'web', to: 'api', state: 'ok' }, { from: 'admin', to: 'api', state: 'ok' },
    { from: 'api', to: 'pg', state: 'run', label: 'migrating' }, { from: 'api', to: 'redis' },
    { from: 'worker', to: 'pg' }, { from: 'worker', to: 's3', state: 'off' },
  ],
};
const chain = mount(document.getElementById('chain') as HTMLElement, connections, {
  highlight: 'chain',
  grid: true,
  padding: 16,
  label: 'Connections',
});

// `#hl=c2` highlights a node on load (handy for screenshots).
const hl = /hl=([\w-]+)/.exec(location.hash)?.[1];
if (hl !== undefined) {
  void g.ready.then(() => g.highlight(hl));
  void chain.ready.then(() => chain.highlight(hl));
}
