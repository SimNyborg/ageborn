/**
 * Home's live island (queue item 37) in a real browser: once Home has settled the island's troops and flags
 * go live on one canvas (the menus' shared WebGL app) and the still troops step aside; a ranked search keeps
 * that canvas (the found player's troops join it), and the match start lets the menus' context go at once
 * (nothing of it left on the VS screen). A lost context shows the still island until it is back (review M
 * S6). Reduce motion keeps the still island: no live layer, no canvas. The still troops' strips are kept on the
 * device, so a return shows them with the island and before the live layer, without drawing them again (in WebKit
 * in a persistent context, since Playwright's WebKit contexts are ephemeral; review 2 A); a skinned troop wears its
 * skin in the still island (queue item 37 open items 1 and 2).
 */
import { rmSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { pastOnboarding } from './helpers';

test.use({ viewport: { width: 844, height: 390 } });

type MenuStages = { shared: { alive: boolean }; lastHome: { debug(): { actors: number[] } } | null };
type Controller = { save: { peek(): { settings: object } }; setSave(s: object, o?: object): void };
type W = { __menuStages?: MenuStages };

// read in the page: `alive` is a getter on the shared app, which a serialized copy would not carry (review M B1)
const sharedAlive = (page: Page) => page.evaluate(() => (window as unknown as W).__menuStages?.shared.alive ?? null);

test('the island goes live on one canvas, keeps it through a ranked search and lets the context go at the match', async ({ page }) => {
  await pastOnboarding(page);
  const island = page.getByTestId('hub-diorama').first();
  await expect(island).toHaveAttribute('data-live', 'true', { timeout: 30_000 });
  const canvas = page.getByTestId('home-stage-canvas');
  await expect(canvas).toHaveCount(1);
  expect(await sharedAlive(page)).toBe(true);
  // the still troops step aside for the live ones
  await expect.poll(() => page.locator('.hd__unit').first().evaluate((e) => getComputedStyle(e).opacity)).toBe('0');
  await page.evaluate(() => {
    (window as unknown as { __firstCanvas?: Element | null }).__firstCanvas = document.querySelector('canvas[data-testid="home-stage-canvas"]');
  });

  // the ranked Ladder (Home's default mode): search, found, VS. The found beat lasts 1.5 s before VS lets the menus'
  // context go, so its checks run in the page, in the frames it shows (a slow WebKit spends seconds on each step):
  // the same canvas (never a second stage or context), and the found player's troops on it
  const found = page.waitForFunction(
    () => {
      if (!document.querySelector('.hub.is-found')) return false;
      const w = window as unknown as W & { __firstCanvas?: Element | null };
      const canvases = document.querySelectorAll('canvas[data-testid="home-stage-canvas"]');
      const actors = w.__menuStages?.lastHome?.debug().actors.length ?? -1;
      return actors === 4 ? { canvases: canvases.length, same: canvases[0] === w.__firstCanvas } : false;
    },
    null,
    { polling: 'raf', timeout: 30_000 },
  );
  found.catch(() => undefined);
  await page.getByTestId('play').first().click();
  expect(await (await found).jsonValue()).toEqual({ canvases: 1, same: true });

  await page.getByTestId('vs-me').first().waitFor({ timeout: 20_000 });
  await expect(page.getByTestId('home-stage-canvas')).toHaveCount(0);
  expect(await sharedAlive(page)).toBe(false);
});

test('a lost context shows the still island, and the island comes back once the context is restored', async ({ page }) => {
  await pastOnboarding(page);
  const island = page.getByTestId('hub-diorama').first();
  await expect(island).toHaveAttribute('data-live', 'true', { timeout: 30_000 });
  // what iOS does to a background tab's context
  const lost = await page.evaluate(() => {
    const c = document.querySelector<HTMLCanvasElement>('canvas[data-testid="home-stage-canvas"]');
    const gl = (c?.getContext('webgl2') ?? c?.getContext('webgl')) as WebGLRenderingContext | null | undefined;
    const ext = gl?.getExtension('WEBGL_lose_context');
    if (!ext) return false;
    (window as unknown as { __loseExt?: unknown }).__loseExt = ext;
    ext.loseContext();
    return true;
  });
  test.skip(!lost, 'no WEBGL_lose_context here');
  await expect(island).not.toHaveAttribute('data-live', 'true', { timeout: 5_000 });
  await expect.poll(() => page.locator('.hd__unit').first().evaluate((e) => getComputedStyle(e).opacity)).toBe('1');
  await page.evaluate(() => (window as unknown as { __loseExt: { restoreContext(): void } }).__loseExt.restoreContext());
  await expect(island).toHaveAttribute('data-live', 'true', { timeout: 10_000 });
});

type StillTimes = { island?: number; troops?: number; live?: number };
const allIn = (page: Page) =>
  page.evaluate(() => {
    const units = document.querySelectorAll('[data-testid="hub-diorama"] .hd__unit');
    return units.length > 0 && document.querySelectorAll('[data-testid="hub-diorama"] .hd__unit.is-in').length === units.length;
  });
const keptStrips = (page: Page) => page.evaluate(async () => (await (await caches.open('ageborn-strips-v1')).keys()).length);

/**
 * What the strip store holds as the page and as a worker of the page see it (the strip worker keeps strips from a
 * worker): the Cache Storage names, the store's entries and their slots, whether the browser draws in workers, and
 * whether the site's storage is persisted. Logged with the return test, so a CI run says where kept strips went
 * (review 2 A).
 */
const stripView = (page: Page, at: string) =>
  page.evaluate(async (at) => {
    const out = { at, names: [] as string[] | string, entries: -1, slots: [] as string[], worker: null as unknown, offscreen: typeof OffscreenCanvas === 'function', persisted: null as boolean | null };
    try {
      out.names = await caches.keys();
      const keys = await (await caches.open('ageborn-strips-v1')).keys();
      out.entries = keys.length;
      out.slots = keys.slice(0, 12).map((r) => decodeURIComponent(r.url.split('/__strips/')[1]?.split('/')[0] ?? '?').replace(/\/[^|]*\/art\/units\//, ''));
    } catch (e) {
      out.names = String(e);
    }
    try {
      out.persisted = (await navigator.storage?.persisted?.()) ?? null;
    } catch {
      // no StorageManager here
    }
    try {
      const src = "onmessage=async()=>{try{const n=await caches.keys();const k=await (await caches.open('ageborn-strips-v1')).keys();postMessage({names:n,entries:k.length})}catch(e){postMessage(String(e))}}";
      const w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      out.worker = await new Promise((resolve) => {
        const t = setTimeout(() => resolve('no answer in 3 s'), 3000);
        w.onmessage = (e) => {
          clearTimeout(t);
          resolve(e.data);
        };
        w.onerror = (e) => {
          clearTimeout(t);
          resolve(`worker error: ${e.message}`);
        };
        w.postMessage(0);
      });
      w.terminate();
    } catch (e) {
      out.worker = String(e);
    }
    return out;
  }, at);

test('a return finds the still troops kept on the device: they stand with the island, before the live layer', async ({ page, browserName, playwright, launchOptions, headless, viewport, baseURL, deviceScaleFactor, userAgent, isMobile, hasTouch }, testInfo) => {
  // Playwright's WebKit contexts are ephemeral, like a private window: CI's WebKit found the store empty after the
  // return (4 of 4 attempts, review 2 A). A normal Safari window keeps its site data, so in WebKit the test runs in a
  // persistent context (a profile folder of its own), which still proves the store works on Safari. Chromium's own
  // context keeps Cache Storage across a navigation: it runs in the test's page, as before.
  const profile = testInfo.outputPath('profile');
  const persistent =
    browserName === 'webkit' ? await playwright[browserName].launchPersistentContext(profile, { ...launchOptions, headless, viewport, baseURL, deviceScaleFactor, userAgent, isMobile, hasTouch }) : null;
  try {
    const p = persistent ? (persistent.pages()[0] ?? (await persistent.newPage())) : page;
    await pastOnboarding(p);
    await expect.poll(() => allIn(p), { timeout: 30_000 }).toBe(true);
    const troops = await p.locator('[data-testid="hub-diorama"] .hd__unit').count();
    // each strip is kept (the island's troops, the Home card's bearer)
    await expect.poll(() => keptStrips(p), { timeout: 15_000 }).toBeGreaterThanOrEqual(troops);
    const kept = await keptStrips(p);
    const first = await stripView(p, 'first visit');
    // a returning player opens the app: the still troops come right with the island and before the live layer
    await p.addInitScript(() => {
      const w = window as unknown as { __still?: StillTimes };
      const s: StillTimes = {};
      w.__still = s;
      const tick = (): void => {
        const t = performance.now();
        const d = document.querySelector('[data-testid="hub-diorama"]');
        if (d && s.island === undefined) s.island = t;
        const n = d ? d.querySelectorAll('.hd__unit').length : 0;
        if (d && n > 0 && s.troops === undefined && d.querySelectorAll('.hd__unit.is-in').length === n) s.troops = t;
        if (d?.getAttribute('data-live') === 'true' && s.live === undefined) s.live = t;
        if (s.troops === undefined || s.live === undefined) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await p.goto('./');
    const times = (await (
      await p.waitForFunction(
        () => {
          const s = (window as unknown as { __still?: StillTimes }).__still;
          return s && s.troops !== undefined && s.live !== undefined ? s : false;
        },
        null,
        { timeout: 60_000, polling: 250 },
      )
    ).jsonValue()) as Required<StillTimes>;
    expect(times.troops).toBeLessThanOrEqual(times.live);
    expect(times.troops - times.island).toBeLessThan(3000);
    const now = await keptStrips(p);
    // the store right after the return and a few seconds later (writes of strips drawn again would land by then)
    const back = await stripView(p, 'return');
    await p.waitForTimeout(3000);
    const later = await stripView(p, 'return + 3 s');
    const log = JSON.stringify({ browser: browserName, persistent: persistent !== null, troops, kept, now, times, first, back, later });
    testInfo.annotations.push({ type: 'strip store', description: log });
    console.log(`[strips] ${log}`);
    // found, not drawn again: nothing new was kept
    expect(now, `kept strips after the return: ${log}`).toBe(kept);
  } finally {
    if (persistent) {
      await persistent.close();
      // the profile holds the page's HTTP cache too (every sheet it fetched)
      rmSync(profile, { recursive: true, force: true });
    }
  }
});

test("a skinned troop wears its skin in the still island (no change of outfit when the live layer takes over)", async ({ page }) => {
  await pastOnboarding(page);
  await expect.poll(() => allIn(page), { timeout: 30_000 }).toBe(true);
  const first = page.locator('[data-testid="hub-diorama"] .hd__unit--me.hd__unit--s0');
  const card = await first.getAttribute('data-card');
  const SKINS: Record<string, string> = { footman: 'tin_can', longbowman: 'greenwood_archer', pebbler: 'snowball_pebbler', bonker: 'pumpkin_head', sabertooth: 'fossil_sabertooth', hoplite: 'marble_hoplite' };
  const skin = card ? SKINS[card] : undefined;
  test.skip(!skin, `no skin listed for ${card}`);
  const plain = await first.locator('.hd__unitStrip').evaluate((e) => getComputedStyle(e).backgroundImage);
  await page.evaluate(
    ({ card, skin }) => {
      type Save = { skins: { owned: string[]; equipped: Record<string, string> } };
      const c = (window as unknown as { __agebornDev: { controller: { save: { peek(): Save }; setSave(s: Save, o?: object): void } } }).__agebornDev.controller;
      const s = c.save.peek();
      c.setSave({ ...s, skins: { owned: [...new Set([...s.skins.owned, skin])], equipped: { ...s.skins.equipped, [card]: skin } } }, { immediate: true });
    },
    { card: card!, skin: skin! },
  );
  await expect(first).toHaveAttribute('data-skin', skin!, { timeout: 10_000 });
  await expect(first).toHaveClass(/is-in/, { timeout: 20_000 });
  const skinned = await first.locator('.hd__unitStrip').evaluate((e) => getComputedStyle(e).backgroundImage);
  expect(skinned).toMatch(/^url\("data:image\/png/);
  expect(skinned).not.toBe(plain);
});

test('Reduce motion keeps the still island: no live layer and no canvas', async ({ page }) => {
  await pastOnboarding(page);
  await page.evaluate(() => {
    const c = (window as unknown as { __agebornDev: { controller: Controller } }).__agebornDev.controller;
    const s = c.save.peek();
    c.setSave({ ...s, settings: { ...s.settings, reduceMotion: true } }, { immediate: true });
  });
  const island = page.getByTestId('hub-diorama').first();
  await island.waitFor();
  // well past the moment the live island would start (Home's entrance, then idle)
  await page.waitForTimeout(5000);
  await expect(island).not.toHaveAttribute('data-live', 'true');
  await expect(page.getByTestId('home-stage-canvas')).toHaveCount(0);
  expect(await page.locator('.hd__unit').first().evaluate((e) => getComputedStyle(e).opacity)).not.toBe('0');
});
