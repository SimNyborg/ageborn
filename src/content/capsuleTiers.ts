/**
 * Which capsule tier table applies in an arena (DESIGN A6.4 "all-ages table", content re-tune
 * 2026-10-04): Arenas 1-2 and the onboarding script use `capsules.tiers`; from `capsules.allAges.fromArena`
 * (Arena 3, where every age drops) each tier holds the all-ages stacks, copies and Amber. Pure lookups
 * shared by meta (the roll), the odds sheet and the tools, so all three always show the same numbers.
 */
import type { CapsuleTier } from '@/contracts/ids';
import type { CapsuleTables, CapsuleTierDef } from './types';

type Caps = Pick<CapsuleTables, 'tiers' | 'allAges'>;

const merged = new WeakMap<object, Map<CapsuleTier, CapsuleTierDef>>();

/** True when an arena (0-based `arenaIndex`; null = no arena, the base table) uses the all-ages table. */
export function usesAllAgesTable(caps: Pick<CapsuleTables, 'allAges'>, arenaIndex: number | null): boolean {
  return arenaIndex !== null && arenaIndex + 1 >= caps.allAges.fromArena;
}

/**
 * The tier as rolled in this arena: `capsules.tiers[tier]`, with the all-ages stacks, copies and Amber
 * from `allAges.fromArena` on. The same object is returned for the same tables, tier and table.
 */
export function capsuleTierFor(caps: Caps, tier: CapsuleTier, arenaIndex: number | null): CapsuleTierDef {
  const base = caps.tiers[tier];
  if (!usesAllAgesTable(caps, arenaIndex)) return base;
  let byTier = merged.get(caps.allAges);
  if (!byTier) {
    byTier = new Map();
    merged.set(caps.allAges, byTier);
  }
  let def = byTier.get(tier);
  if (!def || def.id !== base.id) {
    const size = caps.allAges.tiers[tier];
    def = { ...base, stacks: size.stacks, copies: size.copies, amber: size.amber, expectedCopiesCenti: size.expectedCopiesCenti };
    byTier.set(tier, def);
  }
  return def;
}

/** Stacks of an Age Capsule in this arena (A6.4 "Other capsule types"). */
export function ageCapsuleStacksFor(caps: Pick<CapsuleTables, 'ageCapsule' | 'allAges'>, arenaIndex: number | null): number {
  return usesAllAgesTable(caps, arenaIndex) ? caps.allAges.ageCapsuleStacks : caps.ageCapsule.stacks;
}
