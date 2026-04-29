import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'layout',
    include: ['test/**/*.test.ts'],
    globals: false,
  },
});
