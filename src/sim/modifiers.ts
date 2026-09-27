/**
 * Daily Challenge modifiers (DESIGN A9.1). Every modifier is symmetric: it changes the rules for both
 * sides alike. `MatchConfig.modifiers` lists modifier ids; unknown ids are ignored so a newer content
 * set never crashes an older sim.
 *
 * The ids match docs/requests/wp2-content-units.md; the numbers are the A9.1 table.
 */
import type { RoleGroup } from '@/contracts';
import { BP } from '@/core';

/** The per-match rule changes, all neutral (×1) by default. */
export interface MatchMods {
  /** Base passive gold (not Treasury income). */
  passiveGoldBp: number;
  unitHpBp: number;
  powerChargeBp: number;
  xpThresholdBp: number;
  /** Unit card cost per role group. */
  costBp: Readonly<Record<RoleGroup, number>>;
  /** Siege starts this many ms earlier. */
  siegeEarlierMs: number;
}

const NEUTRAL_COST: Readonly<Record<RoleGroup, number>> = {
  infantry: BP,
  ranged: BP,
  heavy: BP,
  antiArmor: BP,
  support: BP,
  epic: BP,
  legendary: BP,
};

type ModifierFn = (m: MatchMods) => MatchMods;

/** A9.1 table. */
export const DAILY_MODIFIERS: Readonly<Record<string, ModifierFn>> = {
  /** Passive gold ×1.5. */
  gold_rush: (m) => ({ ...m, passiveGoldBp: 15000 }),
  /** Unit HP ×0.7. */
  glass_armies: (m) => ({ ...m, unitHpBp: 7000 }),
  /** Age Power charge ×2. */
  power_hour: (m) => ({ ...m, powerChargeBp: 20000 }),
  /** XP thresholds ×0.7. */
  fast_forward: (m) => ({ ...m, xpThresholdBp: 7000 }),
  /** Heavy and Legendary cost −30%. */
  heavy_metal: (m) => ({ ...m, costBp: { ...m.costBp, heavy: 7000, legendary: 7000 } }),
  /** Siege starts 1:15 earlier. */
  sudden_siege: (m) => ({ ...m, siegeEarlierMs: 75000 }),
};

export function matchMods(ids: readonly string[] | undefined): MatchMods {
  let m: MatchMods = {
    passiveGoldBp: BP,
    unitHpBp: BP,
    powerChargeBp: BP,
    xpThresholdBp: BP,
    costBp: NEUTRAL_COST,
    siegeEarlierMs: 0,
  };
  for (const id of ids ?? []) {
    const fn = Object.hasOwn(DAILY_MODIFIERS, id) ? DAILY_MODIFIERS[id] : undefined;
    if (fn) m = fn(m);
  }
  return m;
}
