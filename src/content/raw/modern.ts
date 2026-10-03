/**
 * Modern Age (P 2.46): DESIGN A5.5 units and turrets, A14.2 attack mapping.
 * Table units: HP and damage whole, ms, lu, lu/s, gold, bp. Data only. `strongVs`/`weakVs` are
 * filled by the WP1 counter matrix (B4).
 */
import type { PowerDef } from '@/contracts/content';
import { damageMods } from './economy';
import { FORT_COST, camp, slow, tower, trap, wall } from './fortKit';
import type { RawAgeTables } from './types';

export const modern: RawAgeTables = {
  age: 'modern',
  units: [
    {
      // Blunt
      id: 'trench_raider', kind: 'unit', age: 'modern', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 50, trainMs: 1500, pop: 2, hp: 394, speed: 75, size: 'small', starter: true,
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
      cost: 75, trainMs: 2000, pop: 3, hp: 234, speed: 65, size: 'small', starter: true,
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
      cost: 150, trainMs: 4000, pop: 6, hp: 1378, speed: 50, size: 'large', starter: true,
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
      cost: 100, trainMs: 2500, pop: 4, hp: 363, speed: 65, size: 'medium', starter: true,
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
      // Main gun 130 splash r40 / 3.5 s at range 240 (G) plus MG 14 / 0.4 s at range 150 (G+A, priority air).
      // Two independent attacks; only the main gun (index 0) stops movement
      id: 'behemoth_tank', kind: 'unit', age: 'modern', rarity: 'legendary', role: 'siegeHeavy', group: 'legendary',
      cost: 350, trainMs: 7000, pop: 14, hp: 2500, speed: 35, size: 'huge',
      tags: ['armored', 'mech', 'legendary', 'ground'],
      attacks: [
        {
          damage: 130, intervalMs: 3500, windupPct: 50, range: 240, hitsGround: true, hitsAir: false,
          projectile: { speed: 1200, visualId: 'proj.shell' },
          dmgType: 'blast', sfx: 'shot_cannon', splashRadius: 40,
        },
        {
          damage: 14, intervalMs: 400, windupPct: 50, range: 150, hitsGround: true, hitsAir: true,
          projectile: { speed: 1500, visualId: 'proj.bullet' },
          dmgType: 'bullet', sfx: 'shot_mg', priority: 'air',
        },
      ],
      abilities: [],
      visualId: 'unit.behemoth_tank', sfx: { spawn: 'spawn_legendary', die: 'die_mech' },
      nameKey: 'card.behemoth_tank.name', descKey: 'card.behemoth_tank.desc', strongVs: [], weakVs: [],
    },
    // ---- W6 Modern wave (content expansion, CONTENT_PLAN 5.6): capsule cards, appended in build order.
    // Commons drop from Arena 2, Rares 3, Epics 4, Legendaries 5 (`cardArena`). Templates: plan 4 (I 394,
    // R 234, H 1,378 at P 2.46). Release gate (`released: false`) until their sheets, sounds and numbers ship.
    {
      // Raider: a crouched sprint in a beret, a combat roll into a rifle-butt swing; fast; ×2 to bases
      id: 'commando', released: false, kind: 'unit', age: 'modern', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 50, trainMs: 1500, pop: 2, hp: 380, speed: 110, size: 'small',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 47, intervalMs: 1000, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'blunt', sfx: 'butt_stroke', vsBaseDamage: 84,
        },
      ],
      abilities: [],
      visualId: 'unit.commando', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.commando.name', descKey: 'card.commando.desc', strongVs: [], weakVs: [],
    },
    {
      // Guard: the shoulder sandbag takes 25% less from attacks with range ≥ 100 (not powers); an overhead slam; Blunt
      id: 'sandbag_carrier', released: false, kind: 'unit', age: 'modern', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 50, trainMs: 1500, pop: 2, hp: 455, speed: 70, size: 'small',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 33, intervalMs: 1000, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'blunt', sfx: 'sandbag_slam', mods: damageMods.blunt,
        },
      ],
      abilities: [{ kind: 'resist', minSourceRange: 100, bp: 2000 }],
      visualId: 'unit.sandbag_carrier', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.sandbag_carrier.name', descKey: 'card.sandbag_carrier.desc', strongVs: [], weakVs: [],
    },
    {
      // Trio (X0 M1): one card trains 3 troopers with submachine guns; stats per trooper (0.40 × Rifleman, +15% damage
      // for the short range 170); cost and pop split evenly
      id: 'smg_squad', released: false, kind: 'unit', age: 'modern', rarity: 'common', role: 'ranged', group: 'ranged',
      cost: 75, trainMs: 2000, pop: 3, hp: 77, speed: 65, size: 'small',
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 11, intervalMs: 1000, windupPct: 50, range: 170, hitsGround: true, hitsAir: true,
          projectile: { speed: 1500, visualId: 'proj.bullet' },
          dmgType: 'bullet', sfx: 'shot_smg',
        },
      ],
      abilities: [],
      squad: { count: 3 },
      visualId: 'unit.smg_squad', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.smg_squad.name', descKey: 'card.smg_squad.desc', strongVs: [], weakVs: [],
    },
    {
      // Thrower: a rifle grenade fired from the planted butt, lobbed over allies, splash r30; ground only
      id: 'rifle_grenadier', released: false, kind: 'unit', age: 'modern', rarity: 'common', role: 'ranged', group: 'ranged',
      cost: 75, trainMs: 2000, pop: 3, hp: 205, speed: 65, size: 'small',
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 36, intervalMs: 1500, windupPct: 50, range: 230, hitsGround: true, hitsAir: false,
          projectile: { speed: 450, arc: true, visualId: 'proj.rifle_grenade' },
          dmgType: 'blast', sfx: 'shot_rifle_grenade', splashRadius: 30,
        },
      ],
      abilities: [],
      visualId: 'unit.rifle_grenadier', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.rifle_grenadier.name', descKey: 'card.rifle_grenadier.desc', strongVs: [], weakVs: [],
    },
    {
      // Gunner Heavy (armored mech): a turretless assault gun, range 90, splash r30; the whole hull recoils
      id: 'assault_gun', released: false, kind: 'unit', age: 'modern', rarity: 'common', role: 'heavy', group: 'heavy',
      cost: 150, trainMs: 4000, pop: 6, hp: 1350, speed: 45, size: 'large',
      tags: ['armored', 'mech', 'ranged', 'ground'],
      attacks: [
        {
          damage: 88, intervalMs: 1500, windupPct: 50, range: 90, hitsGround: true, hitsAir: false,
          projectile: { speed: 1200, visualId: 'proj.shell' },
          dmgType: 'blast', sfx: 'shot_assault_gun', splashRadius: 30,
        },
      ],
      abilities: [],
      visualId: 'unit.assault_gun', sfx: { spawn: 'spawn_heavy', die: 'die_mech' },
      nameKey: 'card.assault_gun.name', descKey: 'card.assault_gun.desc', strongVs: [], weakVs: [],
    },
    {
      // Long range (H6, A5.1): a two-man bipod mortar, an arcing bomb at the target's spot, splash r35; range 380,
      // min 90; half to bases; ground only
      id: 'mortar_team', released: false, kind: 'unit', age: 'modern', rarity: 'rare', role: 'ranged', group: 'ranged',
      cost: 75, trainMs: 2000, pop: 3, hp: 266, speed: 60, size: 'small',
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 124, intervalMs: 2600, windupPct: 50, range: 380, minRange: 90, hitsGround: true, hitsAir: false,
          projectile: { speed: 300, arc: true, visualId: 'proj.mortar_shell' },
          dmgType: 'blast', sfx: 'shot_mortar_team', splashRadius: 35, vsBaseDamage: 50,
        },
      ],
      abilities: [],
      visualId: 'unit.mortar_team', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.mortar_team.name', descKey: 'card.mortar_team.desc', strongVs: [], weakVs: [],
    },
    {
      // Melee Anti-heavy: slaps a sticky charge on the hull, 2.0 s interval; melee AA mods (armored and mech ×3,
      // Legendary ×2, light ×0.75); Brace; priority armored
      id: 'sticky_bomber', released: false, kind: 'unit', age: 'modern', rarity: 'rare', role: 'antiArmor', group: 'antiArmor',
      cost: 100, trainMs: 2500, pop: 4, hp: 580, speed: 70, size: 'medium',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 110, intervalMs: 2000, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'blast', sfx: 'sticky_thunk', mods: damageMods.meleeAntiArmor, priority: 'armored',
        },
      ],
      abilities: [{ kind: 'brace' }],
      visualId: 'unit.sticky_bomber', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.sticky_bomber.name', descKey: 'card.sticky_bomber.desc', strongVs: [], weakVs: [],
    },
    {
      // Heal: 74 HP/s split between the 2 lowest-HP% allies within 160 lu; a sidearm pop; followSupport. A plain
      // cream armband disc, never a red cross (a protected emblem)
      id: 'combat_medic', released: false, kind: 'unit', age: 'modern', rarity: 'rare', role: 'support', group: 'support',
      cost: 110, trainMs: 3000, pop: 4, hp: 330, speed: 65, size: 'small',
      tags: ['light', 'bio', 'support', 'ranged', 'ground'],
      attacks: [
        {
          damage: 22, intervalMs: 1200, windupPct: 50, range: 150, hitsGround: true, hitsAir: true,
          projectile: { speed: 1500, visualId: 'proj.bullet' },
          dmgType: 'bullet', sfx: 'shot_pistol',
        },
      ],
      abilities: [
        { kind: 'heal', hpPerSec: 67, radius: 160, targets: 2, pulseMs: 500 },
        { kind: 'followSupport', behindFront: 60, soloMaxP: 200 },
      ],
      visualId: 'unit.combat_medic', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.combat_medic.name', descKey: 'card.combat_medic.desc', strongVs: [], weakVs: [],
    },
    {
      // Frenzy (X0 M2): a boxing combo; below 50% HP he rolls up his sleeves: +30% damage, +20% attack speed
      id: 'bulldog_sergeant', released: false, kind: 'unit', age: 'modern', rarity: 'rare', role: 'infantry', group: 'infantry',
      cost: 50, trainMs: 1500, pop: 2, hp: 415, speed: 75, size: 'small',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 42, intervalMs: 1000, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'blunt', sfx: 'boxing_jab',
        },
      ],
      abilities: [{ kind: 'frenzy', belowHpBp: 5000, damageBp: 3000, attackSpeedBp: 2000 }],
      visualId: 'unit.bulldog_sergeant', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.bulldog_sergeant.name', descKey: 'card.bulldog_sergeant.desc', strongVs: [], weakVs: [],
    },
    {
      // Air bomber: never stops, ignores Hold; dives and drops 66 splash r40 every 2.0 s on ground enemies within
      // ±40 lu below; 80 per bomb on the base at the enemy gate
      id: 'dive_bomber', released: false, kind: 'unit', age: 'modern', rarity: 'epic', role: 'airBomber', group: 'epic',
      cost: 200, trainMs: 4000, pop: 8, hp: 800, speed: 80, size: 'medium',
      tags: ['air', 'mech'],
      attacks: [
        {
          // range = the ±40 lu drop window
          damage: 66, vsBaseDamage: 80, intervalMs: 2000, windupPct: 50, range: 40, hitsGround: true, hitsAir: false,
          projectile: { speed: 450, visualId: 'proj.bomb' },
          dmgType: 'blast', sfx: 'dive_whistle', splashRadius: 40,
        },
      ],
      abilities: [{ kind: 'bomber', dropWindow: 40 }],
      visualId: 'unit.dive_bomber', sfx: { spawn: 'spawn_heavy', die: 'die_mech' },
      nameKey: 'card.dive_bomber.name', descKey: 'card.dive_bomber.desc', strongVs: [], weakVs: [],
    },
    {
      // Siege (armored mech): goes for the base, blade 220 vs the base (and forts) every 2.0 s; 28 vs units only
      // while they block it
      id: 'bulldozer', released: false, kind: 'unit', age: 'modern', rarity: 'epic', role: 'siege', group: 'epic',
      cost: 200, trainMs: 4000, pop: 8, hp: 1600, speed: 45, size: 'large',
      tags: ['armored', 'mech', 'melee', 'ground'],
      attacks: [
        {
          damage: 28, vsBaseDamage: 220, intervalMs: 2000, windupPct: 40, range: 12, hitsGround: true, hitsAir: false,
          dmgType: 'blunt', sfx: 'dozer_shove',
        },
      ],
      abilities: [{ kind: 'siegeOnly' }],
      visualId: 'unit.bulldozer', sfx: { spawn: 'spawn_heavy', die: 'die_mech' },
      nameKey: 'card.bulldozer.name', descKey: 'card.bulldozer.desc', strongVs: [], weakVs: [],
    },
    {
      // Sniper: 180 every 4.0 s, range 360, ground and air, picks the back line first (ranged and support)
      id: 'ghillie_sniper', released: false, kind: 'unit', age: 'modern', rarity: 'epic', role: 'ranged', group: 'epic',
      cost: 200, trainMs: 4000, pop: 8, hp: 640, speed: 55, size: 'small',
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 180, intervalMs: 4000, windupPct: 50, range: 360, hitsGround: true, hitsAir: true,
          projectile: { speed: 1500, visualId: 'proj.bullet' },
          dmgType: 'bullet', sfx: 'shot_ghillie', priority: 'backline',
        },
      ],
      abilities: [],
      visualId: 'unit.ghillie_sniper', sfx: { spawn: 'spawn_heavy', die: 'die_bio' },
      nameKey: 'card.ghillie_sniper.name', descKey: 'card.ghillie_sniper.desc', strongVs: [], weakVs: [],
    },
    {
      // Legendary heavy bomber: never stops; a stick of bombs, 100 splash r50 every 1.6 s on ground enemies within
      // ±40 lu below (130 per bomb on the base); 2 waist gunners 12 / 0.4 s, range 160, ground and air, priority
      // air (their own targets, not the bomb window); when it falls it crashes for 270 splash r70 on ground enemies
      // and the 2 gunners bail out as Riflemen (summoned)
      id: 'sky_fortress', released: false, kind: 'unit', age: 'modern', rarity: 'legendary', role: 'airBomber', group: 'legendary',
      cost: 350, trainMs: 7000, pop: 14, hp: 1270, speed: 40, size: 'huge',
      tags: ['air', 'mech', 'legendary'],
      attacks: [
        {
          damage: 70, vsBaseDamage: 130, intervalMs: 1600, windupPct: 50, range: 40, hitsGround: true, hitsAir: false,
          projectile: { speed: 450, visualId: 'proj.bomb' },
          dmgType: 'blast', sfx: 'bomb_stick', splashRadius: 50,
        },
      ],
      abilities: [
        { kind: 'bomber', dropWindow: 40 },
        {
          kind: 'riders', count: 2, onDeathSpawn: 'rifleman',
          attack: {
            damage: 6, intervalMs: 600, windupPct: 50, range: 160, hitsGround: true, hitsAir: true,
            projectile: { speed: 1500, visualId: 'proj.bullet' },
            dmgType: 'bullet', sfx: 'shot_mg', priority: 'air',
          },
        },
        { kind: 'onDeathExplode', damage: 270, radius: 70 },
      ],
      visualId: 'unit.sky_fortress', sfx: { spawn: 'spawn_legendary', die: 'die_mech' },
      nameKey: 'card.sky_fortress.name', descKey: 'card.sky_fortress.desc', strongVs: [], weakVs: [],
    },
  ],
  turrets: [
    {
      // Single target
      id: 'mg_nest', kind: 'turret', age: 'modern', rarity: 'common', starter: true, cost: 150,
      attack: {
        damage: 15, intervalMs: 300, windupPct: 0, range: 340, hitsGround: true, hitsAir: true,
        projectile: { speed: 1500, visualId: 'proj.bullet' },
        dmgType: 'bullet', sfx: 'shot_mg',
      },
      visualId: 'turret.mg_nest', nameKey: 'card.mg_nest.name', descKey: 'card.mg_nest.desc',
    },
    {
      // 60 splash r40 / 1.5 s; air ×2.0; priority air
      id: 'flak_gun', kind: 'turret', age: 'modern', rarity: 'common', starter: true, cost: 175,
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
    {
      // W6 Modern wave. Breaker: a long-barrelled anti-tank gun, 110 every 2.5 s at the nearest armored ground enemy
      // in range (else the front); ground only
      id: 'anti_tank_gun', released: false, kind: 'turret', age: 'modern', rarity: 'common', cost: 175,
      attack: {
        damage: 110, intervalMs: 2500, windupPct: 0, range: 320, hitsGround: true, hitsAir: false,
        projectile: { speed: 1200, visualId: 'proj.shell' },
        dmgType: 'pierce', sfx: 'shot_at_gun', priority: 'armored',
      },
      visualId: 'turret.anti_tank_gun', nameKey: 'card.anti_tank_gun.name', descKey: 'card.anti_tank_gun.desc',
    },
    {
      // W6 Modern wave. Rockets: a truck rack ripples 6 rockets every 6.0 s, each 74 splash r35 landing within ±50 lu
      // of the aim (sim RNG); range 460; ground only
      id: 'rocket_battery', released: false, kind: 'turret', age: 'modern', rarity: 'rare', cost: 250,
      attack: {
        damage: 74, intervalMs: 6000, windupPct: 0, range: 460, hitsGround: true, hitsAir: false,
        projectile: { speed: 900, visualId: 'proj.rocket' },
        dmgType: 'blast', sfx: 'rocket_ripple', splashRadius: 35, volley: 6, scatter: 50,
      },
      visualId: 'turret.rocket_battery', nameKey: 'card.rocket_battery.name', descKey: 'card.rocket_battery.desc',
    },
  ],
  // A16.14.4 Forts (Modern, P 2.46): War Path L4 camp, L6 trap, L8 tower; Road fort set at 2,900. The
  // Sandbag Bunker (175 gold) covers own ground units within 60 lu behind it: −20% from attacks with range ≥ 100
  forts: [
    wall('modern', 'sandbag_bunker', { cost: FORT_COST.bunker, cover: { behindLu: 60, rangedTakenBp: 2000 } }),
    tower('modern', 'pillbox', { warPath: 8, road: 2900 }),
    camp('modern', 'forward_base', 'conscript', { warPath: 4, road: 2900 }),
    trap('modern', 'minefield', { warPath: 6, road: 2900 }, { charges: 2, damage: 130, radius: 40 }),
    // W6 Modern wave variants: a ranged camp (its levy, the Rifle Levy, is 35% of the Rifleman, every 12 s; War
    // Path Modern s2) and a chip trap (4 charges × 79 = 0.2 × the Trench Raider, each slowing 40% for 2 s; the
    // Modern 20-star milestone). Road fallback 4,600. Release gate until their art ships.
    { ...camp('modern', 'rifle_depot', 'rifle_levy', { side: 2, road: 4600 }, { levyFrom: { group: 'ranged', hpBp: 3500, damageBp: 3500 }, everyMs: 12000, maxAlive: 1 }), released: false },
    { ...trap('modern', 'wire_snare', { stars: 20, road: 4600 }, { charges: 4, damage: 79, statuses: [slow(4000, 2000)] }), released: false },
  ],
};

/**
 * W6 Modern wave powers (CONTENT_PLAN 5.6; values at P 2.46 and L1 loadouts; I 394, H 1,378). The age's first six
 * powers live in `powers.ts`. Release gate (`released: false`) until their art and sounds ship.
 */
export const modernPowers: readonly PowerDef[] = [
  {
    // The H7 lane volley (A2.9.4 `lane`, A5.7 whole-lane powers): War Path Modern L3 (Road 3,700). No aim: one pulse
    // touches the 8 hittable enemies nearest your gate anywhere on the lane, ground and air, one shell each, for 110
    // (28% of the Trench Raider; the lane cap is 30%). 50 gold, 25 s
    id: 'creeping_barrage', released: false, kind: 'power', age: 'modern', slot: 'field', reach: 'lane', family: 'volley', rarity: 'rare',
    source: 'warPath', warPathLevel: 3, road: 3700, cost: 50, reloadMs: 25000, telegraphMs: 1000, maxTargets: 8,
    effect: { kind: 'field', zone: 2000, durationMs: 0, hitsAir: true, damagePerPulse: 110 },
    visualId: 'power.creeping_barrage', sfx: 'pw_barrage', nameKey: 'card.creeping_barrage.name', descKey: 'card.creeping_barrage.desc',
  },
  {
    // The new Home control (stun, A5.7 family budget): War Path Modern side node s1 (Road 4,600). Muffled shell bursts
    // with shock rings over a 350 lu zone, one pulse, ground only: 175 and a 2.0 s stun with the dizzy look (not the
    // clock freeze); cap 6. 12 disabled unit-seconds per cast
    id: 'concussion_shells', released: false, kind: 'power', age: 'modern', slot: 'home', reach: 'home', family: 'stun', rarity: 'epic',
    source: 'warPath', warPathSide: 1, road: 4600, cost: 75, reloadMs: 35000, telegraphMs: 1000, maxTargets: 6, aiValueBp: 5000,
    effect: {
      kind: 'field', zone: 350, durationMs: 0, hitsAir: false, damagePerPulse: 200,
      statuses: [{ kind: 'stun', magnitudeBp: 10000, durationMs: 2000, frozen: false }],
    },
    visualId: 'power.concussion_shells', sfx: 'pw_concussion', nameKey: 'card.concussion_shells.name', descKey: 'card.concussion_shells.desc',
  },
];
