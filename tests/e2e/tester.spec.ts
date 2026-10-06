/**
 * The test profile (`?tester=1`, owner request 2026-10-06) on a phone in landscape: pick Everything
 * unlocked, confirm, and the page reloads into Home with the full hub, without `tester=1`, ready to
 * start a Long War battle. Without the flag no dialog shows.
 */
import { expect, test } from '@playwright/test';
import { watchPage } from './helpers';

test.use({ viewport: { width: 844, height: 390 }, hasTouch: true });

test.describe('test profile', () => {
  test('Everything unlocked: confirm, reload into the full Home, start a Long War', async ({ page }) => {
    test.setTimeout(120_000);
    const problems = watchPage(page);
    await page.goto('./?tester=1');
    const dialog = page.getByTestId('tester-dialog');
    await expect(dialog).toBeVisible({ timeout: 30_000 });
    await expect(dialog.getByTestId('tester-everything')).toBeVisible();
    await expect(dialog.getByTestId('tester-midGame')).toBeVisible();
    await expect(dialog.getByTestId('tester-cancel')).toBeVisible();

    await dialog.getByTestId('tester-everything').click();
    await expect(dialog.getByTestId('tester-confirm-text')).toHaveText('This replaces the progress saved in this browser. It cannot be undone.');
    await Promise.all([page.waitForURL((u) => !u.search.includes('tester'), { timeout: 30_000 }), dialog.getByTestId('tester-confirm').click()]);

    // Home after the reload: no dialog, no onboarding, the whole hub.
    await expect(page.getByTestId('play')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('tester-dialog')).toHaveCount(0);
    expect(new URL(page.url()).searchParams.has('tester')).toBe(false);
    await expect(page.getByTestId('home-modes')).toBeVisible();
    await expect(page.getByTestId('home-campaign')).toBeVisible();
    await expect(page.getByTestId('capsule-tray')).toBeVisible();
    await expect(page.getByTestId('tab-capsules')).toBeVisible();
    const lengths = page.getByTestId('home-format').getByRole('radio');
    await expect(lengths).toHaveCount(4);
    await expect(page.getByTestId('home-format').locator('.is-locked')).toHaveCount(0);

    // The save is the test profile, written through the store (it survives the reload).
    const flagged = await page.evaluate(() => Object.keys(localStorage).some((k) => (localStorage.getItem(k) ?? '').includes('tester.profile')));
    expect(flagged).toBe(true);

    // Long War, then Battle: the VS screen and the battle start.
    await page.getByTestId('home-format').locator('[data-format="full"]').click();
    await expect(page.getByTestId('home-format').locator('[data-format="full"]')).toHaveAttribute('aria-checked', 'true');
    await page.getByTestId('play').click();
    await expect(page.getByTestId('battle')).toBeVisible({ timeout: 45_000 });
    expect(problems.errors).toEqual([]);
  });

  test('without the flag no dialog shows; Cancel drops the flag and keeps the save', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByTestId('app')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('tester-dialog')).toHaveCount(0);
    await page.goto('./?tester=1');
    await expect(page.getByTestId('tester-dialog')).toBeVisible({ timeout: 30_000 });
    await page.getByTestId('tester-cancel').click();
    await expect(page.getByTestId('tester-dialog')).toHaveCount(0);
    expect(new URL(page.url()).searchParams.has('tester')).toBe(false);
    const flagged = await page.evaluate(() => Object.keys(localStorage).some((k) => (localStorage.getItem(k) ?? '').includes('tester.profile')));
    expect(flagged).toBe(false);
  });
});
