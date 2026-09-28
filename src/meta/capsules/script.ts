/**
 * The onboarding capsule script (DESIGN A6.5, A8). The first five counted capsules of a save follow
 * the script instead of the bag, use no charges and get no pity upgrades (the script is the
 * guarantee), whatever kind of capsule they are:
 *
 * | Capsule | Tier | Guaranteed contents |
 * |---|---|---|
 * | 1 | Bronze | Spear Hunter NEW (plus a Bonker stack for the A8 forced upgrade) |
 * | 2 | Silver | Pikeman NEW, Grenadier NEW |
 * | 3 | Bronze | Log Roller NEW |
 * | 4 | Silver | First Epic (random, unowned, from the pool) |
 * | 5 | Aeon | Mammoth Matriarch, full walkout |
 *
 * The scripted stacks replace the tier's guarantees; the rest of the tier's stacks are Common stacks
 * of owned cards, taken first from the loadout the player just fought with (the active plan's first
 * age), so every NEW card, the first Epic and the first Legendary arrive exactly as scripted. The
 * tier's Amber, bonus Dust and Aeon skin chance still apply.
 */
import type { AgeId, CapsuleStack, CardId, SaveDoc } from '@/contracts';
import type { Content, ScriptedCapsuleDef } from '@/content';
import type { Sfc32State } from '@/core';
import { SCRIPT_EXTRA_CARDS } from '../rules';
import { cardRarity, isOwned, type Pool } from '../tables';
import { rollFoil } from './foil';
import { pickCard, sortStacks } from './roll';

/** The script step a newly granted counted capsule would take, or null when the script is done. */
export function scriptFor(s: Pick<SaveDoc, 'scriptStep'>, t: Content): ScriptedCapsuleDef | null {
  return t.capsules.script[s.scriptStep] ?? null;
}

/** Common cards the filler prefers: the active plan's loadout for `age`, units then turrets. */
function preferredFiller(s: SaveDoc, age: AgeId | undefined): CardId[] {
  const plan = s.warPlans[s.activePlan] ?? s.warPlans[0];
  const l = age && plan ? plan.loadouts[age] : undefined;
  if (!l) return [];
  return [...l.units, ...l.turrets].filter((c): c is CardId => c !== null);
}

export interface ScriptContext {
  t: Content;
  rng: Sfc32State;
  pool: Pool;
  owned: ReadonlySet<CardId>;
  save: SaveDoc;
  /** The age whose loadout the filler prefers (the arena's first drop age: Stone). */
  fillerAge: AgeId | undefined;
}

/** The stacks of a scripted capsule. */
export function rollScripted(def: ScriptedCapsuleDef, ctx: ScriptContext): CapsuleStack[] {
  const { t, rng, pool, owned, save, fillerAge } = ctx;
  const tier = t.capsules.tiers[def.tier];
  const used = new Set<CardId>();
  const cards: CardId[] = [];
  const add = (card: CardId): void => {
    if (used.has(card)) return;
    used.add(card);
    cards.push(card);
  };
  for (const card of def.cards) add(card);
  if (def.randomUnownedEpic) {
    const got = pickCard(ctx, 'epic', true, used);
    if (got) add(got.card);
  }
  for (const card of SCRIPT_EXTRA_CARDS[def.capsule] ?? []) add(card);
  const commons = pool.byRarity.common;
  const filler = [...preferredFiller(save, fillerAge), ...commons];
  for (const card of filler) {
    if (cards.length >= tier.stacks) break;
    if (cardRarity(t, card) === 'common' && commons.includes(card) && isOwned(save, card)) add(card);
  }
  const stacks = cards.map((card): CapsuleStack => {
    const rarity = cardRarity(t, card);
    return { card, rarity, copies: tier.copies[rarity], isNew: !owned.has(card), foil: rollFoil(rng, t.rarities), dust: 0 };
  });
  return sortStacks(stacks);
}
