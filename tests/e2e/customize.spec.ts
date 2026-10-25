/**
 * Customize item detail (PLAN 2a, 2g Track C) on a phone in landscape:
 * - every card sits on its rarity plate, its name never clips and its hit area is at least 44 px;
 * - a locked base flag says how it is earned and crafts with two taps (the Dust after shows first,
 *   nothing is spent until the second tap);
 * - the base flags and the owned national flags show real pictures (the national ones the vendored
 *   designs, never a blank tile);
 * - the Flag Atlas card opens the Atlas, and a save without a national flag reads that its first flag
 *   costs no Dust (never the word the copy review bans);
 * - title ribbons show how a title is earned (parchment, metal caps, wax seal, gold leaf);
 * - Reduce motion leaves no looping animation in the Customize panel;
 * - round 3 (PLAN 2g C11): every released scene, equipped in Backdrops, shows on VS for its age; a base
 *   skin shows its model on its tile and on VS (a Legendary one in its aura); a decoration spot picked on
 *   the stage takes the next prop.
 */
import { expect, test, type Page } from '@playwright/test';
import { pastOnboarding, watchPage } from './helpers';

test.use({ viewport: { width: 844, height: 390 }, hasTouch: true });

type Save = {
  currencies: { amber: number; dust: number };
  settings: { reduceMotion: boolean };
  flags: Record<string, boolean>;
  cosmetics: { owned: string[]; equipped: { nationalFlag: string | null; decorations: (string | null)[]; scenes: Record<string, string>; baseSkins: Record<string, string> } };
};
type Controller = { save: { peek(): Save }; setSave(s: Save, o?: object): void };

interface Patch {
  /** Save flags to set (a Skirmish setup replaces the one before). */
  flags?: Record<string, boolean>;
  dust?: number;
  /** Keys, or prefixes ending in a dot, to remove from the owned list. */
  drop?: string[];
  add?: string[];
  national?: string | null;
  reduceMotion?: boolean;
}

/** Edits the save through the dev controller (`?dev=1&game=1`). */
async function patch(page: Page, o: Patch): Promise<void> {
  await page.evaluate((o) => {
    const c = (window as unknown as { __agebornDev: { controller: Controller } }).__agebornDev.controller;
    const s = c.save.peek();
    const gone = (k: string): boolean => (o.drop ?? []).some((d) => (d.endsWith('.') ? k.startsWith(d) : k === d));
    const owned = [...s.cosmetics.owned.filter((k) => !gone(k)), ...(o.add ?? []).filter((k) => !s.cosmetics.owned.includes(k))];
    const flags = { ...s.flags };
    if (Object.keys(o.flags ?? {}).some((k) => k.startsWith('ui-skirmish.'))) {
      for (const k of Object.keys(flags)) if (k.startsWith('ui-skirmish.f.') || k.startsWith('ui-skirmish.g.')) flags[k] = false;
    }
    c.setSave(
      {
        ...s,
        flags: { ...flags, ...(o.flags ?? {}) },
        currencies: { ...s.currencies, dust: o.dust ?? s.currencies.dust },
        settings: { ...s.settings, reduceMotion: o.reduceMotion ?? s.settings.reduceMotion },
        cosmetics: { ...s.cosmetics, owned, equipped: { ...s.cosmetics.equipped, ...(o.national !== undefined ? { nationalFlag: o.national } : {}) } },
      },
      { immediate: true },
    );
  }, o);
  const added = o.add ?? [];
  if (added.length) {
    await expect
      .poll(async () => {
        const owned = (await saveOf(page)).cosmetics.owned;
        return added.filter((k) => !owned.includes(k));
      })
      .toEqual([]);
  }
}

function saveOf(page: Page): Promise<Save> {
  return page.evaluate(() => (window as unknown as { __agebornDev: { controller: Controller } }).__agebornDev.controller.save.peek());
}

/**
 * Past onboarding and on Home. The title's hand-over to Home writes the save once more, so an edit made
 * before Home shows can be overwritten: every test waits for Home's Battle button first.
 */
async function ready(page: Page): Promise<void> {
  await pastOnboarding(page);
  await expect(page.getByTestId('play').first()).toBeVisible({ timeout: 30_000 });
}

async function openCustomize(page: Page, tab: string): Promise<void> {
  await page.getByTestId('tab-customize').first().click();
  await page.getByTestId(`tab-${tab}`).click();
  await expect(page.locator('#cust-panel')).toBeVisible({ timeout: 30_000 });
}

test.describe('Customize item detail', () => {
  test('cards: a rarity plate each, names that never clip, hit areas of at least 44 px', async ({ page }) => {
    const problems = watchPage(page);
    await ready(page);
    await openCustomize(page, 'flags');
    await expect(page.locator('.cos-tile--baseFlag').first()).toBeVisible();
    const cards = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('#cust-panel .cos-tile')].map((el) => {
        const name = el.querySelector<HTMLElement>('.cos-tile__name');
        // an item card holds its hit button; a plain card ("No national flag") is the button
        const hit = (el.matches('button') ? el : (el.querySelector<HTMLElement>('.cos-tile__hit') ?? el)).getBoundingClientRect();
        return {
          id: el.dataset.testid ?? '',
          rarity: el.dataset.rarity ?? '',
          cls: el.className,
          clipped: !!name && (name.scrollWidth > name.clientWidth + 1 || name.scrollHeight > name.clientHeight + 1),
          w: Math.round(hit.width),
          h: Math.round(hit.height),
        };
      }),
    );
    expect(cards.filter((c) => c.id.startsWith('item-baseFlag.')).length).toBeGreaterThanOrEqual(15);
    for (const c of cards) {
      // national flags show no rarity (one price for all, PLAN 2d); every other card its plate
      if (c.id.startsWith('item-baseFlag.')) expect(c.cls, c.id).toContain(`cos-card--${c.rarity}`);
      expect(c.clipped, `${c.id} name clips`).toBe(false);
      expect(Math.min(c.w, c.h), `${c.id} hit area`).toBeGreaterThanOrEqual(44);
    }
    expect(problems.errors).toEqual([]);
  });

  test('a locked base flag says how it is earned and crafts with two taps', async ({ page }) => {
    await ready(page);
    await patch(page, { dust: 2000, drop: ['baseFlag.oak'] });
    await openCustomize(page, 'flags');
    const tile = page.getByTestId('item-baseFlag.oak');
    await expect(tile).toHaveClass(/is-locked/);
    await tile.locator('.cos-tile__hit').click();
    await expect(page.getByTestId('item-info')).toBeVisible();
    await expect(page.getByTestId('info-source')).toContainText('Time Capsules');
    const craft = page.getByTestId('craft-baseFlag.oak');
    await craft.click();
    // the first tap shows the price and the Dust after; nothing is spent yet (U14)
    await expect(page.getByTestId('info-after')).toBeVisible();
    expect((await saveOf(page)).currencies.dust).toBe(2000);
    await craft.click();
    await expect(page.getByTestId('item-info')).toHaveCount(0);
    const s = await saveOf(page);
    expect(s.cosmetics.owned).toContain('baseFlag.oak');
    expect(s.currencies.dust).toBeLessThan(2000);
    await expect(tile).not.toHaveClass(/is-locked/);
  });

  test('base flags and owned national flags show real pictures (the vendored national designs)', async ({ page }) => {
    const problems = watchPage(page);
    await ready(page);
    await patch(page, { add: ['nationalFlag.dk', 'nationalFlag.jp', 'nationalFlag.br'], national: 'nationalFlag.dk' });
    await openCustomize(page, 'flags');
    await expect(page.getByTestId('item-nationalFlag.jp')).toBeVisible();
    // No national flag tile stays an empty placeholder. They show soft placeholders until the one flag
    // atlas is cut into cells on the device (`useFlagAtlasReady`; the SVGs stand in after
    // FLAG_ATLAS_WAIT_MS, 15 s), which takes seconds in a software-rendered WebKit: wait for the pictures,
    // and say how long they took.
    const shown = Date.now();
    await expect(page.locator('[data-testid="owned-national"] .cos-img--empty')).toHaveCount(0, { timeout: 20_000 });
    test.info().annotations.push({ type: 'measure', description: `national flag tiles drawn ${Date.now() - shown} ms after the panel showed` });
    const res = await page.evaluate(async () => {
      const imgs = [...document.querySelectorAll<HTMLImageElement>('#cust-panel .cos-tile--baseFlag img, [data-testid="owned-national"] img, [data-testid="base-mock"] img')];
      await Promise.all(imgs.map((i) => i.decode().catch(() => undefined)));
      const national = [...document.querySelectorAll<HTMLImageElement>('[data-testid="owned-national"] img')].map((i) => i.getAttribute('src') ?? '');
      return { n: imgs.length, broken: imgs.filter((i) => !i.complete || i.naturalWidth === 0).map((i) => (i.getAttribute('src') ?? '').slice(0, 80)), national };
    });
    expect(res.n).toBeGreaterThanOrEqual(18);
    expect(res.broken).toEqual([]);
    expect(res.national.length).toBeGreaterThanOrEqual(3);
    for (const src of res.national) expect(src).toMatch(/art\/flags\/(svg|atlas)|^blob:/);
    expect(problems.failed).toEqual([]);
  });

  test('the Flag Atlas card opens the Atlas; a first flag costs no Dust, in words the copy review allows', async ({ page }) => {
    await ready(page);
    await patch(page, { drop: ['nationalFlag.'], national: null });
    await openCustomize(page, 'flags');
    const card = page.getByTestId('open-flag-atlas');
    await expect(card.getByTestId('open-flag-atlas-first')).toHaveText('Your first flag costs no Dust');
    await expect(card.getByTestId('open-flag-atlas-count')).toHaveText(/^0\/\d+$/);
    await expect(card).not.toContainText(/\bfree\b/i);
    await card.click();
    await expect(page.getByTestId('flag-atlas')).toBeVisible({ timeout: 30_000 });
  });

  test('title ribbons show how a title is earned', async ({ page }) => {
    await ready(page);
    await openCustomize(page, 'general');
    await page.getByTestId('gen-tab-title').click();
    const tier = (id: string) => page.locator(`[data-testid="title-${id}"] .av-ribbon`);
    await expect(tier('recruit')).toHaveAttribute('data-tier', 'parchment');
    await expect(tier('siege_scholar')).toHaveAttribute('data-tier', 'bronze');
    await expect(tier('ageborn')).toHaveAttribute('data-tier', 'gold');
    await expect(tier('grand_curator')).toHaveAttribute('data-tier', 'leaf');
  });

  test('Reduce motion: no looping animation in the Customize panel', async ({ page }) => {
    await ready(page);
    await patch(page, { reduceMotion: true, add: ['baseFlag.wyvern', 'decoration.knight_helm'] });
    const loops = () =>
      page.evaluate(() =>
        document
          .getAnimations()
          .filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().iterations === Infinity)
          .map((a) => {
            const el = (a.effect as KeyframeEffect | null)?.target ?? null;
            const r = el?.getBoundingClientRect();
            if (!el || !r || r.width < 1 || r.height < 1 || !el.closest('#cust-panel')) return null;
            return `${(a as CSSAnimation).animationName ?? 'animation'} on ${el.getAttribute('class') ?? el.tagName}`;
          })
          .filter((x): x is string => x !== null),
      );
    await openCustomize(page, 'flags');
    await page.waitForTimeout(600);
    expect(await loops()).toEqual([]);
    for (const tab of ['decorations', 'quotes', 'general']) {
      await page.getByTestId(`tab-${tab}`).click();
      await page.waitForTimeout(600);
      expect(await loops(), tab).toEqual([]);
    }
    for (const g of ['frame', 'banner', 'title']) {
      await page.getByTestId(`gen-tab-${g}`).click();
      await page.waitForTimeout(600);
      expect(await loops(), g).toEqual([]);
    }
  });
});

/** What the VS screen showed while it was up (read every frame: it shows for about 2 s, then the battle starts). */
interface VsSeen {
  age: string;
  /** Your half: the scene VS was given and the scene its still shows. */
  scene: string;
  stillScene: string;
  /** The scene's still was drawn (a loaded picture of that scene). */
  scenePicture: boolean;
  /** Your base: its skin, whether its model's picture was drawn, and whether it stood in an aura. */
  skin: string;
  model: boolean;
  aura: boolean;
}

/** Watches the VS screen from now on, every frame while it shows; read the result with `vsSeen`. */
async function watchVs(page: Page): Promise<void> {
  await page.evaluate(() => {
    type Seen = { age: string; scene: string; stillScene: string; scenePicture: boolean; skin: string; model: boolean; aura: boolean };
    const w = window as unknown as { __vsSeen?: Seen | null };
    w.__vsSeen = null;
    const t0 = performance.now();
    const loaded = (i: HTMLImageElement | null | undefined): boolean => !!i && i.complete && i.naturalWidth > 0;
    const tick = (): void => {
      const vs = document.querySelector('[data-screen="vs"]');
      if (vs) {
        const bd = vs.querySelector('[data-testid="vs-backdrop"]');
        const still = bd?.querySelector('.cos-bd');
        const base = vs.querySelector('[data-testid="vs-base-me"]');
        const prev = w.__vsSeen;
        const scene = bd?.getAttribute('data-scene') ?? '';
        const stillScene = still?.getAttribute('data-scene') ?? '';
        w.__vsSeen = {
          age: bd?.getAttribute('data-age') ?? '',
          scene,
          stillScene,
          scenePicture: (prev?.scenePicture ?? false) || (loaded(bd?.querySelector<HTMLImageElement>('img.cos-bd__img')) && stillScene === scene),
          skin: base?.getAttribute('data-skin') ?? '',
          model: (prev?.model ?? false) || loaded(base?.querySelector<HTMLImageElement>('img.cos-base__body')),
          aura: (prev?.aura ?? false) || !!vs.querySelector('[data-testid="vs-base-me-aura"]'),
        };
      }
      // until the VS has come and gone (or 60 s)
      if (performance.now() - t0 < 60_000 && !(w.__vsSeen && !vs)) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

function vsSeen(page: Page): Promise<VsSeen | null> {
  return page.evaluate(() => (window as unknown as { __vsSeen?: VsSeen | null }).__vsSeen ?? null);
}

/**
 * Plays a Skirmish whose war opens in `age` from Home's Battle (one age, `w1.<age>`, against an AI General),
 * returns what its VS showed once the battle has started, and goes back to Home.
 */
async function vsOf(page: Page, age: string): Promise<VsSeen | null> {
  await patch(page, { flags: { 'ui-homeMode.skirmish': true, 'ui-skirmish.set': true, 'ui-skirmish.g.boomsworth': true, [`ui-skirmish.f.w1.${age}`]: true } });
  await page.getByTestId('tab-battle').first().click();
  await expect(page.getByTestId('play').first()).toBeVisible({ timeout: 30_000 });
  await watchVs(page);
  await page.getByTestId('play').first().click();
  const vs = page.locator('[data-screen="vs"]');
  await expect(vs).toBeVisible({ timeout: 30_000 });
  // the VS hands over to the battle by itself (2 s); then back to Home for the next look
  await expect(vs).toHaveCount(0, { timeout: 30_000 });
  const seen = await vsSeen(page);
  await page.evaluate(() => (window as unknown as { __agebornDev: { controller: { home(): void } } }).__agebornDev.controller.home());
  await expect(page.getByTestId('play').first()).toBeVisible({ timeout: 30_000 });
  return seen;
}

/** The age ids of an age picker, in order. */
async function agesOf(page: Page, picker: string): Promise<string[]> {
  const ids = await page.locator(`[data-testid="${picker}"] [data-testid^="age-tab-"]`).evaluateAll((els) => els.map((e) => e.getAttribute('data-testid') ?? ''));
  return ids.map((id) => id.slice('age-tab-'.length));
}

test.describe('Customize round 3: scenes and skins on VS, decoration spots on the stage', () => {
  test('every released scene, equipped in Backdrops, shows on VS for its age (PLAN 2g C11)', async ({ page }) => {
    // one Skirmish VS per scene, on software GL (CI's WebKit runs about four times slower)
    test.setTimeout(480_000);
    const problems = watchPage(page);
    await ready(page);
    await openCustomize(page, 'backdrops');
    // the released scenes are the ones Backdrops lists, per age
    const scenes: { age: string; key: string }[] = [];
    for (const age of await agesOf(page, 'cust-bd-age')) {
      await page.locator(`[data-testid="cust-bd-age"] [data-testid="age-tab-${age}"]`).click();
      const keys = await page.locator('[data-testid="scene-grid"] [data-testid^="item-scene."]').evaluateAll((els) => els.map((e) => (e.getAttribute('data-testid') ?? '').slice('item-'.length)));
      for (const key of keys) scenes.push({ age, key });
    }
    expect(scenes.length, 'released scenes').toBeGreaterThanOrEqual(6);
    await patch(page, { add: scenes.map((x) => x.key) });
    for (const { age, key } of scenes) {
      await openCustomize(page, 'backdrops');
      await page.locator(`[data-testid="cust-bd-age"] [data-testid="age-tab-${age}"]`).click();
      await page.locator(`[data-testid="item-${key}"] .cos-tile__hit`).click();
      await expect(page.getByTestId(`state-${key}`)).toBeVisible();
      expect((await saveOf(page)).cosmetics.equipped.scenes[age]).toBe(key);
      const seen = await vsOf(page, age);
      expect(seen, `${key}: VS seen`).not.toBeNull();
      expect(seen!.age, key).toBe(age);
      expect(seen!.scene, key).toBe(key);
      expect(seen!.stillScene, key).toBe(key);
      expect(seen!.scenePicture, `${key}: its still drawn on VS`).toBe(true);
    }
    expect(problems.errors).toEqual([]);
  });

  test('a base skin shows its model on its tile and on VS; a Legendary one stands in its aura', async ({ page }) => {
    test.setTimeout(240_000);
    const problems = watchPage(page);
    await ready(page);
    await patch(page, { add: ['baseSkin.rose_keep', 'baseSkin.nebula_ark'] });
    for (const [age, key, legendary] of [
      ['medieval', 'baseSkin.rose_keep', false],
      ['cosmic', 'baseSkin.nebula_ark', true],
    ] as const) {
      await openCustomize(page, 'bases');
      await page.locator(`[data-testid="cust-age"] [data-testid="age-tab-${age}"]`).click();
      const tile = page.getByTestId(`item-${key}`);
      await tile.locator('.cos-tile__hit').click();
      await expect(page.getByTestId(`state-${key}`)).toBeVisible();
      // the tile shows the model (Track B's thumbnail, or the model's portrait on its scene strip)
      await expect
        .poll(() => tile.locator('img').evaluateAll((els) => (els as HTMLImageElement[]).some((i) => i.complete && i.naturalWidth > 0 && /cos-btile__thumb|cos-base__body/.test(i.className))), { timeout: 20_000 })
        .toBe(true);
      if (legendary) await expect(tile.locator('.cos-base__aura')).toHaveCount(1);
      const seen = await vsOf(page, age);
      expect(seen, `${key}: VS seen`).not.toBeNull();
      expect(seen!.skin, key).toBe(key);
      expect(seen!.model, `${key}: its model drawn on VS`).toBe(true);
      expect(seen!.aura, `${key}: the aura on VS`).toBe(legendary);
    }
    expect(problems.errors).toEqual([]);
  });

  test('a decoration spot picked on the stage takes the next prop', async ({ page }) => {
    test.setTimeout(120_000);
    const problems = watchPage(page);
    await ready(page);
    await patch(page, { add: ['decoration.lion_statue', 'decoration.owl_statue'] });
    await openCustomize(page, 'decorations');
    // the live stage takes over from the still with the same spot buttons; let it, where WebGL allows
    const live = await page
      .waitForFunction(() => document.querySelector('[data-testid="deco-stage"]')?.getAttribute('data-live') === 'true', null, { timeout: 20_000 })
      .then(() => true)
      .catch(() => false);
    test.info().annotations.push({ type: 'measure', description: `decorations stage live: ${live}` });
    const heading = page.locator('#cust-panel .cust-h').first();
    for (const [spot, key, name] of [
      [2, 'decoration.lion_statue', /by the gate/i],
      [1, 'decoration.owl_statue', /courtyard/i],
    ] as const) {
      await page.getByTestId(`anchor-${spot}`).click();
      await expect(page.getByTestId(`anchor-${spot}`)).toHaveAttribute('aria-pressed', 'true');
      await expect(heading).toHaveText(name);
      await page.locator(`[data-testid="item-${key}"] .cos-tile__hit`).click();
      await expect.poll(async () => (await saveOf(page)).cosmetics.equipped.decorations[spot]).toBe(key);
      await expect(page.getByTestId(`anchor-${spot}`)).toHaveAttribute('aria-label', new RegExp(key === 'decoration.lion_statue' ? 'Lion Statue' : 'Wise Owl'));
    }
    // every spot is a 44 px target, on the live stage as on the still (its layout box: a re-filled spot pops in)
    const sizes = await page.locator('[data-testid^="anchor-"]').evaluateAll((els) => els.map((e) => Math.min((e as HTMLElement).offsetWidth, (e as HTMLElement).offsetHeight)));
    expect(sizes).toHaveLength(3);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(44);
    expect(problems.errors).toEqual([]);
  });
});
