/**
 * The B13 end-to-end flows after boot (DESIGN B13 E2E steps 2-6). Each flow names the packages it needs
 * in `helpers.ts`; until they are wired it is skipped with that reason (Phase 1), and the integration
 * pass flips it on (Phase 2).
 *
 * 2. tutorial match 1 on autopilot (`?dev=1&autopilot=1` issues scripted commands)
 * 3. capsule 1 opens
 * 4. reload keeps state
 * 5. Home renders
 * 6. a Skirmish starts and ends via dev fast-forward (6a: the Quick Battle dev route until Skirmish is
 *    wired, docs/requests/wp11-e2e-hooks.md)
 *
 * Plus the visibility pause (C5 #20), which needs a running battle.
 */
import { expect, test, type Page } from '@playwright/test';
import { fastForward, requireFlow, watchPage } from './helpers';

/** Fast-forwards the battle on screen until the result screen shows. */
async function playToResult(page: Page): Promise<void> {
  await expect(page.getByTestId('battle')).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(
      async () => {
        const ran = await fastForward(page, 2_000);
        expect(ran, 'window.__agebornDev.fastForward is missing (?dev=1)').toBeGreaterThanOrEqual(0);
        return page.getByTestId('result').isVisible();
      },
      { timeout: 90_000, intervals: [250] },
    )
    .toBe(true);
}

/** Plays onboarding match 1 on the dev autopilot and returns at its result screen. */
async function winMatch1(page: Page): Promise<void> {
  await page.goto('./?dev=1&autopilot=1');
  await playToResult(page);
  await expect(page.getByTestId('result-title')).toHaveAttribute('data-outcome', 'win');
}

test.describe('B13 flows', () => {
  test('2. tutorial match 1 on autopilot', async ({ page }) => {
    requireFlow('autopilot');
    const problems = watchPage(page);
    await winMatch1(page);
    expect(problems.errors).toEqual([]);
  });

  test('the battle pauses when the tab is hidden (C5 #20)', async ({ page }) => {
    requireFlow('autopilot');
    await page.goto('./?dev=1&autopilot=1');
    await expect(page.getByTestId('battle')).toBeVisible({ timeout: 30_000 });
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(page.getByTestId('pause')).toBeVisible();
    await page.getByTestId('resume').click();
    await expect(page.getByTestId('pause')).toHaveCount(0);
  });

  test('3. capsule 1 opens', async ({ page }) => {
    requireFlow('capsule');
    await winMatch1(page);
    await page.getByTestId('next').click();
    await expect(page.getByTestId('capsule-screen')).toBeVisible({ timeout: 20_000 });
    await expect
      .poll(
        async () => {
          const skip = page.getByTestId('capsule-skip');
          if (await skip.isVisible()) await skip.click();
          else await page.getByTestId('capsule-screen').click();
          return page.getByTestId('capsule-summary').isVisible();
        },
        { timeout: 60_000, intervals: [300] },
      )
      .toBe(true);
    await expect(page.getByTestId('capsule-summary-item').first()).toBeVisible();
  });

  test('4. reload keeps state', async ({ page }) => {
    requireFlow('reload');
    await winMatch1(page);
    const before = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('ageborn.save.')).length);
    expect(before).toBeGreaterThan(0);
    await page.goto('./');
    await expect(page.getByTestId('app')).toBeVisible({ timeout: 20_000 });
    // A fresh profile starts onboarding match 1 again; a kept one does not.
    await expect(page.getByTestId('battle')).toHaveCount(0);
    const after = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('ageborn.save.')).length);
    expect(after).toBe(before);
  });

  test('5. Home renders', async ({ page }) => {
    requireFlow('home');
    const problems = watchPage(page);
    await page.goto('./');
    await expect(page.getByTestId('home')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('battle-button')).toBeVisible();
    expect(problems.errors).toEqual([]);
  });

  test('6a. a Quick Battle (Short War vs AI) starts and ends via dev fast-forward', async ({ page }) => {
    requireFlow('quickBattle');
    const problems = watchPage(page);
    await page.goto('./?dev=1&autopilot=1&quick=short');
    await playToResult(page);
    await expect(page.getByTestId('result-title')).toHaveAttribute('data-outcome', /^(win|loss|draw)$/);
    expect(problems.errors).toEqual([]);
  });

  test('6. a Skirmish starts and ends via dev fast-forward', async ({ page }) => {
    requireFlow('skirmish');
    await page.goto('./');
    await expect(page.getByTestId('home')).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('battle-button').click();
    // The Skirmish card (`mode-skirmish`) opens its setup dialog, which starts the match. Skirmish
    // unlocks after the onboarding matches (A8), so the profile must be past them when this is wired.
    await page.getByTestId('mode-skirmish').getByTestId('skirmish-open').click();
    await expect(page.getByTestId('skirmish-setup')).toBeVisible();
    await page.getByTestId('skirmish-start').click();
    await playToResult(page);
    await expect(page.getByTestId('result-title')).toHaveAttribute('data-outcome', /win|loss|draw/);
  });
});
