/**
 * The arena from which each content-wave card drops (X0, CONTENT_PLAN 6): a meta table outside the sim
 * hash. A card from a later wave joins Time Capsules, Age Capsules and Dust crafting only once both its
 * age drops in the player's arena (A6.3) and its rarity is unlocked: new Commons from Arena 2, Rares from
 * Arena 3, Epics from Arena 4, Legendaries from Arena 5. Cards not listed (the original 88) keep their
 * arenas (from Arena 1 wherever their age drops). Bots use only cards a player at that point could own.
 * Data only; a test checks that every card of an expanded age outside the starter kit and the original
 * roster is listed.
 */
import type { CardId, Rarity } from '@/contracts/ids';

/** The arena (1-based) that first drops a new card of each rarity. */
export const NEW_CARD_ARENA: Readonly<Record<Rarity, number>> = { common: 2, rare: 3, epic: 4, legendary: 5 };

const C = NEW_CARD_ARENA.common;
const R = NEW_CARD_ARENA.rare;
const E = NEW_CARD_ARENA.epic;
const L = NEW_CARD_ARENA.legendary;

export const cardArena: Readonly<Record<CardId, number>> = {
  // W1 Stone (2026-10-02)
  hunting_wolves: C,
  hide_shield: C,
  torch_runner: C,
  bolas_thrower: C,
  woolly_rhino: C,
  quill_porcupine: C,
  atlatl_thrower: R,
  boulder_hurler: R,
  herbalist: R,
  pelt_rager: R,
  sapling_sling: R,
  beast_caller: E,
  cave_bear: E,
  rockfall_shaman: E,
  elk_chieftain: L,
};
