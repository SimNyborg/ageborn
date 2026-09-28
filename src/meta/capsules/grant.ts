/**
 * Granting a Time Capsule (DESIGN A6.4, A6.5, B8): the contents are rolled the moment a capsule is
 * granted and saved before any animation plays; opening only reveals them.
 *
 * Tier by kind (A6.4 "Other capsule types"):
 *
 * - `win`: drawn from the 100-slot bag (`bag.ts`); scripted capsules bypass the bag.
 * - `daily`: rolls Bronze 78%, Silver 15%, Jade 5%, Aeon 2%; takes one banked Daily Capsule if any.
 * - `meter`: Clay. `codex`: Silver (fixed). `road` and `conquest`: the tier the node or milestone names.
 * - `age`: Silver-sized (4 stacks, Silver copies and Amber), all cards from one age, ≥ 1 Epic stack.
 * - `ageUnlock`: fixed contents: the age's Anti-armor Rare plus 4 copies of each of its 3 common
 *   units (A6.3); no foils, no pity, no script.
 *
 * The climb starts at the kind's `climbFrom` (never above the rolled tier); fixed kinds start at
 * their tier (A10). The first five counted capsules follow the onboarding script (`script.ts`).
 */
import type { AgeId, CapsuleContents, CapsuleStack, CapsuleTier, CardId, PendingCapsule, SaveDoc, SkinId } from '@/contracts';
import type { CapsuleTierDef, Content } from '@/content';
import { chanceBp, cloneSfc32, pickWeighted, rngId, type Sfc32State } from '@/core';
import { AGE_UNLOCK_TIER } from '../rules';
import { ageCards, arenaOf, cardRarity, isOwned, poolOf, TIER_INDEX, TIER_ORDER } from '../tables';
import { drawFromBag } from './bag';
import { pityDraw } from './pity';
import { rollStacks, type RollSpec } from './roll';
import { rollScripted, scriptFor } from './script';
import { rollCapsuleCosmetic } from '../cosmetics';
import { rollSkinOfRarity, rollSkinRarity, skinsForRoll } from './wardrobe';

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
  return TIER_ORDER[pickWeighted(rng, TIER_ORDER.map((tier) => odds[tier]))] ?? 'bronze';
}

function lowerTier(a: CapsuleTier, b: CapsuleTier): CapsuleTier {
  return TIER_INDEX[a] <= TIER_INDEX[b] ? a : b;
}

/** The Aeon bonus skin (A6.4: 30% chance, Wardrobe odds, no duplicate while unowned ones remain). */
function bonusSkin(s: SaveDoc, t: Content, rng: Sfc32State, tier: CapsuleTierDef): SkinId | null {
  if (tier.skinChanceBp <= 0 || !chanceBp(rng, tier.skinChanceBp)) return null;
  return rollSkinOfRarity(t, rng, rollSkinRarity(t, rng, null), skinsForRoll(s))?.skin ?? null;
}

function spec(tier: CapsuleTierDef, randomLegendaries: boolean): RollSpec {
  return {
    stacks: tier.stacks,
    guaranteed: tier.guaranteed,
    copies: tier.copies,
    rareToLegendaryBp: tier.rareToLegendaryBp,
    randomLegendaries,
  };
}

/** Age Unlock contents: the age's Anti-armor Rare and its 3 common units (A6.3). */
function ageUnlockStacks(t: Content, age: AgeId, owned: ReadonlySet<CardId>): CapsuleStack[] {
  const { units } = ageCards(t, age);
  const aa = units.find((id) => t.units[id]?.group === 'antiArmor' && t.units[id]?.rarity === 'rare');
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
  return [...commons.map((c) => stack(c, au.commonCopies)), ...(aa ? [stack(aa, au.rareCopies)] : [])];
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
    contents = { stacks, amber: def.amber, dust: def.bonusDust, skin: bonusSkin(s, t, rng, def) };
  } else if (kind === 'age') {
    age = o.age ?? defaultCapsuleAge(s, t);
    const ac = caps.ageCapsule;
    const copiesTier = caps.tiers[ac.copiesTier];
    tier = ac.copiesTier;
    const stacks = rollStacks(
      { stacks: ac.stacks, guaranteed: ac.guaranteed, copies: copiesTier.copies, rareToLegendaryBp: 0, randomLegendaries: arena.randomLegendaries },
      { t, rng, pool: poolOf(t, [age]), owned, pity: pityDraw(s, t), reserved },
    );
    contents = { stacks, amber: copiesTier.amber, dust: 0, skin: null };
  } else {
    if (o.tier) tier = o.tier;
    else if (kind === 'win') {
      const d = drawFromBag(bag, caps, rng);
      tier = d.tier;
      bag = d.bag;
    } else if (kind === 'daily') tier = dailyTier(t, rng);
    else if (kind === 'meter') tier = 'clay';
    else if (kind === 'codex') tier = caps.codexCapsuleTier;
    else tier = 'silver';
    const def = caps.tiers[tier];
    const stacks = rollStacks(spec(def, arena.randomLegendaries), { t, rng, pool: poolOf(t, arena.dropAges), owned, pity: pityDraw(s, t), reserved });
    contents = { stacks, amber: def.amber, dust: def.bonusDust, skin: bonusSkin(s, t, rng, def) };
  }

  // A18.9.4: a collection item, from its own stream so the cards above never change
  const cos = rollCapsuleCosmetic(s, t, tier, kind, script !== null);
  if (cos.key) contents = { ...contents, cosmetic: cos.key };
  const startTier = kindDef.climbFrom === null ? tier : lowerTier(kindDef.climbFrom, tier);
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
      pending: [...s.capsules.pending, capsule],
      dailyBank: kind === 'daily' ? Math.max(0, s.capsules.dailyBank - 1) : s.capsules.dailyBank,
    },
  };
  return { save, capsule };
}
