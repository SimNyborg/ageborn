/**
 * Boot smoke (DESIGN B13 E2E step 1) against the production build served at the GitHub Pages base
 * `/ageborn/` (DESIGN B1): the page loads, the app shell and the Pixi canvas mount, every asset comes
 * from under the base, and nothing logs an error or fails to load.
 */
import { expect, test } from '@playwright/test';
import { requireFlow, watchPage } from './helpers';

test.describe('boot', () => {
  test.beforeEach(() => requireFlow('boot'));

  test('the game boots at /ageborn/ with no errors', async ({ page }) => {
    const problems = watchPage(page);
    const res = await page.goto('./');
    expect(res?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe('/ageborn/');
    await expect(page).toHaveTitle(/Ageborn/);
    await expect(page.getByTestId('app')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('canvas').first()).toBeAttached();
    await page.waitForLoadState('networkidle');
    expect(problems.errors).toEqual([]);
    expect(problems.failed).toEqual([]);
  });

  test('a fresh profile sees the title with one Play button and an AI-labeled opponent (A8, A7.1)', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByTestId('title')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('play')).toBeVisible();
    await expect(page.getByTestId('title-ai-chip')).toHaveText(/\bAI\b/);
  });

  test('every script, style and icon is served from the /ageborn/ base', async ({ page }) => {
    await page.goto('./');
    const urls = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLScriptElement | HTMLLinkElement>('script[src], link[href]')].map((e) => ('src' in e && e.src ? e.src : (e as HTMLLinkElement).href)),
    );
    expect(urls.length).toBeGreaterThan(0);
    for (const u of urls) {
      const url = new URL(u);
      if (url.origin === new URL(page.url()).origin) expect(url.pathname, u).toMatch(/^\/ageborn\//);
    }
  });

  test('?dev=1 lists the dev pages', async ({ page }) => {
    const problems = watchPage(page);
    await page.goto('./?dev=1');
    const list = page.getByTestId('dev-page-list');
    await expect(list).toBeVisible({ timeout: 20_000 });
    expect(await list.locator('li a').count()).toBeGreaterThan(0);
    expect(problems.errors).toEqual([]);
  });
});
