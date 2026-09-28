/**
 * Daily Challenge modifiers (DESIGN A9.1). Every modifier is symmetric: it changes the rules for both
 * sides alike. `MatchConfig.modifiers` lists modifier ids; unknown ids are ignored so a newer content
 * set never crashes an older sim.
 *
 * The effects are content data (CLAUDE.md "Content is data"): WP1's compiled content carries them as
 * `content.dailyModifiers.list[id].effect` (`src/content/dailyModifiers.ts`), and the sim reads them
 * from there, structurally, because it may not import the content layer (B2). Content without a
 * modifier table (the frozen fixture compiled by the shim, the contract fakes) uses
 * {@link DAILY_MODIFIERS}, the A9.1 table as frozen for the golden replays.
 */
import type { CompiledContent, RoleGroup } from '@/contracts';
import { BP } from '@/core';

/** One modifier effect, the shape of WP1's `ModifierEffect` (src/content/types.ts). */
export type ModifierEffectLike =
  | { kind: 'passiveGold'; bp: number }
  | { kind: 'unitHp'; bp: number }
  | { kind: 'powerCharge'; bp: number }
  | { kind: 'xpThreshold'; bp: number }
  | { kind: 'unitCost'; groups: readonly RoleGroup[]; bp: number }
  | { kind: 'siegeShift'; ms: number };

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

const GROUPS: readonly RoleGroup[] = ['infantry', 'ranged', 'heavy', 'antiArmor', 'support', 'epic', 'legendary'];

/** A9.1 table (ids as in `src/content/dailyModifiers.ts`), for content without a modifier table. */
export const DAILY_MODIFIERS: Readonly<Record<string, ModifierEffectLike>> = {
  /** Passive gold ×1.5. */
  gold_rush: { kind: 'passiveGold', bp: 15000 },
  /** Unit HP ×0.7. */
  glass_armies: { kind: 'unitHp', bp: 7000 },
  /** Age Power charge ×2. */
  power_hour: { kind: 'powerCharge', bp: 20000 },
  /** XP thresholds ×0.7. */
  fast_forward: { kind: 'xpThreshold', bp: 7000 },
  /** Heavy and Legendary cost −30%. */
  heavy_metal: { kind: 'unitCost', groups: ['heavy', 'legendary'], bp: 7000 },
  /** Siege starts 1:15 earlier. */
  sudden_siege: { kind: 'siegeShift', ms: -75000 },
};

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Validates one effect read from content; returns null for anything the sim does not understand. */
function asEffect(v: unknown): ModifierEffectLike | null {
  if (v === null || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  switch (o.kind) {
    case 'passiveGold':
    case 'unitHp':
    case 'powerCharge':
    case 'xpThreshold':
      return isNum(o.bp) ? { kind: o.kind, bp: o.bp } : null;
    case 'unitCost': {
      if (!isNum(o.bp) || !Array.isArray(o.groups)) return null;
      const groups = (o.groups as unknown[]).filter((g): g is RoleGroup => GROUPS.includes(g as RoleGroup));
      return { kind: 'unitCost', groups, bp: o.bp };
    }
    case 'siegeShift':
      return isNum(o.ms) ? { kind: 'siegeShift', ms: o.ms } : null;
    default:
      return null;
  }
}

/** The effect of modifier `id` on this content: its own table when it has one, else the A9.1 defaults. */
export function modifierEffect(content: CompiledContent | undefined, id: string): ModifierEffectLike | null {
  const table = (content?.dailyModifiers ?? null) as { list?: unknown } | null;
  if (table !== null && typeof table === 'object' && table.list !== null && typeof table.list === 'object') {
    const list = table.list as Record<string, unknown>;
    const def = Object.hasOwn(list, id) ? (list[id] as { effect?: unknown } | undefined) : undefined;
    return def ? asEffect(def.effect) : null;
  }
  return Object.hasOwn(DAILY_MODIFIERS, id) ? (DAILY_MODIFIERS[id] ?? null) : null;
}

function neutral(): MatchMods {
  const costBp = {} as Record<RoleGroup, number>;
  for (const g of GROUPS) costBp[g] = BP;
  return { passiveGoldBp: BP, unitHpBp: BP, powerChargeBp: BP, xpThresholdBp: BP, costBp, siegeEarlierMs: 0 };
}

/** Combines the listed modifiers (in order; a later one of the same kind replaces an earlier one). */
export function matchMods(ids: readonly string[] | undefined, content?: CompiledContent): MatchMods {
  const m = neutral();
  const cost = { ...m.costBp };
  for (const id of ids ?? []) {
    const fx = modifierEffect(content, id);
    if (!fx) continue;
    switch (fx.kind) {
      case 'passiveGold':
        m.passiveGoldBp = fx.bp;
        break;
      case 'unitHp':
        m.unitHpBp = fx.bp;
        break;
      case 'powerCharge':
        m.powerChargeBp = fx.bp;
        break;
      case 'xpThreshold':
        m.xpThresholdBp = fx.bp;
        break;
      case 'unitCost':
        for (const g of fx.groups) cost[g] = fx.bp;
        break;
      case 'siegeShift':
        // A negative shift moves Siege earlier (Sudden Siege: −75,000 ms).
        m.siegeEarlierMs = -fx.ms;
        break;
    }
  }
  m.costBp = cost;
  return m;
}
