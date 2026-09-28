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
import { climbCount, strikePattern } from '../tiers';
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
    strikeClimbs: strikePattern(k),
    pityBefore: PITY,
    pityAfter: { ...PITY, sinceEpic: PITY.sinceEpic + 1, sinceLegendary: PITY.sinceLegendary + 1, opened: PITY.opened + 1 },
    firstLegendaryReveal: spec.firstLegendary ?? [],
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

export function crate(skin: SkinId, rarity: SkinRarity, tiles: SkinId[], o: Partial<PendingCrate> = {}, stopOffsetBp = 5000): WardrobeReveal {
  return {
    crate: { id: 'crate-1', source: 'codex', skin, rarity, duplicateDust: 0, createdAt: 0, ...o },
    reelTiles: tiles,
    winnerIndex: 45,
    stopOffsetBp,
  };
}

/** 50 honest tiles: rare fillers, the winner at 45. */
export function honestTiles(winner: SkinId): SkinId[] {
  const fill = ['pumpkin_head', 'tin_can', 'toy_soldier', 'woolly_tuskback', 'pumpkin_head'];
  const tiles = Array.from({ length: 50 }, (_, i) => fill[i % fill.length] ?? 'pumpkin_head');
  tiles[45] = winner;
  tiles[46] = 'tin_can';
  return tiles;
}
