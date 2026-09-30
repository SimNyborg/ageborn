/**
 * The first session end to end (DESIGN A8, A9 flow, C5 items 1-6; B13 steps 2, 3 and 5; ui-plan 2.7;
 * owner decision 2026-09-30): a fresh profile lands on the Battle hub, whose Battle starts the
 * training match vs Old Grogg (autopilot; War Path Stone L1), sees a "Starter Capsule" on the Result,
 * opens capsule 1, is back on the hub (Army unlocked; edits the War Plan), plays match 2 vs Pip from
 * Battle (Stone L2), opens capsule 2, does the one forced upgrade (Bonker to L2, "+5% HP and damage"),
 * and back on the hub (now the Ladder, with the Campaign card) opens the Wardrobe Crate on the newly
 * opened Capsules tab.
 */
import { expect, test, type Page } from '@playwright/test';
import { fastForward, requireFlow, watchPage } from './helpers';

async function playToResult(page: Page): Promise<void> {
  await expect(page.getByTestId('battle')).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(
      async () => {
        await fastForward(page, 2_000);
        return page.getByTestId('result').isVisible();
      },
      { timeout: 120_000, intervals: [250] },
    )
    .toBe(true);
}

async function openCapsule(page: Page): Promise<void> {
  await expect(page.getByTestId('capsule-screen')).toBeVisible({ timeout: 20_000 });
  await expect
    .poll(
      async () => {
        const skip = page.getByTestId('capsule-skip');
        if (await skip.isVisible()) await skip.click();
        else await page.getByTestId('capsule-screen').click({ position: { x: 20, y: 20 } });
        return page.getByTestId('capsule-summary').isVisible();
      },
      { timeout: 60_000, intervals: [300] },
    )
    .toBe(true);
  // A15.3: scripted capsules 1-5 are Starter Capsules on the summary too (not their tier's name).
  await expect(page.getByTestId('capsule-summary').getByRole('heading')).toHaveText('Starter Capsule');
  await page.getByTestId('capsule-done').click();
  await expect(page.getByTestId('capsule-screen')).toHaveCount(0);
}

test.describe('first session (A8)', () => {
  test('Battle → match 1 → capsule 1 → the hub (Army) → match 2 → capsule 2 → forced upgrade → the Ladder hub (Capsules, crate, Campaign)', async ({ page }) => {
    requireFlow('home');
    test.setTimeout(420_000);
    const problems = watchPage(page);
    // A fresh profile: one tap on Play starts match 1 (the dev autopilot plays it).
    await page.goto('./?dev=1&autopilot=1');
    await playToResult(page);
    await expect(page.getByTestId('result-title')).toHaveAttribute('data-outcome', 'win');
    // A15.3: the scripted capsule is labelled as a Starter Capsule; no raw ids on the Result.
    await expect(page.locator('[data-testid=result-reward][data-kind=capsule]')).toContainText('Starter Capsule');
    await expect(page.getByTestId('result-rewards')).not.toContainText('Quest progress');
    await page.getByTestId('next').click();
    await openCapsule(page);

    // ui-plan 2.7 ~3:40: after match 1 and capsule 1 the Battle hub is Home. The tabs rise with Army
    // open (its unlock pointer), and Battle offers match 2 vs Pip (labelled AI).
    await expect(page.getByTestId('play')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('play')).toHaveText(/battle/i);
    await expect(page.getByTestId('home-opponent')).toContainText('Pip');
    await expect(page.getByTestId('home-opponent').getByTestId('ai-badge')).toBeVisible();
    await expect(page.getByTestId('tab-army')).not.toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByTestId('tab-capsules')).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByTestId('unlock-army')).toBeVisible({ timeout: 10_000 });

    // Army (ui-plan 4.2): take a card out of the Stone Age loadout (tap it, Remove) and put it back
    // (tap it in the grid, Use).
    await page.getByTestId('tab-army').click();
    await expect(page.getByTestId('wp-board')).toContainText('Spear Hunt');
    await page.locator('[data-testid="slot-unit-3"] .ui-card').click();
    await page.getByTestId('remove-unit-3').click();
    await expect(page.getByTestId('wp-board')).not.toContainText('Spear Hunt');
    await page.getByTestId('cand-spear_hunter').click();
    await page.getByTestId('card-use').click();
    await expect(page.getByTestId('wp-board')).toContainText('Spear Hunt');
    await page.getByTestId('tab-battle').click();

    // Match 2 vs Pip starts from Home's Battle (VS first).
    await page.getByTestId('play').click();
    await expect(page.locator('[data-screen="vs"]')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('vs-foe')).toContainText('Pip');
    await playToResult(page);
    await expect(page.locator('[data-testid=result-reward][data-kind=capsule]')).toContainText('Starter Capsule');
    await page.getByTestId('next').click();
    await openCapsule(page);

    // A8 ~9:00: one forced upgrade, Bonker to L2, with the slam and "+5% HP and damage".
    await expect(page.getByTestId('first-upgrade')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('first-upgrade-level')).toHaveText('Lv 1');
    await page.getByTestId('first-upgrade-go').click();
    await expect(page.getByTestId('first-upgrade-gain')).toHaveText('+5% HP and damage');
    await expect(page.getByTestId('first-upgrade-level')).toHaveText('Lv 2');
    await page.getByTestId('first-upgrade-continue').click();
    await expect(page.getByTestId('first-upgrade')).toHaveCount(0);

    // Home: the onboarding is over, so the hub is the Ladder now (trophies, the Campaign card), and
    // the second win opens the Capsules tab, where the training match's Wardrobe Crate waits.
    await expect(page.getByTestId('play')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('home-trophies')).toBeVisible();
    await expect(page.getByTestId('home-campaign')).toBeVisible();
    await page.getByTestId('tab-capsules').click();
    // The drums idle-bob (life), so the click does not wait for a still frame.
    await page.getByTestId('capsules-tab').locator('[data-testid^=crate-]').first().click({ force: true });
    await expect(page.getByTestId('capsule-screen')).toBeVisible({ timeout: 20_000 });
    await expect
      .poll(
        async () => {
          const skip = page.getByTestId('capsule-skip');
          if (await skip.isVisible()) await skip.click();
          else await page.getByTestId('capsule-screen').click({ position: { x: 20, y: 20 } });
          return page.getByTestId('capsule-summary').isVisible();
        },
        { timeout: 60_000, intervals: [300] },
      )
      .toBe(true);
    await page.getByTestId('capsule-done').click();
    await expect(page.getByTestId('capsule-screen')).toHaveCount(0);

    // A reload stays on Home (the step, the stars and the upgrade are saved); the two onboarding
    // matches show as beaten War Path levels on the campaign map.
    await page.reload();
    await expect(page.getByTestId('play')).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('home-campaign').click();
    await expect(page.getByTestId('wp-node-wp.stone.l02')).toHaveAttribute('data-state', 'beaten');
    await expect(page.getByTestId('wp-play')).toHaveText(/level 3/i);
    await page.getByTestId('back').click();
    await expect(page.locator('[data-screen="home"]')).toBeVisible();
    await expect(page.getByTestId('first-upgrade')).toHaveCount(0);
    expect(problems.errors).toEqual([]);
  });
});
