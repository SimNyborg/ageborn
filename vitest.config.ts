import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

/** Unit, integrity and benchmark tests run in Node. Playwright specs (tests/e2e) are excluded. */
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}', 'tools/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**', 'tests/e2e/**'],
    benchmark: {
      include: ['src/**/*.bench.ts', 'tests/**/*.bench.ts'],
      exclude: ['node_modules/**', 'tests/e2e/**'],
    },
  },
});
