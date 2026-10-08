/**
 * Base flags (DESIGN A18.9.4; PLAN 2a "Base flags"): emblems on the team colour, cut as swallowtail
 * banners, drawn in `cosmetics/flags.ts`. Owned by Track C (national flags: `cosmetics.nationalFlags.test.ts`).
 */
import { describe, expect, it } from 'vitest';
import { content } from '@/content';
import { baseFlagDesign, cosmeticSvg, hasCosmeticArt } from '../cosmetics/art';
import { BANNER_OUTLINE, BASE_FLAGS } from '../cosmetics/flags';

const baseFlags = content.cosmetics.collections.items.filter((x) => x.collection === 'baseFlag' && x.released !== false);

describe('base flags', () => {
  it('draws every released base flag of the content', () => {
    expect(baseFlags.length).toBeGreaterThanOrEqual(15);
    for (const x of baseFlags) expect(hasCosmeticArt('baseFlag', x.id), x.id).toBe(true);
  });

  it('paints base flags in the team colour', () => {
    expect(cosmeticSvg('baseFlag.ember', { team: 0x2f7df6 })).toContain('#2f7df6');
    expect(cosmeticSvg('baseFlag.ember', { team: 0xf28a1e })).toContain('#f28a1e');
  });

  it('cuts every base flag as a swallowtail banner', () => {
    for (const id of Object.keys(BASE_FLAGS)) expect(baseFlagDesign(id)?.outline, id).toBe(BANNER_OUTLINE);
    expect(baseFlagDesign('nowhere')).toBeNull();
  });
});
