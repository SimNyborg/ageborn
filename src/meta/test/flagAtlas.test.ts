/**
 * The Flag Atlas (PLAN 2d; `meta/flagAtlas.ts`; owner decisions 2026-10-08): buying a national flag
 * with Dust, the region and total rewards a purchase completes, the Atlas's counts and the search. Owned
 * by Track D; C0 seeded it with the checks the baseline already meets.
 */
import { describe, expect, it } from 'vitest';
import type { SaveDoc } from '@/contracts';
import type { Content, CosmeticItemDef, TitleDef } from '@/content';
import { createI18n, flattenStrings } from '@/i18n';
import flagStrings from '@/i18n/flags.en.json';
import { buyNationalFlag, flagAtlasProgress, searchFlags } from '../flagAtlas';
import { unlockTitles } from '../titles';
import { C, fresh, M } from './helpers';

const col = C.cosmetics.collections;
const ok = <T,>(r: { ok: true; value: T } | { ok: false; reason: string }): T => {
  if (!r.ok) throw new Error(r.reason);
  return r.value;
};
const rich = (dust = 2000): SaveDoc => ({ ...fresh(), currencies: { amber: 0, dust } });
const names = createI18n({ en: flattenStrings(flagStrings) });

/** The content with the Atlas's rewards (a Region Pennant for Oceania, the World Compass at 3, the title at 3). */
function withRewards(): Content {
  const pennant: CosmeticItemDef = { id: 'pennant_oceania', collection: 'baseFlag', rarity: 'epic', source: { kind: 'flagRegion', region: 'oceania' }, art: 'cosmetic.baseFlag.pennant_oceania', nameKey: 'cosmetic.baseFlag.pennant_oceania.name' };
  const compass: CosmeticItemDef = { id: 'world_compass', collection: 'baseFlag', rarity: 'legendary', source: { kind: 'flagsOwned', count: 3 }, art: 'cosmetic.baseFlag.world_compass', nameKey: 'cosmetic.baseFlag.world_compass.name' };
  const title: TitleDef = { id: 'world_ambassador', unlock: { kind: 'flagsOwned', count: 3 }, nameKey: 'title.world_ambassador.name' };
  return { ...C, cosmetics: { ...C.cosmetics, titles: [...C.cosmetics.titles, title], collections: { ...col, items: [...col.items, pennant, compass] } } };
}

describe('buying a national flag', () => {
  it('the first is on the house, every other one costs 500 Dust, each once', () => {
    const a = ok(buyNationalFlag(rich(), C, 'nationalFlag.dk'));
    expect(a.currencies.dust).toBe(2000);
    expect(a.cosmetics.owned).toContain('nationalFlag.dk');
    const b = ok(buyNationalFlag(a, C, 'nationalFlag.br'));
    expect(b.currencies.dust).toBe(1500);
    expect(buyNationalFlag(b, C, 'nationalFlag.br')).toEqual({ ok: false, reason: 'owned' });
    expect(buyNationalFlag({ ...b, currencies: { amber: 0, dust: 499 } }, C, 'nationalFlag.se')).toEqual({ ok: false, reason: 'notEnoughDust' });
    // through the meta rules too
    expect(ok(M.buyNationalFlag(b, 'nationalFlag.se', C)).currencies.dust).toBe(1000);
  });

  it('buys national flags only', () => {
    expect(buyNationalFlag(rich(), C, 'baseFlag.oak')).toEqual({ ok: false, reason: 'wrongCollection' });
    expect(buyNationalFlag(rich(), C, 'nationalFlag.atlantis')).toEqual({ ok: false, reason: 'unknownItem' });
  });

  it('grants the region reward, the total reward and the title with the completing purchase, once', () => {
    const T = withRewards();
    let s = ok(buyNationalFlag(rich(5000), T, 'nationalFlag.au'));
    expect(s.cosmetics.owned).not.toContain('baseFlag.pennant_oceania');
    s = ok(buyNationalFlag(s, T, 'nationalFlag.nz'));
    expect(s.cosmetics.owned).toContain('baseFlag.pennant_oceania');
    expect(s.cosmetics.owned).not.toContain('world_ambassador');
    // the Other flags do not count toward the total
    s = ok(buyNationalFlag(s, T, 'nationalFlag.fo'));
    expect(s.cosmetics.owned).not.toContain('baseFlag.world_compass');
    s = ok(buyNationalFlag(s, T, 'nationalFlag.dk'));
    expect(s.cosmetics.owned).toContain('baseFlag.world_compass');
    expect(s.cosmetics.owned).toContain('world_ambassador');
    expect(s.cosmetics.owned.filter((k) => k === 'baseFlag.pennant_oceania')).toHaveLength(1);
    expect(unlockTitles(s, T).titles).toEqual([]);
  });
});

describe('the Atlas', () => {
  it('counts the flags of the six regions and every region in chip order', () => {
    const s = ok(buyNationalFlag(ok(buyNationalFlag(rich(), C, 'nationalFlag.dk')), C, 'nationalFlag.fo'));
    const a = flagAtlasProgress(s, C);
    expect(a.regions.map((r) => r.region)).toEqual(['europe', 'asia', 'africa', 'northAmerica', 'southAmerica', 'oceania', 'other']);
    expect(a.owned).toBe(1);
    expect(a.total).toBe(col.items.filter((x) => x.collection === 'nationalFlag' && x.region !== 'other').length);
    expect(a.regions.find((r) => r.region === 'europe')).toMatchObject({ owned: 1, reward: null, rewardOwned: false });
    expect(a.regions.find((r) => r.region === 'other')).toMatchObject({ owned: 1 });
    expect(a.price).toBe(500);
    expect(flagAtlasProgress(rich(), C).price).toBe(0);
    expect(a.equipped).toBeNull();
    const w = flagAtlasProgress(fresh(), withRewards()).regions.find((r) => r.region === 'oceania');
    expect(w).toMatchObject({ reward: 'baseFlag.pennant_oceania', rewardOwned: false });
  });
});

describe('the search', () => {
  const ids = (q: string) => searchFlags(C, names, q).map((x) => x.id);

  it('matches a prefix of the name or of a word in it, accent-insensitive', () => {
    expect(ids('den')).toEqual(['dk']);
    expect(ids('tur')).toContain('tr');
    expect(ids('türk')).toEqual(['tr']);
    expect(ids('TURK')).toEqual(['tr']);
    expect(ids('zealand')).toEqual(['nz']);
  });

  it('matches aliases and ISO codes', () => {
    expect(ids('uk')).toContain('gb');
    expect(ids('holland')).toEqual(['nl']);
    expect(ids('usa')).toContain('us');
    expect(ids('gb-eng')).toEqual(['gb_eng']);
  });

  it('lists every flag for an empty query and none for nonsense', () => {
    expect(ids('').length).toBe(col.items.filter((x) => x.collection === 'nationalFlag').length);
    expect(ids('   ')).toHaveLength(ids('').length);
    expect(ids('qqqq')).toEqual([]);
  });
});
