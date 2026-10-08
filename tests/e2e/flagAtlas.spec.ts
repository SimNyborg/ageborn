/**
 * The Flag Atlas (PLAN 2d, 2g Track D) on a phone in landscape:
 * - every vendored flag renders: a pixel check per atlas cell (both atlases) and per SVG;
 * - the Atlas opens from the Profile's flag; the search finds accents, aliases and ISO codes;
 * - buying takes two taps and spends exactly 500 Dust, a flag cannot be bought twice, and it survives
 *   a reload; flying it shows on the Profile;
 * - a save's first flag costs no Dust; too little Dust explains where Dust comes from;
 * - a completed region reveals its Region Pennant once, and a reload never grants it again;
 * - a v13 save that owns and flies Denmark (the frozen fixture) still owns and flies it.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { pastOnboarding, watchPage } from './helpers';

test.use({ viewport: { width: 844, height: 390 }, hasTouch: true });

type Save = { currencies: { amber: number; dust: number }; cosmetics: { owned: string[]; equipped: { nationalFlag: string | null } } };
type Controller = { save: { peek(): Save }; setSave(s: Save, o?: object): void };

const OCEANIA = ['au', 'fj', 'ki', 'mh', 'fm', 'nr', 'nz', 'pw', 'pg', 'ws', 'sb', 'to', 'tv', 'vu'];

/** Replaces the save's national flags, Atlas rewards and Dust (through the dev controller). */
async function setFlags(page: Page, o: { dust: number; flags: string[]; equip: string | null }): Promise<void> {
  await page.evaluate((o) => {
    const c = (window as unknown as { __agebornDev: { controller: Controller } }).__agebornDev.controller;
    const s = c.save.peek();
    const keep = s.cosmetics.owned.filter((k) => !k.startsWith('nationalFlag.') && !k.startsWith('baseFlag.pennant_') && k !== 'baseFlag.world_compass' && k !== 'world_ambassador');
    c.setSave(
      { ...s, currencies: { ...s.currencies, dust: o.dust }, cosmetics: { ...s.cosmetics, owned: [...keep, ...o.flags], equipped: { ...s.cosmetics.equipped, nationalFlag: o.equip } } },
      { immediate: true },
    );
  }, o);
}

function saveOf(page: Page): Promise<Save> {
  return page.evaluate(() => (window as unknown as { __agebornDev: { controller: Controller } }).__agebornDev.controller.save.peek());
}

async function openAtlas(page: Page): Promise<void> {
  await page.getByTestId('home-profile').first().click();
  await page.getByTestId('profile-flag').click();
  await expect(page.getByTestId('flag-atlas')).toBeVisible({ timeout: 30_000 });
}

/** The Atlas screen (its count and first-flag banner share test ids with Customize's entry card). */
const atlasScreen = (page: Page) => page.locator('[data-screen="flagAtlas"]');

test.describe('Flag Atlas', () => {
  test('every flag renders: a pixel check per atlas cell and per SVG', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('./?dev=1');
    const res = await page.evaluate(async () => {
      const base = document.baseURI;
      const atlas = (await (await fetch(new URL('art/flags/atlas.json', base))).json()) as { cols: number; sizes: Record<string, { file: string; cell: [number, number] }>; cells: Record<string, number> };
      const bad: string[] = [];
      let cells = 0;
      let svgs = 0;
      const check = (d: Uint8ClampedArray, n: number): boolean => {
        let opaque = 0;
        const colors = new Set<number>();
        for (let k = 0; k < d.length; k += 4) {
          if ((d[k + 3] ?? 0) > 200) {
            opaque += 1;
            if (colors.size < 3) colors.add(((d[k] ?? 0) << 16) | ((d[k + 1] ?? 0) << 8) | (d[k + 2] ?? 0));
          }
        }
        return opaque >= n * 0.2 && colors.size >= 2;
      };
      const load = async (url: string): Promise<HTMLImageElement> => {
        const img = new Image();
        img.src = url;
        await img.decode();
        return img;
      };
      for (const size of Object.values(atlas.sizes)) {
        const img = await load(new URL(`art/flags/${size.file}`, base).href);
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const [w, h] = size.cell;
        for (const [code, i] of Object.entries(atlas.cells)) {
          cells += 1;
          if (!check(ctx.getImageData((i % atlas.cols) * w, Math.floor(i / atlas.cols) * h, w, h).data, w * h)) bad.push(`${size.file} ${code}`);
        }
      }
      for (const code of Object.keys(atlas.cells)) {
        const img = await load(new URL(`art/flags/svg/${code}.svg`, base).href);
        const c = document.createElement('canvas');
        c.width = 128;
        c.height = 96;
        const ctx = c.getContext('2d')!;
        ctx.drawImage(img, 0, 0, 128, 96);
        svgs += 1;
        if (!check(ctx.getImageData(0, 0, 128, 96).data, 128 * 96)) bad.push(`svg ${code}`);
      }
      const licence = await (await fetch(new URL('art/flags/LICENSE-flag-icons.txt', base))).text();
      return { bad, cells, svgs, licence: /MIT License/.test(licence) && /Panayiotis Lipiridis/.test(licence) };
    });
    expect(res.bad).toEqual([]);
    expect(res.cells).toBe(400);
    expect(res.svgs).toBe(200);
    expect(res.licence).toBe(true);
  });

  test('search, buy with two taps for exactly 500, never twice, fly it, and it survives a reload', async ({ page }) => {
    test.setTimeout(150_000);
    const problems = watchPage(page);
    await pastOnboarding(page);
    await setFlags(page, { dust: 1240, flags: ['nationalFlag.dk'], equip: 'nationalFlag.dk' });
    await openAtlas(page);
    await expect(atlasScreen(page).getByTestId('atlas-count')).toContainText('1/195');

    const search = page.getByTestId('atlas-search');
    const tiles = page.locator('[data-testid="atlas-sec-results"] .fa-tile');
    await search.fill('cote');
    await expect(tiles).toHaveCount(1);
    await expect(page.getByTestId('flag-ci')).toBeVisible();
    await search.fill('Holland');
    await expect(page.getByTestId('flag-nl')).toBeVisible();
    await search.fill('GB-ENG');
    await expect(tiles).toHaveCount(1);
    await expect(page.getByTestId('flag-gb_eng')).toBeVisible();
    await search.fill('türk');
    await expect(tiles.first()).toHaveAttribute('data-testid', 'flag-tr');
    await search.fill('qqqq');
    await expect(page.getByTestId('atlas-empty')).toBeVisible();
    await page.getByTestId('atlas-search-clear').click();

    await page.getByTestId('atlas-chip-europe').click();
    await page.getByTestId('flag-es').click();
    const buy = page.getByTestId('atlas-buy');
    await expect(buy).toContainText('Buy · 500');
    await buy.click();
    await expect(buy).toContainText('Confirm · 500');
    await expect(buy).toContainText('740');
    expect((await saveOf(page)).currencies.dust).toBe(1240);
    await buy.click();
    await expect(page.getByTestId('atlas-fly')).toBeVisible();
    let s = await saveOf(page);
    expect(s.currencies.dust).toBe(740);
    expect(s.cosmetics.owned.filter((k) => k === 'nationalFlag.es')).toHaveLength(1);
    await expect(atlasScreen(page).getByTestId('atlas-count')).toContainText('2/195');
    await expect(page.getByTestId('atlas-dust')).toContainText('740');

    await page.getByTestId('atlas-fly').click();
    await expect(page.getByTestId('atlas-flying')).toBeVisible();
    expect((await saveOf(page)).cosmetics.equipped.nationalFlag).toBe('nationalFlag.es');

    // the purchase was committed at once: a reload keeps it, and Spain flies on the Profile
    await page.reload();
    await page.waitForFunction(() => (window as unknown as { __agebornDev?: unknown }).__agebornDev !== undefined, null, { timeout: 30_000 });
    await expect(page.getByTestId('home-profile').first()).toBeVisible({ timeout: 30_000 });
    s = await saveOf(page);
    expect(s.currencies.dust).toBe(740);
    expect(s.cosmetics.owned).toContain('nationalFlag.es');
    expect(s.cosmetics.equipped.nationalFlag).toBe('nationalFlag.es');
    await page.getByTestId('home-profile').first().click();
    await expect(page.getByTestId('profile-flag')).toHaveAttribute('data-flag', 'nationalFlag.es');
    expect(problems.errors).toEqual([]);
  });

  test('the first flag costs no Dust; too little Dust explains where Dust comes from', async ({ page }) => {
    test.setTimeout(120_000);
    const problems = watchPage(page);
    await pastOnboarding(page);
    await setFlags(page, { dust: 120, flags: [], equip: null });
    await openAtlas(page);
    await expect(atlasScreen(page).getByTestId('atlas-first')).toBeVisible();
    await page.getByTestId('flag-jp').click();
    const claim = page.getByTestId('atlas-claim');
    await claim.click();
    await claim.click();
    await expect(page.getByTestId('atlas-fly')).toBeVisible();
    let s = await saveOf(page);
    expect(s.currencies.dust).toBe(120);
    expect(s.cosmetics.owned).toContain('nationalFlag.jp');
    await expect(atlasScreen(page).getByTestId('atlas-first')).toHaveCount(0);

    await page.getByTestId('flag-kr').click();
    const need = page.getByTestId('atlas-need');
    await expect(need).toContainText('Need 380 more');
    await need.click({ force: true });
    await expect(page.getByTestId('atlas-dust-help')).toBeVisible();
    s = await saveOf(page);
    expect(s.currencies.dust).toBe(120);
    expect(s.cosmetics.owned).not.toContain('nationalFlag.kr');
    expect(problems.errors).toEqual([]);
  });

  test('completing a region reveals its pennant once; a reload grants nothing again', async ({ page }) => {
    test.setTimeout(120_000);
    const problems = watchPage(page);
    await pastOnboarding(page);
    await setFlags(page, { dust: 600, flags: ['nationalFlag.dk', ...OCEANIA.slice(0, 13).map((c) => `nationalFlag.${c}`)], equip: 'nationalFlag.dk' });
    await openAtlas(page);
    await page.getByTestId('atlas-chip-oceania').click();
    await page.getByTestId('flag-vu').click();
    await page.getByTestId('atlas-buy').click();
    await page.getByTestId('atlas-buy').click();
    await expect(page.getByTestId('atlas-reveal')).toBeVisible();
    await expect(page.getByTestId('atlas-reveal')).toContainText('Oceania Pennant');
    await page.getByTestId('atlas-reveal').click();
    await expect(page.getByTestId('atlas-reveal')).toHaveCount(0);
    let s = await saveOf(page);
    expect(s.currencies.dust).toBe(100);
    expect(s.cosmetics.owned.filter((k) => k === 'baseFlag.pennant_oceania')).toHaveLength(1);
    await page.reload();
    await page.waitForFunction(() => (window as unknown as { __agebornDev?: unknown }).__agebornDev !== undefined, null, { timeout: 30_000 });
    await expect(page.getByTestId('home-profile').first()).toBeVisible({ timeout: 30_000 });
    s = await saveOf(page);
    expect(s.cosmetics.owned.filter((k) => k === 'baseFlag.pennant_oceania')).toHaveLength(1);
    await openAtlas(page);
    await expect(page.getByTestId('atlas-reveal')).toHaveCount(0);
    await expect(page.getByTestId('atlas-head-oceania')).toContainText('14/14');
    expect(problems.errors).toEqual([]);
  });

  test('a v13 save that owns and flies Denmark keeps it (PLAN 2g Track D #9)', async ({ page }) => {
    test.setTimeout(120_000);
    const problems = watchPage(page);
    const doc = readFileSync(path.join(process.cwd(), 'src/save/test/fixtures/v13.json'), 'utf8');
    const payload = JSON.stringify(JSON.parse(doc));
    // the store's slot envelope: FNV-1a 32 over the payload's UTF-8 bytes (src/save/checksum.ts)
    let h = 0x811c9dc5;
    for (const b of Buffer.from(payload, 'utf8')) h = Math.imul(h ^ b, 0x01000193);
    const envelope = JSON.stringify({ v: 13, writtenAt: 1_790_000_000_000, checksum: h >>> 0, payload });
    await page.addInitScript((e) => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.clear();
        localStorage.setItem('ageborn.save.A', e);
        sessionStorage.setItem('seeded', '1');
      }
    }, envelope);
    await page.goto('./?dev=1&game=1');
    await page.waitForFunction(() => (window as unknown as { __agebornDev?: unknown }).__agebornDev !== undefined, null, { timeout: 30_000 });
    await expect(page.getByTestId('home-profile').first()).toBeVisible({ timeout: 30_000 });
    const s = await saveOf(page);
    expect(s.cosmetics.owned).toContain('nationalFlag.dk');
    expect(s.cosmetics.equipped.nationalFlag).toBe('nationalFlag.dk');
    await openAtlas(page);
    await expect(page.getByTestId('atlas-detail')).toHaveAttribute('data-flag', 'nationalFlag.dk');
    await expect(page.getByTestId('atlas-flying')).toBeVisible();
    // the save owns a flag, so the next one costs 500 (no first-flag claim)
    await expect(atlasScreen(page).getByTestId('atlas-first')).toHaveCount(0);
    expect(problems.errors).toEqual([]);
  });
});
