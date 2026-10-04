/**
 * World art manifest entries (DESIGN B5 swap point): turrets and bases that have 3D-rendered
 * sprite sheets (`art/blender/world`, installed in `public/art/turrets/<age>/` and
 * `public/art/bases/`). The main manifest merges `WORLD_OVERRIDES` over its generated entries.
 *
 * Base mounts: every base sheet carries the same four mount points (`WORLD_BASE_MOUNTS_LU`, modelled
 * as real platforms in art/blender/world, `meta.ageborn.mountsLu`), and `AtlasBaseView.mountPoints()`
 * returns them, so the battle view's turrets and tap targets follow the art and never move when a
 * base morphs into the next age. Turrets render `turretArtScale(h)` times larger than the procedural
 * puppets (art review: they must read next to 56 px infantry); their anchors scale with them.
 * The sheets themselves load per age (the boot ages first, the rest in idle time) through
 * `WorldAtlas`; `?art=procedural` shows the old tier for comparison.
 */
import type { VisualDef } from '@/contracts/art';
import type { AgeId } from '@/contracts/ids';
import { BASE_PUPPETS, TURRET_PUPPETS } from './library';

/** Turret slugs per age that have a sheet (keep in sync with art/blender/world/turrets_<age>.py). */
export const WORLD_TURRET_SHEETS: Readonly<Record<AgeId, readonly string[]>> = {
  stone: ['rock_tosser', 'angry_beehive', 'log_roller', 'grumpy_toad', 'quill_porcupine', 'sapling_sling'],
  medieval: ['crossbow_nest', 'pitch_cauldron', 'trebuchet', 'honk_ballista', 'springald', 'grapple_crane'],
  gunpowder: ['swivel_gun', 'grapeshot_gun', 'congreve_rack', 'chainshot_cannon', 'carronade', 'sea_mortar'],
  modern: ['mg_nest', 'flak_gun', 'howitzer', 'searchlight_sniper', 'anti_tank_gun', 'rocket_battery'],
  future: ['pulse_laser', 'arc_coil', 'plasma_mortar', 'gravity_well', 'cryo_pod', 'tractor_beam'],
  // A17 ages (art/blender/world/turrets_<age>.py)
  bronze: ['archer_tower', 'sun_mirror', 'onager', 'gorgon_bust'],
  industrial: ['gatling_gun', 'mortar_pit', 'boiler_mortar', 'tesla_tower', 'rivet_spitter', 'steam_hammer'],
  cosmic: ['ion_turret', 'starburst_gun', 'starfall_battery', 'tachyon_lance', 'shard_spitter', 'event_horizon'],
};

/** Ages whose base has a sheet (art/blender/world/base_<age>.py). */
export const WORLD_BASE_SHEETS: readonly AgeId[] = ['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern', 'future', 'cosmic'];

export function turretSheetSource(age: AgeId, slug: string): string {
  return `art/turrets/${age}/${slug}.json`;
}

export function baseSheetSource(age: AgeId): string {
  return `art/bases/${age}.json`;
}

/** Turret mounts of every 3D base (screen lu from the gate: x toward the lane, y UP), bottom to top. */
export const WORLD_BASE_MOUNTS_LU: readonly (readonly [number, number])[] = [
  [-6, 46],
  [-50, 112],
  [-8, 178],
  [-56, 246],
];

/** Turret sheets are rendered this much larger than authored, capped at about 72 lu tall (world/common.py). */
export const WORLD_TURRET_SCALE = 1.7;
export const WORLD_TURRET_MAX_LU = 72;

export function turretArtScale(heightLu: number): number {
  return Math.min(WORLD_TURRET_SCALE, WORLD_TURRET_MAX_LU / Math.max(1, heightLu));
}

function scaleAnchors(a: VisualDef['anchors'], k: number): VisualDef['anchors'] {
  const s = (p: { x: number; y: number }): { x: number; y: number } => ({ x: p.x * k, y: p.y * k });
  return { feet: s(a.feet), head: s(a.head), muzzle: s(a.muzzle), hitCenter: s(a.hitCenter) };
}

function entry(source: string, anchors: VisualDef['anchors'], heightLu: number): VisualDef {
  return {
    kind: 'atlas',
    source,
    anchors,
    heightLu,
    team: { kind: 'mask', maskTextures: ['_team'] },
    clips: {},
    events: { attack: { impactAt: 0.1 } },
  };
}

export function buildWorldOverrides(): Record<string, VisualDef> {
  const out: Record<string, VisualDef> = {};
  for (const p of TURRET_PUPPETS) {
    const age = p.age;
    const slug = p.id.replace(/^turret\./, '');
    if (age && WORLD_TURRET_SHEETS[age].includes(slug)) {
      const k = turretArtScale(p.heightLu);
      out[p.id] = entry(turretSheetSource(age, slug), scaleAnchors(p.anchors, k), Math.round(p.heightLu * k));
    }
  }
  for (const age of WORLD_BASE_SHEETS) {
    const b = BASE_PUPPETS[age];
    if (b) out[b.id] = entry(baseSheetSource(age), b.anchors, b.heightLu);
  }
  return out;
}

export const WORLD_OVERRIDES: Readonly<Record<string, VisualDef>> = buildWorldOverrides();
