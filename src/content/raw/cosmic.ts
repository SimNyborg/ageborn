/**
 * Cosmic Age (P 4.48): docs/design-lane-ages.md A17.11 units, turrets and powers (to be merged into
 * DESIGN as A5.x), A17.12 attack mapping. The last age of Full War. Table units: HP and damage whole,
 * ms, lu, lu/s, gold, bp. Data only. `strongVs`/`weakVs` are filled by the WP1 counter matrix (B4).
 *
 * The age's P, base HP and threshold live in `economy.ts` (`ageScale`, A17.8).
 */
import type { PowerDef } from '@/contracts/content';
import { damageMods } from './economy';
import { camp, FORT_COST, slow, tower, trap, wall } from './fortKit';
import type { RawAgeTables } from './types';

export const cosmic: RawAgeTables = {
  age: 'cosmic',
  units: [
    {
      // Blunt. Deflector: takes 20% less damage from attacks with range ≥ 100 (not powers), as Shield Wall
      id: 'star_legionnaire', kind: 'unit', age: 'cosmic', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 50, trainMs: 1500, pop: 2, hp: 700, speed: 75, size: 'small', starter: true,
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 90, intervalMs: 1000, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'laser', sfx: 'swing_whoosh', mods: damageMods.blunt,
        },
      ],
      // bp is the share of damage resisted (20%), as Footman's Shield Wall
      abilities: [{ kind: 'resist', minSourceRange: 100, bp: 2000 }],
      visualId: 'unit.star_legionnaire', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.star_legionnaire.name', descKey: 'card.star_legionnaire.desc', strongVs: [], weakVs: [],
    },
    {
      // Ion bolt. Arc: the bolt jumps to 1 more enemy within 50 lu (chain, 2 targets total), as Ricochet
      id: 'ion_ranger', kind: 'unit', age: 'cosmic', rarity: 'common', role: 'ranged', group: 'ranged',
      cost: 75, trainMs: 2000, pop: 3, hp: 426, speed: 65, size: 'small', starter: true,
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 54, intervalMs: 1000, windupPct: 50, range: 270, hitsGround: true, hitsAir: true,
          projectile: { speed: 1800, visualId: 'proj.ion' },
          dmgType: 'laser', sfx: 'shot_ion', chain: { count: 2, hop: 50 },
        },
      ],
      abilities: [],
      visualId: 'unit.ion_ranger', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.ion_ranger.name', descKey: 'card.ion_ranger.desc', strongVs: [], weakVs: [],
    },
    {
      // Plasma cannon at range 90; hovers (still a ground unit: it blocks and is blocked)
      id: 'hover_tank', kind: 'unit', age: 'cosmic', rarity: 'common', role: 'heavy', group: 'heavy',
      cost: 150, trainMs: 4000, pop: 6, hp: 2509, speed: 55, size: 'large', starter: true,
      tags: ['armored', 'mech', 'ranged', 'ground'],
      attacks: [
        {
          damage: 179, intervalMs: 1500, windupPct: 50, range: 90, hitsGround: true, hitsAir: false,
          projectile: { speed: 1800, visualId: 'proj.plasma' },
          dmgType: 'blast', sfx: 'shot_plasma',
        },
      ],
      abilities: [],
      visualId: 'unit.hover_tank', sfx: { spawn: 'spawn_heavy', die: 'die_mech' },
      nameKey: 'card.hover_tank.name', descKey: 'card.hover_tank.desc', strongVs: [], weakVs: [],
    },
    {
      // Reach 70; melee AA mods; priority armored; Brace (immune to knockback and to first-hit bonuses)
      id: 'graviton_halberdier', kind: 'unit', age: 'cosmic', rarity: 'rare', role: 'antiArmor', group: 'antiArmor',
      cost: 100, trainMs: 2500, pop: 4, hp: 985, speed: 70, size: 'medium', starter: true,
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 116, intervalMs: 1200, windupPct: 40, range: 70, hitsGround: true, hitsAir: false,
          dmgType: 'laser', sfx: 'swing_whoosh', mods: damageMods.meleeAntiArmor, priority: 'armored',
        },
      ],
      abilities: [{ kind: 'brace' }],
      visualId: 'unit.graviton_halberdier', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.graviton_halberdier.name', descKey: 'card.graviton_halberdier.desc', strongVs: [], weakVs: [],
    },
    {
      // Shield Beacon every 8 s while it has a target: the nearest 4 allies within 180 lu get a 200 shield
      // for 5 s (the Roar pattern); followSupport
      id: 'starwarden', kind: 'unit', age: 'cosmic', rarity: 'rare', role: 'support', group: 'support',
      cost: 110, trainMs: 3000, pop: 4, hp: 582, speed: 65, size: 'small',
      tags: ['light', 'bio', 'support', 'ranged', 'ground'],
      attacks: [
        {
          damage: 36, intervalMs: 1200, windupPct: 50, range: 150, hitsGround: true, hitsAir: true,
          projectile: { speed: 1800, visualId: 'proj.ion' },
          dmgType: 'laser', sfx: 'shot_ion',
        },
      ],
      abilities: [
        { kind: 'periodicShieldAura', everyMs: 8000, radius: 180, maxTargets: 4, shield: 200, durationMs: 5000 },
        { kind: 'followSupport', behindFront: 60, soloMaxP: 200 },
      ],
      visualId: 'unit.starwarden', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.starwarden.name', descKey: 'card.starwarden.desc', strongVs: [], weakVs: [],
    },
    {
      // Blink (10 s cooldown): when blocked, warps (0.4 s, untargetable by melee) to the nearest enemy ranged
      // or support unit within 200 lu beyond the blocker; first strike ×2. The Sabertooth pounce rule
      id: 'warp_stalker', kind: 'unit', age: 'cosmic', rarity: 'epic', role: 'skirmisher', group: 'epic',
      cost: 200, trainMs: 4000, pop: 8, hp: 1600, speed: 100, size: 'medium',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 140, intervalMs: 800, windupPct: 40, range: 12, hitsGround: true, hitsAir: false,
          dmgType: 'slash', sfx: 'swing_whoosh',
        },
      ],
      abilities: [{ kind: 'pounce', searchRange: 200, cooldownMs: 10000, leapMs: 400, firstBiteBp: 20000 }],
      visualId: 'unit.warp_stalker', sfx: { spawn: 'spawn_heavy', die: 'die_bio' },
      nameKey: 'card.warp_stalker.name', descKey: 'card.warp_stalker.desc', strongVs: [], weakVs: [],
    },
    {
      // Air gunship (obeys stance). Beam 40 / 0.6 s at range 180 (G+A). Drone Strike every 10 s: a strike on
      // the nearest enemy ground unit within 400 lu lands after 1.0 s for 150 splash r50 (area rule; one
      // call-in per side per 3 s, shared with the Radio Operator). On death crashes for 350 splash r80
      id: 'mothership', kind: 'unit', age: 'cosmic', rarity: 'legendary', role: 'airGunship', group: 'legendary',
      cost: 350, trainMs: 7000, pop: 14, hp: 2100, speed: 40, size: 'huge',
      tags: ['air', 'mech', 'legendary'],
      attacks: [
        {
          damage: 40, intervalMs: 600, windupPct: 50, range: 180, hitsGround: true, hitsAir: true,
          projectile: { instant: true, effectId: 'fx.beam_void' },
          dmgType: 'laser', sfx: 'shot_void',
        },
      ],
      abilities: [
        { kind: 'callStrike', everyMs: 10000, searchRange: 400, delayMs: 1000, damage: 150, radius: 50, sideLockoutMs: 3000 },
        { kind: 'onDeathExplode', damage: 350, radius: 80 },
      ],
      visualId: 'unit.mothership', sfx: { spawn: 'spawn_legendary', die: 'die_mech' },
      nameKey: 'card.mothership.name', descKey: 'card.mothership.desc', strongVs: [], weakVs: [],
    },
    // ---- W8 Cosmic wave (content expansion, CONTENT_PLAN 5.8): capsule cards, appended in build order. The
    // Cosmic age first drops in Arena 3, so its new Commons arrive there; Rares 3, Epics 4, Legendaries 5
    // (`cardArena`). Templates: plan 4 (I 700, R 426, H 2,509 at P 4.48). Released 2026-10-04 with the wave's art,
    // sounds and measured numbers (docs/decisions.md).
    {
      // Guard: the crystal body takes 25% less from attacks with range ≥ 100 (not powers); Blunt
      id: 'crystal_guard', kind: 'unit', age: 'cosmic', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 50, trainMs: 1500, pop: 2, hp: 890, speed: 70, size: 'small',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 67, intervalMs: 1000, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'blunt', sfx: 'crystal_slam', mods: damageMods.blunt,
        },
      ],
      abilities: [{ kind: 'resist', minSourceRange: 100, bp: 2500 }],
      visualId: 'unit.crystal_guard', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.crystal_guard.name', descKey: 'card.crystal_guard.desc', strongVs: [], weakVs: [],
    },
    {
      // Raider: a hover board at 110 lu/s; a board-flip kick, 90 to bases
      id: 'void_skimmer', kind: 'unit', age: 'cosmic', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 50, trainMs: 1500, pop: 2, hp: 670, speed: 110, size: 'small',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 94, intervalMs: 1000, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'slash', sfx: 'board_kick', vsBaseDamage: 90,
        },
      ],
      abilities: [],
      visualId: 'unit.void_skimmer', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.void_skimmer.name', descKey: 'card.void_skimmer.desc', strongVs: [], weakVs: [],
    },
    {
      // Trio (X0 M1): one card trains 3 little moon aliens; stats per Moonling, cost and pop split evenly. Each
      // hops and spits a glowing pellet; ground and air
      id: 'moonlings', kind: 'unit', age: 'cosmic', rarity: 'common', role: 'ranged', group: 'ranged',
      cost: 75, trainMs: 2000, pop: 3, hp: 172, speed: 65, size: 'small',
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 21, intervalMs: 1000, windupPct: 50, range: 230, hitsGround: true, hitsAir: true,
          projectile: { speed: 1200, visualId: 'proj.moon_pellet' },
          dmgType: 'laser', sfx: 'moon_spit',
        },
      ],
      abilities: [],
      squad: { count: 3 },
      visualId: 'unit.moonlings', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.moonlings.name', descKey: 'card.moonlings.desc', strongVs: [], weakVs: [],
    },
    {
      // Thrower: an underhand nova orb lobbed at the target's spot, splash r30; ground only
      id: 'nova_thrower', kind: 'unit', age: 'cosmic', rarity: 'common', role: 'ranged', group: 'ranged',
      cost: 75, trainMs: 2000, pop: 3, hp: 440, speed: 65, size: 'small',
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 62, intervalMs: 1150, windupPct: 50, range: 240, hitsGround: true, hitsAir: false,
          projectile: { speed: 450, arc: true, visualId: 'proj.nova_orb' },
          dmgType: 'blast', sfx: 'nova_lob', splashRadius: 30,
        },
      ],
      abilities: [],
      visualId: 'unit.nova_thrower', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.nova_thrower.name', descKey: 'card.nova_thrower.desc', strongVs: [], weakVs: [],
    },
    {
      // Brute (armored, a rock construct): a boulder-fist uppercut, cleave 2 (reach 30); no first-hit bonus
      id: 'asteroid_golem', kind: 'unit', age: 'cosmic', rarity: 'common', role: 'heavy', group: 'heavy',
      cost: 150, trainMs: 4000, pop: 6, hp: 2950, speed: 50, size: 'large',
      tags: ['armored', 'mech', 'melee', 'ground'],
      attacks: [
        {
          damage: 146, intervalMs: 1500, windupPct: 40, range: 20, hitsGround: true, hitsAir: false,
          dmgType: 'blunt', sfx: 'golem_uppercut', cleave: { count: 2, reach: 30 },
        },
      ],
      abilities: [],
      visualId: 'unit.asteroid_golem', sfx: { spawn: 'spawn_heavy', die: 'die_mech' },
      nameKey: 'card.asteroid_golem.name', descKey: 'card.asteroid_golem.desc', strongVs: [], weakVs: [],
    },
    {
      // Long range (H6, A5.1; range +50-80 on 2026-10-07): a gravity mortar lobs a tiny star high at the target's spot, splash r35; range 440,
      // min 90; half to bases; ground only
      id: 'star_mortar', kind: 'unit', age: 'cosmic', rarity: 'rare', role: 'ranged', group: 'ranged',
      cost: 75, trainMs: 2000, pop: 3, hp: 470, speed: 60, size: 'small',
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 190, intervalMs: 2800, windupPct: 50, range: 440, minRange: 90, hitsGround: true, hitsAir: false,
          projectile: { speed: 300, arc: true, visualId: 'proj.mini_star' },
          dmgType: 'blast', sfx: 'shot_star_mortar', splashRadius: 35, vsBaseDamage: 98,
        },
      ],
      abilities: [],
      visualId: 'unit.star_mortar', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.star_mortar.name', descKey: 'card.star_mortar.desc', strongVs: [], weakVs: [],
    },
    {
      // Ranged Anti-heavy: an antimatter cannon, range 220; ranged AA mods (armored and mech ×3, Legendary ×2, light
      // ×0.5); Brace; priority armored; ground only (keeps the Mothership's answers as designed, A17.11)
      id: 'antimatter_rifler', kind: 'unit', age: 'cosmic', rarity: 'rare', role: 'antiArmor', group: 'antiArmor',
      cost: 100, trainMs: 2500, pop: 4, hp: 700, speed: 65, size: 'medium',
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 140, intervalMs: 1600, windupPct: 50, range: 220, hitsGround: true, hitsAir: false,
          projectile: { speed: 1500, visualId: 'proj.antimatter' },
          dmgType: 'laser', sfx: 'shot_antimatter', mods: damageMods.rangedAntiArmor, priority: 'armored',
        },
      ],
      abilities: [{ kind: 'brace' }],
      visualId: 'unit.antimatter_rifler', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.antimatter_rifler.name', descKey: 'card.antimatter_rifler.desc', strongVs: [], weakVs: [],
    },
    {
      // Heal: 135 HP/s split between the 2 most hurt allies within 160 lu (pulses every 0.5 s); a tendril flick hits
      // the target; followSupport
      id: 'bio_weaver', kind: 'unit', age: 'cosmic', rarity: 'rare', role: 'support', group: 'support',
      cost: 110, trainMs: 3000, pop: 4, hp: 580, speed: 65, size: 'small',
      tags: ['light', 'bio', 'support', 'ranged', 'ground'],
      attacks: [
        {
          damage: 36, intervalMs: 1200, windupPct: 50, range: 150, hitsGround: true, hitsAir: true,
          projectile: { instant: true, effectId: 'fx.tendril_lash' },
          dmgType: 'slash', sfx: 'tendril_flick',
        },
      ],
      abilities: [
        { kind: 'heal', hpPerSec: 135, radius: 160, targets: 2, pulseMs: 500 },
        { kind: 'followSupport', behindFront: 60, soloMaxP: 200 },
      ],
      visualId: 'unit.bio_weaver', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.bio_weaver.name', descKey: 'card.bio_weaver.desc', strongVs: [], weakVs: [],
    },
    {
      // Dread aura (X0 M4): enemy ground units within 130 lu move 20% slower; a whispered void ripple hits the
      // target; followSupport
      id: 'void_whisperer', kind: 'unit', age: 'cosmic', rarity: 'rare', role: 'support', group: 'support',
      cost: 110, trainMs: 3000, pop: 4, hp: 760, speed: 60, size: 'small',
      tags: ['light', 'bio', 'support', 'ranged', 'ground'],
      attacks: [
        {
          damage: 48, intervalMs: 1200, windupPct: 50, range: 150, hitsGround: true, hitsAir: true,
          projectile: { instant: true, effectId: 'fx.void_ripple' },
          dmgType: 'laser', sfx: 'void_whisper',
        },
      ],
      abilities: [
        { kind: 'aura', radius: 130, status: { kind: 'slow', magnitudeBp: 2000, durationMs: 0 }, foe: true },
        { kind: 'followSupport', behindFront: 60, soloMaxP: 200 },
      ],
      visualId: 'unit.void_whisperer', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.void_whisperer.name', descKey: 'card.void_whisperer.desc', strongVs: [], weakVs: [],
    },
    {
      // Air gunship (mech): twin lasers, 48 every 0.5 s, range 170, ground and air; obeys stance
      id: 'star_fighter', kind: 'unit', age: 'cosmic', rarity: 'epic', role: 'airGunship', group: 'epic',
      cost: 200, trainMs: 4000, pop: 8, hp: 1250, speed: 85, size: 'medium',
      tags: ['air', 'mech'],
      attacks: [
        {
          damage: 48, intervalMs: 500, windupPct: 50, range: 170, hitsGround: true, hitsAir: true,
          projectile: { speed: 2000, visualId: 'proj.twin_laser' },
          dmgType: 'laser', sfx: 'shot_twin_laser',
        },
      ],
      abilities: [],
      visualId: 'unit.star_fighter', sfx: { spawn: 'spawn_heavy', die: 'die_mech' },
      nameKey: 'card.star_fighter.name', descKey: 'card.star_fighter.desc', strongVs: [], weakVs: [],
    },
    {
      // Summoner (X0 M3): a six-legged brood mother; the egg sac sends a Swarmling every 7 s, at most 3; spits a
      // glob, 50 every 1.2 s, range 150, ground and air
      id: 'swarm_matron', kind: 'unit', age: 'cosmic', rarity: 'epic', role: 'support', group: 'epic',
      cost: 200, trainMs: 4000, pop: 8, hp: 1300, speed: 60, size: 'medium',
      tags: ['light', 'bio', 'ranged', 'ground'],
      attacks: [
        {
          damage: 50, intervalMs: 1200, windupPct: 50, range: 150, hitsGround: true, hitsAir: true,
          projectile: { speed: 900, visualId: 'proj.swarm_glob' },
          dmgType: 'blast', sfx: 'matron_spit',
        },
      ],
      abilities: [
        { kind: 'summon', card: 'swarmling', firstMs: 2000, everyMs: 7000, maxAlive: 3 },
        { kind: 'followSupport', behindFront: 60, soloMaxP: 200 },
      ],
      visualId: 'unit.swarm_matron', sfx: { spawn: 'spawn_heavy', die: 'die_bio' },
      nameKey: 'card.swarm_matron.name', descKey: 'card.swarm_matron.desc', strongVs: [], weakVs: [],
    },
    {
      // Caster: flings a small gravity orb, 70 every 1.2 s, range 160, ground and air. Collapse (M5 flag): every 14 s
      // enemies within 120 lu are stunned 1.0 s (Legendaries 0.5 s) with crushed stars, not the clock freeze;
      // followSupport
      id: 'gravity_sage', kind: 'unit', age: 'cosmic', rarity: 'epic', role: 'support', group: 'epic',
      cost: 200, trainMs: 4000, pop: 8, hp: 1700, speed: 60, size: 'small',
      tags: ['light', 'bio', 'support', 'ranged', 'ground'],
      attacks: [
        {
          damage: 70, intervalMs: 1200, windupPct: 50, range: 160, hitsGround: true, hitsAir: true,
          projectile: { speed: 1100, visualId: 'proj.sage_orb' },
          dmgType: 'laser', sfx: 'sage_orb',
        },
      ],
      abilities: [
        { kind: 'timeStop', everyMs: 14000, radius: 120, freezeMs: 1000, legendaryFreezeMs: 500, frozen: false },
        { kind: 'followSupport', behindFront: 60, soloMaxP: 200 },
      ],
      visualId: 'unit.gravity_sage', sfx: { spawn: 'spawn_heavy', die: 'die_bio' },
      nameKey: 'card.gravity_sage.name', descKey: 'card.gravity_sage.desc', strongVs: [], weakVs: [],
    },
    {
      // Legendary void beast (hovers just above the ground; a ground unit like the Hover Tank): a sonic song cone,
      // 118 every 2.0 s, range 90, hitting the target and up to 4 more within 100 lu behind it; two Moonling riders
      // spit 20 every 1.4 s (range 200, ground and air; only the song stops it); when it falls the two Moonlings
      // hop off (summoned)
      id: 'star_leviathan', kind: 'unit', age: 'cosmic', rarity: 'legendary', role: 'heavy', group: 'legendary',
      cost: 350, trainMs: 7000, pop: 14, hp: 2800, speed: 40, size: 'huge',
      tags: ['armored', 'bio', 'ranged', 'legendary', 'ground'],
      attacks: [
        {
          damage: 118, intervalMs: 2000, windupPct: 50, range: 90, hitsGround: true, hitsAir: false,
          projectile: { instant: true, effectId: 'fx.song_wave' },
          dmgType: 'blast', sfx: 'leviathan_song', followBehind: 100, maxTargets: 5,
        },
      ],
      abilities: [
        {
          kind: 'riders', count: 2, onDeathSpawn: 'moonlings',
          attack: {
            damage: 20, intervalMs: 1400, windupPct: 50, range: 200, hitsGround: true, hitsAir: true,
            projectile: { speed: 1200, visualId: 'proj.moon_pellet' },
            dmgType: 'laser', sfx: 'moon_spit',
          },
        },
      ],
      visualId: 'unit.star_leviathan', sfx: { spawn: 'spawn_legendary', die: 'die_bio' },
      nameKey: 'card.star_leviathan.name', descKey: 'card.star_leviathan.desc', strongVs: [], weakVs: [],
    },
    {
      // Swarm Matron's summon (X0 M3): a fast little void bug, about 35% of a Star Legionnaire; no pop, no bounty,
      // always marches
      id: 'swarmling', kind: 'unit', age: 'cosmic', rarity: 'common', role: 'infantry', group: 'infantry',
      cost: 0, trainMs: 1500, pop: 2, hp: 250, speed: 95, size: 'small',
      tags: ['light', 'bio', 'melee', 'ground'],
      attacks: [
        {
          damage: 30, intervalMs: 1000, windupPct: 40, range: 16, hitsGround: true, hitsAir: false,
          dmgType: 'slash', sfx: 'swarm_bite',
        },
      ],
      abilities: [],
      visualId: 'unit.swarmling', sfx: { spawn: 'spawn_pop', die: 'die_bio' },
      nameKey: 'card.swarmling.name', descKey: 'card.swarmling.desc', strongVs: [], weakVs: [],
      hidden: true, summon: true, aiValue: 20,
    },
  ],
  turrets: [
    {
      // Instant beam, single target
      id: 'ion_turret', kind: 'turret', age: 'cosmic', rarity: 'common', starter: true, cost: 150,
      attack: {
        damage: 27, intervalMs: 300, windupPct: 0, range: 370, hitsGround: true, hitsAir: true,
        projectile: { instant: true, effectId: 'fx.beam_ion' },
        dmgType: 'laser', sfx: 'shot_ion',
      },
      visualId: 'turret.ion_turret', nameKey: 'card.ion_turret.name', descKey: 'card.ion_turret.desc',
    },
    {
      // Hits the frontmost enemy in range and enemies within 90 lu behind it; max 4 targets (Grapeshot rule)
      id: 'starburst_gun', kind: 'turret', age: 'cosmic', rarity: 'common', starter: true, cost: 175,
      attack: {
        damage: 123, intervalMs: 2000, windupPct: 0, range: 240, hitsGround: true, hitsAir: true,
        projectile: { speed: 1800, visualId: 'proj.starburst' },
        dmgType: 'laser', sfx: 'shot_starburst', followBehind: 90, maxTargets: 4,
      },
      visualId: 'turret.starburst_gun', nameKey: 'card.starburst_gun.name', descKey: 'card.starburst_gun.desc',
    },
    {
      // 363 splash r60 / 5.0 s, range 480 (min 180), arc
      id: 'starfall_battery', kind: 'turret', age: 'cosmic', rarity: 'rare', cost: 250,
      attack: {
        damage: 363, intervalMs: 5000, windupPct: 0, range: 480, minRange: 180, hitsGround: true, hitsAir: false,
        projectile: { speed: 450, arc: true, visualId: 'proj.star_shard' },
        dmgType: 'blast', sfx: 'shot_plasma', splashRadius: 60,
      },
      visualId: 'turret.starfall_battery', nameKey: 'card.starfall_battery.name', descKey: 'card.starfall_battery.desc',
    },
    {
      // Instant lance; pierces 4 targets total within 250 lu, starting at the target (Chainshot rule); hits air
      id: 'tachyon_lance', kind: 'turret', age: 'cosmic', rarity: 'epic', cost: 250,
      attack: {
        damage: 184, intervalMs: 4000, windupPct: 0, range: 420, hitsGround: true, hitsAir: true,
        projectile: { instant: true, effectId: 'fx.beam_tachyon' },
        dmgType: 'laser', sfx: 'shot_tachyon', pierce: { count: 4, length: 250 },
      },
      visualId: 'turret.tachyon_lance', nameKey: 'card.tachyon_lance.name', descKey: 'card.tachyon_lance.desc',
    },
    {
      // W8 Cosmic wave. Volley: a crystal cluster cracks open and spits 3 shards every 1.5 s, each 40 and piercing 2
      // within 60 lu; range 280, ground and air
      id: 'shard_spitter', kind: 'turret', age: 'cosmic', rarity: 'common', cost: 175,
      attack: {
        damage: 40, intervalMs: 1500, windupPct: 0, range: 280, hitsGround: true, hitsAir: true,
        projectile: { speed: 900, visualId: 'proj.shard' },
        dmgType: 'pierce', sfx: 'shot_shard', volley: 3, pierce: { count: 2, length: 60 },
      },
      visualId: 'turret.shard_spitter', nameKey: 'card.shard_spitter.name', descKey: 'card.shard_spitter.desc',
    },
    {
      // W8 Cosmic wave. Zone: a dark ring by your gate pulses inward, 120 every 1.0 s to ground enemies within
      // 150 lu of the gate (max 4), each hit slows 30% for 1 s
      id: 'event_horizon', kind: 'turret', age: 'cosmic', rarity: 'rare', cost: 250,
      attack: {
        damage: 120, intervalMs: 1000, windupPct: 0, range: 150, hitsGround: true, hitsAir: false,
        projectile: { instant: true, effectId: 'fx.horizon_pulse' },
        dmgType: 'laser', sfx: 'horizon_pulse', gateZone: { radius: 150 }, maxTargets: 4,
        onHit: [{ kind: 'slow', magnitudeBp: 3000, durationMs: 1000 }],
      },
      visualId: 'turret.event_horizon', nameKey: 'card.event_horizon.name', descKey: 'card.event_horizon.desc',
    },
  ],
  // A16.14.4 Forts (Cosmic, P 4.48): War Path L4 camp, L6 trap, L8 tower; Road fort set at 3,200
  forts: [
    wall('cosmic', 'void_rampart'),
    tower('cosmic', 'ion_spire', { warPath: 8, road: 3200 }),
    camp('cosmic', 'warp_barracks', 'star_recruit', { warPath: 4, road: 3200 }),
    trap('cosmic', 'void_mine', { warPath: 6, road: 3200 }, { charges: 1, damage: 430, radius: 50 }),
    // W8 Cosmic wave variants: a cover wall (1.0 × the Heavy Common, 175 gold; own ground units within 60 lu behind
    // it take 20% less from attacks with range ≥ 100; War Path Cosmic s2) and a chip trap (4 charges × 140 = 0.2 × the
    // Star Legionnaire, each slowing 40% for 2 s; the Cosmic 20-star milestone). Road fallback 4,800.
    wall('cosmic', 'star_bulwark', { cost: FORT_COST.bunker, hpBp: 10000, cover: { behindLu: 60, rangedTakenBp: 2000 }, from: { side: 2, road: 4800 } }),
    trap('cosmic', 'stardust_snare', { stars: 20, road: 4800 }, { charges: 4, damage: 140, statuses: [slow(4000, 2000)] }),
  ],
};

/** A5.7 Cosmic Age Powers (values at P 4.48 and L1 loadouts; I 700, H 2,509; Epic Warp Stalker 1,600). */
export const cosmicPowers: readonly PowerDef[] = [
  {
    // Starter. 6 star shards over 2.0 s across a 450 lu zone (even, ±20 lu); each 380, splash r60; hits
    // air. Per unit ~608: 87% / 24% (Star Legionnaire / Hover Tank)
    id: 'starfall', kind: 'power', age: 'cosmic', slot: 'home', reach: 'home', family: 'bombard', rarity: 'common',
    source: 'starter', cost: 125, reloadMs: 40000, telegraphMs: 1000, maxTargets: 3,
    effect: {
      kind: 'barrage', count: 6, durationMs: 2000, zone: 450, damage: 380, radius: 60,
      jitter: 20, hitsAir: true, pattern: 'even',
    },
    visualId: 'power.starfall', sfx: 'pw_starfall', nameKey: 'card.starfall.name', descKey: 'card.starfall.desc',
  },
  {
    // War Path Cosmic L5 (Road 1,800). A singularity over 350 lu for 4 s (8 pulses), ground only: the first
    // pulse pulls 40% of the way to the centre; each pulse 27 damage and snare 50% for 1.0 s.
    // 216: 31% of I; 12 disabled unit-seconds (12 per 100 gold). MVP balance pass: 100 gold (was 75), pull
    // 40% (60%), 27 a pulse (30), snare 50% (40%): it beat Starfall by 7 points
    id: 'singularity', kind: 'power', age: 'cosmic', slot: 'home', reach: 'home', family: 'pull', rarity: 'rare',
    source: 'warPath', warPathLevel: 5, road: 1800, cost: 100, reloadMs: 30000, telegraphMs: 1000, maxTargets: 6, aiValueBp: 5000,
    effect: {
      kind: 'field', zone: 350, durationMs: 4000, hitsAir: false, damagePerPulse: 27, pullBp: 4000,
      statuses: [{ kind: 'snare', magnitudeBp: 5000, durationMs: 1000 }],
    },
    visualId: 'power.singularity', sfx: 'pw_singularity', nameKey: 'card.singularity.name', descKey: 'card.singularity.desc',
  },
  {
    // War Path Cosmic L9 (Road 1,950). A flare sweeps a 450 lu zone over 1.5 s: 560 once, ground and air,
    // cap 3 (like Starfall; MVP trim). Per unit 560: 80% / 22%
    id: 'solar_flare', kind: 'power', age: 'cosmic', slot: 'home', reach: 'home', family: 'sweep', rarity: 'epic',
    source: 'warPath', warPathLevel: 9, road: 1950, cost: 125, reloadMs: 40000, telegraphMs: 1000, maxTargets: 3,
    effect: { kind: 'sweep', zone: 450, durationMs: 1500, damage: 560, width: 40, hitsAir: true },
    visualId: 'power.solar_flare', sfx: 'pw_flare', nameKey: 'card.solar_flare.name', descKey: 'card.solar_flare.desc',
  },
  {
    // Starter. 3 comets, 0.4 s apart, run 500 lu at 500 lu/s from your front; 300 and 40 lu knockback;
    // max 2 hits; ground only. Per unit ≤ 600: 86% / 24%
    id: 'comet_run', kind: 'power', age: 'cosmic', slot: 'field', reach: 'front', family: 'charge', rarity: 'common',
    source: 'starter', cost: 100, reloadMs: 40000, telegraphMs: 1000, maxTargets: 5,
    effect: {
      kind: 'stampede', runners: 3, spacingMs: 400, distance: 500, speed: 500,
      damage: 300, knockback: 40, maxHitsPerEnemy: 2,
    },
    visualId: 'power.comet_run', sfx: 'pw_comet', nameKey: 'card.comet_run.name', descKey: 'card.comet_run.desc',
  },
  {
    // Road 500. 4 Star Legionnaires at your Star Legionnaire level warp in 150 lu beyond the enemy's
    // frontmost ground unit (p ≤ 1,850; p = 1,000 without one); summoned, no pop, no bounty
    id: 'warp_strike', kind: 'power', age: 'cosmic', slot: 'field', reach: 'anywhere', family: 'drop', rarity: 'rare',
    source: 'road', road: 500, cost: 150, reloadMs: 60000, telegraphMs: 1000,
    effect: { kind: 'paradrop', card: 'star_legionnaire', count: 4, beyondFront: 150, fallbackP: 1000 },
    visualId: 'power.warp_strike', sfx: 'pw_warp', nameKey: 'card.warp_strike.name', descKey: 'card.warp_strike.desc',
  },
  {
    // War Path Cosmic L7 (Road 1,850). One shot, 1,500, ground and air: 60% of H; the Warp Stalker takes 750.
    // 50 gold, reloads in 15 s (a strike next to Comet Run lost 10-15 points at 30 s and 20 at 75 gold / 25 s;
    // MVP balance pass)
    id: 'ion_cannon', kind: 'power', age: 'cosmic', slot: 'field', reach: 'anywhere', family: 'strike', rarity: 'epic',
    source: 'warPath', warPathLevel: 7, road: 1850, cost: 50, reloadMs: 15000, telegraphMs: 1500, maxTargets: 1,
    effect: { kind: 'strike', shots: 1, intervalMs: 0, damage: 1500, hitsAir: true },
    visualId: 'power.ion_cannon', sfx: 'pw_ion', nameKey: 'card.ion_cannon.name', descKey: 'card.ion_cannon.desc',
  },
];

/**
 * W8 Cosmic wave powers (CONTENT_PLAN 5.8; values at P 4.48 and L1 loadouts; I 700, H 2,509; measured numbers,
 * docs/decisions.md).
 */
export const cosmicWavePowers: readonly PowerDef[] = [
  {
    // The H7 lane volley (A2.9.4 `lane`, A5.7 whole-lane powers): War Path Cosmic L3 (Road 4,900). No aim: one pulse
    // touches the 8 hittable enemies nearest your gate anywhere on the lane, ground and air, one small meteor each,
    // for 210 (30% of the Star Legionnaire: the lane cap; the price and reload floors are 50 gold and 25 s). 50 gold, 25 s
    id: 'meteor_drizzle', kind: 'power', age: 'cosmic', slot: 'field', reach: 'lane', family: 'volley', rarity: 'rare',
    source: 'warPath', warPathLevel: 3, road: 4900, cost: 50, reloadMs: 25000, telegraphMs: 1000, maxTargets: 8,
    effect: { kind: 'field', zone: 2000, durationMs: 0, hitsAir: true, damagePerPulse: 210 },
    visualId: 'power.meteor_drizzle', sfx: 'pw_drizzle', nameKey: 'card.meteor_drizzle.name', descKey: 'card.meteor_drizzle.desc',
  },
  {
    // The new Home control (stun, A5.7 family budget): War Path Cosmic side node s1 (Road 4,800). A pulsar beam sweeps
    // once over a 350 lu zone and it flashes violet, ground and air: 165 and a 2 s stun with the dazed look (not the
    // clock freeze); cap 6. 12 disabled unit-seconds per cast
    id: 'pulsar_pulse', kind: 'power', age: 'cosmic', slot: 'home', reach: 'home', family: 'stun', rarity: 'epic',
    source: 'warPath', warPathSide: 1, road: 4800, cost: 75, reloadMs: 35000, telegraphMs: 1000, maxTargets: 6, aiValueBp: 5000,
    effect: {
      kind: 'field', zone: 350, durationMs: 0, hitsAir: true, damagePerPulse: 165,
      statuses: [{ kind: 'stun', magnitudeBp: 10000, durationMs: 2000, frozen: false }],
    },
    visualId: 'power.pulsar_pulse', sfx: 'pw_pulsar', nameKey: 'card.pulsar_pulse.name', descKey: 'card.pulsar_pulse.desc',
  },
];
