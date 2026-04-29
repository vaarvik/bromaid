import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.next/**',
      '**/coverage/**',
      'examples/next-app-smoke/**',
    ],
  },
  {
    files: ['packages/*/src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // Per repo policy: no `any` / `unknown` in public types.
      // We allow `unknown` only at trust boundaries (tokenizer / elk).
      '@typescript-eslint/no-explicit-any': 'error',

      // Phase-1 packages must run in React Server Components.
      // Forbid top-level DOM globals so we don't accidentally regress that.
      'no-restricted-globals': [
        'error',
        {
          name: 'window',
          message: 'Phase-1 packages must run in RSC; do not reference `window`.',
        },
        {
          name: 'document',
          message: 'Phase-1 packages must run in RSC; do not reference `document`.',
        },
        {
          name: 'navigator',
          message: 'Phase-1 packages must run in RSC; do not reference `navigator`.',
        },
      ],
    },
  },
];
