import { FlatCompat } from '@eslint/eslintrc';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  {
    ignores: [
      'node_modules/',
      '.next/',
      'out/',
      'build/',
      'dist/',
      '*.config.js',
      '*.config.ts',
      '.eslintrc.js',
    ],
  },
  ...compat.extends('next/core-web-vitals'),
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      '@next/next/no-page-custom-font': 'warn',
    },
  },
];
