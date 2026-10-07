/**
 * Medieval Age (P 1.35): DESIGN A5.3 units and turrets, A14.2 attack mapping.
 * Table units: HP and damage whole, ms, lu, lu/s, gold, bp. Data only. `strongVs`/`weakVs` are
 * filled by the WP1 counter matrix (B4).
 */
import { damageMods } from './economy';
import { camp, slow, tower, trap, wall } from './fortKit';
import type { RawAgeTables } from './types';

export const medieval: RawAgeTables = {
  age: 'medieval',
  units: [
    {
      // Blunt. Shield Wall: takes 25% less damage from attacks with range ≥ 100 (not powers)
      id: 'footman', kind: 'unit', age: 'medieval', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 50, trainMs: 1500, pop: 2, hp: 216, speed: 70, size: 'small', starter: true,
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 27, intervalMs: 1000, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'slash', sfx: 'swing_whoosh', mods: damageMods.blunt,
        },
      ],
      // bp is the share of damage resisted (25%), as with knockback resist (A2.7)
      abilities: [{ kind: 'resist', minSourceRange: 100, bp: 2500 }],
      visualId: 'unit.footman', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.footman.name', descKey: 'card.footman.desc', strongVs: [], weakVs: [],
    },
    {
      // Arrow
      id: 'longbowman', kind: 'unit', age: 'medieval', rarity: 'common', role: 'ranged', group: 'ranged',
      cost: 75, trainMs: 2000, pop: 3, hp: 128, speed: 65, size: 'small', starter: true,
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 24, intervalMs: 1400, windupPct: 50, range: 230, hitsGround: true, hitsAir: true,
          projectile: { speed: 650, visualId: 'proj.arrow' },
          dmgType: 'pierce', sfx: 'shot_bow',
        },
      ],
      abilities: [],
      visualId: 'unit.longbowman', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.longbowman.name', descKey: 'card.longbowman.desc', strongVs: [], weakVs: [],
    },
    {
      // Lance charge: first hit ×2 and 30 lu knockback
      id: 'destrier_knight', kind: 'unit', age: 'medieval', rarity: 'common', role: 'heavy', group: 'heavy',
      cost: 150, trainMs: 4000, pop: 6, hp: 756, speed: 60, size: 'large', starter: true,
      tags: ['armored', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 54, intervalMs: 1500, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'pierce', sfx: 'swing_whoosh',
        },
      ],
      abilities: [{ kind: 'firstHitBonus', multBp: 20000, knockback: 30, idleResetMs: 2000 }],
      visualId: 'unit.destrier_knight', sfx: { spawn: 'spawn_heavy', die: 'die_bio' },
      nameKey: 'card.destrier_knight.name', descKey: 'card.destrier_knight.desc', strongVs: [], weakVs: [],
    },
    {
      // Reach; melee AA mods; priority armored; Brace (immune to knockback and to first-hit bonuses)
      id: 'pikeman', kind: 'unit', age: 'medieval', rarity: 'rare', role: 'antiArmor', group: 'antiArmor',
      cost: 100, trainMs: 2500, pop: 4, hp: 297, speed: 70, size: 'medium', starter: true,
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 35, intervalMs: 1200, windupPct: 40, range: 70, hitsGround: true, hitsAir: false,
          dmgType: 'pierce', sfx: 'swing_whoosh', mods: damageMods.meleeAntiArmor, priority: 'armored',
        },
      ],
      abilities: [{ kind: 'brace' }],
      visualId: 'unit.pikeman', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.pikeman.name', descKey: 'card.pikeman.desc', strongVs: [], weakVs: [],
    },
    {
      // Heals 40 HP/s split between the 2 lowest-HP% allies within 160 lu; followSupport
      id: 'friar', kind: 'unit', age: 'medieval', rarity: 'rare', role: 'support', group: 'support',
      cost: 110, trainMs: 3000, pop: 4, hp: 175, speed: 65, size: 'small',
      tags: ['light', 'bio', 'support', 'ranged', 'ground'],
      attacks: [
        {
          damage: 11, intervalMs: 1200, windupPct: 50, range: 150, hitsGround: true, hitsAir: true,
          projectile: { speed: 500, visualId: 'proj.rock' },
          dmgType: 'blunt', sfx: 'shot_sling',
        },
      ],
      abilities: [
        { kind: 'heal', hpPerSec: 40, radius: 160, targets: 2, pulseMs: 500 },
        { kind: 'followSupport', behindFront: 60, soloMaxP: 200 },
      ],
      visualId: 'unit.friar', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.friar.name', descKey: 'card.friar.desc', strongVs: [], weakVs: [],
    },
    {
      // 160 vs base / 2.0 s (10 vs units). siegeOnly: targets the base; attacks units only while blocked
      id: 'battering_ram', kind: 'unit', age: 'medieval', rarity: 'epic', role: 'siege', group: 'epic',
      cost: 200, trainMs: 4000, pop: 8, hp: 900, speed: 45, size: 'large',
      tags: ['armored', 'mech', 'melee', 'ground'],
      attacks: [
        {
          damage: 10, vsBaseDamage: 160, intervalMs: 2000, windupPct: 40, range: 12, hitsGround: true, hitsAir: false,
          dmgType: 'blast', sfx: 'swing_whoosh',
        },
      ],
      abilities: [{ kind: 'siegeOnly' }],
      visualId: 'unit.battering_ram', sfx: { spawn: 'spawn_heavy', die: 'die_mech' },
      nameKey: 'card.battering_ram.name', descKey: 'card.battering_ram.desc', strongVs: [], weakVs: [],
    },
    {
      // 70 / 2.0 s, cleave: 2 targets total, the second within 40 lu behind the primary.
      // Roar every 15 s while it has a target: the nearest 8 allies within 200 lu get a 35 HP shield for 6 s
      id: 'ursa_paladin', kind: 'unit', age: 'medieval', rarity: 'legendary', role: 'siegeHeavy', group: 'legendary',
      cost: 350, trainMs: 7000, pop: 14, hp: 2150, speed: 55, size: 'huge',
      tags: ['armored', 'bio', 'melee', 'legendary', 'ground'],
      attacks: [
        {
          damage: 70, intervalMs: 2000, windupPct: 40, range: 20, hitsGround: true, hitsAir: false,
          dmgType: 'slash', sfx: 'swing_whoosh', cleave: { count: 2, reach: 40 },
        },
      ],
      abilities: [
        { kind: 'periodicShieldAura', everyMs: 15000, radius: 200, maxTargets: 8, shield: 35, durationMs: 6000 },
      ],
      visualId: 'unit.ursa_paladin', sfx: { spawn: 'spawn_legendary', die: 'die_bio' },
      nameKey: 'card.ursa_paladin.name', descKey: 'card.ursa_paladin.desc', strongVs: [], weakVs: [],
    },
    // ---- W3 Medieval wave (content expansion, CONTENT_PLAN 5.3): capsule cards, appended in build order.
    // Commons drop from Arena 2, Rares 3, Epics 4, Legendaries 5 (`cardArena`). Templates: plan 4 (I 216,
    // R 128, H 756 at P 1.35). Released with the wave's sheets, sounds and numbers (2026-10-03).
    {
      // Pair (X0 M1): one card trains 2 squires; stats per squire (0.55 × Footman), cost and pop split evenly; Blunt
      id: 'squire_pair', kind: 'unit', age: 'medieval', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 50, trainMs: 1500, pop: 2, hp: 131, speed: 80, size: 'small',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 15, intervalMs: 1000, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'pierce', sfx: 'squire_jab', mods: damageMods.blunt,
        },
      ],
      abilities: [],
      squad: { count: 2 },
      visualId: 'unit.squire_pair', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.squire_pair.name', descKey: 'card.squire_pair.desc', strongVs: [], weakVs: [],
    },
    {
      // Cleaver: the flail ball cleaves 2 (reach 25); Blunt
      id: 'flailman', kind: 'unit', age: 'medieval', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 50, trainMs: 1500, pop: 2, hp: 216, speed: 70, size: 'small',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 22, intervalMs: 1000, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'blunt', sfx: 'flail_smash', mods: damageMods.blunt, cleave: { count: 2, reach: 25 },
        },
      ],
      abilities: [],
      visualId: 'unit.flailman', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.flailman.name', descKey: 'card.flailman.desc', strongVs: [], weakVs: [],
    },
    {
      // Raider: fast; double damage to bases
      id: 'brigand', kind: 'unit', age: 'medieval', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 50, trainMs: 1500, pop: 2, hp: 228, speed: 100, size: 'small',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 26, intervalMs: 1000, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'slash', sfx: 'dagger_stab', vsBaseDamage: 52,
        },
      ],
      abilities: [],
      visualId: 'unit.brigand', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.brigand.name', descKey: 'card.brigand.desc', strongVs: [], weakVs: [],
    },
    {
      // Crossbow: slow, heavy bolts (1.6 × the Longbowman's damage at 1.8 × its interval); armored ×1.25
      id: 'crossbowman', kind: 'unit', age: 'medieval', rarity: 'common', role: 'ranged', group: 'ranged',
      cost: 75, trainMs: 2000, pop: 3, hp: 128, speed: 65, size: 'small',
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 43, intervalMs: 2500, windupPct: 50, range: 220, hitsGround: true, hitsAir: true,
          projectile: { speed: 650, visualId: 'proj.bolt' },
          dmgType: 'pierce', sfx: 'shot_windlass', mods: [{ vs: 'armored', bp: 12500 }],
        },
      ],
      abilities: [],
      visualId: 'unit.crossbowman', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.crossbowman.name', descKey: 'card.crossbowman.desc', strongVs: [], weakVs: [],
    },
    {
      // Brute: a two-handed greatsword sweep, cleave 2 (reach 30); no charge bonus
      id: 'greatsword_knight', kind: 'unit', age: 'medieval', rarity: 'common', role: 'heavy', group: 'heavy',
      cost: 150, trainMs: 4000, pop: 6, hp: 760, speed: 55, size: 'large',
      tags: ['armored', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 40, intervalMs: 1500, windupPct: 40, range: 20, hitsGround: true, hitsAir: false,
          dmgType: 'slash', sfx: 'greatsword_sweep', cleave: { count: 2, reach: 30 },
        },
      ],
      abilities: [],
      visualId: 'unit.greatsword_knight', sfx: { spawn: 'spawn_heavy', die: 'die_bio' },
      nameKey: 'card.greatsword_knight.name', descKey: 'card.greatsword_knight.desc', strongVs: [], weakVs: [],
    },
    {
      // Long range (H6, A5.1; range +50-80 on 2026-10-07): an arcing arrow at the target's spot, splash r35; range 430, min 90; half to bases; ground only
      id: 'yeoman_archer', kind: 'unit', age: 'medieval', rarity: 'rare', role: 'ranged', group: 'ranged',
      cost: 75, trainMs: 2000, pop: 3, hp: 124, speed: 60, size: 'small',
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 62, intervalMs: 2600, windupPct: 50, range: 430, minRange: 90, hitsGround: true, hitsAir: false,
          projectile: { speed: 300, arc: true, visualId: 'proj.longarrow' },
          dmgType: 'pierce', sfx: 'shot_longbow', splashRadius: 35, vsBaseDamage: 30,
        },
      ],
      abilities: [],
      visualId: 'unit.yeoman_archer', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.yeoman_archer.name', descKey: 'card.yeoman_archer.desc', strongVs: [], weakVs: [],
    },
    {
      // Melee Anti-heavy: melee AA mods (armored and mech ×3, Legendary ×2, light ×0.75); hits mark the target
      // (+20% damage taken for 3 s); Brace; priority armored
      id: 'warhammer_sergeant', kind: 'unit', age: 'medieval', rarity: 'rare', role: 'antiArmor', group: 'antiArmor',
      cost: 100, trainMs: 2500, pop: 4, hp: 350, speed: 70, size: 'medium',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 35, intervalMs: 1200, windupPct: 40, range: 20, hitsGround: true, hitsAir: false,
          dmgType: 'blunt', sfx: 'hammer_clang', mods: damageMods.meleeAntiArmor, priority: 'armored',
          onHit: [{ kind: 'mark', magnitudeBp: 2000, durationMs: 3000 }],
        },
      ],
      abilities: [{ kind: 'brace' }],
      visualId: 'unit.warhammer_sergeant', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.warhammer_sergeant.name', descKey: 'card.warhammer_sergeant.desc', strongVs: [], weakVs: [],
    },
    {
      // Shield beacon: every 9 s the nearest 4 allies within 180 lu get a 61 shield for 5 s; followSupport
      id: 'herald', kind: 'unit', age: 'medieval', rarity: 'rare', role: 'support', group: 'support',
      cost: 110, trainMs: 3000, pop: 4, hp: 175, speed: 65, size: 'small',
      tags: ['light', 'bio', 'support', 'ranged', 'ground'],
      attacks: [
        {
          damage: 11, intervalMs: 1200, windupPct: 50, range: 150, hitsGround: true, hitsAir: true,
          projectile: { speed: 600, visualId: 'proj.note' },
          dmgType: 'blunt', sfx: 'trumpet_toot',
        },
      ],
      abilities: [
        { kind: 'periodicShieldAura', everyMs: 9000, radius: 180, maxTargets: 4, shield: 61, durationMs: 5000 },
        { kind: 'followSupport', behindFront: 60, soloMaxP: 200 },
      ],
      visualId: 'unit.herald', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.herald.name', descKey: 'card.herald.desc', strongVs: [], weakVs: [],
    },
    {
      // Summoner (X0 M3): a War Hound (35% of a Footman, fast) every 9 s, at most 2; whip crack; followSupport
      id: 'kennel_master', kind: 'unit', age: 'medieval', rarity: 'rare', role: 'support', group: 'support',
      cost: 110, trainMs: 3000, pop: 4, hp: 175, speed: 65, size: 'small',
      tags: ['light', 'bio', 'support', 'melee', 'ground'],
      attacks: [
        {
          damage: 11, intervalMs: 1200, windupPct: 40, range: 40, hitsGround: true, hitsAir: false,
          dmgType: 'slash', sfx: 'whip_crack',
        },
      ],
      abilities: [
        { kind: 'summon', card: 'war_hound', firstMs: 2000, everyMs: 9000, maxAlive: 2 },
        { kind: 'followSupport', behindFront: 60, soloMaxP: 200 },
      ],
      visualId: 'unit.kennel_master', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.kennel_master.name', descKey: 'card.kennel_master.desc', strongVs: [], weakVs: [],
    },
    {
      // Artillery: an arcing stone at the target's spot, 82 splash r50 / 3.5 s, range 300 (min 80); half to bases; ground only
      id: 'mangonel_cart', kind: 'unit', age: 'medieval', rarity: 'epic', role: 'siege', group: 'epic',
      cost: 200, trainMs: 4000, pop: 8, hp: 450, speed: 45, size: 'large',
      tags: ['light', 'mech', 'ranged', 'ground'],
      attacks: [
        {
          damage: 82, intervalMs: 3500, windupPct: 50, range: 300, minRange: 80, hitsGround: true, hitsAir: false,
          projectile: { speed: 450, arc: true, visualId: 'proj.boulder' },
          dmgType: 'blast', sfx: 'shot_mangonel', splashRadius: 50, vsBaseDamage: 41,
        },
      ],
      abilities: [],
      visualId: 'unit.mangonel_cart', sfx: { spawn: 'spawn_heavy', die: 'die_mech' },
      nameKey: 'card.mangonel_cart.name', descKey: 'card.mangonel_cart.desc', strongVs: [], weakVs: [],
    },
    {
      // Siege tower (armored mech): drawbridge slam 30 / 2.0 s; 2 archers on top shoot 10 / 1.4 s (range 200, G+A);
      // on death the 2 archers jump out as Footmen (summoned)
      id: 'siege_belfry', kind: 'unit', age: 'medieval', rarity: 'epic', role: 'siege', group: 'epic',
      cost: 200, trainMs: 4000, pop: 8, hp: 900, speed: 40, size: 'large',
      tags: ['armored', 'mech', 'melee', 'ground'],
      attacks: [
        {
          damage: 30, intervalMs: 2000, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'blunt', sfx: 'drawbridge_slam',
        },
      ],
      abilities: [
        {
          kind: 'riders', count: 2, onDeathSpawn: 'footman',
          attack: {
            damage: 10, intervalMs: 1400, windupPct: 50, range: 200, hitsGround: true, hitsAir: true,
            projectile: { speed: 650, visualId: 'proj.arrow' },
            dmgType: 'pierce', sfx: 'shot_bow',
          },
        },
      ],
      visualId: 'unit.siege_belfry', sfx: { spawn: 'spawn_heavy', die: 'die_mech' },
      nameKey: 'card.siege_belfry.name', descKey: 'card.siege_belfry.desc', strongVs: [], weakVs: [],
    },
    {
      // Caster: every 9 s a flask bursts on the nearest enemy ground unit within 360 lu after 1.0 s (95 splash r45)
      id: 'alchemist', kind: 'unit', age: 'medieval', rarity: 'epic', role: 'support', group: 'epic',
      cost: 200, trainMs: 4000, pop: 8, hp: 324, speed: 60, size: 'small',
      tags: ['light', 'bio', 'support', 'ranged', 'ground'],
      attacks: [
        {
          damage: 16, intervalMs: 1400, windupPct: 50, range: 170, hitsGround: true, hitsAir: true,
          projectile: { speed: 450, visualId: 'proj.vial' },
          dmgType: 'blast', sfx: 'vial_toss',
        },
      ],
      abilities: [
        { kind: 'callStrike', everyMs: 9000, searchRange: 360, delayMs: 1000, damage: 95, radius: 45, sideLockoutMs: 3000 },
        { kind: 'followSupport', behindFront: 60, soloMaxP: 200 },
      ],
      visualId: 'unit.alchemist', sfx: { spawn: 'spawn_heavy', die: 'die_bio' },
      nameKey: 'card.alchemist.name', descKey: 'card.alchemist.desc', strongVs: [], weakVs: [],
    },
    {
      // Legendary dragon: green marsh-fire breath 60 / 1.8 s, range 80; hits the target and up to 4 more within 90 lu behind
      id: 'lindworm', kind: 'unit', age: 'medieval', rarity: 'legendary', role: 'heavy', group: 'legendary',
      cost: 350, trainMs: 7000, pop: 14, hp: 1170, speed: 50, size: 'huge',
      tags: ['armored', 'bio', 'melee', 'legendary', 'ground'],
      attacks: [
        {
          damage: 55, intervalMs: 1800, windupPct: 50, range: 80, hitsGround: true, hitsAir: false,
          projectile: { instant: true, effectId: 'fx.lindworm_breath' },
          dmgType: 'blast', sfx: 'wyrm_breath', followBehind: 90, maxTargets: 5,
        },
      ],
      abilities: [],
      visualId: 'unit.lindworm', sfx: { spawn: 'spawn_legendary', die: 'die_bio' },
      nameKey: 'card.lindworm.name', descKey: 'card.lindworm.desc', strongVs: [], weakVs: [],
    },
    {
      // Kennel Master's summon (X0 M3): 35% of a Footman (HP 76, 9 damage), fast; no pop, no bounty, always marches
      id: 'war_hound', kind: 'unit', age: 'medieval', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 0, trainMs: 1500, pop: 2, hp: 160, speed: 90, size: 'small',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 16, intervalMs: 1000, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'slash', sfx: 'hound_bite',
        },
      ],
      abilities: [],
      visualId: 'unit.war_hound', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.war_hound.name', descKey: 'card.war_hound.desc', strongVs: [], weakVs: [],
      hidden: true, summon: true, aiValue: 18,
    },
  ],
  turrets: [
    {
      // Single target
      id: 'crossbow_nest', kind: 'turret', age: 'medieval', rarity: 'common', starter: true, cost: 150,
      attack: {
        damage: 40, intervalMs: 1500, windupPct: 0, range: 380, hitsGround: true, hitsAir: true,
        projectile: { speed: 650, visualId: 'proj.bolt' },
        dmgType: 'pierce', sfx: 'shot_crossbow',
      },
      visualId: 'turret.crossbow_nest', nameKey: 'card.crossbow_nest.name', descKey: 'card.crossbow_nest.desc',
    },
    {
      // Gate zone: ground enemies within 130 lu of your gate; max 4 targets
      id: 'pitch_cauldron', kind: 'turret', age: 'medieval', rarity: 'common', starter: true, cost: 175,
      attack: {
        damage: 14, intervalMs: 500, windupPct: 0, range: 130, hitsGround: true, hitsAir: false,
        projectile: { instant: true, effectId: 'fx.pitch_pour' },
        dmgType: 'blast', sfx: 'cauldron_pour', gateZone: { radius: 130 }, maxTargets: 4,
      },
      visualId: 'turret.pitch_cauldron', nameKey: 'card.pitch_cauldron.name', descKey: 'card.pitch_cauldron.desc',
    },
    {
      // 110 splash r50 / 4.5 s, range 480 (min 150), arc
      id: 'trebuchet', kind: 'turret', age: 'medieval', rarity: 'rare', cost: 250,
      attack: {
        damage: 110, intervalMs: 4500, windupPct: 0, range: 480, minRange: 150, hitsGround: true, hitsAir: false,
        projectile: { speed: 450, arc: true, visualId: 'proj.boulder' },
        dmgType: 'blast', sfx: 'shot_catapult', splashRadius: 50,
      },
      visualId: 'turret.trebuchet', nameKey: 'card.trebuchet.name', descKey: 'card.trebuchet.desc',
    },
    {
      // Goose chains to 3 targets total (each ≤ 80 lu from the previous); 30% slow for 2 s
      id: 'honk_ballista', kind: 'turret', age: 'medieval', rarity: 'epic', cost: 250,
      attack: {
        damage: 70, intervalMs: 3000, windupPct: 0, range: 400, hitsGround: true, hitsAir: true,
        projectile: { speed: 650, visualId: 'proj.goose' },
        dmgType: 'blunt', sfx: 'goose_honk', chain: { count: 3, hop: 80 },
        onHit: [{ kind: 'slow', magnitudeBp: 3000, durationMs: 2000 }],
      },
      visualId: 'turret.honk_ballista', nameKey: 'card.honk_ballista.name', descKey: 'card.honk_ballista.desc',
    },
    {
      // W3 Medieval wave. Pierce bolt: a winched bolt (1.2 × the Crossbow Nest) skewers up to 3 ground enemies
      // within 150 lu in a line, every 2.0 s; ground only
      id: 'springald', kind: 'turret', age: 'medieval', rarity: 'common', cost: 175,
      attack: {
        damage: 48, intervalMs: 2000, windupPct: 0, range: 360, hitsGround: true, hitsAir: false,
        projectile: { speed: 700, visualId: 'proj.spear_bolt' },
        dmgType: 'pierce', sfx: 'shot_springald', pierce: { count: 3, length: 150 },
      },
      visualId: 'turret.springald', nameKey: 'card.springald.name', descKey: 'card.springald.desc',
    },
    {
      // W3 Medieval wave. Drag: a hook snags the nearest armored ground enemy in range (else the nearest) and
      // winches it 100 lu toward your gate (large units resist 50%); 68 every 5.0 s; ground only
      id: 'grapple_crane', kind: 'turret', age: 'medieval', rarity: 'rare', cost: 250,
      attack: {
        damage: 68, intervalMs: 5000, windupPct: 0, range: 380, hitsGround: true, hitsAir: false,
        projectile: { instant: true, effectId: 'fx.grapple_hook' },
        dmgType: 'pierce', sfx: 'crane_hook', priority: 'armored', drag: { distance: 100 },
      },
      visualId: 'turret.grapple_crane', nameKey: 'card.grapple_crane.name', descKey: 'card.grapple_crane.desc',
    },
  ],
  // A16.14.4 Forts (Medieval, P 1.35): War Path L4 camp, L6 trap, L8 tower; Road fort set at 2,300
  forts: [
    wall('medieval', 'shield_barricade'),
    tower('medieval', 'longbow_tower', { warPath: 8, road: 2300 }),
    camp('medieval', 'levy_camp', 'peasant_levy', { warPath: 4, road: 2300 }),
    trap('medieval', 'wolf_pits', { warPath: 6, road: 2300 }, { charges: 3, damage: 54, statuses: [slow(5000, 3000)] }),
    // W3 Medieval wave variants: a chip trap (4 charges × 0.2 × the Footman and slow 40% for 2 s; War Path Medieval s2)
    // and a slow tower (× 0.8 damage, hits slow 25% for 1.5 s; the Medieval 20-star milestone). Road fallback 4,300.
    // Released with their art (2026-10-03).
    trap('medieval', 'bear_snares', { side: 2, road: 4300 }, { charges: 4, damage: 43, statuses: [slow(4000, 2000)] }),
    tower('medieval', 'crossbow_keep', { stars: 20, road: 4300 }, { damageBp: 8000, onHit: [slow(2500, 1500)] }),
  ],
};
