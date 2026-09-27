/**
 * The art gallery's automated checks (DESIGN B5, C2/WP4 DoD; docs/requests/wp4-gallery-e2e.md): the
 * gallery runs the colour-rule, silhouette-IoU and structure checks and the bake budget in the browser
 * and publishes the results on `window.__galleryInfo`. Screenshot baselines of the gallery are v1.x (B13).
 */
import { expect, test, type Page } from '@playwright/test';
import { requireFlow, watchPage } from './helpers';

interface GalleryInfo {
  checks?: { done: boolean; pass: boolean; visuals: number; effects: number; failures: unknown[] };
  bake?: { pass: boolean; bootMs: number };
}

function info(page: Page): Promise<GalleryInfo | null> {
  return page.evaluate(() => (window as unknown as { __galleryInfo?: GalleryInfo }).__galleryInfo ?? null);
}

test.describe('art gallery', () => {
  test.beforeEach(() => requireFlow('gallery'));

  test('every visual and effect passes the art checks', async ({ page }) => {
    test.setTimeout(150_000);
    const problems = watchPage(page);
    await page.goto('./?dev=1#gallery/section=checks');
    await expect.poll(async () => (await info(page))?.checks?.done === true, { timeout: 120_000, intervals: [1_000] }).toBe(true);
    const checks = (await info(page))?.checks;
    expect(checks?.failures).toEqual([]);
    expect(checks?.pass).toBe(true);
    expect(checks?.visuals).toBeGreaterThan(50);
    expect(problems.errors).toEqual([]);
  });

  test('the Stone and Medieval boot bake meets its budget (B16)', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('./?dev=1#gallery/section=bake');
    await expect.poll(async () => (await info(page))?.bake !== undefined, { timeout: 60_000, intervals: [500] }).toBe(true);
    const bake = (await info(page))?.bake;
    expect(bake?.pass, `boot bake took ${bake?.bootMs} ms`).toBe(true);
  });
});
