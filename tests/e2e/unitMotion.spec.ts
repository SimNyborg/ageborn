/**
 * Unit motion in a real match (ANIM_SPEC 2026-10-02, Stone pilot review B1): units the sim spawns
 * through real `unitSpawned` events (both sides played by bots, no dev spawns) must walk while they
 * move. Before the fix every spawned unit held the idle fallback of its missing `spawn` clip as a
 * looping one-shot, so 90% of moving unit-frames glided across the lane in the guard pose.
 */
import { expect as baseExpect, test } from '@playwright/test';
import { watchPage } from './helpers';

/** Software WebGL renders a few frames per second, so every check gets more time. */
const expect = baseExpect.configure({ timeout: 30_000 });

interface Sample {
  id: number;
  x: number;
  track: string | null;
}

test('spawned units walk while they move (real unitSpawned events, bot vs bot)', async ({ page }) => {
  test.setTimeout(240_000);
  const problems = watchPage(page);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('./?dev=1&stage=1&source=real&art=procedural&format=short&opponent=ai&autoplay=1&speed=2#sandbox');
  await page.waitForFunction(() => !!(window as unknown as { __sandbox?: unknown }).__sandbox, null, { timeout: 90_000 });
  await page.evaluate(async () => {
    const a = (window as unknown as { __sandbox: { view: { art: { atlas?: { unitSheetsReady?(ages: string[]): Promise<void> } } } } }).__sandbox.view.art;
    await a.atlas?.unitSheetsReady?.(['stone']);
  });
  const shown: Record<string, number> = {};
  let prev = new Map<number, number>();
  let moving = 0;
  for (let i = 0; i < 160 && moving < 120; i++) {
    await page.waitForTimeout(250);
    const now: Sample[] = await page.evaluate(() => {
      type V = { action?: { anim: string } | null; base?: { anim: string } | null; dead?: boolean };
      const s = (window as unknown as { __sandbox: { view: { units: Map<number, { view: V; dying: boolean }>; sim: { state: { units: { id: number; x: number }[] } } } } }).__sandbox;
      const out: Sample[] = [];
      for (const u of s.view.sim.state.units) {
        const e = s.view.units.get(u.id);
        if (!e || e.dying || e.view.dead) continue;
        const tr = e.view.action ?? e.view.base;
        out.push({ id: u.id, x: u.x / 1000, track: tr ? tr.anim : null });
      }
      return out;
    });
    const next = new Map<number, number>();
    for (const u of now) {
      next.set(u.id, u.x);
      const p = prev.get(u.id);
      if (p === undefined || Math.abs(u.x - p) < 4) continue;
      moving++;
      const k = u.track ?? 'none';
      shown[k] = (shown[k] ?? 0) + 1;
    }
    prev = next;
  }
  expect(moving, 'units moved during the sample').toBeGreaterThan(30);
  // walking units show the walk; a few frames of attack follow-through or a hit are fine
  expect((shown['walk'] ?? 0) / moving, JSON.stringify(shown)).toBeGreaterThan(0.75);
  expect(problems.errors).toEqual([]);
});
