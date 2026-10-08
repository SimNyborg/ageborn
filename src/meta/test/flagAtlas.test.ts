/**
 * The Flag Atlas (PLAN 2d, 2g Track D; `meta/flagAtlas.ts`; owner decisions 2026-10-08): buying a
 * national flag with Dust (the first one costs nothing, once), the region and total rewards a purchase
 * completes (granted once), the Atlas's counts and order, the search, and the legacy owners of a v13 save.
 * Owned by Track D.
 */
import { describe, expect, it } from 'vitest';
import type { SaveDoc } from '@/contracts';
import type { Content } from '@/content';
import { createI18n, flattenStrings } from '@/i18n';
import flagStrings from '@/i18n/flags.en.json';
import { migrate } from '@/save';
import v13Json from '@/save/test/fixtures/v13.json';
import { nationalFlagPrice, sideLook, syncEarnedCosmetics } from '../cosmetics';
import { atlasOrder, buyNationalFlag, flagAtlasProgress, foldName, searchFlags } from '../flagAtlas';
import { unlockTitles } from '../titles';
import { C, fresh, M } from './helpers';

const col = C.cosmetics.collections;
const ok = <T,>(r: { ok: true; value: T } | { ok: false; reason: string }): T => {
  if (!r.ok) throw new Error(r.reason);
  return r.value;
};
const rich = (dust = 2000): SaveDoc => ({ ...fresh(), currencies: { amber: 0, dust } });
const names = createI18n({ en: flattenStrings(flagStrings) });
const flagsOf = (region: string) => col.items.filter((x) => x.collection === 'nationalFlag' && x.region === region).map((x) => `nationalFlag.${x.id}`);

/** The content with the World Compass and World Ambassador at `n` flags instead of 195, so a test can reach them. */
function worldAt(n: number): Content {
  const items = col.items.map((x) => (x.source.kind === 'flagsOwned' ? { ...x, source: { kind: 'flagsOwned' as const, count: n } } : x));
  const titles = C.cosmetics.titles.map((x) => (x.unlock.kind === 'flagsOwned' ? { ...x, unlock: { kind: 'flagsOwned' as const, count: n } } : x));
  return { ...C, cosmetics: { ...C.cosmetics, titles, collections: { ...col, items } } };
}

/** Buys every key in turn (each must succeed). */
function buyAll(s: SaveDoc, t: Content, keys: readonly string[]): SaveDoc {
  return keys.reduce((acc, k) => ok(buyNationalFlag(acc, t, k)), s);
}

describe('buying a national flag', () => {
  it('the first costs nothing, every other one costs 500 Dust, each once', () => {
    const a = ok(buyNationalFlag(rich(), C, 'nationalFlag.dk'));
    expect(a.currencies.dust).toBe(2000);
    expect(a.cosmetics.owned).toContain('nationalFlag.dk');
    const b = ok(buyNationalFlag(a, C, 'nationalFlag.br'));
    expect(b.currencies.dust).toBe(1500);
    expect(buyNationalFlag(b, C, 'nationalFlag.br')).toEqual({ ok: false, reason: 'owned' });
    expect(buyNationalFlag({ ...b, currencies: { amber: 0, dust: 499 } }, C, 'nationalFlag.se')).toEqual({ ok: false, reason: 'notEnoughDust' });
    // exactly 500, also for a new flag, an Other flag and Wales
    expect(ok(buyNationalFlag({ ...b, currencies: { amber: 0, dust: 500 } }, C, 'nationalFlag.mx')).currencies.dust).toBe(0);
    expect(ok(buyNationalFlag(b, C, 'nationalFlag.gb_wls')).currencies.dust).toBe(1000);
    // through the meta rules too
    expect(ok(M.buyNationalFlag(b, 'nationalFlag.se', C)).currencies.dust).toBe(1000);
  });

  it('the first flag is on the house only while nothing else is owned, and the switch turns it off', () => {
    const none = rich(0);
    expect(nationalFlagPrice(none, C)).toBe(0);
    expect(ok(buyNationalFlag(none, C, 'nationalFlag.np')).cosmetics.owned).toContain('nationalFlag.np');
    const off: Content = { ...C, cosmetics: { ...C.cosmetics, collections: { ...col, drops: { ...col.drops, firstFlagFree: false } } } };
    expect(buyNationalFlag(none, off, 'nationalFlag.np')).toEqual({ ok: false, reason: 'notEnoughDust' });
  });

  it('buys national flags only, and only known ones', () => {
    expect(buyNationalFlag(rich(), C, 'baseFlag.oak')).toEqual({ ok: false, reason: 'wrongCollection' });
    expect(buyNationalFlag(rich(), C, 'baseFlag.pennant_europe')).toEqual({ ok: false, reason: 'wrongCollection' });
    expect(buyNationalFlag(rich(), C, 'nationalFlag.atlantis')).toEqual({ ok: false, reason: 'unknownItem' });
  });

  it('a flag an unopened capsule still holds is not sold again (its promise stays true)', () => {
    const s = rich();
    const pending: SaveDoc = { ...s, capsules: { ...s.capsules, pending: [{ ...(s.capsules.pending[0] ?? {}), contents: { cosmetic: 'nationalFlag.fr' } } as SaveDoc['capsules']['pending'][number]] } };
    expect(buyNationalFlag(pending, C, 'nationalFlag.fr')).toEqual({ ok: false, reason: 'pending' });
  });
});

describe('the Atlas rewards', () => {
  it('a Region Pennant comes with the purchase that completes its region, once', () => {
    const oceania = flagsOf('oceania');
    expect(oceania).toHaveLength(14);
    let s = buyAll(rich(20_000), C, oceania.slice(0, 13));
    expect(s.cosmetics.owned).not.toContain('baseFlag.pennant_oceania');
    s = ok(buyNationalFlag(s, C, oceania[13]!));
    expect(s.cosmetics.owned).toContain('baseFlag.pennant_oceania');
    expect(s.currencies.dust).toBe(20_000 - 13 * 500);
    // granted once: a reload (JSON round trip) and another sync add nothing
    const reloaded = JSON.parse(JSON.stringify(s)) as SaveDoc;
    expect(syncEarnedCosmetics(reloaded, C).granted).toEqual([]);
    expect(unlockTitles(reloaded, C).titles).toEqual([]);
    expect(s.cosmetics.owned.filter((k) => k === 'baseFlag.pennant_oceania')).toHaveLength(1);
    expect(flagAtlasProgress(s, C).regions.find((r) => r.region === 'oceania')).toMatchObject({ owned: 14, total: 14, reward: 'baseFlag.pennant_oceania', rewardOwned: true });
  });

  it('the World Compass and the World Ambassador title come with the last flag of the six regions; the Other flags do not count', () => {
    const T = worldAt(3);
    let s = buyAll(rich(5000), T, ['nationalFlag.au', 'nationalFlag.fo', 'nationalFlag.gb_wls']);
    expect(s.cosmetics.owned).not.toContain('baseFlag.world_compass');
    s = ok(buyNationalFlag(s, T, 'nationalFlag.nz'));
    expect(s.cosmetics.owned).not.toContain('world_ambassador');
    s = ok(buyNationalFlag(s, T, 'nationalFlag.dk'));
    expect(s.cosmetics.owned).toContain('baseFlag.world_compass');
    expect(s.cosmetics.owned).toContain('world_ambassador');
    expect(flagAtlasProgress(s, T).world).toEqual({ count: 3, reward: 'baseFlag.world_compass', rewardOwned: true, title: 'world_ambassador', titleOwned: true });
    expect(unlockTitles(s, T).titles).toEqual([]);
    expect(syncEarnedCosmetics(s, T).granted).toEqual([]);
  });

  it('the real rewards ask for all 195 flags', () => {
    const w = flagAtlasProgress(fresh(), C).world;
    expect(w).toEqual({ count: 195, reward: 'baseFlag.world_compass', rewardOwned: false, title: 'world_ambassador', titleOwned: false });
    const regions = flagAtlasProgress(fresh(), C).regions;
    const ids: Record<string, string | null> = { europe: 'pennant_europe', asia: 'pennant_asia', africa: 'pennant_africa', northAmerica: 'pennant_north_america', southAmerica: 'pennant_south_america', oceania: 'pennant_oceania', other: null };
    for (const r of regions) expect(r.reward, r.region).toBe(ids[r.region] ? `baseFlag.${ids[r.region]}` : null);
  });
});

describe('the Atlas', () => {
  it('counts the flags of the six regions and every region in chip order', () => {
    const s = ok(buyNationalFlag(ok(buyNationalFlag(rich(), C, 'nationalFlag.dk')), C, 'nationalFlag.fo'));
    const a = flagAtlasProgress(s, C);
    expect(a.regions.map((r) => r.region)).toEqual(['europe', 'asia', 'africa', 'northAmerica', 'southAmerica', 'oceania', 'other']);
    expect(a.regions.map((r) => r.total)).toEqual([45, 47, 54, 23, 12, 14, 5]);
    expect(a.owned).toBe(1);
    expect(a.total).toBe(195);
    expect(a.regions.find((r) => r.region === 'europe')).toMatchObject({ owned: 1, reward: 'baseFlag.pennant_europe', rewardOwned: false });
    expect(a.regions.find((r) => r.region === 'other')).toMatchObject({ owned: 1, reward: null });
    expect(a.price).toBe(500);
    expect(flagAtlasProgress(rich(), C).price).toBe(0);
    expect(a.equipped).toBeNull();
    const flying = ok(M.equipCosmetic(s, { slot: 'nationalFlag', key: 'nationalFlag.dk' }, C));
    expect(flagAtlasProgress(flying, C).equipped).toBe('nationalFlag.dk');
  });

  it('orders the flags by region, then by English name with accents folded', () => {
    const order = atlasOrder(C, names).map((x) => x.id);
    expect(order).toHaveLength(200);
    expect(order.slice(0, 3)).toEqual(['al', 'ad', 'at']);
    expect(order.slice(-5)).toEqual(['gb_eng', 'fo', 'gl', 'gb_sct', 'gb_wls']);
    const africa = order.filter((id) => col.items.find((x) => x.collection === 'nationalFlag' && x.id === id)?.region === 'africa');
    // Côte d'Ivoire sorts as "cote", after Congo and before Djibouti
    expect(africa.indexOf('ci')).toBe(africa.indexOf('cg') + 1);
    expect(africa.indexOf('dj')).toBe(africa.indexOf('ci') + 1);
  });
});

describe('the search', () => {
  const ids = (q: string) => searchFlags(C, names, q).map((x) => x.id);

  it('folds accents, case and punctuation', () => {
    expect(foldName("Côte d'Ivoire")).toBe('cote d ivoire');
    expect(foldName('São Tomé and Príncipe')).toBe('sao tome and principe');
    expect(foldName('Føroyar')).toBe('foroyar');
    expect(foldName('  St. Lucia ')).toBe('st lucia');
  });

  it('matches a prefix of the name or from any word of it on, accent-insensitive', () => {
    expect(ids('den')).toEqual(['dk']);
    expect(ids('türk')).toEqual(['tr', 'tm']);
    expect(ids('TURK')).toEqual(['tr', 'tm']);
    expect(ids('zealand')).toEqual(['nz']);
    expect(ids('cote')).toEqual(['ci']);
    expect(ids("d'ivoire")).toEqual(['ci']);
    expect(ids('ivoire')).toEqual(['ci']);
    expect(ids('sao tome')).toEqual(['st']);
    expect(ids('são')).toEqual(['st']);
    expect(ids('guinea')).toEqual(['gn', 'gw', 'gq', 'pg']);
  });

  it('matches aliases', () => {
    expect(ids('uk')).toEqual(['gb', 'ua']);
    expect(ids('holland')).toEqual(['nl']);
    expect(ids('usa')).toEqual(['us']);
    expect(ids('america')).toContain('us');
    expect(ids('burma')).toEqual(['mm']);
    expect(ids('vatican')).toEqual(['va']);
    expect(ids('ivory coast')).toEqual(['ci']);
    expect(ids('czech republic')).toEqual(['cz']);
    expect(ids('east timor')).toEqual(['tl']);
    expect(ids('foroyar')).toEqual(['fo']);
    expect(ids('cymru')).toEqual(['gb_wls']);
    expect(ids('korea')).toEqual(['kp', 'kr']);
  });

  it('matches ISO codes first, then the names they start', () => {
    expect(ids('dk')).toEqual(['dk']);
    expect(ids('ca')[0]).toBe('ca');
    expect(ids('ca')).toEqual(expect.arrayContaining(['cv', 'kh', 'cm', 'ca', 'cf']));
    expect(ids('gb-eng')).toEqual(['gb_eng']);
    expect(ids('GB-SCT')).toEqual(['gb_sct']);
    expect(ids('gb_wls')).toEqual(['gb_wls']);
  });

  it('finds every region from any chip: the region is a browsing group only', () => {
    expect(ids('fiji')).toEqual(['fj']);
    expect(ids('peru')).toEqual(['pe']);
  });

  it('lists every flag in the Atlas order for an empty query and none for nonsense', () => {
    expect(ids('')).toEqual(atlasOrder(C, names).map((x) => x.id));
    expect(ids('   ')).toEqual(ids(''));
    expect(ids('qqqq')).toEqual([]);
    expect(ids('xx-yy')).toEqual([]);
  });
});

describe('legacy owners (PLAN 2g Track D #9)', () => {
  const v13 = JSON.parse(JSON.stringify(v13Json)) as unknown;

  it('a v13 save that owns and flies Denmark keeps it after the migration, and its next flag costs 500', () => {
    const m = migrate(v13);
    expect(m.ok).toBe(true);
    if (!m.ok) return;
    const s = m.doc as SaveDoc;
    expect(s.cosmetics.owned).toContain('nationalFlag.dk');
    expect(sideLook(s, C).nationalFlag).toBe('nationalFlag.dk');
    expect(flagAtlasProgress(s, C)).toMatchObject({ equipped: 'nationalFlag.dk', price: 500 });
    expect(flagAtlasProgress(s, C).regions.find((r) => r.region === 'europe')!.owned).toBeGreaterThanOrEqual(1);
    expect(buyNationalFlag({ ...s, currencies: { ...s.currencies, dust: 9999 } }, C, 'nationalFlag.dk')).toEqual({ ok: false, reason: 'owned' });
  });
});
