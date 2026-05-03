export type Faq = { readonly q: string; readonly a: string };

export const faqs: readonly Faq[] = [
  {
    q: 'What is bromaid?',
    a: 'bromaid is an open-source TypeScript toolkit for diagrams-as-code. You write a tiny DSL and the library returns an SVG string. The pipeline is parse → layout → renderSVG, all pure functions with no DOM.',
  },
  {
    q: 'Where does bromaid run?',
    a: 'Anywhere modern JavaScript runs: Node 18+, Bun, Deno, Cloudflare Workers, the edge, CLIs, and inside React Server Components. There are no browser globals or worker URLs required.',
  },
  {
    q: 'How is bromaid different from Mermaid or Graphviz?',
    a: 'bromaid is a pure-function TypeScript library that returns an SVG string. There is no DOM, no client runtime, and no worker setup. Layout uses ELK; the renderer is a plain function you can call from a server, a build script, or an RSC.',
  },
  {
    q: 'Is bromaid free and open source?',
    a: 'Yes. bromaid is MIT licensed. The source lives at github.com/vaarvik/bromaid.',
  },
  {
    q: 'How do I install bromaid?',
    a: 'Install via npm, pnpm, or yarn: `npm install bromaid`. The umbrella package bundles core, layout, renderer, and theme.',
  },
];
