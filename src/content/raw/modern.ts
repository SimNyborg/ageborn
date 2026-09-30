/**
 * Modern Age (P 2.46): DESIGN A5.5 units and turrets, A14.2 attack mapping.
 * Table units: HP and damage whole, ms, lu, lu/s, gold, bp. Data only. `strongVs`/`weakVs` are
 * filled by the WP1 counter matrix (B4).
 */
import { damageMods } from './economy';
import type { RawAgeTables } from './types';

export const modern: RawAgeTables = {
  age: 'modern',
  units: [
    {
      // Blunt
      id: 'trench_raider', kind: 'unit', age: 'modern', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 50, trainMs: 1500, pop: 2, hp: 394, speed: 75, size: 'small',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 49, intervalMs: 1000, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'slash', sfx: 'swing_whoosh', mods: damageMods.blunt,
        },
      ],
      abilities: [],
      visualId: 'unit.trench_raider', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.trench_raider.name', descKey: 'card.trench_raider.desc', strongVs: [], weakVs: [],
    },
    {
      // Bullet. Suppressing Fire: hits slow the target's move speed 15% for 1.0 s
      id: 'rifleman', kind: 'unit', age: 'modern', rarity: 'common', role: 'ranged', group: 'ranged',
      cost: 75, trainMs: 2000, pop: 3, hp: 234, speed: 65, size: 'small',
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 32, intervalMs: 1000, windupPct: 50, range: 260, hitsGround: true, hitsAir: true,
          projectile: { speed: 1500, visualId: 'proj.bullet' },
          dmgType: 'bullet', sfx: 'shot_rifle',
          onHit: [{ kind: 'slow', magnitudeBp: 1500, durationMs: 1000 }],
        },
      ],
      abilities: [],
      visualId: 'unit.rifleman', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.rifleman.name', descKey: 'card.rifleman.desc', strongVs: [], weakVs: [],
    },
    {
      // Shell
      id: 'tankette', kind: 'unit', age: 'modern', rarity: 'common', role: 'heavy', group: 'heavy',
      cost: 150, trainMs: 4000, pop: 6, hp: 1378, speed: 50, size: 'large',
      tags: ['armored', 'mech', 'ranged', 'ground'],
      attacks: [
        {
          damage: 104, intervalMs: 1500, windupPct: 50, range: 90, hitsGround: true, hitsAir: false,
          projectile: { speed: 1200, visualId: 'proj.shell' },
          dmgType: 'blast', sfx: 'shot_cannon',
        },
      ],
      abilities: [],
      visualId: 'unit.tankette', sfx: { spawn: 'spawn_heavy', die: 'die_mech' },
      nameKey: 'card.tankette.name', descKey: 'card.tankette.desc', strongVs: [], weakVs: [],
    },
    {
      // Rocket; ranged AA mods; priority armored
      id: 'bazooka_trooper', kind: 'unit', age: 'modern', rarity: 'rare', role: 'antiArmor', group: 'antiArmor',
      cost: 100, trainMs: 2500, pop: 4, hp: 330, speed: 65, size: 'medium',
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 64, intervalMs: 1200, windupPct: 50, range: 200, hitsGround: true, hitsAir: true,
          projectile: { speed: 900, visualId: 'proj.rocket' },
          dmgType: 'blast', sfx: 'shot_rocket', mods: damageMods.rangedAntiArmor, priority: 'armored',
        },
      ],
      abilities: [{ kind: 'brace' }],
      visualId: 'unit.bazooka_trooper', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.bazooka_trooper.name', descKey: 'card.bazooka_trooper.desc', strongVs: [], weakVs: [],
    },
    {
      // Every 8 s calls a shell on the nearest enemy ground unit within 400 lu: lands after 1.0 s,
      // 120 splash r50 (area rule). One call-in per side per 3 s. followSupport
      id: 'radio_operator', kind: 'unit', age: 'modern', rarity: 'rare', role: 'support', group: 'support',
      cost: 110, trainMs: 3000, pop: 4, hp: 320, speed: 65, size: 'small',
      tags: ['light', 'bio', 'support', 'ranged', 'ground'],
      attacks: [
        {
          damage: 20, intervalMs: 1200, windupPct: 50, range: 200, hitsGround: true, hitsAir: true,
          projectile: { speed: 1500, visualId: 'proj.bullet' },
          dmgType: 'bullet', sfx: 'shot_rifle',
        },
      ],
      abilities: [
        { kind: 'callStrike', everyMs: 8000, searchRange: 400, delayMs: 1000, damage: 120, radius: 50, sideLockoutMs: 3000 },
        { kind: 'followSupport', behindFront: 60, soloMaxP: 200 },
      ],
      visualId: 'unit.radio_operator', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.radio_operator.name', descKey: 'card.radio_operator.desc', strongVs: [], weakVs: [],
    },
    {
      // Air gunship; obeys stance (A2.7)
      id: 'gyrocopter', kind: 'unit', age: 'modern', rarity: 'epic', role: 'airGunship', group: 'epic',
      cost: 200, trainMs: 4000, pop: 8, hp: 740, speed: 80, size: 'medium',
      tags: ['air', 'mech'],
      attacks: [
        {
          damage: 20, intervalMs: 300, windupPct: 50, range: 150, hitsGround: true, hitsAir: true,
          projectile: { speed: 1500, visualId: 'proj.bullet' },
          dmgType: 'bullet', sfx: 'shot_mg',
        },
      ],
      abilities: [],
      visualId: 'unit.gyrocopter', sfx: { spawn: 'spawn_heavy', die: 'die_mech' },
      nameKey: 'card.gyrocopter.name', descKey: 'card.gyrocopter.desc', strongVs: [], weakVs: [],
    },
    {
      // Main gun 170 splash r40 / 2.5 s at range 240 (G) plus MG 20 / 0.4 s at range 150 (G+A, priority air).
      // Two independent attacks; only the main gun (index 0) stops movement
      id: 'behemoth_tank', kind: 'unit', age: 'modern', rarity: 'legendary', role: 'siegeHeavy', group: 'legendary',
      cost: 350, trainMs: 7000, pop: 14, hp: 4100, speed: 35, size: 'huge',
      tags: ['armored', 'mech', 'legendary', 'ground'],
      attacks: [
        {
          damage: 170, intervalMs: 2500, windupPct: 50, range: 240, hitsGround: true, hitsAir: false,
          projectile: { speed: 1200, visualId: 'proj.shell' },
          dmgType: 'blast', sfx: 'shot_cannon', splashRadius: 40,
        },
        {
          damage: 20, intervalMs: 400, windupPct: 50, range: 150, hitsGround: true, hitsAir: true,
          projectile: { speed: 1500, visualId: 'proj.bullet' },
          dmgType: 'bullet', sfx: 'shot_mg', priority: 'air',
        },
      ],
      abilities: [],
      visualId: 'unit.behemoth_tank', sfx: { spawn: 'spawn_legendary', die: 'die_mech' },
      nameKey: 'card.behemoth_tank.name', descKey: 'card.behemoth_tank.desc', strongVs: [], weakVs: [],
    },
  ],
  turrets: [
    {
      // Single target
      id: 'mg_nest', kind: 'turret', age: 'modern', rarity: 'common', cost: 150,
      attack: {
        damage: 15, intervalMs: 300, windupPct: 0, range: 340, hitsGround: true, hitsAir: true,
        projectile: { speed: 1500, visualId: 'proj.bullet' },
        dmgType: 'bullet', sfx: 'shot_mg',
      },
      visualId: 'turret.mg_nest', nameKey: 'card.mg_nest.name', descKey: 'card.mg_nest.desc',
    },
    {
      // 60 splash r40 / 1.5 s; air ×2.0; priority air
      id: 'flak_gun', kind: 'turret', age: 'modern', rarity: 'common', cost: 175,
      attack: {
        damage: 60, intervalMs: 1500, windupPct: 0, range: 420, hitsGround: true, hitsAir: true,
        projectile: { speed: 1200, visualId: 'proj.flak' },
        dmgType: 'blast', sfx: 'shot_flak', splashRadius: 40, mods: damageMods.flak, priority: 'air',
      },
      visualId: 'turret.flak_gun', nameKey: 'card.flak_gun.name', descKey: 'card.flak_gun.desc',
    },
    {
      // 200 splash r60 / 5.0 s, range 480 (min 180), arc
      id: 'howitzer', kind: 'turret', age: 'modern', rarity: 'rare', cost: 250,
      attack: {
        damage: 200, intervalMs: 5000, windupPct: 0, range: 480, minRange: 180, hitsGround: true, hitsAir: false,
        projectile: { speed: 450, arc: true, visualId: 'proj.shell' },
        dmgType: 'blast', sfx: 'shot_cannon', splashRadius: 60,
      },
      visualId: 'turret.howitzer', nameKey: 'card.howitzer.name', descKey: 'card.howitzer.desc',
    },
    {
      // Priority armored; Mark: target takes +20% damage from all sources for 4 s
      id: 'searchlight_sniper', kind: 'turret', age: 'modern', rarity: 'epic', cost: 250,
      attack: {
        damage: 280, intervalMs: 4000, windupPct: 0, range: 480, hitsGround: true, hitsAir: true,
        projectile: { speed: 1500, visualId: 'proj.bullet' },
        dmgType: 'bullet', sfx: 'shot_rifle', priority: 'armored',
        onHit: [{ kind: 'mark', magnitudeBp: 2000, durationMs: 4000 }],
      },
      visualId: 'turret.searchlight_sniper', nameKey: 'card.searchlight_sniper.name', descKey: 'card.searchlight_sniper.desc',
    },
  ],
};
