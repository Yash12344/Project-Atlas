import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // These are integration tests against a real PostgreSQL instance. They run
    // serially because they assert on row visibility and would otherwise race.
    fileParallelism: false,
    sequence: { concurrent: false },
    env: { NODE_ENV: 'test' },
    include: ['src/**/*.test.ts'],
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
