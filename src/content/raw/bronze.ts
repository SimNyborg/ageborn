/**
 * Bronze Age (P 1.16): docs/design-lane-ages.md A17.9 units, turrets and powers (to be merged into
 * DESIGN as A5.x), A17.12 attack mapping. Table units: HP and damage whole, ms, lu, lu/s, gold, bp.
 * Data only. `strongVs`/`weakVs` are filled by the WP1 counter matrix (B4).
 *
 * NOT WIRED YET. `AgeId` has no 'bronze' until the WP0 contract request of A17.15 lands, so this file
 * types its tables with a local widening. When 'bronze' joins `AgeId`: type `bronze` as
 * `RawAgeTables`, `bronzePowers` as `PowerDef[]` (or move them into `powers.ts`), `bronzeScale` as
 * `RawAgeScale`, and add the age to `raw/index.ts`, `economy.ts` (`ageScale`, formats) and `ages.ts`.
 */
import type { PowerDef, TurretDef, UnitDef } from '@/contracts/content';
import type { AgeId } from '@/contracts/ids';
import { damageMods } from './economy';
import type { RawAgeScale } from './types';

/** The age id this file adds (A17.8). */
type PendingAge = 'bronze';
type WithAge<T extends { age: AgeId }> = Omit<T, 'age'> & { age: AgeId | PendingAge };

/** A17.8: P 1.16, base max HP 11,600, index 1 (between Stone and Medieval), 500 XP to Medieval. */
export const bronzeScale: Omit<RawAgeScale, 'id'> & { id: PendingAge } = {
  id: 'bronze',
  index: 1,
  pBp: 11600,
  baseHp: 11600,
  xpToNext: 500,
};

export const bronze: {
  age: PendingAge;
  units: readonly WithAge<UnitDef>[];
  turrets: readonly WithAge<TurretDef>[];
} = {
  age: 'bronze',
  units: [
    {
      // Blunt. Shield Bash: the first hit of each engagement knocks the target back 15 lu (no damage bonus)
      id: 'hoplite', kind: 'unit', age: 'bronze', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 50, trainMs: 1500, pop: 2, hp: 186, speed: 70, size: 'small',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 23, intervalMs: 1000, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'pierce', sfx: 'swing_whoosh', mods: damageMods.blunt,
        },
      ],
      abilities: [{ kind: 'firstHitBonus', multBp: 10000, knockback: 15, idleResetMs: 2000 }],
      visualId: 'unit.hoplite', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.hoplite.name', descKey: 'card.hoplite.desc', strongVs: [], weakVs: [],
    },
    {
      // Javelin: pierces 2 targets total within 50 lu (the second takes 50%, A2.6)
      id: 'javelineer', kind: 'unit', age: 'bronze', rarity: 'common', role: 'ranged', group: 'ranged',
      cost: 75, trainMs: 2000, pop: 3, hp: 110, speed: 65, size: 'small',
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 20, intervalMs: 1400, windupPct: 50, range: 210, hitsGround: true, hitsAir: true,
          projectile: { speed: 650, visualId: 'proj.javelin' },
          dmgType: 'pierce', sfx: 'shot_javelin', pierce: { count: 2, length: 50 },
        },
      ],
      abilities: [],
      visualId: 'unit.javelineer', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.javelineer.name', descKey: 'card.javelineer.desc', strongVs: [], weakVs: [],
    },
    {
      // Scythe Charge: first hit ×2 and 30 lu knockback. The fastest Common Heavy (65), with less HP
      id: 'war_chariot', kind: 'unit', age: 'bronze', rarity: 'common', role: 'heavy', group: 'heavy',
      cost: 150, trainMs: 4000, pop: 6, hp: 630, speed: 65, size: 'large',
      tags: ['armored', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 49, intervalMs: 1500, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'slash', sfx: 'swing_whoosh',
        },
      ],
      abilities: [{ kind: 'firstHitBonus', multBp: 20000, knockback: 30, idleResetMs: 2000 }],
      visualId: 'unit.war_chariot', sfx: { spawn: 'spawn_heavy', die: 'die_bio' },
      nameKey: 'card.war_chariot.name', descKey: 'card.war_chariot.desc', strongVs: [], weakVs: [],
    },
    {
      // Reach 65; melee AA mods; priority armored
      id: 'phalangite', kind: 'unit', age: 'bronze', rarity: 'rare', role: 'antiArmor', group: 'antiArmor',
      cost: 100, trainMs: 2500, pop: 4, hp: 232, speed: 70, size: 'medium',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 30, intervalMs: 1200, windupPct: 40, range: 65, hitsGround: true, hitsAir: false,
          dmgType: 'pierce', sfx: 'swing_whoosh', mods: damageMods.meleeAntiArmor, priority: 'armored',
        },
      ],
      abilities: [],
      visualId: 'unit.phalangite', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.phalangite.name', descKey: 'card.phalangite.desc', strongVs: [], weakVs: [],
    },
    {
      // Aura: allies within 160 lu deal +15% damage; followSupport
      id: 'standard_bearer', kind: 'unit', age: 'bronze', rarity: 'rare', role: 'support', group: 'support',
      cost: 110, trainMs: 3000, pop: 4, hp: 151, speed: 65, size: 'small',
      tags: ['light', 'bio', 'support', 'ranged', 'ground'],
      attacks: [
        {
          damage: 9, intervalMs: 1200, windupPct: 50, range: 150, hitsGround: true, hitsAir: true,
          projectile: { speed: 650, visualId: 'proj.javelin' },
          dmgType: 'pierce', sfx: 'shot_javelin',
        },
      ],
      abilities: [
        // durationMs 0: the aura status lasts while the ally is inside the radius (as Drum Shaman)
        { kind: 'aura', radius: 160, status: { kind: 'damageBuff', magnitudeBp: 1500, durationMs: 0 } },
        { kind: 'followSupport', behindFront: 60, soloMaxP: 200 },
      ],
      visualId: 'unit.standard_bearer', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.standard_bearer.name', descKey: 'card.standard_bearer.desc', strongVs: [], weakVs: [],
    },
    {
      // Bolt-thrower: 64 / 3.0 s at range 290 (min 60), pierces 3 targets total within 150 lu; ground only
      id: 'scorpion', kind: 'unit', age: 'bronze', rarity: 'epic', role: 'artillery', group: 'epic',
      cost: 200, trainMs: 4000, pop: 8, hp: 330, speed: 45, size: 'large',
      tags: ['light', 'mech', 'ranged', 'ground'],
      attacks: [
        {
          damage: 64, intervalMs: 3000, windupPct: 50, range: 290, minRange: 60, hitsGround: true, hitsAir: false,
          projectile: { speed: 900, visualId: 'proj.scorpion_bolt' },
          dmgType: 'pierce', sfx: 'shot_scorpion', pierce: { count: 3, length: 150 },
        },
      ],
      abilities: [],
      visualId: 'unit.scorpion', sfx: { spawn: 'spawn_heavy', die: 'die_mech' },
      nameKey: 'card.scorpion.name', descKey: 'card.scorpion.desc', strongVs: [], weakVs: [],
    },
    {
      // Stomp: 64 splash r45 / 2.0 s; every enemy hit is slowed 20% for 1.5 s.
      // Molten Heart: on death bursts for 160 splash r70 on ground enemies
      id: 'bronze_colossus', kind: 'unit', age: 'bronze', rarity: 'legendary', role: 'siegeHeavy', group: 'legendary',
      cost: 350, trainMs: 7000, pop: 14, hp: 2050, speed: 40, size: 'huge',
      tags: ['armored', 'mech', 'melee', 'legendary', 'ground'],
      attacks: [
        {
          damage: 64, intervalMs: 2000, windupPct: 40, range: 20, hitsGround: true, hitsAir: false,
          dmgType: 'blast', sfx: 'stomp_colossus', splashRadius: 45,
          onHit: [{ kind: 'slow', magnitudeBp: 2000, durationMs: 1500 }],
        },
      ],
      abilities: [{ kind: 'onDeathExplode', damage: 160, radius: 70 }],
      visualId: 'unit.bronze_colossus', sfx: { spawn: 'spawn_legendary', die: 'die_mech' },
      nameKey: 'card.bronze_colossus.name', descKey: 'card.bronze_colossus.desc', strongVs: [], weakVs: [],
    },
  ],
  turrets: [
    {
      // Single target
      id: 'archer_tower', kind: 'turret', age: 'bronze', rarity: 'common', cost: 150,
      attack: {
        damage: 35, intervalMs: 1500, windupPct: 0, range: 370, hitsGround: true, hitsAir: true,
        projectile: { speed: 650, visualId: 'proj.arrow' },
        dmgType: 'pierce', sfx: 'shot_bow',
      },
      visualId: 'turret.archer_tower', nameKey: 'card.archer_tower.name', descKey: 'card.archer_tower.desc',
    },
    {
      // Focused sunlight: instant beam, high chip DPS, short range (the Bronze answer to the Beehive)
      id: 'sun_mirror', kind: 'turret', age: 'bronze', rarity: 'common', cost: 175,
      attack: {
        damage: 9, intervalMs: 300, windupPct: 0, range: 230, hitsGround: true, hitsAir: true,
        projectile: { instant: true, effectId: 'fx.sun_beam' },
        dmgType: 'laser', sfx: 'mirror_beam',
      },
      visualId: 'turret.sun_mirror', nameKey: 'card.sun_mirror.name', descKey: 'card.sun_mirror.desc',
    },
    {
      // 95 splash r50 / 4.5 s, range 480 (min 150), arc
      id: 'onager', kind: 'turret', age: 'bronze', rarity: 'rare', cost: 250,
      attack: {
        damage: 95, intervalMs: 4500, windupPct: 0, range: 480, minRange: 150, hitsGround: true, hitsAir: false,
        projectile: { speed: 450, arc: true, visualId: 'proj.boulder' },
        dmgType: 'blast', sfx: 'shot_catapult', splashRadius: 50,
      },
      visualId: 'turret.onager', nameKey: 'card.onager.name', descKey: 'card.onager.desc',
    },
    {
      // Priority armored. Stone Gaze: 55 damage and a 1.5 s stun on the target (existing stun status)
      id: 'gorgon_bust', kind: 'turret', age: 'bronze', rarity: 'epic', cost: 250,
      attack: {
        damage: 55, intervalMs: 6000, windupPct: 0, range: 380, hitsGround: true, hitsAir: true,
        projectile: { instant: true, effectId: 'fx.gorgon_gaze' },
        dmgType: 'laser', sfx: 'gorgon_gaze', priority: 'armored',
        onHit: [{ kind: 'stun', magnitudeBp: 10000, durationMs: 1500 }],
      },
      visualId: 'turret.gorgon_bust', nameKey: 'card.gorgon_bust.name', descKey: 'card.gorgon_bust.desc',
    },
  ],
};

/** A17.11 Bronze Age Powers (values at P 1.16 and L1 loadouts; every power has a 1.0 s telegraph). */
export const bronzePowers: readonly WithAge<PowerDef>[] = [
  {
    // A wave sweeps a 450 lu zone over 2.0 s, dealing 130 once to each ground enemy it touches (±20 lu).
    // Per unit 130: 70% / 21% (Hoplite / War Chariot)
    id: 'tidal_wave', kind: 'power', age: 'bronze', slot: 'default', telegraphMs: 1000,
    effect: { kind: 'sweep', zone: 450, durationMs: 2000, damage: 130, width: 40, hitsAir: false },
    visualId: 'power.tidal_wave', sfx: 'pw_wave', nameKey: 'card.tidal_wave.name', descKey: 'card.tidal_wave.desc',
  },
  {
    // Road 200. All your units get an 80 shield and +15% damage for 6 s (no zone)
    id: 'aegis', kind: 'power', age: 'bronze', slot: 'alternate', telegraphMs: 1000,
    effect: {
      kind: 'buffAll',
      statuses: [
        { kind: 'shield', magnitudeBp: 0, durationMs: 6000, amount: 80 },
        { kind: 'damageBuff', magnitudeBp: 1500, durationMs: 6000 },
      ],
    },
    visualId: 'power.aegis', sfx: 'pw_aegis', nameKey: 'card.aegis.name', descKey: 'card.aegis.desc',
  },
];
