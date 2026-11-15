// Bundles examples/graphs/main.ts into examples/graphs/bundle.js so
// examples/graphs/index.html opens straight from disk (no server needed).
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { build } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const dir = resolve(here, '../examples/graphs');

await build({
  entryPoints: [resolve(dir, 'main.ts')],
  outfile: resolve(dir, 'bundle.js'),
  bundle: true,
  format: 'iife',
  target: 'es2020',
  minify: true,
  logLevel: 'info',
});
