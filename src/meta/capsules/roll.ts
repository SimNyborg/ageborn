/**
 * The capsule roll algorithm (DESIGN A6.4, "MUST be implemented exactly"):
 *
 * 1. Build the stack rarity list: guaranteed rarities first; the remaining stacks roll Common 72%,
 *    Rare 22%, Epic 5%, Legendary 1% (in an arena without random Legendaries only this 1% moves to
 *    Common); Jade converts one guaranteed Rare stack to Legendary 25% of the time.
 * 2. Apply pity in this order: Legendary pity, Epic pity, new-card protection (A6.5). Each upgrades
 *    the lowest-rarity non-guaranteed stack (ties: the last stack). A stack a pity rule upgraded is
 *    then kept (treated as guaranteed), so a later rule never undoes an earlier one.
 * 3. Copies per stack come from the tier table by the stack's rarity.
 * 4. Pick distinct cards per stack from the drop pool of that rarity: unowned cards weigh ×3; no
 *    duplicate Legendary until every Legendary in the pool is owned; a stack set by new-card
 *    protection picks only unowned cards. A stack whose rarity has no card left to pick (a small
 *    pool, such as one age) falls back to the next lower rarity.
 * 5. Each stack rolls a foil.
 * 6. Max-level copies convert to Dust when the capsule is revealed (`open.ts`), not here.
 *
 * "Owned" while rolling means owned or already inside another unopened capsule, so an unopened
 * capsule's NEW card is not handed out twice; nor, where the rarity has another card, as a plain
 * copy that could be opened first and take the NEW away. Stacks are returned rarest last (A10 step 5).
 */
import type { CapsuleStack, CardId, Rarity } from '@/contracts';
import type { Content } from '@/content';
import { chanceBp, pickWeighted, type Sfc32State } from '@/core';
import { RARITY_INDEX, RARITY_ORDER, type Pool } from '../tables';
import { rollFoil } from './foil';
import { legendaryPityBp, type PityDraw } from './pity';

/** What a roll needs to know about the capsule. */
export interface RollSpec {
  stacks: number;
  guaranteed: readonly Rarity[];
  copies: Readonly<Record<Rarity, number>>;
  /** Jade: chance that one guaranteed Rare stack becomes Legendary. */
  rareToLegendaryBp: number;
  /** False in arenas without random Legendaries (A6.4 step 1.2). */
  randomLegendaries: boolean;
}

export interface RollContext {
  t: Content;
  rng: Sfc32State;
  pool: Pool;
  /** Owned cards plus cards inside unopened capsules. */
  owned: ReadonlySet<CardId>;
  /** Pity n values, or null for capsules that skip pity (none in v1 except scripted ones). */
  pity: PityDraw | null;
  /**
   * Cards another unopened capsule reveals as NEW. A stack picks one only when its rarity has no
   * other card left, so opening a pile in any order never moves a NEW card (and the new-card
   * protection it stands for) out of the capsule that promised it.
   */
  reserved?: ReadonlySet<CardId>;
}

interface Slot {
  rarity: Rarity;
  /** Guaranteed or set by pity: pity never touches it again. */
  locked: boolean;
  /** Set by new-card protection: picks only unowned cards. */
  newOnly: boolean;
}

/** One random stack rarity (A6.4 step 1.2). */
export function rollStackRarity(t: Content, rng: Sfc32State, randomLegendaries: boolean): Rarity {
  const bp = t.capsules.stackRollBp;
  const weights = RARITY_ORDER.map((r) => bp[r]);
  if (!randomLegendaries) {
    weights[0] = (weights[0] ?? 0) + (weights[3] ?? 0);
    weights[3] = 0;
  }
  return RARITY_ORDER[pickWeighted(rng, weights)] ?? 'common';
}

/** The lowest-rarity unlocked slot, ties to the last one; -1 when every slot is locked. */
function lowestUnlocked(slots: readonly Slot[]): number {
  let best = -1;
  for (let i = 0; i < slots.length; i += 1) {
    const s = slots[i] as Slot;
    if (s.locked) continue;
    if (best < 0 || RARITY_INDEX[s.rarity] <= RARITY_INDEX[(slots[best] as Slot).rarity]) best = i;
  }
  return best;
}

/** Upgrades the lowest unlocked slot to `to` (never downgrades) and locks it. */
function upgradeLowest(slots: Slot[], to: Rarity): void {
  const i = lowestUnlocked(slots);
  const s = slots[i];
  if (!s || RARITY_INDEX[s.rarity] >= RARITY_INDEX[to]) return;
  s.rarity = to;
  s.locked = true;
}

function unownedIn(cards: readonly CardId[], owned: ReadonlySet<CardId>): boolean {
  return cards.some((c) => !owned.has(c));
}

/** Steps 1 and 2: the stack rarities with pity applied. */
export function planSlots(spec: RollSpec, ctx: RollContext): Slot[] {
  const { t, rng, pool, owned, pity } = ctx;
  const slots: Slot[] = spec.guaranteed.map((rarity) => ({ rarity, locked: true, newOnly: false }));
  while (slots.length < spec.stacks) slots.push({ rarity: rollStackRarity(t, rng, spec.randomLegendaries), locked: false, newOnly: false });
  if (spec.rareToLegendaryBp > 0 && chanceBp(rng, spec.rareToLegendaryBp)) {
    const rare = slots.find((s) => s.locked && s.rarity === 'rare');
    if (rare) rare.rarity = 'legendary';
  }
  if (!pity) return slots;

  const p = t.capsules.pity;
  if (!slots.some((s) => s.rarity === 'legendary') && chanceBp(rng, legendaryPityBp(t.capsules, pity.legendaryN))) {
    upgradeLowest(slots, 'legendary');
  }
  if (!slots.some((s) => s.rarity === 'epic') && pity.epicN >= p.epicEvery) upgradeLowest(slots, 'epic');
  if (pity.newCardN >= p.newCardEvery && unownedIn(pool.cards, owned)) {
    const withUnowned = (r: Rarity): boolean => unownedIn(pool.byRarity[r], owned);
    // A stack whose rarity still has unowned cards picks one of them (lowest rarity, ties last).
    let pickIdx = -1;
    slots.forEach((s, i) => {
      if (!withUnowned(s.rarity)) return;
      if (pickIdx < 0 || RARITY_INDEX[s.rarity] <= RARITY_INDEX[(slots[pickIdx] as Slot).rarity]) pickIdx = i;
    });
    if (pickIdx >= 0) {
      (slots[pickIdx] as Slot).newOnly = true;
    } else {
      // Otherwise the lowest non-guaranteed stack becomes the lowest rarity that has unowned cards.
      const target = RARITY_ORDER.find(withUnowned);
      const i = lowestUnlocked(slots);
      const s = slots[i];
      if (target && s) {
        s.rarity = target;
        s.locked = true;
        s.newOnly = true;
      }
    }
  }
  return slots;
}

/**
 * Step 4 for one stack: a card of `rarity` (or lower, when nothing is left) not in `used`.
 * Returns null only when the pool has no card left at all.
 */
export function pickCard(
  ctx: Pick<RollContext, 't' | 'rng' | 'pool' | 'owned' | 'reserved'>,
  rarity: Rarity,
  newOnly: boolean,
  used: ReadonlySet<CardId>,
): { card: CardId; rarity: Rarity } | null {
  const { t, rng, pool, owned, reserved } = ctx;
  const weight = t.capsules.unownedWeight;
  for (const onlyNew of newOnly ? [true, false] : [false]) {
    for (let r = RARITY_INDEX[rarity]; r >= 0; r -= 1) {
      const rr = RARITY_ORDER[r] as Rarity;
      let cands = pool.byRarity[rr].filter((c) => !used.has(c));
      // No duplicate Legendary until every Legendary in the pool is owned (a second Legendary stack
      // with no unowned one left falls back to Epic).
      if (onlyNew || (rr === 'legendary' && unownedIn(pool.byRarity.legendary, owned))) cands = cands.filter((c) => !owned.has(c));
      if (cands.length === 0) continue;
      // Leave another capsule's NEW card alone while this rarity has any other card (the rarity odds
      // never change, only which card of the rarity).
      const free = reserved && reserved.size > 0 ? cands.filter((c) => !reserved.has(c)) : cands;
      if (free.length > 0) cands = free;
      const i = pickWeighted(rng, cands.map((c) => (owned.has(c) ? 1 : weight)));
      const card = cands[i];
      if (card !== undefined) return { card, rarity: rr };
    }
  }
  return null;
}

/** Sorts stacks rarest last, keeping the order within a rarity (A10 step 5). */
export function sortStacks(stacks: CapsuleStack[]): CapsuleStack[] {
  return stacks
    .map((s, i) => ({ s, i }))
    .sort((a, b) => RARITY_INDEX[a.s.rarity] - RARITY_INDEX[b.s.rarity] || a.i - b.i)
    .map((x) => x.s);
}

/** Rolls the stacks of one capsule (steps 1-5). */
export function rollStacks(spec: RollSpec, ctx: RollContext): CapsuleStack[] {
  const slots = planSlots(spec, ctx);
  const order = slots.map((_, i) => i).sort((a, b) => Number((slots[b] as Slot).newOnly) - Number((slots[a] as Slot).newOnly) || a - b);
  const used = new Set<CardId>();
  const picked: ({ card: CardId; rarity: Rarity } | null)[] = slots.map(() => null);
  for (const i of order) {
    const s = slots[i] as Slot;
    const got = pickCard(ctx, s.rarity, s.newOnly, used);
    if (got) used.add(got.card);
    picked[i] = got;
  }
  const stacks: CapsuleStack[] = [];
  for (const got of picked) {
    if (!got) continue;
    stacks.push({
      card: got.card,
      rarity: got.rarity,
      copies: spec.copies[got.rarity],
      isNew: !ctx.owned.has(got.card),
      foil: rollFoil(ctx.rng, ctx.t.rarities),
      dust: 0,
    });
  }
  return sortStacks(stacks);
}
