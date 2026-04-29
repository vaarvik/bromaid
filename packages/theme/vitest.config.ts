import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'theme',
    include: ['test/**/*.test.ts'],
    globals: false,
  },
});
