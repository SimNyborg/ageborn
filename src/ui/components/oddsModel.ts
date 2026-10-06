/**
 * The published odds and the live pity counters behind the odds sheet (DESIGN A6.4, A6.5, C5 #27).
 * Pure: everything comes from the content tables and the save, so what the sheet says is exactly
 * what the rules use.
 *
 * Save encoding (WP7 owns it): `capsules.bag` holds the Win Capsule tiers still left in the current
 * bag as tier indices (`content.capsules.tierOrder`: 0 = Clay ... 6 = Aeon) and `capsules.bagSize` the
 * size of that bag (100 for a bag filled before the 2026-09-29 ladder, then the content bag size). An
 * empty bag means the next Win Capsule starts a fresh bag.
 */
import { capsuleTierFor, usesAllAgesTable } from '@/content/capsuleTiers';
import type { CapsuleTables, CosmeticCollections, Rarities } from '@/content/types';
import type { CapsuleTier, Foil, Rarity, SaveDoc, SkinRarity } from '@/contracts';
import { legendaryBagTiers, tierCrests } from './capsuleLook';

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
  /** The lowest skin rarity this tier's skin can be (Wardrobe odds from there up). */
  skinMinRarity: SkinRarity;
  /**
   * The exact rarity split of this tier's skin (A6.4 step 7): the Wardrobe odds limited to
   * `skinMinRarity` and up, renormalised, as the roll uses them. Empty when the tier holds no skin.
   */
  skinRarityBp: { rarity: SkinRarity; bp: number }[];
  rareToLegendaryBp: number;
  /** Guaranteed Legendary stacks: the tier's Legendary crests (Gold 1, Platinum 2, Aeon 3). */
  crests: number;
  /** Copies in the 2nd and later guaranteed Legendary stacks. */
  extraLegendaryCopies: number;
  /** Holds one item of this tier's own collection (the Aeon Collection) while the set is incomplete. */
  exclusiveItems: boolean;
}

/** A tier's own cosmetic set (A6.4 step 8, A18.9.4): progress and the crafting path. */
export interface ExclusiveSetRow {
  tier: CapsuleTier;
  owned: number;
  total: number;
  /** The save has opened a capsule of this tier (`flags['capsule.first.<tier>']`), so items can be crafted. */
  craftable: boolean;
  craftDust: number;
  completeDust: number;
}

export interface OddsModel {
  bag: TierRow[];
  bagLeftTotal: number;
  /** The content bag size (200): the per-tier counts are "n in {bagSize}". */
  bagSize: number;
  /** The size of the bag in progress: `capsules.bagSize` (100 for a bag from before the 2026-09-29 ladder), or a fresh bag's. */
  bagTotal: number;
  /** The bag in progress was filled before the 2026-09-29 ladder (its size differs from today's bag). */
  legacyBag: boolean;
  /** The tiers that always hold a Legendary, with their exact count per bag, from the top. */
  legendaryBag: { tier: CapsuleTier; n: number }[];
  /** Tiers above this one climb with summit strikes (A10). */
  summitAbove: CapsuleTier;
  /** Legendary catch-up once every Legendary is owned (A6.4 step 4). */
  catchUp: boolean;
  /** Tier-exclusive cosmetic sets that exist in content (none until their items ship). */
  exclusive: ExclusiveSetRow[];
  /** The one-time "Two new capsule tiers" notice is still open (`flags['notice.capsuleLadder']`). */
  notice: boolean;
  dailyBp: { tier: CapsuleTier; bp: number }[];
  stackBp: { rarity: Rarity; bp: number }[];
  tiers: TierContentsRow[];
  foils: { foil: Exclude<Foil, 'none'>; bp: number }[];
  wardrobeBp: { rarity: SkinRarity; bp: number }[];
  pity: PityRow[];
  /** False in arenas without random Legendaries (A6.4 step 1.2). */
  randomLegendaries: boolean;
  /**
   * The all-ages table (A6.4, content re-tune 2026-10-04): `active` when the player's arena rolls it (the
   * tier rows then show its stacks, copies and Amber), and the arena (1-based) where it starts.
   */
  allAges: { active: boolean; fromArena: number };
  /** The cosmetic collection drops (A18.9.4): chance per Time Capsule tier and both pools' rarity odds. */
  cosmetics?: {
    capsuleChanceBp: { tier: CapsuleTier; bp: number }[];
    capsuleRarityBp: { rarity: Rarity; bp: number; items: number }[];
    crateRarityBp: { rarity: Rarity; bp: number; items: number }[];
  };
}

/** Remaining slots per tier in the current bag (a fresh bag when empty). */
export function bagLeft(capsules: CapsuleTables, bag: readonly number[]): Record<CapsuleTier, number> {
  const out = Object.fromEntries(capsules.tierOrder.map((tier) => [tier, 0])) as Record<CapsuleTier, number>;
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

/**
 * A capsule skin's rarity odds in bp (A6.4 step 7, the weights meta `rollSkinRarityFrom` uses): the
 * Wardrobe odds from `min` up, renormalised to 10,000 by largest remainder, so the shown shares add up
 * to 100% (Aeon from Epic: 1800 : 400 → 81.82% / 18.18%).
 */
export function skinRarityOddsBp(rarities: Rarities, min: SkinRarity): { rarity: SkinRarity; bp: number }[] {
  const from = rarities.skinOrder.indexOf(min);
  const rows = rarities.skinOrder.filter((_, i) => i >= from).map((rarity) => ({ rarity, w: rarities.skins[rarity].crateOddsBp }));
  const total = rows.reduce((n, r) => n + r.w, 0);
  if (total <= 0) return [];
  const exact = rows.map((r) => ({ rarity: r.rarity, bp: Math.floor((r.w * 10000) / total), rem: (r.w * 10000) % total }));
  let short = 10000 - exact.reduce((n, r) => n + r.bp, 0);
  for (const r of [...exact].sort((a, b) => b.rem - a.rem)) {
    if (short <= 0) break;
    r.bp += 1;
    short -= 1;
  }
  return exact.filter((r) => r.bp > 0).map(({ rarity, bp }) => ({ rarity, bp }));
}

function guaranteeIn(every: number, since: number): number {
  return Math.max(1, every - since);
}

export function oddsModel(
  capsules: CapsuleTables,
  rarities: Rarities,
  save: Pick<SaveDoc, 'pity' | 'capsules'> & Partial<Pick<SaveDoc, 'cosmetics' | 'flags' | 'arenaIndex'>>,
  randomLegendaries: boolean,
  collections?: CosmeticCollections,
): OddsModel {
  const arenaIndex = save.arenaIndex ?? null;
  const left = bagLeft(capsules, save.capsules.bag);
  const bagSize = capsules.tierOrder.reduce((n, tier) => n + capsules.bag[tier], 0);
  const bagTotal = save.capsules.bag.length > 0 && (save.capsules.bagSize ?? 0) > 0 ? save.capsules.bagSize : bagSize;
  const flags = save.flags ?? {};
  const owned = new Set(save.cosmetics?.owned ?? []);
  const exclusive: ExclusiveSetRow[] = capsules.tierOrder
    .filter((tier) => capsules.tiers[tier].exclusiveItems)
    .map((tier) => {
      const items = (collections?.items ?? []).filter((x) => x.source.kind === 'capsuleTier' && x.source.tier === tier);
      return {
        tier,
        owned: items.filter((x) => owned.has(`${x.collection}.${x.id}`)).length,
        total: items.length,
        craftable: flags[`capsule.first.${tier}`] === true,
        craftDust: capsules.exclusiveCraftDust,
        completeDust: capsules.exclusiveCompleteDust,
      };
    })
    .filter((x) => x.total > 0);
  const pity = save.pity;
  const p = capsules.pity;
  // Capsules already in the tray were rolled when they were earned (A6.4), so the chance shown is
  // for the next capsule the player earns: it counts after every pending capsule that counts for
  // pity, as the roll does (meta pityDraw).
  const ahead = (save.capsules.pending ?? []).filter((c) => capsules.kinds[c.kind]?.countsForPity !== false).length;
  const nextLegendary = pity.sinceLegendary + ahead + 1;
  const pool = (kind: 'capsule' | 'crate', odds: Record<Rarity, number>) =>
    rarities.order.filter((rarity) => odds[rarity] > 0).map((rarity) => ({ rarity, bp: odds[rarity], items: collections?.items.filter((x) => x.source.kind === kind && x.rarity === rarity).length ?? 0 }));
  return {
    ...(collections
      ? {
          cosmetics: {
            capsuleChanceBp: capsules.tierOrder.map((tier) => ({ tier, bp: collections.drops.capsuleChanceBp[tier] })),
            capsuleRarityBp: pool('capsule', collections.drops.capsuleRarityBp),
            crateRarityBp: pool('crate', collections.drops.crateRarityBp),
          },
        }
      : {}),
    bag: capsules.tierOrder.map((tier) => ({ tier, perHundred: capsules.bag[tier], leftInBag: left[tier] })),
    bagLeftTotal: capsules.tierOrder.reduce((n, tier) => n + left[tier], 0),
    bagSize,
    bagTotal,
    legacyBag: bagTotal !== bagSize,
    legendaryBag: legendaryBagTiers(capsules),
    summitAbove: capsules.summitAbove,
    catchUp: capsules.legendaryCatchUp,
    exclusive,
    notice: flags['notice.capsuleLadder'] === true,
    dailyBp: capsules.tierOrder.filter((tier) => capsules.dailyOddsBp[tier] > 0).map((tier) => ({ tier, bp: capsules.dailyOddsBp[tier] })),
    stackBp: rarities.order.map((rarity) => ({ rarity, bp: capsules.stackRollBp[rarity] })),
    // The tier as the player's arena rolls it (the all-ages table from Arena 3, A6.4); no arena: the base table.
    tiers: capsules.tierOrder.map((tier) => {
      const d = capsuleTierFor(capsules, tier, arenaIndex);
      return {
        tier,
        stacks: d.stacks,
        copies: d.copies,
        guaranteed: d.guaranteed,
        amber: d.amber,
        bonusDust: d.bonusDust,
        skinChanceBp: d.skinChanceBp,
        skinMinRarity: d.skinMinRarity,
        skinRarityBp: d.skinChanceBp > 0 ? skinRarityOddsBp(rarities, d.skinMinRarity) : [],
        rareToLegendaryBp: d.rareToLegendaryBp,
        crests: tierCrests(capsules, tier),
        extraLegendaryCopies: d.extraLegendaryCopies,
        exclusiveItems: d.exclusiveItems,
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
      {
        id: 'newCard',
        since: pity.sinceNewCard,
        every: p.newCardEvery,
        guaranteedIn: guaranteeIn(p.newCardEvery, pity.sinceNewCard),
        nextChanceBp: null,
      },
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
    allAges: { active: usesAllAgesTable(capsules, arenaIndex), fromArena: capsules.allAges.fromArena },
  };
}

/** 7200 → "72%", 25 → "0.25%" (EN). */
export function formatBp(bp: number, locale = 'en'): string {
  const digits = bp % 100 === 0 ? 0 : bp % 10 === 0 ? 1 : 2;
  return new Intl.NumberFormat(locale, { style: 'percent', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(
    bp / 10000,
  );
}
