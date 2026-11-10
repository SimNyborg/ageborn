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
 *
 * Round 3 (2026-10-18): with every card owned (the test profile) both War Plans are full of the largest
 * units and a Standard War peaked at 645-718 MB. The memory governor (`visuals/sheetBudget.ts`) keeps every
 * held unit sheet at least on its 1x copy and gives HD by how soon a unit may be drawn, within a budget; the
 * test profile's war against an opponent at its own levels (so the war runs through the ages) must stay
 * under the same budget.
 *
 * Review fixes (2026-10-18): no turret and no base may be drawn by its stand-in (an evolve once dropped the
 * turret sheets of ages the lagging side had still to reach); units and forts drawn by theirs, and the governor's
 * copy changes and loads, are printed. Review 2 S-c (2026-10-19): a turret or base made before its sheet was in
 * is made again from it once it lands, so the check counts what is still drawn by a stand-in at the end of the
 * war (how many were made at all is printed); CI's slow WebKit could build a turret just after an evolve in a
 * fast-forward, before the age's turret sheets landed.
 */
import fs from 'node:fs';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { fastForward, pastOnboarding, watchPage, type AgebornDev } from './helpers';

/** Decoded image memory a whole Standard War may hold at its peak (MB; 2,484 before G7, about 540 after). */
const BUDGET_MB = 600;

interface Mem {
  total: number;
  cpu: number;
  gpu: number;
  /** Unit sheets held: the battle's set and the governor's 1x copies (`sources`, `sdSources`: their files). */
  sheets: { loaded: number; sd?: number; sources?: string[]; sdSources?: string[] } | null;
  /**
   * Views drawn by their stand-ins as they were made: units (and the last one), turrets, bases and forts (and the
   * last one); `turretsNow` and `basesNow`: the turret and base stand-ins alive now.
   */
  fallbacks: { units: number; last: string; turrets?: number; bases?: number; forts?: number; lastWorld?: string; turretsNow?: number; basesNow?: number } | null;
  /** Decoded bytes by kind (unit sheets HD and 1x, baked parts, world sheets, backdrops, other). */
  kinds?: Record<string, number>;
  /** The memory governor's plan: unit sheets planned HD and 1x, copy changes and the copies it loaded. */
  plan?: { hd: number; sd: number; plannedBytes: number; moves?: number; loads?: { hd: number; sd: number } } | null;
}

interface Step {
  /** Both sides' age index, the match phase, the units on the field and the sim tick; null once the battle has left. */
  battle: { ages: number[]; phase: string; units: number; tick: number } | null;
  mem: Mem;
}

/** Runs the battle on screen `ticks` sim ticks ahead (0: none) and reads its state and the memory, in one round trip. */
const step = (page: Page, ticks: number): Promise<Step> =>
  page.evaluate(async (n) => {
    type St = { sides: { ageIndex: number }[]; phase: string; units: unknown[]; tick: number };
    type Dev = AgebornDev & { memory(): Mem; controller: { route: { peek(): { id: string; battle?: { session: { sim: { state: St } } } } } } };
    const dev = (window as unknown as { __agebornDev: Dev }).__agebornDev;
    if (n > 0) await dev.fastForward(n);
    const r = dev.controller.route.peek();
    const st = r.id === 'battle' && r.battle ? r.battle.session.sim.state : null;
    return { battle: st ? { ages: st.sides.map((s) => s.ageIndex), phase: st.phase, units: st.units.length, tick: st.tick } : null, mem: dev.memory() };
  }, ticks);

/** One line on how far a war got (a page lost mid-war says it in its error). */
const progress = (s: Step | null): string =>
  s?.battle ? `tick ${s.battle.tick}, ages ${s.battle.ages.join('/')}, ${s.battle.units} units, ${mb(s.mem.total)} MB${s.mem.plan ? ` (${s.mem.plan.hd} HD + ${s.mem.plan.sd} 1x planned)` : ''}` : 'no battle step yet';

test.use({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });

const mb = (n: number): number => Math.round(n / 1e6);

/**
 * WebKit-crash record (2026-11-01; kept 2026-11-02): CI's WebKit (Playwright's WPE build, software GL) loses its page
 * ("Target crashed") in about one long DPR-2 war in eighteen, whatever the damage runtime does (the W0 bisection found
 * the same rate with all of it off; docs/decisions.md, W0). A page hook counts the WebGL objects alive (created minus deleted), the
 * texture uploads (all, and of the bakers' 512 px canvas pages) and their bytes; `warPeak` logs them every 1,000 ticks
 * with the app's estimate, the battle view's display objects, the browsers' resident memory and the machine's free
 * memory (/proc), so a crash's log shows what grew before it.
 */
const GL_PROBE = (): void => {
  const w = window as unknown as { __glProbe?: unknown };
  if (w.__glProbe) return;
  const alive: Record<string, number> = { texture: 0, buffer: 0, framebuffer: 0, renderbuffer: 0, vertexArray: 0 };
  const up = { n: 0, bytes: 0, pages: 0 };
  w.__glProbe = { alive, up };
  const pairs: [string, string, string][] = [['createTexture', 'deleteTexture', 'texture'], ['createBuffer', 'deleteBuffer', 'buffer'], ['createFramebuffer', 'deleteFramebuffer', 'framebuffer'], ['createRenderbuffer', 'deleteRenderbuffer', 'renderbuffer'], ['createVertexArray', 'deleteVertexArray', 'vertexArray']];
  const gl = window as unknown as { WebGLRenderingContext?: { prototype: object }; WebGL2RenderingContext?: { prototype: object } };
  for (const proto of [gl.WebGLRenderingContext?.prototype, gl.WebGL2RenderingContext?.prototype]) {
    if (!proto) continue;
    const P = proto as unknown as Record<string, (...a: unknown[]) => unknown>;
    for (const [c, d, k] of pairs) {
      const oc = P[c];
      const od = P[d];
      if (!oc || !od) continue;
      P[c] = function (this: unknown, ...a: unknown[]) {
        alive[k] = (alive[k] ?? 0) + 1;
        return oc.apply(this, a);
      };
      P[d] = function (this: unknown, o: unknown, ...a: unknown[]) {
        if (o) alive[k] = (alive[k] ?? 0) - 1;
        return od.call(this, o, ...a);
      };
    }
    for (const name of ['texImage2D', 'texSubImage2D']) {
      const orig = P[name];
      if (!orig) continue;
      P[name] = function (this: unknown, ...a: unknown[]) {
        const src = a.find((x) => typeof x === 'object' && x !== null && 'width' in (x as object)) as { width: number; height: number; constructor: { name: string } } | undefined;
        const wd = src ? src.width : typeof a[3] === 'number' ? a[3] : 0;
        const ht = src ? src.height : typeof a[4] === 'number' ? a[4] : 0;
        up.n++;
        up.bytes += wd * ht * 4;
        if (src && src.constructor.name === 'HTMLCanvasElement' && wd === 512 && ht === 512) up.pages++;
        return orig.apply(this, a);
      };
    }
  }
};

/** The browsers' resident memory (MB; WebKit's web and GPU processes, Chromium's) and the machine's free memory, from /proc. */
function procMemory(): string {
  try {
    const rows: string[] = [];
    for (const pid of fs.readdirSync('/proc').filter((d) => /^\d+$/.test(d))) {
      let comm = '';
      try {
        comm = fs.readFileSync(`/proc/${pid}/comm`, 'utf8').trim();
      } catch {
        continue;
      }
      if (!/WebKit|chrome|headless_shell/i.test(comm)) continue;
      const st = fs.readFileSync(`/proc/${pid}/status`, 'utf8');
      const rss = Number(/VmRSS:\s+(\d+)/.exec(st)?.[1] ?? 0) / 1024;
      if (rss > 150) rows.push(`${comm}:${pid}=${Math.round(rss)}`);
    }
    const avail = Number(/MemAvailable:\s+(\d+)/.exec(fs.readFileSync('/proc/meminfo', 'utf8'))?.[1] ?? 0) / 1024;
    return `free ${Math.round(avail)} MB; ${rows.join(' ')}`;
  } catch {
    return 'no /proc';
  }
}

/** One diagnostic line for the war on screen: tick, the app's estimate, WebGL objects, uploads, display objects, memory. */
async function warProbe(page: Page, label: string, s: Step): Promise<void> {
  const g = await page
    .evaluate(() => {
      const p = (window as unknown as { __glProbe?: { alive: Record<string, number>; up: { n: number; bytes: number; pages: number } } }).__glProbe;
      const root = (window as unknown as { __agebornDev?: { view?: () => { root?: { children?: unknown[] } } | null } }).__agebornDev?.view?.()?.root;
      let n = 0;
      const walk = (o: { children?: unknown[] }): void => {
        n++;
        for (const c of o.children ?? []) walk(c as { children?: unknown[] });
      };
      if (root) walk(root);
      return { alive: p?.alive ?? {}, up: p?.up ?? { n: 0, bytes: 0, pages: 0 }, objects: root ? n : -1 };
    })
    .catch(() => null);
  const gl = g ? `gl ${Object.entries(g.alive).map(([k, v]) => `${k} ${v}`).join(', ')}; uploads ${g.up.n} (${mb(g.up.bytes)} MB, pages ${g.up.pages}); objects ${g.objects}` : 'no probe';
  console.log(`[war] ${test.info().project.name} ${label}: ${progress(s)}; ${gl}; ${procMemory()}`);
}

/**
 * Plays the Standard War on screen and returns its memory peak: the opening at real speed (no unit may
 * appear without its art), the rest fast-forwarded five seconds of play a step while the sheets load,
 * upload and unload in between. Checks the budget, the evolves it covered and the page's errors. Returns the
 * troop skins' sheets (`<slug>@<skinId>.json`, queue item 46) the war held at some point.
 */
async function warPeak(page: Page, problems: { errors: string[] }, label: string): Promise<{ skinSheets: string[]; mine: number }> {
  const skinSheets = new Set<string>();
  // the last age index your side (side 0, the one that wears skins) reached
  let mine = 0;
  await expect(page.getByTestId('battle')).toBeVisible({ timeout: 60_000 });
  // The opening at real speed: the troops both sides train first draw from their sheets (a slow
  // software-rendered engine plays a few game seconds a minute, hence the long wait).
  await expect.poll(async () => (await step(page, 0)).battle?.units ?? 0, { timeout: 120_000, intervals: [250] }).toBeGreaterThanOrEqual(2);
  expect((await step(page, 0)).mem.fallbacks).toMatchObject({ units: 0, last: '' });
  let peak: Mem | null = null;
  let top = 0;
  let last: Mem | null = null;
  // CI's software-rendered WebKit has lost its page in the middle of these wars now and then (the Customize case on
  // 2dbc183: "Target crashed"; round 3 on a4f7816: "Target page, context or browser has been closed", both passed on
  // retry): a lost page says how far the war got and which way it went, for the next run's log
  let seen: Step | null = null;
  const lost: string[] = [];
  // (a browser that goes away closes its pages too)
  page.on('crash', () => lost.push(`the page crashed after ${progress(seen)}`));
  page.on('close', () => lost.push(`the page closed after ${progress(seen)}`));
  try {
    for (let i = 0; i < 400; i++) {
      const s = await step(page, 100);
      if (!s.battle) break;
      seen = s;
      last = s.mem;
      if (i % 10 === 0 || s.battle.phase === 'ended') await warProbe(page, label, s);
      for (const src of [...(s.mem.sheets?.sources ?? []), ...(s.mem.sheets?.sdSources ?? [])]) if (src.includes('@')) skinSheets.add(src);
      top = Math.max(top, ...s.battle.ages);
      mine = Math.max(mine, s.battle.ages[0] ?? 0);
      if (!peak || s.mem.total > peak.total) peak = s.mem;
      if (s.battle.phase === 'ended') break;
      await page.waitForTimeout(200);
    }
  } catch (e) {
    console.log(`[war] ${test.info().project.name} ${label}: lost after ${progress(seen)}; ${procMemory()}`);
    throw new Error(`${label}: the war stopped at ${progress(seen)} (peak so far ${mb(peak?.total ?? 0)} MB); ${lost.join('; ') || 'no crash or close event'}: ${e instanceof Error ? e.message : String(e)}`, { cause: e });
  }
  const kinds = peak?.kinds ? `; ${Object.entries(peak.kinds).map(([k, v]) => `${k} ${mb(v)}`).join(', ')}` : '';
  const plan = peak?.plan ? `; planned ${peak.plan.hd} HD + ${peak.plan.sd} 1x (${mb(peak.plan.plannedBytes)} MB)` : '';
  // views drawn with their stand-ins over the whole fast-forwarded war (the opening's units are checked above), and
  // the turrets and bases still drawn by theirs at its end
  const fb = last?.fallbacks;
  const fallbacks = fb ? `; stand-ins: units ${fb.units}, turrets ${fb.turrets ?? 0} (${fb.turretsNow ?? 0} at the end), bases ${fb.bases ?? 0} (${fb.basesNow ?? 0} at the end), forts ${fb.forts ?? 0}` : '';
  const loads = last?.plan?.loads ? `; copy changes ${last.plan.moves ?? 0}, loads ${last.plan.loads.hd} HD + ${last.plan.loads.sd} 1x` : '';
  const skins = skinSheets.size > 0 ? `; skin sheets ${[...skinSheets].sort().join(', ')}` : '';
  const note = `${label}: peak ${mb(peak?.total ?? 0)} MB (cpu ${mb(peak?.cpu ?? 0)}, gpu ${mb(peak?.gpu ?? 0)}), ${peak?.sheets?.loaded ?? 0} unit sheets${peak?.sheets?.sd ? ` + ${peak.sheets.sd} 1x` : ''}, last age index ${top}${kinds}${plan}${fallbacks}${loads}${skins}`;
  test.info().annotations.push({ type: 'memory', description: note });
  console.log(`[memory] ${test.info().project.name}: ${note}`);
  // the match went through several evolves (Gunpowder or later), so the budget covers them
  expect(top).toBeGreaterThanOrEqual(3);
  expect(mb(peak?.total ?? Infinity)).toBeLessThanOrEqual(BUDGET_MB);
  // no turret and no base is still drawn by its stand-in at the end (one made before its sheet was in is made again
  // from it once it lands; one still standing in now would have kept it)
  const still = { turrets: fb?.turretsNow ?? 0, bases: fb?.basesNow ?? 0 };
  expect({ ...still, last: still.turrets + still.bases > 0 ? fb?.lastWorld : '' }).toEqual({ turrets: 0, bases: 0, last: '' });
  expect(problems.errors).toEqual([]);
  return { skinSheets: [...skinSheets].sort(), mine };
}

test('G7: a long Standard War at DPR 2 (a skinned and a plain copy of the same cards) keeps decoded images under the budget, and no unit appears without its art', async ({ page }) => {
  // About 3 minutes in Chromium here (the mirror war below runs to tick 13,091, longer than the war it replaced); CI's
  // machines and its software-rendered WebKit take two to four times as long, so it has the other wars' 20 minutes.
  test.setTimeout(1_200_000);
  const problems = watchPage(page);
  await page.addInitScript(GL_PROBE);
  await page.goto('./?dev=1&autopilot=1&quick=standard');
  await page.waitForFunction(() => (window as unknown as { __agebornDev?: unknown }).__agebornDev !== undefined, null, { timeout: 60_000 });
  // A mirror, so the war runs through the evolves whatever the balance (queue item 38's combat levers turned the first
  // Quick Battle into an early loss in Medieval): the opponent plays the autopilot's own brain (the Balanced General,
  // tier V) with the player's War Plan and levels, on the controller's first Quick Battle seed. Headless on 10.0.0 this
  // war reaches Industrial (tick 8,050) and ends at tick 13,091; mirrors on five other seeds all reached Industrial too.
  // The e2e specs that replay a fixed battle and must be re-checked after any sim change: memory (both wars), camera,
  // flows, modes and onboarding.
  // Art round W0 (queue item 46): your side wears every troop skin its decks have and the mirror none, so the war holds
  // a skinned and a plain copy of the same cards: a skin rendered as a sheet loads next to its unit's sheet (the sim
  // ignores skins, so the war runs as before).
  const started = await page.evaluate(() => {
    type Side = { loadouts: Record<string, { units: (string | null)[] } | undefined>; levels: Record<string, number>; skins: Record<string, string> };
    type Setup = { config: { seed: number; sides: Side[] }; opponent: { tier: number; seed: number }; brain: unknown };
    type Ctl = {
      quickBattle(f: string): { setup: Setup };
      startSetup(s: Setup): unknown;
      services: { content: { generals?: { list?: Record<string, { weights?: Record<string, number> }> }; skins: Record<string, { id: string; target: string }>; units: Record<string, { age: string }>; order: { ages: string[] } } };
    };
    const c = (window as unknown as { __agebornDev: { controller: Ctl } }).__agebornDev.controller;
    const weights = c.services.content.generals?.list?.['echo']?.weights;
    if (!weights) return { error: 'no Balanced General', skins: [] as string[], ages: [] as number[] };
    const setup = c.quickBattle('standard').setup;
    const [me, foe] = setup.config.sides as [Side, Side];
    const skins: Record<string, string> = {};
    for (const k of Object.values(c.services.content.skins)) if (Object.values(me.loadouts).some((lo) => lo?.units.includes(k.target))) skins[k.target] = k.id;
    const seed = 7936;
    c.startSetup({
      ...setup,
      config: { ...setup.config, seed, sides: [{ ...me, skins }, { ...foe, loadouts: me.loadouts, levels: me.levels, skins: {} }] },
      opponent: { ...setup.opponent, tier: 5, seed },
      // the autopilot's profile (`botProfile(content, { generalId: 'echo', tier: 5 })`; no openings: its personality's)
      brain: { kind: 'general', profile: { generalId: 'echo', tier: 5, mistakeBonusBp: 0, weights: { ...weights }, openings: [] } },
    });
    // where each worn skin's sheet would be (contract C3), and the index of its card's age
    const worn = Object.entries(skins);
    const ageOf = (card: string): string => c.services.content.units[card]?.age ?? '';
    return {
      error: '',
      skins: worn.map(([card, id]) => `art/units/${ageOf(card)}/${card}@${id}.json`),
      ages: worn.map(([card]) => c.services.content.order.ages.indexOf(ageOf(card))),
    };
  });
  expect(started.error).toBe('');
  expect(started.skins.length).toBeGreaterThan(0);
  expect(started.ages).not.toContain(-1);
  const { skinSheets, mine } = await warPeak(page, problems, 'Standard War (mirror, your side skinned)');
  // every worn skin that is rendered as a sheet was held (next to its unit's sheet, which the mirror's plain copies hold)
  // (a missing file may come back as the app's index.html: only a JSON answer is a sheet). Only the ages your side
  // reached count: the war ends in Industrial (age index 4), so a Modern skin's sheet (W3) is never needed in it.
  const installed = await page.evaluate(
    (paths) => Promise.all(paths.map((p) => fetch(p, { method: 'HEAD' }).then((r) => (r.ok && (r.headers.get('content-type') ?? '').includes('json') ? p : null), () => null))),
    started.skins,
  );
  const due = installed.filter((p, i): p is string => p !== null && (started.ages[i] ?? Infinity) <= mine);
  console.log(`[memory] ${test.info().project.name}: worn skin sheets due (ages up to ${mine}): ${due.join(', ') || 'none'}; not reached: ${installed.filter((p, i) => p !== null && (started.ages[i] ?? Infinity) > mine).join(', ') || 'none'}`);
  expect(due.length).toBeGreaterThan(0);
  for (const p of due) expect(skinSheets, p).toContain(p);
});

async function roundThree(browser: Browser, baseURL: string | undefined): Promise<void> {
  // About 1.5 minutes in Chromium here (the war runs to its later ages); CI's machines and its
  // software-rendered WebKit take two to three times as long.
  test.setTimeout(1_200_000);
  // The profile is made in a page of its own at DPR 1: the dialog reloads the page, and a second page load
  // at DPR 2 crashed CI's software-rendered WebKit. The war then plays in a fresh page that loads once.
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
    const problems = watchPage(page);
    await page.addInitScript(GL_PROBE);
    // `autopilot=1`: the boot waits for its art (the opening ages' base and turret sheets) and the autopilot
    // plays your side; past the onboarding, the page opens on Home
    await page.goto('./?dev=1&autopilot=1');
    await page.waitForFunction(() => (window as unknown as { __agebornDev?: unknown }).__agebornDev !== undefined, null, { timeout: 60_000 });
    // a Standard War against Kettle's War Plan at Legendary (tier X) and the profile's own card levels (at
    // level 1 the AI loses before the later ages, which hold the largest units)
    const started = await page.evaluate(() => {
      type Side = { loadouts: Record<string, { units: (string | null)[] } | undefined>; levels: Record<string, number> };
      type Setup = { config: { sides: Side[] } };
      type Ctl = { save: { peek(): { flags: Record<string, boolean> } | null }; quickBattle(f: string, d?: string): { setup: Setup }; startSetup(s: Setup): unknown };
      const c = (window as unknown as { __agebornDev: { controller: Ctl } }).__agebornDev.controller;
      if (c.save.peek()?.flags['tester.profile'] !== true) return 'no test profile';
      const setup = c.quickBattle('standard', 'legendary').setup;
      const [me, foe] = setup.config.sides as [Side, Side];
      c.startSetup({ ...setup, config: { ...setup.config, sides: [me, { ...foe, levels: { ...foe.levels, ...me.levels } }] } });
      return 'ok';
    });
    expect(started).toBe('ok');
    await warPeak(page, problems, 'Test profile, Standard War');
  } finally {
    await context.close();
  }
}

test('round 3: the test profile (every card owned) plays a Standard War at DPR 2 under the budget', async ({ browser, baseURL }) => {
  await roundThree(browser, baseURL);
});

const AGES = ['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern', 'future', 'cosmic'] as const;

async function reviewTwo(page: Page): Promise<void> {
  // Customize kept every age's scene strips, grounds and model sheets decoded for the session: 926 MB at
  // the war's peak before the match start let go of them (budget 600). About 4 minutes in Chromium here;
  // CI's machines and its software-rendered WebKit take two to three times as long.
  test.setTimeout(1_200_000);
  const problems = watchPage(page);
  await page.addInitScript(GL_PROBE);
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
  // the autopilot plays your side of the war; switched on in place, since a second page load at DPR 2
  // crashed CI's software-rendered WebKit
  await page.evaluate(() => (window as unknown as { __agebornDev: { controller: { setAutopilot(on: boolean): void } } }).__agebornDev.controller.setAutopilot(true));
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
}

test('review 2: Customize browsed through every age (Bases and Backdrops, every scene and skin owned), then a Standard War, stays under the budget', async ({ page }) => {
  await reviewTwo(page);
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
