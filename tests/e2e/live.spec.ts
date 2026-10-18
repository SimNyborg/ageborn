/**
 * Live (online) matches (owner request 2026-10-13, queue item 34; DESIGN A2.12, A6.3, A7.1): the Ranked
 * battle has no pause and no speed cycle (a menu that never pauses, a tempo proposal the opponent accepts
 * or declines, their proposals as a card with Y / N), a hidden tab does not pause it and missed time is
 * caught up, both players' quick chat and the mute work, and the offline HUD keeps pause and speed. The
 * simulated opponent's answers are forced through the dev hook (`battle.live.dev`), since its own come
 * after a random human delay. The profile is moved past onboarding into Arena 3 (as modes.spec.ts).
 * Review O fixes (2026-10-18): Reduce motion keeps the countdowns, tags and the away notice (B1); their card
 * closes an open menu or wheel (S2); Settings over a live match shows the running match, rests the HUD keys
 * and holds Import and Reset (decision 4). Built for CI's slow software-GL machines, where one Playwright click can
 * take seconds (release, 2026-10-18): transient tags and bubbles (1.8-2.4 s) are caught in the page as they render
 * (`watchFor`, started before the action), their card's buttons get one mouse input once the card is awake
 * (`clickCard`), and no check races their proposal's 8 s window (a card that ran out makes way for a fresh one).
 */
import { expect, test, type Page } from '@playwright/test';
import { watchPage } from './helpers';

type Dev = {
  controller: {
    save: { value: Record<string, unknown> & { tutorial: object; trophies: object; flags: object; warPath: object } };
    setSave(s: unknown, o?: unknown): void;
    showTitle(): void;
    route: { peek(): { id: string; battle?: Battle } };
  };
};
type Battle = {
  session: { status: { peek(): string }; currentSpeed: number; catchingUp: boolean; sim: { state: { tick: number } } };
  live: null | { dev: { answers(f: unknown): void; propose(s: number): void; say(m: unknown): void; away(ms: number): void } };
};

async function veteranHome(page: Page, o: { reduceMotion?: boolean } = {}): Promise<void> {
  await page.goto('./?dev=1&game=1');
  await page.waitForFunction(() => !!(window as unknown as { __agebornDev?: unknown }).__agebornDev, null, { timeout: 60_000 });
  await page.evaluate((reduce) => {
    const c = (window as unknown as { __agebornDev: Dev }).__agebornDev.controller;
    const s = c.save.value;
    c.setSave(
      {
        ...s,
        ...(reduce ? { settings: { ...(s['settings'] as object), reduceMotion: true } } : {}),
        warPath: { ...s.warPath, legacy: true },
        matchesPlayed: 30,
        arenaIndex: 2,
        tutorial: { ...s.tutorial, step: 4 },
        trophies: { ...s.trophies, current: 450, best: 450 },
        flags: { ...s.flags, 'tutorial.warPlanPrompt': true, 'tutorial.firstUpgrade': true, 'ui-seen.decks': true },
      },
      { immediate: true },
    );
    c.showTitle();
  }, o.reduceMotion === true);
  await expect(page.getByTestId('play')).toBeVisible({ timeout: 20_000 });
}

/** A computed style of the first element matching `sel`. */
function styleOf(page: Page, sel: string, prop: 'animationDuration' | 'animationName' | 'opacity'): Promise<string | null> {
  return page.evaluate(([s, p]) => {
    const el = document.querySelector(s as string);
    return el ? getComputedStyle(el)[p as 'opacity'] : null;
  }, [sel, prop] as const);
}

type Caught = { animationName: string; animationDuration: string };

/**
 * Watches in the page, every frame, for the first frame in which every selector matches, and returns the first
 * one's animation then. A transient tag or bubble (1.8-2.4 s) is caught as it renders, whatever the round trips
 * cost: on CI's software-GL machines a click and the next assertion can take seconds between them, past a short
 * tag's life. Start it before the action that shows the element.
 */
function watchFor(page: Page, sels: string[], timeout = 20_000): Promise<Caught> {
  const seen = page
    .waitForFunction(
      (list) => {
        const els = (list as string[]).map((s) => document.querySelector(s));
        if (els.some((e) => e === null)) return false;
        const cs = getComputedStyle(els[0]!);
        return { animationName: cs.animationName, animationDuration: cs.animationDuration };
      },
      sels,
      { polling: 'raf', timeout },
    )
    .then((h) => h.jsonValue() as Promise<Caught>);
  // a watch the test no longer awaits (it failed earlier) must not end as an unhandled rejection
  seen.catch(() => undefined);
  return seen;
}

/** Runs `action` with `watchFor(sels)` already watching, and returns what it caught. */
async function caught(page: Page, sels: string[], action: () => Promise<unknown>, timeout?: number): Promise<Caught> {
  const seen = watchFor(page, sels, timeout);
  await action();
  return seen;
}

/** The open or last proposal of theirs: 'open', or how it ended ('accepted', 'declined', 'timeout'), or 'none'. */
function theirs(page: Page): Promise<string> {
  return onBattle<string>(page, 'const t = b.live.tempo.peek(); if (t.pending) return t.pending.by === "foe" ? "open" : "mine"; return t.last && t.last.by === "foe" ? t.last.result : "none";');
}

/**
 * Clicks their card's Accept or Decline where it stands, once its buttons are awake (400 ms after it lands, when
 * its entrance is over and its box final), with one mouse input: Playwright's click and its actionability waits
 * can take seconds over a running software-GL battle (CI) and outlast the card's 8 s, after which a waiting click
 * retries on every later card. A card that runs out first makes way for a fresh one (three tries); the caller
 * checks how it ended.
 */
async function clickCard(page: Page, which: 'accept' | 'decline', speed: number): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if ((await theirs(page)) !== 'open') await caught(page, [`[data-testid="hud-tempo-prompt"][data-speed="${speed}"]`], () => onBattle(page, `b.live.dev.propose(${speed})`));
    const awake = await page
      .locator('[data-testid="hud-tempo-prompt"]:not(.is-arming)')
      .waitFor({ state: 'visible', timeout: 8000 })
      .then(() => true, () => false);
    const box = awake ? await page.getByTestId(`hud-tempo-${which}`).boundingBox() : null;
    if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect.poll(() => theirs(page), { timeout: 12_000 }).not.toBe('open');
    if ((await theirs(page)) !== 'timeout') return;
  }
}

/** Runs `fn(battle, arg)` on the battle on screen in the page. */
function onBattle<T>(page: Page, fn: string, arg?: unknown): Promise<T> {
  return page.evaluate(
    ([f, a]) => {
      const b = (window as unknown as { __agebornDev: Dev }).__agebornDev.controller.route.peek().battle;
      return new Function('b', 'a', f as string)(b, a) as T;
    },
    [fn, arg] as const,
  );
}

/** Home's Battle (Ranked): the search finds a player, VS, then the battle runs. */
async function rankedBattle(page: Page): Promise<void> {
  await page.getByTestId('play').click();
  await expect(page.getByTestId('battle')).toBeVisible({ timeout: 60_000 });
  await expect.poll(() => onBattle<string>(page, 'return b ? b.session.status.peek() : "none"'), { timeout: 60_000 }).toBe('running');
}

test.describe('live matches (queue item 34)', () => {
  test('Ranked: no pause, a menu that never pauses, and a speed proposal the opponent accepts', async ({ page }) => {
    test.setTimeout(180_000);
    const problems = watchPage(page);
    await veteranHome(page);
    await rankedBattle(page);
    expect(await onBattle<boolean>(page, 'return b.live !== null')).toBe(true);
    await expect(page.getByTestId('hud-pause')).toHaveCount(0);
    await expect(page.getByTestId('hud-live-menu')).toBeVisible();
    await expect(page.getByTestId('hud-tempo')).toHaveAttribute('data-speed', '1');

    // P opens the menu; nothing pauses
    await page.keyboard.press('p');
    await expect(page.getByTestId('hud-live-menu-drop')).toBeVisible();
    await expect(page.getByTestId('pause')).toHaveCount(0);
    expect(await onBattle<string>(page, 'return b.session.status.peek()')).toBe('running');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('hud-live-menu-drop')).toHaveCount(0);

    // propose 2x: it waits for the opponent (the "2x?" ring and "Waiting for <name>"), who says yes after 6 s, inside
    // the 8 s window; then "2x agreed" shows for 2.4 s. Both are caught in the page as they render.
    await onBattle(page, 'b.live.dev.answers({ answer: "accept", delayMs: 6000 })');
    await page.getByTestId('hud-tempo').click();
    await expect(page.getByTestId('hud-tempo-menu')).toBeVisible();
    const agreed = watchFor(page, ['[data-testid="hud-tempo-tag"][data-tone="good"]'], 30_000);
    await caught(page, ['[data-testid="hud-tempo"][data-asking="2"]', '[data-testid="hud-tempo-tag"][data-tone="wait"]'], () => page.getByTestId('hud-tempo-2').click());
    await agreed;
    await expect(page.getByTestId('hud-tempo')).toHaveAttribute('data-speed', '2');
    expect(await onBattle<number>(page, 'return b.session.currentSpeed')).toBe(2);

    // the next proposal waits a cooldown: a tap says so (its tag shows 1.8 s) and changes nothing
    await caught(page, ['[data-testid="hud-tempo-tag"][data-tone="deny"]'], () => page.getByTestId('hud-tempo').click());
    await expect(page.getByTestId('hud-tempo-menu')).toHaveCount(0);
    expect(problems.errors).toEqual([]);
  });

  test('Ranked: a declined proposal keeps the speed; the opponent proposes and you answer (button, Y)', async ({ page }) => {
    test.setTimeout(180_000);
    const problems = watchPage(page);
    await veteranHome(page);
    await rankedBattle(page);
    await onBattle(page, 'b.live.dev.answers({ answer: "decline", delayMs: 3000 })');
    await page.getByTestId('hud-tempo').click();
    // "<name> said no" shows for 2.4 s: caught in the page as it renders
    const said = watchFor(page, ['[data-testid="hud-tempo-tag"][data-tone="bad"]'], 30_000);
    await page.getByTestId('hud-tempo-1.5').click();
    await said;
    await expect(page.getByTestId('hud-tempo')).toHaveAttribute('data-speed', '1');

    // their proposal: a card with Accept and Decline (its buttons wake 400 ms after it lands); Decline keeps the speed
    const card = page.getByTestId('hud-tempo-prompt');
    await caught(page, ['[data-testid="hud-tempo-prompt"][data-speed="2"]'], () => onBattle(page, 'b.live.dev.propose(2)'));
    await clickCard(page, 'decline', 2);
    await expect(card).toHaveCount(0);
    expect(await theirs(page)).toBe('declined');
    await expect(page.getByTestId('hud-tempo')).toHaveAttribute('data-speed', '1');

    // again, answered with Y (keys answer at once)
    await caught(page, ['[data-testid="hud-tempo-prompt"][data-speed="1.5"]'], () => onBattle(page, 'b.live.dev.propose(1.5)'));
    await page.keyboard.press('y');
    await expect(page.getByTestId('hud-tempo')).toHaveAttribute('data-speed', '1.5');
    expect(problems.errors).toEqual([]);
  });

  test('Ranked: a hidden tab does not pause it, and missed time is caught up', async ({ page }) => {
    test.setTimeout(180_000);
    const problems = watchPage(page);
    await veteranHome(page);
    await rankedBattle(page);
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(300);
    expect(await onBattle<string>(page, 'return b.session.status.peek()')).toBe('running');
    await expect(page.getByTestId('pause')).toHaveCount(0);
    // back after 8 s on the wall clock (the real visibility path; a headless page keeps its frames, so the jump is
    // made on Date.now): the battle runs those 160 ticks in a few frames, without drawing each one
    const before = await onBattle<number>(page, 'return b.session.sim.state.tick');
    await page.evaluate(() => {
      const real = Date.now;
      Date.now = () => real() + 8000;
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
      Date.now = real;
    });
    await expect.poll(() => onBattle<boolean>(page, 'return b.session.catchingUp'), { timeout: 60_000 }).toBe(false);
    expect(await onBattle<number>(page, 'return b.session.sim.state.tick')).toBeGreaterThanOrEqual(before + 160);
    // the dev hook owes time the same way
    const mid = await onBattle<number>(page, 'return b.session.sim.state.tick');
    await onBattle(page, 'b.live.dev.away(8000)');
    await expect.poll(() => onBattle<boolean>(page, 'return b.session.catchingUp'), { timeout: 60_000 }).toBe(false);
    expect(await onBattle<number>(page, 'return b.session.sim.state.tick')).toBeGreaterThanOrEqual(mid + 160);
    expect(await onBattle<string>(page, 'return b.session.status.peek()')).toBe('running');
    expect(problems.errors).toEqual([]);
  });

  test('Ranked: quick chat in the wheel, the opponent\'s chat, and the mute', async ({ page }) => {
    test.setTimeout(180_000);
    const problems = watchPage(page);
    await veteranHome(page);
    await rankedBattle(page);
    await page.getByTestId('hud-emote').click();
    await expect(page.getByTestId('hud-wheel-chat')).toBeVisible();
    // a line an equipped quote already says is left out ("Good luck!" next to "Good luck, have fun!")
    await expect(page.getByTestId('hud-pick-quote.glhf')).toBeVisible();
    await expect(page.getByTestId('hud-chat-glhf')).toHaveCount(0);
    // the bubbles show for 2.2 s: caught in the page as they render
    await caught(page, ['[data-testid="hud-bubble-me"][data-chat="nice"]'], () => page.getByTestId('hud-chat-nice').click());
    await caught(page, ['[data-testid="hud-bubble-foe"][data-chat="wow"]'], () => onBattle(page, 'b.live.dev.say({ k: "chat", line: "wow" })'));
    // mute from the menu: their next line shows nothing
    await page.getByTestId('hud-live-menu').click();
    await page.getByTestId('hud-live-mute').click();
    await expect(page.getByTestId('hud-live-mute')).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(3200);
    await onBattle(page, 'b.live.dev.say({ k: "chat", line: "gg" })');
    await page.waitForTimeout(800);
    await expect(page.locator('[data-testid="hud-bubble-foe"][data-chat="gg"]')).toHaveCount(0);
    expect(problems.errors).toEqual([]);
  });

  test('Reduce motion keeps the countdowns, the outcome tags and the away notice (review O B1)', async ({ page }) => {
    test.setTimeout(180_000);
    const problems = watchPage(page);
    await veteranHome(page, { reduceMotion: true });
    await rankedBattle(page);
    // my proposal, left unanswered: the gold ring drains over the whole 8 s, the waiting tag stays readable
    await onBattle(page, 'b.live.dev.answers({ answer: "ignore" })');
    await page.getByTestId('hud-tempo').click();
    // no answer: the outcome tag fades in, holds and fades out over its 2.4 s (it used to end at opacity 0 at once);
    // caught in the page as it renders, 8 s on
    const noAnswer = watchFor(page, ['[data-testid="hud-tempo-tag"][data-tone="dim"]'], 30_000);
    const ring = await caught(page, ['[data-testid="hud-tempo"][data-asking="2"] .hud-tempo-ring-fill'], () => page.getByTestId('hud-tempo-2').click());
    expect(ring.animationDuration).toBe('8s');
    await page.waitForTimeout(1000);
    if ((await theirs(page)) === 'mine') expect(await styleOf(page, '[data-testid="hud-tempo-tag"][data-tone="wait"]', 'opacity')).toBe('1');
    const dim = await noAnswer;
    expect(dim.animationName).toBe('hud-moment-calm');
    expect(dim.animationDuration).toBe('2.4s');
    // their proposal: the card's bar drains over 8 s
    const bar = await caught(page, ['[data-testid="hud-tempo-prompt"] .hud-tp-bar'], () => onBattle(page, 'b.live.dev.propose(1.5)'));
    expect(bar.animationDuration).toBe('8s');
    await page.keyboard.press('n');
    await expect(page.getByTestId('hud-tempo-prompt')).toHaveCount(0);
    // away too long: the notice fades in and holds until the Result
    const away = await caught(page, ['[data-testid="hud-away"]'], () => onBattle(page, 'b.live.dev.away(130000)'));
    expect(away.animationName).toBe('hud-moment-calm');
    expect(away.animationDuration).toBe('2.4s');
    expect(problems.errors).toEqual([]);
  });

  test('their proposal closes an open menu or wheel instead of covering it (review O S2)', async ({ page }) => {
    test.setTimeout(180_000);
    const problems = watchPage(page);
    await veteranHome(page);
    await rankedBattle(page);
    await page.getByTestId('hud-live-menu').click();
    await expect(page.getByTestId('hud-live-menu-drop')).toBeVisible();
    await caught(page, ['[data-testid="hud-tempo-prompt"]'], () => onBattle(page, 'b.live.dev.propose(2)'));
    await expect(page.getByTestId('hud-live-menu-drop')).toHaveCount(0);
    // N declines it at once (the menu stays closed)
    await page.keyboard.press('n');
    await expect(page.getByTestId('hud-tempo-prompt')).toHaveCount(0);
    await expect(page.getByTestId('hud-live-menu-drop')).toHaveCount(0);
    await expect(page.getByTestId('hud-tempo')).toHaveAttribute('data-speed', '1');
    // the emote wheel too
    await page.getByTestId('hud-emote').click();
    await expect(page.getByTestId('hud-emote-picker')).toBeVisible();
    await caught(page, ['[data-testid="hud-tempo-prompt"]'], () => onBattle(page, 'b.live.dev.propose(1.5)'));
    await expect(page.getByTestId('hud-emote-picker')).toHaveCount(0);
    expect(problems.errors).toEqual([]);
  });

  test('Settings over a live match: the battle runs on, a bar takes you back, HUD keys rest, Import waits (decision 4)', async ({ page }) => {
    test.setTimeout(180_000);
    const problems = watchPage(page);
    await veteranHome(page);
    await rankedBattle(page);
    await page.getByTestId('hud-live-menu').click();
    await page.getByTestId('hud-live-settings').click();
    await expect(page.getByTestId('set-live-bar')).toBeVisible();
    await expect(page.getByTestId('import')).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByTestId('reset')).toHaveAttribute('aria-disabled', 'true');
    const t1 = await onBattle<number>(page, 'return b.session.sim.state.tick');
    await expect.poll(() => onBattle<number>(page, 'return b.session.sim.state.tick')).toBeGreaterThan(t1 + 10);
    // their proposal meanwhile (its card waits under Settings): Y must not answer a card the player cannot see
    await onBattle(page, 'b.live.dev.propose(2)');
    await expect.poll(() => theirs(page)).toBe('open');
    await page.keyboard.press('y');
    await page.waitForTimeout(300);
    // never answered: still open, or (on a machine slow enough to spend its 8 s here) run out unanswered
    expect(['open', 'timeout']).toContain(await theirs(page));
    expect(await onBattle<number>(page, 'return b.session.currentSpeed')).toBe(1);
    await page.getByTestId('set-live-back').click();
    await expect(page.getByTestId('set-live-bar')).toHaveCount(0);
    // back on the battle: their card shows while its 8 s last, and the keys answer it again (a proposal that ran out
    // while Settings was open, or is about to, makes way for a fresh one, so the check never races the window)
    const left = await onBattle<number>(page, 'const t = b.live.tempo.peek(); return t.pending && t.pending.by === "foe" ? t.pending.until - b.live.now() : 0');
    if (left < 4000) {
      await expect.poll(() => theirs(page), { timeout: 15_000 }).toBe('timeout');
      await onBattle(page, 'b.live.dev.propose(2)');
    }
    await expect(page.getByTestId('hud-tempo-prompt')).toBeVisible();
    await page.keyboard.press('n');
    await expect(page.getByTestId('hud-tempo-prompt')).toHaveCount(0);
    expect(await theirs(page)).toBe('declined');
    expect(await onBattle<number>(page, 'return b.session.currentSpeed')).toBe(1);
    expect(problems.errors).toEqual([]);
  });

  test('offline (Quick Battle, labelled AI): pause and the speed button as before', async ({ page }) => {
    test.setTimeout(180_000);
    const problems = watchPage(page);
    await veteranHome(page);
    await page.getByTestId('home-modes').click();
    await page.getByTestId('mode-quick').click();
    await page.getByTestId('play').click();
    await expect(page.getByTestId('battle')).toBeVisible({ timeout: 60_000 });
    await expect.poll(() => onBattle<string>(page, 'return b ? b.session.status.peek() : "none"'), { timeout: 60_000 }).toBe('running');
    expect(await onBattle<boolean>(page, 'return b.live === null')).toBe(true);
    await expect(page.getByTestId('hud-live-menu')).toHaveCount(0);
    await page.getByTestId('hud-speed').click();
    await expect(page.getByTestId('hud-speed')).toHaveAttribute('data-speed', '1.5');
    await page.getByTestId('hud-pause').click();
    await expect.poll(() => onBattle<string>(page, 'return b.session.status.peek()')).toBe('paused');
    expect(problems.errors).toEqual([]);
  });
});
