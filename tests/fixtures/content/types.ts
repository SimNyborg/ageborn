// FROZEN FIXTURE (DESIGN C2/WP0 task 8): a copy of src/content/raw/types.ts taken in Phase 0 (2026-09-27).
// Golden replays compile this content, so balance tuning in src/content/raw never breaks them.
// Never edit it. To re-baseline, copy src/content/raw again and re-record every golden replay.

/**
 * Types for the raw Part A tables (DESIGN B4 `raw/`). Types only, no runtime values.
 *
 * Raw content keeps DESIGN's table units: lu, lu/s, ms, whole HP and damage, gold, and bp for
 * percentages (`windupPct` stays a plain percent, as in the contract). The WP1 compiler
 * (`src/content/compile.ts`) converts to ticks, milli-lu, centi-HP and milli-gold (DESIGN B3, B4).
 */
import type { AgeDef, DamageMod, EconomyRules, FormatDef, PowerDef, ResearchRules, TurretDef, UnitDef } from '@/contracts/content';
import type { AgeId, FormatId, RoleGroup } from '@/contracts/ids';
import type { FortSpec } from '@/core/forts';

/** One age's unit and turret tables, in DESIGN table order (A5.2-A5.6). */
export interface RawAgeTables {
  age: AgeId;
  /** The 7 collectable units, plus hidden cards such as the tutorial Training Dummy (Stone). */
  units: readonly UnitDef[];
  /** The 4 turrets: two Commons, the Rare, the Epic. */
  turrets: readonly TurretDef[];
  /** SIM_VERSION 5.0.0 contract bump: the frozen fort tables (A16.14.4), Stone, Medieval and Gunpowder only. */
  forts?: readonly FortSpec[];
}

/** The numeric part of an age (DESIGN A2.2 P and base HP, A2.4 thresholds). WP1 adds visual and music ids. */
export type RawAgeScale = Pick<AgeDef, 'id' | 'index' | 'pBp' | 'baseHp' | 'xpToNext'>;

/** The role-default damage mod lists (DESIGN A2.6). The first mod whose tag the target has applies. */
export interface RawDamageMods {
  /** Infantry melee ("Blunt"): armored ×0.70. */
  blunt: DamageMod[];
  /** Melee Anti-armor (Spear Hunter, Pikeman): armored ×2.0, mech ×2.0, light ×0.75. */
  meleeAntiArmor: DamageMod[];
  /** Ranged Anti-armor (Bazooka Trooper, Rail Gunner): armored ×2.0, mech ×2.0, light ×0.5. */
  rangedAntiArmor: DamageMod[];
  /** Grenadier: armored ×1.5, mech ×1.5, light ×0.5. */
  grenadier: DamageMod[];
  /** Flak Gun: air ×2.0. */
  flak: DamageMod[];
  /** Congreve Rack: air ×1.5. */
  congreve: DamageMod[];
}

/**
 * Battle numbers from DESIGN A2.1-A2.11 and A5.1 that `EconomyRules` has no field for.
 * They are data for the WP1 compiler and the WP2 compile shim; nothing here is derived.
 */
export interface RawBattleRules {
  /** Lane length, left gate to right gate (A2.1). */
  laneLength: number;
  /** Depth of each base behind its gate (A2.1). */
  baseDepth: number;
  /** World margin around lane and bases for the camera (A2.1). */
  cameraMargin: number;
  /** Mid-lane p (A2.1). */
  midLane: number;
  /** Default attack windup in percent of the interval (A2.7). */
  windupPct: { melee: number; ranged: number; turret: number };
  /** Train time per role group, ms (A2.7). Every unit's `trainMs` equals its group's value. */
  trainMsByGroup: Record<RoleGroup, number>;
  /** Knockback resist for Brace units and air units, bp (A2.7). Size-based resist is in `EconomyRules`. */
  braceKnockbackResistBp: number;
  airKnockbackResistBp: number;
  /** Damage taken multiplier while marked, bp (A2.7 step 6: ×1.2). */
  markDamageBp: number;
  /** Heal pulse period, ms, on the shared grid (A2.7 Heal). */
  healPulseMs: number;
  /** Modernise credit: the new price minus this share of the old turret's price, bp (A2.3, A2.8). */
  moderniseCreditBp: number;
  /** XP cap in the final age of the format (A2.4). */
  finalAgeXpCap: number;
  /** Siege base decay is applied in steps of this period, ms (A2.10: every 20 ticks). */
  siegeDecayStepMs: number;
  /** Stampede start when the caster has no units on the lane, p (A5.7). */
  stampedeFallbackP: number;
  /** Default projectile speeds, lu/s (A5.1). Lasers and rails are instant. */
  projectileSpeed: {
    rock: number;
    arrow: number;
    musket: number;
    bullet: number;
    shell: number;
    rocket: number;
    arc: number;
    plasma: number;
  };
}

/** Everything in `src/content/raw`, aggregated by `raw/index.ts`. */
export interface RawContent {
  /** Stone to Future, in age order. */
  ages: readonly RawAgeTables[];
  powers: readonly PowerDef[];
  economy: EconomyRules;
  ageScale: Partial<Record<AgeId, RawAgeScale>>;
  formats: Record<FormatId, FormatDef>;
  battle: RawBattleRules;
  damageMods: RawDamageMods;
  /** Added at the A18 contract bump (SIM_VERSION 3.0.0). */
  research?: ResearchRules;
}
