/**
 * The art checks over the whole procedural library (DESIGN A11, A5.8, C2/WP4 DoD): the colour rule
 * on units, turrets, projectiles, skins and lane effects; silhouette parity of skins; body width and
 * scale; and the structure every rig relies on.
 */
import { describe, expect, it } from 'vitest';
import { bodyWidth, clipPose, colorRule, effectColorRule, heightBand, maxBodyWidth, rasterizePuppet, restHeight, silhouetteIoU, structuralProblems } from '../checks';
import { FX_RECIPES } from '../effects/recipes';
import { allPuppets, puppetById, TURRET_PUPPETS, UNIT_PUPPETS } from '../library';
import { getPart } from '../parts/registry';
import { SKIN_PUPPETS } from '../skins';

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
  it.each(units.map((p) => [p.id, p] as const))('%s: height in its A11 band, heightLu matches the drawing', (_id, p) => {
    const h = restHeight(p, getPart);
    const band = heightBand(p);
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
});

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
