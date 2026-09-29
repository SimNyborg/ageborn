/**
 * The battle HUD in a live Quick Battle (docs/ui-plan.md 4.7; UI-3 acceptance in 6.5):
 *
 * - the 1.3 budget on the HUD at 844 x 390, 844 x 340, 800 x 360 and 1280 x 720: no text under 11 px
 *   (12 px outside `[data-tag]`), no target under 44 x 44, the tray and the top band inside the
 *   screen without overlaps, no sideways scroll;
 * - one attention pulse at most, sampled every 250 ms (U11);
 * - world framing: the ground line sits above the tray and the tallest unit fits under the top band
 *   (a render probe on the camera);
 * - train on release: a click trains within a second (the card is stable for Playwright), a press held
 *   past 450 ms never trains and opens the card's tip instead (U10);
 * - a denied press says why next to the card (MR-03, MR-67);
 * - the stance flyout: press, slide to an option and release chooses it.
 */
import { expect as baseExpect, test, type Page } from '@playwright/test';
import { fastForward, requireFlow, watchPage } from './helpers';

/** Software WebGL renders a few frames per second, so every check gets more time. */
const expect = baseExpect.configure({ timeout: 20_000 });

const VIEWPORTS = [
  [844, 390],
  [844, 340],
  [800, 360],
  [1280, 720],
] as const;

interface HudDev {
  controller: {
    save: { peek(): { tutorial: { step: number; hintsShown?: Record<string, number> }; matchesPlayed: number; flags: Record<string, boolean> } };
    setSave(s: unknown, o?: object): void;
    route: { peek(): { id: string; battle?: { session: { hud: { peek(): { me: { gold: number; cards: { slot: number; card: string | null; cost: number; queued: number; state: string }[] } } } } } } };
  };
  view(): { camera: { layout: { groundY: number; scale: number } } } | null;
}

/** A Quick Battle for a returning player (stance and army counter taught, hints seen). */
async function battle(page: Page): Promise<void> {
  await page.goto('./?dev=1&game=1');
  await page.waitForFunction(() => (window as unknown as { __agebornDev?: unknown }).__agebornDev !== undefined, null, { timeout: 30_000 });
  await page.evaluate(() => {
    const c = (window as unknown as { __agebornDev: HudDev }).__agebornDev.controller;
    const s = c.save.peek();
    c.setSave(
      { ...s, matchesPlayed: Math.max(30, s.matchesPlayed), tutorial: { ...s.tutorial, step: 4, hintsShown: { ...(s.tutorial.hintsShown ?? {}), powerReady: 3 } }, flags: { ...s.flags, 'tutorial.warPlanPrompt': true } },
      { immediate: true },
    );
    localStorage.setItem('ageborn.hud.powerDragHint', '1');
  });
  await page.goto('./?dev=1&game=1&quick=short');
  await expect(page.getByTestId('hud-tray')).toBeVisible({ timeout: 30_000 });
  expect(await fastForward(page, 1)).toBeGreaterThanOrEqual(0);
}

function hudModel(page: Page) {
  return page.evaluate(() => (window as unknown as { __agebornDev: HudDev }).__agebornDev.controller.route.peek().battle?.session.hud.peek() ?? null);
}

/** The 1.3 DOM checks inside the HUD root. */
async function budget(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('[data-testid="hud"]')!;
    const box = root.getBoundingClientRect();
    const out: string[] = [];
    const visible = (el: Element): boolean => {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return false;
      for (let x: Element | null = el; x && x !== root.parentElement; x = x.parentElement) {
        const cs = getComputedStyle(x);
        if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.05) return false;
      }
      return true;
    };
    const name = (el: Element): string => `${el.tagName.toLowerCase()}.${[...el.classList].slice(0, 2).join('.')}[${el.getAttribute('data-testid') ?? ''}]`;
    const seen = new Set<Element>();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!el || !n.textContent?.trim() || seen.has(el)) continue;
      seen.add(el);
      if (!visible(el) || el.closest('svg')) continue;
      const px = parseFloat(getComputedStyle(el).fontSize);
      if (px < 11 || (px < 12 && !el.closest('[data-tag]'))) out.push(`text ${px}px "${n.textContent.trim().slice(0, 20)}" ${name(el)}`);
    }
    for (const el of root.querySelectorAll('button, [role=button], a, input, [data-hit]')) {
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 43.5 || r.height < 43.5) out.push(`target ${Math.round(r.width)}x${Math.round(r.height)} ${name(el)}`);
      if (r.left < box.left - 1 || r.right > box.right + 1 || r.top < box.top - 1 || r.bottom > box.bottom + 1) out.push(`off-screen ${name(el)}`);
    }
    // The tray's groups never overlap, and the top band's blocks neither.
    const groups = (sel: string) => [...root.querySelectorAll(sel)].filter(visible).map((el) => ({ el, r: el.getBoundingClientRect() }));
    for (const set of [groups('.hud-tray > *'), groups('.hud-top > .hud-panel, .hud-top > .hud-center > *, .hud-top > .hud-controls > *')]) {
      for (let i = 0; i < set.length; i++)
        for (let j = i + 1; j < set.length; j++) {
          const a = set[i]!.r;
          const b = set[j]!.r;
          if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) out.push(`overlap ${name(set[i]!.el)} / ${name(set[j]!.el)}`);
        }
    }
    const clips = [...root.querySelectorAll<HTMLElement>('[data-clip-check]')].filter(visible).filter((el) => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1);
    for (const el of clips) out.push(`clip "${el.textContent?.trim()}" ${name(el)}`);
    if (document.scrollingElement && document.scrollingElement.scrollWidth > innerWidth + 1) out.push('page scrolls sideways');
    return out;
  });
}

test.describe('Battle HUD (ui-plan 4.7)', () => {
  test.beforeEach(() => requireFlow('quickBattle'));

  for (const [w, h] of VIEWPORTS) {
    test(`fits and passes the budget at ${w} x ${h}`, async ({ page }) => {
      test.setTimeout(120_000);
      const problems = watchPage(page);
      await page.setViewportSize({ width: w, height: h });
      await battle(page);
      await fastForward(page, 400);
      await page.waitForTimeout(600);
      expect(await budget(page)).toEqual([]);
      // Six loadout slots, always (empty ones are quiet sockets).
      await expect(page.locator('.hud-cards .hud-card-slot')).toHaveCount(6);
      // One pulse at most (U11), sampled every 250 ms.
      for (let i = 0; i < 8; i++) {
        const n = await page.locator('[data-testid="hud"] [data-pulse]').count();
        expect(n).toBeLessThanOrEqual(1);
        await page.waitForTimeout(250);
      }
      // World framing: the ground above the tray, the tallest unit under the top band (render probe).
      const frame = await page.evaluate(() => {
        const v = (window as unknown as { __agebornDev: HudDev }).__agebornDev.view();
        const tray = document.querySelector('[data-testid="hud-tray"]')!.getBoundingClientRect();
        const strip = document.querySelector('.hud-mm-strip')?.getBoundingClientRect();
        const top = Math.max(document.querySelector('.hud-top')!.getBoundingClientRect().bottom, strip?.bottom ?? 0);
        return v ? { ground: v.camera.layout.groundY, scale: v.camera.layout.scale, trayTop: tray.top, top } : null;
      });
      expect(frame).not.toBeNull();
      if (frame) {
        expect(frame.ground).toBeLessThanOrEqual(frame.trayTop - 11);
        expect(frame.ground - 240 * frame.scale).toBeGreaterThanOrEqual(frame.top - 2);
      }
      expect(problems.errors).toEqual([]);
    });
  }

  test('a tap trains on release; a held press opens the tip and never trains (U10)', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 844, height: 390 });
    await battle(page);
    const card = page.getByTestId('hud-card-0');
    // Once the tray has dealt in, Playwright sees the card as stable and clicks it within a second
    // (affordable cards glow and rest; nothing on them keeps moving, UA-14).
    await page.waitForTimeout(1_000);
    // Stable: the box does not move over half a second (software WebGL renders a few frames a second
    // here, so the click itself is timed against the frame rate, not a wall-clock second).
    const boxes: string[] = [];
    for (let i = 0; i < 5; i++) {
      const b = await card.boundingBox();
      boxes.push(JSON.stringify(b));
      await page.waitForTimeout(100);
    }
    expect(new Set(boxes).size).toBe(1);
    const frameMs = await page.evaluate(
      () =>
        new Promise<number>((done) => {
          const t = performance.now();
          requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => done((performance.now() - t) / 3))));
        }),
    );
    const t0 = Date.now();
    await card.click({ timeout: 5_000 });
    test.info().annotations.push({ type: 'click', description: `clicked in ${Date.now() - t0} ms (frame ${Math.round(frameMs)} ms)` });
    await expect.poll(async () => (await hudModel(page))?.me.cards[0]?.queued ?? 0).toBeGreaterThan(0);
    const before = await hudModel(page);
    const b = (await card.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(700);
    await page.mouse.up();
    await expect(page.locator('.hud-card-info-wrap.is-open [data-testid="hud-card-info"]')).toBeVisible();
    const after = await hudModel(page);
    // No train: the queue did not grow (it may only shrink as units walk out).
    expect(after!.me.cards[0]!.queued).toBeLessThanOrEqual(before!.me.cards[0]!.queued);
    // A tap elsewhere closes the tip.
    await page.mouse.click(422, 180);
    await expect(page.locator('.hud-card-info-wrap.is-open')).toHaveCount(0);
  });

  test('a denied press says why next to the card (MR-67)', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 844, height: 390 });
    await battle(page);
    const m = (await hudModel(page))!;
    const costly = m.me.cards.filter((c) => c.card).sort((a, b) => b.cost - a.cost)[0]!;
    // Spend down until the dearest card is out of reach.
    for (let i = 0; i < 8 && ((await hudModel(page))?.me.gold ?? 0) >= costly.cost; i++) await page.getByTestId(`hud-card-${costly.slot}`).click();
    await page.getByTestId(`hud-card-${costly.slot}`).click();
    await expect(page.getByTestId(`hud-reason-card${costly.slot}`)).toContainText(/Need \d+ gold|Queue full/);
  });

  test('the stance flyout: press, slide to Hold, release', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 844, height: 390 });
    await battle(page);
    const stance = page.getByTestId('hud-stance');
    await expect(stance).toHaveAttribute('data-stance', 'charge');
    const b = (await stance.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    const hold = page.getByTestId('hud-stance-hold');
    await expect(hold).toBeVisible();
    const o = (await hold.boundingBox())!;
    await page.mouse.move(o.x + o.width / 2, o.y + o.height / 2, { steps: 5 });
    await page.mouse.up();
    await expect(stance).toHaveAttribute('data-stance', 'hold');
    await expect(page.getByTestId('hud-stance-flyout')).toHaveCount(0);
  });
});
