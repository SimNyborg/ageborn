import { describe, expect, it } from 'vitest';
import type { CapsuleTier } from '@/contracts';
import { drumState } from '../climb';
import { climbCount, crestCount, isBackLoaded, isSummitTier, litRingCount, resolveStrikes, strikePattern, strikeSplit, summitGemCount, SUMMIT_ABOVE, TIER_ORDER, tierIndex } from '../tiers';
import { reveal, stack } from './fixtures';

describe('tiers (DESIGN A10 step 3)', () => {
  it('orders tiers Clay → Aeon', () => {
    expect(TIER_ORDER).toEqual(['clay', 'bronze', 'silver', 'jade', 'gold', 'platinum', 'aeon']);
    expect(tierIndex('clay')).toBe(0);
    expect(tierIndex('gold')).toBe(4);
    expect(tierIndex('aeon')).toBe(6);
  });

  it('counts climbs as the tier index above the start tier (main plus summit strikes)', () => {
    expect(climbCount('clay', 'clay')).toBe(0);
    expect(climbCount('clay', 'gold')).toBe(4);
    expect(climbCount('clay', 'aeon')).toBe(6);
    expect(climbCount('bronze', 'jade')).toBe(2);
    expect(climbCount('silver', 'bronze')).toBe(0);
    expect(strikeSplit('clay', 'aeon')).toEqual({ main: 4, summit: 2 });
    expect(strikeSplit('bronze', 'platinum')).toEqual({ main: 3, summit: 1 });
    expect(strikeSplit('platinum', 'platinum')).toEqual({ main: 0, summit: 0 });
  });

  it('back-loads the climbs: 4 − k misses, then k climbs', () => {
    expect(strikePattern(0)).toEqual([false, false, false, false]);
    expect(strikePattern(1)).toEqual([false, false, false, true]);
    expect(strikePattern(2)).toEqual([false, false, true, true]);
    expect(strikePattern(3)).toEqual([false, true, true, true]);
    expect(strikePattern(4)).toEqual([true, true, true, true]);
    for (let k = 0; k <= 4; k++) expect(isBackLoaded(strikePattern(k))).toBe(true);
  });

  it('detects a climb followed by a non-climb', () => {
    expect(isBackLoaded([false, true, false, true])).toBe(false);
    expect(isBackLoaded([true, false, false, false])).toBe(false);
    expect(isBackLoaded([false, false, true, true])).toBe(true);
  });

  it('resolves every start/tier pair to a back-loaded climb ending on the rolled tier', () => {
    for (const start of TIER_ORDER) {
      for (const tier of TIER_ORDER) {
        if (tierIndex(tier) < tierIndex(start)) continue;
        const r = resolveStrikes(reveal({ tier, startTier: start, stacks: [stack('bonker', 'common')] }));
        expect(r.issues).toEqual([]);
        expect(isBackLoaded(r.strikes)).toBe(true);
        expect(r.climbs).toBe(tierIndex(tier) - tierIndex(start));
        expect(r.startShown).toBe(start);
        // The main strikes end at the rolled tier or at Gold; summit strikes climb the rest, one each.
        const top = tierIndex(SUMMIT_ABOVE);
        expect(r.tiersAfter[3]).toBe(TIER_ORDER[Math.min(tierIndex(tier), Math.max(top, tierIndex(start)))]);
        expect(r.summitTiers).toEqual(TIER_ORDER.slice(Math.max(top, tierIndex(start)) + 1, tierIndex(tier) + 1));
        expect([...r.tiersAfter, ...r.summitTiers].at(-1)).toBe(tier);
        // Each climb raises the shown tier by exactly one step.
        let prev: CapsuleTier = start;
        r.strikes.forEach((climb, i) => {
          const now = r.tiersAfter[i] as CapsuleTier;
          expect(tierIndex(now) - tierIndex(prev)).toBe(climb ? 1 : 0);
          prev = now;
        });
      }
    }
  });

  it('never trusts a front-loaded strike list: the pattern comes from the rolled tiers', () => {
    const rev = reveal({ tier: 'silver', startTier: 'clay', stacks: [] });
    const bad = { ...rev, strikeClimbs: [true, false, true, false], climbs: 3 };
    const r = resolveStrikes(bad);
    expect(r.strikes).toEqual([false, false, true, true]);
    expect(r.tiersAfter[3]).toBe('silver');
    expect(r.issues.length).toBe(2);
  });

  it('never shows a start tier above the rolled tier', () => {
    const rev = reveal({ tier: 'bronze', startTier: 'clay', stacks: [] });
    const odd = { ...rev, capsule: { ...rev.capsule, startTier: 'jade' as CapsuleTier } };
    const r = resolveStrikes(odd);
    expect(r.startShown).toBe('bronze');
    expect(r.strikes).toEqual([false, false, false, false]);
    expect(r.tiersAfter).toEqual(['bronze', 'bronze', 'bronze', 'bronze']);
    expect(r.issues.some((s) => s.includes('above'))).toBe(true);
  });
});

describe('the ladder on the drum (A10 honest-climb invariants)', () => {
  it('draws only what the tier has earned: rings 1-5, then summit gems, crests from the guaranteed Legendaries', () => {
    const expected: Record<string, [number, number, number]> = {
      clay: [1, 0, 0],
      bronze: [2, 0, 0],
      silver: [3, 0, 0],
      jade: [4, 0, 0],
      gold: [5, 0, 1],
      platinum: [5, 1, 2],
      aeon: [5, 2, 3],
    };
    for (const t of TIER_ORDER) {
      const s = drumState(t);
      expect([litRingCount(t), s.gems.length, s.crests], t).toEqual(expected[t]);
      expect(s.crests).toBe(crestCount(t));
      // Every summit gem on a drum is lit, each in the tier its strike reached.
      expect(s.gems, t).toEqual(TIER_ORDER.filter((x) => isSummitTier(x) && tierIndex(x) <= tierIndex(t)));
    }
  });

  it('resolves every start and final pair into main strikes, then summit strikes that each climb one tier above Gold', () => {
    for (const start of TIER_ORDER) {
      for (const tier of TIER_ORDER.slice(TIER_ORDER.indexOf(start))) {
        const k = climbCount(start, tier);
        const r = resolveStrikes({ capsule: { id: 'x', kind: 'win', tier, startTier: start, scriptIndex: null, age: null, createdAt: 0, contents: { stacks: [], amber: 0, dust: 0, skin: null } }, climbs: k, strikeClimbs: strikePattern(strikeSplit(start, tier).main) });
        expect(r.issues).toEqual([]);
        // A summit gem appears only when the tier is above Gold.
        expect(r.summitTiers.every(isSummitTier), `${start}>${tier}`).toBe(true);
        expect(r.summitTiers.length, `${start}>${tier}`).toBe(summitGemCount(tier) - summitGemCount(start));
        // The climbs add up and the last tier shown is the rolled tier.
        expect(r.strikes.filter(Boolean).length + r.summitTiers.length).toBe(k);
        const last = r.summitTiers[r.summitTiers.length - 1] ?? r.tiersAfter[r.tiersAfter.length - 1];
        expect(last, `${start}>${tier}`).toBe(tier);
        expect(isBackLoaded([...r.strikes, ...r.summitTiers.map(() => true)])).toBe(true);
      }
    }
  });
});
