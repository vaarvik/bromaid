import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@bromaid/core';
import { layout } from '@bromaid/layout';
import { renderSVG } from '@bromaid/renderer';

export const dynamic = 'force-static';

const here = dirname(fileURLToPath(import.meta.url));
const examplePath = resolve(here, '../../../examples/full.bro');

export default async function Page() {
  const source = await readFile(examplePath, 'utf8');
  const program = parse(source);
  const graph = await layout(program);
  const svg = renderSVG(graph, { mode: 'dark', background: 'surface' });

  return (
    <main style={{ padding: '24px' }}>
      <h1 style={{ fontSize: 16, fontWeight: 500, margin: '0 0 16px' }}>
        bromaid RSC smoke test ({program.elements.size} elements,{' '}
        {program.edges.length} edges)
      </h1>
      <div
        style={{ width: '100%', overflow: 'auto' }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </main>
  );
}
