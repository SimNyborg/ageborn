/**
 * UI budget checks (docs/ui-plan.md 1.3; UI-0 and UI-1 acceptance in 6.2 and 6.3). Every screen is
 * measured in its **settled** state at the phone references 844 x 390, 844 x 340 (iOS Safari with
 * bars), 800 x 360 (common Android) and the desktop 1280 x 720:
 *
 * - small text: a visible text node under 11 px, or under 12 px outside a `[data-tag]`;
 * - small targets: a `button`, `[role=button]`, `a`, `input` or `[data-hit]` under 44 x 44 px
 *   (an allow-list with a reason per entry);
 * - primary count: more than one visible `[data-primary]`, or none where 2.4 names a primary;
 * - pulse count: more than one visible `[data-pulse]`, sampled every 250 ms;
 * - clipping: a `[data-clip-check]` whose content overflows it;
 * - page scroll: the UI root scrolls sideways;
 * - badges: more than 2 visible ready badges on Home.
 *
 * `strict` pages must pass: the component gallery (the shared Button, CardTile, tabs, chips) and the
 * UI-1 screens (Result, Card detail, Pause). The others report their violations as the backlog for
 * UI-2 to UI-4 (an annotation per page, and the JSON attachment), without failing, until their
 * phase flips them to strict. Mode select also gets the UA-01 hit test of its 11 picker buttons.
 *
 * Runs on the dev pages (`?dev=1#components/...`, `?dev=1#screens/...`), which frame a `.ui-root`
 * at the exact viewport size.
 */
import { expect, test, type Page } from '@playwright/test';

const VIEWPORTS = ['844x390', '844x340', '800x360', '1280x720'] as const;

interface PageSpec {
  name: string;
  /** Hash after `?dev=1#`, with `{vp}` for the viewport. */
  hash: string;
  strict: boolean;
  /** 2.4 names a primary for this screen: exactly one must be visible. */
  primary: boolean;
  home?: boolean;
  /** Click this first (for example a tab) and let it settle. */
  prepare?: (page: Page) => Promise<void>;
}

const PAGES: PageSpec[] = [
  { name: 'components', hash: 'components/{vp}', strict: true, primary: true },
  { name: 'components-shell', hash: 'components/{vp}/shell', strict: false, primary: true },
  { name: 'result-win', hash: 'screens/result-win/mid/{vp}', strict: true, primary: true },
  { name: 'result-loss', hash: 'screens/result-loss/mid/{vp}', strict: true, primary: true },
  { name: 'result-noCapsule', hash: 'screens/result-noCapsule/mid/{vp}', strict: true, primary: true },
  { name: 'card-pikeman', hash: 'screens/card-pikeman/mid/{vp}', strict: true, primary: true },
  { name: 'card-bonker', hash: 'screens/card-bonker/mid/{vp}', strict: true, primary: false },
  { name: 'pause-late', hash: 'screens/pause-late/mid/{vp}', strict: true, primary: true },
  // Home is the Battle hub (owner decision 2026-09-30, ui-plan 2.3); the War Path map is its sub-screen.
  { name: 'home', hash: 'screens/home/mid/{vp}', strict: true, primary: true, home: true },
  { name: 'home-new', hash: 'screens/home/new/{vp}', strict: true, primary: true, home: true },
  { name: 'home-maxed', hash: 'screens/home/maxed/{vp}', strict: true, primary: true, home: true },
  { name: 'home-first', hash: 'screens/home-first/mid/{vp}', strict: true, primary: true, home: true },
  { name: 'home-campaign', hash: 'screens/home-campaign/new/{vp}', strict: true, primary: true, home: true },
  { name: 'warPath', hash: 'screens/warPath/mid/{vp}', strict: true, primary: true },
  { name: 'warPath-new', hash: 'screens/warPath/new/{vp}', strict: true, primary: true },
  {
    name: 'level-preview',
    hash: 'screens/warPath/mid/{vp}',
    strict: true,
    primary: true,
    prepare: async (page) => {
      await page.click('[data-testid="level-plate"]');
    },
  },
  {
    name: 'level-locked',
    hash: 'screens/warPath/mid/{vp}',
    strict: true,
    primary: false,
    prepare: async (page) => {
      await page.click('[data-testid="wp-node-wp.bronze.l09"]');
    },
  },
  {
    name: 'modes',
    hash: 'screens/home/mid/{vp}',
    strict: true,
    primary: true,
    prepare: async (page) => {
      await page.click('[data-testid="home-modes"]');
    },
  },
  { name: 'capsules', hash: 'screens/capsules/mid/{vp}', strict: true, primary: false },
  { name: 'progress', hash: 'screens/progress/mid/{vp}', strict: true, primary: false },
  { name: 'result-warPath', hash: 'screens/result-warPath/mid/{vp}', strict: true, primary: true },
  // Backlog (UI-3, UI-4): reported, not failed.
  { name: 'modeSelect', hash: 'screens/modeSelect/mid/{vp}', strict: false, primary: false },
  { name: 'warPlan', hash: 'screens/warPlan/mid/{vp}', strict: true, primary: false },
  { name: 'army', hash: 'screens/army/mid/{vp}', strict: true, primary: false },
  { name: 'army-new', hash: 'screens/army-first/new/{vp}', strict: true, primary: false },
  { name: 'army-maxed', hash: 'screens/army/maxed/{vp}', strict: true, primary: false },
  {
    name: 'army-selected',
    hash: 'screens/army-warn/mid/{vp}',
    strict: true,
    primary: false,
    prepare: async (page) => {
      await page.click('[data-testid="cand-mammoth_matriarch"]');
    },
  },
  {
    name: 'army-slot',
    hash: 'screens/army-warn/mid/{vp}',
    strict: true,
    primary: false,
    prepare: async (page) => {
      await page.click('[data-testid="slot-unit-0"] .ui-card');
    },
  },
  { name: 'card-mammoth', hash: 'screens/card-mammoth_matriarch/mid/{vp}', strict: true, primary: false },
  { name: 'card-power', hash: 'screens/card-meteor_shower/mid/{vp}', strict: true, primary: false },
  { name: 'card-locked', hash: 'screens/card-friar/new/{vp}', strict: true, primary: false },
  // The Card Album (owner request 2026-09-30): the long Pokedex scroll, strict from its first build.
  { name: 'collection', hash: 'screens/collection/mid/{vp}', strict: true, primary: false },
  { name: 'collection-new', hash: 'screens/collection/new/{vp}', strict: true, primary: false },
  { name: 'customize-backdrops', hash: 'screens/customize-backdrops/mid/{vp}', strict: true, primary: false },
  { name: 'customize', hash: 'screens/customize-troops/mid/{vp}', strict: false, primary: false },
  { name: 'settings', hash: 'screens/settings/mid/{vp}', strict: false, primary: false },
];

/**
 * Small targets that are allowed, each with its reason (ui-plan 1.3 "an explicit allow-list with a
 * reason per entry"). Matched against the element's selector path.
 */
const TARGET_ALLOW: { match: RegExp; reason: string }[] = [
  { match: /\bui-sr\b/, reason: 'visually hidden skip button for screen readers (0 x 0 on purpose)' },
  { match: /\bui-toast__text\b/, reason: 'the toast text is a secondary dismiss; the toast itself is 44 tall' },
];

export interface Violation {
  check: 'text' | 'target' | 'primary' | 'pulse' | 'clip' | 'scroll' | 'badges';
  detail: string;
}

async function open(page: Page, hash: string, vp: string): Promise<void> {
  const [w, h] = vp.split('x').map(Number) as [number, number];
  await page.setViewportSize({ width: w + 40, height: h + 80 });
  await page.goto(`./?dev=1#${hash.replace('{vp}', vp)}`);
  await page.waitForSelector('[data-testid="ui-root"]', { timeout: 30_000 });
  await settle(page);
}

/** Waits until no finite animation runs and no `[data-anim]` is present for 100 ms (1.3). */
async function settle(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const w = window as unknown as { __settledSince?: number };
      const busy =
        document.getAnimations().some((a) => {
          const t = a.effect?.getComputedTiming();
          return a.playState === 'running' && t !== undefined && t.iterations !== Infinity;
        }) || document.querySelector('[data-anim]') !== null;
      const now = performance.now();
      if (busy) {
        w.__settledSince = undefined;
        return false;
      }
      w.__settledSince ??= now;
      return now - w.__settledSince >= 100;
    },
    null,
    { timeout: 20_000, polling: 50 },
  );
}

/** Runs the DOM checks of 1.3 inside the UI root. */
async function measure(page: Page, spec: PageSpec): Promise<Violation[]> {
  const out = await page.evaluate(
    ({ home, allow }) => {
      const root = document.querySelector<HTMLElement>('[data-testid="ui-root"]')!;
      const v: { check: string; detail: string }[] = [];
      const rootRect = root.getBoundingClientRect();
      const visible = (el: Element): boolean => {
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) return false;
        if (r.right <= rootRect.left || r.left >= rootRect.right || r.bottom <= rootRect.top || r.top >= rootRect.bottom) return false;
        for (let x: Element | null = el; x && x !== root.parentElement; x = x.parentElement) {
          const cs = getComputedStyle(x);
          if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.05) return false;
          if (x.classList.contains('ui-sr')) return false;
        }
        return true;
      };
      const path = (el: Element): string => {
        const parts: string[] = [];
        for (let x: Element | null = el; x && x !== root && parts.length < 4; x = x.parentElement) {
          const id = x.getAttribute('data-testid');
          parts.unshift(`${x.tagName.toLowerCase()}${id ? `[${id}]` : ''}${x.classList.length ? '.' + [...x.classList].slice(0, 2).join('.') : ''}`);
        }
        return parts.join(' > ');
      };
      // Small text
      const seen = new Set<Element>();
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.textContent || !n.textContent.trim()) continue;
        const el = n.parentElement;
        if (!el || seen.has(el)) continue;
        seen.add(el);
        if (!visible(el)) continue;
        if (el.closest('svg')) continue;
        const px = parseFloat(getComputedStyle(el).fontSize);
        const tag = el.closest('[data-tag]') !== null;
        if (px < 11 || (px < 12 && !tag)) v.push({ check: 'text', detail: `${px}px "${n.textContent.trim().slice(0, 24)}" at ${path(el)}` });
      }
      // Small targets
      for (const el of root.querySelectorAll('button, [role=button], a, input, [data-hit]')) {
        if (!visible(el)) continue;
        if ((el as HTMLInputElement).type === 'hidden') continue;
        const r = el.getBoundingClientRect();
        if (r.width >= 43.5 && r.height >= 43.5) continue;
        const p = path(el);
        if (allow.some((a) => new RegExp(a).test(p))) continue;
        v.push({ check: 'target', detail: `${Math.round(r.width)}x${Math.round(r.height)} at ${p}` });
      }
      // Primary count
      const primaries = [...root.querySelectorAll('[data-primary]')].filter(visible);
      if (primaries.length > 1) v.push({ check: 'primary', detail: `${primaries.length} primaries: ${primaries.map(path).join(' | ')}` });
      // Clipping
      for (const el of root.querySelectorAll<HTMLElement>('[data-clip-check]')) {
        if (!visible(el)) continue;
        if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) v.push({ check: 'clip', detail: `"${(el.textContent ?? '').trim().slice(0, 24)}" ${el.scrollWidth}x${el.scrollHeight} in ${el.clientWidth}x${el.clientHeight} at ${path(el)}` });
      }
      // Page scroll
      if (root.scrollWidth > root.clientWidth + 1) v.push({ check: 'scroll', detail: `root scrolls sideways: ${root.scrollWidth} > ${root.clientWidth}` });
      // Badges on Home
      if (home) {
        const badges = [...root.querySelectorAll('[data-badge="ready"]')].filter(visible);
        if (badges.length > 2) v.push({ check: 'badges', detail: `${badges.length} ready badges` });
      }
      return { v, primaries: primaries.length };
    },
    { home: !!spec.home, allow: TARGET_ALLOW.map((a) => a.match.source) },
  );
  const v = out.v as Violation[];
  if (spec.primary && out.primaries === 0) v.push({ check: 'primary', detail: 'no visible primary' });
  // Pulse count, sampled every 250 ms.
  for (let i = 0; i < 4; i++) {
    const n = await page.evaluate(() => {
      const root = document.querySelector('[data-testid="ui-root"]')!;
      return [...root.querySelectorAll('[data-pulse]')].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      }).length;
    });
    if (n > 1) {
      v.push({ check: 'pulse', detail: `${n} pulsing elements` });
      break;
    }
    await page.waitForTimeout(250);
  }
  return v;
}

for (const spec of PAGES) {
  test.describe(`budget: ${spec.name}`, () => {
    for (const vp of VIEWPORTS) {
      test(`${vp}`, async ({ page }) => {
        await open(page, spec.hash, vp);
        if (spec.prepare) {
          await spec.prepare(page);
          await settle(page);
        }
        const v = await measure(page, spec);
        await test.info().attach(`budget-${spec.name}-${vp}.json`, { body: JSON.stringify(v, null, 2), contentType: 'application/json' });
        if (spec.strict) {
          expect(v, v.map((x) => `${x.check}: ${x.detail}`).join('\n')).toEqual([]);
        } else {
          for (const x of v.slice(0, 20)) test.info().annotations.push({ type: `backlog ${x.check}`, description: x.detail });
          if (v.length > 20) test.info().annotations.push({ type: 'backlog', description: `${v.length - 20} more` });
        }
      });
    }
  });
}

test.describe('UA-01: every Mode select picker button can be hit', () => {
  for (const vp of VIEWPORTS) {
    test(`${vp}`, async ({ page }) => {
      await open(page, 'screens/modeSelect/mid/{vp}', vp);
      const res = await page.evaluate(() => {
        const out: { seg: string; text: string; hit: boolean; h: number }[] = [];
        for (const seg of ['quick-difficulty', 'ladder-format', 'daily-difficulty']) {
          for (const b of document.querySelectorAll<HTMLElement>(`[data-testid="${seg}"] [role="radio"]`)) {
            b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            const r = b.getBoundingClientRect();
            const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            out.push({ seg, text: (b.textContent ?? '').trim(), hit: !!el && (el === b || b.contains(el)), h: Math.round(r.height) });
          }
        }
        return out;
      });
      expect(res.length).toBe(11);
      expect(res.filter((x) => !x.hit || x.h < 44)).toEqual([]);
    });
  }
});

test.describe('reduce motion replaces, never deletes (5.6)', () => {
  test('a screen entrance is a 150 ms fade, with no scale change', async ({ page }) => {
    await page.setViewportSize({ width: 884, height: 470 });
    await page.goto('./?dev=1#screens/settings/mid/844x390');
    await page.waitForSelector('[data-testid="ui-root"]');
    // Switch the gallery's save to reduce motion and remount the screen.
    const samples = await page.evaluate(async () => {
      const root = document.querySelector<HTMLElement>('[data-testid="ui-root"]')!;
      root.setAttribute('data-reduce-motion', 'true');
      const screen = root.querySelector<HTMLElement>('.ui-screen')!;
      screen.style.animation = 'none';
      void screen.offsetWidth;
      screen.style.animation = '';
      const out: { t: number; opacity: number; transform: string }[] = [];
      const t0 = performance.now();
      while (performance.now() - t0 < 260) {
        const cs = getComputedStyle(screen);
        out.push({ t: Math.round(performance.now() - t0), opacity: Number(cs.opacity), transform: cs.transform });
        await new Promise((r) => requestAnimationFrame(r));
      }
      return out;
    });
    const faded = samples.filter((s) => s.opacity < 0.99);
    expect(faded.length).toBeGreaterThan(0);
    // The fade lasts at least 100 ms, not a 1 ms jump.
    expect(Math.max(...faded.map((s) => s.t))).toBeGreaterThanOrEqual(90);
    // No scale or offset while it fades.
    expect(samples.every((s) => s.transform === 'none' || /^matrix\(1, 0, 0, 1, 0, 0\)$/.test(s.transform))).toBe(true);
  });
});
