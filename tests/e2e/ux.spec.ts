/**
 * Usability checks from the first-battle audit (docs/PROGRESS.md): real pointer input reaches the
 * battlefield, the tutorial points at things with a hand, and a Quick Battle opens with
 * "3-2-1 Fight!". These drive the production build like a player (mouse clicks at screen points).
 */
import { expect, test, type Page } from '@playwright/test';
import { requireFlow, watchPage } from './helpers';

interface UxDev {
  mountPoint(i: number): { x: number; y: number } | null;
}

function mountPoint(page: Page, i: number): Promise<{ x: number; y: number } | null> {
  return page.evaluate((n) => (window as unknown as { __agebornDev?: UxDev }).__agebornDev?.mountPoint(n) ?? null, i);
}

test.describe('usability: input reaches the battlefield', () => {
  test.beforeEach(() => requireFlow('boot'));

  test('a real click on your mount opens the turret menu; the lane is the canvas', async ({ page }) => {
    const problems = watchPage(page);
    await page.goto('./?dev=1&game=1');
    await expect(page.getByTestId('title')).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('play').click();
    await expect(page.getByTestId('battle')).toBeVisible();

    // Nothing full-screen above the canvas may swallow taps on the lane (audit #1).
    const top = await page.evaluate(() => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      return [0.3, 0.5, 0.7].map((fx) => document.elementsFromPoint(w * fx, h * 0.5)[0]?.tagName ?? '');
    });
    expect(top).toEqual(['CANVAS', 'CANVAS', 'CANVAS']);

    // The whole base is on screen and the mount can be clicked like a player would.
    const m = await mountPoint(page, 0);
    if (!m) throw new Error('no mount point (window.__agebornDev.mountPoint)');
    expect(m.x).toBeGreaterThanOrEqual(16);
    await page.mouse.click(m.x, m.y);
    await expect(page.getByTestId('hud-mount-popover')).toBeVisible();
    await expect(page.getByTestId('hud-pop-build-0')).toBeVisible();
    expect(problems.errors).toEqual([]);
  });

  test('the first prompt shows a hand on the Bonker card and waits for the tap', async ({ page }) => {
    await page.goto('./?dev=1&game=1');
    await page.getByTestId('play').click();
    const bubble = page.getByTestId('tutorial-bubble');
    await expect(bubble).toHaveAttribute('data-prompt', 'm1.sendBonker');
    await expect(page.getByTestId('tutorial-hand')).toBeVisible();
    // The bubble never covers the card it points at.
    const [b, card] = await Promise.all([bubble.boundingBox(), page.getByTestId('hud-card-0').boundingBox()]);
    expect(b && card && (b.y + b.height <= card.y || b.y >= card.y + card.height || b.x + b.width <= card.x || b.x >= card.x + card.width)).toBe(true);
    await page.getByTestId('hud-card-0').click();
    await expect(page.getByTestId('hud-card-0-queued')).toBeVisible();
  });

  test('a Quick Battle opens with "3-2-1 Fight!" before the sim runs', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByTestId('title')).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('quick-battle').click();
    await expect(page.getByTestId('countdown')).toBeVisible();
    await expect(page.getByTestId('countdown')).toHaveCount(0, { timeout: 10_000 });
    await expect(page.getByTestId('hud-clock')).toBeVisible();
  });
});
