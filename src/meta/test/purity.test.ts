/**
 * Purity and determinism (DESIGN B2, B9): every meta function takes a save and returns a new one,
 * never mutating its input, and the same inputs always give the same outputs. Also a long mixed
 * session through the whole contract stays self-consistent.
 */
import { describe, expect, it } from 'vitest';
import type { SaveDoc } from '@/contracts';
import { C, DAY, HOUR, M, TestClock, T0, deepFreeze, fresh, lastPending, ownsAll, play, scripted } from './helpers';

describe('purity', () => {
  it('no meta function mutates a (frozen) input save', () => {
    const c = new TestClock(T0);
    const s = deepFreeze(ownsAll(scripted(8, 3, c), 3, 200));
    const withCap = deepFreeze(M.grantCapsule(s, 'win', C, c));
    const withCrate = deepFreeze(M.grantWardrobe(s, 'codex', C, c));
    // A write to a frozen object throws in strict mode, so every call below proves it only reads.
    M.tickTimers(s, c.advance(DAY));
    for (const mode of ['ladder', 'daily', 'conquest', 'skirmish', 'tutorial'] as const) {
      play(s, mode, 'win', c, { conquestGeneral: 'pip' });
      play(s, mode, 'loss', c, { conquestGeneral: 'pip' });
    }
    M.openCapsule(withCap, lastPending(withCap).id);
    M.openWardrobe(withCrate, withCrate.capsules.wardrobe[0]!.id);
    M.upgrade(s, 'bonker', C);
    M.craft({ ...s, currencies: { amber: 0, dust: 9999 } }, 'pumpkin_head', C);
    M.validatePlan(s.warPlans[0]!, s, C, 'full');
    M.autoFill(s, C);
    M.equipNow(s, 'sabertooth', C);
    M.claimRoadNode(s, 50, C, c);
    M.claimQuest(s, 0, C, c);
    M.rerollQuest(s, 0, C);
    M.claimDailyCapsule(s, C, c);
  });

  it('same inputs, same outputs', () => {
    const run = (): SaveDoc => {
      const c = new TestClock(T0);
      let s = fresh(77, c);
      for (let i = 0; i < 30; i += 1) {
        c.advance(3 * HOUR);
        s = M.tickTimers(s, c);
        const mode = i < 2 ? 'tutorial' : 'ladder';
        s = play(s, mode, i % 3 === 0 ? 'loss' : 'win', c).save;
        while (s.capsules.pending.length > 0) s = M.openCapsule(s, s.capsules.pending[0]!.id).save;
        const d = M.claimDailyCapsule(s, C, c);
        if (d.ok) s = d.value;
      }
      return s;
    };
    expect(run()).toEqual(run());
  });
});

describe('a long session through the contract', () => {
  it('stays consistent: no negative currencies, levels within 1-10, counters bounded', () => {
    const c = new TestClock(T0);
    let s = fresh(5, c);
    const road = C.trophyRoad.nodes.map((n) => n.trophies);
    for (let day = 0; day < 40; day += 1) {
      c.t = T0 + day * DAY;
      s = M.tickTimers(s, c);
      for (let m = 0; m < 6; m += 1) {
        c.advance(10 * 60_000);
        const mode = s.matchesPlayed < 2 ? 'tutorial' : m === 5 ? 'daily' : 'ladder';
        s = play(s, mode, (day + m) % 5 === 0 ? 'loss' : 'win', c, { stats: { trained: 25, evolves: 3 } }).save;
      }
      for (const t of road) {
        const r = M.claimRoadNode(s, t, C, c);
        if (r.ok) s = r.value;
      }
      s.quests.daily.forEach((_, i) => {
        const r = M.claimQuest(s, i, C, c);
        if (r.ok) s = r.value;
      });
      const d = M.claimDailyCapsule(s, C, c);
      if (d.ok) s = d.value;
      while (s.capsules.pending.length > 0) s = M.openCapsule(s, s.capsules.pending[0]!.id).save;
      while (s.capsules.wardrobe.length > 0) s = M.openWardrobe(s, s.capsules.wardrobe[0]!.id).save;
      for (const id of Object.keys(s.collection)) {
        const r = M.upgrade(s, id, C);
        if (r.ok) s = r.value;
      }
      expect(s.currencies.amber).toBeGreaterThanOrEqual(0);
      expect(s.currencies.dust).toBeGreaterThanOrEqual(0);
      for (const e of Object.values(s.collection)) {
        expect(e.level).toBeGreaterThanOrEqual(1);
        expect(e.level).toBeLessThanOrEqual(10);
      }
      expect(s.capsules.charges).toBeLessThanOrEqual(12);
      expect(s.capsules.dailyBank).toBeLessThanOrEqual(3);
      expect(s.quests.daily.filter((q) => !q.claimed).length).toBeLessThanOrEqual(6);
      expect(s.pity.sinceEpic).toBeLessThan(10);
      expect(s.pity.sinceLegendary).toBeLessThan(40);
    }
    expect(s.arenaIndex).toBeGreaterThan(0);
    expect(s.codexLevel).toBeGreaterThan(1);
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});
