import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Unit tests only. The end-to-end suite runs under Playwright, which owns
    // its own server lifecycle — see playwright.config.ts.
    include: ['src/**/*.test.ts'],
    exclude: ['e2e/**'],
    env: { LOG_LEVEL: 'silent' },
  },
});
