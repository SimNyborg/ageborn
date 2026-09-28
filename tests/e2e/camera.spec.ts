/**
 * The A17.14 camera row: on an 844 × 390 phone viewport, auto-follow keeps the contact point (the
 * midpoint of the two ground fronts) on screen at least 90% of the match time, bot vs bot.
 *
 * The dev autopilot plays your side of a Quick Battle (`?dev=1&autopilot=1&quick=short`) against the
 * AI General, at 2x, and the spec samples the battle view's minimap snapshot (`__agebornDev.view()`:
 * the camera window and both fronts) every 250 ms. Software WebGL renders a few frames per second, so
 * the default run is one match sampled for 90 s; `E2E_CAMERA_MATCHES=10 E2E_CAMERA_SECONDS=0` runs the
 * full A17.14 size (10 whole matches).
 */
import { expect, test, type Page } from '@playwright/test';
import { requireFlow, watchPage } from './helpers';

const MATCHES = Number(process.env['E2E_CAMERA_MATCHES'] ?? 1);
/** Real seconds sampled per match; 0 = until the match ends. */
const SECONDS = Number(process.env['E2E_CAMERA_SECONDS'] ?? 90);
const SAMPLE_MS = 250;

interface Sample {
  contact: number | null;
  left: number;
  right: number;
  ended: boolean;
}

async function sample(page: Page): Promise<Sample | null> {
  return page.evaluate(() => {
    type Snap = { view: { left: number; right: number }; fronts: [number | null, number | null] };
    type Dev = { view(): { minimap(): Snap } | null; controller: { route: { peek(): { id: string } } } };
    const dev = (window as unknown as { __agebornDev?: Dev }).__agebornDev;
    const view = dev?.view();
    const route = dev?.controller.route.peek().id;
    if (!view) return route === 'battle' ? null : { contact: null, left: 0, right: 0, ended: true };
    const m = view.minimap();
    const [a, b] = m.fronts;
    return { contact: a !== null && b !== null ? (a + b) / 2 : null, left: m.view.left, right: m.view.right, ended: route !== 'battle' };
  });
}

test.describe('camera auto-follow (A17.14)', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  test.beforeEach(() => requireFlow('quickBattle'));

  test('keeps the contact point on screen at least 90% of the time on a phone', async ({ page }) => {
    test.setTimeout(MATCHES * ((SECONDS > 0 ? SECONDS : 400) + 60) * 1000);
    const problems = watchPage(page);
    let withContact = 0;
    let onScreen = 0;
    for (let m = 0; m < MATCHES; m += 1) {
      await page.goto('./?dev=1&autopilot=1&quick=short');
      await expect(page.getByTestId('battle')).toBeVisible({ timeout: 30_000 });
      await page.waitForFunction(() => (window as unknown as { __agebornDev?: { view(): unknown } }).__agebornDev?.view() != null, null, { timeout: 30_000 });
      // 2x speed (A2.12), so a sampled minute covers two minutes of battle.
      await page.evaluate(() => {
        type Dev = { controller: { route: { peek(): { id: string; battle?: { session: { setSpeed(s: number): void } } } } } };
        (window as unknown as { __agebornDev?: Dev }).__agebornDev?.controller.route.peek().battle?.session.setSpeed(2);
      });
      const until = SECONDS > 0 ? Date.now() + SECONDS * 1000 : Number.POSITIVE_INFINITY;
      while (Date.now() < until) {
        const s = await sample(page);
        if (s?.ended) break;
        if (s && s.contact !== null) {
          withContact += 1;
          if (s.contact >= s.left && s.contact <= s.right) onScreen += 1;
        }
        await page.waitForTimeout(SAMPLE_MS);
      }
    }
    expect(withContact, 'the fronts met at least once').toBeGreaterThan(20);
    const share = onScreen / withContact;
    test.info().annotations.push({ type: 'contact on screen', description: `${(share * 100).toFixed(1)}% of ${withContact} samples` });
    expect(share).toBeGreaterThanOrEqual(0.9);
    expect(problems.errors).toEqual([]);
  });
});
