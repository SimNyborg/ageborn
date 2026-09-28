/**
 * Age Power targeting (owner decision "Age Power targeting", DESIGN A2.9, A2.12): drag the power from
 * its button onto the battlefield to fire it; drop it back on the HUD or press Escape to cancel; a tap
 * enters aiming mode (tap the field to fire, tap the button again to cancel). Drives the production
 * build with a real mouse, like a player.
 */
import { expect, test, type Page } from '@playwright/test';
import { fastForward, requireFlow, watchPage } from './helpers';

interface Ghost {
  x: number;
  width: number;
  valid: boolean;
  targets: number;
}

function ghost(page: Page): Promise<Ghost | null> {
  return page.evaluate(() => {
    type Dev = { view(): { powerGhost(): Ghost | null } | null };
    return (window as unknown as { __agebornDev?: Dev }).__agebornDev?.view()?.powerGhost() ?? null;
  });
}

/** A Quick Battle with the power charged (and the adaptive "power ready" hint already used up). */
async function readyPower(page: Page): Promise<{ x: number; y: number }> {
  await page.goto('./?dev=1&game=1');
  await page.waitForFunction(() => (window as unknown as { __agebornDev?: unknown }).__agebornDev !== undefined, null, { timeout: 30_000 });
  await page.evaluate(() => {
    type Save = { tutorial: { step: number; hintsShown?: Record<string, number> }; matchesPlayed: number };
    const c = (window as unknown as { __agebornDev: { controller: { save: { peek(): Save }; setSave(s: Save, o?: object): void } } }).__agebornDev.controller;
    const s = c.save.peek();
    c.setSave({ ...s, matchesPlayed: Math.max(5, s.matchesPlayed), tutorial: { ...s.tutorial, step: 4, hintsShown: { ...(s.tutorial.hintsShown ?? {}), powerReady: 3 } } }, { immediate: true });
  });
  await page.goto('./?dev=1&game=1&quick=short');
  const power = page.getByTestId('hud-power');
  await expect(power).toBeVisible({ timeout: 30_000 });
  expect(await fastForward(page, 1000)).toBeGreaterThan(0);
  await expect(power).toHaveAttribute('data-ready', 'true', { timeout: 20_000 });
  const b = await power.boundingBox();
  if (!b) throw new Error('no power button');
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

test.describe('Age Power: drag onto the battlefield', () => {
  test.beforeEach(() => requireFlow('quickBattle'));

  test('dropping back on the HUD or pressing Escape cancels; dragging onto the lane fires', async ({ page }) => {
    test.setTimeout(120_000);
    const problems = watchPage(page);
    const btn = await readyPower(page);
    const vp = page.viewportSize() ?? { width: 1280, height: 720 };
    const power = page.getByTestId('hud-power');

    // Drag out onto the lane: the power is in hand and its ghost shows, valid, on the field.
    await page.mouse.move(btn.x, btn.y);
    await page.mouse.down();
    await page.mouse.move(btn.x - 30, btn.y - 50, { steps: 4 });
    await page.mouse.move(vp.width * 0.5, vp.height * 0.5, { steps: 8 });
    await expect(power).toHaveAttribute('data-aim', 'dragging');
    // The token (a zero-size anchor at the pointer) carries the power's icon above the finger.
    await expect(page.getByTestId('hud-power-token').locator('.hud-power-token-core')).toBeVisible();
    await expect.poll(async () => (await ghost(page))?.valid ?? null).toBe(true);
    // Back over the tray: the ghost turns invalid and says so; releasing puts the power back.
    await page.mouse.move(vp.width * 0.4, vp.height * 0.93, { steps: 6 });
    await expect.poll(async () => (await ghost(page))?.valid ?? null).toBe(false);
    await expect(page.getByTestId('hud-power-token')).toContainText(/cancel/i);
    await page.mouse.up();
    await expect(power).toHaveAttribute('data-aim', 'idle');
    await expect.poll(() => ghost(page)).toBeNull();
    await expect(power).toHaveAttribute('data-ready', 'true');

    // Escape during a drag cancels too.
    await page.mouse.move(btn.x, btn.y);
    await page.mouse.down();
    await page.mouse.move(vp.width * 0.5, vp.height * 0.5, { steps: 8 });
    await expect(power).toHaveAttribute('data-aim', 'dragging');
    await page.keyboard.press('Escape');
    await expect(power).toHaveAttribute('data-aim', 'idle');
    await page.mouse.up();
    await expect(power).toHaveAttribute('data-ready', 'true');
    await expect(page.getByTestId('battle')).toBeVisible();

    // A tap enters aiming mode (the ghost waits on the field); a second tap on the button cancels.
    await page.mouse.click(btn.x, btn.y);
    await expect(power).toHaveAttribute('data-aim', 'aiming');
    await expect(page.getByTestId('hud-power-aiming')).toBeVisible();
    await expect.poll(async () => (await ghost(page))?.valid ?? null).toBe(true);
    await page.mouse.click(btn.x, btn.y);
    await expect(power).toHaveAttribute('data-aim', 'idle');
    await expect(power).toHaveAttribute('data-ready', 'true');

    // Drag onto the lane and let go: the power fires (its charge is spent).
    await page.mouse.move(btn.x, btn.y);
    await page.mouse.down();
    await page.mouse.move(vp.width * 0.55, vp.height * 0.5, { steps: 10 });
    await expect.poll(async () => (await ghost(page))?.valid ?? null).toBe(true);
    await page.mouse.up();
    await expect(power).toHaveAttribute('data-ready', 'false', { timeout: 10_000 });
    await expect.poll(() => ghost(page)).toBeNull();
    expect(problems.errors).toEqual([]);
  });

  test('a tap then a tap on the field fires', async ({ page }) => {
    test.setTimeout(120_000);
    const btn = await readyPower(page);
    const vp = page.viewportSize() ?? { width: 1280, height: 720 };
    const power = page.getByTestId('hud-power');
    await page.mouse.click(btn.x, btn.y);
    await expect(power).toHaveAttribute('data-aim', 'aiming');
    await page.mouse.click(vp.width * 0.6, vp.height * 0.5);
    await expect(power).toHaveAttribute('data-ready', 'false', { timeout: 10_000 });
    await expect(power).toHaveAttribute('data-aim', 'idle');
  });
});
