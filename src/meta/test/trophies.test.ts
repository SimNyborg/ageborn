/**
 * Trophies, arenas and the Trophy Road (DESIGN A6.3, C5 #33).
 */
import { describe, expect, it } from 'vitest';
import type { SaveDoc } from '@/contracts';
import { arenaIndexFor, claimableRoadNodes } from '../trophies';
import { C, M, TestClock, fresh, matchInput, scripted } from './helpers';

function at(s: SaveDoc, best: number): SaveDoc {
  return { ...s, trophies: { current: best, best, roadClaimed: [] }, arenaIndex: arenaIndexFor(C, best) };
}

function claim(s: SaveDoc, trophies: number): SaveDoc {
  const r = M.claimRoadNode(s, trophies, C, new TestClock());
  if (!r.ok) throw new Error(`${trophies}: ${r.reason}`);
  return r.value;
}

describe('arenas (A6.3)', () => {
  it('gates at 0, 150, 400, 800, 1,300, 1,900, 2,600, 3,400', () => {
    expect([0, 149, 150, 399, 400, 800, 1300, 1900, 2600, 3399, 3400, 9999].map((t) => arenaIndexFor(C, t))).toEqual([0, 0, 1, 1, 2, 3, 4, 5, 6, 6, 7, 7]);
  });

  it('arena titles: Siege Scholar at Arena 4, Ageborn at Arena 8', () => {
    let s: SaveDoc = { ...scripted(), trophies: { current: 790, best: 790, roadClaimed: [] }, arenaIndex: 2, flags: { 'meta.ladderPlayed': true } };
    const opp = M.pickOpponent(s, 'ladder', C, new TestClock());
    s = M.applyMatchResult(s, matchInput('ladder', 'win', opp), C, new TestClock()).save;
    expect(s.arenaIndex).toBe(3);
    expect(s.cosmetics.owned).toContain('siege_scholar');
    expect(s.cosmetics.owned).not.toContain('ageborn');
    s = { ...s, trophies: { current: 3380, best: 3380, roadClaimed: [] }, arenaIndex: 6 };
    s = M.applyMatchResult(s, matchInput('ladder', 'win', M.pickOpponent(s, 'ladder', C, new TestClock())), C, new TestClock()).save;
    expect(s.arenaIndex).toBe(7);
    expect(s.cosmetics.owned).toContain('ageborn');
  });
});

describe('Trophy Road (A6.3)', () => {
  it('nodes are claimable once, up to the best trophies', () => {
    const s = at(fresh(), 120);
    expect(claimableRoadNodes(s, C)).toEqual([50, 100]);
    expect(M.claimRoadNode(s, 150, C, new TestClock())).toEqual({ ok: false, reason: 'locked' });
    expect(M.claimRoadNode(s, 75, C, new TestClock())).toEqual({ ok: false, reason: 'unknownNode' });
    const a = claim(s, 50);
    expect(a.currencies.amber).toBe(110);
    expect(M.claimRoadNode(a, 50, C, new TestClock())).toEqual({ ok: false, reason: 'claimed' });
    expect(a.trophies.roadClaimed).toEqual([50]);
  });

  it('alternate powers at 100-500 trophies (C5 #33, A17.13)', () => {
    let s = at(fresh(), 500);
    for (const n of [100, 200, 250, 300, 350, 400, 450, 500]) s = claim(s, n);
    for (const p of ['meteor_shower', 'aegis', 'royal_decree', 'broadside', 'zeppelin_raid', 'carpet_bomber', 'nanite_surge', 'warp_strike']) {
      expect(s.powersOwned).toContain(p);
    }
  });

  it('Gate 2 at 150: the Industrial and Modern Age Unlock Capsules, the Frostfang banner and a Silver Capsule (A17.13)', () => {
    const s = claim(at(scripted(), 150), 150);
    expect(s.cosmetics.owned).toContain('frostfang');
    const kinds = s.capsules.pending.map((p) => [p.kind, p.tier, p.age]);
    expect(kinds).toEqual([
      ['ageUnlock', 'silver', 'industrial'],
      ['ageUnlock', 'silver', 'modern'],
      ['road', 'silver', null],
    ]);
    let o = s;
    for (const p of s.capsules.pending) o = M.openCapsule(o, p.id).save;
    expect(o.collection['harpoon_gunner']?.level).toBe(1);
    expect(o.collection['bazooka_trooper']?.level).toBe(1);
  });

  it('Gate 8 gives the Crystal Spire; road capsules have a fixed tier; Wardrobe nodes grant crates', () => {
    let s = at(scripted(), 3400);
    s = claim(s, 3400);
    expect(s.skins.owned).toContain('crystal_spire');
    expect(s.capsules.pending.some((p) => p.kind === 'road' && p.tier === 'aeon' && p.startTier === 'aeon')).toBe(true);
    s = claim(s, 1000);
    expect(s.capsules.wardrobe.at(-1)?.source).toBe('road');
    const before = s.currencies.dust;
    s = claim(s, 1600);
    expect(s.currencies.dust).toBe(before + 400);
  });

  it('every Amber node pays 100 + 20 × trophies / 100', () => {
    let s = at(scripted(), 4000);
    for (const node of C.trophyRoad.nodes) {
      const before = s.currencies.amber;
      s = claim(s, node.trophies);
      const amber = node.rewards.find((r) => r.kind === 'amber');
      if (amber) expect(s.currencies.amber - before).toBe(100 + (20 * node.trophies) / 100);
    }
    expect(s.trophies.roadClaimed).toHaveLength(60);
  });
});
