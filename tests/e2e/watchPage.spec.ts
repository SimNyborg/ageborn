/**
 * G2 (2026-10-08): `watchPage` ignores only WebKit's report of a request on this host that a main-frame
 * navigation aborted ("… due to access control checks.", see `isAbortedRequestNoise`), and only while that
 * navigation runs. A deliberate `console.error`, the same report outside a navigation and another host's
 * report all still count, so no real error can hide behind the filter.
 */
import { expect, test } from '@playwright/test';
import { isAbortedRequestNoise, NAVIGATION_GRACE_MS, watchPage } from './helpers';

test('the noise filter matches only this host\'s "access control checks" reports', () => {
  const host = 'localhost:4173';
  expect(isAbortedRequestNoise('Fetch API cannot load http://localhost:4173/ageborn/art/units/stone/bonker.hd.json due to access control checks.', host)).toBe(true);
  // Playwright's WebKit page error, cut at its first ':'
  expect(isAbortedRequestNoise('/localhost:4173/ageborn/art/units/bronze/javelineer.hd.json due to access control checks.', host)).toBe(true);
  expect(isAbortedRequestNoise('Fetch API cannot load https://cdn.example.com/x.json due to access control checks.', host)).toBe(false);
  expect(isAbortedRequestNoise('TypeError: undefined is not an object (evaluating a.b)', host)).toBe(false);
  expect(isAbortedRequestNoise('http://localhost:4173/x.json due to access control checks. And then more', host)).toBe(false);
  expect(isAbortedRequestNoise('due to access control checks.', '')).toBe(false);
});

test('a deliberate console.error still counts, and so does the report outside a navigation', async ({ page }) => {
  const problems = watchPage(page);
  await page.goto('./?dev=1');
  await page.waitForLoadState('domcontentloaded');
  // past the navigation's grace window
  await page.waitForTimeout(NAVIGATION_GRACE_MS + 300);
  await page.evaluate(() => console.error('deliberate error'));
  await page.evaluate(() => console.error(`Fetch API cannot load ${location.origin}/ageborn/x.json due to access control checks.`));
  await expect.poll(() => problems.errors.length).toBe(2);
  expect(problems.errors[0]).toBe('console: deliberate error');
  expect(problems.errors[1]).toContain('due to access control checks.');
});
