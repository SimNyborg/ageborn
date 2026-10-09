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
 * - Reduce motion leaves no looping animation in the Customize panel.
 */
import { expect, test, type Page } from '@playwright/test';
import { pastOnboarding, watchPage } from './helpers';

test.use({ viewport: { width: 844, height: 390 }, hasTouch: true });

type Save = {
  currencies: { amber: number; dust: number };
  settings: { reduceMotion: boolean };
  cosmetics: { owned: string[]; equipped: { nationalFlag: string | null } };
};
type Controller = { save: { peek(): Save }; setSave(s: Save, o?: object): void };

interface Patch {
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
    c.setSave(
      {
        ...s,
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
