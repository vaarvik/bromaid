import type { Metadata } from 'next';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { JsonLd } from './_components/json-ld';
import {
  siteDescription,
  siteName,
  siteShortDescription,
  siteTagline,
} from './_lib/site';
import { webPageLd } from './_lib/structured-data';
import Playground from './playground';

export const metadata: Metadata = {
  title: {
    absolute: `${siteName} — ${siteTagline}`,
  },
  description: siteDescription,
  alternates: { canonical: '/' },
  openGraph: {
    title: `${siteName} — ${siteTagline}`,
    description: siteDescription,
    url: '/',
    type: 'website',
  },
  twitter: {
    title: `${siteName} — ${siteTagline}`,
    description: siteDescription,
  },
};

export const dynamic = 'force-static';

const here = dirname(fileURLToPath(import.meta.url));
const defaultSourcePath = resolve(here, '../../../examples/full.bro');

export default async function Page() {
  const defaultSource = await readFile(defaultSourcePath, 'utf8');
  return (
    <>
      <JsonLd
        id="ld-page-home"
        data={webPageLd({
          name: `${siteName} — ${siteTagline}`,
          description: siteDescription,
          path: '/',
        })}
      />
      <h1
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {siteName} — {siteTagline}. {siteShortDescription}
      </h1>
      <Playground defaultSource={defaultSource} />
    </>
  );
}
