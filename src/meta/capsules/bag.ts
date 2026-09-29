/**
 * The Win Capsule shuffle bag (DESIGN A6.4): 200 slots holding exactly 60 Clay, 80 Bronze, 40 Silver,
 * 13 Jade, 4 Gold, 2 Platinum and 1 Aeon (the content's `capsules.bag`; the size is the sum of the
 * counts), drawn without replacement and refilled when empty.
 *
 * Save encoding (`SaveDoc.capsules.bag`): the tier indices (places in `capsules.tierOrder`, 0 = Clay
 * ... 6 = Aeon) still left in the current bag, kept sorted, so the save reveals how many of each tier
 * are left but never the order. An empty array means the next Win Capsule starts a fresh bag.
 * `SaveDoc.capsules.bagSize` is the size of the bag `bag` belongs to (100 for a bag filled before the
 * 2026-09-29 ladder, which finishes with its old mix; 0 when empty), so "N of {size} left" stays true.
 * Drawing a uniform element of the remaining multiset is exactly drawing without replacement from a
 * shuffled bag.
 */
import type { CapsuleTier } from '@/contracts';
import type { CapsuleTables } from '@/content';
import { randInt, type Sfc32State } from '@/core';

/** A full bag as sorted tier indices. */
export function freshBag(caps: CapsuleTables): number[] {
  const out: number[] = [];
  caps.tierOrder.forEach((tier, index) => {
    for (let i = 0; i < caps.bag[tier]; i += 1) out.push(index);
  });
  return out;
}

/** Size of a full bag from the content (200): the sum of the bag counts. */
export function bagSize(caps: CapsuleTables): number {
  return caps.tierOrder.reduce((n, tier) => n + caps.bag[tier], 0);
}

/** Zero for every tier of the ladder. */
export function tierCounts(caps: CapsuleTables): Record<CapsuleTier, number> {
  return Object.fromEntries(caps.tierOrder.map((tier) => [tier, 0])) as Record<CapsuleTier, number>;
}

/** How many of each tier are left in `bag` (a fresh bag when empty). */
export function bagLeft(bag: readonly number[], caps: CapsuleTables): Record<CapsuleTier, number> {
  const out = tierCounts(caps);
  const source = bag.length === 0 ? freshBag(caps) : bag;
  for (const i of source) {
    const tier = caps.tierOrder[i];
    if (tier) out[tier] += 1;
  }
  return out;
}

/**
 * The size of the save's current bag for "N of {size} left": the stored `bagSize`, or the content
 * bag size when the bag is empty or the save has none (the next draw starts a fresh bag).
 */
export function bagTotal(state: { bag: readonly number[]; bagSize?: number }, caps: CapsuleTables): number {
  return state.bag.length > 0 && (state.bagSize ?? 0) > 0 ? (state.bagSize as number) : bagSize(caps);
}

/**
 * Draws one tier from the bag. Returns the tier, the bag that is left (`[]` when it ran empty) and the
 * size of the bag it belongs to (the content size after a refill, the old size otherwise, 0 once empty).
 */
export function drawFromBag(
  bag: readonly number[],
  caps: CapsuleTables,
  rng: Sfc32State,
  size = 0,
): { tier: CapsuleTier; bag: number[]; bagSize: number } {
  const valid = bag.filter((i) => Number.isInteger(i) && i >= 0 && i < caps.tierOrder.length);
  const refill = valid.length === 0;
  const source = refill ? freshBag(caps) : valid;
  const k = randInt(rng, source.length);
  const tier = caps.tierOrder[source[k] ?? 0] ?? caps.tierOrder[0] ?? 'clay';
  const left = source.slice(0, k).concat(source.slice(k + 1));
  const full = refill || size <= 0 ? bagSize(caps) : size;
  return { tier, bag: left, bagSize: left.length === 0 ? 0 : full };
}
