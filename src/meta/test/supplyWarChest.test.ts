/**
 * Supply Capsule (A15.4) and War Chest (A15.5).
 */
import { describe, expect, it } from 'vitest';
import type { SaveDoc } from '@/contracts';
import { META_FLAGS } from '../rules';
import { supplyMatchesLeft, supplyRules } from '../supply';
import { isCountingWin, skillTier, warChestProgress, winsPerChest } from '../warChest';
import { C, clock, DAY, fresh, grantOpen, M, M_SUPPLY, matchInput, play, scripted } from './helpers';

function withAllowance(s: SaveDoc, n: number, matchesPlayed: number): SaveDoc {
  return { ...s, matchesPlayed, capsules: { ...s.capsules, dailyBank: n }, flags: { ...s.flags, [META_FLAGS.dailyUnlocked]: true } };
}

const dailyCount = (s: SaveDoc) => s.capsules.pending.filter((p) => p.kind === 'daily').length;

describe('Supply Capsule (A15.4)', () => {
  it('uses the DESIGN numbers: every 3rd match, allowance up to 7; retired, so none accrues (2026-09-30)', () => {
    expect(supplyRules(C)).toEqual({ matchesPerCapsule: 3, allowanceMax: 7, accrues: false });
  });

  it('the 3rd, 6th and 9th finished match each turn one banked allowance into a Supply Capsule', () => {
    const c = clock();
    let s = withAllowance(scripted(3), 5, 0);
    const got: number[] = [];
    for (let i = 1; i <= 9; i += 1) {
      const before = dailyCount(s);
      s = play(s, 'skirmish', i % 2 ? 'win' : 'loss', c).save;
      if (dailyCount(s) > before) got.push(s.matchesPlayed);
    }
    expect(got).toEqual([3, 6, 9]);
    expect(s.capsules.dailyBank).toBe(2);
  });

  it('a retreat counts as a played match but pays no Supply Capsule; the allowance stays banked (2026-10-03)', () => {
    const c = clock();
    let s = withAllowance(scripted(4), 0, 2);
    s = M.applyMatchResult(s, matchInput('skirmish', 'loss', M.pickOpponent(s, 'skirmish', C, c), { reason: 'retreat' }), C, c).save;
    expect(s.matchesPlayed).toBe(3);
    expect(dailyCount(s)).toBe(0);
    let t = withAllowance(scripted(4), 1, 2);
    t = M.applyMatchResult(t, matchInput('skirmish', 'loss', M.pickOpponent(t, 'skirmish', C, c), { reason: 'retreat' }), C, c).save;
    expect(t.matchesPlayed).toBe(3);
    expect(dailyCount(t)).toBe(0);
    expect(t.capsules.dailyBank).toBe(1);
  });

  it('tutorial matches never grant a Supply Capsule', () => {
    const c = clock();
    const s = withAllowance(fresh(5), 3, 2);
    const opp = M.pickOpponent(s, 'tutorial', C, c);
    const r = M.applyMatchResult(s, matchInput('tutorial', 'win', opp), C, c);
    expect(r.save.matchesPlayed).toBe(3);
    expect(dailyCount(r.save)).toBe(0);
    expect(r.save.capsules.dailyBank).toBe(3);
  });

  it('the first Supply Capsule arrives right after capsule 2 is opened, with no matches and no allowance used', () => {
    const c = clock();
    let s = fresh(6, c);
    s = grantOpen(s, 'win', c).save;
    expect(dailyCount(s)).toBe(0);
    s = grantOpen(s, 'win', c).save;
    expect(s.flags[META_FLAGS.dailyUnlocked]).toBe(true);
    expect(dailyCount(s)).toBe(1);
    expect(s.capsules.dailyBank).toBe(0);
    const supply = s.capsules.pending.find((p) => p.kind === 'daily')!;
    expect(supply.startTier).toBe('bronze');
  });

  it('retired: no allowance accrues any more, and an old one is kept until it converts (2026-09-30)', () => {
    const c = clock();
    let s = withAllowance(scripted(7), 2, 0);
    for (let d = 1; d <= 10; d += 1) {
      c.advance(DAY);
      s = M.tickTimers(s, c);
      expect(s.capsules.dailyBank).toBe(2);
    }
  });

  it('while it accrued (before 2026-09-30), the allowance banked one a day up to 7 and stopped there (walk-away rule)', () => {
    const c = clock();
    const M = M_SUPPLY;
    let s = withAllowance(scripted(7), 0, 0);
    s = M.tickTimers(s, c);
    const owned = JSON.stringify([s.collection, s.currencies, s.capsules.pending]);
    for (let d = 1; d <= 30; d += 1) {
      c.advance(DAY);
      s = M.tickTimers(s, c);
      expect(s.capsules.dailyBank).toBe(Math.min(7, d));
    }
    expect(JSON.stringify([s.collection, s.currencies, s.capsules.pending])).toBe(owned);
  });

  it('the tray line counts the finished matches to the next Supply Capsule, and is empty with no allowance', () => {
    const s = scripted(8);
    expect(supplyMatchesLeft(withAllowance(s, 0, 4), C)).toBeNull();
    expect(supplyMatchesLeft(withAllowance(s, 1, 4), C)).toBe(2);
    expect(supplyMatchesLeft(withAllowance(s, 1, 5), C)).toBe(1);
    expect(supplyMatchesLeft(withAllowance(s, 1, 6), C)).toBe(3);
  });
});

describe('War Chest (A15.5)', () => {
  it('holds 20 wins per chest (data)', () => {
    expect(winsPerChest(C)).toBe(20);
  });

  it('ladder and Daily wins count; Skirmish, tutorial and losses never do', () => {
    const base = { opponentTier: 3, earnedStar: false, mmr: 1000 };
    expect(isCountingWin({ ...base, mode: 'ladder', win: true }, C)).toBe(true);
    expect(isCountingWin({ ...base, mode: 'daily', win: true }, C)).toBe(true);
    expect(isCountingWin({ ...base, mode: 'skirmish', win: true }, C)).toBe(false);
    expect(isCountingWin({ ...base, mode: 'tutorial', win: true }, C)).toBe(false);
    expect(isCountingWin({ ...base, mode: 'ladder', win: false }, C)).toBe(false);
  });

  it('a Conquest win counts with a new star, or against a General at least skill tier − 2', () => {
    // MMR 1370 → skill tier 5.
    expect(skillTier(1370, C)).toBe(5);
    expect(skillTier(0, C)).toBe(0);
    expect(skillTier(9999, C)).toBe(10);
    const f = { mode: 'conquest' as const, win: true, mmr: 1370 };
    expect(isCountingWin({ ...f, opponentTier: 3, earnedStar: false }, C)).toBe(true);
    expect(isCountingWin({ ...f, opponentTier: 2, earnedStar: false }, C)).toBe(false);
    expect(isCountingWin({ ...f, opponentTier: 2, earnedStar: true }, C)).toBe(true);
  });

  it('20 ladder wins grant a Wardrobe Crate and an Age Capsule at once and restart at 0; Skirmish adds nothing', () => {
    const c = clock();
    let s = scripted(9, 1);
    s = { ...s, capsules: { ...s.capsules, charges: 0, freeCapsulesLeft: 0 } };
    for (let i = 0; i < 5; i += 1) s = play(s, 'skirmish', 'win', c).save;
    expect(warChestProgress(s, C)).toEqual({ wins: 0, of: 20 });
    for (let i = 1; i < 20; i += 1) {
      s = play(s, 'ladder', 'win', c).save;
      expect(s.quests.weekly.progress).toBe(i);
    }
    const crates = s.capsules.wardrobe.length;
    const ages = s.capsules.pending.filter((p) => p.kind === 'age').length;
    const r = play(s, 'ladder', 'win', c);
    s = r.save;
    expect(s.quests.weekly.progress).toBe(0);
    expect(s.capsules.wardrobe.length).toBe(crates + 1);
    expect(s.capsules.wardrobe[s.capsules.wardrobe.length - 1]!.source).toBe('weekly');
    expect(s.capsules.pending.filter((p) => p.kind === 'age').length).toBe(ages + 1);
    // Both grants are reward steps, so the Result screen can show them (A15.13).
    const crate = s.capsules.wardrobe[s.capsules.wardrobe.length - 1]!;
    expect(r.rewards).toContainEqual({ kind: 'crate', crateId: crate.id });
    const age = s.capsules.pending.filter((p) => p.kind === 'age').at(-1)!;
    expect(r.rewards).toContainEqual({ kind: 'capsule', capsuleId: age.id });
  });

  it('never resets with time, and the weekly slot cannot be claimed as a quest', () => {
    const c = clock();
    let s = scripted(10, 1);
    for (let i = 0; i < 3; i += 1) s = play(s, 'ladder', 'win', c).save;
    expect(s.quests.weekly.progress).toBe(3);
    for (let d = 0; d < 40; d += 1) {
      c.advance(DAY);
      s = M.tickTimers(s, c);
    }
    expect(s.quests.weekly.progress).toBe(3);
    expect(M.claimQuest(s, 'weekly', C, c).ok).toBe(false);
  });

  it('asks for the Age Capsule age when the chest is about to open', () => {
    const c = clock();
    let s = scripted(11, 1);
    s = { ...s, quests: { ...s.quests, weekly: { ...s.quests.weekly, progress: 19 } } };
    const opp = M.pickOpponent(s, 'ladder', C, c);
    expect(M.ageCapsuleDue(s, matchInput('ladder', 'win', opp), C, c)).toBe(true);
    expect(M.ageCapsuleDue(s, matchInput('ladder', 'loss', opp), C, c)).toBe(false);
    const r = M.applyMatchResult(s, matchInput('ladder', 'win', opp), C, c, { age: 'medieval' });
    const age = r.save.capsules.pending.find((p) => p.kind === 'age' && p.scriptIndex === null);
    expect(age?.age).toBe('medieval');
  });
});
