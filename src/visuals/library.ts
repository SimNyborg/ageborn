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
] as const;

export const ICON_SPRITES: readonly PuppetDef[] = [
  ...POWER_IDS.map((p) => spritePuppet(`power.${p}`, `power.${p}`, UI, 40)),
  ...(['infantry', 'ranged', 'heavy', 'antiArmor', 'support', 'epic', 'legendary'] as const).map((g) => spritePuppet(`icon.role.${g}`, `icon.role.${g}`, UI, 18)),
  ...AGES.map((a) => spritePuppet(`icon.age.${a}`, `icon.age.${a}`, UI, 40)),
  spritePuppet('icon.horn', 'icon.horn', UI, 20),
  ...(['bronze', 'silver', 'gold'] as const).map((t) => spritePuppet(`trim.${t}`, `trim.${t}`, UI, 10)),
  ...(['bronze', 'silver', 'holo'] as const).map((t) => spritePuppet(`foil.${t}`, `foil.${t}`, UI, 100)),
];

const ALL: PuppetDef[] = [
  ...UNIT_PUPPETS,
  ...TURRET_PUPPETS,
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
