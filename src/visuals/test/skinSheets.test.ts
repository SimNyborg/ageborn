/**
 * Queue item 46 at runtime: a troop skin rendered as a sheet (contract C3) draws from that sheet wherever its unit's
 * sheet would be drawn. The skin table is a test-only one here (two skins of the Stone wave as if their sheets were
 * installed, plus one whose unit has no sheet), so this runs before any real skin sheet ships:
 * - the manifest gets an atlas entry per skin sheet (same clips and anchors as its unit, the skin's own projectile),
 *   and a skin without a sheet keeps its puppet;
 * - a match holds only the sheets it shows: a skinned copy loads the skin sheet instead of the unit's, both only when
 *   a skinned and a plain copy are held; extras sheets follow; the governor counts skin sheets;
 * - the card still is the skin's own when both its images are installed; the HUD's training card asks for the skin's
 *   still only (`skinStill`), else the card's own portrait;
 * - `?art=procedural` draws puppets for sheet units and sheet skins without throwing.
 */
import { Texture } from 'pixi.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VisualDef } from '@/contracts/art';
import { AtlasAdapter, type AtlasData } from '../adapters/atlas';
import { portraitStillBase } from '../adapters/atlasPortrait';
import { MANIFEST, PROCEDURAL_MANIFEST } from '../manifest';
import { buildUnitOverrides, type SkinSheetSummary } from '../manifest.units';
import { createArtProvider } from '../provider';
import { planSheetDensities, SHEET_RANK, unitSheetBytes } from '../sheetBudget';
import { skinStillBase, skinUnitSource } from '../skinSheets';
import { SKIN_SHEETS } from '../skinSheets.gen';
import { memoryKind } from '../textureMemory';
import { unitAimFor, unitAimKey, UNIT_AIM } from '../unitAim';
import { UNIT_SHEETS } from '../unitSheets.gen';

vi.mock('../skinSheets.gen', async () => {
  const { UNIT_SHEETS: units } = await import('../unitSheets.gen');
  const of = (slug: string) => units.find((s) => s.slug === slug)!;
  const skin = (slug: string, id: string, still: boolean) => ({ ...of(slug), slug: `${slug}@${id}`, visualId: `unit.${slug}@${id}`, skinOf: `unit.${slug}`, skin: id, still });
  return {
    SKIN_SHEETS: [
      skin('bonker', 'pumpkin_head', true),
      skin('pebbler', 'snowball_pebbler', false),
      // a skin sheet whose unit has no sheet in the table: left out (the skin keeps its puppet)
      { ...skin('bonker', 'ghost', false), visualId: 'unit.nobody@ghost', skinOf: 'unit.nobody', slug: 'nobody@ghost' },
    ],
  };
});

const BONKER = 'art/units/stone/bonker.json';
const PUMPKIN = 'art/units/stone/bonker@pumpkin_head.json';
const SNOWBALL = 'art/units/stone/pebbler@snowball_pebbler.json';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function settle(): Promise<void> {
  for (let i = 0; i < 8; i++) await Promise.resolve();
}

describe('skin sheets in the manifest', () => {
  it('a skin with a sheet gets an atlas entry like its unit, drawn from its own sheet', () => {
    const unit = MANIFEST['unit.bonker'];
    const skin = MANIFEST['unit.bonker@pumpkin_head'];
    expect(skin?.kind).toBe('atlas');
    expect(skin?.source).toBe(PUMPKIN);
    expect(skin?.clips).toEqual(unit?.clips);
    expect(skin?.anchors).toEqual(unit?.anchors);
    expect(skin?.events).toEqual(unit?.events);
    expect(skin?.heightLu).toBe(unit?.heightLu);
  });

  it("keeps what the skin's puppet adds (its projectile), and the puppet stays the fallback entry", () => {
    expect(MANIFEST['unit.pebbler@snowball_pebbler']?.projectileVisualId).toBe('proj.snowball');
    expect(MANIFEST['unit.pebbler']?.projectileVisualId).not.toBe('proj.snowball');
    expect(PROCEDURAL_MANIFEST['unit.bonker@pumpkin_head']?.kind).toBe('procedural');
  });

  it("a skin without a sheet keeps its puppet, and a skin sheet whose unit has none is left out", () => {
    expect(MANIFEST['unit.footman@tin_can']?.kind).toBe('procedural');
    expect(MANIFEST['unit.nobody@ghost']).toBeUndefined();
    expect(Object.keys(buildUnitOverrides(UNIT_SHEETS, [])).some((k) => k.includes('@'))).toBe(false);
    const wrongId = { ...(SKIN_SHEETS[0] as SkinSheetSummary), visualId: 'unit.bonker@pumpkin' };
    expect(buildUnitOverrides(UNIT_SHEETS, [wrongId])['unit.bonker@pumpkin']).toBeUndefined();
  });

  it('the provider resolves a skinned unit to its skin sheet, a plain one to the unit sheet', () => {
    const art = createArtProvider({ warn: () => {} });
    expect(art.resolve('unit.bonker', 'pumpkin_head')).toMatchObject({ key: 'unit.bonker@pumpkin_head', def: { kind: 'atlas', source: PUMPKIN } });
    expect(art.resolve('unit.bonker')).toMatchObject({ key: 'unit.bonker', def: { source: BONKER } });
    expect(art.resolve('unit.footman', 'tin_can')?.def.kind).toBe('procedural');
  });
});

describe('a match holds the sheets it shows (skins in place of their units)', () => {
  function recorded() {
    vi.useFakeTimers();
    const art = createArtProvider({ warn: () => {}, unitSheets: 'match' });
    const leased: string[] = [];
    const released: string[] = [];
    vi.spyOn(art.atlas, 'lease').mockImplementation((src) => {
      leased.push(src);
      return { ready: Promise.resolve(), core: Promise.resolve(), hd: false, release: () => released.push(src) };
    });
    return { art, leased, released };
  }

  it('a skinned copy loads the skin sheet instead of the unit sheet', async () => {
    const { art, leased } = recorded();
    await art.holdArt().set([{ visualId: 'unit.bonker', skin: 'pumpkin_head' }, { visualId: 'unit.pebbler' }]);
    expect(leased.sort()).toEqual([PUMPKIN, 'art/units/stone/pebbler.json'].sort());
  });

  it('both load only while a skinned and a plain copy of the same card are held; the other goes when one leaves', async () => {
    const { art, leased, released } = recorded();
    const hold = art.holdArt();
    await hold.set([{ visualId: 'unit.bonker', skin: 'pumpkin_head' }, { visualId: 'unit.bonker' }]);
    expect(leased.sort()).toEqual([BONKER, PUMPKIN].sort());
    await hold.set([{ visualId: 'unit.bonker', skin: 'pumpkin_head' }]);
    expect(released).toEqual([BONKER]);
    hold.release();
    expect(released.sort()).toEqual([BONKER, PUMPKIN].sort());
  });

  it("a skin without a sheet holds nothing of its own (its puppet bakes) and never loads the unit's sheet", async () => {
    const { art, leased } = recorded();
    const bake = vi.spyOn(art.procedural, 'prebake').mockResolvedValue();
    await art.holdArt().set([{ visualId: 'unit.footman', skin: 'tin_can' }]);
    expect(leased).toEqual([]);
    expect(bake).toHaveBeenCalledWith(['unit.footman@tin_can']);
  });

  it('the governor counts skin sheets: their own size, or their unit\'s until the table lists them', () => {
    const unit = unitSheetBytes(BONKER);
    expect(unit).not.toBeNull();
    expect(unitSheetBytes(PUMPKIN)).toEqual(unit);
    expect(unitSheetBytes('art/units/stone/nobody@ghost.json')).toBeNull();
    const b = unit!;
    // a skinned and a plain copy are two sheets: both fit in HD only with room for both
    const wants = [
      { source: PUMPKIN, rank: SHEET_RANK.field, hdBytes: b.hd, sdBytes: b.sd },
      { source: BONKER, rank: SHEET_RANK.field, hdBytes: b.hd, sdBytes: b.sd },
    ];
    expect([...planSheetDensities(wants, 2 * b.hd).values()]).toEqual(['hd', 'hd']);
    expect([...planSheetDensities(wants, b.hd + b.sd).values()].sort()).toEqual(['hd', 'sd']);
  });

  it("the memory hook files skin sheets with the unit sheets", () => {
    expect(memoryKind('/ageborn/art/units/stone/bonker@pumpkin_head.hd.png')).toBe('unitHd');
    expect(memoryKind('/ageborn/art/units/stone/bonker@pumpkin_head.x.png')).toBe('unitSd');
  });
});

describe('the atlas tier draws a skin from its sheet', () => {
  const tex = (n: number): Texture[] => Array.from({ length: n }, () => new Texture());
  const data = (): AtlasData => ({
    luPerUnit: 1,
    animations: { idle: tex(2), walk: tex(2), attack: tex(3), hit: tex(2), die: tex(2) },
    clips: { idle: { durationsMs: [100, 100], loop: true }, walk: { durationsMs: [100, 100], loop: true }, attack: { durationsMs: [100, 100, 100], impactAt: 0.4 }, hit: { durationsMs: [100, 100] }, die: { durationsMs: [100, 100] } },
  });

  it("loads the skin's core sheet and then its extras sheet, as the unit's", async () => {
    const skin = MANIFEST['unit.bonker@pumpkin_head'] as VisualDef;
    const loads: string[] = [];
    const art = createArtProvider({ warn: () => {} });
    const a = new AtlasAdapter({
      entries: () => [skin],
      decor: art.procedural.baker,
      baseUrl: '/ageborn/',
      load: async (url) => (loads.push(url), data()),
    });
    await a.extrasReady(PUMPKIN);
    expect(loads).toEqual(['/ageborn/art/units/stone/bonker@pumpkin_head.json', '/ageborn/art/units/stone/bonker@pumpkin_head.x.json']);
    const v = a.createUnit({ key: 'unit.bonker@pumpkin_head', def: skin, side: 0, teamPreset: 'default', seed: 1 });
    expect(v.root.label).toBe(PUMPKIN);
    v.destroy();
  });

  it("a skin aims as its unit (item 44's table is keyed by the unit's sheet)", () => {
    expect(unitAimKey('art/units/bronze/javelineer@bronze_glint.x.hd.json')).toBe('bronze/javelineer');
    expect(unitAimFor('art/units/bronze/javelineer@bronze_glint.json')).toBe(UNIT_AIM['bronze/javelineer']);
    expect(skinUnitSource('art/units/bronze/javelineer@bronze_glint.hd.json')).toBe('art/units/bronze/javelineer.json');
    expect(skinUnitSource(BONKER)).toBeNull();
  });
});

describe('card stills of skins', () => {
  it("a skin sheet's still is its own when both images are installed, else none (its puppet portrait)", () => {
    expect(portraitStillBase(PUMPKIN)).toBe('art/portraits/bonker@pumpkin_head');
    expect(skinStillBase(PUMPKIN)).toBe('art/portraits/bonker@pumpkin_head');
    expect(portraitStillBase(SNOWBALL)).toBeNull();
    expect(portraitStillBase(BONKER)).toBe('art/portraits/bonker');
  });

  it("the HUD's training card (`skinStill`) shows the skin's still where it has one, else the card's own portrait", async () => {
    const art = createArtProvider({ warn: () => {} });
    expect(art.hasSkinStill('unit.bonker', 'pumpkin_head')).toBe(true);
    expect(art.hasSkinStill('unit.pebbler', 'snowball_pebbler')).toBe(false);
    expect(art.hasSkinStill('unit.footman', 'tin_can')).toBe(false);
    const keys: string[] = [];
    vi.spyOn(art.atlas, 'portrait').mockImplementation(async (r) => (keys.push(r.key), 'atlas'));
    vi.spyOn(art.procedural, 'portrait').mockImplementation(async (r) => (keys.push(r.key), 'puppet'));
    await art.portrait({ card: 'bonker', skin: 'pumpkin_head', size: 88, skinStill: true });
    await art.portrait({ card: 'pebbler', skin: 'snowball_pebbler', size: 88, skinStill: true });
    await art.portrait({ card: 'footman', skin: 'tin_can', size: 88, skinStill: true });
    // menus (skin options, card tiles) still ask for the skin itself
    await art.portrait({ card: 'footman', skin: 'tin_can', size: 88 });
    expect(keys).toEqual(['unit.bonker@pumpkin_head', 'unit.pebbler', 'unit.footman', 'unit.footman@tin_can']);
    // a forced tier draws no stills
    expect(createArtProvider({ warn: () => {}, force: 'procedural' }).hasSkinStill('unit.bonker', 'pumpkin_head')).toBe(false);
  });
});

describe('?art=procedural draws puppets for sheet units and sheet skins', () => {
  it('a sheet unit, a sheet skin and a puppet skin all draw as puppets without throwing', async () => {
    const art = createArtProvider({ warn: () => {}, force: 'procedural' });
    for (const [visualId, skin] of [['unit.bonker', undefined], ['unit.bonker', 'pumpkin_head'], ['unit.footman', 'tin_can'], ['unit.javelineer', undefined]] as const) {
      const v = art.createUnit({ visualId, ...(skin ? { skin } : {}), side: 0, teamPreset: 'default' });
      expect(v.root.label ?? '', `${visualId}@${skin ?? ''}`).not.toMatch(/art\/units\//);
      v.update(16);
      v.destroy();
    }
    const keys: string[] = [];
    vi.spyOn(art.procedural, 'portrait').mockImplementation(async (r) => (keys.push(`${r.key} ${r.def.kind}`), ''));
    await art.portrait({ card: 'bonker', skin: 'pumpkin_head', size: 64 });
    await art.portrait({ card: 'javelineer', size: 64 });
    await settle();
    expect(keys).toEqual(['unit.bonker@pumpkin_head procedural', 'unit.javelineer procedural']);
  });
});
