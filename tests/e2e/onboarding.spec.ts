/**
 * The first session end to end (DESIGN A8, A9 flow, C5 items 1-6; B13 steps 2, 3 and 5):
 * a fresh profile taps Play once into match 1 vs Old Grogg (autopilot), sees a "Starter Capsule" on
 * the Result, opens capsule 1, plays match 2 vs Pip, opens capsule 2, does the one forced upgrade
 * (Bonker to L2, "+5% HP and damage") and lands on Home.
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
  await page.getByTestId('capsule-done').click();
  await expect(page.getByTestId('capsule-screen')).toHaveCount(0);
}

test.describe('first session (A8)', () => {
  test('match 1 → capsule 1 → match 2 → capsule 2 → forced upgrade → Home', async ({ page }) => {
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

    // Match 2 waits behind one big Play (onboarding keeps Quick Battle secondary).
    await expect(page.getByTestId('play')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('play')).toHaveClass(/ab-btn--gold/);
    await page.getByTestId('play').click();
    await playToResult(page);
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

    // Home, and a reload stays there (the step and the upgrade are saved).
    await expect(page.getByTestId('battle-button')).toBeVisible({ timeout: 20_000 });
    await page.reload();
    await expect(page.getByTestId('battle-button')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('first-upgrade')).toHaveCount(0);
    expect(problems.errors).toEqual([]);
  });
});
