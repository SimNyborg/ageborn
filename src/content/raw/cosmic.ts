/**
 * Cosmic Age (P 4.48): docs/design-lane-ages.md A17.11 units, turrets and powers (to be merged into
 * DESIGN as A5.x), A17.12 attack mapping. The last age of Full War. Table units: HP and damage whole,
 * ms, lu, lu/s, gold, bp. Data only. `strongVs`/`weakVs` are filled by the WP1 counter matrix (B4).
 *
 * The age's P, base HP and threshold live in `economy.ts` (`ageScale`, A17.8).
 */
import type { PowerDef } from '@/contracts/content';
import { damageMods } from './economy';
import type { RawAgeTables } from './types';

export const cosmic: RawAgeTables = {
  age: 'cosmic',
  units: [
    {
      // Blunt. Deflector: takes 20% less damage from attacks with range ≥ 100 (not powers), as Shield Wall
      id: 'star_legionnaire', kind: 'unit', age: 'cosmic', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 50, trainMs: 1500, pop: 2, hp: 700, speed: 75, size: 'small',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 90, intervalMs: 1000, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'laser', sfx: 'swing_whoosh', mods: damageMods.blunt,
        },
      ],
      // bp is the share of damage resisted (20%), as Footman's Shield Wall
      abilities: [{ kind: 'resist', minSourceRange: 100, bp: 2000 }],
      visualId: 'unit.star_legionnaire', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.star_legionnaire.name', descKey: 'card.star_legionnaire.desc', strongVs: [], weakVs: [],
    },
    {
      // Ion bolt. Arc: the bolt jumps to 1 more enemy within 50 lu (chain, 2 targets total), as Ricochet
      id: 'ion_ranger', kind: 'unit', age: 'cosmic', rarity: 'common', role: 'ranged', group: 'ranged',
      cost: 75, trainMs: 2000, pop: 3, hp: 426, speed: 65, size: 'small',
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 54, intervalMs: 1000, windupPct: 50, range: 270, hitsGround: true, hitsAir: true,
          projectile: { speed: 1800, visualId: 'proj.ion' },
          dmgType: 'laser', sfx: 'shot_ion', chain: { count: 2, hop: 50 },
        },
      ],
      abilities: [],
      visualId: 'unit.ion_ranger', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.ion_ranger.name', descKey: 'card.ion_ranger.desc', strongVs: [], weakVs: [],
    },
    {
      // Plasma cannon at range 90; hovers (still a ground unit: it blocks and is blocked)
      id: 'hover_tank', kind: 'unit', age: 'cosmic', rarity: 'common', role: 'heavy', group: 'heavy',
      cost: 150, trainMs: 4000, pop: 6, hp: 2509, speed: 55, size: 'large',
      tags: ['armored', 'mech', 'ranged', 'ground'],
      attacks: [
        {
          damage: 188, intervalMs: 1500, windupPct: 50, range: 90, hitsGround: true, hitsAir: false,
          projectile: { speed: 1800, visualId: 'proj.plasma' },
          dmgType: 'blast', sfx: 'shot_plasma',
        },
      ],
      abilities: [],
      visualId: 'unit.hover_tank', sfx: { spawn: 'spawn_heavy', die: 'die_mech' },
      nameKey: 'card.hover_tank.name', descKey: 'card.hover_tank.desc', strongVs: [], weakVs: [],
    },
    {
      // Reach 70; melee AA mods; priority armored; Brace (immune to knockback and to first-hit bonuses)
      id: 'graviton_halberdier', kind: 'unit', age: 'cosmic', rarity: 'rare', role: 'antiArmor', group: 'antiArmor',
      cost: 100, trainMs: 2500, pop: 4, hp: 896, speed: 70, size: 'medium',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 116, intervalMs: 1200, windupPct: 40, range: 70, hitsGround: true, hitsAir: false,
          dmgType: 'laser', sfx: 'swing_whoosh', mods: damageMods.meleeAntiArmor, priority: 'armored',
        },
      ],
      abilities: [{ kind: 'brace' }],
      visualId: 'unit.graviton_halberdier', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.graviton_halberdier.name', descKey: 'card.graviton_halberdier.desc', strongVs: [], weakVs: [],
    },
    {
      // Shield Beacon every 8 s while it has a target: the nearest 4 allies within 180 lu get a 200 shield
      // for 5 s (the Roar pattern); followSupport
      id: 'starwarden', kind: 'unit', age: 'cosmic', rarity: 'rare', role: 'support', group: 'support',
      cost: 110, trainMs: 3000, pop: 4, hp: 582, speed: 65, size: 'small',
      tags: ['light', 'bio', 'support', 'ranged', 'ground'],
      attacks: [
        {
          damage: 36, intervalMs: 1200, windupPct: 50, range: 150, hitsGround: true, hitsAir: true,
          projectile: { speed: 1800, visualId: 'proj.ion' },
          dmgType: 'laser', sfx: 'shot_ion',
        },
      ],
      abilities: [
        { kind: 'periodicShieldAura', everyMs: 8000, radius: 180, maxTargets: 4, shield: 200, durationMs: 5000 },
        { kind: 'followSupport', behindFront: 60, soloMaxP: 200 },
      ],
      visualId: 'unit.starwarden', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.starwarden.name', descKey: 'card.starwarden.desc', strongVs: [], weakVs: [],
    },
    {
      // Blink (10 s cooldown): when blocked, warps (0.4 s, untargetable by melee) to the nearest enemy ranged
      // or support unit within 200 lu beyond the blocker; first strike ×2. The Sabertooth pounce rule
      id: 'warp_stalker', kind: 'unit', age: 'cosmic', rarity: 'epic', role: 'skirmisher', group: 'epic',
      cost: 200, trainMs: 4000, pop: 8, hp: 1600, speed: 100, size: 'medium',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 140, intervalMs: 800, windupPct: 40, range: 12, hitsGround: true, hitsAir: false,
          dmgType: 'slash', sfx: 'swing_whoosh',
        },
      ],
      abilities: [{ kind: 'pounce', searchRange: 200, cooldownMs: 10000, leapMs: 400, firstBiteBp: 20000 }],
      visualId: 'unit.warp_stalker', sfx: { spawn: 'spawn_heavy', die: 'die_bio' },
      nameKey: 'card.warp_stalker.name', descKey: 'card.warp_stalker.desc', strongVs: [], weakVs: [],
    },
    {
      // Air gunship (obeys stance). Beam 80 / 0.6 s at range 180 (G+A). Drone Strike every 6 s: a strike on
      // the nearest enemy ground unit within 400 lu lands after 1.0 s for 300 splash r50 (area rule; one
      // call-in per side per 3 s, shared with the Radio Operator). On death crashes for 350 splash r80
      id: 'mothership', kind: 'unit', age: 'cosmic', rarity: 'legendary', role: 'airGunship', group: 'legendary',
      cost: 350, trainMs: 7000, pop: 14, hp: 3700, speed: 40, size: 'huge',
      tags: ['air', 'mech', 'legendary'],
      attacks: [
        {
          damage: 80, intervalMs: 600, windupPct: 50, range: 180, hitsGround: true, hitsAir: true,
          projectile: { instant: true, effectId: 'fx.beam_void' },
          dmgType: 'laser', sfx: 'shot_void',
        },
      ],
      abilities: [
        { kind: 'callStrike', everyMs: 6000, searchRange: 400, delayMs: 1000, damage: 300, radius: 50, sideLockoutMs: 3000 },
        { kind: 'onDeathExplode', damage: 350, radius: 80 },
      ],
      visualId: 'unit.mothership', sfx: { spawn: 'spawn_legendary', die: 'die_mech' },
      nameKey: 'card.mothership.name', descKey: 'card.mothership.desc', strongVs: [], weakVs: [],
    },
  ],
  turrets: [
    {
      // Instant beam, single target
      id: 'ion_turret', kind: 'turret', age: 'cosmic', rarity: 'common', cost: 150,
      attack: {
        damage: 27, intervalMs: 300, windupPct: 0, range: 370, hitsGround: true, hitsAir: true,
        projectile: { instant: true, effectId: 'fx.beam_ion' },
        dmgType: 'laser', sfx: 'shot_ion',
      },
      visualId: 'turret.ion_turret', nameKey: 'card.ion_turret.name', descKey: 'card.ion_turret.desc',
    },
    {
      // Hits the frontmost enemy in range and enemies within 90 lu behind it; max 4 targets (Grapeshot rule)
      id: 'starburst_gun', kind: 'turret', age: 'cosmic', rarity: 'common', cost: 175,
      attack: {
        damage: 123, intervalMs: 2000, windupPct: 0, range: 240, hitsGround: true, hitsAir: true,
        projectile: { speed: 1800, visualId: 'proj.starburst' },
        dmgType: 'laser', sfx: 'shot_starburst', followBehind: 90, maxTargets: 4,
      },
      visualId: 'turret.starburst_gun', nameKey: 'card.starburst_gun.name', descKey: 'card.starburst_gun.desc',
    },
    {
      // 363 splash r60 / 5.0 s, range 480 (min 180), arc
      id: 'starfall_battery', kind: 'turret', age: 'cosmic', rarity: 'rare', cost: 250,
      attack: {
        damage: 363, intervalMs: 5000, windupPct: 0, range: 480, minRange: 180, hitsGround: true, hitsAir: false,
        projectile: { speed: 450, arc: true, visualId: 'proj.star_shard' },
        dmgType: 'blast', sfx: 'shot_plasma', splashRadius: 60,
      },
      visualId: 'turret.starfall_battery', nameKey: 'card.starfall_battery.name', descKey: 'card.starfall_battery.desc',
    },
    {
      // Instant lance; pierces 4 targets total within 250 lu, starting at the target (Chainshot rule); hits air
      id: 'tachyon_lance', kind: 'turret', age: 'cosmic', rarity: 'epic', cost: 250,
      attack: {
        damage: 184, intervalMs: 4000, windupPct: 0, range: 420, hitsGround: true, hitsAir: true,
        projectile: { instant: true, effectId: 'fx.beam_tachyon' },
        dmgType: 'laser', sfx: 'shot_tachyon', pierce: { count: 4, length: 250 },
      },
      visualId: 'turret.tachyon_lance', nameKey: 'card.tachyon_lance.name', descKey: 'card.tachyon_lance.desc',
    },
  ],
};

/** A17.11 Cosmic Age Powers (values at P 4.48 and L1 loadouts; every power has a 1.0 s telegraph). */
export const cosmicPowers: readonly PowerDef[] = [
  {
    // 6 star shards over 2.0 s across a 450 lu zone (even pattern, ±20 lu jitter); each 380 damage,
    // splash r60; hits air. Per unit ~608: 87% / 24% (Star Legionnaire / Hover Tank)
    id: 'starfall', kind: 'power', age: 'cosmic', slot: 'default', telegraphMs: 1000,
    effect: {
      kind: 'barrage', count: 6, durationMs: 2000, zone: 450, damage: 380, radius: 60,
      jitter: 20, hitsAir: true, pattern: 'even',
    },
    visualId: 'power.starfall', sfx: 'pw_starfall', nameKey: 'card.starfall.name', descKey: 'card.starfall.desc',
  },
  {
    // Road 500. 3 Star Legionnaires at your Star Legionnaire level warp in 150 lu beyond the enemy's
    // frontmost ground unit (clamped by `economy.powerZoneClamp`; p = mid-lane, 1,000 on the A17 lane, if the
    // enemy has no ground units); summoned, no pop, no bounty (the Paratroopers rule)
    id: 'warp_strike', kind: 'power', age: 'cosmic', slot: 'alternate', telegraphMs: 1000,
    effect: { kind: 'paradrop', card: 'star_legionnaire', count: 3, beyondFront: 150, fallbackP: 1000 },
    visualId: 'power.warp_strike', sfx: 'pw_warp', nameKey: 'card.warp_strike.name', descKey: 'card.warp_strike.desc',
  },
];
