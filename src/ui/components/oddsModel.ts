/**
 * The published odds and the live pity counters behind the odds sheet (DESIGN A6.4, A6.5, C5 #27).
 * Pure: everything comes from the content tables and the save, so what the sheet says is exactly
 * what the rules use.
 *
 * Save encoding assumption (WP7 owns it): `capsules.bag` holds the Win Capsule tiers still left in the
 * current 100-slot bag as tier indices (0 = Clay ... 4 = Aeon). An empty bag means the next Win Capsule
 * starts a fresh bag.
 */
import type { CapsuleTables, Rarities } from '@/content/types';
import type { CapsuleTier, Foil, Rarity, SaveDoc, SkinRarity } from '@/contracts';

export interface TierRow {
  tier: CapsuleTier;
  perHundred: number;
  leftInBag: number;
}

export interface PityRow {
  id: 'epic' | 'legendary' | 'newCard' | 'wardrobeEpic' | 'wardrobeLegendary';
  /** Capsules (or crates) until the guarantee, counting the next one as 1. */
  guaranteedIn: number;
  /** Chance in bp for the next capsule (Legendary pity only), else null. */
  nextChanceBp: number | null;
  /** How many have been opened since the last hit. */
  since: number;
  every: number;
}

export interface TierContentsRow {
  tier: CapsuleTier;
  stacks: number;
  copies: Record<Rarity, number>;
  guaranteed: Rarity[];
  amber: number;
  bonusDust: number;
  skinChanceBp: number;
  rareToLegendaryBp: number;
}

export interface OddsModel {
  bag: TierRow[];
  bagLeftTotal: number;
  bagSize: number;
  dailyBp: { tier: CapsuleTier; bp: number }[];
  stackBp: { rarity: Rarity; bp: number }[];
  tiers: TierContentsRow[];
  foils: { foil: Exclude<Foil, 'none'>; bp: number }[];
  wardrobeBp: { rarity: SkinRarity; bp: number }[];
  pity: PityRow[];
  /** False in arenas without random Legendaries (A6.4 step 1.2). */
  randomLegendaries: boolean;
}

/** Remaining slots per tier in the current bag (a fresh bag when empty). */
export function bagLeft(capsules: CapsuleTables, bag: readonly number[]): Record<CapsuleTier, number> {
  const out = { clay: 0, bronze: 0, silver: 0, jade: 0, aeon: 0 } as Record<CapsuleTier, number>;
  if (bag.length === 0) {
    for (const tier of capsules.tierOrder) out[tier] = capsules.bag[tier];
    return out;
  }
  for (const i of bag) {
    const tier = capsules.tierOrder[i];
    if (tier) out[tier] += 1;
  }
  return out;
}

/** Legendary pity chance for the capsule that would be number `n` since the last Legendary (A6.5). */
export function legendaryPityBp(capsules: CapsuleTables, n: number): number {
  const p = capsules.pity;
  if (n >= p.legendaryGuaranteeAt) return 10000;
  if (n <= p.legendaryFreeUntil) return 0;
  return Math.min(10000, (n - p.legendaryFreeUntil) * p.legendaryStepBp);
}

function guaranteeIn(every: number, since: number): number {
  return Math.max(1, every - since);
}

export function oddsModel(
  capsules: CapsuleTables,
  rarities: Rarities,
  save: Pick<SaveDoc, 'pity' | 'capsules'>,
  randomLegendaries: boolean,
): OddsModel {
  const left = bagLeft(capsules, save.capsules.bag);
  const pity = save.pity;
  const p = capsules.pity;
  const nextLegendary = pity.sinceLegendary + 1;
  return {
    bag: capsules.tierOrder.map((tier) => ({ tier, perHundred: capsules.bag[tier], leftInBag: left[tier] })),
    bagLeftTotal: capsules.tierOrder.reduce((n, tier) => n + left[tier], 0),
    bagSize: capsules.tierOrder.reduce((n, tier) => n + capsules.bag[tier], 0),
    dailyBp: capsules.tierOrder.filter((tier) => capsules.dailyOddsBp[tier] > 0).map((tier) => ({ tier, bp: capsules.dailyOddsBp[tier] })),
    stackBp: rarities.order.map((rarity) => ({ rarity, bp: capsules.stackRollBp[rarity] })),
    tiers: capsules.tierOrder.map((tier) => {
      const d = capsules.tiers[tier];
      return {
        tier,
        stacks: d.stacks,
        copies: d.copies,
        guaranteed: d.guaranteed,
        amber: d.amber,
        bonusDust: d.bonusDust,
        skinChanceBp: d.skinChanceBp,
        rareToLegendaryBp: d.rareToLegendaryBp,
      };
    }),
    foils: rarities.foilOrder
      .filter((f): f is Exclude<Foil, 'none'> => f !== 'none')
      .map((foil) => ({ foil, bp: rarities.foils[foil].rollBp })),
    wardrobeBp: rarities.skinOrder.map((rarity) => ({ rarity, bp: rarities.skins[rarity].crateOddsBp })),
    pity: [
      { id: 'epic', since: pity.sinceEpic, every: p.epicEvery, guaranteedIn: guaranteeIn(p.epicEvery, pity.sinceEpic), nextChanceBp: null },
      {
        id: 'legendary',
        since: pity.sinceLegendary,
        every: p.legendaryGuaranteeAt,
        guaranteedIn: guaranteeIn(p.legendaryGuaranteeAt, pity.sinceLegendary),
        nextChanceBp: legendaryPityBp(capsules, nextLegendary),
      },
      { id: 'newCard', since: pity.sinceNewCard, every: p.newCardEvery, guaranteedIn: guaranteeIn(p.newCardEvery, pity.sinceNewCard), nextChanceBp: null },
      {
        id: 'wardrobeEpic',
        since: pity.wardrobeSinceEpic,
        every: p.wardrobeEpicEvery,
        guaranteedIn: guaranteeIn(p.wardrobeEpicEvery, pity.wardrobeSinceEpic),
        nextChanceBp: null,
      },
      {
        id: 'wardrobeLegendary',
        since: pity.wardrobeSinceLegendary,
        every: p.wardrobeLegendaryEvery,
        guaranteedIn: guaranteeIn(p.wardrobeLegendaryEvery, pity.wardrobeSinceLegendary),
        nextChanceBp: null,
      },
    ],
    randomLegendaries,
  };
}

/** 7200 → "72%", 25 → "0.25%" (EN). */
export function formatBp(bp: number, locale = 'en'): string {
  const digits = bp % 100 === 0 ? 0 : bp % 10 === 0 ? 1 : 2;
  return new Intl.NumberFormat(locale, { style: 'percent', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(bp / 10000);
}
