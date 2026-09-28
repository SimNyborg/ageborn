/**
 * Opening a Time Capsule (DESIGN A6.4 steps 5-6, A6.5, A10): reveals the pre-rolled contents and
 * applies them. Nothing is re-rolled; what changes at reveal time are the facts that depend on the
 * collection *now*:
 *
 * - `isNew`: the card is not owned when revealed (a crafted card is no longer new).
 * - `dust`: copies of a card at max level convert to Dust (A6.4 step 6), per stack.
 * - `contents.dust`: the capsule's bonus Dust (Jade +100) plus a duplicate bonus skin's Dust.
 *
 * Copies always add to the card's upgrade copies, including a new card's first stack (a new card
 * starts at L1 with the stack's copies). Foils unlock when they beat the owned one. Counted capsules
 * advance the pity counters, which the reveal shows before and after (A6.5). The Daily Capsule
 * unlocks once the second capsule has been opened (A6.3).
 */
import type { CapsuleReveal, CapsuleStack, CardId, SaveDoc } from '@/contracts';
import type { Content } from '@/content';
import { META_FLAGS } from '../rules';
import { arenaOf, isOwned, poolOf, TIER_INDEX } from '../tables';
import { unlockTitles } from '../titles';
import { betterFoil } from './foil';
import { advancePity } from './pity';

/** Number of strikes on the capsule (A10 step 3). */
export const STRIKES = 4;

/** The back-loaded strike pattern: 4 − k misses, then k climbs (a climb is never followed by a miss). */
export function strikePattern(climbs: number): boolean[] {
  const k = Math.max(0, Math.min(STRIKES, climbs));
  return Array.from({ length: STRIKES }, (_, i) => i >= STRIKES - k);
}

export function openCapsuleWith(s: SaveDoc, id: string, t: Content): { save: SaveDoc; reveal: CapsuleReveal } {
  const cap = s.capsules.pending.find((p) => p.id === id);
  if (!cap) throw new Error(`meta: no pending capsule "${id}"`);
  const maxLevel = t.economy.maxLevel;
  const pool = poolOf(t, arenaOf(s, t).dropAges);
  const unownedInPool = pool.cards.some((c) => !isOwned(s, c));

  const collection = { ...s.collection };
  const firstLegendaryReveal: CardId[] = [];
  let stackDust = 0;
  const stacks = cap.contents.stacks.map((st): CapsuleStack => {
    const had = collection[st.card];
    const isNew = !had || had.level < 1;
    const entry = isNew ? { level: 1, copies: 0, isNew: true, foil: 'none' as const } : { ...had };
    if (isNew && st.rarity === 'legendary') firstLegendaryReveal.push(st.card);
    let dust = 0;
    if (entry.level >= maxLevel) dust = st.copies * t.rarities.cards[st.rarity].dustPerExtraCopy;
    else entry.copies += st.copies;
    entry.foil = betterFoil(entry.foil, st.foil, t.rarities);
    collection[st.card] = entry;
    stackDust += dust;
    return { ...st, isNew, dust };
  });

  let skins = s.skins;
  let skinDust = 0;
  const skin = cap.contents.skin;
  if (skin) {
    const def = t.skins[skin];
    if (s.skins.owned.includes(skin)) skinDust = def ? t.rarities.skins[def.rarity].duplicateDust : 0;
    else skins = { ...s.skins, owned: [...s.skins.owned, skin] };
  }

  const rolledDust = cap.contents.dust;
  const shown = { ...cap, contents: { ...cap.contents, stacks, dust: rolledDust + skinDust } };
  const counts = t.capsules.kinds[cap.kind]?.countsForPity !== false;
  const pityBefore = s.pity;
  const pityAfter = counts
    ? advancePity(s.pity, {
        hasEpic: stacks.some((x) => x.rarity === 'epic'),
        hasLegendary: stacks.some((x) => x.rarity === 'legendary'),
        gotNew: stacks.some((x) => x.isNew),
        unownedInPool,
      })
    : s.pity;

  let capsules = { ...s.capsules, pending: s.capsules.pending.filter((p) => p.id !== id) };
  let flags = s.flags;
  if (pityAfter.opened >= t.capsules.daily.firstAfterCapsule && !s.flags[META_FLAGS.dailyUnlocked]) {
    // A6.3: the first Daily Capsule is available right after capsule 2; `tickTimers` starts the day timer.
    capsules = { ...capsules, dailyBank: Math.max(1, capsules.dailyBank), dailyNextAt: null };
    flags = { ...flags, [META_FLAGS.dailyUnlocked]: true };
  }

  const opened: SaveDoc = {
    ...s,
    collection,
    skins,
    capsules,
    flags,
    pity: pityAfter,
    currencies: {
      amber: s.currencies.amber + cap.contents.amber,
      dust: s.currencies.dust + rolledDust + skinDust + stackDust,
    },
  };
  const { save } = unlockTitles(opened, t);
  const climbs = Math.max(0, TIER_INDEX[cap.tier] - TIER_INDEX[cap.startTier]);
  return {
    save,
    reveal: { capsule: shown, climbs, strikeClimbs: strikePattern(climbs), pityBefore, pityAfter, firstLegendaryReveal },
  };
}
