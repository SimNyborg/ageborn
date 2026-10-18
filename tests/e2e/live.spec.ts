/**
 * Live (online) matches (owner request 2026-10-13, queue item 34; DESIGN A2.12, A6.3, A7.1): the Ranked
 * battle has no pause and no speed cycle (a menu that never pauses, a tempo proposal the opponent accepts
 * or declines, their proposals as a card with Y / N), a hidden tab does not pause it and missed time is
 * caught up, both players' quick chat and the mute work, and the offline HUD keeps pause and speed. The
 * simulated opponent's answers are forced through the dev hook (`battle.live.dev`), since its own come
 * after a random human delay. The profile is moved past onboarding into Arena 3 (as modes.spec.ts).
 * Review O fixes (2026-10-18): Reduce motion keeps the countdowns, tags and the away notice (B1); their card
 * closes an open menu or wheel (S2); Settings over a live match shows the running match, rests the HUD keys
 * and holds Import and Reset (decision 4). Waits are sized for CI's slower machines: a transient tag is
 * caught before the steady state it leaves, and a forced answer comes late enough to see the waiting state.
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

    // propose 2x: it waits for the opponent, who says yes after 6 s (inside the 8 s window, and long enough for
    // a slow CI machine to see the waiting state: 1.5 s was over before its first poll)
    await onBattle(page, 'b.live.dev.answers({ answer: "accept", delayMs: 6000 })');
    await page.getByTestId('hud-tempo').click();
    await expect(page.getByTestId('hud-tempo-menu')).toBeVisible();
    await page.getByTestId('hud-tempo-2').click();
    await expect(page.getByTestId('hud-tempo')).toHaveAttribute('data-asking', '2');
    await expect(page.getByTestId('hud-tempo-tag')).toHaveAttribute('data-tone', 'wait');
    // the agreed tag shows for 2.4 s: catch it first, then the speed it left behind
    await expect(page.locator('[data-testid="hud-tempo-tag"][data-tone="good"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('hud-tempo')).toHaveAttribute('data-speed', '2');
    expect(await onBattle<number>(page, 'return b.session.currentSpeed')).toBe(2);

    // the next proposal waits a cooldown: a tap says so and changes nothing
    await page.getByTestId('hud-tempo').click();
    await expect(page.locator('[data-testid="hud-tempo-tag"][data-tone="deny"]')).toBeVisible();
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
    await page.getByTestId('hud-tempo-1.5').click();
    await expect(page.locator('[data-testid="hud-tempo-tag"][data-tone="bad"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('hud-tempo')).toHaveAttribute('data-speed', '1');

    // their proposal: a card with Accept and Decline (its buttons wake 400 ms after it lands); Decline keeps the speed
    await onBattle(page, 'b.live.dev.propose(2)');
    const card = page.getByTestId('hud-tempo-prompt');
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute('data-speed', '2');
    await page.getByTestId('hud-tempo-decline').click();
    await expect(card).toHaveCount(0);
    await expect(page.getByTestId('hud-tempo')).toHaveAttribute('data-speed', '1');

    // again, answered with Y
    await onBattle(page, 'b.live.dev.propose(1.5)');
    await expect(card).toBeVisible();
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
    await page.getByTestId('hud-chat-nice').click();
    await expect(page.locator('[data-testid="hud-bubble-me"][data-chat="nice"]')).toBeVisible();
    await onBattle(page, 'b.live.dev.say({ k: "chat", line: "wow" })');
    await expect(page.locator('[data-testid="hud-bubble-foe"][data-chat="wow"]')).toBeVisible({ timeout: 5000 });
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
    await page.getByTestId('hud-tempo-2').click();
    await expect(page.getByTestId('hud-tempo')).toHaveAttribute('data-asking', '2');
    await page.waitForTimeout(1000);
    expect(await styleOf(page, '.hud-tempo-ring-fill', 'animationDuration')).toBe('8s');
    expect(await styleOf(page, '[data-testid="hud-tempo-tag"]', 'opacity')).toBe('1');
    // no answer: the outcome tag fades in, holds and fades out over its 2.4 s (it used to end at opacity 0 at once)
    await expect(page.locator('[data-testid="hud-tempo-tag"][data-tone="dim"]')).toBeVisible({ timeout: 15_000 });
    expect(await styleOf(page, '[data-testid="hud-tempo-tag"]', 'animationName')).toBe('hud-moment-calm');
    expect(await styleOf(page, '[data-testid="hud-tempo-tag"]', 'animationDuration')).toBe('2.4s');
    // their proposal: the card's bar drains over 8 s
    await onBattle(page, 'b.live.dev.propose(1.5)');
    await expect(page.getByTestId('hud-tempo-prompt')).toBeVisible();
    expect(await styleOf(page, '.hud-tp-bar', 'animationDuration')).toBe('8s');
    await page.keyboard.press('n');
    await expect(page.getByTestId('hud-tempo-prompt')).toHaveCount(0);
    // away too long: the notice fades in and holds until the Result
    await onBattle(page, 'b.live.dev.away(130000)');
    await expect(page.getByTestId('hud-away')).toBeVisible();
    expect(await styleOf(page, '[data-testid="hud-away"]', 'animationName')).toBe('hud-moment-calm');
    expect(await styleOf(page, '[data-testid="hud-away"]', 'animationDuration')).toBe('2.4s');
    expect(problems.errors).toEqual([]);
  });

  test('their proposal closes an open menu or wheel instead of covering it (review O S2)', async ({ page }) => {
    test.setTimeout(180_000);
    const problems = watchPage(page);
    await veteranHome(page);
    await rankedBattle(page);
    await page.getByTestId('hud-live-menu').click();
    await expect(page.getByTestId('hud-live-menu-drop')).toBeVisible();
    await onBattle(page, 'b.live.dev.propose(2)');
    await expect(page.getByTestId('hud-tempo-prompt')).toBeVisible();
    await expect(page.getByTestId('hud-live-menu-drop')).toHaveCount(0);
    await page.getByTestId('hud-tempo-decline').click();
    await expect(page.getByTestId('hud-tempo-prompt')).toHaveCount(0);
    await expect(page.getByTestId('hud-tempo')).toHaveAttribute('data-speed', '1');
    // the emote wheel too
    await page.getByTestId('hud-emote').click();
    await expect(page.getByTestId('hud-emote-picker')).toBeVisible();
    await onBattle(page, 'b.live.dev.propose(1.5)');
    await expect(page.getByTestId('hud-tempo-prompt')).toBeVisible();
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
    // their proposal meanwhile: Y must not answer a card the player cannot see
    await onBattle(page, 'b.live.dev.propose(2)');
    await page.waitForTimeout(300);
    await page.keyboard.press('y');
    await page.waitForTimeout(300);
    expect(await onBattle<string | null>(page, 'return b.live.tempo.peek().pending ? b.live.tempo.peek().pending.by : null')).toBe('foe');
    await page.getByTestId('set-live-back').click();
    await expect(page.getByTestId('set-live-bar')).toHaveCount(0);
    await expect(page.getByTestId('hud-tempo-prompt')).toBeVisible();
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
