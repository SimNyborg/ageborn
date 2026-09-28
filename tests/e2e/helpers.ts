/**
 * Shared helpers for the Playwright specs (DESIGN B13 E2E).
 *
 * `FLOWS` lists the B13 end-to-end flows with the packages they need. A flow whose packages are still
 * being built is skipped with that reason; the integration pass that wires a flow flips `ready`
 * (Phase 2b: capsule, reload, Home, Skirmish). `E2E_ALL=1` runs every flow anyway, to see how far a
 * pending flow gets.
 */
import { test, type Page } from '@playwright/test';

export type FlowId = 'boot' | 'determinism' | 'autopilot' | 'quickBattle' | 'gallery' | 'capsule' | 'reload' | 'home' | 'skirmish';

export const FLOWS: Record<FlowId, { ready: boolean; needs: string }> = {
  boot: { ready: true, needs: 'the app shell (WP0, WP11)' },
  determinism: { ready: true, needs: 'the sim (WP2) and the golden replays on the fixture content (WP0, WP2)' },
  autopilot: { ready: true, needs: 'the tutorial autopilot and dev fast-forward (WP11) on the real sim (WP2)' },
  quickBattle: { ready: true, needs: 'the Quick Battle dev route `?quick=short` (WP11, C3 Checkpoint A)' },
  gallery: { ready: true, needs: 'the art gallery checks on `window.__galleryInfo` (WP4)' },
  capsule: { ready: true, needs: 'capsule grants and opening wired after match 1 (WP7 meta, WP8 save, WP10 show; Phase 2b)' },
  reload: { ready: true, needs: 'the localStorage save store (WP8) wired into boot (WP11; Phase 2b)' },
  home: { ready: true, needs: 'the Home screen (WP9) on the app router after onboarding (WP11; Phase 2b)' },
  skirmish: { ready: true, needs: 'the mode select and Skirmish setup (WP9) wired to a battle (WP11; Phase 2b)' },
};

/** Whether a flow runs: it is ready, or `E2E_ALL=1` asks for every flow. */
export function flowEnabled(id: FlowId): boolean {
  return FLOWS[id].ready || process.env['E2E_ALL'] === '1';
}

/** Skips the current test unless its flow is ready (or `E2E_ALL=1`). */
export function requireFlow(id: FlowId): void {
  test.skip(!flowEnabled(id), `pending until wired: ${FLOWS[id].needs}`);
}

export interface PageProblems {
  /** Console errors and uncaught exceptions. */
  errors: string[];
  /** Same-origin requests that failed or returned 4xx/5xx. */
  failed: string[];
}

/** Collects console errors, page errors and failed same-origin requests from now on. */
export function watchPage(page: Page): PageProblems {
  const p: PageProblems = { errors: [], failed: [] };
  const origin = (): string => new URL(page.url() === 'about:blank' ? 'http://localhost/' : page.url()).origin;
  page.on('console', (m) => {
    if (m.type() === 'error') p.errors.push(`console: ${m.text()}`);
  });
  page.on('pageerror', (e) => p.errors.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => {
    if (r.url().startsWith(origin())) p.failed.push(`${r.url()} (${r.failure()?.errorText ?? 'failed'})`);
  });
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().startsWith(origin())) p.failed.push(`${r.url()} (${r.status()})`);
  });
  return p;
}

/** The dev hooks main.tsx exposes with `?dev=1` (B13 dev fast-forward). */
export interface AgebornDev {
  fastForward(ticks: number): number;
}

/** Runs the battle on screen forward by up to `ticks` sim ticks; returns the ticks actually run. */
export function fastForward(page: Page, ticks: number): Promise<number> {
  return page.evaluate((n) => {
    const dev = (window as unknown as { __agebornDev?: AgebornDev }).__agebornDev;
    return dev ? dev.fastForward(n) : -1;
  }, ticks);
}

/**
 * Opens the game with a profile that is past onboarding (step 4, 3 matches played), so the start
 * screen is Home (WP9) and War Plan and Skirmish are open. Uses the `?dev=1&game=1` controller hook.
 */
export async function pastOnboarding(page: Page): Promise<void> {
  await page.goto('./?dev=1&game=1');
  await page.waitForFunction(() => (window as unknown as { __agebornDev?: unknown }).__agebornDev !== undefined, null, { timeout: 30_000 });
  await page.evaluate(() => {
    type Save = { tutorial: { step: number }; matchesPlayed: number };
    const c = (window as unknown as { __agebornDev: { controller: { save: { peek(): Save }; setSave(s: Save, o?: object): void; showTitle(): void } } })
      .__agebornDev.controller;
    const s = c.save.peek();
    c.setSave({ ...s, tutorial: { ...s.tutorial, step: 4 }, matchesPlayed: Math.max(3, s.matchesPlayed) }, { immediate: true });
    c.showTitle();
  });
}
