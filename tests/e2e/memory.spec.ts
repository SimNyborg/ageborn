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
import { fastForward, pastOnboarding, watchPage, type AgebornDev } from './helpers';

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

const mb = (n: number): number => Math.round(n / 1e6);

/**
 * Plays the Standard War on screen and returns its memory peak: the opening at real speed (no unit may
 * appear without its art), the rest fast-forwarded five seconds of play a step while the sheets load,
 * upload and unload in between. Checks the budget, the evolves it covered and the page's errors.
 */
async function warPeak(page: Page, problems: { errors: string[] }, label: string): Promise<void> {
  await expect(page.getByTestId('battle')).toBeVisible({ timeout: 60_000 });
  // The opening at real speed: the troops both sides train first draw from their sheets (a slow
  // software-rendered engine plays a few game seconds a minute, hence the long wait).
  await expect.poll(async () => (await step(page, 0)).battle?.units ?? 0, { timeout: 120_000, intervals: [250] }).toBeGreaterThanOrEqual(2);
  expect((await step(page, 0)).mem.fallbacks).toEqual({ units: 0, last: '' });
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
  const note = `${label}: peak ${mb(peak?.total ?? 0)} MB (cpu ${mb(peak?.cpu ?? 0)}, gpu ${mb(peak?.gpu ?? 0)}), ${peak?.sheets?.loaded ?? 0} unit sheets, last age index ${top}`;
  test.info().annotations.push({ type: 'memory', description: note });
  console.log(`[memory] ${test.info().project.name}: ${note}`);
  // the match went through several evolves (Gunpowder or later), so the budget covers them
  expect(top).toBeGreaterThanOrEqual(3);
  expect(mb(peak?.total ?? Infinity)).toBeLessThanOrEqual(BUDGET_MB);
  expect(problems.errors).toEqual([]);
}

test('G7: a long Standard War at DPR 2 keeps decoded images under the budget, and no unit appears without its art', async ({ page }) => {
  // about 2 minutes in Chromium; a software-rendered WebKit in CI draws a frame every few hundred ms
  test.setTimeout(480_000);
  const problems = watchPage(page);
  await page.goto('./?dev=1&autopilot=1&quick=standard');
  await warPeak(page, problems, 'Standard War');
});

const AGES = ['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern', 'future', 'cosmic'] as const;

test('review 2: Customize browsed through every age (Bases and Backdrops, every scene and skin owned), then a Standard War, stays under the budget', async ({ page }) => {
  // Customize kept every age's scene strips, grounds and model sheets decoded for the session: 926 MB at
  // the war's peak before the match start let go of them (budget 600). About 3 minutes in Chromium.
  test.setTimeout(600_000);
  const problems = watchPage(page);
  await pastOnboarding(page);
  await expect(page.getByTestId('play').first()).toBeVisible({ timeout: 60_000 });
  // every released scene and base skin owned (a new player's decks, so the war is the first test's)
  await page.evaluate(() => {
    type Item = { collection: string; id: string; released?: boolean };
    type Save = { cosmetics: { owned: string[] } };
    const c = (window as unknown as { __agebornDev: { controller: { save: { peek(): Save }; setSave(s: Save, o?: object): void; services: { content: { cosmetics: { collections: { items: Item[] } } } } } } }).__agebornDev.controller;
    const s = c.save.peek();
    const keys = c.services.content.cosmetics.collections.items.filter((x) => x.released !== false && (x.collection === 'scene' || x.collection === 'baseSkin')).map((x) => `${x.collection}.${x.id}`);
    c.setSave({ ...s, cosmetics: { ...s.cosmetics, owned: [...new Set([...s.cosmetics.owned, ...keys])] } }, { immediate: true });
  });
  // the autopilot plays your side of the war (a boot flag)
  await page.goto('./?dev=1&autopilot=1');
  await expect(page.getByTestId('play').first()).toBeVisible({ timeout: 60_000 });
  await page.getByTestId('tab-customize').first().click();
  // each age's preview stage goes live (the diorama leases the age's base, turrets, scene and ground)
  const live = (testid: string, age: string) =>
    expect.poll(async () => page.evaluate(([t, a]) => document.querySelector(`[data-testid="${t}"][data-age="${a}"][data-live="true"]`) !== null, [testid, age] as const), { timeout: 45_000, intervals: [250] }).toBe(true);
  await page.getByTestId('tab-bases').first().click();
  for (const age of AGES) {
    await page.getByTestId(`age-tab-${age}`).first().click();
    const tiles = page.locator('[data-testid="cust-base-skins"] [data-testid^="item-"]');
    await expect(tiles.first()).toBeVisible({ timeout: 30_000 });
    await tiles.last().click();
    await live('base-stage', age);
  }
  await page.getByTestId('tab-backdrops').first().click();
  for (const age of AGES) {
    await page.getByTestId(`age-tab-${age}`).first().click();
    await expect(page.getByTestId('scene-classic')).toBeVisible({ timeout: 30_000 });
    // the age's new scene where one is out (two wait for round 3), else its classic scene
    const scenes = page.locator('[data-testid="scene-grid"] [data-testid^="item-scene."]');
    await ((await scenes.count()) > 0 ? scenes.first() : page.getByTestId('scene-classic')).click();
    await live('backdrop-mock', age);
  }
  await page.getByTestId('tab-battle').first().click();
  await expect(page.getByTestId('play').first()).toBeVisible({ timeout: 30_000 });
  await page.evaluate(() => (window as unknown as { __agebornDev: { controller: { quickBattle(f: string): unknown } } }).__agebornDev.controller.quickBattle('standard'));
  await warPeak(page, problems, 'Customize, then a Standard War');
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
