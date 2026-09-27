// FROZEN FIXTURE (DESIGN C2/WP0 task 8): a copy of src/content/raw/medieval.ts taken in Phase 0 (2026-09-27).
// Golden replays compile this content, so balance tuning in src/content/raw never breaks them.
// Never edit it. To re-baseline, copy src/content/raw again and re-record every golden replay.

/**
 * Medieval Age (P 1.35): DESIGN A5.3 units and turrets, A14.2 attack mapping.
 * Table units: HP and damage whole, ms, lu, lu/s, gold, bp. Data only. `strongVs`/`weakVs` are
 * filled by the WP1 counter matrix (B4).
 */
import { damageMods } from './economy';
import type { RawAgeTables } from './types';

export const medieval: RawAgeTables = {
  age: 'medieval',
  units: [
    {
      // Blunt. Shield Wall: takes 25% less damage from attacks with range ≥ 100 (not powers)
      id: 'footman', kind: 'unit', age: 'medieval', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 50, trainMs: 1500, pop: 2, hp: 216, speed: 70, size: 'small',
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
      cost: 75, trainMs: 2000, pop: 3, hp: 128, speed: 65, size: 'small',
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
      cost: 150, trainMs: 4000, pop: 6, hp: 756, speed: 60, size: 'large',
      tags: ['armored', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 57, intervalMs: 1500, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
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
      cost: 100, trainMs: 2500, pop: 4, hp: 270, speed: 70, size: 'medium',
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
      // 70 / 1.4 s, cleave: 2 targets total, the second within 40 lu behind the primary.
      // Roar every 15 s while it has a target: the nearest 8 allies within 200 lu get a 60 HP shield for 6 s
      id: 'ursa_paladin', kind: 'unit', age: 'medieval', rarity: 'legendary', role: 'siegeHeavy', group: 'legendary',
      cost: 350, trainMs: 7000, pop: 14, hp: 2300, speed: 55, size: 'huge',
      tags: ['armored', 'bio', 'melee', 'legendary', 'ground'],
      attacks: [
        {
          damage: 70, intervalMs: 1400, windupPct: 40, range: 20, hitsGround: true, hitsAir: false,
          dmgType: 'slash', sfx: 'swing_whoosh', cleave: { count: 2, reach: 40 },
        },
      ],
      abilities: [
        { kind: 'periodicShieldAura', everyMs: 15000, radius: 200, maxTargets: 8, shield: 60, durationMs: 6000 },
      ],
      visualId: 'unit.ursa_paladin', sfx: { spawn: 'spawn_legendary', die: 'die_bio' },
      nameKey: 'card.ursa_paladin.name', descKey: 'card.ursa_paladin.desc', strongVs: [], weakVs: [],
    },
  ],
  turrets: [
    {
      // Single target
      id: 'crossbow_nest', kind: 'turret', age: 'medieval', rarity: 'common', cost: 150,
      attack: {
        damage: 40, intervalMs: 1500, windupPct: 0, range: 380, hitsGround: true, hitsAir: true,
        projectile: { speed: 650, visualId: 'proj.bolt' },
        dmgType: 'pierce', sfx: 'shot_crossbow',
      },
      visualId: 'turret.crossbow_nest', nameKey: 'card.crossbow_nest.name', descKey: 'card.crossbow_nest.desc',
    },
    {
      // Gate zone: ground enemies within 130 lu of your gate; max 4 targets
      id: 'pitch_cauldron', kind: 'turret', age: 'medieval', rarity: 'common', cost: 175,
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
  ],
};
