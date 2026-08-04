import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run against a production build, not the dev server.
 *
 * Dev mode differs from production in ways that hide real bugs — different
 * bundling, no static optimisation, looser error handling — so a smoke test
 * that only passes under `next dev` proves less than it appears to.
 */
const chromiumPath = process.env['PLAYWRIGHT_CHROMIUM_PATH'];

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: process.env['CI'] === 'true',
  retries: 0,
  reporter: process.env['CI'] === 'true' ? 'list' : 'line',
  timeout: 60_000,
  use: {
    baseURL: process.env['E2E_BASE_URL'] ?? 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Spread conditionally: under exactOptionalPropertyTypes an explicit
        // `undefined` is not the same as an absent key, and Playwright's
        // LaunchOptions declares executablePath as optional-but-not-undefined.
        ...(chromiumPath === undefined ? {} : { launchOptions: { executablePath: chromiumPath } }),
      },
    },
  ],
  webServer: {
    command: 'pnpm exec next start -p 3100',
    url: 'http://127.0.0.1:3100/api/health',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
