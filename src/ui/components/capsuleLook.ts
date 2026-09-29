/**
 * How a Time Capsule may be shown before it is opened (DESIGN A6.4, A9, A10; A15.1 red line 7;
 * docs/requests/capsule-tiers-wp9.md). Pure, from the content tables only.
 *
 * - A capsule that climbs (its kind has a `climbFrom`: Win, Supply, Clay meter) shows only its start
 *   tier and its kind name until it is opened. Its rolled tier is never drawn, named, sorted by or
 *   read out: the strikes are a real reveal, not a show for something already on screen.
 * - A fixed-tier capsule (road, gates, War Path, Conquest, Codex, Age) shows its tier, its name and
 *   its Legendary crests, because the tier is already known.
 * - Crests come from the tier's guarantees (one per guaranteed Legendary stack), never from a tier id.
 */
import { capsuleKindNameKey, capsuleTierNameKey } from '@/content/keys';
import type { CapsuleTables } from '@/content/types';
import type { CapsuleTier, PendingCapsule } from '@/contracts';

type Shown = Pick<PendingCapsule, 'kind' | 'tier' | 'startTier' | 'scriptIndex'>;

/** True for kinds that climb in the reveal (the rolled tier stays hidden until opened). */
export function climbsOnOpen(caps: CapsuleTables, kind: PendingCapsule['kind']): boolean {
  return (caps.kinds[kind]?.climbFrom ?? null) !== null;
}

/** The tier the player may see on an unopened capsule: the start tier of a climbing kind, else its tier. */
export function visibleTier(caps: CapsuleTables, c: Shown): CapsuleTier {
  return climbsOnOpen(caps, c.kind) ? c.startTier : c.tier;
}

/** Legendary crests a tier carries: one per guaranteed Legendary stack (Gold 1, Platinum 2, Aeon 3). */
export function tierCrests(caps: CapsuleTables, tier: CapsuleTier): number {
  return caps.tiers[tier]?.guaranteed.filter((r) => r === 'legendary').length ?? 0;
}

/** Crests on an unopened capsule: none while a climbing capsule hides its tier. */
export function pendingCrests(caps: CapsuleTables, c: Shown): number {
  return climbsOnOpen(caps, c.kind) ? 0 : tierCrests(caps, c.tier);
}

/**
 * The name key of an unopened capsule: "Starter Capsule" for the onboarding script, the kind name
 * ("Win Capsule", "Supply Capsule", "Clay Meter Capsule") for a climbing capsule, the tier name for a
 * fixed one.
 */
export function pendingNameKey(caps: CapsuleTables, c: Shown): string {
  if (c.scriptIndex !== null) return 'ui.capsules.starter';
  return climbsOnOpen(caps, c.kind) ? capsuleKindNameKey(c.kind) : capsuleTierNameKey(c.tier);
}

/**
 * Order for shelves and trays: by the tier the player can see (highest first), then oldest first.
 * Never by the rolled tier of a climbing capsule.
 */
export function byVisibleTier<T extends Shown & { createdAt: number }>(caps: CapsuleTables, list: readonly T[]): T[] {
  const rank = (c: T) => caps.tierOrder.indexOf(visibleTier(caps, c));
  return [...list].sort((a, b) => rank(b) - rank(a) || a.createdAt - b.createdAt);
}

/**
 * The tiers that always hold a Legendary, with their exact count per Win Capsule bag, from the top
 * ("1 Aeon, 2 Platinum and 4 Gold"). Only tiers the bag holds.
 */
export function legendaryBagTiers(caps: CapsuleTables): { tier: CapsuleTier; n: number }[] {
  return [...caps.tierOrder]
    .reverse()
    .filter((tier) => tierCrests(caps, tier) > 0 && caps.bag[tier] > 0)
    .map((tier) => ({ tier, n: caps.bag[tier] }));
}
