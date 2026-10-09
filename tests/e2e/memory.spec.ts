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
 */
import { expect, test, type Page } from '@playwright/test';
import { watchPage, type AgebornDev } from './helpers';

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
  // The opening at real speed: the troops both sides train first draw from their sheets.
  await expect.poll(async () => (await step(page, 0)).battle?.units ?? 0, { timeout: 60_000, intervals: [250] }).toBeGreaterThanOrEqual(4);
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
