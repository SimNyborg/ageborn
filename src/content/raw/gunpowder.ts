/**
 * Gunpowder Age (P 1.82): DESIGN A5.4 units and turrets, A14.2 attack mapping.
 * Table units: HP and damage whole, ms, lu, lu/s, gold, bp. Data only. `strongVs`/`weakVs` are
 * filled by the WP1 counter matrix (B4).
 */
import { damageMods } from './economy';
import { camp, tower, trap, wall } from './fortKit';
import type { RawAgeTables } from './types';

export const gunpowder: RawAgeTables = {
  age: 'gunpowder',
  units: [
    {
      // Blunt. Boarding Hook: first hit of each engagement pulls the target 20 lu toward the Corsair
      id: 'corsair', kind: 'unit', age: 'gunpowder', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 50, trainMs: 1500, pop: 2, hp: 291, speed: 72, size: 'small', starter: true,
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
      cost: 75, trainMs: 2000, pop: 3, hp: 173, speed: 65, size: 'small', starter: true,
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
      cost: 150, trainMs: 4000, pop: 6, hp: 1019, speed: 60, size: 'large', starter: true,
      tags: ['armored', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 74, intervalMs: 1500, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
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
      cost: 100, trainMs: 2500, pop: 4, hp: 253, speed: 68, size: 'medium', starter: true,
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 55, intervalMs: 1800, windupPct: 50, range: 150, hitsGround: true, hitsAir: false,
          projectile: { speed: 450, arc: true, visualId: 'proj.lob' },
          dmgType: 'blast', sfx: 'shot_lob', splashRadius: 35, mods: damageMods.grenadier, priority: 'armored',
        },
      ],
      abilities: [{ kind: 'brace' }],
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
      // Bomber: 85 splash r50 / 1.6 s on ground enemies within ±40 lu below; bombs the base at the
      // enemy gate (110 per bomb); on death crashes for 200 splash r70 on ground enemies
      id: 'balloon_admiral', kind: 'unit', age: 'gunpowder', rarity: 'legendary', role: 'airBomber', group: 'legendary',
      cost: 350, trainMs: 7000, pop: 14, hp: 1200, speed: 45, size: 'huge',
      tags: ['air', 'legendary'],
      attacks: [
        {
          // range = the ±40 lu drop window
          damage: 85, vsBaseDamage: 110, intervalMs: 1600, windupPct: 50, range: 40, hitsGround: true, hitsAir: false,
          projectile: { speed: 450, visualId: 'proj.bomb' },
          dmgType: 'blast', sfx: 'bomb_whistle', splashRadius: 50,
        },
      ],
      abilities: [
        { kind: 'bomber', dropWindow: 40 },
        { kind: 'onDeathExplode', damage: 200, radius: 70 },
      ],
      visualId: 'unit.balloon_admiral', sfx: { spawn: 'spawn_legendary', die: 'die_bio' },
      nameKey: 'card.balloon_admiral.name', descKey: 'card.balloon_admiral.desc', strongVs: [], weakVs: [],
    },
    // ---- W4 Gunpowder wave (content expansion, CONTENT_PLAN 5.4): capsule cards, appended in build order.
    // Commons drop from Arena 2, Rares 3, Epics 4, Legendaries 5 (`cardArena`). Templates: plan 4 (I 291,
    // R 173, H 1,019 at P 1.82). Released 2026-10-03 with their sheets, sounds and measured numbers.
    {
      // Guard: the targe takes 25% less from attacks with range ≥ 100 (not powers); Blunt
      id: 'highlander', kind: 'unit', age: 'gunpowder', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 50, trainMs: 1500, pop: 2, hp: 360, speed: 67, size: 'small',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 25, intervalMs: 1000, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'slash', sfx: 'claymore_chop', mods: damageMods.blunt,
        },
      ],
      abilities: [{ kind: 'resist', minSourceRange: 100, bp: 2500 }],
      visualId: 'unit.highlander', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.highlander.name', descKey: 'card.highlander.desc', strongVs: [], weakVs: [],
    },
    {
      // Raider: fast; ×2 to bases; the powder cask pops for 40 splash r35 when he falls
      id: 'powder_monkey', kind: 'unit', age: 'gunpowder', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 50, trainMs: 1500, pop: 2, hp: 262, speed: 100, size: 'small',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 34, intervalMs: 1000, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'blunt', sfx: 'scoop_swing', vsBaseDamage: 68,
        },
      ],
      abilities: [{ kind: 'onDeathExplode', damage: 40, radius: 35 }],
      visualId: 'unit.powder_monkey', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.powder_monkey.name', descKey: 'card.powder_monkey.desc', strongVs: [], weakVs: [],
    },
    {
      // Trio (X0 M1): one card trains 3 skirmishers; stats per skirmisher (0.40 × Fusilier), cost and pop split
      // evenly. HP 73 (69 until the ranks, 2026-10-08: the per-card row fell to -5.7; HP 76 read +4.3, damage 20 +17)
      id: 'voltigeurs', kind: 'unit', age: 'gunpowder', rarity: 'common', role: 'ranged', group: 'ranged',
      cost: 75, trainMs: 2000, pop: 3, hp: 73, speed: 65, size: 'small',
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 19, intervalMs: 2000, windupPct: 50, range: 210, hitsGround: true, hitsAir: true,
          projectile: { speed: 1500, visualId: 'proj.musket' },
          dmgType: 'bullet', sfx: 'shot_musket',
        },
      ],
      abilities: [],
      squad: { count: 3 },
      visualId: 'unit.voltigeurs', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.voltigeurs.name', descKey: 'card.voltigeurs.desc', strongVs: [], weakVs: [],
    },
    {
      // Blaster: a short cone, the target and up to 2 more within 60 lu behind it
      id: 'blunderbuss', kind: 'unit', age: 'gunpowder', rarity: 'common', role: 'ranged', group: 'ranged',
      cost: 75, trainMs: 2000, pop: 3, hp: 164, speed: 65, size: 'small',
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 57, intervalMs: 2600, windupPct: 50, range: 120, hitsGround: true, hitsAir: true,
          projectile: { instant: true, effectId: 'fx.blunderbuss_spray' },
          dmgType: 'bullet', sfx: 'shot_blunderbuss', followBehind: 60, maxTargets: 3,
        },
      ],
      abilities: [],
      visualId: 'unit.blunderbuss', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.blunderbuss.name', descKey: 'card.blunderbuss.desc', strongVs: [], weakVs: [],
    },
    {
      // Gunner Heavy: a mounted carbine, range 90, splash r30; armored
      id: 'dragoon', kind: 'unit', age: 'gunpowder', rarity: 'common', role: 'heavy', group: 'heavy',
      cost: 150, trainMs: 4000, pop: 6, hp: 820, speed: 55, size: 'large',
      tags: ['armored', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 49, intervalMs: 1500, windupPct: 50, range: 90, hitsGround: true, hitsAir: false,
          projectile: { speed: 1500, visualId: 'proj.musket' },
          dmgType: 'bullet', sfx: 'shot_dragoon', splashRadius: 30,
        },
      ],
      abilities: [],
      visualId: 'unit.dragoon', sfx: { spawn: 'spawn_heavy', die: 'die_bio' },
      nameKey: 'card.dragoon.name', descKey: 'card.dragoon.desc', strongVs: [], weakVs: [],
    },
    {
      // Long range (H6, A5.1; range +50-80 on 2026-10-07): an arcing mortar shell at the target's spot, splash r35; range 440, min 90; half to bases; ground only
      id: 'coehorn_crew', kind: 'unit', age: 'gunpowder', rarity: 'rare', role: 'ranged', group: 'ranged',
      cost: 75, trainMs: 2000, pop: 3, hp: 210, speed: 60, size: 'small',
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 80, intervalMs: 3000, windupPct: 50, range: 440, minRange: 90, hitsGround: true, hitsAir: false,
          projectile: { speed: 300, arc: true, visualId: 'proj.mortar_shell' },
          dmgType: 'blast', sfx: 'shot_coehorn', splashRadius: 35, vsBaseDamage: 31,
        },
      ],
      abilities: [],
      visualId: 'unit.coehorn_crew', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.coehorn_crew.name', descKey: 'card.coehorn_crew.desc', strongVs: [], weakVs: [],
    },
    {
      // Ranged Anti-heavy: a long wall-gun on a forked rest, range 220; ranged AA mods (armored and mech ×3,
      // Legendary ×2, light ×0.5); Brace; priority armored; ground only
      id: 'wall_gunner', kind: 'unit', age: 'gunpowder', rarity: 'rare', role: 'antiArmor', group: 'antiArmor',
      cost: 100, trainMs: 2500, pop: 4, hp: 210, speed: 65, size: 'medium',
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 40, intervalMs: 2000, windupPct: 50, range: 220, hitsGround: true, hitsAir: false,
          projectile: { speed: 1500, visualId: 'proj.musket' },
          dmgType: 'bullet', sfx: 'shot_wallgun', mods: damageMods.rangedAntiArmor, priority: 'armored',
        },
      ],
      abilities: [{ kind: 'brace' }],
      visualId: 'unit.wall_gunner', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.wall_gunner.name', descKey: 'card.wall_gunner.desc', strongVs: [], weakVs: [],
    },
    {
      // Aura: allies within 160 lu attack 25% faster; a drumroll boom rings on the target; followSupport
      id: 'drummer_boy', kind: 'unit', age: 'gunpowder', rarity: 'rare', role: 'support', group: 'support',
      cost: 110, trainMs: 3000, pop: 4, hp: 340, speed: 65, size: 'small',
      tags: ['light', 'bio', 'support', 'ranged', 'ground'],
      attacks: [
        {
          damage: 32, intervalMs: 1200, windupPct: 50, range: 150, hitsGround: true, hitsAir: true,
          projectile: { instant: true, effectId: 'fx.drum_boom' },
          dmgType: 'blunt', sfx: 'drum_roll',
        },
      ],
      abilities: [
        { kind: 'aura', radius: 160, status: { kind: 'attackSpeedBuff', magnitudeBp: 2500, durationMs: 0 } },
        { kind: 'followSupport', behindFront: 60, soloMaxP: 200 },
      ],
      visualId: 'unit.drummer_boy', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.drummer_boy.name', descKey: 'card.drummer_boy.desc', strongVs: [], weakVs: [],
    },
    {
      // Dread (M4): enemy ground units within 140 lu move 35% slower; a droning blast from the pipes; followSupport
      id: 'bagpiper', kind: 'unit', age: 'gunpowder', rarity: 'rare', role: 'support', group: 'support',
      cost: 110, trainMs: 3000, pop: 4, hp: 420, speed: 60, size: 'small',
      tags: ['light', 'bio', 'support', 'ranged', 'ground'],
      attacks: [
        {
          damage: 40, intervalMs: 1200, windupPct: 50, range: 150, hitsGround: true, hitsAir: true,
          projectile: { instant: true, effectId: 'fx.pipe_drone' },
          dmgType: 'blunt', sfx: 'pipe_drone',
        },
      ],
      abilities: [
        { kind: 'aura', radius: 140, status: { kind: 'slow', magnitudeBp: 3500, durationMs: 0 }, foe: true },
        { kind: 'followSupport', behindFront: 60, soloMaxP: 200 },
      ],
      visualId: 'unit.bagpiper', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.bagpiper.name', descKey: 'card.bagpiper.desc', strongVs: [], weakVs: [],
    },
    {
      // Artillery: a rack of 4 rockets, each 70 splash r30, landing within ±40 lu of the aim / 3.5 s; range 330
      // (min 90); half to bases; ground only
      id: 'rocket_cart', kind: 'unit', age: 'gunpowder', rarity: 'epic', role: 'artillery', group: 'epic',
      cost: 200, trainMs: 4000, pop: 8, hp: 1300, speed: 45, size: 'large',
      tags: ['light', 'mech', 'ranged', 'ground'],
      attacks: [
        {
          damage: 70, intervalMs: 3500, windupPct: 50, range: 330, minRange: 90, hitsGround: true, hitsAir: false,
          projectile: { speed: 900, visualId: 'proj.rocket' },
          dmgType: 'blast', sfx: 'shot_rocket', splashRadius: 30, volley: 4, scatter: 40, vsBaseDamage: 20,
        },
      ],
      abilities: [],
      visualId: 'unit.rocket_cart', sfx: { spawn: 'spawn_heavy', die: 'die_mech' },
      nameKey: 'card.rocket_cart.name', descKey: 'card.rocket_cart.desc', strongVs: [], weakVs: [],
    },
    {
      // Skirmisher: leaps on a back-line unit within 180 lu (pounce), the first strike ×2; sabre 78 / 0.9 s
      id: 'hussar', kind: 'unit', age: 'gunpowder', rarity: 'epic', role: 'skirmisher', group: 'epic',
      cost: 200, trainMs: 4000, pop: 8, hp: 1000, speed: 95, size: 'large',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 78, intervalMs: 900, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'slash', sfx: 'sabre_slash',
        },
      ],
      abilities: [{ kind: 'pounce', searchRange: 180, cooldownMs: 12000, leapMs: 500, firstBiteBp: 20000 }],
      visualId: 'unit.hussar', sfx: { spawn: 'spawn_heavy', die: 'die_bio' },
      nameKey: 'card.hussar.name', descKey: 'card.hussar.desc', strongVs: [], weakVs: [],
    },
    {
      // Caster: every 12 s, while an enemy is within 140 lu, dazes every enemy there for 1.0 s (Legendaries 0.5 s;
      // dizzy look, M5); a hypnotic spiral at the target 58 / 1.2 s; followSupport
      id: 'mesmerist', kind: 'unit', age: 'gunpowder', rarity: 'epic', role: 'support', group: 'epic',
      cost: 200, trainMs: 4000, pop: 8, hp: 1050, speed: 60, size: 'small',
      tags: ['light', 'bio', 'support', 'ranged', 'ground'],
      attacks: [
        {
          damage: 58, intervalMs: 1200, windupPct: 50, range: 170, hitsGround: true, hitsAir: true,
          projectile: { instant: true, effectId: 'fx.mesmer_spiral' },
          dmgType: 'blunt', sfx: 'mesmer_chime',
        },
      ],
      abilities: [
        { kind: 'timeStop', everyMs: 12000, radius: 140, freezeMs: 1000, legendaryFreezeMs: 500, frozen: false },
        { kind: 'followSupport', behindFront: 60, soloMaxP: 200 },
      ],
      visualId: 'unit.mesmerist', sfx: { spawn: 'spawn_heavy', die: 'die_bio' },
      nameKey: 'card.mesmerist.name', descKey: 'card.mesmerist.desc', strongVs: [], weakVs: [],
    },
    {
      // Legendary commander on a white horse: sabre sweep 80 / 1.5 s, cleave 2 (reach 30); aura +15% damage
      // within 200; every 10 s a cannonball lands on the nearest enemy ground unit within 400 after 1.0 s (120 splash r50)
      id: 'grand_marshal', kind: 'unit', age: 'gunpowder', rarity: 'legendary', role: 'heavy', group: 'legendary',
      cost: 350, trainMs: 7000, pop: 14, hp: 1500, speed: 55, size: 'huge',
      tags: ['armored', 'bio', 'melee', 'legendary', 'ground'],
      attacks: [
        {
          damage: 80, intervalMs: 1500, windupPct: 40, range: 20, hitsGround: true, hitsAir: false,
          dmgType: 'slash', sfx: 'marshal_sweep', cleave: { count: 2, reach: 30 },
        },
      ],
      abilities: [
        { kind: 'aura', radius: 200, status: { kind: 'damageBuff', magnitudeBp: 1500, durationMs: 0 } },
        { kind: 'callStrike', everyMs: 10000, searchRange: 400, delayMs: 1000, damage: 120, radius: 50, sideLockoutMs: 3000 },
      ],
      visualId: 'unit.grand_marshal', sfx: { spawn: 'spawn_legendary', die: 'die_bio' },
      nameKey: 'card.grand_marshal.name', descKey: 'card.grand_marshal.desc', strongVs: [], weakVs: [],
    },
  ],
  turrets: [
    {
      // Single target
      id: 'swivel_gun', kind: 'turret', age: 'gunpowder', rarity: 'common', starter: true, cost: 150,
      attack: {
        damage: 22, intervalMs: 600, windupPct: 0, range: 340, hitsGround: true, hitsAir: true,
        projectile: { speed: 1500, visualId: 'proj.musket' },
        dmgType: 'bullet', sfx: 'shot_musket',
      },
      visualId: 'turret.swivel_gun', nameKey: 'card.swivel_gun.name', descKey: 'card.swivel_gun.desc',
    },
    {
      // Hits the frontmost enemy in range and enemies within 90 lu behind it; max 4 targets
      id: 'grapeshot_gun', kind: 'turret', age: 'gunpowder', rarity: 'common', starter: true, cost: 175,
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
    {
      // W4 Gunpowder wave. Breaker: a short fat carronade, 66 (3 × the Swivel Gun) every 2.5 s at the nearest
      // armored ground enemy in range (else the front); ground only
      id: 'carronade', kind: 'turret', age: 'gunpowder', rarity: 'common', cost: 175,
      attack: {
        damage: 66, intervalMs: 2500, windupPct: 0, range: 320, hitsGround: true, hitsAir: false,
        projectile: { speed: 1200, visualId: 'proj.cannonball' },
        dmgType: 'blunt', sfx: 'shot_carronade', priority: 'armored',
      },
      visualId: 'turret.carronade', nameKey: 'card.carronade.name', descKey: 'card.carronade.desc',
    },
    {
      // W4 Gunpowder wave. Arc: a squat sea mortar, 149 splash r50 every 4.5 s on a high arc, range 480 (min 150); ground only
      id: 'sea_mortar', kind: 'turret', age: 'gunpowder', rarity: 'rare', cost: 250,
      attack: {
        damage: 149, intervalMs: 4500, windupPct: 0, range: 480, minRange: 150, hitsGround: true, hitsAir: false,
        projectile: { speed: 450, arc: true, visualId: 'proj.cannonball' },
        dmgType: 'blast', sfx: 'shot_sea_mortar', splashRadius: 50,
      },
      visualId: 'turret.sea_mortar', nameKey: 'card.sea_mortar.name', descKey: 'card.sea_mortar.desc',
    },
  ],
  // A16.14.4 Forts (Gunpowder, P 1.82): War Path L4 camp, L6 trap, L8 tower; Road fort set at 2,500
  forts: [
    wall('gunpowder', 'gabion_wall'),
    tower('gunpowder', 'musket_redoubt', { warPath: 8, road: 2500 }),
    camp('gunpowder', 'militia_muster', 'militiaman', { warPath: 4, road: 2500 }),
    trap('gunpowder', 'powder_keg', { warPath: 6, road: 2500 }, { charges: 1, damage: 230, radius: 60 }),
    // W4 Gunpowder wave variants: a brute camp (its levy, the Picket Rider, is 25% of the Cuirassier, every 18 s;
    // War Path Gunpowder s2) and a double blast trap (2 charges × 131 = 0.45 × the Corsair, splash r45; the
    // Gunpowder 20-star milestone). Road fallback 4,400. Released with their art.
    camp('gunpowder', 'cavalry_picket', 'picket_rider', { side: 2, road: 4400 }, { levyFrom: { group: 'heavy', hpBp: 2500, damageBp: 2500 }, everyMs: 18000, maxAlive: 1 }),
    trap('gunpowder', 'fougasse', { stars: 20, road: 4400 }, { charges: 2, damage: 131, radius: 45 }),
  ],
};
