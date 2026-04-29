import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parse, type BromaidElement } from '@bromaid/core';
import { layout } from '@bromaid/layout';
import { renderSVG, type RenderMode } from '@bromaid/renderer';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..');

function countNodes(children: ReadonlyArray<BromaidElement>): number {
  let n = 0;
  for (const c of children) {
    if (c.kind === 'node') n++;
    else n += countNodes(c.children);
  }
  return n;
}

async function main(): Promise<void> {
  const sample = process.argv[2] ?? 'full';
  const mode: RenderMode = process.argv[3] === 'light' ? 'light' : 'dark';
  const outFile = process.argv[4] ?? resolve(repo, 'architecture.svg');

  const source = await readFile(resolve(repo, 'examples', `${sample}.bro`), 'utf8');
  const program = parse(source);
  const graph = await layout(program);
  const svg = renderSVG(graph, { mode });
  await writeFile(outFile, svg, 'utf8');

  const nodeCount = countNodes(program.root.children);
  process.stdout.write(
    `bromaid: rendered ${sample}.bro (${mode}) -> ${outFile}\n` +
      `         ${nodeCount} nodes, ${program.edges.length} edges, ${Math.round(graph.width)}x${Math.round(graph.height)}\n`,
  );
}

main().catch((err: unknown) => {
  process.stderr.write(`bromaid: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
