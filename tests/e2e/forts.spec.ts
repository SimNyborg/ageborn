/**
 * Forts in the UI (DESIGN A16.14.7, F2): the Army band's Fort group fits one row with no sideways
 * overflow and a visible advisor column at 844 × 390 and 1280 × 720 (the dev screen gallery previews the
 * slot before battles play it), and the battle HUD's Fort button places a fort with Key D, says why a
 * press during the recharge is refused, and lights the pads a wall may use when it is picked up
 * (the dev sandbox, which gives both sides a Fort card with `&fort=wall`).
 */
import { expect as baseExpect, test, type Page } from '@playwright/test';
import { watchPage } from './helpers';

/** Software WebGL renders a few frames per second, so every check gets more time. */
const expect = baseExpect.configure({ timeout: 20_000 });

async function army(page: Page, variant: string, vp: string): Promise<void> {
  const [w, h] = vp.split('x').map(Number) as [number, number];
  await page.setViewportSize({ width: w + 40, height: h + 80 });
  await page.goto(`./?dev=1#screens/${variant}/mid/${vp}`);
  await expect(page.getByTestId('wp-board')).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(700);
}

test.describe('Army: the Fort slot', () => {
  for (const vp of ['844x390', '1280x720']) {
    test(`the band keeps one row with the Fort group at ${vp}`, async ({ page }) => {
      const problems = watchPage(page);
      await army(page, 'army-fort', vp);
      await expect(page.locator('.army-bandgroup--fort')).toHaveCount(1);
      await expect(page.locator('[data-drop="fort"]')).toHaveAttribute('data-card-id', 'cyclopean_wall');
      const m = await page.evaluate(() => {
        const board = document.querySelector<HTMLElement>('[data-testid="wp-board"]')!;
        const side = document.querySelector<HTMLElement>('.army-bandside')!.getBoundingClientRect();
        const b = board.getBoundingClientRect();
        return { scroll: board.scrollWidth, client: board.clientWidth, sideIn: side.left >= b.left && side.right <= b.right + 1 && side.width > 0 };
      });
      expect(m.scroll).toBeLessThanOrEqual(m.client);
      expect(m.sideIn).toBe(true);
      expect(problems.errors).toEqual([]);
    });
  }

  test('a locked Fort slot says how it opens', async ({ page }) => {
    await army(page, 'army-fort-locked', '844x390');
    await page.getByTestId('slot-fort').click();
    await expect(page.getByText('War Path Bronze 4 or 400 trophies')).toBeVisible();
  });
});

async function sandbox(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('./?dev=1&stage=1&source=real&format=short&opponent=autoplayer&fort=wall&speed=2#sandbox');
  await page.waitForFunction(() => {
    const w = window as unknown as { __sandboxDev?: unknown };
    return !!w.__sandboxDev && document.querySelector('[data-testid="hud-fort"]') !== null;
  }, null, { timeout: 60_000 });
  // Enough gold, and the slot's first recharge (20 s) done.
  await page.evaluate(() => (window as unknown as { __sandboxDev: { gold(s: number, n: number): void } }).__sandboxDev.gold(0, 900));
  await expect(page.getByTestId('hud-fort')).toHaveAttribute('data-state', 'ready', { timeout: 120_000 });
  await page.evaluate(() => (window as unknown as { __sandboxDev: { clear(): void; gold(s: number, n: number): void } }).__sandboxDev.clear());
}

test.describe('Battle HUD: the Fort button', () => {
  // One real sim at a time: the slot's first recharge is 20 s of sim time.
  test.describe.configure({ mode: 'serial', timeout: 150_000 });
  test('a pick-up lights the Home pads; a drop on the HUD puts it back', async ({ page }) => {
    const problems = watchPage(page);
    await sandbox(page);
    const b = (await page.getByTestId('hud-fort').boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 - 120, b.y - 220, { steps: 6 });
    // A wall uses the three Home pads; Field pads are not drawn for it.
    await expect(page.locator('[data-testid^="hud-fpad-"]')).toHaveCount(3);
    await expect(page.locator('[data-testid="hud-fort-token"] .hud-fort-token-core')).toBeVisible();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 5 });
    await page.mouse.up();
    await expect(page.locator('[data-testid^="hud-fpad-"]')).toHaveCount(0);
    await expect(page.getByTestId('hud-fort')).toHaveAttribute('data-state', 'ready');
    expect(problems.errors).toEqual([]);
  });

  test('a drop on a blocked pad says why (the card in hand names the reason first)', async ({ page }) => {
    const problems = watchPage(page);
    await sandbox(page);
    // An enemy next to the front Home pad, then a still frame so the pads cannot change under the drag.
    await page.evaluate(() => {
      const x = (window as unknown as { __sandboxDev: { spawn(s: number, c: string, p: number): void; pause(on: boolean): void } }).__sandboxDev;
      x.spawn(1, 'tuskback', 2000 - 380);
    });
    await page.waitForTimeout(400);
    await page.evaluate(() => (window as unknown as { __sandboxDev: { pause(on: boolean): void } }).__sandboxDev.pause(true));
    const b = (await page.getByTestId('hud-fort').boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 - 40, b.y - 60, { steps: 5 });
    const blocked = page.locator('[data-testid^="hud-fpad-"][data-look="blocked"]').last();
    await expect(blocked).toBeVisible();
    const p = (await blocked.boundingBox())!;
    await page.mouse.move(p.x + p.width / 2, p.y + p.height / 2 - 20, { steps: 8 });
    await expect(page.getByTestId('hud-fort-token-label')).toHaveAttribute('data-why', /hud\.deny\./);
    await page.mouse.up();
    await expect(page.getByTestId('hud-reason-fort')).toContainText(/Enemy near|No clear pad|Taken/);
    await expect(page.getByTestId('hud-fort')).toHaveAttribute('data-state', 'ready');
    expect(problems.errors).toEqual([]);
  });

  test('D places a fort; a press during the recharge says when it is ready', async ({ page }) => {
    await sandbox(page);
    await page.keyboard.press('d');
    await expect(page.getByTestId('hud-fort')).toHaveAttribute('data-state', 'recharging');
    await expect(page.getByTestId('hud-fort-secs')).toBeVisible();
    await page.getByTestId('hud-fort').click();
    await expect(page.getByTestId('hud-reason-fort')).toContainText('Ready in');
  });
});
