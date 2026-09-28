/**
 * The Daily Capsule bank and the Daily Challenge (DESIGN A6.3, A9.1, C5 #26).
 */
import { describe, expect, it } from 'vitest';
import type { SaveDoc } from '@/contracts';
import { dailyModifierOn } from '../daily';
import { META_FLAGS } from '../rules';
import { daysFromCivil } from '../time';
import { C, DAY, HOUR, M, TestClock, T0, fresh, lastPending, play, scripted } from './helpers';

function unlocked(s: SaveDoc): SaveDoc {
  return { ...s, capsules: { ...s.capsules, dailyBank: 1, dailyNextAt: null }, flags: { ...s.flags, [META_FLAGS.dailyUnlocked]: true } };
}

describe('Daily Capsule (A6.3)', () => {
  it('stays locked until capsule 2 is opened', () => {
    const s = fresh();
    const c = new TestClock(T0);
    c.advance(5 * DAY);
    expect(M.tickTimers(s, c).capsules.dailyBank).toBe(0);
    expect(M.claimDailyCapsule(s, C, c)).toEqual({ ok: false, reason: 'noDailyCapsule' });
  });

  it('one per day at local 04:00, banking up to 3', () => {
    const c = new TestClock(Date.UTC(2026, 2, 2, 12), 2 * HOUR); // 14:00 local
    let s = M.tickTimers(unlocked(fresh()), c);
    expect(s.capsules.dailyBank).toBe(1);
    expect(s.capsules.dailyNextAt).toBe(Date.UTC(2026, 2, 3, 2)); // 04:00 local
    c.t = Date.UTC(2026, 2, 3, 1, 59);
    expect(M.tickTimers(s, c).capsules.dailyBank).toBe(1);
    c.t = Date.UTC(2026, 2, 3, 2, 0);
    s = M.tickTimers(s, c);
    expect(s.capsules.dailyBank).toBe(2);
    c.advance(10 * DAY);
    s = M.tickTimers(s, c);
    expect(s.capsules.dailyBank).toBe(3);
    const claimed = M.claimDailyCapsule(s, C, c);
    expect(claimed.ok).toBe(true);
    if (!claimed.ok) return;
    expect(claimed.value.capsules.dailyBank).toBe(2);
    expect(lastPending(claimed.value)).toMatchObject({ kind: 'daily', startTier: 'bronze' });
  });

  it('granting a Daily Capsule takes one from the bank (the economy model relies on it)', () => {
    const s = { ...unlocked(scripted()), capsules: { ...unlocked(scripted()).capsules, dailyBank: 2 } };
    expect(M.grantCapsule(s, 'daily', C, new TestClock()).capsules.dailyBank).toBe(1);
  });
});

describe('Daily Challenge (A9.1)', () => {
  it('one modifier per local date, the same for every player, all six in use', () => {
    const d = daysFromCivil(2026, 9, 27);
    expect(dailyModifierOn(C, d)).toBe(dailyModifierOn(C, d));
    const seen = new Set<string>();
    for (let i = 0; i < 120; i += 1) seen.add(dailyModifierOn(C, d + i));
    expect(seen.size).toBe(6);
    // The day starts at 04:00: 03:59 is still yesterday's modifier.
    const c = new TestClock(Date.UTC(2026, 8, 27, 3, 59));
    expect(M.dailyModifier(C, c)).toBe(dailyModifierOn(C, d - 1));
    c.t = Date.UTC(2026, 8, 27, 4, 0);
    expect(M.dailyModifier(C, c)).toBe(dailyModifierOn(C, d));
  });

  it('Standard War at the ladder tier with the modifier disclosed; first win an Age Capsule, later wins 20 Amber', () => {
    const c = new TestClock();
    const s = scripted();
    const o = M.pickOpponent(s, 'daily', C, c);
    expect(o.format).toBe('standard');
    expect(o.modifiers).toEqual([M.dailyModifier(C, c)]);
    expect(o.isAI).toBe(true);
    const first = play(s, 'daily', 'win', c);
    expect(first.rewards[0]?.kind).toBe('capsule');
    expect(lastPending(first.save)).toMatchObject({ kind: 'age', tier: 'silver' });
    expect(lastPending(first.save).contents.stacks).toHaveLength(C.capsules.ageCapsule.stacks);
    expect(first.save.trophies).toEqual(s.trophies);
    expect(first.save.capsules.charges).toBe(s.capsules.charges);
    const second = play(first.save, 'daily', 'win', c);
    expect(second.rewards[0]).toEqual({ kind: 'amber', amount: 20 });
    c.advance(DAY);
    const nextDay = play(second.save, 'daily', 'win', c);
    expect(nextDay.rewards[0]?.kind).toBe('capsule');
    expect(play(s, 'daily', 'loss', c).rewards.some((x) => x.kind === 'amber' || x.kind === 'capsule')).toBe(false);
  });
});
