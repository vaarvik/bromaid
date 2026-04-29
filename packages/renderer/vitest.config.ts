import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'renderer',
    include: ['test/**/*.test.ts'],
    globals: false,
  },
});
