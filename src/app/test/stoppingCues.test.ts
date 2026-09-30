/**
 * Stopping well (DESIGN A15.6, A15.20): session counters, the tilt, break and wrap cards and the
 * healthy-play signals.
 */
import { describe, expect, it } from 'vitest';
import { isNightHour, MINUTE, StoppingCues, type ResultFacts } from '../stopping';

function setup(o: { hour?: number } = {}) {
  let t = 1_000_000;
  const log: { kind: string; id: string; data?: unknown }[] = [];
  const cues = new StoppingCues(10, { now: () => t, hourOf: () => o.hour ?? 15, log: { record: (kind, id, data) => log.push({ kind, id, data }) } });
  const play = (ms: number): void => {
    cues.setBattleRunning(true);
    for (let x = 0; x < ms; x += 1000) {
      t += 1000;
      cues.sample();
    }
    cues.setBattleRunning(false);
  };
  const advance = (ms: number): void => {
    t += ms;
  };
  return { cues, log, play, advance };
}

function facts(o: Partial<ResultFacts> = {}): ResultFacts {
  return { mode: 'ladder', won: true, lost: false, lossStreak: 0, claimedLastSundial: false, breakReminder: true, collectionSize: 10, baseDamage: 0, replayHash: null, ...o };
}

const loss = (streak: number, dmg = 0, hash: number | null = null) => facts({ won: false, lost: true, lossStreak: streak, baseDamage: dmg, replayHash: hash });

describe('active play (A15.6)', () => {
  it('counts battle time and time within 60 s of input, only while visible', () => {
    const { cues, play, advance } = setup();
    play(10_000);
    expect(cues.activeMs).toBe(10_000);
    // Idle in a menu for 2 minutes after one tap: only the first 60 s count.
    cues.input();
    for (let i = 0; i < 120; i += 1) {
      advance(1000);
      cues.sample();
    }
    expect(cues.activeMs).toBe(70_000);
    cues.setVisible(false);
    cues.setBattleRunning(true);
    advance(5000);
    cues.sample();
    expect(cues.activeMs).toBe(70_000);
  });

  it('a new session begins when the tab is visible again after 20 min hidden', () => {
    const { cues, play, advance, log } = setup();
    play(5000);
    cues.onResult(facts());
    cues.setVisible(false);
    advance(19 * MINUTE);
    cues.setVisible(true);
    expect(cues.activeMs).toBe(5000);
    cues.setVisible(false);
    advance(20 * MINUTE);
    cues.setVisible(true);
    expect(cues.activeMs).toBe(0);
    expect(cues.matches).toBe(0);
    expect(log.some((e) => e.id === 'sessionEnd')).toBe(true);
  });
});

describe('Result cards (A15.6)', () => {
  it('tilt: once per session on the 3rd Ladder loss in a row; Watch opens the closest loss', () => {
    const { cues } = setup();
    expect(cues.onResult(loss(1, 900, 11))).toBeNull();
    expect(cues.onResult(loss(2, 3000, 22))).toBeNull();
    const card = cues.onResult(loss(3, 1200, 33), (h) => (h === 22 ? 4 : null));
    expect(card).toEqual({ kind: 'tilt', watchIndex: 4 });
    expect(cues.onResult(loss(4))).toBeNull();
  });

  it('never in the tutorial, and Skirmish losses do not tilt', () => {
    const { cues } = setup();
    expect(cues.onResult(facts({ mode: 'tutorial' }))).toBeNull();
    for (let i = 0; i < 4; i += 1) expect(cues.onResult(facts({ mode: 'skirmish', won: false, lost: true }))).toBeNull();
  });

  it('break: the first Result after each 60 min of active play, unless switched off', () => {
    const { cues, play } = setup();
    play(59 * MINUTE);
    expect(cues.onResult(facts())).toBeNull();
    play(2 * MINUTE);
    expect(cues.onResult(facts())).toEqual({ kind: 'break' });
    expect(cues.onResult(facts())?.kind).not.toBe('break');
    play(60 * MINUTE);
    expect(cues.onResult(facts())).toEqual({ kind: 'break' });
    const off = setup();
    off.play(61 * MINUTE);
    // Off: no break card (the wrap card may still come).
    expect(off.cues.onResult(facts({ breakReminder: false }))?.kind).not.toBe('break');
  });

  it('wrap: on the match that claimed the Sundial\'s last ready capsule, win or lose, once per session', () => {
    const { cues } = setup();
    expect(cues.onResult(facts({ won: false, lost: true }))).toBeNull();
    expect(cues.onResult(facts({ claimedLastSundial: true, collectionSize: 12 }))).toEqual({ kind: 'wrap', wins: 1, losses: 1, newCards: 2, chargesOut: true });
    expect(cues.onResult(facts({ claimedLastSundial: true }))).toBeNull();
  });

  it('wrap: a lost match outside the Ladder that empties the Sundial counts too', () => {
    const { cues } = setup();
    expect(cues.onResult(facts({ mode: 'warPath', won: false, lost: true, claimedLastSundial: true }))).toMatchObject({ kind: 'wrap', chargesOut: true });
  });

  it('wrap: after 30 min of active play with at least 3 finished matches', () => {
    const { cues, play } = setup();
    play(31 * MINUTE);
    expect(cues.onResult(facts())).toBeNull();
    expect(cues.onResult(facts())).toBeNull();
    expect(cues.onResult(facts({ won: false, lost: true }))).toEqual({ kind: 'wrap', wins: 2, losses: 1, newCards: 0, chargesOut: false });
  });

  it('priority: tilt before break before wrap, at most one per Result', () => {
    const { cues, play } = setup();
    play(61 * MINUTE);
    // The first Result after 60 min takes the break card; the wrap waits for a later Result.
    expect(cues.onResult(loss(1))).toEqual({ kind: 'break' });
    expect(cues.onResult(loss(2))).toBeNull();
    expect(cues.onResult(loss(3))).toEqual({ kind: 'tilt', watchIndex: null });
    expect(cues.onResult(facts())?.kind).toBe('wrap');
  });
});

describe('night line and healthy-play signals (A15.6, A15.20)', () => {
  it('22:00-06:00 is night', () => {
    expect([21, 22, 23, 0, 5, 6].map(isNightHour)).toEqual([false, true, true, true, true, false]);
  });

  it('logs late sessions, long sessions and the card shown', () => {
    const { cues, play, log } = setup({ hour: 23 });
    expect(log.some((e) => e.id === 'sessionLate')).toBe(true);
    play(91 * MINUTE);
    expect(log.some((e) => e.id === 'sessionLong')).toBe(true);
    cues.onResult(facts());
    expect(log.some((e) => e.id === 'card')).toBe(true);
  });
});
