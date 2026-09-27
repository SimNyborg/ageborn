import { describe, expect, it } from 'vitest';
import type { CapsuleTier } from '@/contracts';
import { climbCount, isBackLoaded, resolveStrikes, strikePattern, TIER_ORDER, tierIndex } from '../tiers';
import { reveal, stack } from './fixtures';

describe('tiers (DESIGN A10 step 3)', () => {
  it('orders tiers Clay → Aeon', () => {
    expect(TIER_ORDER).toEqual(['clay', 'bronze', 'silver', 'jade', 'aeon']);
    expect(tierIndex('clay')).toBe(0);
    expect(tierIndex('aeon')).toBe(4);
  });

  it('counts climbs as the tier index above the start tier', () => {
    expect(climbCount('clay', 'clay')).toBe(0);
    expect(climbCount('clay', 'aeon')).toBe(4);
    expect(climbCount('bronze', 'jade')).toBe(2);
    expect(climbCount('silver', 'bronze')).toBe(0);
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
        expect(r.tiersAfter[3]).toBe(tier);
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
