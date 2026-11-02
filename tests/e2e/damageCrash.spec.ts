/**
 * W0 WebKit-crash bisection (temporary, test-only, 2026-11-02; remove once settled). CI's WebKit loses its page ("Target
 * crashed") in memory.spec's long wars from the damage merge on (never on 09c779b, ceea025 or 49904ba), with 6-10 GB of
 * the runner's memory still free. Here the two crash-prone wars run three times for each configuration of the damage
 * runtime's dev switches (`?dev=1&dmgoff=...`, `src/visuals/damage/switches.ts`): the full runtime, all of it off, then
 * one part off at a time (strips, emitters, the kit's pages and marks, bursts, the tint and weary motion).
 *
 * - Round 3: the test profile (every card owned) plays a Standard War against Legendary at DPR 2.
 * - Review 2: Customize through every age (every scene and base skin owned), then a Standard War at DPR 2.
 *
 * Every run prints one `[crashcfg]` line (the configuration, the war, the run, the switches the page reports, and how
 * it ended: `ok` with the tick reached, or `CRASHED` with where), plus a `[war]` line every 2,000 ticks. WebKit only;
 * no retries (a crash is the result here, not a flake); a lost page fails its test, so the next run gets a fresh
 * browser. A war is fast-forwarded from its start and stops at tick 8,000 (every crash seen so far came by tick 7,780):
 * about 7 minutes a war on CI's runner, 10 with review 2's Customize, so the 42 runs add about 3 hours to the e2e job
 * on its two workers. `CONFIGS`, `RUNS` and `TICK_CAP` below are the knobs to trim it.
 */
import fs from 'node:fs';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { pastOnboarding, type AgebornDev } from './helpers';

const CONFIGS = ['full', 'all', 'strips', 'emitters', 'marks', 'bursts', 'tint'] as const;
type Config = (typeof CONFIGS)[number];
const RUNS = [1, 2, 3];
/** Where a war stops (env `DMG_CRASH_TICKS`: a shorter local check of the spec itself). */
const TICK_CAP = Number(process.env['DMG_CRASH_TICKS'] ?? 8000);
/** WebKit only, unless `DMG_CRASH_ANY=1` (a local check of the spec in Chromium). */
const engineOk = (name: string): boolean => name === 'webkit' || process.env['DMG_CRASH_ANY'] === '1';
const AGES = ['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern', 'future', 'cosmic'] as const;

test.describe.configure({ retries: 0 });
test.use({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });

/** The URL parameters of a configuration. */
const query = (cfg: Config): string => (cfg === 'full' ? '' : `&dmgoff=${cfg}`);

interface Step {
  battle: { ages: number[]; phase: string; units: number; tick: number } | null;
  mb: number;
}

/** Runs the battle on screen `ticks` ahead (0: none) and reads where it is and the decoded memory, in one round trip. */
const step = (page: Page, ticks: number): Promise<Step> =>
  page.evaluate(async (n) => {
    type St = { sides: { ageIndex: number }[]; phase: string; units: unknown[]; tick: number };
    type Dev = AgebornDev & { memory(): { total: number }; controller: { route: { peek(): { id: string; battle?: { session: { sim: { state: St } } } } } } };
    const dev = (window as unknown as { __agebornDev: Dev }).__agebornDev;
    if (n > 0) await dev.fastForward(n);
    const r = dev.controller.route.peek();
    const st = r.id === 'battle' && r.battle ? r.battle.session.sim.state : null;
    return { battle: st ? { ages: st.sides.map((s) => s.ageIndex), phase: st.phase, units: st.units.length, tick: st.tick } : null, mb: Math.round(dev.memory().total / 1e6) };
  }, ticks);

const where = (s: Step | null): string => (s?.battle ? `tick ${s.battle.tick}, ages ${s.battle.ages.join('/')}, ${s.battle.units} units, ${s.mb} MB` : 'before the war');

/**
 * The machine's free memory and its four biggest processes by resident memory (/proc; memory.spec's name filter found no
 * WebKit process on CI's runner, so here the names come with the sizes).
 */
function procMemory(): string {
  try {
    const rows: { comm: string; pid: string; mb: number }[] = [];
    for (const pid of fs.readdirSync('/proc').filter((d) => /^\d+$/.test(d))) {
      try {
        const st = fs.readFileSync(`/proc/${pid}/status`, 'utf8');
        const mb = Number(/VmRSS:\s+(\d+)/.exec(st)?.[1] ?? 0) / 1024;
        if (mb > 100) rows.push({ comm: /Name:\s+(.*)/.exec(st)?.[1]?.trim() ?? '?', pid, mb });
      } catch {
        // a process that went away meanwhile, or a kernel thread
      }
    }
    rows.sort((a, b) => b.mb - a.mb);
    const avail = Number(/MemAvailable:\s+(\d+)/.exec(fs.readFileSync('/proc/meminfo', 'utf8'))?.[1] ?? 0) / 1024;
    return `free ${Math.round(avail)} MB; ${rows.slice(0, 4).map((r) => `${r.comm}:${r.pid}=${Math.round(r.mb)}`).join(' ')}`;
  } catch {
    return 'no /proc';
  }
}

/** One run's bookkeeping: what the page reported, how far the war got, whether the page was lost. */
interface Run {
  cfg: Config;
  war: string;
  run: number;
  off: string;
  seen: Step | null;
  crashed: boolean;
  closed: boolean;
  t0: number;
}

function watchLoss(page: Page, r: Run): void {
  page.on('crash', () => (r.crashed = true));
  page.on('close', () => (r.closed = true));
}

/** The switches the page is running with (checked against the configuration: a typo would test nothing). */
async function checkSwitches(page: Page, r: Run): Promise<void> {
  await page.waitForFunction(() => (window as unknown as { __agebornDev?: unknown }).__agebornDev !== undefined, null, { timeout: 60_000 });
  const off = await page.evaluate(() => (window as unknown as { __agebornDev: { damageOff?: () => string[] } }).__agebornDev.damageOff?.() ?? ['(no hook)']);
  r.off = off.length ? off.join(',') : 'none';
  expect(off).toEqual(r.cfg === 'full' ? [] : [r.cfg]);
}

/** Plays the war on screen 100 ticks a step (no real-speed opening: only a crash counts here) to its end or `TICK_CAP`. */
async function playWar(page: Page, r: Run): Promise<void> {
  await expect(page.getByTestId('battle')).toBeVisible({ timeout: 60_000 });
  let logged = 0;
  for (let i = 0; i < 400; i++) {
    const s = await step(page, 100);
    if (!s.battle) break;
    r.seen = s;
    if (s.battle.tick >= logged) {
      console.log(`[war] ${r.cfg} | ${r.war} | run ${r.run}: ${where(s)}; ${procMemory()}`);
      logged += 2000;
    }
    if (s.battle.phase === 'ended' || s.battle.tick >= TICK_CAP) break;
    await page.waitForTimeout(200);
  }
}

/** Runs one case and prints its `[crashcfg]` line; a lost page (or any other failure) fails the test after it. */
async function runCase(r: Run, body: () => Promise<void>): Promise<void> {
  test.setTimeout(1_200_000);
  const secs = (): number => Math.round((Date.now() - r.t0) / 1000);
  try {
    await body();
    console.log(`[crashcfg] ${r.cfg} | ${r.war} | run ${r.run} | off ${r.off}: ok, ${where(r.seen)} (${secs()} s)`);
  } catch (e) {
    const msg = (e instanceof Error ? e.message : String(e)).split('\n')[0]?.slice(0, 200) ?? '';
    const lost = r.crashed || r.closed || /crash|closed/i.test(msg);
    console.log(`[crashcfg] ${r.cfg} | ${r.war} | run ${r.run} | off ${r.off}: ${lost ? 'CRASHED' : 'FAILED'} after ${where(r.seen)} (${secs()} s; ${r.crashed ? 'crash event' : r.closed ? 'close event' : 'no crash event'}): ${msg}; ${procMemory()}`);
    throw e;
  }
}

async function roundThree(browser: Browser, baseURL: string | undefined, r: Run): Promise<void> {
  // the test profile, made in a page of its own at DPR 1 (memory.spec: a second page load at DPR 2 crashed CI's WebKit)
  const setup = await browser.newContext({ viewport: { width: 1280, height: 720 }, ...(baseURL ? { baseURL } : {}) });
  const first = await setup.newPage();
  await first.goto('./?tester=1');
  const dialog = first.getByTestId('tester-dialog');
  await expect(dialog).toBeVisible({ timeout: 60_000 });
  await dialog.getByTestId('tester-everything').click();
  await Promise.all([first.waitForURL((u) => !u.search.includes('tester'), { timeout: 60_000 }), dialog.getByTestId('tester-confirm').click()]);
  await expect(first.getByTestId('play').first()).toBeVisible({ timeout: 60_000 });
  const storageState = await setup.storageState();
  await setup.close();
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2, storageState, ...(baseURL ? { baseURL } : {}) });
  try {
    const page = await context.newPage();
    watchLoss(page, r);
    await page.goto(`./?dev=1&autopilot=1${query(r.cfg)}`);
    await checkSwitches(page, r);
    const started = await page.evaluate(() => {
      type Side = { loadouts: Record<string, { units: (string | null)[] } | undefined>; levels: Record<string, number> };
      type Setup = { config: { sides: Side[] } };
      type Ctl = { save: { peek(): { flags: Record<string, boolean> } | null }; quickBattle(f: string, d?: string): { setup: Setup }; startSetup(s: Setup): unknown };
      const c = (window as unknown as { __agebornDev: { controller: Ctl } }).__agebornDev.controller;
      if (c.save.peek()?.flags['tester.profile'] !== true) return 'no test profile';
      const s = c.quickBattle('standard', 'legendary').setup;
      const [me, foe] = s.config.sides as [Side, Side];
      c.startSetup({ ...s, config: { ...s.config, sides: [me, { ...foe, levels: { ...foe.levels, ...me.levels } }] } });
      return 'ok';
    });
    expect(started).toBe('ok');
    await playWar(page, r);
  } finally {
    await context.close();
  }
}

async function reviewTwo(page: Page, r: Run): Promise<void> {
  watchLoss(page, r);
  await pastOnboarding(page, query(r.cfg));
  await checkSwitches(page, r);
  await expect(page.getByTestId('play').first()).toBeVisible({ timeout: 60_000 });
  await page.evaluate(() => {
    type Item = { collection: string; id: string; released?: boolean };
    type Save = { cosmetics: { owned: string[] } };
    const c = (window as unknown as { __agebornDev: { controller: { save: { peek(): Save }; setSave(s: Save, o?: object): void; services: { content: { cosmetics: { collections: { items: Item[] } } } } } } }).__agebornDev.controller;
    const s = c.save.peek();
    const keys = c.services.content.cosmetics.collections.items.filter((x) => x.released !== false && (x.collection === 'scene' || x.collection === 'baseSkin')).map((x) => `${x.collection}.${x.id}`);
    c.setSave({ ...s, cosmetics: { ...s.cosmetics, owned: [...new Set([...s.cosmetics.owned, ...keys])] } }, { immediate: true });
  });
  await page.evaluate(() => (window as unknown as { __agebornDev: { controller: { setAutopilot(on: boolean): void } } }).__agebornDev.controller.setAutopilot(true));
  await page.getByTestId('tab-customize').first().click();
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
    const scenes = page.locator('[data-testid="scene-grid"] [data-testid^="item-scene."]');
    await ((await scenes.count()) > 0 ? scenes.first() : page.getByTestId('scene-classic')).click();
    await live('backdrop-mock', age);
  }
  await page.getByTestId('tab-battle').first().click();
  await expect(page.getByTestId('play').first()).toBeVisible({ timeout: 30_000 });
  await page.evaluate(() => (window as unknown as { __agebornDev: { controller: { quickBattle(f: string): unknown } } }).__agebornDev.controller.quickBattle('standard'));
  await playWar(page, r);
}

const fresh = (cfg: Config, war: string, run: number): Run => ({ cfg, war, run, off: '?', seen: null, crashed: false, closed: false, t0: Date.now() });

for (const cfg of CONFIGS) {
  for (const run of RUNS) {
    test(`damage crash bisection: round 3, damage ${cfg}, run ${run}`, async ({ browser, baseURL, browserName }) => {
      test.skip(!engineOk(browserName), 'the W0 crash bisection runs in WebKit only');
      const r = fresh(cfg, 'round 3', run);
      await runCase(r, () => roundThree(browser, baseURL, r));
    });
    test(`damage crash bisection: review 2, damage ${cfg}, run ${run}`, async ({ page, browserName }) => {
      test.skip(!engineOk(browserName), 'the W0 crash bisection runs in WebKit only');
      const r = fresh(cfg, 'review 2', run);
      await runCase(r, () => reviewTwo(page, r));
    });
  }
}
