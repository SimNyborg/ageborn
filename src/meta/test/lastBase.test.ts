/**
 * Last Base Standing rewards (DESIGN A2.10.1, A6.3, A15.8): unranked (no trophies won or lost at any
 * count), the Full War's Amber, and otherwise a Ladder match (Sundial claim or Clay pip, hidden MMR,
 * loss streak, counting win). The format family and the windows.
 */
import { describe, expect, it } from 'vitest';
import type { Content } from '@/content';
import type { SaveDoc } from '@/contracts';
import { formatKind, rewardFormat, windowOf } from '../formats';
import { isUnranked, ladderWinFor, trophyDelta } from '../trophies';
import { C, clock, M, matchInput, play, scripted } from './helpers';

/** A save in Arena 3 (where Conquest and the Fort slot open), past onboarding, every free capsule used. */
function arena3(o: { trophies?: number; charges?: number } = {}): SaveDoc {
  const s = scripted();
  const t = o.trophies ?? 600;
  return {
    ...s,
    trophies: { current: t, best: t, roadClaimed: [] },
    arenaIndex: 2,
    capsules: { ...s.capsules, freeCapsulesLeft: 0, ...(o.charges !== undefined ? { charges: o.charges } : {}) },
    flags: { ...s.flags, 'meta.ladderPlayed': true },
  };
}

describe('Last Base Standing format family (A2.10.1)', () => {
  it('is untimed, pays its own row, and has a Bronze window for Skirmish', () => {
    expect(formatKind(C, 'last')).toBe('untimed');
    expect(formatKind(C, 'last.bronze')).toBe('untimed');
    expect(rewardFormat(C, 'last')).toBe('last');
    expect(rewardFormat(C, 'last.bronze')).toBe('last');
    expect(windowOf(C, 'last', 'stone')).toBe('last');
    expect(windowOf(C, 'last', 'bronze')).toBe('last.bronze');
    expect(windowOf(C, 'last', 'medieval')).toBeNull();
    // The timed lengths are unchanged.
    expect(['short', 'standard', 'full', 'full.bronze', 'w2.stone'].map((f) => rewardFormat(C, f))).toEqual(['short', 'standard', 'full', 'full', 'short']);
  });
});

describe('Last Base Standing rewards (A15.8)', () => {
  it('moves no trophies on a win, loss or draw, at any trophy count', () => {
    for (const t of [100, 400, 600, 3500]) {
      const s = arena3({ trophies: t });
      expect(isUnranked(C, 'last')).toBe(true);
      expect(ladderWinFor(s, C, 'last')).toMatchObject({ trophies: 0, amber: 35, amberWithoutCharge: 70 });
      for (const r of ['win', 'loss', 'draw'] as const) expect(trophyDelta(s, C, r, 'last'), `${t} ${r}`).toBe(0);
    }
    // The timed lengths keep their rows.
    const s = arena3();
    expect(isUnranked(C, 'full')).toBe(false);
    expect(trophyDelta(s, C, 'win', 'full')).toBe(36);
    expect(trophyDelta(s, C, 'loss', 'full')).toBe(-20);
    expect(trophyDelta(arena3({ trophies: 300 }), C, 'win', 'full')).toBe(30);
  });

  it('a win: 0 trophies, 35 Amber and a Sundial Capsule; MMR and the counting-win path as a Ladder match', () => {
    const s = arena3();
    const r = play(s, 'ladder', 'win', undefined, { format: 'last' });
    expect(r.opponent.format).toBe('last');
    expect(r.rewards[0]).toEqual({ kind: 'trophies', delta: 0 });
    expect(r.rewards).toContainEqual({ kind: 'amber', amount: 35 });
    expect(r.rewards.some((x) => x.kind === 'capsule')).toBe(true);
    expect(r.save.trophies).toEqual(s.trophies);
    expect(r.save.mmr).toBeGreaterThan(s.mmr);
    expect(r.save.stats.wins).toBe(s.stats.wins + 1);
  });

  it('a win with the Sundial empty pays 70 Amber and a Clay pip', () => {
    const r = play(arena3({ charges: 0 }), 'ladder', 'win', undefined, { format: 'last' });
    expect(r.rewards).toContainEqual({ kind: 'amber', amount: 70 });
    expect(r.rewards.some((x) => x.kind === 'clayPip')).toBe(true);
  });

  it('a loss: 0 trophies, 15 Amber, the hidden MMR falls and the loss streak counts (loss protection)', () => {
    const s = arena3();
    const r = play(s, 'ladder', 'loss', undefined, { format: 'last' });
    expect(r.rewards[0]).toEqual({ kind: 'trophies', delta: 0 });
    expect(r.rewards).toContainEqual({ kind: 'amber', amount: 15 });
    expect(r.save.trophies.current).toBe(600);
    expect(r.save.mmr).toBeLessThan(s.mmr);
    expect(r.save.lossStreak).toBe(s.lossStreak + 1);
  });

  it('a Retreat pays no Amber (it costs no trophies, so loss Amber would be a free farm), and the timed lengths keep theirs', () => {
    const retreat = (format: string) => {
      const s = arena3({ charges: 0 });
      const c = clock();
      const opponent = M.pickOpponent(s, 'ladder', C, c, { format });
      return M.applyMatchResult(s, matchInput('ladder', 'loss', opponent, { reason: 'retreat' }), C, c);
    };
    const last = retreat('last');
    expect(last.rewards[0]).toEqual({ kind: 'trophies', delta: 0 });
    expect(last.rewards.some((x) => x.kind === 'amber' || x.kind === 'capsule' || x.kind === 'clayPip')).toBe(false);
    expect(last.save.currencies.amber).toBe(arena3({ charges: 0 }).currencies.amber);
    // A Retreat in a ranked length still costs trophies and pays the loss Amber (A6.3).
    const full = retreat('full');
    expect(full.rewards[0]).toEqual({ kind: 'trophies', delta: -20 });
    expect(full.rewards).toContainEqual({ kind: 'amber', amount: 15 });
  });

  it('is offered from Arena 1 (owner decision 2026-10-03); an arena without it falls back to its first length', () => {
    const s = scripted();
    const low: SaveDoc = { ...s, trophies: { current: 50, best: 50, roadClaimed: [] }, arenaIndex: 0, flags: { ...s.flags, 'meta.ladderPlayed': true } };
    const r = play(low, 'ladder', 'win', undefined, { format: 'last' });
    expect(r.opponent.format).toBe('last');
    expect(r.rewards[0]).toEqual({ kind: 'trophies', delta: 0 });
    // The fallback rule stays: a length the arena does not offer plays the arena's first one.
    const shortOnly: Content = { ...C, arenas: { ...C.arenas, list: C.arenas.list.map((a) => ({ ...a, ladderFormats: ['short'] })) } };
    expect(M.pickOpponent(low, 'ladder', shortOnly, clock(), { format: 'last' }).format).toBe('short');
  });
});
