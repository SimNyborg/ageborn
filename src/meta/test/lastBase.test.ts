/**
 * Last Base Standing rewards (DESIGN A2.10.1, A6.3, A15.8): ranked since the owner decision of
 * 2026-10-03 (+48 trophies a win from Arena 1, −20 a loss from 400, draw 0), 47 (94) Amber, and
 * otherwise a Ladder match (Sundial claim or Clay pip, hidden MMR, loss streak, counting win). A
 * Retreat pays nothing, here as in every length (2026-10-03). The format family and the windows.
 */
import { describe, expect, it } from 'vitest';
import type { Content } from '@/content';
import type { SaveDoc } from '@/contracts';
import { formatKind, rewardFormat, windowOf } from '../formats';
import { ladderWinFor, trophyDelta } from '../trophies';
import { updateMmr } from '../mmr';
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
  it('is ranked: +48 on a win at every count, −20 on a loss from 400 (none below, never below the gate), 0 on a draw', () => {
    for (const t of [0, 150, 399, 400, 600, 3500]) {
      const s = arena3({ trophies: t });
      expect(ladderWinFor(s, C, 'last')).toEqual({ trophies: 48, amber: 47, amberWithoutCharge: 94 });
      expect(trophyDelta(s, C, 'win', 'last'), `${t} win`).toBe(48);
      expect(trophyDelta(s, C, 'draw', 'last'), `${t} draw`).toBe(0);
    }
    // Below 400 a loss costs nothing, as in every length (A6.3).
    for (const t of [0, 150, 399]) expect(trophyDelta(arena3({ trophies: t }), C, 'loss', 'last'), String(t)).toBe(0);
    expect(trophyDelta(arena3({ trophies: 600 }), C, 'loss', 'last')).toBe(-20);
    // Never below the current arena gate (Arena 3 at 400).
    expect(trophyDelta(arena3({ trophies: 410 }), C, 'loss', 'last')).toBe(-10);
    // The same loss and draw rule as a Long War.
    for (const t of [150, 410, 600]) for (const r of ['loss', 'draw'] as const) expect(trophyDelta(arena3({ trophies: t }), C, r, 'last')).toBe(trophyDelta(arena3({ trophies: t }), C, r, 'full'));
  });

  it('a win: +48 trophies, 47 Amber and a Sundial Capsule; MMR and the counting-win path as a Ladder match', () => {
    const s = arena3();
    const r = play(s, 'ladder', 'win', undefined, { format: 'last' });
    expect(r.opponent.format).toBe('last');
    expect(r.rewards[0]).toEqual({ kind: 'trophies', delta: 48 });
    expect(r.rewards).toContainEqual({ kind: 'amber', amount: 47 });
    expect(r.rewards.some((x) => x.kind === 'capsule')).toBe(true);
    expect(r.save.trophies.current).toBe(648);
    expect(r.save.trophies.best).toBe(648);
    expect(r.save.mmr).toBe(updateMmr(s.mmr, r.opponent.tier, 'win', C.arenas.ladder));
    expect(r.save.mmr).toBeGreaterThan(s.mmr);
    expect(r.save.lossStreak).toBe(0);
    expect(r.save.stats.wins).toBe(s.stats.wins + 1);
  });

  it('a win in Arena 1 pays +48 too', () => {
    const s = scripted();
    const low: SaveDoc = { ...s, trophies: { current: 50, best: 50, roadClaimed: [] }, arenaIndex: 0, flags: { ...s.flags, 'meta.ladderPlayed': true } };
    const r = play(low, 'ladder', 'win', undefined, { format: 'last' });
    expect(r.rewards[0]).toEqual({ kind: 'trophies', delta: 48 });
    expect(r.save.trophies.current).toBe(98);
  });

  it('a win with the Sundial empty pays 94 Amber and a Clay pip', () => {
    const r = play(arena3({ charges: 0 }), 'ladder', 'win', undefined, { format: 'last' });
    expect(r.rewards).toContainEqual({ kind: 'amber', amount: 94 });
    expect(r.rewards.some((x) => x.kind === 'clayPip')).toBe(true);
  });

  it('a loss: −20 trophies from 400, 15 Amber, the hidden MMR falls and the loss streak counts (loss protection)', () => {
    const s = arena3();
    const r = play(s, 'ladder', 'loss', undefined, { format: 'last' });
    expect(r.rewards[0]).toEqual({ kind: 'trophies', delta: -20 });
    expect(r.rewards).toContainEqual({ kind: 'amber', amount: 15 });
    expect(r.save.trophies.current).toBe(580);
    expect(r.save.mmr).toBe(updateMmr(s.mmr, r.opponent.tier, 'loss', C.arenas.ladder));
    expect(r.save.mmr).toBeLessThan(s.mmr);
    expect(r.save.lossStreak).toBe(s.lossStreak + 1);
    // Below 400 a loss keeps the trophies (A6.3) but still moves the MMR and the streak.
    const low = arena3({ trophies: 300 });
    const l = play(low, 'ladder', 'loss', undefined, { format: 'last' });
    expect(l.rewards[0]).toEqual({ kind: 'trophies', delta: 0 });
    expect(l.save.trophies.current).toBe(300);
    expect(l.save.mmr).toBeLessThan(low.mmr);
    expect(l.save.lossStreak).toBe(low.lossStreak + 1);
  });

  it('a draw: 0 trophies, 15 Amber, MMR moves as a draw and the loss streak resets', () => {
    const s = { ...arena3(), lossStreak: 2 };
    const r = play(s, 'ladder', 'draw', undefined, { format: 'last' });
    expect(r.rewards[0]).toEqual({ kind: 'trophies', delta: 0 });
    expect(r.rewards).toContainEqual({ kind: 'amber', amount: 15 });
    expect(r.save.trophies.current).toBe(600);
    expect(r.save.mmr).toBe(updateMmr(s.mmr, r.opponent.tier, 'draw', C.arenas.ladder));
    expect(r.save.lossStreak).toBe(0);
  });

  it('three losses in a row bring the warm-up opponent, as in every length (loss protection, A6.3)', () => {
    let s = arena3();
    for (let i = 0; i < 3; i += 1) s = play(s, 'ladder', 'loss', undefined, { format: 'last' }).save;
    expect(s.lossStreak).toBe(3);
    const o = M.pickOpponent(s, 'ladder', C, clock(), { format: 'last' });
    expect(o.warmUp).toBe(true);
  });

  it('a Retreat costs trophies like any loss but pays no Amber, in every length (A6.3, 2026-10-03)', () => {
    const retreat = (format: string, trophies = 600) => {
      const s = arena3({ charges: 0, trophies });
      const c = clock();
      const opponent = M.pickOpponent(s, 'ladder', C, c, { format });
      return M.applyMatchResult(s, matchInput('ladder', 'loss', opponent, { reason: 'retreat' }), C, c);
    };
    const last = retreat('last');
    expect(last.rewards[0]).toEqual({ kind: 'trophies', delta: -20 });
    expect(last.rewards.some((x) => x.kind === 'amber' || x.kind === 'capsule' || x.kind === 'clayPip')).toBe(false);
    expect(last.save.currencies.amber).toBe(arena3({ charges: 0 }).currencies.amber);
    // Below 400 it costs nothing and still pays nothing.
    const low = retreat('last', 200);
    expect(low.rewards[0]).toEqual({ kind: 'trophies', delta: 0 });
    expect(low.rewards.some((x) => x.kind === 'amber')).toBe(false);
    // The timed lengths too (they paid the 15 loss Amber before 2026-10-03).
    for (const format of ['short', 'standard', 'full']) {
      const r = retreat(format);
      expect(r.rewards).toEqual([{ kind: 'trophies', delta: -20 }]);
      expect(r.save.currencies.amber).toBe(arena3({ charges: 0 }).currencies.amber);
    }
  });

  it('is offered from Arena 1 (owner decision 2026-10-03); an arena without it falls back to its first length', () => {
    const s = scripted();
    const low: SaveDoc = { ...s, trophies: { current: 50, best: 50, roadClaimed: [] }, arenaIndex: 0, flags: { ...s.flags, 'meta.ladderPlayed': true } };
    const r = play(low, 'ladder', 'win', undefined, { format: 'last' });
    expect(r.opponent.format).toBe('last');
    // The fallback rule stays: a length the arena does not offer plays the arena's first one.
    const shortOnly: Content = { ...C, arenas: { ...C.arenas, list: C.arenas.list.map((a) => ({ ...a, ladderFormats: ['short'] })) } };
    expect(M.pickOpponent(low, 'ladder', shortOnly, clock(), { format: 'last' }).format).toBe('short');
  });
});
