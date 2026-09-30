/**
 * The Daily Capsule bank and the Daily Challenge (DESIGN A6.3, A9.1, C5 #26).
 */
import { describe, expect, it } from 'vitest';
import type { SaveDoc } from '@/contracts';
import { xmur3 } from '@/core';
import { DAILY_DIFFICULTIES, dailyDrawOn, dailyModifierOn, defaultDailyDifficulty } from '../daily';
import { META_FLAGS } from '../rules';
import { supplyRules } from '../supply';
import { daysFromCivil } from '../time';
import { C, C_SUPPLY, DAY, HOUR, M, M_SUPPLY, TestClock, T0, fresh, lastPending, matchInput, noSundial, play, scripted } from './helpers';

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

  it('with the shipped content no allowance accrues (the Supply Capsule retired into the Sundial, 2026-09-30)', () => {
    const c = new TestClock(Date.UTC(2026, 2, 2, 12), 2 * HOUR);
    const s = M.tickTimers(unlocked(fresh()), c);
    c.advance(10 * DAY);
    expect(M.tickTimers(s, c).capsules.dailyBank).toBe(1);
  });

  it('while it accrued (before 2026-09-30): one per day at local 04:00, banking up to 7 (the Supply allowance, A15.4)', () => {
    const M = M_SUPPLY;
    const C = C_SUPPLY;
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
    expect(s.capsules.dailyBank).toBe(7);
    const claimed = M.claimDailyCapsule(s, C, c);
    expect(claimed.ok).toBe(true);
    if (!claimed.ok) return;
    expect(claimed.value.capsules.dailyBank).toBe(6);
    expect(lastPending(claimed.value)).toMatchObject({ kind: 'daily', startTier: 'bronze' });
  });

  it('granting a Daily Capsule takes one from the bank (the economy model relies on it)', () => {
    const s = { ...unlocked(scripted()), capsules: { ...unlocked(scripted()).capsules, dailyBank: 2 } };
    expect(M.grantCapsule(s, 'daily', C, new TestClock()).capsules.dailyBank).toBe(1);
  });
});

describe('Daily Challenge 2.0 (A9.1, A15.7)', () => {
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

  it('dailySeed = xmur3("daily" + YYYYMMDD) picks the modifier, one of the 8 ladder Generals and the match seed', () => {
    const d = daysFromCivil(2026, 10, 3);
    const draw = dailyDrawOn(C, d);
    expect(draw.dayKey).toBe('2026-10-03');
    expect(draw.dailySeed).toBe(xmur3('daily20261003')() >>> 0);
    expect(C.dailyModifiers.challenge.generals).toContain(draw.generalId);
    const generals = new Set<string>();
    for (let i = 0; i < 200; i += 1) generals.add(dailyDrawOn(C, d + i).generalId);
    expect([...generals].sort()).toEqual([...C.dailyModifiers.challenge.generals].sort());
  });

  it('two players on the same date and difficulty get the same opponent, modifier and seed', () => {
    const c = new TestClock(Date.UTC(2026, 9, 3, 12));
    const a = scripted(1, 0, c);
    const b = { ...scripted(99, 3, c), mmr: 1400, matchesPlayed: 57 };
    for (const difficulty of DAILY_DIFFICULTIES) {
      const oa = M.pickOpponent(a, 'daily', C, c, { daily: { difficulty } });
      const ob = M.pickOpponent(b, 'daily', C, c, { daily: { difficulty } });
      expect([oa.generalId, oa.tier, oa.seed, oa.modifiers, oa.format, oa.level]).toEqual([ob.generalId, ob.tier, ob.seed, ob.modifiers, ob.format, ob.level]);
      expect(oa.side.loadouts).toEqual(ob.side.loadouts);
      expect(oa.tier).toBe(C.dailyModifiers.challenge.difficulties[difficulty]);
      expect(oa).toMatchObject({ isAI: true, format: 'standard', level: 7, standardLevels: true });
      expect(Object.values(oa.side.levels).every((l) => l === 7)).toBe(true);
    }
    // A different date may give a different draw, but always Standard War.
    c.advance(DAY);
    expect(M.pickOpponent(a, 'daily', C, c).format).toBe('standard');
  });

  it('the default difficulty is the one nearest the skill tier', () => {
    const at = (mmr: number) => defaultDailyDifficulty({ mmr }, C);
    expect(at(870)).toBe('recruit'); // skill 0
    expect(at(1170)).toBe('recruit'); // skill 3: II is 1 away, V is 2
    expect(at(1270)).toBe('veteran'); // skill 4
    expect(at(1470)).toBe('veteran'); // skill 6
    expect(at(1570)).toBe('warlord'); // skill 7
    expect(at(3000)).toBe('warlord');
    const c = new TestClock();
    expect(M.pickOpponent({ ...scripted(), mmr: 1370 }, 'daily', C, c).tier).toBe(5);
  });

  it('a new save banks 1; the bank gains +1 each 04:00 up to 7', () => {
    const c = new TestClock(T0);
    let s = fresh(1, c);
    expect(s.daily.bank).toBe(1);
    c.advance(DAY);
    s = M.tickTimers(s, c);
    expect(s.daily.bank).toBe(2);
    c.advance(30 * DAY);
    s = M.tickTimers(s, c);
    expect(s.daily.bank).toBe(7);
    c.advance(DAY);
    expect(M.tickTimers(s, c).daily.bank).toBe(7);
    // A clock moved backwards adds nothing.
    c.advance(-5 * DAY);
    expect(M.tickTimers({ ...s, daily: { ...s.daily, bank: 3 } }, c).daily.bank).toBe(3);
  });

  it('a win uses one banked reward and pays an Age Capsule; with none banked 20 Amber; no charges, trophies or MMR', () => {
    const c = new TestClock();
    const s = noSundial(scripted());
    expect(s.daily.bank).toBe(1);
    const first = play(s, 'daily', 'win', c);
    expect(first.rewards[0]?.kind).toBe('capsule');
    expect(lastPending(first.save)).toMatchObject({ kind: 'age', tier: 'silver' });
    expect(first.save.daily.bank).toBe(0);
    expect(first.save.trophies).toEqual(s.trophies);
    expect(first.save.mmr).toBe(s.mmr);
    expect(first.save.capsules.charges).toBe(s.capsules.charges);
    const second = play(first.save, 'daily', 'win', c);
    expect(second.rewards[0]).toEqual({ kind: 'amber', amount: 20 });
    c.advance(DAY);
    const nextDay = play(second.save, 'daily', 'win', c);
    expect(nextDay.rewards[0]?.kind).toBe('capsule');
    const loss = play(s, 'daily', 'loss', c);
    expect(loss.rewards.some((x) => x.kind === 'amber')).toBe(false);
    // A day later the Sundial has readied capsules again, so the loss claims one; never an Age Capsule.
    expect(loss.save.capsules.pending.filter((p) => p.kind === 'age')).toHaveLength(0);
    expect(loss.save.daily.bank).toBeGreaterThan(0);
  });

  it('the banked win\'s Age Capsule holds the age the player picked in the dialog (A6.4)', () => {
    const c = new TestClock();
    const s = noSundial(scripted());
    const o = M.pickOpponent(s, 'daily', C, c);
    const win = matchInput('daily', 'win', o);
    expect(M.ageCapsuleDue(s, win, C, c)).toBe(true);
    expect(M.ageCapsuleDue(s, matchInput('daily', 'loss', o), C, c)).toBe(false);
    const r = M.applyMatchResult(s, win, C, c, { age: 'gunpowder' });
    const cap = lastPending(r.save);
    expect(cap).toMatchObject({ kind: 'age', age: 'gunpowder', scriptIndex: null });
    for (const st of cap.contents.stacks) expect((C.units[st.card] ?? C.turrets[st.card])?.age).toBe('gunpowder');
    // The bank is empty now, so the next win pays Amber and needs no dialog.
    expect(M.ageCapsuleDue(r.save, win, C, c)).toBe(false);
  });
});

describe('walk-away rule (A15.4, A15.20)', () => {
  it('a 30-day absence changes nothing owned, and every bank stops at its cap', () => {
    const c = new TestClock(T0);
    const s0 = M.tickTimers(unlocked(scripted(1, 0, c)), c);
    const s = { ...s0, quests: { ...s0.quests, weekly: { ...s0.quests.weekly, progress: 13 } }, flags: { ...s0.flags, 'feat.underdog': true } };
    c.advance(30 * DAY);
    const after = M.tickTimers(s, c);
    expect(after.currencies).toEqual(s.currencies);
    expect(after.collection).toEqual(s.collection);
    expect(after.capsules.pending).toEqual(s.capsules.pending);
    expect(after.capsules.wardrobe).toEqual(s.capsules.wardrobe);
    expect(after.quests.weekly.progress).toBe(13);
    expect(after.flags['feat.underdog']).toBe(true);
    expect(after.capsules.charges).toBe(C.capsules.charges.max);
    // The Supply allowance no longer grows (retired 2026-09-30, A15.4); the Sundial fills to 34 and stops.
    expect(supplyRules(C).accrues).toBe(false);
    expect(after.capsules.dailyBank).toBe(s.capsules.dailyBank);
    expect(after.capsules.clayMeter).toBe(s.capsules.clayMeter);
    expect(after.daily.bank).toBe(C.dailyModifiers.challenge.bankMax);
    expect(after.quests.daily).toHaveLength(C.quests.queueMax);
    // Another 30 days add nothing more.
    c.advance(30 * DAY);
    const later = M.tickTimers(after, c);
    expect([later.capsules.charges, later.capsules.dailyBank, later.daily.bank, later.quests.daily.length]).toEqual([
      after.capsules.charges,
      after.capsules.dailyBank,
      after.daily.bank,
      after.quests.daily.length,
    ]);
  });
});
