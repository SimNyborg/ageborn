/**
 * Reveal cards and the summary model (DESIGN A10 steps 5, 7, 8; "Open all").
 *
 * Pure data shaping: stacks become `RevealCard`s in reveal order (rarest last), several capsules
 * merge into one summary, and pity counters are turned into "within N" lines (A6.5).
 */
import type {
  CapsuleReveal,
  CapsuleTier,
  CardId,
  Foil,
  Rarity,
  SaveDoc,
  SkinId,
  WardrobeReveal,
} from '@/contracts';
import type { CapsuleCatalog, CardProgress, PityCounters, PityRules, ProgressLookup } from './types';

export const RARITY_RANK: Readonly<Record<Rarity, number>> = { common: 0, rare: 1, epic: 2, legendary: 3 };
const FOIL_RANK: Readonly<Record<Foil, number>> = { none: 0, bronze: 1, silver: 2, holo: 3 };

/** One card (or skin) slot in the fan and the summary. */
export interface RevealCard {
  /** Unique within a show: `c:<card>` or `s:<skin>`. */
  key: string;
  /** Position in the fan, in reveal order. */
  slot: number;
  kind: 'card' | 'skin';
  /** For skins: the skinned target (a card id or `base.<age>`), used for portraits and walkouts. */
  card: CardId;
  skin: SkinId | null;
  /** Skins use their skin rarity (a subset of card rarities). */
  rarity: Rarity;
  copies: number;
  foil: Foil;
  isNew: boolean;
  /** Dust this stack converted into (max level cards, duplicate skins). */
  dust: number;
  /** The first time this Legendary is revealed: the full walkout plays and cannot be skipped (A10 step 6). */
  firstLegendary: boolean;
  /** Indexes of the capsules this card came from. */
  sources: number[];
}

export interface SummaryItem extends RevealCard {
  progress: CardProgress | null;
  /** The copies bar is full after this reveal (A10 step 7). */
  upgradeReady: boolean;
}

export interface SummaryModel {
  mode: 'single' | 'openAll' | 'wardrobe';
  /** Display order: rarest first, new before owned. */
  items: SummaryItem[];
  amber: number;
  /** Capsule-level Dust (Jade bonus) plus every stack's converted Dust. */
  dust: number;
  pityBefore: PityCounters | null;
  pityAfter: PityCounters | null;
  /** New cards, for "Equip now" (A10 step 8). */
  newCards: CardId[];
  /** New skins (crate winners that were not duplicates). */
  newSkins: SkinId[];
  /** "Upgrade" jumps here: the rarest ready card, then the lowest level, then reveal order. */
  bestUpgrade: CardId | null;
  tiers: CapsuleTier[];
  capsuleCount: number;
}

function cmpReveal(a: RevealCard, b: RevealCard): number {
  const r = RARITY_RANK[a.rarity] - RARITY_RANK[b.rarity];
  if (r !== 0) return r;
  if (a.kind !== b.kind) return a.kind === 'card' ? -1 : 1;
  return (a.sources[0] ?? 0) - (b.sources[0] ?? 0);
}

/**
 * All stacks (and bonus skins) of the given capsules as reveal cards, rarest last (A10 step 5).
 * Several capsules merge by card: copies and Dust add up, the best foil wins, NEW if any stack was.
 */
export function revealCards(reveals: readonly CapsuleReveal[], catalog: CapsuleCatalog): RevealCard[] {
  const byKey = new Map<string, RevealCard>();
  const order: RevealCard[] = [];
  const firstLegendary = new Set<CardId>(reveals.flatMap((r) => r.firstLegendaryReveal));
  reveals.forEach((rev, ci) => {
    for (const st of rev.capsule.contents.stacks) {
      const key = `c:${st.card}`;
      const had = byKey.get(key);
      if (had) {
        had.copies += st.copies;
        had.dust += st.dust;
        had.isNew ||= st.isNew;
        if (FOIL_RANK[st.foil] > FOIL_RANK[had.foil]) had.foil = st.foil;
        if (!had.sources.includes(ci)) had.sources.push(ci);
        continue;
      }
      const card: RevealCard = {
        key,
        slot: 0,
        kind: 'card',
        card: st.card,
        skin: null,
        rarity: st.rarity,
        copies: st.copies,
        foil: st.foil,
        isNew: st.isNew,
        dust: st.dust,
        firstLegendary: st.rarity === 'legendary' && firstLegendary.has(st.card),
        sources: [ci],
      };
      byKey.set(key, card);
      order.push(card);
    }
    const skin = rev.capsule.contents.skin;
    if (skin !== null) {
      const key = `s:${skin}`;
      const had = byKey.get(key);
      if (had) {
        had.copies += 1;
        if (!had.sources.includes(ci)) had.sources.push(ci);
      } else {
        const info = catalog.skin(skin);
        const card: RevealCard = {
          key,
          slot: 0,
          kind: 'skin',
          card: info.target,
          skin,
          rarity: info.rarity,
          copies: 1,
          foil: 'none',
          // A capsule does not say whether its bonus skin was a duplicate, so it is never stamped NEW.
          isNew: false,
          dust: 0,
          firstLegendary: false,
          sources: [ci],
        };
        byKey.set(key, card);
        order.push(card);
      }
    }
  });
  const sorted = order.slice().sort(cmpReveal);
  sorted.forEach((c, i) => (c.slot = i));
  return sorted;
}

/** The crate's single skin as a reveal card. */
export function crateCard(reveal: WardrobeReveal, catalog: CapsuleCatalog): RevealCard {
  const info = catalog.skin(reveal.crate.skin);
  return {
    key: `s:${reveal.crate.skin}`,
    slot: 0,
    kind: 'skin',
    card: info.target,
    skin: reveal.crate.skin,
    rarity: reveal.crate.rarity,
    copies: 1,
    foil: 'none',
    isNew: reveal.crate.duplicateDust === 0,
    dust: reveal.crate.duplicateDust,
    firstLegendary: false,
    sources: [0],
  };
}

export function isUpgradeReady(p: CardProgress | null): boolean {
  return p !== null && p.need !== null && p.after >= p.need;
}

function summaryOrder(a: SummaryItem, b: SummaryItem): number {
  const r = RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity];
  if (r !== 0) return r;
  if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
  return a.slot - b.slot;
}

export function pickBestUpgrade(items: readonly SummaryItem[]): CardId | null {
  let best: SummaryItem | null = null;
  for (const it of items) {
    if (it.kind !== 'card' || !it.upgradeReady || !it.progress) continue;
    if (
      !best ||
      RARITY_RANK[it.rarity] > RARITY_RANK[best.rarity] ||
      (it.rarity === best.rarity && it.progress.level < (best.progress?.level ?? 0)) ||
      (it.rarity === best.rarity && it.progress.level === best.progress?.level && it.slot < best.slot)
    ) {
      best = it;
    }
  }
  return best?.card ?? null;
}

function toItems(cards: readonly RevealCard[], progress: ProgressLookup | undefined): SummaryItem[] {
  return cards.map((c) => {
    const p = c.kind === 'card' && progress ? progress(c.card, c.rarity) : null;
    return { ...c, sources: c.sources.slice(), progress: p, upgradeReady: isUpgradeReady(p) };
  });
}

export function buildSummary(
  reveals: readonly CapsuleReveal[],
  cards: readonly RevealCard[],
  progress?: ProgressLookup,
): SummaryModel {
  const items = toItems(cards, progress).sort(summaryOrder);
  const first = reveals[0];
  const last = reveals[reveals.length - 1];
  return {
    mode: reveals.length > 1 ? 'openAll' : 'single',
    items,
    amber: reveals.reduce((s, r) => s + r.capsule.contents.amber, 0),
    dust: reveals.reduce((s, r) => s + r.capsule.contents.dust + r.capsule.contents.stacks.reduce((a, st) => a + st.dust, 0), 0),
    pityBefore: first?.pityBefore ?? null,
    pityAfter: last?.pityAfter ?? null,
    newCards: items.filter((i) => i.kind === 'card' && i.isNew).map((i) => i.card),
    newSkins: [],
    bestUpgrade: pickBestUpgrade(items),
    tiers: reveals.map((r) => r.capsule.tier),
    capsuleCount: reveals.length,
  };
}

export function buildWardrobeSummary(card: RevealCard): SummaryModel {
  const items = toItems([card], undefined);
  return {
    mode: 'wardrobe',
    items,
    amber: 0,
    dust: card.dust,
    pityBefore: null,
    pityAfter: null,
    newCards: [],
    newSkins: card.isNew && card.skin !== null ? [card.skin] : [],
    bestUpgrade: null,
    tiers: [],
    capsuleCount: 1,
  };
}

/**
 * Copies bars from the collection before and after opening (both come from the save around
 * `meta.openCapsule`), so the bar is exact whatever rule the meta uses for a new card's first copy.
 * `upgradeCopies[rarity][level - 1]` is the copies needed to reach `level + 1` (A6.6).
 */
export function progressFromCollections(
  before: SaveDoc['collection'],
  after: SaveDoc['collection'],
  upgradeCopies: Readonly<Record<Rarity, readonly number[]>>,
  maxLevel: number,
): ProgressLookup {
  return (card, rarity) => {
    const a = after[card];
    if (!a) return null;
    const b = before[card];
    const need = a.level >= maxLevel ? null : (upgradeCopies[rarity][a.level - 1] ?? null);
    return { level: a.level, before: b?.copies ?? 0, after: a.copies, need };
  };
}

export interface PityLine {
  /** i18n key in `capsule.en.json`. */
  key: string;
  n: number;
}

/** "Within N capsules" lines (A6.5). The counters count opened capsules since the last hit. */
export function pityLines(p: PityCounters, rules: PityRules): PityLine[] {
  const within = (every: number, since: number): number => Math.max(1, every - since);
  return [
    { key: 'capsule.pity.epic', n: within(rules.epicEvery, p.sinceEpic) },
    { key: 'capsule.pity.legendary', n: within(rules.legendaryGuaranteeAt, p.sinceLegendary) },
    { key: 'capsule.pity.newCard', n: within(rules.newCardEvery, p.sinceNewCard) },
  ];
}

/** Wardrobe pity lines (A6.5: Epic or better every 5 crates, Legendary every 25). */
export function wardrobePityLines(p: PityCounters, rules: PityRules): PityLine[] {
  const within = (every: number, since: number): number => Math.max(1, every - since);
  return [
    { key: 'capsule.pity.wardrobeEpic', n: within(rules.wardrobeEpicEvery, p.wardrobeSinceEpic) },
    { key: 'capsule.pity.wardrobeLegendary', n: within(rules.wardrobeLegendaryEvery, p.wardrobeSinceLegendary) },
  ];
}
