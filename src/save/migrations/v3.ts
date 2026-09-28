/**
 * Save version 3: the cosmetic collections (DESIGN A18.9.4, owner direction 2026-09-28).
 *
 * - `cosmetics.equipped` joins `cosmetics.owned`: the battle emote wheel (the six starter emotes),
 *   the quote wheel (the four starter quotes), the starter base flag, no national flag (it is only
 *   ever the player's own pick, never inferred from location), no base skins and the two starter
 *   decorations. Starter items are owned by everyone, so nothing is added to `owned`.
 * - `rng.cosmetic`: the cosmetic drop stream, derived from the capsule stream's state so it is
 *   deterministic per save, and kept apart so a cosmetic roll never changes a capsule's cards.
 * - Pending capsules and crates keep their contents; they simply hold no collection item.
 *
 * The starter keys are frozen here on purpose (the save package may not read the content, B2).
 * Never edit this step; a later change needs a new version.
 */
import type { SaveVersion } from './types';

export const V3_EQUIPPED = {
  emotes: ['laugh', 'salute', 'cry', 'angry', 'thumbsUp', 'gg'],
  quotes: ['quote.glhf', 'quote.well_played', 'quote.nice_move', 'quote.so_close'],
  baseFlag: 'baseFlag.ember',
  nationalFlag: null,
  baseSkins: {},
  decorations: ['decoration.fire_bowl', null, 'decoration.fern'],
} as const;

/** Mixes the capsule state into an independent, non-zero cosmetic seed (sfc32 state). */
export function cosmeticSeedFrom(capsule: readonly number[]): [number, number, number, number] {
  const salt = [0x9e3779b9, 0x85ebca6b, 0xc2b2ae35, 0x27d4eb2f];
  const out = salt.map((k, i) => (((capsule[i] ?? 0) ^ k) >>> 0) || k) as [number, number, number, number];
  return out;
}

type Doc = Record<string, unknown> & {
  v: number;
  cosmetics?: { owned?: unknown; equipped?: unknown };
  rng?: { capsule?: unknown; cosmetic?: unknown };
};

export const v3: SaveVersion = {
  v: 3,
  summary: 'Cosmetic collections: cosmetics.equipped and the rng.cosmetic stream (A18.9.4)',
  up: (input) => {
    const doc = input as Doc;
    const owned = Array.isArray(doc.cosmetics?.owned) ? doc.cosmetics.owned : [];
    const equipped = JSON.parse(JSON.stringify(V3_EQUIPPED)) as Record<string, unknown>;
    const capsule = Array.isArray(doc.rng?.capsule) ? (doc.rng.capsule as number[]) : [1, 2, 3, 4];
    return {
      ...doc,
      cosmetics: { ...(doc.cosmetics ?? {}), owned, equipped },
      rng: { ...(doc.rng ?? {}), capsule, cosmetic: cosmeticSeedFrom(capsule) },
      v: 3,
    };
  },
};
