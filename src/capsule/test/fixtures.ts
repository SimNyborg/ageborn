/** Small reveal builders for the capsule unit tests. */
import type {
  CapsuleReveal,
  CapsuleStack,
  CapsuleTier,
  CardId,
  Foil,
  PendingCapsule,
  PendingCrate,
  Rarity,
  SaveDoc,
  SkinId,
  SkinRarity,
  WardrobeReveal,
} from '@/contracts';
import { createCatalog } from '../catalog';
import { climbCount, strikePattern, strikeSplit } from '../tiers';
import type { CapsuleCatalog } from '../types';

export const PITY: SaveDoc['pity'] = {
  sinceEpic: 3,
  sinceLegendary: 12,
  sinceNewCard: 1,
  opened: 20,
  wardrobeSinceEpic: 2,
  wardrobeSinceLegendary: 7,
};

export function stack(card: CardId, rarity: Rarity, o: Partial<CapsuleStack> = {}): CapsuleStack {
  return { card, rarity, copies: 1, isNew: false, foil: 'none' as Foil, dust: 0, ...o };
}

export interface RevealSpec {
  tier: CapsuleTier;
  startTier?: CapsuleTier;
  kind?: PendingCapsule['kind'];
  stacks: CapsuleStack[];
  amber?: number;
  dust?: number;
  skin?: SkinId | null;
  firstLegendary?: CardId[];
  id?: string;
  /** The onboarding script's capsule number (1-based, as the meta writes it). */
  scriptIndex?: number | null;
  /** The first capsule of this Legendary tier the save opens (A10 step 4b). */
  firstOfTier?: boolean;
}

export function reveal(spec: RevealSpec): CapsuleReveal {
  const startTier = spec.startTier ?? 'clay';
  const k = climbCount(startTier, spec.tier);
  return {
    capsule: {
      id: spec.id ?? `cap-${spec.tier}-${startTier}`,
      kind: spec.kind ?? 'win',
      tier: spec.tier,
      startTier,
      scriptIndex: spec.scriptIndex ?? null,
      age: null,
      contents: { stacks: spec.stacks, amber: spec.amber ?? 120, dust: spec.dust ?? 0, skin: spec.skin ?? null },
      createdAt: 0,
    },
    climbs: k,
    strikeClimbs: strikePattern(strikeSplit(startTier, spec.tier).main),
    pityBefore: PITY,
    pityAfter: { ...PITY, sinceEpic: PITY.sinceEpic + 1, sinceLegendary: PITY.sinceLegendary + 1, opened: PITY.opened + 1 },
    firstLegendaryReveal: spec.firstLegendary ?? [],
    firstOfTier: spec.firstOfTier ?? false,
  };
}

export const SKIN_RARITY: Record<SkinId, SkinRarity> = {
  pumpkin_head: 'rare',
  tin_can: 'rare',
  toy_soldier: 'rare',
  woolly_tuskback: 'epic',
  ghost_corsair: 'epic',
  frost_matriarch: 'legendary',
  crystal_spire: 'legendary',
};

export function testCatalog(): CapsuleCatalog {
  const base = createCatalog();
  return {
    ...base,
    skin(id) {
      return { ...base.skin(id), rarity: SKIN_RARITY[id] ?? 'rare', target: 'bonker' };
    },
  };
}

/** A Wardrobe Crate reveal as the meta writes it: no reel, so `reelTiles` is empty (A15.3). */
export function crate(skin: SkinId, rarity: SkinRarity, o: Partial<PendingCrate> = {}): WardrobeReveal {
  return {
    crate: { id: 'crate-1', source: 'codex', skin, rarity, duplicateDust: 0, createdAt: 0, ...o },
    reelTiles: [],
    winnerIndex: 45,
    stopOffsetBp: 0,
  };
}
