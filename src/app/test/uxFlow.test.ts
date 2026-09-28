/**
 * Usability-audit rules in the app shell: "3-2-1 Fight!" before a Quick Battle, the finished battle
 * kept behind the result, the tutorial bubble never covering its target, and the result's story line.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FixedClock } from '@/contracts/fakes/clock';
import { AppController, COUNTDOWN_FIGHT_MS, COUNTDOWN_STEP_MS } from '../controller';
import { buildServices, DEFAULT_CHOICE } from '../services';
import { resultLine } from '../ui/ResultScreen';
import { formatMinutes } from '../ui/TitleScreen';
import { placeBubble, type Rect } from '../ui/TutorialBubble';

async function controller(countdown: boolean) {
  const services = await buildServices({ choice: DEFAULT_CHOICE, clock: new FixedClock() });
  return new AppController(services, { save: null, countdown, delay: async () => undefined });
}

afterEach(() => {
  vi.useRealTimers();
});

describe('"3-2-1 Fight!" (audit #21)', () => {
  it('keeps the sim waiting while 3, 2, 1 show, then starts it on "Fight!"', async () => {
    const c = await controller(true);
    vi.useFakeTimers();
    const b = c.quickBattle('short');
    expect(b.countdown.value).toBe(3);
    expect(b.session.status.value).toBe('ready');
    vi.advanceTimersByTime(COUNTDOWN_STEP_MS);
    expect(b.countdown.value).toBe(2);
    vi.advanceTimersByTime(COUNTDOWN_STEP_MS);
    expect(b.countdown.value).toBe(1);
    expect(b.session.status.value).toBe('ready');
    vi.advanceTimersByTime(COUNTDOWN_STEP_MS);
    expect(b.countdown.value).toBe(0);
    expect(b.session.status.value).toBe('running');
    vi.advanceTimersByTime(COUNTDOWN_FIGHT_MS);
    expect(b.countdown.value).toBe(-1);
    c.dispose();
  });

  it('can be skipped (pause button, dev fast-forward) and never runs in the tutorial', async () => {
    const c = await controller(true);
    vi.useFakeTimers();
    const b = c.quickBattle('short');
    c.skipCountdown();
    expect(b.countdown.value).toBe(-1);
    expect(b.session.status.value).toBe('running');
    vi.advanceTimersByTime(5000);
    expect(b.countdown.value).toBe(-1);
    const t = c.training();
    expect(t.countdown.value).toBe(-1);
    expect(t.session.status.value).toBe('running');
    c.dispose();
  });

  it('stops when the player leaves during the countdown', async () => {
    const c = await controller(true);
    vi.useFakeTimers();
    const b = c.quickBattle('short');
    c.quit();
    vi.advanceTimersByTime(5000);
    expect(b.session.status.value).toBe('disposed');
    c.dispose();
  });
});

describe('the result keeps the battle behind it (audit #16)', () => {
  it('disposes the finished battle only when the player leaves the result', async () => {
    const c = await controller(false);
    const b = c.quickBattle('short');
    b.session.fastForward(20 * 60 * 12);
    for (let i = 0; i < 10 && c.route.value.id === 'battle'; i += 1) await Promise.resolve();
    const r = c.route.value;
    expect(r.id).toBe('result');
    if (r.id !== 'result') return;
    expect(r.result.battle).toBe(b);
    expect(b.session.status.value).toBe('ended');
    c.home();
    expect(b.session.status.value).toBe('disposed');
    c.dispose();
  }, 60_000);
});

describe('tutorial bubble placement (audit #2, #14)', () => {
  const W = 1280;
  const H = 720;
  const overlaps = (a: Rect, b: Rect): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

  const targets: Record<string, Rect> = {
    card: { x: 520, y: 580, w: 88, h: 100 },
    mount: { x: 107, y: 370, w: 64, h: 64 },
    evolve: { x: 350, y: 14, w: 56, h: 56 },
    power: { x: 800, y: 575, w: 88, h: 88 },
  };

  for (const [name, t] of Object.entries(targets)) {
    it(`never covers the ${name} it points at and stays on screen`, () => {
      const pos = placeBubble(t, 300, 52, W, H, H * 0.12);
      const bubble = { x: pos.left, y: pos.top, w: 300, h: 52 };
      expect(overlaps(bubble, t)).toBe(false);
      expect(bubble.x).toBeGreaterThanOrEqual(0);
      expect(bubble.x + bubble.w).toBeLessThanOrEqual(W);
      expect(bubble.y).toBeGreaterThanOrEqual(0);
      expect(bubble.y + bubble.h).toBeLessThanOrEqual(H);
    });
  }

  it('goes below a target in the top bar and above one in the tray', () => {
    expect(placeBubble(targets.evolve!, 300, 52, W, H, H * 0.12).placement).toBe('below');
    expect(placeBubble(targets.card!, 300, 52, W, H, H * 0.12).placement).toBe('above');
    expect(placeBubble(null, 300, 52, W, H).placement).toBe('center');
  });
});

describe('result line and format lengths', () => {
  const t = (k: string, p?: Record<string, string | number>): string => `${k}:${JSON.stringify(p ?? {})}`;

  it('tells the match in one line', () => {
    expect(resultLine(t, true, false, 'baseDestroyed', 'Old Grogg', '1:57')).toBe('app.toppled:{"name":"Old Grogg","time":"1:57"}');
    expect(resultLine(t, false, false, 'baseDestroyed', 'Pip', '3:00')).toContain('app.fell');
    expect(resultLine(t, true, false, 'finalBell', 'Pip', '6:00')).toContain('app.bellWin');
    expect(resultLine(t, false, true, 'finalBell', 'Pip', '6:00')).toContain('app.drawLine');
  });

  it('says how long a format can last', () => {
    expect(formatMinutes(360_000)).toBe(6);
    expect(formatMinutes(570_000)).toBe(10);
    expect(formatMinutes(null)).toBeNull();
  });
});
