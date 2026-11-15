import { defineConfig } from 'tsup';
import { baseConfig } from '../../tsup.config.base';

export default defineConfig([
  { ...baseConfig, entry: { index: 'src/index.ts', client: 'src/client.ts' } },
  {
    ...baseConfig,
    clean: false,
    treeshake: false,
    entry: { react: 'src/react.ts' },
    banner: { js: "'use client';" },
  },
]);
