/**
 * Future Age (P 3.32): DESIGN A5.6 units and turrets, A14.2 attack mapping; the W7 Future wave (CONTENT_PLAN 5.7).
 * The tutorial-only Training Dummy listed under A5.6 is a Stone card and lives in `stone.ts`.
 * Table units: HP and damage whole, ms, lu, lu/s, gold, bp. Data only. `strongVs`/`weakVs` are
 * filled by the WP1 counter matrix (B4).
 */
import type { PowerDef } from '@/contracts/content';
import { antiHeavyMods, damageMods } from './economy';
import { camp, slow, tower, trap, wall } from './fortKit';
import type { RawAgeTables } from './types';

export const future: RawAgeTables = {
  age: 'future',
  units: [
    {
      // 470 HP (+90 shield). Blunt; innate shield 90, regenerates 30/s after 3 s without damage
      id: 'photon_knight', kind: 'unit', age: 'future', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 50, trainMs: 1500, pop: 2, hp: 470, speed: 75, size: 'small', starter: true,
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 66, intervalMs: 1000, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'laser', sfx: 'swing_whoosh', mods: damageMods.blunt,
        },
      ],
      abilities: [{ kind: 'innateShield', amount: 90, regenPerSec: 30, delayMs: 3000 }],
      visualId: 'unit.photon_knight', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.photon_knight.name', descKey: 'card.photon_knight.desc', strongVs: [], weakVs: [],
    },
    {
      // Plasma bolt
      id: 'pulse_trooper', kind: 'unit', age: 'future', rarity: 'common', role: 'ranged', group: 'ranged',
      cost: 75, trainMs: 2000, pop: 3, hp: 315, speed: 65, size: 'small', starter: true,
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 43, intervalMs: 1000, windupPct: 50, range: 260, hitsGround: true, hitsAir: true,
          projectile: { speed: 1800, visualId: 'proj.plasma' },
          dmgType: 'laser', sfx: 'shot_plasma',
        },
      ],
      abilities: [],
      visualId: 'unit.pulse_trooper', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.pulse_trooper.name', descKey: 'card.pulse_trooper.desc', strongVs: [], weakVs: [],
    },
    {
      // Reach
      id: 'walker_mech', kind: 'unit', age: 'future', rarity: 'common', role: 'heavy', group: 'heavy',
      cost: 150, trainMs: 4000, pop: 6, hp: 1860, speed: 50, size: 'large', starter: true,
      tags: ['armored', 'mech', 'melee', 'ground'],
      attacks: [
        {
          damage: 140, intervalMs: 1500, windupPct: 40, range: 60, hitsGround: true, hitsAir: false,
          dmgType: 'blunt', sfx: 'swing_whoosh',
        },
      ],
      abilities: [],
      visualId: 'unit.walker_mech', sfx: { spawn: 'spawn_heavy', die: 'die_mech' },
      nameKey: 'card.walker_mech.name', descKey: 'card.walker_mech.desc', strongVs: [], weakVs: [],
    },
    {
      // Instant rail; pierces 2 targets total within 150 lu; ranged AA mods; priority armored
      id: 'rail_gunner', kind: 'unit', age: 'future', rarity: 'rare', role: 'antiArmor', group: 'antiArmor',
      cost: 100, trainMs: 2500, pop: 4, hp: 440, speed: 65, size: 'medium', starter: true,
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 86, intervalMs: 1200, windupPct: 50, range: 240, hitsGround: true, hitsAir: true,
          projectile: { instant: true, effectId: 'fx.beam_rail' },
          dmgType: 'laser', sfx: 'shot_rail', pierce: { count: 2, length: 150 },
          mods: antiHeavyMods.rail, priority: 'armored',
        },
      ],
      abilities: [{ kind: 'brace' }],
      visualId: 'unit.rail_gunner', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.rail_gunner.name', descKey: 'card.rail_gunner.desc', strongVs: [], weakVs: [],
    },
    {
      // No attack (Hits: none). Heals 100 HP/s split between the 2 lowest-HP% allies within 160 lu
      // (range 160; A14.2: fx.heal_beam, heal_tick); followSupport
      id: 'repair_drone', kind: 'unit', age: 'future', rarity: 'rare', role: 'support', group: 'support',
      cost: 110, trainMs: 3000, pop: 4, hp: 430, speed: 70, size: 'small',
      tags: ['air', 'mech', 'support'],
      attacks: [],
      abilities: [
        { kind: 'heal', hpPerSec: 100, radius: 160, targets: 2, pulseMs: 500 },
        { kind: 'followSupport', behindFront: 60, soloMaxP: 200 },
      ],
      visualId: 'unit.repair_drone', sfx: { spawn: 'spawn_pop', die: 'die_mech' },
      nameKey: 'card.repair_drone.name', descKey: 'card.repair_drone.desc', strongVs: [], weakVs: [],
    },
    {
      // EMP every 8 s when an enemy is within 120 lu: strips temporary and innate shields from all enemies
      // within 120 lu (restarting their regen delay) and stuns mech enemies within 120 lu, air included, for 1.5 s
      id: 'emp_saboteur', kind: 'unit', age: 'future', rarity: 'epic', role: 'antiMech', group: 'epic',
      cost: 200, trainMs: 4000, pop: 8, hp: 700, speed: 85, size: 'medium',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 50, intervalMs: 1000, windupPct: 40, range: 12, hitsGround: true, hitsAir: false,
          dmgType: 'laser', sfx: 'swing_whoosh',
        },
      ],
      abilities: [{ kind: 'emp', everyMs: 8000, triggerRadius: 120, radius: 120, stunMs: 1500 }],
      visualId: 'unit.emp_saboteur', sfx: { spawn: 'spawn_heavy', die: 'die_bio' },
      nameKey: 'card.emp_saboteur.name', descKey: 'card.emp_saboteur.desc', strongVs: [], weakVs: [],
    },
    {
      // 190 / 1.6 s, cleave: 3 targets total within 60 lu. Time Stop when an enemy first comes within 200 lu
      // and every 20 s after: enemies within 200 lu (air included) are frozen 1.5 s (Legendaries 0.75 s)
      id: 'chrono_titan', kind: 'unit', age: 'future', rarity: 'legendary', role: 'siegeHeavy', group: 'legendary',
      cost: 350, trainMs: 7000, pop: 14, hp: 4500, speed: 35, size: 'huge',
      tags: ['armored', 'mech', 'melee', 'legendary', 'ground'],
      attacks: [
        {
          damage: 190, intervalMs: 1600, windupPct: 40, range: 60, hitsGround: true, hitsAir: false,
          dmgType: 'blunt', sfx: 'swing_whoosh', cleave: { count: 3, reach: 60 },
        },
      ],
      abilities: [{ kind: 'timeStop', everyMs: 20000, radius: 200, freezeMs: 1500, legendaryFreezeMs: 750 }],
      visualId: 'unit.chrono_titan', sfx: { spawn: 'spawn_legendary', die: 'die_mech' },
      nameKey: 'card.chrono_titan.name', descKey: 'card.chrono_titan.desc', strongVs: [], weakVs: [],
    },
    // ---- W7 Future wave (content expansion, CONTENT_PLAN 5.7): capsule cards, appended in build order.
    // Commons drop from Arena 2 (the Future age first drops in Arena 3, so Arena 3 in practice), Rares 3, Epics 4,
    // Legendaries 5 (`cardArena`). Templates: plan 4 (I 470 + 90 shield, R 315, H 1,860 at P 3.32).
    {
      // Pair (X0 M1): one card trains 2 androids; stats per android, cost and pop split evenly; Blunt. Tagged
      // light bio like the age's soldiers (synthetic, but not a mech for the Anti-heavy and EMP rules)
      id: 'android_pair', kind: 'unit', age: 'future', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 50, trainMs: 1500, pop: 2, hp: 328, speed: 85, size: 'small',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 40, intervalMs: 1000, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'blunt', sfx: 'baton_spin', mods: damageMods.blunt,
        },
      ],
      abilities: [],
      squad: { count: 2 },
      visualId: 'unit.android_pair', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.android_pair.name', descKey: 'card.android_pair.desc', strongVs: [], weakVs: [],
    },
    {
      // Guard: the hardlight shield takes 25% less from attacks with range ≥ 100 (not powers); Blunt
      id: 'barrier_trooper', kind: 'unit', age: 'future', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 50, trainMs: 1500, pop: 2, hp: 650, speed: 70, size: 'small',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 47, intervalMs: 1000, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'laser', sfx: 'shield_pulse', mods: damageMods.blunt,
        },
      ],
      abilities: [{ kind: 'resist', minSourceRange: 100, bp: 2500 }],
      visualId: 'unit.barrier_trooper', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.barrier_trooper.name', descKey: 'card.barrier_trooper.desc', strongVs: [], weakVs: [],
    },
    {
      // Raider: a hover bike at 110 lu/s; ×2 to bases
      id: 'hover_bike', kind: 'unit', age: 'future', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 50, trainMs: 1500, pop: 2, hp: 545, speed: 110, size: 'medium',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 66, intervalMs: 1000, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'laser', sfx: 'lance_swipe', vsBaseDamage: 100,
        },
      ],
      abilities: [],
      visualId: 'unit.hover_bike', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.hover_bike.name', descKey: 'card.hover_bike.desc', strongVs: [], weakVs: [],
    },
    {
      // Skirmisher: twin barrels stitch light needles, 13 every 0.5 s, range 220, ground and air
      id: 'needle_gunner', kind: 'unit', age: 'future', rarity: 'common', role: 'ranged', group: 'ranged',
      cost: 75, trainMs: 2000, pop: 3, hp: 250, speed: 75, size: 'small',
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 13, intervalMs: 500, windupPct: 50, range: 220, hitsGround: true, hitsAir: true,
          projectile: { speed: 1800, visualId: 'proj.needle' },
          dmgType: 'laser', sfx: 'shot_needle',
        },
      ],
      abilities: [],
      visualId: 'unit.needle_gunner', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.needle_gunner.name', descKey: 'card.needle_gunner.desc', strongVs: [], weakVs: [],
    },
    {
      // Brute (armored mech): a double pincer snap, cleave 2 (reach 30); no first-hit bonus
      id: 'crab_mech', kind: 'unit', age: 'future', rarity: 'common', role: 'heavy', group: 'heavy',
      cost: 150, trainMs: 4000, pop: 6, hp: 2000, speed: 45, size: 'large',
      tags: ['armored', 'mech', 'melee', 'ground'],
      attacks: [
        {
          damage: 112, intervalMs: 1500, windupPct: 40, range: 20, hitsGround: true, hitsAir: false,
          dmgType: 'blunt', sfx: 'pincer_snap', cleave: { count: 2, reach: 30 },
        },
      ],
      abilities: [],
      visualId: 'unit.crab_mech', sfx: { spawn: 'spawn_heavy', die: 'die_mech' },
      nameKey: 'card.crab_mech.name', descKey: 'card.crab_mech.desc', strongVs: [], weakVs: [],
    },
    {
      // Long range (H6, A5.1): a glowing shell lobbed high at the target's spot, splash r35; range 380, min 90; half to
      // bases; ground only
      id: 'arc_lobber', kind: 'unit', age: 'future', rarity: 'rare', role: 'ranged', group: 'ranged',
      cost: 75, trainMs: 2000, pop: 3, hp: 360, speed: 60, size: 'small',
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 172, intervalMs: 2600, windupPct: 50, range: 380, minRange: 90, hitsGround: true, hitsAir: false,
          projectile: { speed: 300, arc: true, visualId: 'proj.arc_shell' },
          dmgType: 'blast', sfx: 'shot_lobber', splashRadius: 35, vsBaseDamage: 70,
        },
      ],
      abilities: [],
      visualId: 'unit.arc_lobber', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.arc_lobber.name', descKey: 'card.arc_lobber.desc', strongVs: [], weakVs: [],
    },
    {
      // Melee Anti-heavy: a crackling plasma lance, reach 60; melee AA mods (armored and mech ×3, Legendary ×2,
      // light ×0.75); Brace; priority armored
      id: 'plasma_lancer', kind: 'unit', age: 'future', rarity: 'rare', role: 'antiArmor', group: 'antiArmor',
      cost: 100, trainMs: 2500, pop: 4, hp: 800, speed: 70, size: 'medium',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 100, intervalMs: 1200, windupPct: 40, range: 60, hitsGround: true, hitsAir: false,
          dmgType: 'laser', sfx: 'lance_crackle', mods: damageMods.meleeAntiArmor, priority: 'armored',
        },
      ],
      abilities: [{ kind: 'brace' }],
      visualId: 'unit.plasma_lancer', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.plasma_lancer.name', descKey: 'card.plasma_lancer.desc', strongVs: [], weakVs: [],
    },
    {
      // Aura: allies within 160 lu attack 20% faster; a multitool zap beam hits the target; followSupport
      id: 'overclock_engineer', kind: 'unit', age: 'future', rarity: 'rare', role: 'support', group: 'support',
      cost: 110, trainMs: 3000, pop: 4, hp: 610, speed: 65, size: 'small',
      tags: ['light', 'bio', 'support', 'ranged', 'ground'],
      attacks: [
        {
          damage: 56, intervalMs: 1200, windupPct: 50, range: 150, hitsGround: true, hitsAir: true,
          projectile: { instant: true, effectId: 'fx.zap_beam' },
          dmgType: 'laser', sfx: 'multitool_zap',
        },
      ],
      abilities: [
        { kind: 'aura', radius: 160, status: { kind: 'attackSpeedBuff', magnitudeBp: 2000, durationMs: 0 } },
        { kind: 'followSupport', behindFront: 60, soloMaxP: 200 },
      ],
      visualId: 'unit.overclock_engineer', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.overclock_engineer.name', descKey: 'card.overclock_engineer.desc', strongVs: [], weakVs: [],
    },
    {
      // Summoner (X0 M3): projects a Holo Decoy every 6 s, at most 3; a light-pulse shot; followSupport
      id: 'holo_projector', kind: 'unit', age: 'future', rarity: 'rare', role: 'support', group: 'support',
      cost: 110, trainMs: 3000, pop: 4, hp: 430, speed: 65, size: 'small',
      tags: ['light', 'bio', 'support', 'ranged', 'ground'],
      attacks: [
        {
          damage: 40, intervalMs: 1200, windupPct: 50, range: 150, hitsGround: true, hitsAir: true,
          projectile: { speed: 1800, visualId: 'proj.plasma' },
          dmgType: 'laser', sfx: 'shot_holo',
        },
      ],
      abilities: [
        { kind: 'summon', card: 'holo_decoy', firstMs: 2000, everyMs: 6000, maxAlive: 3 },
        { kind: 'followSupport', behindFront: 60, soloMaxP: 200 },
      ],
      visualId: 'unit.holo_projector', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.holo_projector.name', descKey: 'card.holo_projector.desc', strongVs: [], weakVs: [],
    },
    {
      // Air gunship: a beam rifle, 46 every 0.6 s, range 160, ground and air; obeys stance
      id: 'jetpack_trooper', kind: 'unit', age: 'future', rarity: 'epic', role: 'airGunship', group: 'epic',
      cost: 200, trainMs: 4000, pop: 8, hp: 950, speed: 80, size: 'medium',
      tags: ['air', 'bio'],
      attacks: [
        {
          damage: 46, intervalMs: 600, windupPct: 50, range: 160, hitsGround: true, hitsAir: true,
          projectile: { speed: 1800, visualId: 'proj.plasma' },
          dmgType: 'laser', sfx: 'shot_jet_beam',
        },
      ],
      abilities: [],
      visualId: 'unit.jetpack_trooper', sfx: { spawn: 'spawn_heavy', die: 'die_bio' },
      nameKey: 'card.jetpack_trooper.name', descKey: 'card.jetpack_trooper.desc', strongVs: [], weakVs: [],
    },
    {
      // Artillery (armored mech): an instant particle beam pierces 3 targets within 200 lu, 200 every 3.5 s,
      // range 300 (min 60); ground only
      id: 'particle_cannon', kind: 'unit', age: 'future', rarity: 'epic', role: 'siege', group: 'epic',
      cost: 200, trainMs: 4000, pop: 8, hp: 1500, speed: 45, size: 'large',
      tags: ['armored', 'mech', 'ranged', 'ground'],
      attacks: [
        {
          damage: 200, intervalMs: 3500, windupPct: 50, range: 300, minRange: 60, hitsGround: true, hitsAir: false,
          projectile: { instant: true, effectId: 'fx.particle_beam' },
          dmgType: 'laser', sfx: 'shot_particle', pierce: { count: 3, length: 200 },
        },
      ],
      abilities: [],
      visualId: 'unit.particle_cannon', sfx: { spawn: 'spawn_heavy', die: 'die_mech' },
      nameKey: 'card.particle_cannon.name', descKey: 'card.particle_cannon.desc', strongVs: [], weakVs: [],
    },
    {
      // Brawler (armored mech): dual energy fists, 90 every 0.9 s. Overload (X0 M2): below 50% HP +35% damage and
      // +25% attack speed (the A18.2 caps)
      id: 'overload_android', kind: 'unit', age: 'future', rarity: 'epic', role: 'skirmisher', group: 'epic',
      cost: 200, trainMs: 4000, pop: 8, hp: 1700, speed: 60, size: 'medium',
      tags: ['armored', 'mech', 'melee', 'ground'],
      attacks: [
        {
          damage: 90, intervalMs: 900, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'blunt', sfx: 'robot_punch',
        },
      ],
      abilities: [{ kind: 'frenzy', belowHpBp: 5000, damageBp: 3500, attackSpeedBp: 2500 }],
      visualId: 'unit.overload_android', sfx: { spawn: 'spawn_heavy', die: 'die_mech' },
      nameKey: 'card.overload_android.name', descKey: 'card.overload_android.desc', strongVs: [], weakVs: [],
    },
    {
      // Legendary carrier (ground, armored mech): a point-defence laser, 40 every 0.5 s, range 200, ground and air;
      // launches an Attack Drone (X0 M3, an air summon) every 7 s, at most 2
      id: 'drone_carrier', kind: 'unit', age: 'future', rarity: 'legendary', role: 'siegeHeavy', group: 'legendary',
      cost: 350, trainMs: 7000, pop: 14, hp: 1900, speed: 35, size: 'huge',
      tags: ['armored', 'mech', 'ranged', 'legendary', 'ground'],
      attacks: [
        {
          damage: 40, intervalMs: 500, windupPct: 50, range: 200, hitsGround: true, hitsAir: true,
          projectile: { instant: true, effectId: 'fx.beam_laser' },
          dmgType: 'laser', sfx: 'shot_pd_laser',
        },
      ],
      abilities: [{ kind: 'summon', card: 'attack_drone', firstMs: 2000, everyMs: 7000, maxAlive: 2 }],
      visualId: 'unit.drone_carrier', sfx: { spawn: 'spawn_legendary', die: 'die_mech' },
      nameKey: 'card.drone_carrier.name', descKey: 'card.drone_carrier.desc', strongVs: [], weakVs: [],
    },
    {
      // Holo Projector's summon (X0 M3): a flickering hologram of a Photon Knight; 1 damage, it draws fire; no pop,
      // no bounty, always marches
      id: 'holo_decoy', kind: 'unit', age: 'future', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 0, trainMs: 1500, pop: 2, hp: 320, speed: 75, size: 'small',
      tags: ['light', 'mech', 'melee', 'ground'],
      attacks: [
        {
          damage: 1, intervalMs: 1000, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'laser', sfx: 'holo_flicker',
        },
      ],
      abilities: [],
      visualId: 'unit.holo_decoy', sfx: { spawn: 'spawn_pop', die: 'die_mech' },
      nameKey: 'card.holo_decoy.name', descKey: 'card.holo_decoy.desc', strongVs: [], weakVs: [],
      hidden: true, summon: true, aiValue: 12,
    },
    {
      // Drone Carrier's summon (X0 M3, flying): a small attack drone (about 30% of a Gyrocopter at P 3.32), 8 every
      // 0.3 s, range 150, ground and air; no pop, no bounty, always flies forward
      id: 'attack_drone', kind: 'unit', age: 'future', rarity: 'epic', role: 'airGunship', group: 'epic',
      cost: 0, trainMs: 4000, pop: 8, hp: 300, speed: 90, size: 'small',
      tags: ['air', 'mech'],
      attacks: [
        {
          damage: 8, intervalMs: 300, windupPct: 50, range: 150, hitsGround: true, hitsAir: true,
          projectile: { speed: 1800, visualId: 'proj.plasma' },
          dmgType: 'laser', sfx: 'shot_drone',
        },
      ],
      abilities: [],
      visualId: 'unit.attack_drone', sfx: { spawn: 'spawn_heavy', die: 'die_mech' },
      nameKey: 'card.attack_drone.name', descKey: 'card.attack_drone.desc', strongVs: [], weakVs: [],
      hidden: true, summon: true, aiValue: 40,
    },
  ],
  turrets: [
    {
      // Instant beam
      id: 'pulse_laser', kind: 'turret', age: 'future', rarity: 'common', starter: true, cost: 150,
      attack: {
        damage: 20, intervalMs: 300, windupPct: 0, range: 360, hitsGround: true, hitsAir: true,
        projectile: { instant: true, effectId: 'fx.beam_laser' },
        dmgType: 'laser', sfx: 'shot_laser',
      },
      visualId: 'turret.pulse_laser', nameKey: 'card.pulse_laser.name', descKey: 'card.pulse_laser.desc',
    },
    {
      // Chains to 3 targets total (each ≤ 100 lu from the previous)
      id: 'arc_coil', kind: 'turret', age: 'future', rarity: 'common', starter: true, cost: 175,
      attack: {
        damage: 60, intervalMs: 1800, windupPct: 0, range: 260, hitsGround: true, hitsAir: true,
        projectile: { instant: true, effectId: 'fx.arc_chain' },
        dmgType: 'laser', sfx: 'shot_arc', chain: { count: 3, hop: 100 },
      },
      visualId: 'turret.arc_coil', nameKey: 'card.arc_coil.name', descKey: 'card.arc_coil.desc',
    },
    {
      // 270 splash r60 / 5.0 s, range 480 (min 180), arc
      id: 'plasma_mortar', kind: 'turret', age: 'future', rarity: 'rare', cost: 250,
      attack: {
        damage: 270, intervalMs: 5000, windupPct: 0, range: 480, minRange: 180, hitsGround: true, hitsAir: false,
        projectile: { speed: 450, arc: true, visualId: 'proj.plasma_mortar' },
        dmgType: 'blast', sfx: 'shot_plasma', splashRadius: 60,
      },
      visualId: 'turret.plasma_mortar', nameKey: 'card.plasma_mortar.name', descKey: 'card.plasma_mortar.desc',
    },
    {
      // Priority densest. Damage hits up to 4 ground enemies within 90 lu of impact (area rule). Every ground
      // enemy within 90 lu is pulled 60% of the way to the centre and slowed 50% for 2.5 s
      // (`onHit` with `pull`: the slow applies to every pulled enemy, not only the damaged ones)
      id: 'gravity_well', kind: 'turret', age: 'future', rarity: 'epic', cost: 250,
      attack: {
        damage: 60, intervalMs: 7000, windupPct: 0, range: 400, hitsGround: true, hitsAir: false,
        projectile: { speed: 450, visualId: 'proj.gravity_orb' },
        dmgType: 'blast', sfx: 'gravity_hum', priority: 'densest', splashRadius: 90, maxTargets: 4,
        pull: { radius: 90, fractionBp: 6000 },
        onHit: [{ kind: 'slow', magnitudeBp: 5000, durationMs: 2500 }],
      },
      visualId: 'turret.gravity_well', nameKey: 'card.gravity_well.name', descKey: 'card.gravity_well.desc',
    },
    {
      // W7 Future wave. Slow: the pod inhales and spits a white-mint frost bolt, 80 every 1.5 s; the target is
      // slowed 30% for 2 s; ground and air
      id: 'cryo_pod', kind: 'turret', age: 'future', rarity: 'common', cost: 175,
      attack: {
        damage: 80, intervalMs: 1500, windupPct: 0, range: 320, hitsGround: true, hitsAir: true,
        projectile: { speed: 900, visualId: 'proj.frost' },
        dmgType: 'laser', sfx: 'shot_cryo', onHit: [{ kind: 'slow', magnitudeBp: 3000, durationMs: 2000 }],
      },
      visualId: 'turret.cryo_pod', nameKey: 'card.cryo_pod.name', descKey: 'card.cryo_pod.desc',
    },
    {
      // W7 Future wave. Drag: a dish latches a beam on the nearest armored ground enemy in range (else the nearest)
      // and pulls it 100 lu toward your gate (large units resist 50%); 166 every 5.0 s; ground only
      id: 'tractor_beam', kind: 'turret', age: 'future', rarity: 'rare', cost: 250,
      attack: {
        damage: 166, intervalMs: 5000, windupPct: 0, range: 380, hitsGround: true, hitsAir: false,
        projectile: { instant: true, effectId: 'fx.tractor_beam' },
        dmgType: 'laser', sfx: 'tractor_hum', priority: 'armored', drag: { distance: 100 },
      },
      visualId: 'turret.tractor_beam', nameKey: 'card.tractor_beam.name', descKey: 'card.tractor_beam.desc',
    },
  ],
  // A16.14.4 Forts (Future, P 3.32): War Path L4 camp, L6 trap, L8 tower; Road fort set at 3,100. The
  // Hardlight Barrier regenerates 1% of max HP per second after 3 s without damage, until its decay starts
  forts: [
    wall('future', 'hardlight_barrier', { regen: { bpPerSec: 100, delayMs: 3000 } }),
    tower('future', 'sentry_pylon', { warPath: 8, road: 3100 }),
    camp('future', 'clone_bay', 'clone_cadet', { warPath: 4, road: 3100 }),
    trap('future', 'grav_mire', { warPath: 6, road: 3100 }, { charges: 1, damage: 110, radius: 60, statuses: [slow(6000, 3000)] }),
    // W7 Future wave variants: a sky tower (the Ranged Common × 1.5, priority air, air ×1.5; War Path Future s2) and
    // a brute camp (its levy, the Mini Mech, is 25% of the Walker Mech, every 16 s; the Future 20-star milestone).
    // Road fallback 4,700.
    tower('future', 'skyguard_pylon', { side: 2, road: 4700 }, { priority: 'air', airBp: 15000 }),
    camp('future', 'mech_bay', 'mini_mech', { stars: 20, road: 4700 }, { levyFrom: { group: 'heavy', hpBp: 2500, damageBp: 2500 }, everyMs: 16000, maxAlive: 1 }),
  ],
};

/**
 * W7 Future wave powers (CONTENT_PLAN 5.7; values at P 3.32 and L1 loadouts; I 470 + 90 shield, H 1,860). The age's
 * first six powers live in `powers.ts`.
 */
export const futurePowers: readonly PowerDef[] = [
  {
    // The H7 lane signal (A2.9.4 `lane`, A5.7 whole-lane powers): War Path Future L3 (Road 3,900). No aim: one pulse
    // touches the 8 hittable enemies nearest your gate anywhere on the lane, ground and air: a targeting laser paints
    // each for 56 and marks it (+20% damage taken) for 6 s. 50 gold, 25 s
    id: 'target_painter', kind: 'power', age: 'future', slot: 'field', reach: 'lane', family: 'signal', rarity: 'rare',
    source: 'warPath', warPathLevel: 3, road: 3900, cost: 50, reloadMs: 25000, telegraphMs: 1000, maxTargets: 8, aiValueBp: 5000,
    effect: {
      kind: 'field', zone: 2000, durationMs: 0, hitsAir: true, damagePerPulse: 56,
      statuses: [{ kind: 'mark', magnitudeBp: 2000, durationMs: 6000 }],
    },
    visualId: 'power.target_painter', sfx: 'pw_painter', nameKey: 'card.target_painter.name', descKey: 'card.target_painter.desc',
  },
  {
    // The new Home control (snare, A5.7 family budget): War Path Future side node s1 (Road 4,700). A glittering nanite
    // net settles over a 350 lu zone for 6 s (12 pulses), ground and air: each pulse 15 damage and snare 50% for
    // 1.0 s; cap 6
    id: 'nano_mesh', kind: 'power', age: 'future', slot: 'home', reach: 'home', family: 'snare', rarity: 'epic',
    source: 'warPath', warPathSide: 1, road: 4700, cost: 75, reloadMs: 30000, telegraphMs: 1000, maxTargets: 6, aiValueBp: 4500,
    effect: {
      kind: 'field', zone: 350, durationMs: 6000, hitsAir: true, damagePerPulse: 15,
      statuses: [{ kind: 'snare', magnitudeBp: 5000, durationMs: 1000 }],
    },
    visualId: 'power.nano_mesh', sfx: 'pw_nanomesh', nameKey: 'card.nano_mesh.name', descKey: 'card.nano_mesh.desc',
  },
];
