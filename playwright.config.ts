import { existsSync } from 'node:fs';
import { defineConfig, devices, firefox } from '@playwright/test';

/**
 * E2E smoke tests (DESIGN B13) against the production build served by `vite preview`.
 * Chromium comes from PLAYWRIGHT_BROWSERS_PATH; set PW_CHROMIUM_PATH to use a specific binary.
 */
const chromiumPath = process.env['PW_CHROMIUM_PATH'];
const port = 4173;

/**
 * True when Playwright's Firefox is installed. CI installs only Chromium and WebKit
 * (`.github/workflows/ci.yml`), so a Firefox project there failed every run with "Executable doesn't
 * exist" (red since 2026-10-03); it now runs only where the browser is present.
 */
function firefoxInstalled(): boolean {
  try {
    const p = firefox.executablePath();
    return p !== '' && existsSync(p);
  } catch {
    return false;
  }
}
const wantFirefox = process.env['CI'] !== undefined || process.env['PW_FIREFOX'] === '1';

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: process.env['CI'] !== undefined,
  retries: process.env['CI'] !== undefined ? 1 : 0,
  // CI: the GitHub annotations, the HTML report (with the failed tests' traces; the uploaded artifact) and a
  // JSON report the job's last step prints one line per failure from (`tools/e2eSummary.ts`).
  reporter:
    process.env['CI'] !== undefined
      ? [['github'], ['html', { open: 'never' }], ['json', { outputFile: 'test-results/e2e-results.json' }]]
      : 'list',
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
    // WebKit runs in CI (B13, C4.3: determinism across engines) and locally with PW_WEBKIT=1. G3
    // (2026-10-09): the whole suite at device scale 1, since CI's WebKit draws WebGL in software and at
    // the Desktop Safari profile's 2 every canvas costs four times the pixels (each test ran 2.2 times as
    // long as in Chromium, and the staged screens missed their waits); the boot and the B13 flows again
    // as an iPhone in landscape (scale 3, touch, `isMobile`) at the 844 x 340 the game lays out for, its
    // `viewport-fit=cover` page using the whole width. The memory budget sets scale 2 itself in every project.
    ...(process.env['CI'] !== undefined || process.env['PW_WEBKIT'] === '1'
      ? [
          { name: 'webkit', use: { ...devices['Desktop Safari'], deviceScaleFactor: 1 } },
          { name: 'webkit-phone', testMatch: ['**/boot.spec.ts', '**/flows.spec.ts'], use: { ...devices['iPhone 14 landscape'], viewport: { width: 844, height: 340 } } },
        ]
      : []),
    // Online M1 (DESIGN A18.10): the golden replays also re-simulate in Firefox (SpiderMonkey), so the
    // sim is proven identical on all three engines. Only the determinism spec; locally with PW_FIREFOX=1,
    // and only where Firefox is installed (`npx playwright install firefox`); without it the project is
    // left out, so the run stays clean.
    ...(wantFirefox && firefoxInstalled() ? [{ name: 'firefox', testMatch: '**/determinism.spec.ts', use: { ...devices['Desktop Firefox'] } }] : []),
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${port} --strictPort`,
    url: `http://localhost:${port}/ageborn/`,
    reuseExistingServer: process.env['CI'] === undefined,
    timeout: 180_000,
  },
});
