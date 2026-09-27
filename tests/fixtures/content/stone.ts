// FROZEN FIXTURE (DESIGN C2/WP0 task 8): a copy of src/content/raw/stone.ts taken in Phase 0 (2026-09-27).
// Golden replays compile this content, so balance tuning in src/content/raw never breaks them.
// Never edit it. To re-baseline, copy src/content/raw again and re-record every golden replay.

/**
 * Stone Age (P 1.00): DESIGN A5.2 units and turrets, A14.2 attack mapping, A5.6 Training Dummy.
 * Table units: HP and damage whole, ms, lu, lu/s, gold, bp. Data only. `strongVs`/`weakVs` are
 * filled by the WP1 counter matrix (B4).
 */
import { damageMods } from './economy';
import type { RawAgeTables } from './types';

export const stone: RawAgeTables = {
  age: 'stone',
  units: [
    {
      // Blunt
      id: 'bonker', kind: 'unit', age: 'stone', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 50, trainMs: 1500, pop: 2, hp: 160, speed: 70, size: 'small',
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
      cost: 75, trainMs: 2000, pop: 3, hp: 95, speed: 65, size: 'small',
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
      cost: 150, trainMs: 4000, pop: 6, hp: 560, speed: 55, size: 'large',
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
      cost: 100, trainMs: 2500, pop: 4, hp: 200, speed: 70, size: 'medium',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 26, intervalMs: 1200, windupPct: 40, range: 60, hitsGround: true, hitsAir: false,
          dmgType: 'pierce', sfx: 'swing_whoosh', mods: damageMods.meleeAntiArmor, priority: 'armored',
        },
      ],
      abilities: [],
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
  ],
  turrets: [
    {
      // Single target, arc
      id: 'rock_tosser', kind: 'turret', age: 'stone', rarity: 'common', cost: 150,
      attack: {
        damage: 30, intervalMs: 1500, windupPct: 0, range: 360, hitsGround: true, hitsAir: true,
        projectile: { speed: 450, arc: true, visualId: 'proj.boulder' },
        dmgType: 'blunt', sfx: 'shot_catapult',
      },
      visualId: 'turret.rock_tosser', nameKey: 'card.rock_tosser.name', descKey: 'card.rock_tosser.desc',
    },
    {
      // Bee stream, high chip DPS, short range
      id: 'angry_beehive', kind: 'turret', age: 'stone', rarity: 'common', cost: 175,
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
  ],
};
