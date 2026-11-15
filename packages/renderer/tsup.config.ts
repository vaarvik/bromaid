import { defineConfig } from 'tsup';
import { baseConfig } from '../../tsup.config.base';

export default defineConfig([
  { ...baseConfig, entry: { index: 'src/index.ts', client: 'src/client/index.ts' } },
  {
    ...baseConfig,
    clean: false,
    entry: { react: 'src/react/index.ts' },
    external: ['react', '@bromaid/renderer/client'],
    treeshake: false,
    // Next.js App Router: the wrapper is a client component.
    banner: { js: "'use client';" },
  },
]);
