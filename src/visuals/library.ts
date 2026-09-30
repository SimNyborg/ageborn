/**
 * The procedural source library: every puppet (units, turrets, bases, skins) and every sprite visual
 * (projectiles, icons), keyed by the `VisualDef.source` the manifest points at (DESIGN B5).
 */
import type { AgeId } from '@/contracts/ids';
import './effects/sprites';
import './parts/icons';
import './parts/shared';
import { FX_ZONES } from './effects/sprites';
import { PROJECTILE_RECIPES } from './effects/recipes';
import { ICON_ZONES } from './parts/icons';
import { TRIM_COLORS } from './palette';
import { AGES } from './ages';
import { FORT_PUPPETS, LEVY_PUPPETS } from './forts';
import { AGE_PUPPETS } from './puppets';
import type { BasePuppet } from './rigs/base';
import type { TurretPuppet } from './rigs/turret';
import { SKIN_PUPPETS } from './skins';
import type { PuppetDef } from './types';

export const UNIT_PUPPETS: readonly PuppetDef[] = AGES.flatMap((a) => AGE_PUPPETS[a].units);
export const TURRET_PUPPETS: readonly TurretPuppet[] = AGES.flatMap((a) => AGE_PUPPETS[a].turrets);
export const BASE_PUPPETS: Readonly<Partial<Record<AgeId, BasePuppet>>> = Object.fromEntries(
  AGES.flatMap((a) => {
    const b = AGE_PUPPETS[a].base;
    return b ? [[a, b] as const] : [];
  }),
);

/** A one-part puppet (projectiles, icons). */
export function spritePuppet(id: string, partId: string, palette: Record<string, number>, heightLu: number, kind: PuppetDef['kind'] = 'sprite'): PuppetDef {
  return {
    id,
    kind,
    rig: 'sprite',
    age: null,
    bones: [{ id: 'root', parent: null, x: 0, y: 0 }],
    slots: [{ part: partId, bone: 'root', z: 0 }],
    palette,
    heightLu,
    anchors: { feet: { x: 0, y: 0 }, head: { x: 0, y: -heightLu / 2 }, muzzle: { x: 0, y: 0 }, hitCenter: { x: 0, y: 0 } },
    motion: { family: 'sprite', attack: '', ability: '' },
    impactAt: 0,
  };
}

export const PROJECTILE_SPRITES: readonly PuppetDef[] = PROJECTILE_RECIPES.map((r) => spritePuppet(r.id, r.sprite, FX_ZONES, 12, 'projectile'));

const UI = { ...ICON_ZONES, ...FX_ZONES, trim_bronze: TRIM_COLORS.bronze, trim_silver: TRIM_COLORS.silver, trim_gold: TRIM_COLORS.gold };

export const POWER_IDS = [
  'stampede',
  'meteor_shower',
  'arrow_storm',
  'royal_decree',
  'smoke_screen',
  'broadside',
  'paratroopers',
  'carpet_bomber',
  'orbital_lance',
  'nanite_surge',
  // A17.12
  'tidal_wave',
  'aegis',
  'iron_horse',
  'zeppelin_raid',
  'starfall',
  'warp_strike',
  // The power rework (A2.9, A5.7)
  'rockslide',
  'sticky_tar',
  'hunt_cry',
  'hunters_spear',
  'zeus_bolts',
  'medusa_gaze',
  'chariot_rush',
  'apollo_arrow',
  'caltrops',
  'boiling_oil',
  'knights_charge',
  'undermine',
  'volley_fire',
  'boarding_nets',
  'horse_artillery',
  'sharpshooter',
  'gun_line',
  'barbed_wire',
  'railway_gun',
  'field_hospital',
  'strafing_run',
  'aa_screen',
  'tank_rush',
  'sniper_team',
  'point_defense',
  'stasis_field',
  'drone_swarm',
  'emp_blackout',
  'singularity',
  'solar_flare',
  'comet_run',
  'ion_cannon',
] as const;

export const ICON_SPRITES: readonly PuppetDef[] = [
  ...POWER_IDS.map((p) => spritePuppet(`power.${p}`, `power.${p}`, UI, 40)),
  ...(['infantry', 'ranged', 'heavy', 'antiArmor', 'support', 'epic', 'legendary', 'fort'] as const).map((g) => spritePuppet(`icon.role.${g}`, `icon.role.${g}`, UI, 18)),
  ...AGES.map((a) => spritePuppet(`icon.age.${a}`, `icon.age.${a}`, UI, 40)),
  spritePuppet('icon.horn', 'icon.horn', UI, 20),
  // A17.5 camera UI
  spritePuppet('icon.chevron', 'icon.chevron', UI, 20),
  spritePuppet('icon.base_alert', 'icon.base_alert', UI, 24),
  spritePuppet('icon.follow', 'icon.follow', UI, 22),
  ...(['bronze', 'silver', 'gold'] as const).map((t) => spritePuppet(`trim.${t}`, `trim.${t}`, UI, 10)),
  ...(['bronze', 'silver', 'holo'] as const).map((t) => spritePuppet(`foil.${t}`, `foil.${t}`, UI, 100)),
];

const ALL: PuppetDef[] = [
  ...UNIT_PUPPETS,
  ...TURRET_PUPPETS,
  // A16.14.8 placeholders until F3 draws the fort rigs and levy puppets
  ...FORT_PUPPETS,
  ...LEVY_PUPPETS,
  ...(Object.values(BASE_PUPPETS) as PuppetDef[]),
  ...SKIN_PUPPETS,
  ...PROJECTILE_SPRITES,
  ...ICON_SPRITES,
];

const BY_ID = new Map<string, PuppetDef>();
for (const p of ALL) {
  if (BY_ID.has(p.id)) throw new Error(`Duplicate puppet id "${p.id}"`);
  BY_ID.set(p.id, p);
}

export function puppetById(id: string): PuppetDef | undefined {
  return BY_ID.get(id);
}

export function allPuppets(): readonly PuppetDef[] {
  return ALL;
}
