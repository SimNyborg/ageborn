/**
 * Industrial Age (P 2.12): docs/design-lane-ages.md A17.10 units, turrets and powers (to be merged into
 * DESIGN as A5.x), A17.12 attack mapping. Steam, rivets and the first electric light; no gas weapons.
 * Table units: HP and damage whole, ms, lu, lu/s, gold, bp. Data only. `strongVs`/`weakVs` are
 * filled by the WP1 counter matrix (B4).
 *
 * The age's P, base HP and threshold live in `economy.ts` (`ageScale`, A17.8).
 */
import type { PowerDef } from '@/contracts/content';
import { damageMods } from './economy';
import type { RawAgeTables } from './types';

export const industrial: RawAgeTables = {
  age: 'industrial',
  units: [
    {
      // Blunt. Big Wrench: the first hit of each engagement deals ×1.5 (no knockback)
      id: 'riveter', kind: 'unit', age: 'industrial', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 50, trainMs: 1500, pop: 2, hp: 330, speed: 72, size: 'small',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 42, intervalMs: 1000, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'blunt', sfx: 'swing_whoosh', mods: damageMods.blunt,
        },
      ],
      abilities: [{ kind: 'firstHitBonus', multBp: 15000, knockback: 0, idleResetMs: 2000 }],
      visualId: 'unit.riveter', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.riveter.name', descKey: 'card.riveter.desc', strongVs: [], weakVs: [],
    },
    {
      // Carbine bullet
      id: 'carbineer', kind: 'unit', age: 'industrial', rarity: 'common', role: 'ranged', group: 'ranged',
      cost: 75, trainMs: 2000, pop: 3, hp: 201, speed: 65, size: 'small',
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 33, intervalMs: 1200, windupPct: 50, range: 250, hitsGround: true, hitsAir: true,
          projectile: { speed: 1500, visualId: 'proj.bullet' },
          dmgType: 'bullet', sfx: 'shot_carbine',
        },
      ],
      abilities: [],
      visualId: 'unit.carbineer', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.carbineer.name', descKey: 'card.carbineer.desc', strongVs: [], weakVs: [],
    },
    {
      // Piston Punch: first hit ×2 and 30 lu knockback. The first Common Heavy with the mech tag
      id: 'steam_golem', kind: 'unit', age: 'industrial', rarity: 'common', role: 'heavy', group: 'heavy',
      cost: 150, trainMs: 4000, pop: 6, hp: 1187, speed: 55, size: 'large',
      tags: ['armored', 'mech', 'melee', 'ground'],
      attacks: [
        {
          damage: 89, intervalMs: 1500, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'blunt', sfx: 'swing_whoosh',
        },
      ],
      abilities: [{ kind: 'firstHitBonus', multBp: 20000, knockback: 30, idleResetMs: 2000 }],
      visualId: 'unit.steam_golem', sfx: { spawn: 'spawn_heavy', die: 'die_mech' },
      nameKey: 'card.steam_golem.name', descKey: 'card.steam_golem.desc', strongVs: [], weakVs: [],
    },
    {
      // Harpoon; ranged AA mods; priority armored.
      // Reel In: the first hit of each engagement pulls the target 25 lu toward the gunner (no damage bonus)
      id: 'harpoon_gunner', kind: 'unit', age: 'industrial', rarity: 'rare', role: 'antiArmor', group: 'antiArmor',
      cost: 100, trainMs: 2500, pop: 4, hp: 260, speed: 65, size: 'medium',
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 55, intervalMs: 1200, windupPct: 50, range: 210, hitsGround: true, hitsAir: true,
          projectile: { speed: 900, visualId: 'proj.harpoon' },
          dmgType: 'pierce', sfx: 'shot_harpoon', mods: damageMods.rangedAntiArmor, priority: 'armored',
        },
      ],
      abilities: [{ kind: 'firstHitBonus', multBp: 10000, knockback: -25, idleResetMs: 2000 }],
      visualId: 'unit.harpoon_gunner', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.harpoon_gunner.name', descKey: 'card.harpoon_gunner.desc', strongVs: [], weakVs: [],
    },
    {
      // Flare pistol, priority armored: every hit marks the target (+20% damage taken from all sources) for 3 s;
      // followSupport
      id: 'flare_spotter', kind: 'unit', age: 'industrial', rarity: 'rare', role: 'support', group: 'support',
      cost: 110, trainMs: 3000, pop: 4, hp: 276, speed: 65, size: 'small',
      tags: ['light', 'bio', 'support', 'ranged', 'ground'],
      attacks: [
        {
          damage: 17, intervalMs: 1200, windupPct: 50, range: 200, hitsGround: true, hitsAir: true,
          projectile: { speed: 900, visualId: 'proj.flare' },
          dmgType: 'blast', sfx: 'flare_pop', priority: 'armored',
          onHit: [{ kind: 'mark', magnitudeBp: 2000, durationMs: 3000 }],
        },
      ],
      abilities: [{ kind: 'followSupport', behindFront: 60, soloMaxP: 200 }],
      visualId: 'unit.flare_spotter', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.flare_spotter.name', descKey: 'card.flare_spotter.desc', strongVs: [], weakVs: [],
    },
    {
      // 240 vs base / 2.0 s (12 vs units). siegeOnly: runs for the base; attacks units only while blocked.
      // Short Fuse: on death the charge goes off for 180 splash r60 on ground enemies (never the base)
      id: 'sapper', kind: 'unit', age: 'industrial', rarity: 'epic', role: 'siege', group: 'epic',
      cost: 200, trainMs: 4000, pop: 8, hp: 560, speed: 85, size: 'medium',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 12, vsBaseDamage: 240, intervalMs: 2000, windupPct: 40, range: 12, hitsGround: true, hitsAir: false,
          dmgType: 'blast', sfx: 'fuse_hiss',
        },
      ],
      abilities: [{ kind: 'siegeOnly' }, { kind: 'onDeathExplode', damage: 180, radius: 60 }],
      visualId: 'unit.sapper', sfx: { spawn: 'spawn_heavy', die: 'die_bio' },
      nameKey: 'card.sapper.name', descKey: 'card.sapper.desc', strongVs: [], weakVs: [],
    },
    {
      // Main gun 130 splash r40 / 2.2 s at range 160 (G). Two sponson gunners (riders) each shoot 10 / 0.5 s
      // at range 160 (G+A); on death the crew bails out as 2 Carbineers (summoned)
      id: 'land_dreadnought', kind: 'unit', age: 'industrial', rarity: 'legendary', role: 'siegeHeavy', group: 'legendary',
      cost: 350, trainMs: 7000, pop: 14, hp: 3600, speed: 35, size: 'huge',
      tags: ['armored', 'mech', 'ranged', 'legendary', 'ground'],
      attacks: [
        {
          damage: 130, intervalMs: 2200, windupPct: 50, range: 160, hitsGround: true, hitsAir: false,
          projectile: { speed: 1200, visualId: 'proj.shell' },
          dmgType: 'blast', sfx: 'shot_cannon', splashRadius: 40,
        },
      ],
      abilities: [
        {
          kind: 'riders',
          count: 2,
          attack: {
            damage: 10, intervalMs: 500, windupPct: 50, range: 160, hitsGround: true, hitsAir: true,
            projectile: { speed: 1500, visualId: 'proj.bullet' },
            dmgType: 'bullet', sfx: 'shot_gatling',
          },
          onDeathSpawn: 'carbineer',
        },
      ],
      visualId: 'unit.land_dreadnought', sfx: { spawn: 'spawn_legendary', die: 'die_mech' },
      nameKey: 'card.land_dreadnought.name', descKey: 'card.land_dreadnought.desc', strongVs: [], weakVs: [],
    },
  ],
  turrets: [
    {
      // Single target, rapid fire
      id: 'gatling_gun', kind: 'turret', age: 'industrial', rarity: 'common', cost: 150,
      attack: {
        damage: 13, intervalMs: 300, windupPct: 0, range: 350, hitsGround: true, hitsAir: true,
        projectile: { speed: 1500, visualId: 'proj.bullet' },
        dmgType: 'bullet', sfx: 'shot_gatling',
      },
      visualId: 'turret.gatling_gun', nameKey: 'card.gatling_gun.name', descKey: 'card.gatling_gun.desc',
    },
    {
      // 68 splash r40 / 2.0 s, range 300 (min 60), arc; ground only. Short-range swarm breaker
      id: 'mortar_pit', kind: 'turret', age: 'industrial', rarity: 'common', cost: 175,
      attack: {
        damage: 68, intervalMs: 2000, windupPct: 0, range: 300, minRange: 60, hitsGround: true, hitsAir: false,
        projectile: { speed: 450, arc: true, visualId: 'proj.lob' },
        dmgType: 'blast', sfx: 'shot_lob', splashRadius: 40,
      },
      visualId: 'turret.mortar_pit', nameKey: 'card.mortar_pit.name', descKey: 'card.mortar_pit.desc',
    },
    {
      // 172 splash r55 / 5.0 s, range 480 (min 170), arc
      id: 'boiler_mortar', kind: 'turret', age: 'industrial', rarity: 'rare', cost: 250,
      attack: {
        damage: 172, intervalMs: 5000, windupPct: 0, range: 480, minRange: 170, hitsGround: true, hitsAir: false,
        projectile: { speed: 450, arc: true, visualId: 'proj.shell' },
        dmgType: 'blast', sfx: 'shot_cannon', splashRadius: 55,
      },
      visualId: 'turret.boiler_mortar', nameKey: 'card.boiler_mortar.name', descKey: 'card.boiler_mortar.desc',
    },
    {
      // Lightning chains to 4 targets total (each ≤ 90 lu from the previous); every target hit is stunned 0.5 s
      id: 'tesla_tower', kind: 'turret', age: 'industrial', rarity: 'epic', cost: 250,
      attack: {
        damage: 130, intervalMs: 4500, windupPct: 0, range: 380, hitsGround: true, hitsAir: true,
        projectile: { instant: true, effectId: 'fx.tesla_arc' },
        dmgType: 'laser', sfx: 'tesla_zap', chain: { count: 4, hop: 90 },
        onHit: [{ kind: 'stun', magnitudeBp: 10000, durationMs: 500 }],
      },
      visualId: 'turret.tesla_tower', nameKey: 'card.tesla_tower.name', descKey: 'card.tesla_tower.desc',
    },
  ],
};

/** A17.11 Industrial Age Powers (values at P 2.12 and L1 loadouts; every power has a 1.0 s telegraph). */
export const industrialPowers: readonly PowerDef[] = [
  {
    // 3 runaway armoured engines, 0.5 s apart, run 600 lu forward at 450 lu/s from your frontmost unit
    // (or p = 200); 150 damage and 50 lu knockback per hit; max 2 hits per enemy per cast; ground only.
    // Per unit ≤ 300: 91% / 25% (Riveter / Steam Golem)
    id: 'iron_horse', kind: 'power', age: 'industrial', slot: 'default', telegraphMs: 1000,
    effect: {
      kind: 'stampede', runners: 3, spacingMs: 500, distance: 600, speed: 450,
      damage: 150, knockback: 50, maxHitsPerEnemy: 2,
    },
    visualId: 'power.iron_horse', sfx: 'pw_iron_horse', nameKey: 'card.iron_horse.name', descKey: 'card.iron_horse.desc',
  },
  {
    // Road 350. 10 bombs along a 480 lu line over 2.0 s (line pattern, no jitter); each 150 damage,
    // splash r45; ground only. Per unit ~281: 85% / 24%
    id: 'zeppelin_raid', kind: 'power', age: 'industrial', slot: 'alternate', telegraphMs: 1000,
    effect: {
      kind: 'barrage', count: 10, durationMs: 2000, zone: 480, damage: 150, radius: 45,
      jitter: 0, hitsAir: false, pattern: 'line',
    },
    visualId: 'power.zeppelin_raid', sfx: 'pw_zeppelin', nameKey: 'card.zeppelin_raid.name', descKey: 'card.zeppelin_raid.desc',
  },
];
