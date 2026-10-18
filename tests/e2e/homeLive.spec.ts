/**
 * Home's live island (queue item 37) in a real browser: once Home has settled the island's troops and flags
 * go live on one canvas (the menus' shared WebGL app) and the still troops step aside; a ranked search keeps
 * that canvas (the found player's troops join it), and the match start lets the menus' context go at once
 * (nothing of it left on the VS screen). Reduce motion keeps the still island: no live layer, no canvas.
 */
import { expect, test, type Page } from '@playwright/test';
import { pastOnboarding } from './helpers';

test.use({ viewport: { width: 844, height: 390 } });

type MenuStages = { shared: { alive: boolean }; lastHome: { debug(): { actors: number[] } } | null };
type Controller = { save: { peek(): { settings: object } }; setSave(s: object, o?: object): void };

const stages = (page: Page) => page.evaluate(() => (window as unknown as { __menuStages?: MenuStages }).__menuStages ?? null);
const actorCount = (page: Page) => page.evaluate(() => (window as unknown as { __menuStages?: MenuStages }).__menuStages?.lastHome?.debug().actors.length ?? -1);

test('the island goes live on one canvas, keeps it through a ranked search and lets the context go at the match', async ({ page }) => {
  await pastOnboarding(page);
  const island = page.getByTestId('hub-diorama').first();
  await expect(island).toHaveAttribute('data-live', 'true', { timeout: 30_000 });
  const canvas = page.getByTestId('home-stage-canvas');
  await expect(canvas).toHaveCount(1);
  // the still troops step aside for the live ones
  await expect.poll(() => page.locator('.hd__unit').first().evaluate((e) => getComputedStyle(e).opacity)).toBe('0');
  const first = await canvas.elementHandle();

  // the ranked Ladder (Home's default mode): search, found, VS
  await page.getByTestId('play').first().click();
  await expect(page.locator('.hub.is-found')).toHaveCount(1, { timeout: 20_000 });
  // the same canvas (never a second stage or context), and the found player's troops on it
  expect(await first!.evaluate((c) => c.isConnected)).toBe(true);
  await expect(canvas).toHaveCount(1);
  await expect.poll(() => actorCount(page)).toBe(4);

  await page.getByTestId('vs-me').first().waitFor({ timeout: 20_000 });
  await expect(page.getByTestId('home-stage-canvas')).toHaveCount(0);
  expect((await stages(page))?.shared.alive).toBe(false);
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
