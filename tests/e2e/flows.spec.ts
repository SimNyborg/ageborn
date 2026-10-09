/**
 * The B13 end-to-end flows after boot (DESIGN B13 E2E steps 2-6). Each flow names the packages it needs
 * in `helpers.ts`; until they are wired it is skipped with that reason (Phase 1), and the integration
 * pass flips it on (Phase 2).
 *
 * 2. tutorial match 1 on autopilot (`?dev=1&autopilot=1` issues scripted commands)
 * 3. capsule 1 opens (3b: the honesty copy, the odds panel and a reload mid-animation)
 * 4. reload keeps state
 * 5. Home renders
 * 6. a Skirmish starts and ends via dev fast-forward (6a: the Quick Battle dev route until Skirmish is
 *    wired, docs/requests/wp11-e2e-hooks.md)
 *
 * Plus the visibility pause (C5 #20), which needs a running battle.
 */
import { expect, test, type Page } from '@playwright/test';
import { fastForward, pastOnboarding, requireFlow, watchPage } from './helpers';

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
    // playToResult polls for up to 90 s; software WebGL under load needs more than the default 30 s (G3).
    test.setTimeout(120_000);
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
    // the clock may still wait for the decks' unit sheets (G7); the battle starts paused once they are in
    await expect(page.getByTestId('pause')).toBeVisible({ timeout: 30_000 });
    await page.getByTestId('resume').click();
    await expect(page.getByTestId('pause')).toHaveCount(0);
  });

  test('3. capsule 1 opens', async ({ page }) => {
    requireFlow('capsule');
    test.setTimeout(180_000);
    await winMatch1(page);
    await page.getByTestId('next').click();
    await expect(page.getByTestId('capsule-screen')).toBeVisible({ timeout: 20_000 });
    await expect
      .poll(
        async () => {
          const skip = page.getByTestId('capsule-skip');
          // Skip leaves when the summary comes, maybe between the look and the click (no endless wait)
          if (await skip.isVisible()) await skip.click({ timeout: 2_000 }).catch(() => undefined);
          else await page.getByTestId('capsule-screen').click({ timeout: 2_000 }).catch(() => undefined);
          return page.getByTestId('capsule-summary').isVisible();
        },
        { timeout: 60_000, intervals: [300] },
      )
      .toBe(true);
    await expect(page.getByTestId('capsule-summary-item').first()).toBeVisible();
  });

  test('3b. capsule 1: honest copy, odds panel, and a reload mid-animation keeps the result (A15.3, C5 #5, #29)', async ({ page }) => {
    requireFlow('capsule');
    test.setTimeout(180_000);
    const problems = watchPage(page);
    await winMatch1(page);
    await page.getByTestId('next').click();
    await expect(page.getByTestId('capsule-screen')).toBeVisible({ timeout: 20_000 });
    // The first capsule is a scripted Starter Capsule and says the result is already decided.
    await expect(page.getByTestId('capsule-kind')).toContainText(/Starter Capsule/i);
    await expect(page.getByTestId('capsule-honesty')).toContainText('decided when you earned this capsule');
    // The result was saved before the animation: a reload plays the same capsule again.
    const record = await page.evaluate(() => localStorage.getItem('ageborn.capsuleShow'));
    expect(record).not.toBeNull();
    await page.reload();
    await expect(page.getByTestId('capsule-screen')).toBeVisible({ timeout: 30_000 });
    expect(await page.evaluate(() => localStorage.getItem('ageborn.capsuleShow'))).toBe(record);
    // Odds: the honesty line, and "Set contents" for a Starter Capsule instead of bag odds.
    await page.getByTestId('capsule-pity').getByRole('button').click();
    await expect(page.getByTestId('capsule-odds-honesty')).toBeVisible();
    await expect(page.getByTestId('capsule-odds-set')).toBeVisible();
    await page.getByTestId('capsule-odds-close').click();
    await expect
      .poll(
        async () => {
          const skip = page.getByTestId('capsule-skip');
          // Skip leaves when the summary comes, maybe between the look and the click (no endless wait)
          if (await skip.isVisible()) await skip.click({ timeout: 2_000 }).catch(() => undefined);
          else await page.getByTestId('capsule-screen').click({ timeout: 2_000 }).catch(() => undefined);
          return page.getByTestId('capsule-summary').isVisible();
        },
        { timeout: 60_000, intervals: [300] },
      )
      .toBe(true);
    // Capsule 1 reveals Drum Shaman NEW (A8, C5 #5; the Spear Hunter is in the starter kit since 2026-09-29).
    await expect(page.locator('[data-testid=capsule-summary-item][data-card=drum_shaman]')).toBeVisible();
    await page.getByTestId('capsule-done').click();
    await expect(page.getByTestId('capsule-screen')).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('ageborn.capsuleShow'))).toBeNull();
    expect(problems.errors).toEqual([]);
  });

  test('4. reload keeps state', async ({ page }) => {
    requireFlow('reload');
    // Winning match 1 takes about 25-30 s under software WebGL; leave room for a loaded machine.
    test.setTimeout(90_000);
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
    // three tabs, the War Path and two page loads: a software-rendered WebKit under load needs more than
    // the default 30 s (G3)
    test.setTimeout(60_000);
    const problems = watchPage(page);
    await pastOnboarding(page);
    await expect(page.locator('[data-screen="home"]')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('play')).toBeVisible();
    // A6.3, A15.13: the Sundial card "n of 34 ready" with a clock time, never a countdown (Capsules
    // tab), the War Chest bar and at most 3 quests (Progress tab; ui-plan 2.2).
    await page.getByTestId('tab-capsules').click();
    // While free capsules remain the card only says so (FTUE audit 2026-10-01 #12).
    await expect(page.getByTestId('sundial')).toContainText(/\d+ of \d+ ready|None ready yet|don't use the Sundial/);
    await page.getByTestId('tab-progress').click();
    await expect(page.getByTestId('war-chest')).toContainText('War Chest');
    await expect(page.getByTestId('quest-3')).toHaveCount(0);
    await page.getByTestId('tab-battle').click();
    // Home is the Battle hub; the War Path campaign is one tap away on its card (owner decision 2026-09-30).
    await page.getByTestId('home-campaign').click();
    await expect(page.locator('[data-screen="warPath"]')).toBeVisible();
    await page.getByTestId('back').click();
    // A reload keeps the profile past onboarding: Home again, no tutorial battle.
    await page.goto('./');
    await expect(page.locator('[data-screen="home"]')).toBeVisible({ timeout: 20_000 });
    expect(problems.errors).toEqual([]);
  });

  test('6a. a Quick Battle (Short War vs AI) starts and ends via dev fast-forward', async ({ page }) => {
    requireFlow('quickBattle');
    // playToResult polls for up to 90 s; software WebGL under load needs more than the default 30 s.
    test.setTimeout(120_000);
    const problems = watchPage(page);
    await page.goto('./?dev=1&autopilot=1&quick=short');
    await playToResult(page);
    await expect(page.getByTestId('result-title')).toHaveAttribute('data-outcome', /^(win|loss|draw)$/);
    // Restart at the end of a match: a new Quick Battle starts.
    await page.getByTestId('play-again').click();
    await expect(page.getByTestId('battle')).toBeVisible();
    expect(problems.errors).toEqual([]);
  });

  test('6. a Skirmish starts and ends via dev fast-forward', async ({ page }) => {
    requireFlow('skirmish');
    test.setTimeout(180_000);
    await pastOnboarding(page);
    await expect(page.locator('[data-screen="home"]')).toBeVisible({ timeout: 20_000 });
    // Home's Modes panel, then "All options" for the full Mode select (ui-plan 4.1).
    await page.getByTestId('home-modes').click();
    await page.getByTestId('modes-all').click();
    // The Skirmish card (`mode-skirmish`) opens its setup dialog, which starts the match. Skirmish
    // unlocks after the onboarding matches (A8), so the profile must be past them when this is wired.
    await page.getByTestId('mode-skirmish').getByTestId('skirmish-open').click();
    await expect(page.getByTestId('skirmish-setup')).toBeVisible();
    await page.getByTestId('skirmish-start').click();
    // VS (2 s, skippable) shows the AI badge, then the battle starts.
    await expect(page.locator('[data-screen="vs"]')).toBeVisible({ timeout: 20_000 });
    await playToResult(page);
    await expect(page.getByTestId('result-title')).toHaveAttribute('data-outcome', /win|loss|draw/);
    // Rewards are staged; a tap skips; Home returns to Home.
    const skip = page.getByTestId('result-skip');
    // The skip button leaves once the staging ends, so it can vanish between the check and the click.
    if (await skip.isVisible()) await skip.click({ timeout: 5_000 }).catch(() => undefined);
    await page.getByTestId('result-home').click();
    await expect(page.locator('[data-screen="home"]')).toBeVisible();
  });
});
