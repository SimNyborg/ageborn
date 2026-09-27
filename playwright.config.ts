import { defineConfig, devices } from '@playwright/test';

/**
 * E2E smoke tests (DESIGN B13) against the production build served by `vite preview`.
 * Chromium comes from PLAYWRIGHT_BROWSERS_PATH; set PW_CHROMIUM_PATH to use a specific binary.
 */
const chromiumPath = process.env['PW_CHROMIUM_PATH'];
const port = 4173;

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: process.env['CI'] !== undefined,
  retries: process.env['CI'] !== undefined ? 1 : 0,
  reporter: process.env['CI'] !== undefined ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${port}/ageborn/`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: chromiumPath !== undefined && chromiumPath !== '' ? { executablePath: chromiumPath } : {},
      },
    },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${port} --strictPort`,
    url: `http://localhost:${port}/ageborn/`,
    reuseExistingServer: process.env['CI'] === undefined,
    timeout: 180_000,
  },
});
