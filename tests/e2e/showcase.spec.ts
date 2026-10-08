/**
 * Card detail's live showcase (owner request 2026-10-07) in a real browser, on the dev screens page
 * (which injects the stage as the app does): the stage goes live with its own canvas, its controls
 * are full-size targets that stay on the stage and off the card, a tap plays the next move, Reduce
 * motion idles until tapped, and leaving the card destroys the canvas.
 */
import { expect, test, type Page } from '@playwright/test';

const VIEWPORTS = ['844x390', '844x340', '800x360', '1280x720'] as const;

async function openCard(page: Page, card: string, vp: string, state = 'mid'): Promise<void> {
  const [w, h] = vp.split('x').map(Number) as [number, number];
  await page.setViewportSize({ width: w + 40, height: h + 80 });
  await page.goto(`./?dev=1#screens/card-${card}/${state}/${vp}`);
  await expect(page.locator('[data-testid="card-stage"]').first()).toHaveAttribute('data-live', 'true', { timeout: 30_000 });
}

for (const vp of VIEWPORTS) {
  test(`the live stage and its controls fit at ${vp}`, async ({ page }) => {
    await openCard(page, 'bonker', vp);
    await expect(page.getByTestId('showcase-canvas')).toHaveCount(1);
    const stage = (await page.locator('[data-testid="card-stage"]').first().boundingBox())!;
    const card = (await page.locator('.cd-stage__card').first().boundingBox())!;
    for (const id of ['showcase-next', 'showcase-play']) {
      const b = (await page.getByTestId(id).boundingBox())!;
      expect(b.width, id).toBeGreaterThanOrEqual(44);
      expect(b.height, id).toBeGreaterThanOrEqual(44);
      // on the stage, never over the card
      expect(b.x).toBeGreaterThanOrEqual(stage.x);
      expect(b.x + b.width).toBeLessThanOrEqual(stage.x + stage.width + 0.5);
      expect(b.y + b.height <= card.y || b.x >= card.x + card.width, `${id} clear of the card`).toBe(true);
    }
    const fontPx = await page.getByTestId('showcase-next').evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
    expect(fontPx).toBeGreaterThanOrEqual(12);
    // no sideways page scroll
    expect(await page.locator('[data-testid="ui-root"]').first().evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
  });
}

test('a tap plays the next move and pauses the loop; play resumes it', async ({ page }) => {
  await openCard(page, 'bonker', '844x390');
  const next = page.getByTestId('showcase-next');
  const play = page.getByTestId('showcase-play');
  await expect(play).toHaveAttribute('aria-pressed', 'true');
  const stage = page.locator('[data-testid="card-stage"]').first();
  const box = (await stage.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.5);
  await expect(play).toHaveAttribute('aria-pressed', 'false');
  const first = await next.getAttribute('data-move');
  await next.click();
  await expect(next).not.toHaveAttribute('data-move', first ?? '');
  await play.click();
  await expect(play).toHaveAttribute('aria-pressed', 'true');
});

test('Reduce motion idles until tapped', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await openCard(page, 'bonker', '844x390');
  const next = page.getByTestId('showcase-next');
  await expect(page.getByTestId('showcase-play')).toHaveAttribute('aria-pressed', 'false');
  await page.waitForTimeout(2500);
  await expect(next).toHaveAttribute('data-move', 'idle');
  await next.click();
  await expect(next).not.toHaveAttribute('data-move', 'idle');
  await expect(next).toHaveAttribute('data-move', 'idle', { timeout: 6000 });
  await ctx.close();
});

test('leaving the card destroys its stage', async ({ page }) => {
  await openCard(page, 'tuskback', '844x390', 'maxed');
  await page.getByTestId('back').first().click();
  await expect(page.getByTestId('showcase-canvas')).toHaveCount(0);
  const live = await page.evaluate(() => (window as unknown as { __showcaseStages?: { state(): { live: boolean } }[] }).__showcaseStages?.map((s) => s.state().live));
  expect(live?.length).toBeGreaterThan(0);
  expect(live?.every((l) => !l)).toBe(true);
});
