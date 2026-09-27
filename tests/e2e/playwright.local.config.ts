/**
 * Local Playwright config for running the e2e specs next to other work in the same checkout
 * (the root `playwright.config.ts` is what CI and `npm run test:e2e` use):
 *
 *   npx playwright test -c tests/e2e/playwright.local.config.ts
 *
 * It builds into `node_modules/.cache/ageborn-e2e` (so `dist/` is left alone) and previews on port
 * 5212, or tests an already running server when `E2E_BASE_URL` is set (it must end in `/ageborn/`).
 */
import path from 'node:path';
import { defineConfig } from '@playwright/test';
import base from '../../playwright.config';

const port = Number(process.env['E2E_PORT'] ?? 5212);
const external = process.env['E2E_BASE_URL'];
const root = path.resolve(import.meta.dirname, '../..');
const outDir = path.join(root, 'node_modules', '.cache', 'ageborn-e2e');
const baseURL = external ?? `http://localhost:${port}/ageborn/`;

export default defineConfig({
  ...base,
  testDir: '.',
  use: { ...base.use, baseURL },
  ...(external
    ? { webServer: undefined }
    : {
        webServer: {
          command: `npx vite build --outDir "${outDir}" --emptyOutDir && npx vite preview --outDir "${outDir}" --port ${port} --strictPort`,
          cwd: root,
          url: baseURL,
          reuseExistingServer: false,
          timeout: 180_000,
        },
      }),
});
