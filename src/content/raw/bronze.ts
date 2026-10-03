/**
 * Bronze Age (P 1.16): docs/design-lane-ages.md A17.9 units, turrets and powers (to be merged into
 * DESIGN as A5.x), A17.12 attack mapping. Table units: HP and damage whole, ms, lu, lu/s, gold, bp.
 * Data only. `strongVs`/`weakVs` are filled by the WP1 counter matrix (B4).
 *
 * The age's P, base HP and threshold live in `economy.ts` (`ageScale`, A17.8).
 */
import type { PowerDef } from '@/contracts/content';
import { damageMods } from './economy';
import { FORT_COST, camp, slow, tower, trap, wall } from './fortKit';
import type { RawAgeTables } from './types';

export const bronze: RawAgeTables = {
  age: 'bronze',
  units: [
    {
      // Blunt. Shield Bash: the first hit of each engagement knocks the target back 15 lu (no damage bonus)
      id: 'hoplite', kind: 'unit', age: 'bronze', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 50, trainMs: 1500, pop: 2, hp: 186, speed: 70, size: 'small', starter: true,
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
      cost: 75, trainMs: 2000, pop: 3, hp: 110, speed: 65, size: 'small', starter: true,
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
      cost: 150, trainMs: 4000, pop: 6, hp: 630, speed: 65, size: 'large', starter: true,
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
      cost: 100, trainMs: 2500, pop: 4, hp: 255, speed: 70, size: 'medium', starter: true,
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 30, intervalMs: 1200, windupPct: 40, range: 65, hitsGround: true, hitsAir: false,
          dmgType: 'pierce', sfx: 'swing_whoosh', mods: damageMods.meleeAntiArmor, priority: 'armored',
        },
      ],
      abilities: [{ kind: 'brace' }],
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
      // Molten Heart: on death bursts for 100 splash r70 on ground enemies
      id: 'bronze_colossus', kind: 'unit', age: 'bronze', rarity: 'legendary', role: 'siegeHeavy', group: 'legendary',
      cost: 350, trainMs: 7000, pop: 14, hp: 1700, speed: 40, size: 'huge',
      tags: ['armored', 'mech', 'melee', 'legendary', 'ground'],
      attacks: [
        {
          damage: 64, intervalMs: 2000, windupPct: 40, range: 20, hitsGround: true, hitsAir: false,
          dmgType: 'blast', sfx: 'stomp_colossus', splashRadius: 45,
          onHit: [{ kind: 'slow', magnitudeBp: 2000, durationMs: 1500 }],
        },
      ],
      abilities: [{ kind: 'onDeathExplode', damage: 100, radius: 70 }],
      visualId: 'unit.bronze_colossus', sfx: { spawn: 'spawn_legendary', die: 'die_mech' },
      nameKey: 'card.bronze_colossus.name', descKey: 'card.bronze_colossus.desc', strongVs: [], weakVs: [],
    },
    // W2 Bronze wave (CONTENT_PLAN 5.2). Release gate: every card of this wave is `released: false` (hidden
    // from players and bots) until its art and sounds ship; the wave flips each card when its art lands.
    {
      // Guard: 25% less damage from attacks with range ≥ 100 (not powers); Blunt
      id: 'shield_bearer', released: false, kind: 'unit', age: 'bronze', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 50, trainMs: 1500, pop: 2, hp: 251, speed: 65, size: 'small',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 16, intervalMs: 1000, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'slash', sfx: 'kopis_hack', mods: damageMods.blunt,
        },
      ],
      abilities: [{ kind: 'resist', minSourceRange: 100, bp: 2500 }],
      visualId: 'unit.shield_bearer', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.shield_bearer.name', descKey: 'card.shield_bearer.desc', strongVs: [], weakVs: [],
    },
    {
      // Raider: fast; 41 to bases (×2)
      id: 'thracian_raider', released: false, kind: 'unit', age: 'bronze', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 50, trainMs: 1500, pop: 2, hp: 235, speed: 90, size: 'small',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 23, intervalMs: 1000, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'slash', sfx: 'rhomphaia_cut', vsBaseDamage: 41,
        },
      ],
      abilities: [],
      visualId: 'unit.thracian_raider', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.thracian_raider.name', descKey: 'card.thracian_raider.desc', strongVs: [], weakVs: [],
    },
    {
      // Trio (X0 M1): one card trains 3 slingers; stats per slinger (0.40 × Javelineer), cost and pop split evenly
      id: 'rhodian_slingers', released: false, kind: 'unit', age: 'bronze', rarity: 'common', role: 'ranged', group: 'ranged',
      cost: 75, trainMs: 2000, pop: 3, hp: 38, speed: 65, size: 'small',
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 8, intervalMs: 1700, windupPct: 50, range: 180, hitsGround: true, hitsAir: true,
          projectile: { speed: 500, visualId: 'proj.rock' },
          dmgType: 'blunt', sfx: 'shot_sling',
        },
      ],
      abilities: [],
      squad: { count: 3 },
      visualId: 'unit.rhodian_slingers', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.rhodian_slingers.name', descKey: 'card.rhodian_slingers.desc', strongVs: [], weakVs: [],
    },
    {
      // Discus: the discus skips to a second target within 50 lu (the second takes 50%, A2.6)
      id: 'discus_thrower', released: false, kind: 'unit', age: 'bronze', rarity: 'common', role: 'ranged', group: 'ranged',
      cost: 75, trainMs: 2000, pop: 3, hp: 110, speed: 65, size: 'small',
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 17, intervalMs: 1600, windupPct: 50, range: 200, hitsGround: true, hitsAir: true,
          projectile: { speed: 550, visualId: 'proj.discus' },
          dmgType: 'blunt', sfx: 'shot_discus', chain: { count: 2, hop: 50 },
        },
      ],
      abilities: [],
      visualId: 'unit.discus_thrower', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.discus_thrower.name', descKey: 'card.discus_thrower.desc', strongVs: [], weakVs: [],
    },
    {
      // Brute: trunk lash and forefoot stomp, cleave 2 (reach 30); no charge bonus
      id: 'war_elephant', released: false, kind: 'unit', age: 'bronze', rarity: 'common', role: 'heavy', group: 'heavy',
      cost: 150, trainMs: 4000, pop: 6, hp: 725, speed: 60, size: 'large',
      tags: ['armored', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 42, intervalMs: 1700, windupPct: 40, range: 20, hitsGround: true, hitsAir: false,
          dmgType: 'blunt', sfx: 'trunk_lash', cleave: { count: 2, reach: 30 },
        },
      ],
      abilities: [],
      visualId: 'unit.war_elephant', sfx: { spawn: 'spawn_heavy', die: 'die_bio' },
      nameKey: 'card.war_elephant.name', descKey: 'card.war_elephant.desc', strongVs: [], weakVs: [],
    },
    {
      // Long range (H6, A5.1): an arcing arrow at the target's spot, splash r35; range 330, min 90; half to bases; ground only
      id: 'cretan_archer', released: false, kind: 'unit', age: 'bronze', rarity: 'rare', role: 'ranged', group: 'ranged',
      cost: 75, trainMs: 2000, pop: 3, hp: 99, speed: 60, size: 'small',
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 39, intervalMs: 2400, windupPct: 50, range: 330, minRange: 90, hitsGround: true, hitsAir: false,
          projectile: { speed: 300, arc: true, visualId: 'proj.arrow_arc' },
          dmgType: 'pierce', sfx: 'shot_bow', splashRadius: 35, vsBaseDamage: 19,
        },
      ],
      abilities: [],
      visualId: 'unit.cretan_archer', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.cretan_archer.name', descKey: 'card.cretan_archer.desc', strongVs: [], weakVs: [],
    },
    {
      // Ranged Anti-heavy: range 200, 40 / 1.5 s; ranged AA mods (armored and mech ×3, Legendary ×2, light ×0.5); Brace; priority armored
      id: 'belly_bowman', released: false, kind: 'unit', age: 'bronze', rarity: 'rare', role: 'antiArmor', group: 'antiArmor',
      cost: 100, trainMs: 2500, pop: 4, hp: 220, speed: 65, size: 'medium',
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 40, intervalMs: 1200, windupPct: 50, range: 200, hitsGround: true, hitsAir: false,
          projectile: { speed: 700, visualId: 'proj.bolt' },
          dmgType: 'pierce', sfx: 'shot_belly_bow', mods: damageMods.rangedAntiArmor, priority: 'armored',
        },
      ],
      abilities: [{ kind: 'brace' }],
      visualId: 'unit.belly_bowman', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.belly_bowman.name', descKey: 'card.belly_bowman.desc', strongVs: [], weakVs: [],
    },
    {
      // Aura: allies within 160 lu move 15% faster (Bronze wave ally speed aura); a sharp note pops on the target; followSupport
      id: 'aulos_piper', released: false, kind: 'unit', age: 'bronze', rarity: 'rare', role: 'support', group: 'support',
      cost: 110, trainMs: 3000, pop: 4, hp: 151, speed: 65, size: 'small',
      tags: ['light', 'bio', 'support', 'ranged', 'ground'],
      attacks: [
        {
          damage: 9, intervalMs: 1200, windupPct: 50, range: 150, hitsGround: true, hitsAir: true,
          projectile: { instant: true, effectId: 'fx.note_pop' },
          dmgType: 'blunt', sfx: 'aulos_note',
        },
      ],
      abilities: [
        { kind: 'aura', radius: 160, status: { kind: 'speedBuff', magnitudeBp: 1500, durationMs: 0 } },
        { kind: 'followSupport', behindFront: 60, soloMaxP: 200 },
      ],
      visualId: 'unit.aulos_piper', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.aulos_piper.name', descKey: 'card.aulos_piper.desc', strongVs: [], weakVs: [],
    },
    {
      // Dread (Bronze wave M4): enemy ground units within 130 lu move 20% slower; a sonic wail; followSupport
      id: 'tragic_chorus', released: false, kind: 'unit', age: 'bronze', rarity: 'rare', role: 'support', group: 'support',
      cost: 110, trainMs: 3000, pop: 4, hp: 166, speed: 60, size: 'small',
      tags: ['light', 'bio', 'support', 'ranged', 'ground'],
      attacks: [
        {
          damage: 9, intervalMs: 1200, windupPct: 50, range: 150, hitsGround: true, hitsAir: true,
          projectile: { instant: true, effectId: 'fx.wail_ring' },
          dmgType: 'blunt', sfx: 'chorus_wail',
        },
      ],
      abilities: [
        { kind: 'aura', radius: 130, status: { kind: 'slow', magnitudeBp: 2000, durationMs: 0 }, foe: true },
        { kind: 'followSupport', behindFront: 60, soloMaxP: 200 },
      ],
      visualId: 'unit.tragic_chorus', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.tragic_chorus.name', descKey: 'card.tragic_chorus.desc', strongVs: [], weakVs: [],
    },
    {
      // Siege (siegeOnly + riders): head-ram 140 to bases / 2.0 s, 12 to units while blocked; 2 spearmen poke from
      // the hatches (6 / 1.2 s, range 40); when it falls, 2 Hoplites jump out (summoned)
      id: 'wooden_horse', released: false, kind: 'unit', age: 'bronze', rarity: 'epic', role: 'siege', group: 'epic',
      cost: 200, trainMs: 4000, pop: 8, hp: 800, speed: 45, size: 'large',
      tags: ['armored', 'mech', 'melee', 'ground'],
      attacks: [
        {
          damage: 12, vsBaseDamage: 140, intervalMs: 2000, windupPct: 40, range: 12, hitsGround: true, hitsAir: false,
          dmgType: 'blast', sfx: 'horse_ram',
        },
      ],
      abilities: [
        { kind: 'siegeOnly' },
        {
          kind: 'riders', count: 2, onDeathSpawn: 'hoplite',
          attack: {
            damage: 6, intervalMs: 1200, windupPct: 40, range: 40, hitsGround: true, hitsAir: false,
            dmgType: 'pierce', sfx: 'swing_whoosh',
          },
        },
      ],
      visualId: 'unit.wooden_horse', sfx: { spawn: 'spawn_heavy', die: 'die_mech' },
      nameKey: 'card.wooden_horse.name', descKey: 'card.wooden_horse.desc', strongVs: [], weakVs: [],
    },
    {
      // Skirmisher: Pounce (12 s cooldown): when blocked, rides (0.5 s) around the blocker to the nearest enemy ranged
      // or support unit within 180 lu; first strike ×2
      id: 'amazon_rider', released: false, kind: 'unit', age: 'bronze', rarity: 'epic', role: 'skirmisher', group: 'epic',
      cost: 200, trainMs: 4000, pop: 8, hp: 500, speed: 95, size: 'large',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 40, intervalMs: 900, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'slash', sfx: 'sagaris_sweep',
        },
      ],
      abilities: [{ kind: 'pounce', searchRange: 180, cooldownMs: 12000, leapMs: 500, firstBiteBp: 20000 }],
      visualId: 'unit.amazon_rider', sfx: { spawn: 'spawn_heavy', die: 'die_bio' },
      nameKey: 'card.amazon_rider.name', descKey: 'card.amazon_rider.desc', strongVs: [], weakVs: [],
    },
    {
      // Brawler: horn charge, first hit ×2 and 40 lu knockback; Frenzy (X0 M2) below 50% HP: +30% damage, +20% attack speed
      id: 'minotaur', released: false, kind: 'unit', age: 'bronze', rarity: 'epic', role: 'heavy', group: 'epic',
      cost: 200, trainMs: 4000, pop: 8, hp: 880, speed: 60, size: 'large',
      tags: ['armored', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 46, intervalMs: 1600, windupPct: 40, range: 18, hitsGround: true, hitsAir: false,
          dmgType: 'slash', sfx: 'labrys_chop',
        },
      ],
      abilities: [
        { kind: 'firstHitBonus', multBp: 20000, knockback: 40, idleResetMs: 2000 },
        { kind: 'frenzy', belowHpBp: 5000, damageBp: 3000, attackSpeedBp: 2000 },
      ],
      visualId: 'unit.minotaur', sfx: { spawn: 'spawn_heavy', die: 'die_bio' },
      nameKey: 'card.minotaur.name', descKey: 'card.minotaur.desc', strongVs: [], weakVs: [],
    },
    {
      // Legendary multi-head: three heads bite three targets in turn (cleave 3, reach 40, secondaries 50%);
      // the spit slows every target 20% for 1.5 s
      id: 'hydra', released: false, kind: 'unit', age: 'bronze', rarity: 'legendary', role: 'heavy', group: 'legendary',
      cost: 350, trainMs: 7000, pop: 14, hp: 1300, speed: 45, size: 'huge',
      tags: ['armored', 'bio', 'melee', 'legendary', 'ground'],
      attacks: [
        {
          damage: 48, intervalMs: 2200, windupPct: 40, range: 40, hitsGround: true, hitsAir: false,
          dmgType: 'slash', sfx: 'hydra_bite', cleave: { count: 3, reach: 40 },
          onHit: [{ kind: 'slow', magnitudeBp: 2000, durationMs: 1500 }],
        },
      ],
      abilities: [],
      visualId: 'unit.hydra', sfx: { spawn: 'spawn_legendary', die: 'die_bio' },
      nameKey: 'card.hydra.name', descKey: 'card.hydra.desc', strongVs: [], weakVs: [],
    },
  ],
  turrets: [
    {
      // Single target
      id: 'archer_tower', kind: 'turret', age: 'bronze', rarity: 'common', starter: true, cost: 150,
      attack: {
        damage: 35, intervalMs: 1500, windupPct: 0, range: 370, hitsGround: true, hitsAir: true,
        projectile: { speed: 650, visualId: 'proj.arrow' },
        dmgType: 'pierce', sfx: 'shot_bow',
      },
      visualId: 'turret.archer_tower', nameKey: 'card.archer_tower.name', descKey: 'card.archer_tower.desc',
    },
    {
      // Focused sunlight: instant beam, high chip DPS, short range (the Bronze answer to the Beehive)
      id: 'sun_mirror', kind: 'turret', age: 'bronze', rarity: 'common', starter: true, cost: 175,
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
    {
      // W2 Bronze wave. Slow: a weighted net, 28 every 1.5 s; the target is slowed 30% for 2 s; ground and air
      id: 'net_caster', released: false, kind: 'turret', age: 'bronze', rarity: 'common', cost: 175,
      attack: {
        damage: 28, intervalMs: 1500, windupPct: 0, range: 320, hitsGround: true, hitsAir: true,
        projectile: { speed: 500, visualId: 'proj.net' },
        dmgType: 'blunt', sfx: 'net_cast', onHit: [{ kind: 'slow', magnitudeBp: 3000, durationMs: 2000 }],
      },
      visualId: 'turret.net_caster', nameKey: 'card.net_caster.name', descKey: 'card.net_caster.desc',
    },
    {
      // W2 Bronze wave. Repeater: the chain-fed bolt-thrower looses 3 bolts × 35 every 3.0 s; ground and air
      id: 'polybolos', released: false, kind: 'turret', age: 'bronze', rarity: 'rare', cost: 250,
      attack: {
        damage: 35, intervalMs: 3000, windupPct: 0, range: 420, hitsGround: true, hitsAir: true,
        projectile: { speed: 800, visualId: 'proj.bolt' },
        dmgType: 'pierce', sfx: 'shot_polybolos', volley: 3,
      },
      visualId: 'turret.polybolos', nameKey: 'card.polybolos.name', descKey: 'card.polybolos.desc',
    },
  ],
  // A16.14.4 Forts (Bronze, P 1.16): War Path L4 camp, L6 trap, L8 tower; Road fort set at 2,200
  forts: [
    wall('bronze', 'cyclopean_wall'),
    tower('bronze', 'pyrgos_tower', { warPath: 8, road: 2200 }),
    camp('bronze', 'muster_tents', 'citizen_levy', { warPath: 4, road: 2200 }),
    trap('bronze', 'hidden_stakes', { warPath: 6, road: 2200 }, { charges: 3, damage: 46, statuses: [slow(4000, 2000)] }),
    // W2 Bronze wave variants: a cover wall (1.0 × the Heavy Common, 175 gold; own ground units within 60 lu behind
    // take 20% less from range ≥ 100; War Path Bronze s2) and a ranged camp (its levy is 35% of the Javelineer,
    // every 12 s, 1 alive; the Bronze 20-star milestone). Road fallback 4,200. Release gate until their art ships.
    { ...wall('bronze', 'hoplon_line', { cost: FORT_COST.bunker, hpBp: 10000, cover: { behindLu: 60, rangedTakenBp: 2000 }, from: { side: 2, road: 4200 } }), released: false },
    { ...camp('bronze', 'slinger_camp', 'slinger_levy', { stars: 20, road: 4200 }, { levyFrom: { group: 'ranged', hpBp: 3500, damageBp: 3500 }, everyMs: 12000, maxAlive: 1 }), released: false },
  ],
};

/** A5.7 Bronze Age Powers (values at P 1.16 and L1 loadouts; I 186, H 630; Epic Scorpion 330). */
export const bronzePowers: readonly PowerDef[] = [
  {
    // Starter. A wave sweeps a 450 lu zone over 2.0 s: 170 once per ground enemy touched (±20 lu), cap 4 (MVP trim).
    // Per unit 170: 91% / 27% (Hoplite / War Chariot)
    id: 'tidal_wave', kind: 'power', age: 'bronze', slot: 'home', reach: 'home', family: 'sweep', rarity: 'common',
    source: 'starter', cost: 125, reloadMs: 40000, telegraphMs: 1000, maxTargets: 4,
    effect: { kind: 'sweep', zone: 450, durationMs: 2000, damage: 170, width: 40, hitsAir: false },
    visualId: 'power.tidal_wave', sfx: 'pw_wave', nameKey: 'card.tidal_wave.name', descKey: 'card.tidal_wave.desc',
  },
  {
    // War Path Bronze L5 (Road 700). 6 bolts over 1.5 s across 400 lu (even, ±20 lu); each 120, splash
    // r45; ground only. Per unit ~162: 87% / 26%
    id: 'zeus_bolts', kind: 'power', age: 'bronze', slot: 'home', reach: 'home', family: 'bombard', rarity: 'rare',
    source: 'warPath', warPathLevel: 5, road: 700, cost: 125, reloadMs: 40000, telegraphMs: 1000, maxTargets: 3,
    effect: {
      kind: 'barrage', count: 6, durationMs: 1500, zone: 400, damage: 120, radius: 45,
      jitter: 20, hitsAir: false, pattern: 'even',
    },
    visualId: 'power.zeus_bolts', sfx: 'pw_bolts', nameKey: 'card.zeus_bolts.name', descKey: 'card.zeus_bolts.desc',
  },
  {
    // War Path Bronze L9 (Road 850). A 350 lu gaze (MVP balance pass; was 300), one pulse, ground only: stun
    // 2.0 s (frozen look) and mark (+20% damage taken) for 4 s. 10 disabled unit-seconds (13.3 per 100 gold)
    id: 'medusa_gaze', kind: 'power', age: 'bronze', slot: 'home', reach: 'home', family: 'stun', rarity: 'epic',
    source: 'warPath', warPathLevel: 9, road: 850, cost: 75, reloadMs: 35000, telegraphMs: 1000, maxTargets: 5, aiValueBp: 5000,
    effect: {
      kind: 'field', zone: 350, durationMs: 0, hitsAir: false,
      statuses: [
        { kind: 'stun', magnitudeBp: 10000, durationMs: 2000, frozen: true },
        { kind: 'mark', magnitudeBp: 2000, durationMs: 4000 },
      ],
    },
    visualId: 'power.medusa_gaze', sfx: 'pw_gaze', nameKey: 'card.medusa_gaze.name', descKey: 'card.medusa_gaze.desc',
  },
  {
    // Starter. 3 chariots, 0.5 s apart, run 500 lu at 450 lu/s from your front; 80 and 40 lu knockback;
    // max 2 hits; ground only. Per unit ≤ 160: 86% / 25%
    id: 'chariot_rush', kind: 'power', age: 'bronze', slot: 'field', reach: 'front', family: 'charge', rarity: 'common',
    source: 'starter', cost: 100, reloadMs: 40000, telegraphMs: 1000, maxTargets: 5,
    effect: {
      kind: 'stampede', runners: 3, spacingMs: 500, distance: 500, speed: 450,
      damage: 80, knockback: 40, maxHitsPerEnemy: 2,
    },
    visualId: 'power.chariot_rush', sfx: 'pw_chariots', nameKey: 'card.chariot_rush.name', descKey: 'card.chariot_rush.desc',
  },
  {
    // Road 200. Your 8 frontmost units: a 120 shield and +25% damage for 8 s; 75 gold, reloads in 30 s (MVP
    // balance pass; was 80, +15%, 6 s at 125 gold and 45 s: −7 points next to Chariot Rush)
    id: 'aegis', kind: 'power', age: 'bronze', slot: 'field', reach: 'army', family: 'ward', rarity: 'rare',
    source: 'road', road: 200, cost: 75, reloadMs: 30000, telegraphMs: 500, maxTargets: 8, aiValueBp: 7000,
    effect: {
      kind: 'buffAll', maxTargets: 8,
      statuses: [
        { kind: 'shield', magnitudeBp: 0, durationMs: 8000, amount: 120 },
        { kind: 'damageBuff', magnitudeBp: 2500, durationMs: 8000 },
      ],
    },
    visualId: 'power.aegis', sfx: 'pw_aegis', nameKey: 'card.aegis.name', descKey: 'card.aegis.desc',
  },
  {
    // War Path Bronze L7 (Road 750). One golden arrow, 380, ground and air: 60% of H; the Scorpion takes 190.
    // 50 gold, reloads in 15 s (MVP balance pass; was 75 and 30 s)
    id: 'apollo_arrow', kind: 'power', age: 'bronze', slot: 'field', reach: 'anywhere', family: 'strike', rarity: 'epic',
    source: 'warPath', warPathLevel: 7, road: 750, cost: 50, reloadMs: 15000, telegraphMs: 1500, maxTargets: 1,
    effect: { kind: 'strike', shots: 1, intervalMs: 0, damage: 380, hitsAir: true },
    visualId: 'power.apollo_arrow', sfx: 'pw_apollo', nameKey: 'card.apollo_arrow.name', descKey: 'card.apollo_arrow.desc',
  },
  {
    // Release gate: `released: false` until its art ships. W2 Bronze wave, the H7 lane signal (A2.9.4 `lane`,
    // A5.7 whole-lane powers): War Path Bronze L3 (Road 2,400). No aim: one pulse touches the 8 hittable enemies
    // nearest your gate anywhere on the lane, ground and air, for 19 (10% of I) and snares them 30% for 3 s. 50 gold, 25 s
    id: 'sandstorm', released: false, kind: 'power', age: 'bronze', slot: 'field', reach: 'lane', family: 'signal', rarity: 'rare',
    source: 'warPath', warPathLevel: 3, road: 2400, cost: 50, reloadMs: 25000, telegraphMs: 1000, maxTargets: 8, aiValueBp: 5000,
    effect: {
      kind: 'field', zone: 2000, durationMs: 0, hitsAir: true, damagePerPulse: 65,
      statuses: [{ kind: 'snare', magnitudeBp: 3000, durationMs: 3000 }],
    },
    visualId: 'power.sandstorm', sfx: 'pw_sandstorm', nameKey: 'card.sandstorm.name', descKey: 'card.sandstorm.desc',
  },
  {
    // Release gate: `released: false` until its art ships. W2 Bronze wave, the new Home control (pull, A5.7 family
    // budget): War Path Bronze side node s1 (Road 4,200). A whirlpool opens in a 300 lu zone for 4 s (8 pulses),
    // ground only: the first pulse pulls 40% toward the centre, each pulse 8 damage and snare 40% for 1.0 s; cap 6
    id: 'charybdis', released: false, kind: 'power', age: 'bronze', slot: 'home', reach: 'home', family: 'pull', rarity: 'epic',
    source: 'warPath', warPathSide: 1, road: 4200, cost: 75, reloadMs: 30000, telegraphMs: 1000, maxTargets: 6, aiValueBp: 4500,
    effect: {
      kind: 'field', zone: 300, durationMs: 4000, hitsAir: false, damagePerPulse: 12, pullBp: 4000,
      statuses: [{ kind: 'snare', magnitudeBp: 4000, durationMs: 1000 }],
    },
    visualId: 'power.charybdis', sfx: 'pw_whirlpool', nameKey: 'card.charybdis.name', descKey: 'card.charybdis.desc',
  },
];
