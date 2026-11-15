import { defineConfig } from 'tsup';
import { baseConfig } from '../../tsup.config.base';

export default defineConfig({
  ...baseConfig,
  entry: { index: 'src/index.ts', graph: 'src/graph/index.ts' },
});
