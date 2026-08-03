import { baseConfig } from './base.js';

/** @type {import("typescript-eslint").ConfigArray} */
export const libraryConfig = [
  ...baseConfig,
  {
    rules: {
      // A library's public surface is a contract; make it explicit.
      '@typescript-eslint/explicit-module-boundary-types': 'error',
    },
  },
];

export default libraryConfig;
