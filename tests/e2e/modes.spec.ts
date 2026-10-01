/**
 * Ladder, Conquest and the replay viewer in the browser (DESIGN A6.3 format picker, A6.8 AI opponent,
 * A6.10 Conquest board, A7.1 AI labels, A9 #14 replay viewer). The profile is moved past onboarding
 * into Arena 3 with the dev controller (`?dev=1&game=1`), so every mode is open.
 */
import { expect, test, type Page } from '@playwright/test';
import { fastForward, watchPage } from './helpers';

async function veteranHome(page: Page): Promise<void> {
  await page.goto('./?dev=1&game=1');
  await page.waitForFunction(() => !!(window as unknown as { __agebornDev?: unknown }).__agebornDev, null, { timeout: 60_000 });
  await page.evaluate(() => {
    type C = { save: { value: Record<string, unknown> & { tutorial: object; trophies: object; flags: object } }; setSave(s: unknown, o?: unknown): void; showTitle(): void };
    const c = (window as unknown as { __agebornDev: { controller: C } }).__agebornDev.controller;
    const s = c.save.value;
    const warPath = { ...(s['warPath'] as object), legacy: true };
    c.setSave(
      { ...s, warPath, matchesPlayed: 30, arenaIndex: 2, tutorial: { ...s.tutorial, step: 4 }, trophies: { ...s.trophies, current: 450, best: 450 }, flags: { ...s.flags, 'tutorial.warPlanPrompt': true } },
      { immediate: true },
    );
    c.showTitle();
  });
  await expect(page.getByTestId('play')).toBeVisible({ timeout: 20_000 });
}

/** Home's Modes panel, then "All options" for the full Mode select (ui-plan 4.1). */
async function modeSelect(page: Page): Promise<void> {
  await page.getByTestId('home-modes').click();
  await page.getByTestId('modes-all').click();
}

test.describe('modes and replays', () => {
  test('ladder with the format picker vs an AI, then its replay', async ({ page }) => {
    test.setTimeout(180_000);
    const problems = watchPage(page);
    await veteranHome(page);
    await modeSelect(page);
    // Arena 3: the format picker offers every ladder length (A6.3, A2.10: Short, Medium, Long, Last Base Standing).
    const picker = page.getByTestId('ladder-format');
    await expect(picker.getByRole('radio')).toHaveCount(4);
    await picker.getByRole('radio').first().click();
    await page.getByTestId('ladder-start').click();
    // VS: the opponent is an AI General (A7.1).
    await expect(page.getByTestId('vs-foe').getByTestId('ai-badge')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('battle')).toBeVisible({ timeout: 30_000 });
    await expect
      .poll(
        async () => {
          await fastForward(page, 2_000);
          return page.getByTestId('result-title').count();
        },
        { timeout: 90_000, intervals: [250] },
      )
      .toBeGreaterThan(0);
    // The result names the AI opponent and offers the replay of this match (ring of 20).
    await page.getByTestId('result-replay').click();
    await expect(page.getByTestId('replay')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('replay-badge')).toBeVisible();
    const t0 = await page.getByTestId('replay-time').textContent();
    // The controls step aside while the replay plays; any key or pointer move brings them back.
    await page.keyboard.press('Shift');
    await expect(page.getByTestId('replay-controls')).not.toHaveClass(/is-idle/);
    await page.getByTestId('replay-speed-4').click({ force: true });
    await expect.poll(() => page.getByTestId('replay-time').textContent(), { timeout: 15_000 }).not.toBe(t0);
    await page.keyboard.press('Shift');
    await page.getByTestId('replay-back').click({ force: true });
    await expect(page.getByTestId('play')).toBeVisible({ timeout: 15_000 });
    expect(problems.errors).toEqual([]);
  });

  test('the mode switcher selects Quick Battle; Battle plays it vs a labelled AI (no search)', async ({ page }) => {
    const problems = watchPage(page);
    await veteranHome(page);
    await expect(page.getByTestId('home-modes')).toContainText('Ladder');
    await page.getByTestId('home-modes').click();
    await page.getByTestId('mode-quick').click();
    await expect(page.getByTestId('modes-sheet')).toHaveCount(0);
    await expect(page.getByTestId('home-modes')).toContainText('Quick');
    await expect(page.getByTestId('home-opponent').getByTestId('ai-badge')).toBeVisible();
    await page.getByTestId('play').click();
    await expect(page.getByTestId('vs-foe').getByTestId('ai-badge')).toBeVisible({ timeout: 10_000 });
    expect(problems.errors).toEqual([]);
  });

  test('the Conquest board lists AI Generals', async ({ page }) => {
    await veteranHome(page);
    await modeSelect(page);
    await page.getByTestId('conquest-open').click();
    await expect(page.getByTestId('cq-board')).toBeVisible();
    await expect(page.getByTestId('cq-gen-pip')).toBeVisible();
    expect(await page.getByTestId('cq-board').getByTestId('ai-badge').count()).toBeGreaterThan(0);
  });
});
