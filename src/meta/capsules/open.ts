/**
 * Opening a Time Capsule (DESIGN A6.4 steps 5-6, A6.5, A10): reveals the pre-rolled contents and
 * applies them. Nothing is re-rolled; what changes at reveal time are the facts that depend on the
 * collection *now*:
 *
 * - `isNew`: the card is not owned when revealed (a crafted card is no longer new).
 * - `dust`: copies of a card at max level convert to Dust (A6.4 step 6), per stack.
 * - `contents.dust`: the capsule's bonus Dust (Jade and Gold +100, Platinum +200, Aeon +500, plus 500
 *   for an Aeon after its collection set is complete) plus a duplicate skin's Dust.
 *
 * Strikes (A10): the 4 main strikes climb up to `capsules.summitAbove` (Gold), back-loaded; each tier
 * above it is one summit strike that always climbs (Platinum 1, Aeon 2). Opening the first Gold,
 * Platinum or Aeon (a tier that guarantees a Legendary) sets `capsule.first.<tier>` and reports
 * `firstOfTier` for the first-of-tier moment (A10 step 4b).
 *
 * Copies always add to the card's upgrade copies, including a new card's first stack (a new card
 * starts at L1 with the stack's copies). Foils unlock when they beat the owned one. Counted capsules
 * advance the pity counters, which the reveal shows before and after (A6.5). Opening the second
 * counted capsule unlocks the Supply allowance and grants the first Supply Capsule at once, with no
 * matches needed (A15.4); it is rolled after this capsule is applied, so it sees the new cards.
 */
import type { CapsuleReveal, CapsuleStack, CapsuleTier, CardId, SaveDoc } from '@/contracts';
import type { Content } from '@/content';
import { META_FLAGS } from '../rules';
import { arenaOf, guaranteedLegendaries, lastKnownTime, poolOf, tierIndex } from '../tables';
import { cardsForRoll, grantCapsuleAt } from './grant';
import { duplicateDustOf, firstOfTierFlag, grantOpened } from '../cosmetics';
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

/**
 * The strikes of a capsule climbing from `start` to `tier` (A10): `main` climbs of the 4 main strikes
 * (up to `summitAbove`, clamped to 0..4) and `summit` strikes above it (each always climbs). A fixed
 * capsule (start = tier) has none.
 */
export function strikeCounts(t: Pick<Content, 'capsules'>, start: CapsuleTier, tier: CapsuleTier): { main: number; summit: number } {
  const s = tierIndex(t, start);
  const f = tierIndex(t, tier);
  const top = tierIndex(t, t.capsules.summitAbove);
  const main = Math.max(0, Math.min(STRIKES, Math.min(f, top) - s));
  const summit = Math.max(0, f - Math.max(top, s));
  return { main, summit };
}

export function openCapsuleWith(s: SaveDoc, id: string, t: Content): { save: SaveDoc; reveal: CapsuleReveal } {
  const cap = s.capsules.pending.find((p) => p.id === id);
  if (!cap) throw new Error(`meta: no pending capsule "${id}"`);
  const maxLevel = t.economy.maxLevel;
  const pool = poolOf(t, arenaOf(s, t).dropAges);
  // As in the roll: a card already inside an unopened capsule is on its way, so it needs no
  // protection. Otherwise opening a pile newest-first would count misses past the A6.5 limit while
  // the new cards wait in the older capsules.
  const promised = cardsForRoll(s);
  const unownedInPool = pool.cards.some((c) => !promised.has(c));

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
  // A18.9.4: a duplicate collection item shows its Dust with the rest (granted below)
  const cosmeticDust = duplicateDustOf(s, t, cap.contents.cosmetic);
  const shown = { ...cap, contents: { ...cap.contents, stacks, dust: rolledDust + skinDust + cosmeticDust } };
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
  // A10 step 4b: the first capsule of a Legendary tier (Gold, Platinum, Aeon) the save opens
  const firstFlag = firstOfTierFlag(cap.tier);
  const firstOfTier = guaranteedLegendaries(t, cap.tier) > 0 && flags[firstFlag] !== true;
  if (firstOfTier) flags = { ...flags, [firstFlag]: true };
  const unlockSupply = pityAfter.opened >= t.capsules.daily.firstAfterCapsule && !s.flags[META_FLAGS.dailyUnlocked];
  if (unlockSupply) {
    // A15.4: the allowance starts empty; `tickTimers` starts the 04:00 timer that adds to it.
    capsules = { ...capsules, dailyNextAt: null };
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
  let { save } = unlockTitles(opened, t);
  // A18.9.4: the capsule's collection item (a duplicate pays its Dust)
  save = grantOpened(save, t, cap.contents.cosmetic).save;
  if (unlockSupply) {
    // The first Supply Capsule, granted right after capsule 2 (A15.4). It never uses an allowance.
    const bank = save.capsules.dailyBank;
    save = grantCapsuleAt(save, 'daily', t, Math.max(cap.createdAt, lastKnownTime(save))).save;
    save = { ...save, capsules: { ...save.capsules, dailyBank: bank } };
  }
  const strikes = strikeCounts(t, cap.startTier, cap.tier);
  return {
    save,
    reveal: {
      capsule: shown,
      climbs: strikes.main + strikes.summit,
      strikeClimbs: strikePattern(strikes.main),
      pityBefore,
      pityAfter,
      firstLegendaryReveal,
      firstOfTier,
    },
  };
}
