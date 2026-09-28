/**
 * World art manifest entries (DESIGN B5 swap point): turrets and bases that have 3D-rendered
 * sprite sheets (`art/blender/world`, installed in `public/art/turrets/<age>/` and
 * `public/art/bases/`). The main manifest merges `WORLD_OVERRIDES` over its generated entries.
 *
 * Anchors and heights come from the procedural puppets, which the sheets were rendered to match
 * (same mount points, same pivots), so switching tiers never moves a turret or a tap target.
 * The sheets themselves load per age (Stone and Medieval at boot, the rest in idle time) through
 * `WorldAtlas`; `?art=procedural` shows the old tier for comparison.
 */
import type { VisualDef } from '@/contracts/art';
import type { AgeId } from '@/contracts/ids';
import { BASE_PUPPETS, TURRET_PUPPETS } from './library';

/** Turret slugs per age that have a sheet (keep in sync with art/blender/world/turrets_<age>.py). */
export const WORLD_TURRET_SHEETS: Readonly<Record<AgeId, readonly string[]>> = {
  stone: ['rock_tosser', 'angry_beehive', 'log_roller', 'grumpy_toad'],
  medieval: ['crossbow_nest', 'pitch_cauldron', 'trebuchet', 'honk_ballista'],
  gunpowder: ['swivel_gun', 'grapeshot_gun', 'congreve_rack', 'chainshot_cannon'],
  modern: ['mg_nest', 'flak_gun', 'howitzer', 'searchlight_sniper'],
  future: ['pulse_laser', 'arc_coil', 'plasma_mortar', 'gravity_well'],
};

/** Ages whose base has a sheet (art/blender/world/base_<age>.py). */
export const WORLD_BASE_SHEETS: readonly AgeId[] = ['stone', 'medieval', 'gunpowder', 'modern', 'future'];

export function turretSheetSource(age: AgeId, slug: string): string {
  return `art/turrets/${age}/${slug}.json`;
}

export function baseSheetSource(age: AgeId): string {
  return `art/bases/${age}.json`;
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
    if (age && WORLD_TURRET_SHEETS[age].includes(slug)) out[p.id] = entry(turretSheetSource(age, slug), p.anchors, p.heightLu);
  }
  for (const age of WORLD_BASE_SHEETS) {
    const b = BASE_PUPPETS[age];
    if (b) out[b.id] = entry(baseSheetSource(age), b.anchors, b.heightLu);
  }
  return out;
}

export const WORLD_OVERRIDES: Readonly<Record<string, VisualDef>> = buildWorldOverrides();
