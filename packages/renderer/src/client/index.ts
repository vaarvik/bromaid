/**
 * `@bromaid/renderer/client` — the interactive, DOM-using half of bromaid's
 * graphs. Import it only in the browser (or a React client component); the
 * main `@bromaid/renderer` entry stays DOM-free and RSC-safe.
 */
export { mount, type MountOptions, type MountedGraph, type NodeTemplate, type NodeTemplateContext } from './mount.js';
export { graphCss } from '../graph/css.js';
export { escapeXml } from '../escape.js';
export {
  appTemplate,
  builtinTemplates,
  cardTemplate,
  ghostTemplate,
  graphIcons,
  nodeIconHTML,
} from '../graph/templates.js';
export type * from '@bromaid/layout/graph';
