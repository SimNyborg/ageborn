/**
 * G7 (Safari memory, 2026-10-08): iOS ends a Safari tab at about 1-2 GB, and the HD unit sheets were
 * most of the game's memory (a fast-forwarded Standard War at DPR 2 held 2.5 GB of decoded images).
 * Unit sheets now load per match (both decks, the next age ahead of an evolve) and unload once nothing
 * draws them, and each sheet's decoded CPU copy is released once it is on the GPU.
 *
 * The budget runs at deviceScaleFactor 2, where the HD sheets load (as on every phone), and reads the
 * `?dev=1` hook `window.__agebornDev.memory()` (`visuals/textureMemory.ts`: textures on the GPU plus the
 * decoded copies still on the CPU side). The opening plays at real speed, where no unit may appear
 * without its art (the battle's clock waits for the decks' sheets); the rest is fast-forwarded in steps.
 *
 * The card showcase draws on its own WebGL app, which can only upload from a sheet's decoded copy: after
 * the onboarding's two battles at DPR 2 the forced upgrade's stage drew no Bonker (2026-10-09, its sheet's
 * copy was released), so the second test plays them and checks that nothing uploads a closed bitmap.
 */
import { expect, test, type Page } from '@playwright/test';
import { fastForward, watchPage, type AgebornDev } from './helpers';

/** Decoded image memory a whole Standard War may hold at its peak (MB; 2,484 before G7, about 540 after). */
const BUDGET_MB = 600;

interface Mem {
  total: number;
  cpu: number;
  gpu: number;
  sheets: { loaded: number } | null;
  fallbacks: { units: number; last: string } | null;
}

interface Step {
  /** Both sides' age index, the match phase and the units on the field; null once the battle has left. */
  battle: { ages: number[]; phase: string; units: number } | null;
  mem: Mem;
}

/** Runs the battle on screen `ticks` sim ticks ahead (0: none) and reads its state and the memory, in one round trip. */
const step = (page: Page, ticks: number): Promise<Step> =>
  page.evaluate(async (n) => {
    type St = { sides: { ageIndex: number }[]; phase: string; units: unknown[] };
    type Dev = AgebornDev & { memory(): Mem; controller: { route: { peek(): { id: string; battle?: { session: { sim: { state: St } } } } } } };
    const dev = (window as unknown as { __agebornDev: Dev }).__agebornDev;
    if (n > 0) await dev.fastForward(n);
    const r = dev.controller.route.peek();
    const st = r.id === 'battle' && r.battle ? r.battle.session.sim.state : null;
    return { battle: st ? { ages: st.sides.map((s) => s.ageIndex), phase: st.phase, units: st.units.length } : null, mem: dev.memory() };
  }, ticks);

test.use({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });

test('G7: a long Standard War at DPR 2 keeps decoded images under the budget, and no unit appears without its art', async ({ page }) => {
  // about 2 minutes in Chromium; a software-rendered WebKit in CI draws a frame every few hundred ms
  test.setTimeout(480_000);
  const problems = watchPage(page);
  await page.goto('./?dev=1&autopilot=1&quick=standard');
  await expect(page.getByTestId('battle')).toBeVisible({ timeout: 60_000 });
  // The opening at real speed: the troops both sides train first draw from their sheets (a slow
  // software-rendered engine plays a few game seconds a minute, hence the long wait).
  await expect.poll(async () => (await step(page, 0)).battle?.units ?? 0, { timeout: 120_000, intervals: [250] }).toBeGreaterThanOrEqual(2);
  expect((await step(page, 0)).mem.fallbacks).toEqual({ units: 0, last: '' });
  // The rest fast-forwarded, five seconds of play a step; the sheets load, upload and unload in between.
  let peak: Mem | null = null;
  let top = 0;
  for (let i = 0; i < 400; i++) {
    const s = await step(page, 100);
    if (!s.battle) break;
    top = Math.max(top, ...s.battle.ages);
    if (!peak || s.mem.total > peak.total) peak = s.mem;
    if (s.battle.phase === 'ended') break;
    await page.waitForTimeout(200);
  }
  const mb = (n: number): number => Math.round(n / 1e6);
  const note = `peak ${mb(peak?.total ?? 0)} MB (cpu ${mb(peak?.cpu ?? 0)}, gpu ${mb(peak?.gpu ?? 0)}), ${peak?.sheets?.loaded ?? 0} unit sheets, last age index ${top}`;
  test.info().annotations.push({ type: 'memory', description: note });
  console.log(`[memory] ${test.info().project.name}: ${note}`);
  // the match went through several evolves (Gunpowder or later), so the budget covers them
  expect(top).toBeGreaterThanOrEqual(3);
  expect(mb(peak?.total ?? Infinity)).toBeLessThanOrEqual(BUDGET_MB);
  expect(problems.errors).toEqual([]);
});

/** Records every WebGL upload from a closed ImageBitmap (it draws nothing; WebKit logs it as an error, Chromium as a warning). */
function watchClosedUploads(): void {
  const w = window as unknown as { __closedUploads: string[] };
  w.__closedUploads = [];
  for (const proto of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
    const p = proto as unknown as Record<string, (...a: unknown[]) => unknown>;
    for (const name of ['texImage2D', 'texSubImage2D']) {
      const orig = p[name]!;
      p[name] = function (this: unknown, ...a: unknown[]) {
        const src = a[a.length - 1];
        if (typeof ImageBitmap !== 'undefined' && src instanceof ImageBitmap && src.width === 0) w.__closedUploads.push(name);
        return orig.apply(this, a);
      };
    }
  }
}

/** Skips through a capsule show to its summary, then closes it. Skip leaves with the summary, so the clicks are forced and bounded (as in the onboarding). */
async function throughCapsule(page: Page): Promise<void> {
  await expect(page.getByTestId('capsule-screen')).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(
      async () => {
        const skip = page.getByTestId('capsule-skip');
        if (await skip.isVisible()) await skip.click({ force: true, timeout: 10_000 }).catch(() => undefined);
        return page.getByTestId('capsule-summary').isVisible();
      },
      { timeout: 120_000, intervals: [300] },
    )
    .toBe(true);
  await page.getByTestId('capsule-done').click();
}

test("G7: after the onboarding's two battles at DPR 2 the forced upgrade's stage (its own WebGL app) draws from a live copy", async ({ page }) => {
  // two fast-forwarded battles and two capsules: about a minute in Chromium, several in CI's WebKit
  test.setTimeout(480_000);
  await page.addInitScript(watchClosedUploads);
  const problems = watchPage(page);
  await page.goto('./?dev=1&autopilot=1');
  for (const match of [1, 2]) {
    await expect(page.getByTestId('battle')).toBeVisible({ timeout: 60_000 });
    await expect
      .poll(
        async () => {
          await fastForward(page, 2_000);
          return page.getByTestId('result').isVisible();
        },
        { timeout: 180_000, intervals: [250] },
      )
      .toBe(true);
    await page.getByTestId('next').click();
    await throughCapsule(page);
    if (match === 1) {
      await page.getByTestId('make-general-done').click({ timeout: 30_000 });
      await page.getByTestId('play').click({ timeout: 30_000 });
    }
  }
  // the forced upgrade's card stage leases the Bonker sheet both battles drew (and released to the GPU)
  await expect(page.getByTestId('first-upgrade-stage')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('showcase-canvas')).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(2_000);
  expect(await page.evaluate(() => (window as unknown as { __closedUploads: string[] }).__closedUploads)).toEqual([]);
  expect(problems.errors).toEqual([]);
});
