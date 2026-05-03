import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { siteUrl } from '../_lib/site';

export const dynamic = 'force-static';

const README_PATH = resolve(process.cwd(), '../../README.md');
const SPEC_PATH = resolve(process.cwd(), '../../SPEC.md');

export async function GET(): Promise<Response> {
  const [readme, spec] = await Promise.all([
    readFile(README_PATH, 'utf8'),
    readFile(SPEC_PATH, 'utf8'),
  ]);

  const body = [
    `# bromaid — full reference`,
    ``,
    `> Diagrams-as-code for TypeScript. Parse a tiny DSL, get an SVG string. Pure functions, zero DOM, runs anywhere.`,
    ``,
    `Source of truth: ${siteUrl}. Repository: https://github.com/vaarvik/bromaid. License: MIT.`,
    ``,
    `This file concatenates README.md and SPEC.md for ingestion by language models.`,
    ``,
    `---`,
    ``,
    `# README`,
    ``,
    readme.trim(),
    ``,
    `---`,
    ``,
    `# DSL specification`,
    ``,
    spec.trim(),
    ``,
  ].join('\n');

  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
