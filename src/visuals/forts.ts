/**
 * Fort and levy visuals (DESIGN A16.14.8, F3).
 *
 * - Forts (`fort.<slug>`) are rendered by the Blender pipeline (cartoon forts:
 *   `art/blender/world/forts_<age>.py`; the ages not yet restyled: `art/blender/styles/realistic/forts/`) into sheets at `public/art/forts/<age>/<slug>(.hd).json`
 *   (clips body, front, scaffold, rubble, flag, door, trap; see the kit's docstring). `FORT_SHEETS` lists
 *   the installed ones; their manifest entries are kind 'atlas' and `fortViews/atlasFortView.ts` draws them
 *   (a code-drawn stand-in while a sheet loads or where none is installed). The procedural entries stay as
 *   the portrait fallback.
 * - Levies (`unit.<slug>`) draw from their age's Infantry Common sheet at 0.85 scale (A16.14.8: a smaller,
 *   plainer figure), falling back to the Infantry puppet.
 *
 * Visuals may not read the content (DESIGN B2), so the ids are listed here;
 * `src/visuals/test/forts.test.ts` checks them against the content.
 */
import type { VisualDef } from '@/contracts/art';
import type { AgeId } from '@/contracts/ids';
import { AGE_PUPPETS } from './puppets';
import type { TurretPuppet } from './rigs/turret';
import type { PuppetDef } from './types';

/** Every fort card (A16.14.4): id, age and kind (towers are medium, walls and camps large, traps flat). */
export const FORT_VISUALS: readonly { id: string; age: AgeId; kind: 'wall' | 'tower' | 'camp' | 'trap' }[] = [
  { id: 'palisade', age: 'stone', kind: 'wall' },
  { id: 'sling_perch', age: 'stone', kind: 'tower' },
  { id: 'war_camp', age: 'stone', kind: 'camp' },
  { id: 'spike_pit', age: 'stone', kind: 'trap' },
  // Stone wave variants (CONTENT_PLAN 5.1)
  { id: 'thorn_hedge', age: 'stone', kind: 'wall' },
  { id: 'bone_watchtower', age: 'stone', kind: 'tower' },
  { id: 'cyclopean_wall', age: 'bronze', kind: 'wall' },
  { id: 'pyrgos_tower', age: 'bronze', kind: 'tower' },
  { id: 'muster_tents', age: 'bronze', kind: 'camp' },
  { id: 'hidden_stakes', age: 'bronze', kind: 'trap' },
  // Bronze wave variants (CONTENT_PLAN 5.2)
  { id: 'hoplon_line', age: 'bronze', kind: 'wall' },
  { id: 'slinger_camp', age: 'bronze', kind: 'camp' },
  { id: 'shield_barricade', age: 'medieval', kind: 'wall' },
  { id: 'longbow_tower', age: 'medieval', kind: 'tower' },
  { id: 'levy_camp', age: 'medieval', kind: 'camp' },
  { id: 'wolf_pits', age: 'medieval', kind: 'trap' },
  // Medieval wave variants (CONTENT_PLAN 5.3)
  { id: 'bear_snares', age: 'medieval', kind: 'trap' },
  { id: 'crossbow_keep', age: 'medieval', kind: 'tower' },
  { id: 'gabion_wall', age: 'gunpowder', kind: 'wall' },
  { id: 'musket_redoubt', age: 'gunpowder', kind: 'tower' },
  { id: 'militia_muster', age: 'gunpowder', kind: 'camp' },
  { id: 'powder_keg', age: 'gunpowder', kind: 'trap' },
  // Gunpowder wave (CONTENT_PLAN 5.4)
  { id: 'cavalry_picket', age: 'gunpowder', kind: 'camp' },
  { id: 'fougasse', age: 'gunpowder', kind: 'trap' },
  { id: 'trench_parapet', age: 'industrial', kind: 'wall' },
  { id: 'sniper_nest', age: 'industrial', kind: 'tower' },
  { id: 'recruiting_depot', age: 'industrial', kind: 'camp' },
  { id: 'tripwire_charge', age: 'industrial', kind: 'trap' },
  // Industrial wave (CONTENT_PLAN 5.5)
  { id: 'rail_barricade', age: 'industrial', kind: 'wall' },
  { id: 'tesla_pylon', age: 'industrial', kind: 'tower' },
  { id: 'sandbag_bunker', age: 'modern', kind: 'wall' },
  { id: 'pillbox', age: 'modern', kind: 'tower' },
  { id: 'forward_base', age: 'modern', kind: 'camp' },
  { id: 'minefield', age: 'modern', kind: 'trap' },
  // Modern wave (CONTENT_PLAN 5.6)
  { id: 'rifle_depot', age: 'modern', kind: 'camp' },
  { id: 'wire_snare', age: 'modern', kind: 'trap' },
  { id: 'hardlight_barrier', age: 'future', kind: 'wall' },
  { id: 'sentry_pylon', age: 'future', kind: 'tower' },
  { id: 'clone_bay', age: 'future', kind: 'camp' },
  { id: 'grav_mire', age: 'future', kind: 'trap' },
  // Future wave (CONTENT_PLAN 5.7)
  { id: 'skyguard_pylon', age: 'future', kind: 'tower' },
  { id: 'mech_bay', age: 'future', kind: 'camp' },
  { id: 'void_rampart', age: 'cosmic', kind: 'wall' },
  { id: 'ion_spire', age: 'cosmic', kind: 'tower' },
  { id: 'warp_barracks', age: 'cosmic', kind: 'camp' },
  { id: 'void_mine', age: 'cosmic', kind: 'trap' },
  // Cosmic wave (CONTENT_PLAN 5.8)
  { id: 'star_bulwark', age: 'cosmic', kind: 'wall' },
  { id: 'stardust_snare', age: 'cosmic', kind: 'trap' },
];

/**
 * Every levy (A16.14.3): id, age and the Common it is drawn from (`infantry`: the age's Infantry Common,
 * or the ranged or brute Common of an X0 camp variant with `levyFrom`).
 */
export const LEVY_VISUALS: readonly { id: string; age: AgeId; infantry: string }[] = [
  { id: 'cave_youth', age: 'stone', infantry: 'bonker' },
  { id: 'citizen_levy', age: 'bronze', infantry: 'hoplite' },
  // Bronze wave: the Skirmisher Camp's levy, drawn from the Bronze ranged Common (CONTENT_PLAN 5.2)
  { id: 'slinger_levy', age: 'bronze', infantry: 'javelineer' },
  { id: 'peasant_levy', age: 'medieval', infantry: 'footman' },
  { id: 'militiaman', age: 'gunpowder', infantry: 'corsair' },
  // Gunpowder wave: the Cavalry Picket's levy, drawn from the Gunpowder heavy Common (CONTENT_PLAN 5.4)
  { id: 'picket_rider', age: 'gunpowder', infantry: 'cuirassier' },
  { id: 'volunteer', age: 'industrial', infantry: 'riveter' },
  { id: 'conscript', age: 'modern', infantry: 'trench_raider' },
  // Modern wave: the Rifle Depot's levy, drawn from the Modern ranged Common (CONTENT_PLAN 5.6)
  { id: 'rifle_levy', age: 'modern', infantry: 'rifleman' },
  { id: 'clone_cadet', age: 'future', infantry: 'photon_knight' },
  // Future wave: the Mech Bay's levy, drawn from the Future heavy Common (CONTENT_PLAN 5.7)
  { id: 'mini_mech', age: 'future', infantry: 'walker_mech' },
  { id: 'star_recruit', age: 'cosmic', infantry: 'star_legionnaire' },
];

/** Levies are drawn at this fraction of their Infantry Common (A16.14.8). */
export const LEVY_SCALE = 0.85;

/** Fort sheets installed in `public/art/forts/<age>/` (keep in sync with art/blender/styles/realistic/forts/<age>.py). */
export const FORT_SHEETS: Readonly<Record<AgeId, readonly string[]>> = {
  stone: ['palisade', 'sling_perch', 'war_camp', 'spike_pit', 'thorn_hedge', 'bone_watchtower'],
  bronze: ['cyclopean_wall', 'pyrgos_tower', 'muster_tents', 'hidden_stakes', 'hoplon_line', 'slinger_camp'],
  medieval: ['shield_barricade', 'longbow_tower', 'levy_camp', 'wolf_pits', 'bear_snares', 'crossbow_keep'],
  gunpowder: ['gabion_wall', 'musket_redoubt', 'militia_muster', 'powder_keg', 'cavalry_picket', 'fougasse'],
  industrial: ['trench_parapet', 'sniper_nest', 'recruiting_depot', 'tripwire_charge', 'rail_barricade', 'tesla_pylon'],
  modern: ['sandbag_bunker', 'pillbox', 'forward_base', 'minefield', 'rifle_depot', 'wire_snare'],
  future: ['hardlight_barrier', 'sentry_pylon', 'clone_bay', 'grav_mire', 'skyguard_pylon', 'mech_bay'],
  cosmic: ['void_rampart', 'ion_spire', 'warp_barracks', 'void_mine', 'star_bulwark', 'stardust_snare'],
};

export type FortKindId = 'wall' | 'tower' | 'camp' | 'trap';

/** The sheet source of a fort (`art/forts/<age>/<slug>.json`). */
export function fortSheetSource(age: AgeId, slug: string): string {
  return `art/forts/${age}/${slug}.json`;
}

/** Age and slug of a fort sheet source, or null for other sources. */
export function fortSource(source: string): { age: AgeId; slug: string } | null {
  const m = /art\/forts\/(stone|bronze|medieval|gunpowder|industrial|modern|future|cosmic)\/([a-z0-9_]+)\.json$/.exec(source);
  return m ? { age: m[1] as AgeId, slug: m[2] as string } : null;
}

/** Nominal size per kind until the sheet's own meta arrives (lu; y up is negative, the VisualDef convention). */
const KIND_SHAPE: Record<FortKindId, { height: number; hit: number }> = {
  wall: { height: 96, hit: 38 },
  tower: { height: 100, hit: 30 },
  camp: { height: 86, hit: 26 },
  trap: { height: 24, hit: 6 },
};

function fortDef(f: { id: string; age: AgeId; kind: FortKindId }): VisualDef {
  const k = KIND_SHAPE[f.kind];
  return {
    kind: 'atlas',
    source: fortSheetSource(f.age, f.id),
    anchors: { feet: { x: 0, y: 0 }, head: { x: 0, y: -k.height }, muzzle: { x: 6, y: -k.height * 0.7 }, hitCenter: { x: 0, y: -k.hit } },
    heightLu: k.height,
    team: { kind: 'mask', maskTextures: ['_team'] },
    clips: {},
    events: { attack: { impactAt: 0 } },
  };
}

/** Atlas manifest entries of the forts with an installed sheet. */
export function buildFortOverrides(): Record<string, VisualDef> {
  const out: Record<string, VisualDef> = {};
  for (const f of FORT_VISUALS) if (FORT_SHEETS[f.age].includes(f.id)) out[`fort.${f.id}`] = fortDef(f);
  return out;
}

/**
 * Levy entries: the Infantry Common's sheet entry at `LEVY_SCALE` (anchors and height scaled; the atlas
 * view scales the sprite by `heightLu / sheet heightLu`). `sheetDefs` are the unit sheet entries.
 */
export function buildLevyOverrides(sheetDefs: Readonly<Record<string, VisualDef>>): Record<string, VisualDef> {
  const out: Record<string, VisualDef> = {};
  for (const l of LEVY_VISUALS) {
    const base = sheetDefs[`unit.${l.infantry}`];
    if (!base) continue;
    const s = (p: { x: number; y: number }): { x: number; y: number } => ({ x: p.x * LEVY_SCALE, y: p.y * LEVY_SCALE });
    out[`unit.${l.id}`] = {
      ...base,
      anchors: { feet: s(base.anchors.feet), head: s(base.anchors.head), muzzle: s(base.anchors.muzzle), hitCenter: s(base.anchors.hitCenter) },
      heightLu: Math.round(base.heightLu * LEVY_SCALE * 10) / 10,
    };
  }
  return out;
}

/** The age's first Common turret puppet (the placeholder body of its forts). */
function turretOf(age: AgeId): TurretPuppet | undefined {
  return AGE_PUPPETS[age].turrets[0];
}

/** The age's Infantry puppet (the placeholder body of its levy). */
function infantryOf(age: AgeId): PuppetDef | undefined {
  return AGE_PUPPETS[age].units.find((p) => p.group === 'infantry');
}

/** Placeholder fort puppets: the age's turret rig as `fort.<slug>`, group `fort`, the fort's size class. */
export const FORT_PUPPETS: readonly TurretPuppet[] = FORT_VISUALS.flatMap((f) => {
  const base = turretOf(f.age);
  if (!base) return [];
  const size: PuppetDef['size'] = f.kind === 'tower' ? 'medium' : 'large';
  return [{ ...base, id: `fort.${f.id}`, group: 'fort', size, legendary: false }];
});

/**
 * Placeholder levy puppets: the age's Infantry puppet as `unit.<slug>` (same anchors and height; F3 draws
 * the plain levy outfit at 0.85 scale, A16.14.8).
 */
export const LEVY_PUPPETS: readonly PuppetDef[] = LEVY_VISUALS.flatMap((l) => {
  // An X0 camp variant's levy (`levyFrom`) is drawn from its own Common (a rider, a slinger), so its
  // size class, group and muzzle follow that Common; the classic levies use the age's Infantry.
  const base = AGE_PUPPETS[l.age].units.find((p) => p.id === `unit.${l.infantry}`) ?? infantryOf(l.age);
  if (!base) return [];
  // levies are Infantry-group units in the content (A16.14.8), whatever Common they are drawn from
  return [{ ...base, id: `unit.${l.id}`, group: 'infantry' as const, legendary: false }];
});
