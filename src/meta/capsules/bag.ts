/**
 * The Win Capsule shuffle bag (DESIGN A6.4): 100 slots holding exactly 30 Clay, 40 Bronze, 20 Silver,
 * 7 Jade and 3 Aeon, drawn without replacement and refilled when empty.
 *
 * Save encoding (`SaveDoc.capsules.bag`): the tier indices (0 = Clay ... 4 = Aeon) still left in the
 * current bag, kept sorted, so the save reveals how many of each tier are left but never the order.
 * An empty array means the next Win Capsule starts a fresh bag. Drawing a uniform element of the
 * remaining multiset is exactly drawing without replacement from a shuffled bag.
 */
import type { CapsuleTier } from '@/contracts';
import type { CapsuleTables } from '@/content';
import { randInt, type Sfc32State } from '@/core';
import { TIER_INDEX, TIER_ORDER } from '../tables';

/** A full bag as sorted tier indices. */
export function freshBag(caps: CapsuleTables): number[] {
  const out: number[] = [];
  for (const tier of TIER_ORDER) for (let i = 0; i < caps.bag[tier]; i += 1) out.push(TIER_INDEX[tier]);
  return out;
}

/** Size of a full bag (100). */
export function bagSize(caps: CapsuleTables): number {
  return TIER_ORDER.reduce((n, tier) => n + caps.bag[tier], 0);
}

/** How many of each tier are left in `bag` (a fresh bag when empty). */
export function bagLeft(bag: readonly number[], caps: CapsuleTables): Record<CapsuleTier, number> {
  const out: Record<CapsuleTier, number> = { clay: 0, bronze: 0, silver: 0, jade: 0, aeon: 0 };
  const source = bag.length === 0 ? freshBag(caps) : bag;
  for (const i of source) {
    const tier = TIER_ORDER[i];
    if (tier) out[tier] += 1;
  }
  return out;
}

/** Draws one tier from the bag. Returns the tier and the bag that is left (`[]` when it ran empty). */
export function drawFromBag(
  bag: readonly number[],
  caps: CapsuleTables,
  rng: Sfc32State,
): { tier: CapsuleTier; bag: number[] } {
  const valid = bag.filter((i) => Number.isInteger(i) && i >= 0 && i < TIER_ORDER.length);
  const source = valid.length === 0 ? freshBag(caps) : valid;
  const k = randInt(rng, source.length);
  const tier = TIER_ORDER[source[k] ?? 0] ?? 'clay';
  const left = source.slice(0, k).concat(source.slice(k + 1));
  return { tier, bag: left };
}
