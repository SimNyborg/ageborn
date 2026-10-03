/**
 * Stone Age (P 1.00): DESIGN A5.2 units and turrets, A14.2 attack mapping, A5.6 Training Dummy.
 * Table units: HP and damage whole, ms, lu, lu/s, gold, bp. Data only. `strongVs`/`weakVs` are
 * filled by the WP1 counter matrix (B4).
 */
import { damageMods } from './economy';
import { camp, slow, tower, trap, wall } from './fortKit';
import type { RawAgeTables } from './types';

export const stone: RawAgeTables = {
  age: 'stone',
  units: [
    {
      // Blunt
      id: 'bonker', kind: 'unit', age: 'stone', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 50, trainMs: 1500, pop: 2, hp: 160, speed: 70, size: 'small', starter: true,
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 20, intervalMs: 1000, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'blunt', sfx: 'swing_whoosh', mods: damageMods.blunt,
        },
      ],
      abilities: [],
      visualId: 'unit.bonker', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.bonker.name', descKey: 'card.bonker.desc', strongVs: [], weakVs: [],
    },
    {
      // Rock. Ricochet: bounces to 1 more enemy within 40 lu (chain, 2 targets total)
      id: 'pebbler', kind: 'unit', age: 'stone', rarity: 'common', role: 'ranged', group: 'ranged',
      cost: 75, trainMs: 2000, pop: 3, hp: 95, speed: 65, size: 'small', starter: true,
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 18, intervalMs: 1400, windupPct: 50, range: 200, hitsGround: true, hitsAir: true,
          projectile: { speed: 500, visualId: 'proj.rock' },
          dmgType: 'blunt', sfx: 'shot_sling', chain: { count: 2, hop: 40 },
        },
      ],
      abilities: [],
      visualId: 'unit.pebbler', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.pebbler.name', descKey: 'card.pebbler.desc', strongVs: [], weakVs: [],
    },
    {
      // Gore: first hit of each engagement ×2 and 30 lu knockback
      id: 'tuskback', kind: 'unit', age: 'stone', rarity: 'common', role: 'heavy', group: 'heavy',
      cost: 150, trainMs: 4000, pop: 6, hp: 560, speed: 55, size: 'large', starter: true,
      tags: ['armored', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 42, intervalMs: 1500, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'blunt', sfx: 'swing_whoosh',
        },
      ],
      abilities: [{ kind: 'firstHitBonus', multBp: 20000, knockback: 30, idleResetMs: 2000 }],
      visualId: 'unit.tuskback', sfx: { spawn: 'spawn_heavy', die: 'die_bio' },
      nameKey: 'card.tuskback.name', descKey: 'card.tuskback.desc', strongVs: [], weakVs: [],
    },
    {
      // Reach; melee AA mods; priority armored
      id: 'spear_hunter', kind: 'unit', age: 'stone', rarity: 'rare', role: 'antiArmor', group: 'antiArmor',
      cost: 100, trainMs: 2500, pop: 4, hp: 220, speed: 70, size: 'medium', starter: true,
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 26, intervalMs: 1200, windupPct: 40, range: 60, hitsGround: true, hitsAir: false,
          dmgType: 'pierce', sfx: 'swing_whoosh', mods: damageMods.meleeAntiArmor, priority: 'armored',
        },
      ],
      abilities: [{ kind: 'brace' }],
      visualId: 'unit.spear_hunter', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.spear_hunter.name', descKey: 'card.spear_hunter.desc', strongVs: [], weakVs: [],
    },
    {
      // Aura: allies within 160 lu get +20% attack speed; followSupport
      id: 'drum_shaman', kind: 'unit', age: 'stone', rarity: 'rare', role: 'support', group: 'support',
      cost: 110, trainMs: 3000, pop: 4, hp: 130, speed: 65, size: 'small',
      tags: ['light', 'bio', 'support', 'ranged', 'ground'],
      attacks: [
        {
          damage: 8, intervalMs: 1200, windupPct: 50, range: 150, hitsGround: true, hitsAir: true,
          projectile: { speed: 500, visualId: 'proj.rock' },
          dmgType: 'blunt', sfx: 'shot_sling',
        },
      ],
      abilities: [
        // durationMs 0: the aura status lasts while the ally is inside the radius (recomputed each tick, B3 step 6)
        { kind: 'aura', radius: 160, status: { kind: 'attackSpeedBuff', magnitudeBp: 2000, durationMs: 0 } },
        { kind: 'followSupport', behindFront: 60, soloMaxP: 200 },
      ],
      visualId: 'unit.drum_shaman', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.drum_shaman.name', descKey: 'card.drum_shaman.desc', strongVs: [], weakVs: [],
    },
    {
      // Pounce (10 s cooldown): when blocked, leaps (0.5 s) to the nearest enemy ranged or support unit
      // within 150 lu beyond the blocker; first bite ×2. No target: no leap and no cooldown
      id: 'sabertooth', kind: 'unit', age: 'stone', rarity: 'epic', role: 'skirmisher', group: 'epic',
      cost: 200, trainMs: 4000, pop: 8, hp: 380, speed: 100, size: 'medium',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 34, intervalMs: 800, windupPct: 40, range: 12, hitsGround: true, hitsAir: false,
          dmgType: 'slash', sfx: 'swing_whoosh',
        },
      ],
      abilities: [{ kind: 'pounce', searchRange: 150, cooldownMs: 10000, leapMs: 500, firstBiteBp: 20000 }],
      visualId: 'unit.sabertooth', sfx: { spawn: 'spawn_heavy', die: 'die_bio' },
      nameKey: 'card.sabertooth.name', descKey: 'card.sabertooth.desc', strongVs: [], weakVs: [],
    },
    {
      // 55 splash r40 / 2.0 s. Two riders each shoot 12 / 1.4 s at range 200 (G+A);
      // on death the riders jump off as 2 Pebblers (summoned)
      id: 'mammoth_matriarch', kind: 'unit', age: 'stone', rarity: 'legendary', role: 'siegeHeavy', group: 'legendary',
      cost: 350, trainMs: 7000, pop: 14, hp: 1700, speed: 40, size: 'huge',
      tags: ['armored', 'bio', 'melee', 'legendary', 'ground'],
      attacks: [
        {
          damage: 55, intervalMs: 2000, windupPct: 40, range: 20, hitsGround: true, hitsAir: false,
          dmgType: 'blast', sfx: 'swing_whoosh', splashRadius: 40,
        },
      ],
      abilities: [
        {
          kind: 'riders',
          count: 2,
          attack: {
            damage: 12, intervalMs: 1400, windupPct: 50, range: 200, hitsGround: true, hitsAir: true,
            projectile: { speed: 500, visualId: 'proj.rock' },
            dmgType: 'blunt', sfx: 'shot_sling',
          },
          onDeathSpawn: 'pebbler',
        },
      ],
      visualId: 'unit.mammoth_matriarch', sfx: { spawn: 'spawn_legendary', die: 'die_bio' },
      nameKey: 'card.mammoth_matriarch.name', descKey: 'card.mammoth_matriarch.desc', strongVs: [], weakVs: [],
    },
    {
      // Tutorial only (A5.6): cost 50 (for bounty), HP 40, 4 / 1.0 s, range 16, speed 50, small, G, light bio melee
      id: 'training_dummy', kind: 'unit', age: 'stone', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 50, trainMs: 1500, pop: 2, hp: 40, speed: 50, size: 'small',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 4, intervalMs: 1000, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'blunt', sfx: 'swing_whoosh', mods: damageMods.blunt,
        },
      ],
      abilities: [],
      visualId: 'unit.training_dummy', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.training_dummy.name', descKey: 'card.training_dummy.desc', strongVs: [], weakVs: [],
      hidden: true,
    },
    // ---- X0 Stone wave (content expansion 2026-10-02, CONTENT_PLAN 5.1): capsule cards, appended in build
    // order. Commons drop from Arena 2, Rares 3, Epics 4, Legendaries 5 (`cardArena`). Templates: plan 4.
    // Released 2026-10-03 with its sheets, portraits, sounds and measured numbers (docs/decisions.md).
    {
      // Pair (X0 M1): one card trains 2 wolves; stats per wolf (0.55 × Bonker), cost and pop split evenly
      id: 'hunting_wolves', kind: 'unit', age: 'stone', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 50, trainMs: 1500, pop: 2, hp: 100, speed: 80, size: 'small',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 12, intervalMs: 1000, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'slash', sfx: 'wolf_bite',
        },
      ],
      abilities: [],
      squad: { count: 2 },
      visualId: 'unit.hunting_wolves', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.hunting_wolves.name', descKey: 'card.hunting_wolves.desc', strongVs: [], weakVs: [],
    },
    {
      // Guard: 25% less damage from attacks with range ≥ 100 (not powers); Blunt
      id: 'hide_shield', kind: 'unit', age: 'stone', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 50, trainMs: 1500, pop: 2, hp: 216, speed: 65, size: 'small',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 13, intervalMs: 1000, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'blunt', sfx: 'shield_bash', mods: damageMods.blunt,
        },
      ],
      abilities: [{ kind: 'resist', minSourceRange: 100, bp: 2500 }],
      visualId: 'unit.hide_shield', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.hide_shield.name', descKey: 'card.hide_shield.desc', strongVs: [], weakVs: [],
    },
    {
      // Raider: fast; 36 to bases (×2)
      id: 'torch_runner', kind: 'unit', age: 'stone', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 50, trainMs: 1500, pop: 2, hp: 166, speed: 100, size: 'small',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 20, intervalMs: 1000, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'blunt', sfx: 'torch_jab', vsBaseDamage: 40,
        },
      ],
      abilities: [],
      visualId: 'unit.torch_runner', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.torch_runner.name', descKey: 'card.torch_runner.desc', strongVs: [], weakVs: [],
    },
    {
      // Snarer: hits slow the target 20% for 1.5 s; ground only (numbers tuned by measurement, docs/decisions.md)
      id: 'bolas_thrower', kind: 'unit', age: 'stone', rarity: 'common', role: 'ranged', group: 'ranged',
      cost: 75, trainMs: 2000, pop: 3, hp: 100, speed: 65, size: 'small',
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 10, intervalMs: 1400, windupPct: 50, range: 165, hitsGround: true, hitsAir: false,
          projectile: { speed: 450, visualId: 'proj.bolas' },
          dmgType: 'blunt', sfx: 'shot_bolas', onHit: [{ kind: 'slow', magnitudeBp: 2000, durationMs: 1500 }],
        },
      ],
      abilities: [],
      visualId: 'unit.bolas_thrower', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.bolas_thrower.name', descKey: 'card.bolas_thrower.desc', strongVs: [], weakVs: [],
    },
    {
      // Brute: steady horn hook, cleave 2 (reach 30); no charge bonus
      id: 'woolly_rhino', kind: 'unit', age: 'stone', rarity: 'common', role: 'heavy', group: 'heavy',
      cost: 150, trainMs: 4000, pop: 6, hp: 580, speed: 50, size: 'large',
      tags: ['armored', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 33, intervalMs: 1500, windupPct: 40, range: 20, hitsGround: true, hitsAir: false,
          dmgType: 'blunt', sfx: 'horn_hook', cleave: { count: 2, reach: 30 },
        },
      ],
      abilities: [],
      visualId: 'unit.woolly_rhino', sfx: { spawn: 'spawn_heavy', die: 'die_bio' },
      nameKey: 'card.woolly_rhino.name', descKey: 'card.woolly_rhino.desc', strongVs: [], weakVs: [],
    },
    {
      // Long range (H6, A5.1): an arcing dart at the target's spot, splash r35; range 320, min 90; half to bases; ground only
      id: 'atlatl_thrower', kind: 'unit', age: 'stone', rarity: 'rare', role: 'ranged', group: 'ranged',
      cost: 75, trainMs: 2000, pop: 3, hp: 92, speed: 60, size: 'small',
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 39, intervalMs: 2600, windupPct: 50, range: 320, minRange: 90, hitsGround: true, hitsAir: false,
          projectile: { speed: 300, arc: true, visualId: 'proj.dart' },
          dmgType: 'pierce', sfx: 'shot_atlatl', splashRadius: 35, vsBaseDamage: 17,
        },
      ],
      abilities: [],
      visualId: 'unit.atlatl_thrower', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.atlatl_thrower.name', descKey: 'card.atlatl_thrower.desc', strongVs: [], weakVs: [],
    },
    {
      // Ranged Anti-heavy: range 130, 40 / 1.8 s; ranged AA mods (armored and mech ×3, Legendary ×2, light ×0.5); Brace; priority armored
      id: 'boulder_hurler', kind: 'unit', age: 'stone', rarity: 'rare', role: 'antiArmor', group: 'antiArmor',
      cost: 100, trainMs: 2500, pop: 4, hp: 175, speed: 65, size: 'medium',
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 40, intervalMs: 1400, windupPct: 50, range: 130, hitsGround: true, hitsAir: false,
          projectile: { speed: 400, visualId: 'proj.boulder' },
          dmgType: 'blunt', sfx: 'shot_heave', mods: damageMods.rangedAntiArmor, priority: 'armored',
        },
      ],
      abilities: [{ kind: 'brace' }],
      visualId: 'unit.boulder_hurler', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.boulder_hurler.name', descKey: 'card.boulder_hurler.desc', strongVs: [], weakVs: [],
    },
    {
      // Heal: 30 HP/s split between the 2 most hurt allies within 160 lu; followSupport
      id: 'herbalist', kind: 'unit', age: 'stone', rarity: 'rare', role: 'support', group: 'support',
      cost: 110, trainMs: 3000, pop: 4, hp: 130, speed: 65, size: 'small',
      tags: ['light', 'bio', 'support', 'ranged', 'ground'],
      attacks: [
        {
          damage: 8, intervalMs: 1200, windupPct: 50, range: 150, hitsGround: true, hitsAir: true,
          projectile: { speed: 400, visualId: 'proj.herb' },
          dmgType: 'blunt', sfx: 'herb_puff',
        },
      ],
      abilities: [
        { kind: 'heal', hpPerSec: 30, radius: 160, targets: 2, pulseMs: 500 },
        { kind: 'followSupport', behindFront: 60, soloMaxP: 200 },
      ],
      visualId: 'unit.herbalist', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.herbalist.name', descKey: 'card.herbalist.desc', strongVs: [], weakVs: [],
    },
    {
      // Frenzy (X0 M2): below 50% HP, +30% damage and +20% attack speed; Blunt
      id: 'pelt_rager', kind: 'unit', age: 'stone', rarity: 'rare', role: 'infantry', group: 'infantry',
      cost: 50, trainMs: 1500, pop: 2, hp: 176, speed: 70, size: 'small',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 17, intervalMs: 1000, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'blunt', sfx: 'swing_whoosh', mods: damageMods.blunt,
        },
      ],
      abilities: [{ kind: 'frenzy', belowHpBp: 5000, damageBp: 3000, attackSpeedBp: 2000 }],
      visualId: 'unit.pelt_rager', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.pelt_rager.name', descKey: 'card.pelt_rager.desc', strongVs: [], weakVs: [],
    },
    {
      // Summoner (X0 M3): a Cave Pup (35% of a Bonker, fast) every 8 s, at most 2; staff poke; followSupport
      id: 'beast_caller', kind: 'unit', age: 'stone', rarity: 'epic', role: 'support', group: 'epic',
      cost: 200, trainMs: 4000, pop: 8, hp: 260, speed: 65, size: 'small',
      tags: ['light', 'bio', 'support', 'melee', 'ground'],
      attacks: [
        {
          damage: 12, intervalMs: 1200, windupPct: 40, range: 30, hitsGround: true, hitsAir: false,
          dmgType: 'blunt', sfx: 'swing_whoosh',
        },
      ],
      abilities: [
        { kind: 'summon', card: 'cave_pup', firstMs: 2000, everyMs: 8000, maxAlive: 2 },
        { kind: 'followSupport', behindFront: 60, soloMaxP: 200 },
      ],
      visualId: 'unit.beast_caller', sfx: { spawn: 'spawn_heavy', die: 'die_bio' },
      nameKey: 'card.beast_caller.name', descKey: 'card.beast_caller.desc', strongVs: [], weakVs: [],
    },
    {
      // Brawler: wide paw swat; Roar every 14 s stuns enemies within 110 lu for 1.0 s (Legendaries 0.5 s), dizzy (M5)
      id: 'cave_bear', kind: 'unit', age: 'stone', rarity: 'epic', role: 'heavy', group: 'epic',
      cost: 200, trainMs: 4000, pop: 8, hp: 800, speed: 55, size: 'large',
      tags: ['armored', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 50, intervalMs: 1400, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'slash', sfx: 'bear_swipe',
        },
      ],
      abilities: [{ kind: 'timeStop', everyMs: 14000, radius: 110, freezeMs: 1000, legendaryFreezeMs: 500, frozen: false }],
      visualId: 'unit.cave_bear', sfx: { spawn: 'spawn_heavy', die: 'die_bio' },
      nameKey: 'card.cave_bear.name', descKey: 'card.cave_bear.desc', strongVs: [], weakVs: [],
    },
    {
      // Caster: every 9 s a boulder lands on the nearest enemy ground unit within 380 lu after 1.0 s (70 splash r45)
      id: 'rockfall_shaman', kind: 'unit', age: 'stone', rarity: 'epic', role: 'support', group: 'epic',
      cost: 200, trainMs: 4000, pop: 8, hp: 240, speed: 60, size: 'small',
      tags: ['light', 'bio', 'support', 'ranged', 'ground'],
      attacks: [
        {
          damage: 12, intervalMs: 1400, windupPct: 50, range: 170, hitsGround: true, hitsAir: true,
          projectile: { speed: 500, visualId: 'proj.rock' },
          dmgType: 'blunt', sfx: 'shot_sling',
        },
      ],
      abilities: [
        { kind: 'callStrike', everyMs: 9000, searchRange: 380, delayMs: 1000, damage: 70, radius: 45, sideLockoutMs: 3000 },
        { kind: 'followSupport', behindFront: 60, soloMaxP: 200 },
      ],
      visualId: 'unit.rockfall_shaman', sfx: { spawn: 'spawn_heavy', die: 'die_bio' },
      nameKey: 'card.rockfall_shaman.name', descKey: 'card.rockfall_shaman.desc', strongVs: [], weakVs: [],
    },
    {
      // Legendary war leader: antler sweep cleave 2 (reach 30); first hit ×2 and 40 lu knockback; War Horn aura +15% damage within 180
      id: 'elk_chieftain', kind: 'unit', age: 'stone', rarity: 'legendary', role: 'heavy', group: 'legendary',
      cost: 350, trainMs: 7000, pop: 14, hp: 900, speed: 50, size: 'large',
      tags: ['armored', 'bio', 'melee', 'legendary', 'ground'],
      attacks: [
        {
          damage: 40, intervalMs: 1800, windupPct: 40, range: 20, hitsGround: true, hitsAir: false,
          dmgType: 'blunt', sfx: 'antler_sweep', cleave: { count: 2, reach: 30 },
        },
      ],
      abilities: [
        { kind: 'firstHitBonus', multBp: 20000, knockback: 40, idleResetMs: 2000 },
        { kind: 'aura', radius: 180, status: { kind: 'damageBuff', magnitudeBp: 1500, durationMs: 0 } },
      ],
      visualId: 'unit.elk_chieftain', sfx: { spawn: 'spawn_legendary', die: 'die_bio' },
      nameKey: 'card.elk_chieftain.name', descKey: 'card.elk_chieftain.desc', strongVs: [], weakVs: [],
    },
    {
      // Beast Caller's summon (X0 M3): 35% of a Bonker (HP 56, 7 damage), fast; no pop, no bounty, always marches
      id: 'cave_pup', kind: 'unit', age: 'stone', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 0, trainMs: 1500, pop: 2, hp: 56, speed: 90, size: 'small',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 7, intervalMs: 1000, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'slash', sfx: 'wolf_bite',
        },
      ],
      abilities: [],
      visualId: 'unit.cave_pup', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.cave_pup.name', descKey: 'card.cave_pup.desc', strongVs: [], weakVs: [],
      hidden: true, summon: true, aiValue: 18,
    },
  ],
  turrets: [
    {
      // Single target, arc
      id: 'rock_tosser', kind: 'turret', age: 'stone', rarity: 'common', starter: true, cost: 150,
      attack: {
        damage: 30, intervalMs: 1500, windupPct: 0, range: 360, hitsGround: true, hitsAir: true,
        projectile: { speed: 450, arc: true, visualId: 'proj.boulder' },
        dmgType: 'blunt', sfx: 'shot_catapult',
      },
      visualId: 'turret.rock_tosser', nameKey: 'card.rock_tosser.name', descKey: 'card.rock_tosser.desc',
    },
    {
      // Bee stream, high chip DPS, short range
      id: 'angry_beehive', kind: 'turret', age: 'stone', rarity: 'common', starter: true, cost: 175,
      attack: {
        damage: 5, intervalMs: 200, windupPct: 0, range: 220, hitsGround: true, hitsAir: true,
        projectile: { speed: 650, visualId: 'proj.bee' },
        dmgType: 'pierce', sfx: 'bee_buzz',
      },
      visualId: 'turret.angry_beehive', nameKey: 'card.angry_beehive.name', descKey: 'card.angry_beehive.desc',
    },
    {
      // Rolls a log that hits ground enemies within 300 lu of your gate, nearest to the gate first; max 6 targets
      id: 'log_roller', kind: 'turret', age: 'stone', rarity: 'rare', cost: 250,
      attack: {
        damage: 45, intervalMs: 4000, windupPct: 0, range: 300, hitsGround: true, hitsAir: false,
        projectile: { speed: 450, visualId: 'proj.log' },
        dmgType: 'blunt', sfx: 'log_roll', line: { fromGate: 300 }, maxTargets: 6,
      },
      visualId: 'turret.log_roller', nameKey: 'card.log_roller.name', descKey: 'card.log_roller.desc',
    },
    {
      // Tongue grabs the nearest enemy ranged or support ground unit in range, else the second-frontmost
      // small or medium ground enemy, and drags it 120 lu toward your gate. The drag stops at the enemy's
      // frontmost ground unit and short of your nearest ground unit
      id: 'grumpy_toad', kind: 'turret', age: 'stone', rarity: 'epic', cost: 250,
      attack: {
        damage: 60, intervalMs: 5000, windupPct: 0, range: 420, hitsGround: true, hitsAir: false,
        projectile: { instant: true, effectId: 'fx.tongue' },
        dmgType: 'blunt', sfx: 'toad_tongue', priority: 'backline', drag: { distance: 120 },
      },
      visualId: 'turret.grumpy_toad', nameKey: 'card.grumpy_toad.name', descKey: 'card.grumpy_toad.desc',
    },
    {
      // X0 Stone wave. Volley (anti-swarm): 3 quills × 9, each piercing 2 within 60 lu, every 1.5 s; ground and air
      id: 'quill_porcupine', kind: 'turret', age: 'stone', rarity: 'common', cost: 175,
      attack: {
        damage: 9, intervalMs: 1500, windupPct: 0, range: 280, hitsGround: true, hitsAir: true,
        projectile: { speed: 600, visualId: 'proj.quill' },
        dmgType: 'pierce', sfx: 'quill_fan', volley: 3, pierce: { count: 2, length: 60 },
      },
      visualId: 'turret.quill_porcupine', nameKey: 'card.quill_porcupine.name', descKey: 'card.quill_porcupine.desc',
    },
    {
      // X0 Stone wave. Arc: a bent sapling flings a stone, 82 splash r50 every 4.5 s, range 480 (min 150); ground only
      id: 'sapling_sling', kind: 'turret', age: 'stone', rarity: 'rare', cost: 250,
      attack: {
        damage: 82, intervalMs: 4500, windupPct: 0, range: 480, minRange: 150, hitsGround: true, hitsAir: false,
        projectile: { speed: 450, arc: true, visualId: 'proj.boulder' },
        dmgType: 'blast', sfx: 'shot_sapling', splashRadius: 50,
      },
      visualId: 'turret.sapling_sling', nameKey: 'card.sapling_sling.name', descKey: 'card.sapling_sling.desc',
    },
  ],
  // A16.14.4 Forts (Stone, P 1.00): the Stone Camp, Trap and Tower come with the Fort slot unlock
  forts: [
    wall('stone', 'palisade'),
    tower('stone', 'sling_perch', { unlock: true }),
    camp('stone', 'war_camp', 'cave_youth', { unlock: true }),
    trap('stone', 'spike_pit', { unlock: true }, { charges: 3, damage: 40, statuses: [slow(4000, 2000)] }),
    // X0 Stone wave variants: a cheap wall (0.75 × the Heavy Common, 100 gold; War Path Stone s2) and a lob tower
    // (× 0.8 damage, splash r30, interval × 1.3, arc, ground only; the Stone 20-star milestone). Road fallback 4,100.
    // Released 2026-10-03 with their cartoon sheets (docs/decisions.md).
    wall('stone', 'thorn_hedge', { cost: 100, hpBp: 7500, from: { side: 2, road: 4100 } }),
    tower('stone', 'bone_watchtower', { stars: 20, road: 4100 }, { damageBp: 8000, intervalBp: 13000, splashRadius: 30, arc: true, groundOnly: true }),
  ],
};
