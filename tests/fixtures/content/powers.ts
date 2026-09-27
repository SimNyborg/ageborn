// FROZEN FIXTURE (DESIGN C2/WP0 task 8): a copy of src/content/raw/powers.ts taken in Phase 0 (2026-09-27).
// Golden replays compile this content, so balance tuning in src/content/raw never breaks them.
// Never edit it. To re-baseline, copy src/content/raw again and re-record every golden replay.

/**
 * Age Powers: DESIGN A5.7 (values at that age's P and L1 loadouts), A2.9 rules, A13 power sounds,
 * A14.1 `power.<slug>` visuals. Every power has a 1.0 s telegraph. Data only.
 *
 * Powers hit units only; Legendaries take 50% power damage; kills pay 30% gold and no XP (A2.9,
 * `EconomyRules`). Damage, heals and shields scale with the caster's loadout multiplier (A2.9).
 */
import type { PowerDef } from '@/contracts/content';

export const powers: readonly PowerDef[] = [
  {
    // 5 spirit aurochs, 0.4 s apart, run 500 lu forward at 400 lu/s from your frontmost unit (or p = 200,
    // `battle.stampedeFallbackP`); 50 damage and 40 lu knockback per hit; max 3 hits per enemy per cast;
    // ground only. Per unit ≤ 150: 94% / 27%
    id: 'stampede', kind: 'power', age: 'stone', slot: 'default', telegraphMs: 1000,
    effect: {
      kind: 'stampede', runners: 5, spacingMs: 400, distance: 500, speed: 400,
      damage: 50, knockback: 40, maxHitsPerEnemy: 3,
    },
    visualId: 'power.stampede', sfx: 'pw_stampede', nameKey: 'card.stampede.name', descKey: 'card.stampede.desc',
  },
  {
    // Road 100. 14 meteors over 3.0 s across a 400 lu zone (even pattern, ±20 lu jitter); each 50 damage,
    // splash r40, ground only. Per unit ~140: 88% / 25%
    id: 'meteor_shower', kind: 'power', age: 'stone', slot: 'alternate', telegraphMs: 1000,
    effect: {
      kind: 'barrage', count: 14, durationMs: 3000, zone: 400, damage: 50, radius: 40,
      jitter: 20, hitsAir: false, pattern: 'even',
    },
    visualId: 'power.meteor_shower', sfx: 'pw_meteor', nameKey: 'card.meteor_shower.name', descKey: 'card.meteor_shower.desc',
  },
  {
    // 40 arrows over 2.5 s across 450 lu; each 40 damage, splash r20; hits air. Per unit ~142: 66% / 19%
    // (jitter not stated: ±20 like every even barrage, see docs/decisions.md)
    id: 'arrow_storm', kind: 'power', age: 'medieval', slot: 'default', telegraphMs: 1000,
    effect: {
      kind: 'barrage', count: 40, durationMs: 2500, zone: 450, damage: 40, radius: 20,
      jitter: 20, hitsAir: true, pattern: 'even',
    },
    visualId: 'power.arrow_storm', sfx: 'pw_arrows', nameKey: 'card.arrow_storm.name', descKey: 'card.arrow_storm.desc',
  },
  {
    // Road 200. All your units get +30% damage and +25% move speed for 8 s (no zone)
    id: 'royal_decree', kind: 'power', age: 'medieval', slot: 'alternate', telegraphMs: 1000,
    effect: {
      kind: 'buffAll',
      statuses: [
        { kind: 'damageBuff', magnitudeBp: 3000, durationMs: 8000 },
        { kind: 'speedBuff', magnitudeBp: 2500, durationMs: 8000 },
      ],
    },
    visualId: 'power.royal_decree', sfx: 'pw_decree', nameKey: 'card.royal_decree.name', descKey: 'card.royal_decree.desc',
  },
  {
    // 350 lu cloud for 7 s: enemy ranged and turret attacks fired from or into it miss 50% (sim RNG);
    // your units inside deal +20% damage
    id: 'smoke_screen', kind: 'power', age: 'gunpowder', slot: 'default', telegraphMs: 1000,
    effect: { kind: 'cloud', width: 350, durationMs: 7000, enemyMissBp: 5000, allyDamageBp: 2000 },
    visualId: 'power.smoke_screen', sfx: 'pw_smoke', nameKey: 'card.smoke_screen.name', descKey: 'card.smoke_screen.desc',
  },
  {
    // Road 300. 10 cannonballs over 3.0 s across 450 lu; each 120 damage, splash r45; ground only.
    // Per unit ~240: 82% / 24% (jitter not stated: ±20 like every even barrage, see docs/decisions.md)
    id: 'broadside', kind: 'power', age: 'gunpowder', slot: 'alternate', telegraphMs: 1000,
    effect: {
      kind: 'barrage', count: 10, durationMs: 3000, zone: 450, damage: 120, radius: 45,
      jitter: 20, hitsAir: false, pattern: 'even',
    },
    visualId: 'power.broadside', sfx: 'pw_broadside', nameKey: 'card.broadside.name', descKey: 'card.broadside.desc',
  },
  {
    // 4 Riflemen at your Rifleman level land 150 lu beyond the enemy's frontmost ground unit (clamped to
    // p ≤ 1,050, `economy.powerZoneClamp`; p = 600 if the enemy has no ground units); summoned, no pop, no bounty
    id: 'paratroopers', kind: 'power', age: 'modern', slot: 'default', telegraphMs: 1000,
    effect: { kind: 'paradrop', card: 'rifleman', count: 4, beyondFront: 150, fallbackP: 600 },
    visualId: 'power.paratroopers', sfx: 'pw_paratroop', nameKey: 'card.paratroopers.name', descKey: 'card.paratroopers.desc',
  },
  {
    // Road 400. 12 bombs along a 500 lu line over 1.5 s (line pattern, no jitter); each 150 damage,
    // splash r50; ground only. Per unit ~360: 91% / 26%
    id: 'carpet_bomber', kind: 'power', age: 'modern', slot: 'alternate', telegraphMs: 1000,
    effect: {
      kind: 'barrage', count: 12, durationMs: 1500, zone: 500, damage: 150, radius: 50,
      jitter: 0, hitsAir: false, pattern: 'line',
    },
    visualId: 'power.carpet_bomber', sfx: 'pw_bomber', nameKey: 'card.carpet_bomber.name', descKey: 'card.carpet_bomber.desc',
  },
  {
    // A beam sweeps a 500 lu zone over 2.0 s, dealing 450 once to each enemy it touches (±20 lu, so the
    // full beam width is 40); hits air. Per unit 450: 80% / 24%
    id: 'orbital_lance', kind: 'power', age: 'future', slot: 'default', telegraphMs: 1000,
    effect: { kind: 'sweep', zone: 500, durationMs: 2000, damage: 450, width: 40, hitsAir: true },
    visualId: 'power.orbital_lance', sfx: 'pw_lance', nameKey: 'card.orbital_lance.name', descKey: 'card.orbital_lance.desc',
  },
  {
    // Road 500. All your units get a regen of 40% of max HP over 4 s and a 150 shield for 6 s (no zone).
    // Regen `magnitudeBp` is the share of max HP healed over the duration; the shield pool is `amount`
    id: 'nanite_surge', kind: 'power', age: 'future', slot: 'alternate', telegraphMs: 1000,
    effect: {
      kind: 'buffAll',
      statuses: [
        { kind: 'regen', magnitudeBp: 4000, durationMs: 4000 },
        { kind: 'shield', magnitudeBp: 0, durationMs: 6000, amount: 150 },
      ],
    },
    visualId: 'power.nanite_surge', sfx: 'pw_nanite', nameKey: 'card.nanite_surge.name', descKey: 'card.nanite_surge.desc',
  },
];
