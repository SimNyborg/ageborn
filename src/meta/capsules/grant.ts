/**
 * Granting a Time Capsule (DESIGN A6.4, A6.5, B8): the contents are rolled the moment a capsule is
 * granted and saved before any animation plays; opening only reveals them.
 *
 * Tier by kind (A6.4 "Other capsule types"):
 *
 * - `win`: drawn from the 200-slot bag (`bag.ts`); scripted capsules bypass the bag.
 * - `daily` (Supply): rolls Bronze 78%, Silver 15%, Jade 5%, Gold 1.5%, Platinum 0.35%, Aeon 0.15%
 *   (`dailyOddsBp`); takes one banked allowance if any.
 * - `meter`: Clay. `codex`: Silver (fixed). `road` and `conquest`: the tier the node or milestone names.
 * - `age`: Silver-sized (4 stacks, Silver copies and Amber), all cards from one age, ≥ 1 Epic stack.
 * - `ageUnlock`: fixed contents: the age's Support Rare plus 4 copies of each of its 3 common
 *   units (A6.3; the Anti-heavy Rare it held before is in the starter kit since owner feedback
 *   2026-09-29); no foils, no pity, no script.
 *
 * The climb starts at the kind's `climbFrom` (never above the rolled tier); fixed kinds start at
 * their tier (A10). The first five counted capsules follow the onboarding script (`script.ts`).
 *
 * Extras (A6.4 steps 7-8): a capsule skin with the tier's `skinChanceBp` at Wardrobe odds from
 * `skinMinRarity` up (never touching Wardrobe pity); for an `exclusiveItems` tier (Aeon), a
 * collection item of that tier the player lacks, or once the set is complete a normal collection
 * item plus `exclusiveCompleteDust` (the cosmetic stream, `cosmetics.ts`).
 */
import type { AgeId, CapsuleContents, CapsuleStack, CapsuleTier, CardId, PendingCapsule, SaveDoc, SkinId } from '@/contracts';
import type { CapsuleTierDef, Content } from '@/content';
import { chanceBp, cloneSfc32, pickWeighted, rngId, type Sfc32State } from '@/core';
import { AGE_UNLOCK_TIER } from '../rules';
import { ageCards, arenaOf, cardRarity, isOwned, poolOf, tierIndex, tierOrder } from '../tables';
import { drawFromBag } from './bag';
import { pityDraw } from './pity';
import { rollStacks, type RollSpec } from './roll';
import { rollScripted, scriptFor } from './script';
import { rollCapsuleCosmetic } from '../cosmetics';
import { rollSkinOfRarity, rollSkinRarityFrom, skinsForRoll } from './wardrobe';

export interface GrantOptions {
  /** Fixed tier (road, conquest; overrides the bag or the daily odds when given). */
  tier?: CapsuleTier;
  /** The age of an Age Capsule or Age Unlock Capsule. */
  age?: AgeId;
}

/** Cards the player owns or will own from an unopened capsule. */
export function cardsForRoll(s: SaveDoc): Set<CardId> {
  const out = new Set<CardId>();
  for (const id of Object.keys(s.collection)) if (isOwned(s, id)) out.add(id);
  for (const p of s.capsules.pending) for (const st of p.contents.stacks) out.add(st.card);
  return out;
}

/**
 * Legendary catch-up input (A6.4 step 4): for every card the player owns or will own from an unopened
 * capsule, the copies it still needs to reach the level cap after its unopened capsules (0 when maxed).
 */
export function copiesStillNeeded(s: SaveDoc, t: Content): Map<CardId, number> {
  const cap = t.economy.maxLevel;
  const need = new Map<CardId, number>();
  const toCap = (card: CardId, level: number, held: number): number => {
    const up = t.rarities.cards[cardRarity(t, card)].upgradeCopies;
    let n = -held;
    for (let l = Math.max(1, level); l < cap; l += 1) n += up[l - 1] ?? 0;
    return Math.max(0, n);
  };
  for (const [id, e] of Object.entries(s.collection)) if (e.level >= 1) need.set(id, toCap(id, e.level, e.copies));
  for (const p of s.capsules.pending) {
    for (const st of p.contents.stacks) {
      const before = need.get(st.card) ?? toCap(st.card, 1, 0);
      need.set(st.card, Math.max(0, before - st.copies));
    }
  }
  return need;
}

/** Cards an unopened capsule will reveal as NEW (kept out of other rolls where possible, `roll.ts`). */
export function promisedNew(s: SaveDoc): Set<CardId> {
  const out = new Set<CardId>();
  for (const p of s.capsules.pending) for (const st of p.contents.stacks) if (st.isNew) out.add(st.card);
  return out;
}

/**
 * The age an Age Capsule gets when the caller names none (the dialog of A6.4 is the app's): the drop
 * pool age with the most cards not owned yet, ties to the earliest age.
 */
export function defaultCapsuleAge(s: SaveDoc, t: Content): AgeId {
  const arena = arenaOf(s, t);
  const owned = cardsForRoll(s);
  let best: AgeId = arena.dropAges[0] ?? 'stone';
  let bestN = -1;
  for (const age of arena.dropAges) {
    const n = poolOf(t, [age]).cards.filter((c) => !owned.has(c)).length;
    if (n > bestN) {
      best = age;
      bestN = n;
    }
  }
  return best;
}

function dailyTier(t: Content, rng: Sfc32State): CapsuleTier {
  const odds = t.capsules.dailyOddsBp;
  const order = tierOrder(t);
  const i = pickWeighted(rng, order.map((tier) => odds[tier]));
  return order[i] ?? t.capsules.kinds.daily.climbFrom ?? order[0] ?? 'bronze';
}

function lowerTier(t: Content, a: CapsuleTier, b: CapsuleTier): CapsuleTier {
  return tierIndex(t, a) <= tierIndex(t, b) ? a : b;
}

/**
 * The capsule skin (A6.4 step 7): the tier's chance, then a rarity at Wardrobe odds from the tier's
 * `skinMinRarity` up, no duplicate while unowned ones of that rarity remain. Never reads or advances
 * the Wardrobe pity counters.
 */
function capsuleSkin(s: SaveDoc, t: Content, rng: Sfc32State, tier: CapsuleTierDef): SkinId | null {
  if (tier.skinChanceBp <= 0 || !chanceBp(rng, tier.skinChanceBp)) return null;
  return rollSkinOfRarity(t, rng, rollSkinRarityFrom(t, rng, tier.skinMinRarity), skinsForRoll(s))?.skin ?? null;
}

function spec(tier: CapsuleTierDef, randomLegendaries: boolean): RollSpec {
  return {
    stacks: tier.stacks,
    guaranteed: tier.guaranteed,
    copies: tier.copies,
    extraLegendaryCopies: tier.extraLegendaryCopies,
    randomLegendaries,
  };
}

/** Age Unlock contents: the age's Support Rare and its 3 common units (A6.3, A3). */
function ageUnlockStacks(t: Content, age: AgeId, owned: ReadonlySet<CardId>): CapsuleStack[] {
  const { units } = ageCards(t, age);
  const rare = units.find((id) => t.units[id]?.group === 'support' && t.units[id]?.rarity === 'rare');
  const commons = units.filter((id) => t.units[id]?.rarity === 'common');
  const au = t.capsules.ageUnlock;
  const stack = (card: CardId, copies: number): CapsuleStack => ({
    card,
    rarity: cardRarity(t, card),
    copies,
    isNew: !owned.has(card),
    foil: 'none',
    dust: 0,
  });
  return [...commons.map((c) => stack(c, au.commonCopies)), ...(rare ? [stack(rare, au.rareCopies)] : [])];
}

/** Grants one capsule at time `now`, rolled immediately. */
export function grantCapsuleAt(
  s: SaveDoc,
  kind: PendingCapsule['kind'],
  t: Content,
  now: number,
  o: GrantOptions = {},
): { save: SaveDoc; capsule: PendingCapsule } {
  const caps = t.capsules;
  const kindDef = caps.kinds[kind];
  const arena = arenaOf(s, t);
  const rng = cloneSfc32(s.rng.capsule);
  const owned = cardsForRoll(s);
  const reserved = promisedNew(s);
  const script = kindDef.countsForPity ? scriptFor(s, t) : null;
  let bag = s.capsules.bag;
  let bagSize = s.capsules.bagSize ?? 0;
  const need = caps.legendaryCatchUp ? copiesStillNeeded(s, t) : undefined;
  let tier: CapsuleTier;
  let age: AgeId | null = null;
  let contents: CapsuleContents;

  if (kind === 'ageUnlock') {
    age = o.age ?? arena.dropAges[arena.dropAges.length - 1] ?? 'stone';
    tier = o.tier ?? AGE_UNLOCK_TIER;
    contents = { stacks: ageUnlockStacks(t, age, owned), amber: 0, dust: 0, skin: null };
  } else if (script) {
    tier = script.tier;
    const def = caps.tiers[tier];
    const stacks = rollScripted(script, {
      t,
      rng,
      pool: poolOf(t, arena.dropAges),
      owned,
      save: s,
      fillerAge: arena.dropAges[0],
    });
    // A scripted capsule is not from one age, even when it is an Age Capsule: `age` stays null.
    contents = { stacks, amber: def.amber, dust: def.bonusDust, skin: capsuleSkin(s, t, rng, def) };
  } else if (kind === 'age') {
    age = o.age ?? defaultCapsuleAge(s, t);
    const ac = caps.ageCapsule;
    const copiesTier = caps.tiers[ac.copiesTier];
    tier = ac.copiesTier;
    const stacks = rollStacks(
      { stacks: ac.stacks, guaranteed: ac.guaranteed, copies: copiesTier.copies, randomLegendaries: arena.randomLegendaries },
      { t, rng, pool: poolOf(t, [age]), owned, pity: pityDraw(s, t), reserved, need },
    );
    contents = { stacks, amber: copiesTier.amber, dust: 0, skin: null };
  } else {
    if (o.tier) tier = o.tier;
    else if (kind === 'win') {
      const d = drawFromBag(bag, caps, rng, bagSize);
      tier = d.tier;
      bag = d.bag;
      bagSize = d.bagSize;
    } else if (kind === 'daily') tier = dailyTier(t, rng);
    else if (kind === 'meter') tier = 'clay';
    else if (kind === 'codex') tier = caps.codexCapsuleTier;
    else tier = 'silver';
    const def = caps.tiers[tier];
    const stacks = rollStacks(spec(def, arena.randomLegendaries), {
      t,
      rng,
      pool: poolOf(t, arena.dropAges),
      owned,
      pity: pityDraw(s, t),
      reserved,
      need,
    });
    contents = { stacks, amber: def.amber, dust: def.bonusDust, skin: capsuleSkin(s, t, rng, def) };
  }

  // A18.9.4: a collection item, from its own stream so the cards above never change
  // A6.4 step 8: an Aeon's collection item is an Aeon Collection item while the set is incomplete
  const cos = rollCapsuleCosmetic(s, t, tier, kind, script !== null);
  if (cos.key) contents = { ...contents, cosmetic: cos.key };
  if (cos.dust > 0) contents = { ...contents, dust: contents.dust + cos.dust };
  const startTier = kindDef.climbFrom === null ? tier : lowerTier(t, kindDef.climbFrom, tier);
  const capsule: PendingCapsule = {
    id: rngId(rng, 'cap'),
    kind,
    tier,
    startTier,
    scriptIndex: script ? script.capsule : null,
    age,
    contents,
    createdAt: now,
  };
  const save: SaveDoc = {
    ...s,
    rng: { ...s.rng, capsule: rng, cosmetic: cos.rng },
    scriptStep: script ? s.scriptStep + 1 : s.scriptStep,
    capsules: {
      ...s.capsules,
      bag,
      bagSize,
      pending: [...s.capsules.pending, capsule],
      dailyBank: kind === 'daily' ? Math.max(0, s.capsules.dailyBank - 1) : s.capsules.dailyBank,
    },
  };
  return { save, capsule };
}
