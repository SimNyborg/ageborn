/**
 * Future Age (P 3.32): DESIGN A5.6 units and turrets, A14.2 attack mapping.
 * The tutorial-only Training Dummy listed under A5.6 is a Stone card and lives in `stone.ts`.
 * Table units: HP and damage whole, ms, lu, lu/s, gold, bp. Data only. `strongVs`/`weakVs` are
 * filled by the WP1 counter matrix (B4).
 */
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
  ],
  // A16.14.4 Forts (Future, P 3.32): War Path L4 camp, L6 trap, L8 tower; Road fort set at 3,100. The
  // Hardlight Barrier regenerates 1% of max HP per second after 3 s without damage, until its decay starts
  forts: [
    wall('future', 'hardlight_barrier', { regen: { bpPerSec: 100, delayMs: 3000 } }),
    tower('future', 'sentry_pylon', { warPath: 8, road: 3100 }),
    camp('future', 'clone_bay', 'clone_cadet', { warPath: 4, road: 3100 }),
    trap('future', 'grav_mire', { warPath: 6, road: 3100 }, { charges: 1, damage: 110, radius: 60, statuses: [slow(6000, 3000)] }),
  ],
};
