/**
 * National flags and the Flag Atlas's data (PLAN 2d, 2e, 2g Track D #2; `raw/nationalFlags.ts`; owner
 * decisions 2026-10-08). Owned by Track D.
 */
import { describe, expect, it } from 'vitest';
import { stringTables } from '@/i18n';
import { flagAliasesKey, flagRegionNameKey } from '../keys';
import { ATLAS_FLAG_COUNT, FLAG_REGIONS, flagRewardItems, flagTitles, nationalFlagItems } from '../raw/nationalFlags';
import { content } from '../index';

const en = stringTables.en ?? {};
const col = content.cosmetics.collections;
const flags = col.items.filter((x) => x.collection === 'nationalFlag');

/** PLAN 2e: "195 unique UN and observer ISO codes plus extras. Region counts are 45, 47, 54, 23, 12 and 14." */
const ALL_FLAGS_IN = true;
const REGION_COUNTS = { europe: 45, asia: 47, africa: 54, northAmerica: 23, southAmerica: 12, oceania: 14 } as const;

/** PLAN Appendix A, ISO 3166-1 alpha-2 by region (the table the data must match). */
const APPENDIX_A: Record<keyof typeof REGION_COUNTS, string> = {
  europe: 'AL AD AT BY BE BA BG HR CY CZ DK EE FI FR DE GR HU IS IE IT LV LI LT LU MT MD MC ME NL MK NO PL PT RO RU SM RS SK SI ES SE CH UA GB VA',
  asia: 'AF AM AZ BH BD BT BN KH CN GE IN ID IR IQ IL JP JO KZ KW KG LA LB MY MV MN MM NP KP OM PK PH QA SA SG KR LK SY TJ TH TL TR TM AE UZ VN YE PS',
  africa: 'DZ AO BJ BW BF BI CV CM CF TD KM CG CD CI DJ EG GQ ER SZ ET GA GM GH GN GW KE LS LR LY MG MW ML MR MU MA MZ NA NE NG RW ST SN SC SL SO ZA SS SD TZ TG TN UG ZM ZW',
  northAmerica: 'AG BS BB BZ CA CR CU DM DO SV GD GT HT HN JM MX NI PA KN LC VC TT US',
  southAmerica: 'AR BO BR CL CO EC GY PY PE SR UY VE',
  oceania: 'AU FJ KI MH FM NR NZ PW PG WS SB TO TV VU',
};

/** A few English names the table must carry exactly (the UN short names players know). */
const NAMES: Record<string, string> = {
  ci: "Côte d'Ivoire",
  cd: 'DR Congo',
  cg: 'Congo',
  va: 'Holy See',
  ps: 'Palestine',
  tr: 'Türkiye',
  mk: 'North Macedonia',
  sz: 'Eswatini',
  cv: 'Cabo Verde',
  tl: 'Timor-Leste',
  cz: 'Czechia',
  mm: 'Myanmar',
  st: 'São Tomé and Príncipe',
  gb: 'United Kingdom',
  us: 'United States',
  gb_wls: 'Wales',
};

describe('national flags', () => {
  it('come from raw/nationalFlags.ts, one per country, with the countries the owner named', () => {
    expect(flags).toEqual(nationalFlagItems);
    const countries = new Set(flags.map((x) => x.country));
    for (const c of ['dk', 'gb-eng', 'gb', 'us', 'de', 'fr', 'se', 'no']) expect(countries.has(c), c).toBe(true);
    expect(countries.size).toBe(flags.length);
    expect(new Set(flags.map((x) => x.id)).size).toBe(flags.length);
    for (const x of flags) expect(x.country, x.id).toBe(x.id.replace('_', '-'));
  });

  it('are bought with Dust at one price, never dropped (owner decisions 2026-10-08)', () => {
    for (const x of flags) expect(x.source, x.id).toEqual({ kind: 'dust' });
    expect(col.drops.flagDust).toBe(500);
    expect(col.drops.firstFlagFree).toBe(true);
  });

  it('each sit in a browsing region; the Other flags are the five outside the 195, Wales included', () => {
    expect(FLAG_REGIONS).toEqual(['europe', 'asia', 'africa', 'northAmerica', 'southAmerica', 'oceania', 'other']);
    for (const x of flags) expect(FLAG_REGIONS, x.id).toContain(x.region);
    expect(flags.filter((x) => x.region === 'other').map((x) => x.id).sort()).toEqual(['fo', 'gb_eng', 'gb_sct', 'gb_wls', 'gl']);
    for (const r of FLAG_REGIONS) expect(en[flagRegionNameKey(r)], r).toBeTruthy();
  });

  it('keeps the 50 flags players may own, with their ids and old rarities', () => {
    const byId = new Map(flags.map((x) => [x.id, x]));
    const kept = 'dk fo gl se no fi is gb gb_eng gb_sct ie us ca de fr nl be lu ch at it es pt pl cz hu gr ee lv lt ua ro bg tr jp kr in th vn id au nz br ar cl co za ng gh jm'.split(' ');
    for (const id of kept) expect(byId.has(id), id).toBe(true);
    const rare = 'gl gb gb_sct us ca kr in au nz br za jm'.split(' ');
    for (const id of kept) expect(byId.get(id)?.rarity, id).toBe(rare.includes(id) ? 'rare' : 'common');
    // every flag added on 2026-10-08 is plain data `common`; the UI never shows a flag's rarity
    for (const x of flags) if (!kept.includes(x.id)) expect(x.rarity, x.id).toBe('common');
  });

  it('every region has the UN members and observers of PLAN Appendix A', () => {
    if (!ALL_FLAGS_IN) return;
    for (const [region, n] of Object.entries(REGION_COUNTS)) expect(flags.filter((x) => x.region === region).length, region).toBe(n);
    for (const [region, codes] of Object.entries(APPENDIX_A)) {
      const want = codes.toLowerCase().split(' ').sort();
      expect(flags.filter((x) => x.region === region).map((x) => x.country).sort(), region).toEqual(want);
    }
    expect(flags.filter((x) => x.region !== 'other')).toHaveLength(ATLAS_FLAG_COUNT);
    expect(flags).toHaveLength(200);
  });

  it('all are released (their vendored art is in) and all have an English name; aliases are optional', () => {
    for (const x of flags) {
      expect(x.released, x.id).not.toBe(false);
      expect(en[x.nameKey], x.id).toBeTruthy();
      const aliases = en[flagAliasesKey(x.id)];
      if (aliases !== undefined) expect(aliases.split(',').every((a) => a.trim().length > 0), x.id).toBe(true);
    }
    for (const [id, name] of Object.entries(NAMES)) expect(en[`cosmetic.nationalFlag.${id}.name`], id).toBe(name);
  });

  it('rewards: a Region Pennant per region of the 195 and the World Compass for all; the title counts the same 195 (PLAN 2d)', () => {
    expect(flagRewardItems.map((x) => x.id)).toEqual(['pennant_europe', 'pennant_asia', 'pennant_africa', 'pennant_north_america', 'pennant_south_america', 'pennant_oceania', 'world_compass']);
    for (const x of flagRewardItems) {
      expect(x.collection, x.id).toBe('baseFlag');
      expect(['flagRegion', 'flagsOwned'], x.id).toContain(x.source.kind);
      expect(en[x.nameKey], x.id).toBeTruthy();
      expect(col.items, x.id).toContainEqual(x);
    }
    expect(flagRewardItems.filter((x) => x.source.kind === 'flagRegion').map((x) => x.rarity)).toEqual(Array(6).fill('epic'));
    expect(flagRewardItems.at(-1)).toMatchObject({ rarity: 'legendary', source: { kind: 'flagsOwned', count: 195 } });
    expect(flagTitles).toEqual([{ id: 'world_ambassador', unlock: { kind: 'flagsOwned', count: 195 }, nameKey: 'title.world_ambassador.name' }]);
    expect(content.cosmetics.titles).toContainEqual(flagTitles[0]);
    expect(en['title.world_ambassador.name']).toBe('World Ambassador');
    expect(en['title.world_ambassador.unlock']).toBeTruthy();
  });

  it('no national flag or Atlas reward sits in a drop pool (PLAN 2g Track D #10)', () => {
    for (const x of col.items) {
      if (x.collection === 'nationalFlag' || x.source.kind === 'flagRegion' || x.source.kind === 'flagsOwned') {
        expect(['capsule', 'crate', 'capsuleTier'], x.id).not.toContain(x.source.kind);
      }
    }
  });
});
