/**
 * Age Powers of Stone, Medieval, Gunpowder, Modern and Future: DESIGN A5.7 (values at that age's P and
 * L1 loadouts), A2.9 rules, A13 power sounds, A14.1 `power.<slug>` visuals. Data only. The Bronze,
 * Industrial and Cosmic powers live in their age files.
 *
 * Every age has 6 powers (A5.7 role template): Home (reach `home`) holds a bombard, a sweep and a
 * control; Field holds an assault, a precision or siege tool and a support. Sources: 2 starters (one
 * per slot), 1 Trophy Road power, 3 War Path powers (L5, L7, L9 first clears, with a Trophy Road
 * fallback node, `road`). Every cast costs gold and reloads (A2.9.2-A2.9.3); every damaging or
 * controlling effect is capped by `maxTargets` and the screen (A2.9.5). Powers hit units only;
 * Legendaries take 50% damage and 50% control; strikes deal 50% to Epics; kills pay 30% gold and no XP.
 * Damage, heals and shields scale with the caster's loadout multiplier (A2.9.6).
 *
 * "Per unit" comments are the A2.9.6 coverage estimate against the age's L1 Infantry and Heavy Common.
 */
import type { PowerDef } from '@/contracts/content';

export const powers: readonly PowerDef[] = [
  // ---- Stone (P 1.00; I 160, H 560; Epic Sabertooth 380) ----
  {
    // Starter. A rockslide sweeps a 450 lu zone over 1.5 s: 150 once per ground enemy touched (±20 lu),
    // cap 5. Per unit 150: 94% / 27% (fix pass 2026-09-30: 130 killed nothing in 43% of casts)
    id: 'rockslide', kind: 'power', age: 'stone', slot: 'home', reach: 'home', family: 'sweep', rarity: 'common',
    source: 'starter', cost: 100, reloadMs: 40000, telegraphMs: 1000, maxTargets: 5,
    effect: { kind: 'sweep', zone: 450, durationMs: 1500, damage: 150, width: 40, hitsAir: false },
    visualId: 'power.rockslide', sfx: 'pw_rockslide', nameKey: 'card.rockslide.name', descKey: 'card.rockslide.desc',
  },
  {
    // Road 100. 14 meteors over 3.0 s across a 400 lu zone (even, ±20 lu jitter); each 50, splash r40;
    // ground only. Per unit ~140: 88% / 25%
    id: 'meteor_shower', kind: 'power', age: 'stone', slot: 'home', reach: 'home', family: 'bombard', rarity: 'rare',
    source: 'road', road: 100, cost: 100, reloadMs: 40000, telegraphMs: 1000, maxTargets: 4,
    effect: {
      kind: 'barrage', count: 14, durationMs: 3000, zone: 400, damage: 50, radius: 40,
      jitter: 20, hitsAir: false, pattern: 'even',
    },
    visualId: 'power.meteor_shower', sfx: 'pw_meteor', nameKey: 'card.meteor_shower.name', descKey: 'card.meteor_shower.desc',
  },
  {
    // War Path Stone L5 (Road 550). A 300 lu tar pool for 6 s (12 pulses), ground only; each pulse 5
    // damage and snare 40% for 1.0 s. 60: 38% of I; 14.4 disabled unit-seconds at the cap
    id: 'sticky_tar', kind: 'power', age: 'stone', slot: 'home', reach: 'home', family: 'snare', rarity: 'rare',
    source: 'warPath', warPathLevel: 5, road: 550, cost: 75, reloadMs: 30000, telegraphMs: 1000, maxTargets: 6, aiValueBp: 4500,
    effect: {
      kind: 'field', zone: 300, durationMs: 6000, hitsAir: false, damagePerPulse: 5,
      statuses: [{ kind: 'snare', magnitudeBp: 4000, durationMs: 1000 }],
    },
    visualId: 'power.sticky_tar', sfx: 'pw_tar', nameKey: 'card.sticky_tar.name', descKey: 'card.sticky_tar.desc',
  },
  {
    // Starter. 5 spirit aurochs, 0.4 s apart, run 500 lu at 400 lu/s from your front F (or p = 200,
    // `battle.stampedeFallbackP`); 50 and 40 lu knockback per hit; max 3 hits per enemy; ground only.
    // Per unit ≤ 150: 94% / 27%
    id: 'stampede', kind: 'power', age: 'stone', slot: 'field', reach: 'front', family: 'charge', rarity: 'common',
    source: 'starter', cost: 100, reloadMs: 40000, telegraphMs: 1000, maxTargets: 6,
    effect: {
      kind: 'stampede', runners: 5, spacingMs: 400, distance: 500, speed: 400,
      damage: 50, knockback: 40, maxHitsPerEnemy: 3,
    },
    visualId: 'power.stampede', sfx: 'pw_stampede', nameKey: 'card.stampede.name', descKey: 'card.stampede.desc',
  },
  {
    // War Path Stone L7 (Road 600). Your 8 frontmost units: +20% move speed and +15% attack speed for 6 s
    id: 'hunt_cry', kind: 'power', age: 'stone', slot: 'field', reach: 'army', family: 'rally', rarity: 'epic',
    source: 'warPath', warPathLevel: 7, road: 600, cost: 125, reloadMs: 45000, telegraphMs: 500, maxTargets: 8, aiValueBp: 7000,
    effect: {
      kind: 'buffAll', maxTargets: 8,
      statuses: [
        { kind: 'speedBuff', magnitudeBp: 2000, durationMs: 6000 },
        { kind: 'attackSpeedBuff', magnitudeBp: 1500, durationMs: 6000 },
      ],
    },
    visualId: 'power.hunt_cry', sfx: 'pw_huntcry', nameKey: 'card.hunt_cry.name', descKey: 'card.hunt_cry.desc',
  },
  {
    // War Path Stone L9 (Road 650). One spear, 340, ground and air: 61% of H; kills a Pebbler, Drum
    // Shaman or Spear Hunter; the Sabertooth takes 170 (Epics take 50% from strikes)
    id: 'hunters_spear', kind: 'power', age: 'stone', slot: 'field', reach: 'anywhere', family: 'strike', rarity: 'epic',
    source: 'warPath', warPathLevel: 9, road: 650, cost: 75, reloadMs: 30000, telegraphMs: 1500, maxTargets: 1,
    effect: { kind: 'strike', shots: 1, intervalMs: 0, damage: 340, hitsAir: true },
    visualId: 'power.hunters_spear', sfx: 'pw_spear', nameKey: 'card.hunters_spear.name', descKey: 'card.hunters_spear.desc',
  },

  // ---- Medieval (P 1.35; I 216, H 756; Epic Battering Ram 900) ----
  {
    // Starter. 40 arrows over 2.5 s across 450 lu (even, ±20 lu); each 55, splash r20; hits air; cap 4.
    // Per unit ~196: 91% / 26%
    id: 'arrow_storm', kind: 'power', age: 'medieval', slot: 'home', reach: 'home', family: 'bombard', rarity: 'common',
    source: 'starter', cost: 100, reloadMs: 40000, telegraphMs: 1000, maxTargets: 4,
    effect: {
      kind: 'barrage', count: 40, durationMs: 2500, zone: 450, damage: 55, radius: 20,
      jitter: 20, hitsAir: true, pattern: 'even',
    },
    visualId: 'power.arrow_storm', sfx: 'pw_arrows', nameKey: 'card.arrow_storm.name', descKey: 'card.arrow_storm.desc',
  },
  {
    // War Path Medieval L5 (Road 900). A 300 lu caltrop field for 8 s (16 pulses), ground only; each
    // pulse 5 damage and snare 35% for 1.0 s. 80: 37% of I; 16.8 disabled unit-seconds at the cap
    id: 'caltrops', kind: 'power', age: 'medieval', slot: 'home', reach: 'home', family: 'snare', rarity: 'rare',
    source: 'warPath', warPathLevel: 5, road: 900, cost: 75, reloadMs: 30000, telegraphMs: 1000, maxTargets: 6, aiValueBp: 4500,
    effect: {
      kind: 'field', zone: 300, durationMs: 8000, hitsAir: false, damagePerPulse: 5,
      statuses: [{ kind: 'snare', magnitudeBp: 3500, durationMs: 1000 }],
    },
    visualId: 'power.caltrops', sfx: 'pw_caltrops', nameKey: 'card.caltrops.name', descKey: 'card.caltrops.desc',
  },
  {
    // War Path Medieval L9 (Road 1,050). Boiling oil sweeps a 250 lu zone over 1.0 s: 200 once, ground
    // only, cap 3. Per unit 200: 93% / 26%
    id: 'boiling_oil', kind: 'power', age: 'medieval', slot: 'home', reach: 'home', family: 'sweep', rarity: 'epic',
    source: 'warPath', warPathLevel: 9, road: 1050, cost: 100, reloadMs: 40000, telegraphMs: 1000, maxTargets: 3,
    effect: { kind: 'sweep', zone: 250, durationMs: 1000, damage: 200, width: 40, hitsAir: false },
    visualId: 'power.boiling_oil', sfx: 'pw_oil', nameKey: 'card.boiling_oil.name', descKey: 'card.boiling_oil.desc',
  },
  {
    // Starter. 3 knights, 0.5 s apart, charge 450 lu at 400 lu/s from your front; 90 and 40 lu
    // knockback; max 2 hits; ground only. Per unit ≤ 180: 83% / 24%
    id: 'knights_charge', kind: 'power', age: 'medieval', slot: 'field', reach: 'front', family: 'charge', rarity: 'common',
    source: 'starter', cost: 100, reloadMs: 40000, telegraphMs: 1000, maxTargets: 6,
    effect: {
      kind: 'stampede', runners: 3, spacingMs: 500, distance: 450, speed: 400,
      damage: 90, knockback: 40, maxHitsPerEnemy: 2,
    },
    visualId: 'power.knights_charge', sfx: 'pw_knights', nameKey: 'card.knights_charge.name', descKey: 'card.knights_charge.desc',
  },
  {
    // Road 250. Your 8 frontmost units: +30% damage and +20% move speed for 8 s
    id: 'royal_decree', kind: 'power', age: 'medieval', slot: 'field', reach: 'army', family: 'rally', rarity: 'rare',
    source: 'road', road: 250, cost: 125, reloadMs: 45000, telegraphMs: 500, maxTargets: 8, aiValueBp: 7000,
    effect: {
      kind: 'buffAll', maxTargets: 8,
      statuses: [
        { kind: 'damageBuff', magnitudeBp: 3000, durationMs: 8000 },
        { kind: 'speedBuff', magnitudeBp: 2000, durationMs: 8000 },
      ],
    },
    visualId: 'power.royal_decree', sfx: 'pw_decree', nameKey: 'card.royal_decree.name', descKey: 'card.royal_decree.desc',
  },
  {
    // War Path Medieval L7 (Road 950). Sappers undermine the enemy wall: every enemy mount starts no
    // turret attack for 5 s; needs your front ≥ p 1,370
    id: 'undermine', kind: 'power', age: 'medieval', slot: 'field', reach: 'front', family: 'suppress', rarity: 'epic',
    source: 'warPath', warPathLevel: 7, road: 950, cost: 125, reloadMs: 60000, telegraphMs: 1500,
    effect: { kind: 'suppress', durationMs: 5000 },
    visualId: 'power.undermine', sfx: 'pw_undermine', nameKey: 'card.undermine.name', descKey: 'card.undermine.desc',
  },

  // ---- Age of Muskets, `gunpowder` (P 1.82; I 291, H 1,019; Epic Bronze Cannon 500) ----
  {
    // Starter. A volley sweeps a 400 lu zone over 1.0 s: 240 once, ground and air. Per unit 240: 82% / 24%
    id: 'volley_fire', kind: 'power', age: 'gunpowder', slot: 'home', reach: 'home', family: 'sweep', rarity: 'common',
    source: 'starter', cost: 100, reloadMs: 40000, telegraphMs: 1000, maxTargets: 5,
    effect: { kind: 'sweep', zone: 400, durationMs: 1000, damage: 240, width: 40, hitsAir: true },
    visualId: 'power.volley_fire', sfx: 'pw_volley', nameKey: 'card.volley_fire.name', descKey: 'card.volley_fire.desc',
  },
  {
    // Road 300. 10 cannonballs over 3.0 s across 450 lu (even, ±20 lu); each 120, splash r45; ground only.
    // Per unit ~240: 82% / 24%
    id: 'broadside', kind: 'power', age: 'gunpowder', slot: 'home', reach: 'home', family: 'bombard', rarity: 'rare',
    source: 'road', road: 300, cost: 100, reloadMs: 40000, telegraphMs: 1000, maxTargets: 4,
    effect: {
      kind: 'barrage', count: 10, durationMs: 3000, zone: 450, damage: 120, radius: 45,
      jitter: 20, hitsAir: false, pattern: 'even',
    },
    visualId: 'power.broadside', sfx: 'pw_broadside', nameKey: 'card.broadside.name', descKey: 'card.broadside.desc',
  },
  {
    // War Path Gunpowder L5 (Road 1,100). Boarding nets over 300 lu for 4 s (8 pulses), ground only: the
    // first pulse pulls 40% of the way to the centre; each pulse 12 damage and snare 40% for 1.0 s.
    // 96: 33% of I; 9.6 disabled unit-seconds (12.8 per 100 gold); clumps them for splash
    id: 'boarding_nets', kind: 'power', age: 'gunpowder', slot: 'home', reach: 'home', family: 'pull', rarity: 'rare',
    source: 'warPath', warPathLevel: 5, road: 1100, cost: 75, reloadMs: 30000, telegraphMs: 1000, maxTargets: 6, aiValueBp: 5000,
    effect: {
      kind: 'field', zone: 300, durationMs: 4000, hitsAir: false, damagePerPulse: 12, pullBp: 4000,
      statuses: [{ kind: 'snare', magnitudeBp: 4000, durationMs: 1000 }],
    },
    visualId: 'power.boarding_nets', sfx: 'pw_nets', nameKey: 'card.boarding_nets.name', descKey: 'card.boarding_nets.desc',
  },
  {
    // Starter. A 350 lu cloud (Front reach) for 6 s: enemy ranged and turret attacks fired from or into
    // it miss 50% (sim RNG); up to 8 of your units inside deal +20% damage
    id: 'smoke_screen', kind: 'power', age: 'gunpowder', slot: 'field', reach: 'front', family: 'cloud', rarity: 'common',
    source: 'starter', cost: 100, reloadMs: 40000, telegraphMs: 1000, maxTargets: 8,
    effect: { kind: 'cloud', width: 350, durationMs: 6000, enemyMissBp: 5000, allyDamageBp: 2000 },
    visualId: 'power.smoke_screen', sfx: 'pw_smoke', nameKey: 'card.smoke_screen.name', descKey: 'card.smoke_screen.desc',
  },
  {
    // War Path Gunpowder L7 (Road 1,150). Front barrage: 6 shells over 1.5 s across 300 lu (even, ±20 lu);
    // each 120, splash r50; ground only. Per unit 240: 82% / 24%
    id: 'horse_artillery', kind: 'power', age: 'gunpowder', slot: 'field', reach: 'front', family: 'frontBarrage', rarity: 'epic',
    source: 'warPath', warPathLevel: 7, road: 1150, cost: 100, reloadMs: 35000, telegraphMs: 1000, maxTargets: 5,
    effect: {
      kind: 'barrage', count: 6, durationMs: 1500, zone: 300, damage: 120, radius: 50,
      jitter: 20, hitsAir: false, pattern: 'even',
    },
    visualId: 'power.horse_artillery', sfx: 'pw_horse_art', nameKey: 'card.horse_artillery.name', descKey: 'card.horse_artillery.desc',
  },
  {
    // War Path Gunpowder L9 (Road 1,200). 2 shots 0.3 s apart, 305 each, ground and air: 610 = 60% of H;
    // the Bronze Cannon takes 305
    id: 'sharpshooter', kind: 'power', age: 'gunpowder', slot: 'field', reach: 'anywhere', family: 'strike', rarity: 'epic',
    source: 'warPath', warPathLevel: 9, road: 1200, cost: 75, reloadMs: 30000, telegraphMs: 1500, maxTargets: 1,
    effect: { kind: 'strike', shots: 2, intervalMs: 300, damage: 305, hitsAir: true },
    visualId: 'power.sharpshooter', sfx: 'pw_sharpshooter', nameKey: 'card.sharpshooter.name', descKey: 'card.sharpshooter.desc',
  },

  // ---- Modern (P 2.46; I 394, H 1,378; Epic Gyrocopter 740, air) ----
  {
    // Starter. A strafing run sweeps a 450 lu zone over 1.5 s: 360 once, ground only, cap 5. Per unit 360: 91% / 26%
    id: 'strafing_run', kind: 'power', age: 'modern', slot: 'home', reach: 'home', family: 'sweep', rarity: 'common',
    source: 'starter', cost: 100, reloadMs: 40000, telegraphMs: 1000, maxTargets: 5,
    effect: { kind: 'sweep', zone: 450, durationMs: 1500, damage: 360, width: 40, hitsAir: false },
    visualId: 'power.strafing_run', sfx: 'pw_strafe', nameKey: 'card.strafing_run.name', descKey: 'card.strafing_run.desc',
  },
  {
    // Road 400. 12 bombs along a 500 lu line over 1.5 s (no jitter); each 150, splash r50; ground only
    // (centre ≤ 750). Per unit ~360: 91% / 26%
    id: 'carpet_bomber', kind: 'power', age: 'modern', slot: 'home', reach: 'home', family: 'bombard', rarity: 'rare',
    source: 'road', road: 400, cost: 100, reloadMs: 40000, telegraphMs: 1000, maxTargets: 4,
    effect: {
      kind: 'barrage', count: 12, durationMs: 1500, zone: 500, damage: 150, radius: 50,
      jitter: 0, hitsAir: false, pattern: 'line',
    },
    visualId: 'power.carpet_bomber', sfx: 'pw_bomber', nameKey: 'card.carpet_bomber.name', descKey: 'card.carpet_bomber.desc',
  },
  {
    // War Path Modern L5 (Road 1,450). Flak: 3 bursts over 0.6 s across 160 lu (no jitter); each 240,
    // splash r80; air only. 720 on an air unit at the centre; a Gyrocopter (740) survives with 20
    id: 'aa_screen', kind: 'power', age: 'modern', slot: 'home', reach: 'home', family: 'flak', rarity: 'rare',
    source: 'warPath', warPathLevel: 5, road: 1450, cost: 75, reloadMs: 25000, telegraphMs: 500, maxTargets: 3,
    effect: {
      kind: 'barrage', count: 3, durationMs: 600, zone: 160, damage: 240, radius: 80,
      jitter: 0, hitsAir: true, hitsGround: false, pattern: 'even',
    },
    visualId: 'power.aa_screen', sfx: 'pw_flak', nameKey: 'card.aa_screen.name', descKey: 'card.aa_screen.desc',
  },
  {
    // Starter. 3 Riflemen at your Rifleman level land 150 lu beyond the enemy's frontmost ground unit
    // (p ≤ 1,850, `economy.powerZoneClamp`; p = 1,000 without one); summoned, no pop, no bounty
    id: 'paratroopers', kind: 'power', age: 'modern', slot: 'field', reach: 'anywhere', family: 'drop', rarity: 'common',
    source: 'starter', cost: 150, reloadMs: 60000, telegraphMs: 1000,
    effect: { kind: 'paradrop', card: 'rifleman', count: 3, beyondFront: 150, fallbackP: 1000 },
    visualId: 'power.paratroopers', sfx: 'pw_paratroop', nameKey: 'card.paratroopers.name', descKey: 'card.paratroopers.desc',
  },
  {
    // War Path Modern L7 (Road 1,550). 2 tanks, 0.6 s apart, roll 600 lu at 350 lu/s from your front;
    // 170 and 50 lu knockback; max 2 hits; ground only. Per unit ≤ 340: 86% / 25%
    id: 'tank_rush', kind: 'power', age: 'modern', slot: 'field', reach: 'front', family: 'charge', rarity: 'epic',
    source: 'warPath', warPathLevel: 7, road: 1550, cost: 100, reloadMs: 40000, telegraphMs: 1000, maxTargets: 6,
    effect: {
      kind: 'stampede', runners: 2, spacingMs: 600, distance: 600, speed: 350,
      damage: 170, knockback: 50, maxHitsPerEnemy: 2,
    },
    visualId: 'power.tank_rush', sfx: 'pw_tanks', nameKey: 'card.tank_rush.name', descKey: 'card.tank_rush.desc',
  },
  {
    // War Path Modern L9 (Road 1,600). One shot, 830, ground and air: 60% of H; the Gyrocopter takes 415.
    // Reloads in 25 s
    id: 'sniper_team', kind: 'power', age: 'modern', slot: 'field', reach: 'anywhere', family: 'strike', rarity: 'epic',
    source: 'warPath', warPathLevel: 9, road: 1600, cost: 75, reloadMs: 25000, telegraphMs: 1500, maxTargets: 1,
    effect: { kind: 'strike', shots: 1, intervalMs: 0, damage: 830, hitsAir: true },
    visualId: 'power.sniper_team', sfx: 'pw_sniper', nameKey: 'card.sniper_team.name', descKey: 'card.sniper_team.desc',
  },

  // ---- Future (P 3.32; I 470 + 90 shield = 560, H 1,860; Epic EMP Saboteur 700) ----
  {
    // Starter. A beam sweeps a 500 lu zone over 2.0 s: 450 once, ground and air. Per unit 450: 80% / 24%
    id: 'orbital_lance', kind: 'power', age: 'future', slot: 'home', reach: 'home', family: 'sweep', rarity: 'common',
    source: 'starter', cost: 100, reloadMs: 40000, telegraphMs: 1000, maxTargets: 5,
    effect: { kind: 'sweep', zone: 500, durationMs: 2000, damage: 450, width: 40, hitsAir: true },
    visualId: 'power.orbital_lance', sfx: 'pw_lance', nameKey: 'card.orbital_lance.name', descKey: 'card.orbital_lance.desc',
  },
  {
    // War Path Future L5 (Road 1,650). 20 micro-missiles over 2.0 s across 400 lu (even, ±20 lu); each 125,
    // splash r40; ground and air; cap 4. Per unit ~500: 89% / 27%
    id: 'point_defense', kind: 'power', age: 'future', slot: 'home', reach: 'home', family: 'bombard', rarity: 'rare',
    source: 'warPath', warPathLevel: 5, road: 1650, cost: 100, reloadMs: 40000, telegraphMs: 1000, maxTargets: 4,
    effect: {
      kind: 'barrage', count: 20, durationMs: 2000, zone: 400, damage: 125, radius: 40,
      jitter: 20, hitsAir: true, pattern: 'even',
    },
    visualId: 'power.point_defense', sfx: 'pw_pdg', nameKey: 'card.point_defense.name', descKey: 'card.point_defense.desc',
  },
  {
    // War Path Future L9 (Road 1,750). A 250 lu stasis dome, one pulse, ground and air: stun 2.0 s
    // (frozen look), cap 6. 12 disabled unit-seconds at the cap (16 per 100 gold)
    id: 'stasis_field', kind: 'power', age: 'future', slot: 'home', reach: 'home', family: 'stun', rarity: 'epic',
    source: 'warPath', warPathLevel: 9, road: 1750, cost: 75, reloadMs: 35000, telegraphMs: 1000, maxTargets: 6, aiValueBp: 5000,
    effect: {
      kind: 'field', zone: 250, durationMs: 0, hitsAir: true,
      statuses: [{ kind: 'stun', magnitudeBp: 10000, durationMs: 2000, frozen: true }],
    },
    visualId: 'power.stasis_field', sfx: 'pw_stasis', nameKey: 'card.stasis_field.name', descKey: 'card.stasis_field.desc',
  },
  {
    // Starter. Front barrage: 10 drones over 2.0 s across 300 lu (even, ±20 lu); each 150, splash r35;
    // ground and air. Per unit ~350: 63% / 19%
    id: 'drone_swarm', kind: 'power', age: 'future', slot: 'field', reach: 'front', family: 'frontBarrage', rarity: 'common',
    source: 'starter', cost: 100, reloadMs: 35000, telegraphMs: 1000, maxTargets: 5,
    effect: {
      kind: 'barrage', count: 10, durationMs: 2000, zone: 300, damage: 150, radius: 35,
      jitter: 20, hitsAir: true, pattern: 'even',
    },
    visualId: 'power.drone_swarm', sfx: 'pw_drones', nameKey: 'card.drone_swarm.name', descKey: 'card.drone_swarm.desc',
  },
  {
    // Road 450. Your 8 frontmost units: regen 40% of max HP over 4 s and a 150 shield for 6 s. Regen
    // `magnitudeBp` is the share of max HP healed over the duration; the shield pool is `amount`
    id: 'nanite_surge', kind: 'power', age: 'future', slot: 'field', reach: 'army', family: 'mend', rarity: 'rare',
    source: 'road', road: 450, cost: 150, reloadMs: 50000, telegraphMs: 500, maxTargets: 8, aiValueBp: 8000,
    effect: {
      kind: 'buffAll', maxTargets: 8,
      statuses: [
        { kind: 'regen', magnitudeBp: 4000, durationMs: 4000 },
        { kind: 'shield', magnitudeBp: 0, durationMs: 6000, amount: 150 },
      ],
    },
    visualId: 'power.nanite_surge', sfx: 'pw_nanite', nameKey: 'card.nanite_surge.name', descKey: 'card.nanite_surge.desc',
  },
  {
    // War Path Future L7 (Road 1,700). Every enemy mount starts no turret attack for 5 s; needs your
    // front ≥ p 1,370
    id: 'emp_blackout', kind: 'power', age: 'future', slot: 'field', reach: 'front', family: 'suppress', rarity: 'epic',
    source: 'warPath', warPathLevel: 7, road: 1700, cost: 125, reloadMs: 60000, telegraphMs: 1500,
    effect: { kind: 'suppress', durationMs: 5000 },
    visualId: 'power.emp_blackout', sfx: 'pw_emp', nameKey: 'card.emp_blackout.name', descKey: 'card.emp_blackout.desc',
  },
];
