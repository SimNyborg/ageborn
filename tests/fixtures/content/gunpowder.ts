// FROZEN FIXTURE (DESIGN C2/WP0 task 8): a copy of src/content/raw/gunpowder.ts taken in Phase 0 (2026-09-27).
// Golden replays compile this content, so balance tuning in src/content/raw never breaks them.
// Never edit it. To re-baseline, copy src/content/raw again and re-record every golden replay.

/**
 * Gunpowder Age (P 1.82): DESIGN A5.4 units and turrets, A14.2 attack mapping.
 * Table units: HP and damage whole, ms, lu, lu/s, gold, bp. Data only. `strongVs`/`weakVs` are
 * filled by the WP1 counter matrix (B4).
 */
import { damageMods } from './economy';
import { gunpowderForts } from './forts';
import type { RawAgeTables } from './types';

export const gunpowder: RawAgeTables = {
  age: 'gunpowder',
  units: [
    {
      // Blunt. Boarding Hook: first hit of each engagement pulls the target 20 lu toward the Corsair
      id: 'corsair', kind: 'unit', age: 'gunpowder', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 50, trainMs: 1500, pop: 2, hp: 291, speed: 72, size: 'small',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 36, intervalMs: 1000, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'slash', sfx: 'swing_whoosh', mods: damageMods.blunt,
        },
      ],
      // No damage bonus (×1.0); negative knockback pulls toward the attacker (A2.7)
      abilities: [{ kind: 'firstHitBonus', multBp: 10000, knockback: -20, idleResetMs: 2000 }],
      visualId: 'unit.corsair', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.corsair.name', descKey: 'card.corsair.desc', strongVs: [], weakVs: [],
    },
    {
      // Musket
      id: 'fusilier', kind: 'unit', age: 'gunpowder', rarity: 'common', role: 'ranged', group: 'ranged',
      cost: 75, trainMs: 2000, pop: 3, hp: 173, speed: 65, size: 'small',
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 47, intervalMs: 2000, windupPct: 50, range: 240, hitsGround: true, hitsAir: true,
          projectile: { speed: 1500, visualId: 'proj.musket' },
          dmgType: 'bullet', sfx: 'shot_musket',
        },
      ],
      abilities: [],
      visualId: 'unit.fusilier', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.fusilier.name', descKey: 'card.fusilier.desc', strongVs: [], weakVs: [],
    },
    {
      // Charge: first hit ×2 and 30 lu knockback
      id: 'cuirassier', kind: 'unit', age: 'gunpowder', rarity: 'common', role: 'heavy', group: 'heavy',
      cost: 150, trainMs: 4000, pop: 6, hp: 1019, speed: 60, size: 'large',
      tags: ['armored', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 76, intervalMs: 1500, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'slash', sfx: 'swing_whoosh',
        },
      ],
      abilities: [{ kind: 'firstHitBonus', multBp: 20000, knockback: 30, idleResetMs: 2000 }],
      visualId: 'unit.cuirassier', sfx: { spawn: 'spawn_heavy', die: 'die_bio' },
      nameKey: 'card.cuirassier.name', descKey: 'card.cuirassier.desc', strongVs: [], weakVs: [],
    },
    {
      // 50 splash r35 / 1.8 s. Lob over allies; armored ×1.5, mech ×1.5, light ×0.5; priority armored
      id: 'grenadier', kind: 'unit', age: 'gunpowder', rarity: 'rare', role: 'antiArmor', group: 'antiArmor',
      cost: 100, trainMs: 2500, pop: 4, hp: 230, speed: 68, size: 'medium',
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 50, intervalMs: 1800, windupPct: 50, range: 150, hitsGround: true, hitsAir: false,
          projectile: { speed: 450, arc: true, visualId: 'proj.lob' },
          dmgType: 'blast', sfx: 'shot_lob', splashRadius: 35, mods: damageMods.grenadier, priority: 'armored',
        },
      ],
      abilities: [],
      visualId: 'unit.grenadier', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.grenadier.name', descKey: 'card.grenadier.desc', strongVs: [], weakVs: [],
    },
    {
      // Heals 55 HP/s split between the 2 lowest-HP% allies within 160 lu; followSupport
      id: 'field_surgeon', kind: 'unit', age: 'gunpowder', rarity: 'rare', role: 'support', group: 'support',
      cost: 110, trainMs: 3000, pop: 4, hp: 237, speed: 65, size: 'small',
      tags: ['light', 'bio', 'support', 'ranged', 'ground'],
      attacks: [
        {
          damage: 15, intervalMs: 1200, windupPct: 50, range: 150, hitsGround: true, hitsAir: true,
          projectile: { speed: 1500, visualId: 'proj.musket' },
          dmgType: 'bullet', sfx: 'shot_musket',
        },
      ],
      abilities: [
        { kind: 'heal', hpPerSec: 55, radius: 160, targets: 2, pulseMs: 500 },
        { kind: 'followSupport', behindFront: 60, soloMaxP: 200 },
      ],
      visualId: 'unit.field_surgeon', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.field_surgeon.name', descKey: 'card.field_surgeon.desc', strongVs: [], weakVs: [],
    },
    {
      // 110 splash r50 / 3.5 s, range 280 (min 80), arc
      id: 'bronze_cannon', kind: 'unit', age: 'gunpowder', rarity: 'epic', role: 'artillery', group: 'epic',
      cost: 200, trainMs: 4000, pop: 8, hp: 500, speed: 45, size: 'large',
      tags: ['light', 'mech', 'ranged', 'ground'],
      attacks: [
        {
          damage: 110, intervalMs: 3500, windupPct: 50, range: 280, minRange: 80, hitsGround: true, hitsAir: false,
          projectile: { speed: 450, arc: true, visualId: 'proj.cannonball' },
          dmgType: 'blast', sfx: 'shot_cannon', splashRadius: 50,
        },
      ],
      abilities: [],
      visualId: 'unit.bronze_cannon', sfx: { spawn: 'spawn_heavy', die: 'die_mech' },
      nameKey: 'card.bronze_cannon.name', descKey: 'card.bronze_cannon.desc', strongVs: [], weakVs: [],
    },
    {
      // Bomber: 110 splash r50 / 1.6 s on ground enemies within ±40 lu below; bombs the base at the
      // enemy gate (110 per bomb); on death crashes for 250 splash r70 on ground enemies
      id: 'balloon_admiral', kind: 'unit', age: 'gunpowder', rarity: 'legendary', role: 'airBomber', group: 'legendary',
      cost: 350, trainMs: 7000, pop: 14, hp: 1500, speed: 45, size: 'huge',
      tags: ['air', 'legendary'],
      attacks: [
        {
          // range = the ±40 lu drop window
          damage: 110, vsBaseDamage: 110, intervalMs: 1600, windupPct: 50, range: 40, hitsGround: true, hitsAir: false,
          projectile: { speed: 450, visualId: 'proj.bomb' },
          dmgType: 'blast', sfx: 'bomb_whistle', splashRadius: 50,
        },
      ],
      abilities: [
        { kind: 'bomber', dropWindow: 40 },
        { kind: 'onDeathExplode', damage: 250, radius: 70 },
      ],
      visualId: 'unit.balloon_admiral', sfx: { spawn: 'spawn_legendary', die: 'die_bio' },
      nameKey: 'card.balloon_admiral.name', descKey: 'card.balloon_admiral.desc', strongVs: [], weakVs: [],
    },
  ],
  turrets: [
    {
      // Single target
      id: 'swivel_gun', kind: 'turret', age: 'gunpowder', rarity: 'common', cost: 150,
      attack: {
        damage: 22, intervalMs: 600, windupPct: 0, range: 340, hitsGround: true, hitsAir: true,
        projectile: { speed: 1500, visualId: 'proj.musket' },
        dmgType: 'bullet', sfx: 'shot_musket',
      },
      visualId: 'turret.swivel_gun', nameKey: 'card.swivel_gun.name', descKey: 'card.swivel_gun.desc',
    },
    {
      // Hits the frontmost enemy in range and enemies within 90 lu behind it; max 4 targets
      id: 'grapeshot_gun', kind: 'turret', age: 'gunpowder', rarity: 'common', cost: 175,
      attack: {
        damage: 50, intervalMs: 2000, windupPct: 0, range: 220, hitsGround: true, hitsAir: true,
        projectile: { speed: 1500, visualId: 'proj.grapeshot' },
        dmgType: 'bullet', sfx: 'shot_grapeshot', followBehind: 90, maxTargets: 4,
      },
      visualId: 'turret.grapeshot_gun', nameKey: 'card.grapeshot_gun.name', descKey: 'card.grapeshot_gun.desc',
    },
    {
      // 4 rockets × 55 splash r30 / 5.0 s; scatter ±40 lu (sim RNG); air ×1.5
      id: 'congreve_rack', kind: 'turret', age: 'gunpowder', rarity: 'rare', cost: 250,
      attack: {
        damage: 55, intervalMs: 5000, windupPct: 0, range: 460, hitsGround: true, hitsAir: true,
        projectile: { speed: 900, visualId: 'proj.rocket' },
        dmgType: 'blast', sfx: 'shot_rocket', splashRadius: 30, volley: 4, scatter: 40, mods: damageMods.congreve,
      },
      visualId: 'turret.congreve_rack', nameKey: 'card.congreve_rack.name', descKey: 'card.congreve_rack.desc',
    },
    {
      // Pierces 4 targets total within 200 lu, starting at the frontmost
      id: 'chainshot_cannon', kind: 'turret', age: 'gunpowder', rarity: 'epic', cost: 250,
      attack: {
        damage: 75, intervalMs: 4000, windupPct: 0, range: 400, hitsGround: true, hitsAir: false,
        projectile: { speed: 1200, visualId: 'proj.chainshot' },
        dmgType: 'blunt', sfx: 'shot_cannon', pierce: { count: 4, length: 200 },
      },
      visualId: 'turret.chainshot_cannon', nameKey: 'card.chainshot_cannon.name', descKey: 'card.chainshot_cannon.desc',
    },
  ],
  // SIM_VERSION 5.0.0 contract bump: the frozen fort tables (A16.14.4)
  forts: gunpowderForts,
};
