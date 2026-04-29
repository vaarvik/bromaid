import { defineConfig, type Options } from 'tsup';

export const baseConfig: Options = {
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  target: 'es2022',
  outExtension({ format }) {
    return { js: format === 'esm' ? '.js' : '.cjs' };
  },
};

export default defineConfig(baseConfig);
