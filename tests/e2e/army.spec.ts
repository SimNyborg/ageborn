/**
 * Army, the deck builder (docs/ui-plan.md 4.2, 6.6 acceptance): all three ways to equip a card work
 * (card + Use, tap-tap, drag with a mouse and with a finger), a vertical swipe on the grid scrolls it
 * and never picks a card up, the header Undo reverses the visit's changes, and Info and Upgrade open
 * Card detail. Runs on the dev screen gallery (`?dev=1#screens/army-warn/...`: the Stone Age army with
 * three troops, one turret and gaps to fill), with the preview services editing a local save.
 */
import { expect, test, type Page } from '@playwright/test';
import { watchPage } from './helpers';

const slotCard = (page: Page, key: string) => page.locator(`[data-drop="${key}"]`).getAttribute('data-card-id');

async function open(page: Page, vp = '844x390'): Promise<void> {
  const [w, h] = vp.split('x').map(Number) as [number, number];
  await page.setViewportSize({ width: w + 40, height: h + 80 });
  await page.goto(`./?dev=1#screens/army-warn/mid/${vp}`);
  await expect(page.getByTestId('wp-board')).toBeVisible({ timeout: 30_000 });
  // Let the loadout's flip-in finish.
  await page.waitForTimeout(700);
}

type Pt = { x: number; y: number };

/** One finger along the points, through the DevTools protocol, so Chromium applies touch-action like on a phone. */
async function swipe(page: Page, points: Pt[], steps = 8): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [points[0]!] });
  for (let k = 1; k < points.length; k++) {
    const a = points[k - 1]!;
    const b = points[k]!;
    for (let i = 1; i <= steps; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: a.x + ((b.x - a.x) * i) / steps, y: a.y + ((b.y - a.y) * i) / steps }] });
      await page.waitForTimeout(16);
    }
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

async function centre(page: Page, selector: string): Promise<{ x: number; y: number }> {
  const box = (await page.locator(selector).first().boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + Math.min(box.height / 2, 40) };
}

test.describe('Army deck builder', () => {
  test('card + Use equips in 2 taps; tap-tap places into the tapped slot; Undo reverses both', async ({ page }) => {
    const problems = watchPage(page);
    await open(page);
    expect(await slotCard(page, 'unit-3')).toBeNull();
    await page.getByTestId('cand-mammoth_matriarch').click();
    await page.getByTestId('card-use').click();
    await expect.poll(() => slotCard(page, 'unit-3')).toBe('mammoth_matriarch');
    await expect(page.getByTestId('cand-mammoth_matriarch')).toHaveClass(/is-equipped/);

    await page.getByTestId('cand-sabertooth').click();
    await expect(page.locator('[data-drop="unit-5"]')).toHaveClass(/is-drop-valid/);
    await page.locator('[data-drop="unit-5"] button').click();
    await expect.poll(() => slotCard(page, 'unit-5')).toBe('sabertooth');

    await page.getByTestId('army-undo').click();
    await expect.poll(() => slotCard(page, 'unit-5')).toBeNull();
    await page.getByTestId('army-undo').click();
    await expect.poll(() => slotCard(page, 'unit-3')).toBeNull();
    expect(problems.errors).toEqual([]);
  });

  test('a mouse drag drops a card on a slot; dropping outside returns it', async ({ page }) => {
    await open(page, '1280x720');
    const from = await centre(page, '[data-army-cell="drum_shaman"] .ui-card__frame');
    const to = await centre(page, '[data-drop="unit-4"]');
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x - 20, from.y, { steps: 3 });
    await expect(page.locator('.ui-drag-ghost')).toHaveCount(1);
    await expect(page.locator('[data-drop="unit-4"]')).toHaveClass(/is-drop-valid/);
    await page.mouse.move(to.x, to.y, { steps: 8 });
    await page.mouse.up();
    await expect.poll(() => slotCard(page, 'unit-4')).toBe('drum_shaman');
    await expect(page.locator('.ui-drag-ghost')).toHaveCount(0);

    // Released over nothing: the card flies back, nothing changes.
    const back = await centre(page, '[data-army-cell="spear_hunter"] .ui-card__frame');
    await page.mouse.move(back.x, back.y);
    await page.mouse.down();
    await page.mouse.move(back.x - 200, back.y + 200, { steps: 6 });
    await page.mouse.up();
    await expect(page.locator('.ui-drag-ghost')).toHaveCount(0);
    expect(await slotCard(page, 'unit-5')).toBeNull();
  });

  test('on a phone a sideways finger drag equips, a vertical swipe scrolls the grid instead', async ({ browser }) => {
    const context = await browser.newContext({ hasTouch: true, isMobile: false });
    const page = await context.newPage();
    await open(page);
    const grid = page.getByTestId('wp-cards');
    const top0 = await grid.evaluate((el) => el.scrollTop);
    const start = await centre(page, '[data-army-cell="sabertooth"] .ui-card__frame');
    await swipe(page, [start, { x: start.x + 4, y: start.y - 120 }]);
    await page.waitForTimeout(300);
    expect(await grid.evaluate((el) => el.scrollTop)).toBeGreaterThan(top0);
    await expect(page.locator('.ui-drag-ghost')).toHaveCount(0);
    expect(await slotCard(page, 'unit-3')).toBeNull();

    await grid.evaluate((el) => el.scrollTo(0, 0));
    const from = await centre(page, '[data-army-cell="mammoth_matriarch"] .ui-card__frame');
    const to = await centre(page, '[data-drop="unit-3"]');
    // A real finger starts sideways toward the slots, then goes where it likes.
    await swipe(page, [from, { x: from.x - 40, y: from.y }, to]);
    await expect.poll(() => slotCard(page, 'unit-3')).toBe('mammoth_matriarch');
    await context.close();
  });

  test('Info and Upgrade open Card detail; Upgrade arrives in its confirm state', async ({ page }) => {
    await open(page);
    await page.getByTestId('cand-sabertooth').click();
    await page.getByTestId('card-upgrade').click();
    await expect(page.getByTestId('card-upgrade-btn')).toContainText('Confirm');
    await page.getByTestId('back').click();
    await expect(page.getByTestId('wp-board')).toBeVisible();
    await page.getByTestId('cand-bonker').click();
    await page.getByTestId('card-info').click();
    await expect(page.getByTestId('card-stage')).toBeVisible();
  });
});
