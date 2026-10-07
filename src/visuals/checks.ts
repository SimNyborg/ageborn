/**
 * Art checks shared by the unit tests and the gallery (DESIGN B5: the gallery "hosts the silhouette
 * IoU test and the colour-rule test, both rasterising the same SVG data"). Pure TypeScript: the
 * rasteriser paints the same SVG path data the atlas bake draws, so a check here judges exactly what
 * the game shows.
 *
 *  - colour rule (A11, MUST): non-team parts of units, turrets, projectiles and lane effects may not
 *    use a hue within ±35° of a team hue (any preset) at HSV saturation above 40% for more than 10%
 *    of the silhouette. Team layers are painted neutral grey here, so only non-team paint counts.
 *  - silhouette parity (A5.8): a skin's silhouette mask vs its base visual, IoU >= 0.85.
 *  - body width (A11): visual width within 1.4x the collision width (held gear and rotors excluded).
 *  - scale (A11): infantry ~68 lu, heavies 100-120 lu, Legendaries 170-220 lu.
 *  - structure: unique bone and slot ids, parents first, every part and zone resolvable, team layers
 *    contiguous inside each part (the bake splits parts into under/team/over).
 */
import { CLIP_LIBRARY, getClip } from './clips';
import type { FxRecipe } from './effects/recipes';
import { FX_ZONES } from './effects/sprites';
import { procDeltas, type ProcContext } from './clips/procedural';
import { drawPuppet, puppetBounds, teamLayersContiguous, type PartLookup } from './draw';
import { COLOR_RULE_MAX_SHARE, hexToRgb, isTeamZone, resolveZone, rgbToHex, violatesColorRule } from './palette';
import { boneWorld, slotId, validateBones, type DeltaLookup, type PuppetState } from './pose';
import { iou, maskArea, Raster } from './raster';
import { sampleTrack } from './animator';
import { STYLE } from './style';
import { unionBounds, type Bounds } from './svg';
import { RasterTarget } from './targets';
import type { BoneDelta, PuppetDef } from './types';

export interface RasterOptions {
  pxPerLu?: number;
  deltas?: DeltaLookup;
  state?: PuppetState;
  /** Paint team layers in this colour (null = the neutral grey used by the bake). */
  teamColor?: number | null;
  /** Frame to rasterise into (defaults to the puppet's own bounds plus a margin). */
  bounds?: Bounds;
}

const MARGIN = 4;

function padded(b: Bounds): Bounds {
  return { minX: Math.floor(b.minX - MARGIN), minY: Math.floor(b.minY - MARGIN), maxX: Math.ceil(b.maxX + MARGIN), maxY: Math.ceil(b.maxY + MARGIN) };
}

export function rasterizePuppet(p: PuppetDef, parts: PartLookup, o: RasterOptions = {}): Raster {
  const bounds = o.bounds ?? padded(puppetBounds(p, parts, o.deltas, undefined, o.state));
  const r = new Raster(bounds, o.pxPerLu ?? 2);
  drawPuppet(p, new RasterTarget(r), [1, 0, 0, 1, 0, 0], { parts, teamColor: o.teamColor ?? null, deltas: o.deltas, state: o.state });
  return r;
}

// ---------------------------------------------------------------------------------------------
// Colour rule

export interface ColorRuleReport {
  /** Share of the silhouette painted in a saturated team-band hue by non-team layers. */
  share: number;
  pass: boolean;
  /** The worst offending colours (0xRRGGBB → share), largest first. */
  offenders: { color: number; share: number }[];
}

export function colorRuleOfRaster(r: Raster): ColorRuleReport {
  let area = 0;
  let bad = 0;
  const byColor = new Map<number, number>();
  for (let i = 0; i < r.color.length; i++) {
    const c = r.color[i] ?? -1;
    if (c < 0) continue;
    area++;
    if (r.team[i] === 1) continue;
    if (violatesColorRule(c)) {
      bad++;
      byColor.set(c, (byColor.get(c) ?? 0) + 1);
    }
  }
  const share = area === 0 ? 0 : bad / area;
  const offenders = [...byColor.entries()]
    .map(([color, n]) => ({ color, share: n / Math.max(1, area) }))
    .sort((a, b) => b.share - a.share)
    .slice(0, 5);
  return { share, pass: share <= COLOR_RULE_MAX_SHARE, offenders };
}

export function colorRule(p: PuppetDef, parts: PartLookup, pxPerLu = 2): ColorRuleReport {
  return colorRuleOfRaster(rasterizePuppet(p, parts, { pxPerLu, teamColor: null }));
}

/** A tint multiplies every channel, like a Pixi sprite tint. */
function multiply(c: number, tint: number): number {
  const [r, g, b] = hexToRgb(c);
  const [tr, tg, tb] = hexToRgb(tint);
  return rgbToHex((r * tr) / 255, (g * tg) / 255, (b * tb) / 255);
}

/**
 * Colour rule for a lane effect: every sprite, particle, falling object and chain of the recipe is
 * rasterised with its tint, weighted by how many copies the recipe spawns; team-tinted pieces are
 * the team layer and do not count. Screen and UI cues (`exemptColorRule`) pass by definition.
 */
export function effectColorRule(r: FxRecipe, parts: PartLookup): ColorRuleReport {
  if (r.exemptColorRule) return { share: 0, pass: true, offenders: [] };
  const items: { sprite: string; tint?: number | 'team'; weight: number }[] = [];
  for (const s of r.sprites ?? []) items.push({ sprite: s.sprite, tint: s.tint, weight: 1 });
  for (const p of r.particles ?? []) items.push({ sprite: p.sprite, tint: p.tint, weight: Math.max(1, p.count ?? 0, Math.round(((p.rate ?? 0) * r.durationMs) / 1000)) });
  if (r.fall) items.push({ sprite: r.fall.sprite, weight: r.fall.count });
  if (r.chain) items.push({ sprite: 'fx.p.beam', tint: r.chain.tint, weight: r.chain.segments });
  let area = 0;
  let bad = 0;
  const byColor = new Map<number, number>();
  for (const it of items) {
    if (it.tint === 'team') continue;
    const part = parts(it.sprite);
    if (!part) continue;
    const pup: PuppetDef = {
      id: it.sprite,
      kind: 'sprite',
      rig: 'sprite',
      age: null,
      bones: [{ id: 'root', parent: null, x: 0, y: 0 }],
      slots: [{ part: it.sprite, bone: 'root', z: 0 }],
      palette: FX_ZONES,
      heightLu: 10,
      anchors: { feet: { x: 0, y: 0 }, head: { x: 0, y: 0 }, muzzle: { x: 0, y: 0 }, hitCenter: { x: 0, y: 0 } },
      motion: { family: 'sprite', attack: '', ability: '' },
      impactAt: 0,
    };
    const ras = rasterizePuppet(pup, parts, { pxPerLu: 4, teamColor: null });
    for (let i = 0; i < ras.color.length; i++) {
      const c0 = ras.color[i] ?? -1;
      if (c0 < 0) continue;
      area += it.weight;
      if (ras.team[i] === 1) continue;
      const c = typeof it.tint === 'number' ? multiply(c0, it.tint) : c0;
      if (violatesColorRule(c)) {
        bad += it.weight;
        byColor.set(c, (byColor.get(c) ?? 0) + it.weight);
      }
    }
  }
  const share = area === 0 ? 0 : bad / area;
  const offenders = [...byColor.entries()]
    .map(([color, n]) => ({ color, share: n / Math.max(1, area) }))
    .sort((a, b) => b.share - a.share)
    .slice(0, 5);
  return { share, pass: share <= COLOR_RULE_MAX_SHARE, offenders };
}

// ---------------------------------------------------------------------------------------------
// Silhouettes

/** Bone deltas of a clip at normalised time u (keyframes plus procedural helpers), for checks. */
export function clipPose(p: PuppetDef, clipId: string, u: number): DeltaLookup {
  const clip = getClip(clipId) ?? CLIP_LIBRARY.get(clipId);
  const out = new Map<string, BoneDelta>();
  if (!clip) return (b) => out.get(b);
  for (const [bone, keys] of Object.entries(clip.tracks)) out.set(bone, sampleTrack(keys, u));
  const ctx: ProcContext = {
    bones: new Set(p.bones.map((b) => b.id)),
    heightLu: p.heightLu,
    legLu: p.motion.legLu ?? 16,
    legDeg: p.motion.legDeg ?? 25,
    strideLu: p.motion.strideLu ?? 30,
    speedLuPerSec: p.motion.speedLuPerSec ?? 60,
    wheelRadiusLu: p.motion.wheelRadiusLu ?? 10,
    twirlBone: p.motion.twirlBone,
    air: p.motion.air ?? false,
  };
  for (const [bone, d] of procDeltas(clip.proc ?? [], ctx, u, u * clip.durationMs)) {
    const prev = out.get(bone);
    out.set(bone, prev ? { r: prev.r + d.r, x: prev.x + d.x, y: prev.y + d.y, sx: prev.sx * d.sx, sy: prev.sy * d.sy } : d);
  }
  return (b) => out.get(b);
}

/** Silhouette IoU of two puppets in the same pose, rasterised on one shared grid. */
export function silhouetteIoU(a: PuppetDef, b: PuppetDef, parts: PartLookup, o: { pxPerLu?: number; deltas?: DeltaLookup; state?: PuppetState } = {}): number {
  const bounds = padded(unionBounds(puppetBounds(a, parts, o.deltas, undefined, o.state), puppetBounds(b, parts, o.deltas, undefined, o.state)));
  const ra = rasterizePuppet(a, parts, { ...o, bounds });
  const rb = rasterizePuppet(b, parts, { ...o, bounds });
  return iou(ra.silhouette(), rb.silhouette());
}

/** Silhouette area in lu² (for size comparisons). */
export function silhouetteArea(p: PuppetDef, parts: PartLookup, pxPerLu = 2): number {
  const r = rasterizePuppet(p, parts, { pxPerLu });
  return maskArea(r.silhouette()) / (pxPerLu * pxPerLu);
}

// ---------------------------------------------------------------------------------------------
// Scale and width

/** Body bounds: every slot except weapons, held gear, arms, rotors and banners (`noWidth`). */
export function bodyOnly(p: PuppetDef): PuppetDef {
  return { ...p, slots: p.slots.filter((s) => !s.noWidth && s.tag !== 'weapon') };
}

export function bodyBounds(p: PuppetDef, parts: PartLookup): Bounds {
  return puppetBounds(bodyOnly(p), parts);
}

/** Exact body width (lu) from the rasterised body silhouette (rotated parts do not inflate it). */
export function bodyWidth(p: PuppetDef, parts: PartLookup, pxPerLu = 2): number {
  const r = rasterizePuppet(bodyOnly(p), parts, { pxPerLu });
  let min = Infinity;
  let max = -Infinity;
  for (let y = 0; y < r.h; y++) {
    for (let x = 0; x < r.w; x++) {
      if ((r.color[y * r.w + x] ?? -1) < 0) continue;
      if (x < min) min = x;
      if (x > max) max = x;
    }
  }
  return max < min ? 0 : (max - min + 1) / pxPerLu;
}

/** 1.4x the collision width, plus one outline width (bounds include the outline drawn outside the fill). */
export function maxBodyWidth(p: PuppetDef): number {
  return STYLE.collisionWidthLu[p.size ?? 'small'] * STYLE.maxWidthFactor + STYLE.outlineLu;
}

/**
 * Units drawn outside their group's A11 height band by design, shared by the art unit test and the dev
 * gallery's checks (the gallery e2e). X0 squads and summons draw small (CONTENT_PLAN 5.1: a wolf of a pair at
 * 50 lu, a summoned pup at 0.8x; 5.3: the summoned War Hound, and the Lindworm, a long, low wingless dragon
 * whose bulk is its length; 5.2: the Hydra's fallback puppet, a long, low beast like the Lindworm, its three
 * necks drawn only on the sheet; 5.5: the Tinker's Clockwork Soldier; 5.8: the Swarm Matron's Swarmling, a
 * little void bug). Two camp levies are drawn from a heavy Common, not the Infantry one, yet count as
 * Infantry in the content (5.4: the Cavalry Picket's rider; 5.7: the Mech Bay's mini mech).
 */
export const HEIGHT_BAND_EXEMPT: ReadonlySet<string> = new Set([
  'unit.hunting_wolves',
  'unit.cave_pup',
  'unit.war_hound',
  'unit.lindworm',
  'unit.clockwork_soldier',
  'unit.hydra',
  'unit.swarmling',
  'unit.picket_rider',
  'unit.mini_mech',
]);

export function restHeight(p: PuppetDef, parts: PartLookup): number {
  const b = puppetBounds(p, parts);
  return -b.minY;
}

/**
 * A11 scale bands for ground units by role group, measured feet to the top of the drawing (hat,
 * plume, pennant): heavies 100-120 lu and Legendaries 170-220 lu exactly as A11 states; infantry
 * "~68 lu" gets a band of 54-90 for the small and medium roles. Air units and Epics vary. Puppets in
 * {@link HEIGHT_BAND_EXEMPT} (and their skins) have no band.
 */
export function heightBand(p: PuppetDef): readonly [number, number] | null {
  if (p.kind !== 'unit' || p.motion.air) return null;
  if (HEIGHT_BAND_EXEMPT.has(p.skinOf ?? p.id)) return null;
  switch (p.group) {
    case 'infantry':
    case 'ranged':
    case 'antiArmor':
    case 'support':
      return [54, 90];
    case 'heavy':
      return STYLE.heightHeavyLu;
    case 'legendary':
      return STYLE.heightLegendaryLu;
    default:
      return null;
  }
}

/** Part ids that are pennant carriers by convention: flags, pennants, banners and pennoned lances. */
const PENNANT_PART = /(^|\.)(pennant|flag|banner|lance)(\*|$)/;

/**
 * Pennants (A11 redundant team cue "pennant on heavies"): slots outside the body-width check whose
 * part is a flag, pennant, banner or pennoned lance with a banner-type team layer.
 */
export function pennantSlots(p: PuppetDef, parts: PartLookup): string[] {
  return p.slots
    .filter((s) => (s.noWidth || s.tag === 'weapon') && PENNANT_PART.test(s.part))
    .filter((s) => parts(s.part)?.layers.some((l) => l.banner === true && isTeamZone(l.zone)) ?? false)
    .map((s) => slotId(s));
}

// ---------------------------------------------------------------------------------------------
// Structure

export function structuralProblems(p: PuppetDef, parts: PartLookup): string[] {
  const out = validateBones(p.bones).map((m) => `${p.id}: ${m}`);
  const bones = new Set(p.bones.map((b) => b.id));
  const slots = new Set<string>();
  for (const s of p.slots) {
    const id = slotId(s);
    if (slots.has(id)) out.push(`${p.id}: duplicate slot "${id}"`);
    slots.add(id);
    if (!bones.has(s.bone)) out.push(`${p.id}: slot "${id}" on missing bone "${s.bone}"`);
    const part = parts(s.part);
    if (!part) {
      out.push(`${p.id}: slot "${id}" uses missing part "${s.part}"`);
      continue;
    }
    if (!teamLayersContiguous(part)) out.push(`${p.id}: part "${part.id}" has non-contiguous team layers`);
    for (const l of part.layers) {
      if (isTeamZone(l.zone)) continue;
      if (resolveZone(p.palette, l.zone) === undefined) out.push(`${p.id}: part "${part.id}" zone "${l.zone}" missing from the palette`);
    }
  }
  const world = boneWorld(p.bones);
  if (world.size !== p.bones.length) out.push(`${p.id}: bone ids are not unique`);
  return out;
}

/** Bounds of the whole rest pose, outlines included. */
export function restBounds(p: PuppetDef, parts: PartLookup): Bounds {
  return puppetBounds(p, parts);
}
