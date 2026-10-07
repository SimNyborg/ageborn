/**
 * A Retreat pays nothing (DESIGN A6.3, A15.4; owner decision 2026-10-03, "at give op giver intet"):
 * no Amber in any length, no Sundial Capsule, Clay pip, feat, quest progress, Supply Capsule or
 * match-based title. It still counts as a loss: trophies (none below 400), MMR, loss streak, stats.
 */
import { describe, expect, it } from 'vitest';
import type { FormatId, MatchResultInput, SaveDoc } from '@/contracts';
import { updateMmr } from '../mmr';
import { C, M, clock, matchInput, scripted } from './helpers';

function ladderSave(trophies = 600): SaveDoc {
  const s = scripted();
  return {
    ...s,
    trophies: { current: trophies, best: trophies, roadClaimed: [] },
    arenaIndex: 2,
    capsules: { ...s.capsules, freeCapsulesLeft: 0, charges: 3 },
    flags: { ...s.flags, 'meta.ladderPlayed': true },
  };
}

// A battle with plenty done before leaving: enough to move quests and find a loss feat.
const played = { trained: 40, turretKills: 3, baseDamage: 5000, evolves: 2 };

function result(s: SaveDoc, mode: MatchResultInput['mode'], reason: MatchResultInput['outcome']['reason'], format?: FormatId) {
  const c = clock();
  const opponent = M.pickOpponent(s, mode, C, c, format ? { format } : {});
  const input = { ...matchInput(mode, 'loss', opponent, { reason, stats: played }), feats: ['old_guard'] };
  return { r: M.applyMatchResult(s, input, C, c), opponent };
}

describe('a Retreat pays nothing (A6.3, 2026-10-03)', () => {
  it('in every Ladder length: only the trophy step, no Amber, capsule, pip, feat or quest progress', () => {
    for (const format of ['short', 'standard', 'full', 'last'] as const) {
      const s = ladderSave();
      const { r, opponent } = result(s, 'ladder', 'retreat', format);
      expect(r.rewards).toEqual([{ kind: 'trophies', delta: -20 }]);
      expect(r.save.currencies).toEqual(s.currencies);
      expect(r.save.capsules.pending).toEqual(s.capsules.pending);
      expect(r.save.capsules.charges).toBe(s.capsules.charges);
      expect(r.save.capsules.clayMeter).toBe(s.capsules.clayMeter);
      expect(r.save.quests).toEqual(s.quests);
      expect(r.save.flags['feat.old_guard']).toBeUndefined();
      // Still a loss: trophies, MMR, loss streak and the profile stats move.
      expect(r.save.trophies.current).toBe(580);
      expect(r.save.mmr).toBe(updateMmr(s.mmr, opponent.tier, 'loss', C.arenas.ladder));
      expect(r.save.lossStreak).toBe(s.lossStreak + 1);
      expect(r.save.stats.losses).toBe(s.stats.losses + 1);
      expect(r.save.matchesPlayed).toBe(s.matchesPlayed + 1);
    }
  });

  it('below 400 trophies it costs nothing and still pays nothing', () => {
    const { r } = result(ladderSave(200), 'ladder', 'retreat', 'standard');
    expect(r.rewards).toEqual([{ kind: 'trophies', delta: 0 }]);
  });

  it('is never more rewarding than playing on: the same battle lost on the field pays more', () => {
    const s = ladderSave();
    const lost = result(s, 'ladder', 'baseDestroyed', 'standard').r;
    const left = result(s, 'ladder', 'retreat', 'standard').r;
    expect(lost.save.currencies.amber).toBeGreaterThan(left.save.currencies.amber);
    expect(lost.rewards.some((x) => x.kind === 'capsule')).toBe(true);
    expect(lost.rewards.some((x) => x.kind === 'feat')).toBe(true);
    expect(lost.rewards.some((x) => x.kind === 'quest')).toBe(true);
    expect(left.save.quests).toEqual(s.quests);
    expect(left.rewards.length).toBeLessThan(lost.rewards.length);
    expect(left.save.trophies.current).toBe(lost.save.trophies.current);
  });

  it('outside the Ladder too: Skirmish, Daily and War Path give no step at all', () => {
    for (const mode of ['skirmish', 'daily', 'warPath'] as const) {
      const s = ladderSave();
      const { r } = result(s, mode, 'retreat');
      expect(r.rewards).toEqual([]);
      expect(r.save.currencies).toEqual(s.currencies);
      expect(r.save.quests).toEqual(s.quests);
    }
  });
});
