/**
 * Industrial Age (P 2.12): docs/design-lane-ages.md A17.10 units, turrets and powers (to be merged into
 * DESIGN as A5.x), A17.12 attack mapping. Steam, rivets and the first electric light; no gas weapons.
 * Table units: HP and damage whole, ms, lu, lu/s, gold, bp. Data only. `strongVs`/`weakVs` are
 * filled by the WP1 counter matrix (B4).
 *
 * The age's P, base HP and threshold live in `economy.ts` (`ageScale`, A17.8).
 */
import type { PowerDef } from '@/contracts/content';
import { antiHeavyMods, damageMods } from './economy';
import { FORT_COST, camp, tower, trap, wall } from './fortKit';
import type { RawAgeTables } from './types';

export const industrial: RawAgeTables = {
  age: 'industrial',
  units: [
    {
      // Blunt. Big Wrench: the first hit of each engagement deals ×1.5 (no knockback)
      id: 'riveter', kind: 'unit', age: 'industrial', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 50, trainMs: 1500, pop: 2, hp: 330, speed: 72, size: 'small', starter: true,
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
      cost: 75, trainMs: 2000, pop: 3, hp: 201, speed: 65, size: 'small', starter: true,
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
      cost: 150, trainMs: 4000, pop: 6, hp: 1187, speed: 55, size: 'large', starter: true,
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
      cost: 100, trainMs: 2500, pop: 4, hp: 286, speed: 65, size: 'medium', starter: true,
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 55, intervalMs: 1200, windupPct: 50, range: 210, hitsGround: true, hitsAir: true,
          projectile: { speed: 900, visualId: 'proj.harpoon' },
          dmgType: 'pierce', sfx: 'shot_harpoon', mods: antiHeavyMods.harpoon, priority: 'armored',
        },
      ],
      abilities: [{ kind: 'firstHitBonus', multBp: 10000, knockback: -25, idleResetMs: 2000 }, { kind: 'brace' }],
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
      // Main gun 85 splash r40 / 2.2 s at range 160 (G). Two sponson gunners (riders) each shoot 6 / 0.5 s
      // at range 160 (G+A); on death the crew bails out as 2 Carbineers (summoned)
      id: 'land_dreadnought', kind: 'unit', age: 'industrial', rarity: 'legendary', role: 'siegeHeavy', group: 'legendary',
      cost: 350, trainMs: 7000, pop: 14, hp: 1800, speed: 35, size: 'huge',
      tags: ['armored', 'mech', 'ranged', 'legendary', 'ground'],
      attacks: [
        {
          damage: 85, intervalMs: 2200, windupPct: 50, range: 160, hitsGround: true, hitsAir: false,
          projectile: { speed: 1200, visualId: 'proj.shell' },
          dmgType: 'blast', sfx: 'shot_cannon', splashRadius: 40,
        },
      ],
      abilities: [
        {
          kind: 'riders',
          count: 2,
          attack: {
            damage: 6, intervalMs: 500, windupPct: 50, range: 160, hitsGround: true, hitsAir: true,
            projectile: { speed: 1500, visualId: 'proj.bullet' },
            dmgType: 'bullet', sfx: 'shot_gatling',
          },
          onDeathSpawn: 'carbineer',
        },
      ],
      visualId: 'unit.land_dreadnought', sfx: { spawn: 'spawn_legendary', die: 'die_mech' },
      nameKey: 'card.land_dreadnought.name', descKey: 'card.land_dreadnought.desc', strongVs: [], weakVs: [],
    },
    // ---- W5 Industrial wave (content expansion, CONTENT_PLAN 5.5): capsule cards, appended in build order.
    // Commons drop from Arena 2, Rares 3, Epics 4, Legendaries 5 (`cardArena`). Templates: plan 4 (I 330,
    // R 201, H 1,187 at P 2.12). Released 2026-10-03 with their sheets, sounds and measured numbers.
    {
      // Pair (X0 M1): one card trains 2 coal miners; stats per miner, cost and pop split evenly; Blunt
      id: 'coal_miners', kind: 'unit', age: 'industrial', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 50, trainMs: 1500, pop: 2, hp: 194, speed: 82, size: 'small',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 24, intervalMs: 1000, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'pierce', sfx: 'pickaxe_clink', mods: damageMods.blunt,
        },
      ],
      abilities: [],
      squad: { count: 2 },
      visualId: 'unit.coal_miners', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.coal_miners.name', descKey: 'card.coal_miners.desc', strongVs: [], weakVs: [],
    },
    {
      // Guard: the wheeled steel mantlet takes 25% less from attacks with range ≥ 100 (not powers); Blunt
      id: 'iron_mantlet', kind: 'unit', age: 'industrial', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 50, trainMs: 1500, pop: 2, hp: 420, speed: 67, size: 'small',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 28, intervalMs: 1000, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'pierce', sfx: 'mantlet_jab', mods: damageMods.blunt,
        },
      ],
      abilities: [{ kind: 'resist', minSourceRange: 100, bp: 2500 }],
      visualId: 'unit.iron_mantlet', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.iron_mantlet.name', descKey: 'card.iron_mantlet.desc', strongVs: [], weakVs: [],
    },
    {
      // Raider: the fastest Common (110 lu/s); ×2 to bases
      id: 'dispatch_rider', kind: 'unit', age: 'industrial', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 50, trainMs: 1500, pop: 2, hp: 325, speed: 110, size: 'medium',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 42, intervalMs: 1000, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'blunt', sfx: 'bike_skid', vsBaseDamage: 84,
        },
      ],
      abilities: [],
      visualId: 'unit.dispatch_rider', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.dispatch_rider.name', descKey: 'card.dispatch_rider.desc', strongVs: [], weakVs: [],
    },
    {
      // Thrower: a bowled bomb, splash r30, lobbed over allies; ground only
      id: 'bomb_bowler', kind: 'unit', age: 'industrial', rarity: 'common', role: 'ranged', group: 'ranged',
      cost: 75, trainMs: 2000, pop: 3, hp: 191, speed: 65, size: 'small',
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 24, intervalMs: 1500, windupPct: 50, range: 220, hitsGround: true, hitsAir: false,
          projectile: { speed: 450, arc: true, visualId: 'proj.bowl_bomb' },
          dmgType: 'blast', sfx: 'shot_bowl', splashRadius: 30,
        },
      ],
      abilities: [],
      visualId: 'unit.bomb_bowler', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.bomb_bowler.name', descKey: 'card.bomb_bowler.desc', strongVs: [], weakVs: [],
    },
    {
      // Brute (armored mech): the plough blade scoops sideways, cleave 2 (reach 30); no first-hit bonus
      id: 'steam_tractor', kind: 'unit', age: 'industrial', rarity: 'common', role: 'heavy', group: 'heavy',
      cost: 150, trainMs: 4000, pop: 6, hp: 1200, speed: 50, size: 'large',
      tags: ['armored', 'mech', 'melee', 'ground'],
      attacks: [
        {
          damage: 66, intervalMs: 1500, windupPct: 40, range: 20, hitsGround: true, hitsAir: false,
          dmgType: 'blunt', sfx: 'plough_scoop', cleave: { count: 2, reach: 30 },
        },
      ],
      abilities: [],
      visualId: 'unit.steam_tractor', sfx: { spawn: 'spawn_heavy', die: 'die_mech' },
      nameKey: 'card.steam_tractor.name', descKey: 'card.steam_tractor.desc', strongVs: [], weakVs: [],
    },
    {
      // Long range (H6, A5.1): an arcing mortar bomb at the target's spot, splash r35; range 370, min 90; half to bases; ground only
      id: 'trench_mortar', kind: 'unit', age: 'industrial', rarity: 'rare', role: 'ranged', group: 'ranged',
      cost: 75, trainMs: 2000, pop: 3, hp: 266, speed: 60, size: 'small',
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 118, intervalMs: 2600, windupPct: 50, range: 370, minRange: 90, hitsGround: true, hitsAir: false,
          projectile: { speed: 300, arc: true, visualId: 'proj.mortar_shell' },
          dmgType: 'blast', sfx: 'shot_trench_mortar', splashRadius: 35, vsBaseDamage: 60,
        },
      ],
      abilities: [],
      visualId: 'unit.trench_mortar', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.trench_mortar.name', descKey: 'card.trench_mortar.desc', strongVs: [], weakVs: [],
    },
    {
      // Melee Anti-heavy: a steam drill, reach 40; melee AA mods (armored and mech ×3, Legendary ×2, light ×0.5);
      // Brace; priority armored
      id: 'steam_driller', kind: 'unit', age: 'industrial', rarity: 'rare', role: 'antiArmor', group: 'antiArmor',
      cost: 100, trainMs: 2500, pop: 4, hp: 490, speed: 70, size: 'medium',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 50, intervalMs: 1200, windupPct: 40, range: 40, hitsGround: true, hitsAir: false,
          dmgType: 'pierce', sfx: 'drill_spin', mods: damageMods.meleeAntiArmor, priority: 'armored',
        },
      ],
      abilities: [{ kind: 'brace' }],
      visualId: 'unit.steam_driller', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.steam_driller.name', descKey: 'card.steam_driller.desc', strongVs: [], weakVs: [],
    },
    {
      // Aura: allies within 160 lu deal 20% more damage; a cornet blast note hits the target; followSupport
      id: 'bandmaster', kind: 'unit', age: 'industrial', rarity: 'rare', role: 'support', group: 'support',
      cost: 110, trainMs: 3000, pop: 4, hp: 390, speed: 65, size: 'small',
      tags: ['light', 'bio', 'support', 'ranged', 'ground'],
      attacks: [
        {
          damage: 36, intervalMs: 1200, windupPct: 50, range: 150, hitsGround: true, hitsAir: true,
          projectile: { speed: 900, visualId: 'proj.note' },
          dmgType: 'blunt', sfx: 'cornet_blast',
        },
      ],
      abilities: [
        { kind: 'aura', radius: 160, status: { kind: 'damageBuff', magnitudeBp: 2000, durationMs: 0 } },
        { kind: 'followSupport', behindFront: 60, soloMaxP: 200 },
      ],
      visualId: 'unit.bandmaster', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.bandmaster.name', descKey: 'card.bandmaster.desc', strongVs: [], weakVs: [],
    },
    {
      // Summoner (X0 M3): winds up a Clockwork Soldier every 8 s, at most 3; whacks with a big wind-up key; followSupport
      id: 'clockwork_tinker', kind: 'unit', age: 'industrial', rarity: 'rare', role: 'support', group: 'support',
      cost: 110, trainMs: 3000, pop: 4, hp: 275, speed: 65, size: 'small',
      tags: ['light', 'bio', 'support', 'melee', 'ground'],
      attacks: [
        {
          damage: 17, intervalMs: 1200, windupPct: 40, range: 40, hitsGround: true, hitsAir: false,
          dmgType: 'blunt', sfx: 'key_whack',
        },
      ],
      abilities: [
        { kind: 'summon', card: 'clockwork_soldier', firstMs: 2000, everyMs: 8000, maxAlive: 3 },
        { kind: 'followSupport', behindFront: 60, soloMaxP: 200 },
      ],
      visualId: 'unit.clockwork_tinker', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.clockwork_tinker.name', descKey: 'card.clockwork_tinker.desc', strongVs: [], weakVs: [],
    },
    {
      // Vehicle (armored mech): a turret machine gun, 18 every 0.3 s, range 150, ground and air; it stops in range
      id: 'armoured_car', kind: 'unit', age: 'industrial', rarity: 'epic', role: 'siege', group: 'epic',
      cost: 200, trainMs: 4000, pop: 8, hp: 1400, speed: 55, size: 'large',
      tags: ['armored', 'mech', 'ranged', 'ground'],
      attacks: [
        {
          damage: 18, intervalMs: 300, windupPct: 50, range: 150, hitsGround: true, hitsAir: true,
          projectile: { speed: 1500, visualId: 'proj.bullet' },
          dmgType: 'bullet', sfx: 'car_mg',
        },
      ],
      abilities: [],
      visualId: 'unit.armoured_car', sfx: { spawn: 'spawn_heavy', die: 'die_mech' },
      nameKey: 'card.armoured_car.name', descKey: 'card.armoured_car.desc', strongVs: [], weakVs: [],
    },
    {
      // Skirmisher: swings over the blocker on a rope onto a back-line unit within 180 lu (pounce), the first
      // strike ×2; ice-axe chop 80 / 0.9 s
      id: 'alpine_climber', kind: 'unit', age: 'industrial', rarity: 'epic', role: 'skirmisher', group: 'epic',
      cost: 200, trainMs: 4000, pop: 8, hp: 980, speed: 85, size: 'medium',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 80, intervalMs: 900, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'pierce', sfx: 'ice_axe_chop',
        },
      ],
      abilities: [{ kind: 'pounce', searchRange: 180, cooldownMs: 12000, leapMs: 500, firstBiteBp: 20000 }],
      visualId: 'unit.alpine_climber', sfx: { spawn: 'spawn_heavy', die: 'die_bio' },
      nameKey: 'card.alpine_climber.name', descKey: 'card.alpine_climber.desc', strongVs: [], weakVs: [],
    },
    {
      // Caster: a coil gun whose arc jumps to a second foe (chain 2, hop 70), 55 / 1.2 s, range 170, ground and air;
      // Arc Burst every 12 s, while an enemy is within 120 lu, stuns every enemy there for 1.0 s (Legendaries
      // 0.5 s; hair on end and sparks, M5); followSupport
      id: 'spark_scientist', kind: 'unit', age: 'industrial', rarity: 'epic', role: 'support', group: 'epic',
      cost: 200, trainMs: 4000, pop: 8, hp: 1200, speed: 60, size: 'small',
      tags: ['light', 'bio', 'support', 'ranged', 'ground'],
      attacks: [
        {
          damage: 55, intervalMs: 1200, windupPct: 50, range: 170, hitsGround: true, hitsAir: true,
          projectile: { instant: true, effectId: 'fx.coil_arc' },
          dmgType: 'laser', sfx: 'coil_zap', chain: { count: 2, hop: 70 },
        },
      ],
      abilities: [
        { kind: 'timeStop', everyMs: 12000, radius: 120, freezeMs: 1000, legendaryFreezeMs: 500, frozen: false },
        { kind: 'followSupport', behindFront: 60, soloMaxP: 200 },
      ],
      visualId: 'unit.spark_scientist', sfx: { spawn: 'spawn_heavy', die: 'die_bio' },
      nameKey: 'card.spark_scientist.name', descKey: 'card.spark_scientist.desc', strongVs: [], weakVs: [],
    },
    {
      // Legendary armoured train: turret gun 90 splash r45 / 2.4 s (range 220, ground) and a roof machine gun
      // 10 / 0.4 s (range 150, ground and air, priority air; only the gun stops it). Overpressure (X0 M2): below
      // 50% HP +20% damage and +25% attack speed
      id: 'armoured_train', kind: 'unit', age: 'industrial', rarity: 'legendary', role: 'siegeHeavy', group: 'legendary',
      cost: 350, trainMs: 7000, pop: 14, hp: 1520, speed: 40, size: 'huge',
      tags: ['armored', 'mech', 'ranged', 'legendary', 'ground'],
      attacks: [
        {
          damage: 90, intervalMs: 2400, windupPct: 50, range: 220, hitsGround: true, hitsAir: false,
          projectile: { speed: 1200, visualId: 'proj.shell' },
          dmgType: 'blast', sfx: 'train_gun', splashRadius: 45,
        },
        {
          damage: 10, intervalMs: 400, windupPct: 50, range: 150, hitsGround: true, hitsAir: true,
          projectile: { speed: 1500, visualId: 'proj.bullet' },
          dmgType: 'bullet', sfx: 'shot_gatling', priority: 'air',
        },
      ],
      abilities: [{ kind: 'frenzy', belowHpBp: 5000, damageBp: 2000, attackSpeedBp: 2500 }],
      visualId: 'unit.armoured_train', sfx: { spawn: 'spawn_legendary', die: 'die_mech' },
      nameKey: 'card.armoured_train.name', descKey: 'card.armoured_train.desc', strongVs: [], weakVs: [],
    },
    {
      // Clockwork Tinker's summon (X0 M3): a wind-up toy soldier (about half the Riveter's HP); no pop, no
      // bounty, always marches
      id: 'clockwork_soldier', kind: 'unit', age: 'industrial', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 0, trainMs: 1500, pop: 2, hp: 168, speed: 80, size: 'small',
      tags: ['light', 'mech', 'melee', 'ground'],
      attacks: [
        {
          damage: 16, intervalMs: 1000, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'pierce', sfx: 'toy_bayonet',
        },
      ],
      abilities: [],
      visualId: 'unit.clockwork_soldier', sfx: { spawn: 'spawn_pop', die: 'die_mech' },
      nameKey: 'card.clockwork_soldier.name', descKey: 'card.clockwork_soldier.desc', strongVs: [], weakVs: [],
      hidden: true, summon: true, aiValue: 18,
    },
  ],
  turrets: [
    {
      // Single target, rapid fire
      id: 'gatling_gun', kind: 'turret', age: 'industrial', rarity: 'common', starter: true, cost: 150,
      attack: {
        damage: 13, intervalMs: 300, windupPct: 0, range: 350, hitsGround: true, hitsAir: true,
        projectile: { speed: 1500, visualId: 'proj.bullet' },
        dmgType: 'bullet', sfx: 'shot_gatling',
      },
      visualId: 'turret.gatling_gun', nameKey: 'card.gatling_gun.name', descKey: 'card.gatling_gun.desc',
    },
    {
      // 68 splash r40 / 2.0 s, range 300 (min 60), arc; ground only. Short-range swarm breaker
      id: 'mortar_pit', kind: 'turret', age: 'industrial', rarity: 'common', starter: true, cost: 175,
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
    {
      // W5 Industrial wave. Volley: a riveting gun rattles out 3 hot rivets every 1.5 s, each 19 and piercing 2
      // within 60 lu; range 280, ground and air
      id: 'rivet_spitter', kind: 'turret', age: 'industrial', rarity: 'common', cost: 175,
      attack: {
        damage: 19, intervalMs: 1500, windupPct: 0, range: 280, hitsGround: true, hitsAir: true,
        projectile: { speed: 900, visualId: 'proj.rivet' },
        dmgType: 'pierce', sfx: 'shot_rivet', volley: 3, pierce: { count: 2, length: 60 },
      },
      visualId: 'turret.rivet_spitter', nameKey: 'card.rivet_spitter.name', descKey: 'card.rivet_spitter.desc',
    },
    {
      // W5 Industrial wave. Zone: a pile-driver slams the ground by your gate, 57 every 1.0 s to ground enemies
      // within 150 lu of the gate (max 4), each hit slows 30% for 1 s
      id: 'steam_hammer', kind: 'turret', age: 'industrial', rarity: 'rare', cost: 250,
      attack: {
        damage: 57, intervalMs: 1000, windupPct: 0, range: 150, hitsGround: true, hitsAir: false,
        projectile: { instant: true, effectId: 'fx.hammer_shock' },
        dmgType: 'blunt', sfx: 'hammer_slam', gateZone: { radius: 150 }, maxTargets: 4,
        onHit: [{ kind: 'slow', magnitudeBp: 3000, durationMs: 1000 }],
      },
      visualId: 'turret.steam_hammer', nameKey: 'card.steam_hammer.name', descKey: 'card.steam_hammer.desc',
    },
  ],
  // A16.14.4 Forts (Industrial, P 2.12): War Path L4 camp, L6 trap, L8 tower; Road fort set at 2,700
  forts: [
    wall('industrial', 'trench_parapet'),
    tower('industrial', 'sniper_nest', { warPath: 8, road: 2700 }),
    camp('industrial', 'recruiting_depot', 'volunteer', { warPath: 4, road: 2700 }),
    trap('industrial', 'tripwire_charge', { warPath: 6, road: 2700 }, { charges: 1, damage: 200, radius: 40 }),
    // W5 Industrial wave variants: a heavy wall (1.4 × the Heavy Common, 175 gold; War Path Industrial s2) and a
    // chain tower (× 0.75 damage, the bolt jumps to a second foe within 80 lu; the Industrial 20-star milestone).
    // Road fallback 4,500. Released with the wave (2026-10-03).
    wall('industrial', 'rail_barricade', { cost: FORT_COST.bunker, hpBp: 14000, from: { side: 2, road: 4500 } }),
    tower('industrial', 'tesla_pylon', { stars: 20, road: 4500 }, { damageBp: 7500, chain: { count: 2, hop: 80 } }),
  ],
};

/** A5.7 Industrial Age Powers (values at P 2.12 and L1 loadouts; I 330, H 1,187; Epic Sapper 560). */
export const industrialPowers: readonly PowerDef[] = [
  {
    // Starter. A gun line sweeps a 400 lu zone over 1.5 s: 280 once, ground only. Per unit 280: 85% / 24%
    id: 'gun_line', kind: 'power', age: 'industrial', slot: 'home', reach: 'home', family: 'sweep', rarity: 'common',
    source: 'starter', cost: 125, reloadMs: 40000, telegraphMs: 1000, maxTargets: 4,
    effect: { kind: 'sweep', zone: 400, durationMs: 1500, damage: 280, width: 40, hitsAir: false },
    visualId: 'power.gun_line', sfx: 'pw_gunline', nameKey: 'card.gun_line.name', descKey: 'card.gun_line.desc',
  },
  {
    // Road 350. 10 bombs along a 480 lu line over 2.0 s (no jitter); each 150, splash r45; ground only
    // (centre ≤ 760). Per unit ~281: 85% / 24%
    id: 'zeppelin_raid', kind: 'power', age: 'industrial', slot: 'home', reach: 'home', family: 'bombard', rarity: 'rare',
    source: 'road', road: 350, cost: 125, reloadMs: 40000, telegraphMs: 1000, maxTargets: 3,
    effect: {
      kind: 'barrage', count: 10, durationMs: 2000, zone: 480, damage: 150, radius: 45,
      jitter: 0, hitsAir: false, pattern: 'line',
    },
    visualId: 'power.zeppelin_raid', sfx: 'pw_zeppelin', nameKey: 'card.zeppelin_raid.name', descKey: 'card.zeppelin_raid.desc',
  },
  {
    // War Path Industrial L5 (Road 1,250). Barbed wire over 350 lu for 6 s (12 pulses), ground only; each
    // pulse 10 damage and snare 40% for 1.0 s. 120: 36% of I; 14.4 disabled unit-seconds at the cap
    id: 'barbed_wire', kind: 'power', age: 'industrial', slot: 'home', reach: 'home', family: 'snare', rarity: 'rare',
    source: 'warPath', warPathLevel: 5, road: 1250, cost: 75, reloadMs: 30000, telegraphMs: 1000, maxTargets: 6, aiValueBp: 4500,
    effect: {
      kind: 'field', zone: 350, durationMs: 6000, hitsAir: false, damagePerPulse: 10,
      statuses: [{ kind: 'snare', magnitudeBp: 4000, durationMs: 1000 }],
    },
    visualId: 'power.barbed_wire', sfx: 'pw_wire', nameKey: 'card.barbed_wire.name', descKey: 'card.barbed_wire.desc',
  },
  {
    // Starter. 3 runaway armoured engines, 0.5 s apart, run 600 lu at 450 lu/s from your front; 130 and
    // 50 lu knockback; max 2 hits; ground only. Per unit ≤ 260: 79% / 22% (Riveter / Steam Golem)
    id: 'iron_horse', kind: 'power', age: 'industrial', slot: 'field', reach: 'front', family: 'charge', rarity: 'common',
    source: 'starter', cost: 100, reloadMs: 40000, telegraphMs: 1000, maxTargets: 5,
    effect: {
      kind: 'stampede', runners: 3, spacingMs: 500, distance: 600, speed: 450,
      damage: 130, knockback: 50, maxHitsPerEnemy: 2,
    },
    visualId: 'power.iron_horse', sfx: 'pw_iron_horse', nameKey: 'card.iron_horse.name', descKey: 'card.iron_horse.desc',
  },
  {
    // War Path Industrial L7 (Road 1,350). One shell, 710, ground only, 2.0 s telegraph: 60% of H; the
    // Sapper takes 355. 50 gold, reloads in 15 s (MVP balance pass; was 75 and 30 s)
    id: 'railway_gun', kind: 'power', age: 'industrial', slot: 'field', reach: 'anywhere', family: 'strike', rarity: 'epic',
    source: 'warPath', warPathLevel: 7, road: 1350, cost: 50, reloadMs: 15000, telegraphMs: 2000, maxTargets: 1,
    effect: { kind: 'strike', shots: 1, intervalMs: 0, damage: 710, hitsAir: false },
    visualId: 'power.railway_gun', sfx: 'pw_railgun', nameKey: 'card.railway_gun.name', descKey: 'card.railway_gun.desc',
  },
  {
    // War Path Industrial L9 (Road 1,400). Your 8 frontmost units get a 110 shield for 6 s and regenerate 35% of
    // max HP over 4 s; 75 gold, reloads in 30 s (MVP balance pass 2026-10-01: a pure heal at 125 gold and 45 s
    // lost 9-15 points to Iron Horse whatever its numbers; shields + heals 68% of the Riveter, the A2.9.6 cap 70%)
    id: 'field_hospital', kind: 'power', age: 'industrial', slot: 'field', reach: 'army', family: 'mend', rarity: 'epic',
    source: 'warPath', warPathLevel: 9, road: 1400, cost: 75, reloadMs: 30000, telegraphMs: 500, maxTargets: 8, aiValueBp: 7000,
    effect: {
      kind: 'buffAll', maxTargets: 8,
      statuses: [{ kind: 'shield', magnitudeBp: 0, durationMs: 6000, amount: 110 }, { kind: 'regen', magnitudeBp: 3500, durationMs: 4000 }],
    },
    visualId: 'power.field_hospital', sfx: 'pw_hospital', nameKey: 'card.field_hospital.name', descKey: 'card.field_hospital.desc',
  },
  {
    // W5 Industrial wave (released 2026-10-03), the H7 lane volley (A2.9.4 `lane`,
    // A5.7 whole-lane powers): War Path Industrial L3 (Road 3,500). No aim: one pulse touches the 8 hittable
    // enemies nearest your gate anywhere on the lane, ground and air, one shrapnel burst each, for 99 (30% of the
    // Riveter, the lane cap). 50 gold, 25 s
    id: 'shrapnel_shells', kind: 'power', age: 'industrial', slot: 'field', reach: 'lane', family: 'volley', rarity: 'rare',
    source: 'warPath', warPathLevel: 3, road: 3500, cost: 50, reloadMs: 25000, telegraphMs: 1000, maxTargets: 8,
    effect: {
      kind: 'field', zone: 2000, durationMs: 0, hitsAir: true, damagePerPulse: 99,
    },
    visualId: 'power.shrapnel_shells', sfx: 'pw_shrapnel', nameKey: 'card.shrapnel_shells.name', descKey: 'card.shrapnel_shells.desc',
  },
  {
    // W5 Industrial wave (released 2026-10-03), the new Home control (pull, A5.7
    // family budget): War Path Industrial side node s1 (Road 4,500). A giant horseshoe magnet hangs over a 300 lu
    // zone for 4 s (8 pulses), ground only: the first pulse pulls 40% toward the centre, each pulse 14 damage and
    // snare 40% for 1.0 s; cap 6
    id: 'great_magnet', kind: 'power', age: 'industrial', slot: 'home', reach: 'home', family: 'pull', rarity: 'epic',
    source: 'warPath', warPathSide: 1, road: 4500, cost: 75, reloadMs: 30000, telegraphMs: 1000, maxTargets: 6, aiValueBp: 4500,
    effect: {
      kind: 'field', zone: 300, durationMs: 4000, hitsAir: false, damagePerPulse: 14, pullBp: 4000,
      statuses: [{ kind: 'snare', magnitudeBp: 4000, durationMs: 1000 }],
    },
    visualId: 'power.great_magnet', sfx: 'pw_magnet', nameKey: 'card.great_magnet.name', descKey: 'card.great_magnet.desc',
  },
];
