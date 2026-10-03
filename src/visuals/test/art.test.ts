/**
 * The art checks over the whole procedural library (DESIGN A11, A5.8, C2/WP4 DoD): the colour rule
 * on units, turrets, projectiles, skins and lane effects; silhouette parity of skins; body width and
 * scale; and the structure every rig relies on.
 */
import { describe, expect, it } from 'vitest';
import { bodyWidth, clipPose, colorRule, colorRuleOfRaster, effectColorRule, heightBand, maxBodyWidth, pennantSlots, rasterizePuppet, restHeight, silhouetteIoU, structuralProblems } from '../checks';
import { FX_RECIPES } from '../effects/recipes';
import { allPuppets, puppetById, TURRET_PUPPETS, UNIT_PUPPETS } from '../library';
import { getPart } from '../parts/registry';
import { slotId, slotVisible } from '../pose';
import type { BasePuppet } from '../rigs/base';
import { SKIN_PUPPETS } from '../skins';
import { STYLE } from '../style';

const units = UNIT_PUPPETS;
const skins = SKIN_PUPPETS;

describe('structure', () => {
  it.each(allPuppets().map((p) => [p.id, p] as const))('%s: unique bones and slots, parts and zones resolve, team layers contiguous', (_id, p) => {
    expect(structuralProblems(p, getPart)).toEqual([]);
  });
});

describe('colour rule (A11, MUST): at most 10% of the silhouette in a saturated team-band hue', () => {
  const lane = [...units, ...TURRET_PUPPETS, ...skins.filter((s) => s.kind !== 'base')];
  it.each(lane.map((p) => [p.id, p] as const))('%s', (_id, p) => {
    const r = colorRule(p, getPart, 1.5);
    expect(r.share, `offenders ${JSON.stringify(r.offenders)}`).toBeLessThanOrEqual(0.1);
  });
  const projectiles = allPuppets().filter((p) => p.kind === 'projectile');
  it.each(projectiles.map((p) => [p.id, p] as const))('%s', (_id, p) => {
    expect(colorRule(p, getPart, 4).share).toBeLessThanOrEqual(0.1);
  });
  it.each(FX_RECIPES.map((r) => [r.id, r] as const))('%s', (_id, r) => {
    expect(effectColorRule(r, getPart).share).toBeLessThanOrEqual(0.1);
  });
});

describe('silhouette parity of skins (A5.8): IoU >= 0.85 against the base', () => {
  it.each(skins.map((s) => [s.id, s] as const))('%s', (_id, s) => {
    const base = puppetById(s.skinOf ?? '');
    expect(base).toBeDefined();
    if (!base) return;
    expect(silhouetteIoU(s, base, getPart, { pxPerLu: 1.5 })).toBeGreaterThanOrEqual(0.85);
    if (base.kind === 'unit') {
      const pose = clipPose(base, base.motion.attack, 0.55);
      expect(silhouetteIoU(s, base, getPart, { pxPerLu: 1.5, deltas: pose })).toBeGreaterThanOrEqual(0.85);
    }
  });
});

describe('scale and width (A11)', () => {
  it.each([...units, ...skins.filter((s) => s.kind === 'unit')].map((p) => [p.id, p] as const))('%s: body width within 1.4x the collision width', (_id, p) => {
    expect(bodyWidth(p, getPart)).toBeLessThanOrEqual(maxBodyWidth(p) + 0.01);
  });
  // X0 squads and summons draw small by design (CONTENT_PLAN 5.1: a wolf of a pair at 50 lu, a summoned pup at 0.8x;
  // 5.3: the summoned War Hound, and the Lindworm, a long, low wingless dragon whose bulk is its length).
  const SMALL_BY_DESIGN = new Set(['unit.hunting_wolves', 'unit.cave_pup', 'unit.war_hound', 'unit.lindworm', 'unit.clockwork_soldier']);
  it.each(units.map((p) => [p.id, p] as const))('%s: height in its A11 band, heightLu matches the drawing', (_id, p) => {
    const h = restHeight(p, getPart);
    const band = SMALL_BY_DESIGN.has(p.id) ? null : heightBand(p);
    if (band) {
      expect(h).toBeGreaterThanOrEqual(band[0]);
      expect(h).toBeLessThanOrEqual(band[1]);
    }
    expect(Math.abs(h - p.heightLu)).toBeLessThanOrEqual(1);
    expect(p.anchors.head.y).toBeCloseTo(-h, 0);
  });
  it('infantry average about 68 lu, heavies about 100-120, Legendaries 170-220', () => {
    const avg = (g: string): number => {
      const hs = units.filter((u) => u.group === g && !u.motion.air).map((u) => restHeight(u, getPart));
      return hs.reduce((a, b) => a + b, 0) / hs.length;
    };
    expect(avg('infantry')).toBeGreaterThan(62);
    expect(avg('infantry')).toBeLessThan(80);
    expect(avg('heavy')).toBeGreaterThanOrEqual(95);
    expect(avg('heavy')).toBeLessThanOrEqual(125);
    expect(avg('legendary')).toBeGreaterThanOrEqual(165);
    expect(avg('legendary')).toBeLessThanOrEqual(220);
  });
});

describe('team readability (A11)', () => {
  it.each(units.map((p) => [p.id, p] as const))('%s carries a team-colour area of at least 7% of its silhouette', (_id, p) => {
    expect(teamShare(p, 0x2f7df6)).toBeGreaterThanOrEqual(0.07);
  });

  // A11 redundant cues: "pennant on heavies". Heavies and ground Legendaries (the Siege heavies)
  // carry a team pennant, flag or pennoned lance; skins inherit it (clarity parity, A5.8).
  const heavies = [...units, ...skins.filter((s) => s.kind === 'unit')].filter((p) => (p.group === 'heavy' || p.group === 'legendary') && !p.motion.air);
  it('the heavy set is complete (8 Heavies, 6 ground Legendaries, their skins)', () => {
    expect(heavies.filter((p) => !p.skinOf).map((p) => p.id).sort()).toEqual(
      [
        'unit.behemoth_tank',
        'unit.chrono_titan',
        'unit.cuirassier',
        'unit.destrier_knight',
        'unit.mammoth_matriarch',
        'unit.tankette',
        'unit.tuskback',
        'unit.ursa_paladin',
        'unit.walker_mech',
        // A17
        'unit.war_chariot',
        'unit.bronze_colossus',
        'unit.steam_golem',
        'unit.land_dreadnought',
        'unit.hover_tank',
        // X0 Stone wave
        'unit.woolly_rhino',
        'unit.elk_chieftain',
        // Medieval wave
        'unit.greatsword_knight',
        'unit.lindworm',
        // Gunpowder wave
        'unit.dragoon',
        'unit.grand_marshal',
        // Industrial wave
        'unit.steam_tractor',
        'unit.armoured_train',
      ].sort(),
    );
  });
  it.each(heavies.map((p) => [p.id, p] as const))('%s carries a pennant', (_id, p) => {
    expect(pennantSlots(p, getPart).length).toBeGreaterThan(0);
  });

  // A11: "Level trims ... follow the same rule". A trim sits on the ground ring beside the role glyph
  // (drawn at STYLE.levelTrimScale by the unit view), so its saturated gold or bronze plus the unit's own accents
  // must stay within 10% of the unit's silhouette, even on the smallest unit.
  it.each((['bronze', 'silver', 'gold'] as const).map((t) => [t] as const))('trim.%s keeps every unit within the colour rule', (t) => {
    const trim = puppetById(`trim.${t}`);
    expect(trim).toBeDefined();
    if (!trim) return;
    const px = 1.5;
    // drawn scaled by k: the same pixel count as rasterising it at k × the unit's px per lu
    const trimRaster = rasterizePuppet(trim, getPart, { pxPerLu: px * STYLE.levelTrimScale, teamColor: null });
    const trimBad = colorRuleOfRaster(trimRaster).share * countArea(trimRaster);
    for (const u of units) {
      const r = rasterizePuppet(u, getPart, { pxPerLu: px, teamColor: null });
      const area = countArea(r);
      const own = colorRuleOfRaster(r).share * area;
      expect((own + trimBad) / area, u.id).toBeLessThanOrEqual(0.1);
    }
  });
});

describe('bases (A11 Bases, A2.2)', () => {
  const bases = allPuppets().filter((p): p is BasePuppet => p.kind === 'base');
  const visibleSlots = (b: BasePuppet, st: { crumble: number; treasury: number }): string => b.slots.filter((s) => slotVisible(s.when, st)).map((s) => slotId(s)).sort().join(',');

  it('eight bases plus the Crystal Spire skin', () => {
    expect(bases.map((b) => b.id).sort()).toEqual(
      ['base.bronze', 'base.cosmic', 'base.future', 'base.future@crystal_spire', 'base.gunpowder', 'base.industrial', 'base.medieval', 'base.modern', 'base.stone'].sort(),
    );
  });
  it.each(bases.map((b) => [b.id, b] as const))('%s shows each crumble stage (75/50/25%%) and each Treasury level (1-3) differently', (_id, b) => {
    const crumble = [0, 1, 2, 3].map((c) => visibleSlots(b, { crumble: c, treasury: 0 }));
    expect(new Set(crumble).size).toBe(4);
    const treasury = [0, 1, 2, 3].map((t) => visibleSlots(b, { crumble: 0, treasury: t }));
    expect(new Set(treasury).size).toBe(4);
    // four mounts stacked bottom to top (A2.8)
    for (let i = 1; i < 4; i++) expect(b.mounts[i]?.y ?? 0).toBeLessThan(b.mounts[i - 1]?.y ?? 0);
  });
  it('a base skin keeps the mounts and horn of its base (clarity parity, A5.8)', () => {
    const skin = bases.find((b) => b.id === 'base.future@crystal_spire');
    const base = bases.find((b) => b.id === 'base.future');
    expect(skin?.mounts).toEqual(base?.mounts);
    expect(skin?.hornAt).toEqual(base?.hornAt);
  });
});

/** Painted pixels of a raster. */
function countArea(r: { color: ArrayLike<number> }): number {
  let n = 0;
  for (let i = 0; i < r.color.length; i++) if ((r.color[i] ?? -1) >= 0) n++;
  return n;
}

/** Share of the silhouette painted by team layers. */
function teamShare(p: (typeof units)[number], team: number): number {
  const ras = rasterizePuppet(p, getPart, { pxPerLu: 1.5, teamColor: team });
  let area = 0;
  let teamPx = 0;
  for (let i = 0; i < ras.color.length; i++) {
    if ((ras.color[i] ?? -1) < 0) continue;
    area++;
    if (ras.team[i] === 1) teamPx++;
  }
  return area === 0 ? 0 : teamPx / area;
}
