import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Playground from './playground';

export const dynamic = 'force-static';

const here = dirname(fileURLToPath(import.meta.url));
const defaultSourcePath = resolve(here, '../../../examples/full.bro');

export default async function Page() {
  const defaultSource = await readFile(defaultSourcePath, 'utf8');
  return <Playground defaultSource={defaultSource} />;
}
