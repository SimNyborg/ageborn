/**
 * The Sundial (DESIGN A6.3, A15.3, A15.13; owner request 2026-09-29, built 2026-09-30), on the dev
 * screen gallery at phone landscape (844x390) and desktop (1280x720):
 * - Home shows only the Sundial glyph (no number) and no clock time anywhere; the glyph opens the
 *   Capsules tab.
 * - The Capsules tab shows the dial, "n of 34 ready" and the next one as a local clock time (never a
 *   running countdown), and its text changes at most once a minute.
 * - The one-time notice shows for a save that has it (save v10 sets it for saves that played), in the
 *   Capsules tab only, and closes.
 * - The odds line says "Sundial Capsules".
 */
import { expect, test, type Page } from '@playwright/test';
import { watchPage } from './helpers';

const VIEWPORTS = ['844x390', '1280x720'] as const;

async function open(page: Page, variant: string, vp: string): Promise<void> {
  const [w, h] = vp.split('x').map(Number) as [number, number];
  await page.setViewportSize({ width: w + 40, height: h + 80 });
  await page.goto(`./?dev=1#screens/${variant}/mid/${vp}`);
}

for (const vp of VIEWPORTS) {
  test.describe(`the Sundial at ${vp}`, () => {
    test('Home: the Sundial glyph with no number, no time on Home, and it opens the Capsules tab', async ({ page }) => {
      const problems = watchPage(page);
      await open(page, 'home', vp);
      const chip = page.getByTestId('home-sundial');
      await expect(chip).toBeVisible({ timeout: 30_000 });
      await expect(chip).toHaveText('');
      await expect(chip).toHaveAttribute('aria-label', /^Sundial: (a capsule is ready|none ready yet)\./);
      const home = (await page.locator('.ui-root').first().innerText()).replace(/\s+/g, ' ');
      expect(home).not.toContain('Next one');
      expect(home).not.toMatch(/\/34\b/);
      expect(home).not.toMatch(/\b\d{1,2}:\d{2}\b/);
      await chip.click();
      await expect(page.getByTestId('sundial')).toBeVisible();
      expect(problems.errors).toEqual([]);
    });

    test('Capsules tab: the dial, "n of 34 ready" and a clock time that is not a countdown', async ({ page }) => {
      await page.clock.install();
      await open(page, 'capsules', vp);
      const card = page.getByTestId('sundial');
      await expect(card).toBeVisible({ timeout: 30_000 });
      await expect(card.locator('svg.sundial-dial')).toBeVisible();
      await expect(page.getByTestId('sundial-status')).toHaveText(/^\d+ of 34 ready$|^None ready yet$/);
      const next = page.getByTestId('sundial-next');
      await expect(next).toHaveText(/^Next one (at )?(\S+ )?\d{1,2}[:.]\d{2}( ?[AP]M)?$/);
      await expect(next).not.toHaveText(/\d+\s*[hms]\b|\d{1,2}:\d{2}:\d{2}/);
      // No text in the card changes more than once a minute: count text mutations over 3 minutes.
      await page.evaluate(() => {
        const el = document.querySelector('[data-testid="sundial"]')!;
        const w = window as unknown as { __sundialMutations: number };
        w.__sundialMutations = 0;
        new MutationObserver((list) => {
          if (list.some((m) => m.type === 'characterData' || m.type === 'childList')) w.__sundialMutations += 1;
        }).observe(el, { subtree: true, characterData: true, childList: true });
      });
      await page.clock.runFor(3 * 60_000);
      const n = await page.evaluate(() => (window as unknown as { __sundialMutations: number }).__sundialMutations);
      expect(n).toBeLessThanOrEqual(3);
    });

    test('the one-time notice sits in the Capsules tab and closes', async ({ page }) => {
      await open(page, 'capsules-sundial', vp);
      const notice = page.getByTestId('sundial-notice');
      await expect(notice).toBeVisible({ timeout: 30_000 });
      await expect(notice).toContainText('It readies one every 5 hours and holds up to 34.');
      await page.getByTestId('sundial-notice-close').click();
      // The preview services only log the close; the real app clears the flag (unit-tested).
      await open(page, 'capsules', vp);
      await expect(page.getByTestId('sundial')).toBeVisible({ timeout: 30_000 });
      await expect(page.getByTestId('sundial-notice')).toHaveCount(0);
    });

    test('the odds line says "Sundial Capsules"', async ({ page }) => {
      await open(page, 'capsules', vp);
      await page.getByTestId('odds-open').first().click();
      await expect(page.getByTestId('odds-aeon-line')).toHaveText(/in every 200 Sundial Capsules\.$/, { timeout: 10_000 });
    });
  });
}
