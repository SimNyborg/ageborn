/**
 * The reveal data meta produces is what the capsule show (WP10) expects (docs/requests/
 * wp10-meta-reveal-data.md): WP10's own checks find no issue in any capsule or crate meta reveals.
 */
import { describe, expect, it } from 'vitest';
import { checkReel } from '@/capsule/reelMath';
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

  it('every Wardrobe reel passes WP10 checkReel', () => {
    let s = scripted(32);
    const rarityOf = (id: string) => C.skins[id]!.rarity;
    for (let i = 0; i < 200; i += 1) {
      s = M.grantWardrobe(s, 'road', C, clock());
      const o = M.openWardrobe(s, s.capsules.wardrobe[0]!.id);
      expect(checkReel(o.reveal, rarityOf)).toEqual([]);
      s = o.save;
    }
  });
});
