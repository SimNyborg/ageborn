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

/**
 * Ages whose base has a collapse kit (art/blender/world/base_collapse.py): 3D-rendered debris pieces
 * and rubble heaps in the age's materials, loaded lazily once that base is badly damaged. Bases without
 * one collapse with code-drawn rubble.
 */
export const WORLD_BASE_COLLAPSE_KITS: readonly AgeId[] = ['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern', 'future', 'cosmic'];

export function baseCollapseSource(age: AgeId): string {
  return `art/bases/${age}.collapse.json`;
}

/** How long a destroyed base's collapse plays before its ruin only smokes (the manifest clip length). */
export const BASE_COLLAPSE_MS = 2600;

/**
 * Base skins with a real model (PLAN 2c, art/blender/world/base_skins_<age>.py): skin id (the cosmetic
 * item id, `baseSkin.<id>`) → the age whose base it replaces. Each is the manifest entry
 * `base.<age>@<skin>` with the sheet `art/bases/skins/<skin>.json`, which loads lazily (only when that
 * skin shows); until it arrives the age's standard base draws with the skin's old tint
 * (`cosmetics/baseSkins.ts` `BASE_SKINS`). Same footprint, mounts, flags, Treasury and crumble stages as
 * the standard base (tests in `cosmetics.bases.test.ts`). Crystal Spire is the one troop-system skin here (the
 * Arena 8 gate reward, `skins.ts` target `base.future`): its model replaces the old procedural puppet, which
 * stays as the stand-in while the sheet streams in.
 */
export const WORLD_BASE_SKINS: Readonly<Record<string, AgeId>> = {
  rose_keep: 'medieval',
  mossy_den: 'stone',
  coral_fort: 'gunpowder',
  copper_foundry: 'industrial',
  desert_bunker: 'modern',
  // round 2 (2026-10-09): the other five tint skins and Crystal Spire
  frost_cave: 'stone',
  gilded_ziggurat: 'bronze',
  snowy_keep: 'medieval',
  midnight_neon: 'future',
  crystal_spire: 'future',
  nebula_ark: 'cosmic',
  // round 3 (2026-10-25): the new models, wave 1
  mammoth_bone_lodge: 'stone',
  acropolis_temple: 'bronze',
  windmill_redoubt: 'gunpowder',
  rail_depot: 'industrial',
  jungle_outpost: 'modern',
  // wave 2
  bio_dome_arcology: 'future',
  asteroid_citadel: 'cosmic',
  galleon_bastion: 'gunpowder',
  arctic_radar_station: 'modern',
  // wave 3
  clocktower_works: 'industrial',
  colossus_lighthouse: 'bronze',
  solar_sail_ark: 'cosmic',
  wyrm_coil_keep: 'medieval',
};

/** Skin models with their own collapse kit (`art/bases/skins/<skin>.collapse.json`); the others use their age's. */
export const WORLD_BASE_SKIN_KITS: readonly string[] = [
  'rose_keep',
  'mossy_den',
  'coral_fort',
  'copper_foundry',
  'desert_bunker',
  'frost_cave',
  'gilded_ziggurat',
  'snowy_keep',
  'midnight_neon',
  'crystal_spire',
  'nebula_ark',
  'mammoth_bone_lodge',
  'acropolis_temple',
  'windmill_redoubt',
  'rail_depot',
  'jungle_outpost',
  'bio_dome_arcology',
  'asteroid_citadel',
  'galleon_bastion',
  'arctic_radar_station',
  'clocktower_works',
  'colossus_lighthouse',
  'solar_sail_ark',
  'wyrm_coil_keep',
];

/**
 * Skin models that stand in the white Legendary aura (PLAN 2c, A12 "white idle aura on Legendary units and
 * Legendary skins"). In battle the sheet's own `meta.ageborn.aura: 'legendary'` turns it on (a test holds the
 * sheets and this list equal); the screens' base pictures (Customize, VS, Home) read the list to draw the same
 * soft halo under the model (`docs/requests/custom-b-diorama-anchors.md`). Colossus Lighthouse (round 3b) wears it
 * round its raised torch, not round the body (the sheet's `meta.ageborn.auraLu`; `baseSkinAuraSpot` for the screens).
 */
export const WORLD_BASE_SKIN_AURA: readonly string[] = ['crystal_spire', 'nebula_ark', 'colossus_lighthouse'];

/**
 * Base skin models with prop loops (round 3; the base contract's generic `prop` clip, art/blender/world/common.py
 * `prop_loop`): skin → each loop's clip and its length (ms). They are the `prop.<clip>` clips of the skin's
 * manifest entry (the swap point, B5); the base view plays them from the sheet's `meta.ageborn.props` (a test
 * holds the two equal): Crystal Spire's shards orbit its tip, Nebula Ark's nebula flows up its two ribbons, the
 * Bone Lodge's chimes swing, the Acropolis tripods flicker, the Windmill Redoubt's sails turn, the Jungle Outpost's
 * waterfall runs, the Bio-Dome's turbines spin, the Asteroid Citadel's rocks orbit, the Galleon's sails flutter, the
 * Arctic Radar's dish sweeps, the Clocktower's minute hand ticks round with its gears, the Colossus's torch burns, light
 * sweeps the Solar Sail Ark's sails while its arrays blink, and the Wyrm-Coil Keep's dragon (one still frame over the
 * body, so the sheet stores it once) breathes.
 */
export const WORLD_BASE_SKIN_PROPS: Readonly<Record<string, readonly { clip: string; loopMs: number }[]>> = {
  crystal_spire: [{ clip: 'shards', loopMs: 1560 }],
  nebula_ark: [
    { clip: 'nebulaA', loopMs: 1560 },
    { clip: 'nebulaB', loopMs: 1560 },
  ],
  // round 3: the new models' moving parts
  mammoth_bone_lodge: [{ clip: 'chimes', loopMs: 1020 }],
  acropolis_temple: [
    { clip: 'flamesL', loopMs: 440 },
    { clip: 'flamesR', loopMs: 440 },
  ],
  windmill_redoubt: [{ clip: 'sails', loopMs: 1260 }],
  rail_depot: [{ clip: 'signal', loopMs: 1520 }],
  jungle_outpost: [{ clip: 'water', loopMs: 600 }],
  bio_dome_arcology: [{ clip: 'turbines', loopMs: 540 }],
  asteroid_citadel: [{ clip: 'rocks', loopMs: 1680 }],
  galleon_bastion: [{ clip: 'flutter', loopMs: 900 }],
  arctic_radar_station: [
    { clip: 'dish', loopMs: 1920 },
    { clip: 'beacon', loopMs: 1040 },
  ],
  clocktower_works: [
    { clip: 'hands', loopMs: 7200 },
    { clip: 'gears', loopMs: 7200 },
  ],
  colossus_lighthouse: [{ clip: 'torch', loopMs: 540 }],
  solar_sail_ark: [
    { clip: 'shimmer', loopMs: 2800 },
    { clip: 'blink', loopMs: 1520 },
  ],
  wyrm_coil_keep: [
    { clip: 'dragon', loopMs: 4000 },
    { clip: 'breath', loopMs: 2400 },
  ],
};

export function baseSkinSheetSource(skin: string): string {
  return `art/bases/skins/${skin}.json`;
}

export function baseSkinCollapseSource(skin: string): string {
  return `art/bases/skins/${skin}.collapse.json`;
}

/**
 * Base decorations rendered as Blender props (PLAN 2a "Decorations", round 3; art/blender/world/decorations.py):
 * the decoration ids that have a prop sheet `art/cosmetics/decorations/<id>.json` (1.23 px/lu, the base
 * pipeline's light and outline). The lane's dressing loads only the equipped props (three a side) and draws the
 * SVG bake until a prop arrives, then cross-fades; ids not listed keep their SVG. The screens' pictures come from
 * one HD atlas (`DECORATION_THUMBS_SOURCE`, 2.46 px/lu), loaded when a screen first asks.
 */
export const WORLD_DECORATIONS: readonly string[] = [
  'stone_idol',
  'lion_statue',
  'knight_statue',
  'owl_statue',
  'astro_statue',
  'hide_banner',
  'royal_standard',
  'regiment_colors',
  'neon_banner',
  'fire_bowl',
  'iron_brazier',
  'gas_lamp',
  'plasma_brazier',
  'mammoth_tusks',
  'knight_helm',
  'golden_cup',
  'star_trophy',
  'shield_rack',
  'fern',
  'olive_tree',
  'topiary',
  'potted_cactus',
  'bonsai',
  'crystal_flower',
];

export function decorationSheetSource(id: string): string {
  return `art/cosmetics/decorations/${id}.json`;
}

export const DECORATION_THUMBS_SOURCE = 'art/cosmetics/decorations/thumbs.json';

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
    if (!b) continue;
    const e = entry(baseSheetSource(age), b.anchors, b.heightLu);
    // the destroyed collapse: its kit sheet is a clip of the base entry (the swap point, B5)
    if (WORLD_BASE_COLLAPSE_KITS.includes(age)) e.clips['collapse'] = { kind: 'atlas', ref: baseCollapseSource(age), durationMs: BASE_COLLAPSE_MS, loop: false };
    out[b.id] = e;
  }
  // base skin models: the same anchors as the age's base (same footprint), their own sheet and kit
  for (const [skin, age] of Object.entries(WORLD_BASE_SKINS)) {
    const b = BASE_PUPPETS[age];
    if (!b) continue;
    const e = entry(baseSkinSheetSource(skin), b.anchors, b.heightLu);
    const kit = WORLD_BASE_SKIN_KITS.includes(skin) ? baseSkinCollapseSource(skin) : WORLD_BASE_COLLAPSE_KITS.includes(age) ? baseCollapseSource(age) : null;
    if (kit) e.clips['collapse'] = { kind: 'atlas', ref: kit, durationMs: BASE_COLLAPSE_MS, loop: false };
    // its prop loops, as clips of the same sheet
    for (const pr of WORLD_BASE_SKIN_PROPS[skin] ?? []) e.clips[`prop.${pr.clip}`] = { kind: 'atlas', ref: pr.clip, durationMs: pr.loopMs, loop: true };
    out[`${b.id}@${skin}`] = e;
  }
  return out;
}

export const WORLD_OVERRIDES: Readonly<Record<string, VisualDef>> = buildWorldOverrides();
