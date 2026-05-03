import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const dynamic = 'force-static';

const SPEC_PATH = resolve(process.cwd(), '../../SPEC.md');

export async function GET(): Promise<Response> {
  const md = await readFile(SPEC_PATH, 'utf8');
  return new Response(md, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
