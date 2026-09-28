/**
 * The reveal data meta produces is what the capsule show (WP10) expects (docs/requests/
 * wp10-meta-reveal-data.md): WP10's own checks find no issue in any capsule or crate meta reveals.
 */
import { describe, expect, it } from 'vitest';
import { createCatalog } from '@/capsule/catalog';
import { checkPlan, planWardrobeShow } from '@/capsule/plan';
import { resolveStrikes } from '@/capsule/tiers';
import { C, M, clock, fresh, lastPending, scripted } from './helpers';

describe('reveals meet the capsule show contract (WP10)', () => {
  it('climbs and strikes agree with the tiers for every kind, scripted capsules included', () => {
    let s = fresh(31);
    const kinds = ['win', 'win', 'daily', 'meter', 'win', 'win', 'daily', 'age', 'codex', 'road', 'conquest', 'ageUnlock'] as const;
    for (let round = 0; round < 20; round += 1) {
      for (const kind of kinds) {
        const g = M.grantCapsule(s, kind, C, clock(), kind === 'road' || kind === 'conquest' ? { tier: 'jade' } : kind === 'ageUnlock' ? { age: 'future' } : undefined);
        const o = M.openCapsule(g, lastPending(g).id);
        expect(resolveStrikes(o.reveal).issues).toEqual([]);
        s = o.save;
      }
    }
  });

  it('every Wardrobe Crate reveal plays as a card flip of the pre-rolled skin (A15.3: no reel)', () => {
    let s = scripted(32);
    const catalog = createCatalog(C);
    for (let i = 0; i < 100; i += 1) {
      s = M.grantWardrobe(s, 'road', C, clock());
      const o = M.openWardrobe(s, s.capsules.wardrobe[0]!.id);
      expect(o.reveal.reelTiles).toEqual([]);
      const plan = planWardrobeShow(o.reveal, { catalog });
      expect(checkPlan(plan)).toEqual([]);
      expect(plan.cards[0]?.skin).toBe(o.reveal.crate.skin);
      expect(plan.cards[0]?.rarity).toBe(o.reveal.crate.rarity);
      s = o.save;
    }
  });
});
