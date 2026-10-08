/**
 * National flags and the Flag Atlas's data (PLAN 2d, 2e; `raw/nationalFlags.ts`; owner decisions
 * 2026-10-08). Owned by Track D.
 */
import { describe, expect, it } from 'vitest';
import { stringTables } from '@/i18n';
import { flagRegionNameKey } from '../keys';
import { FLAG_REGIONS, flagRewardItems, flagTitles, nationalFlagItems } from '../raw/nationalFlags';
import { content } from '../index';

const en = stringTables.en ?? {};
const col = content.cosmetics.collections;
const flags = col.items.filter((x) => x.collection === 'nationalFlag');

/**
 * PLAN 2e: "195 unique UN and observer ISO codes plus extras. Region counts are 45, 47, 54, 23, 12 and
 * 14." Track D sets this to true once every row is in.
 */
const ALL_FLAGS_IN = false;
const REGION_COUNTS = { europe: 45, asia: 47, africa: 54, northAmerica: 23, southAmerica: 12, oceania: 14 } as const;

describe('national flags', () => {
  it('come from raw/nationalFlags.ts, with the country flags the owner named', () => {
    expect(flags).toEqual(nationalFlagItems);
    const countries = new Set(flags.map((x) => x.country));
    for (const c of ['dk', 'gb-eng', 'gb', 'us', 'de', 'fr', 'se', 'no']) expect(countries.has(c), c).toBe(true);
    expect(countries.size).toBe(flags.length);
    expect(new Set(flags.map((x) => x.id)).size).toBe(flags.length);
  });

  it('are bought with Dust at one price, never dropped (owner decisions 2026-10-08)', () => {
    for (const x of flags) expect(x.source, x.id).toEqual({ kind: 'dust' });
    expect(col.drops.flagDust).toBe(500);
  });

  it('each sit in a browsing region; the Other flags are the ones outside the 195', () => {
    expect(FLAG_REGIONS).toEqual(['europe', 'asia', 'africa', 'northAmerica', 'southAmerica', 'oceania', 'other']);
    for (const x of flags) expect(FLAG_REGIONS, x.id).toContain(x.region);
    expect(flags.filter((x) => x.region === 'other').map((x) => x.id).sort()).toEqual(expect.arrayContaining(['fo', 'gb_eng', 'gb_sct', 'gl']));
    for (const r of FLAG_REGIONS) expect(en[flagRegionNameKey(r)], r).toBeTruthy();
  });

  it('keeps the 50 flags players may own, with their ids', () => {
    const ids = new Set(flags.map((x) => x.id));
    const kept = 'dk fo gl se no fi is gb gb_eng gb_sct ie us ca de fr nl be lu ch at it es pt pl cz hu gr ee lv lt ua ro bg tr jp kr in th vn id au nz br ar cl co za ng gh jm'.split(' ');
    for (const id of kept) expect(ids.has(id), id).toBe(true);
  });

  it('every region has the UN members and observers of PLAN Appendix A once all are in', () => {
    if (!ALL_FLAGS_IN) return;
    for (const [region, n] of Object.entries(REGION_COUNTS)) expect(flags.filter((x) => x.region === region).length, region).toBe(n);
  });

  it('rewards are base flags earned from the Atlas, and its title counts flags (PLAN 2d)', () => {
    for (const x of flagRewardItems) {
      expect(x.collection, x.id).toBe('baseFlag');
      expect(['flagRegion', 'flagsOwned'], x.id).toContain(x.source.kind);
    }
    for (const t of flagTitles) expect(t.unlock.kind, t.id).toBe('flagsOwned');
  });
});
