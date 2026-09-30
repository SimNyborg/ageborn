/**
 * Save version 8: the battle backdrop skins (DESIGN A18.9.4 "Backdrops", owner request 2026-09-30
 * "skins for your battle background").
 *
 * - `cosmetics.equipped.backdrop` joins the equipped look: null, so every age keeps its classic sky
 *   until the player picks a backdrop in Customize. Nothing is granted: backdrops are earned from
 *   Time Capsules, Wardrobe Crates and the Trophy Road like the other collections.
 * - A doc that already has the field (a re-run) keeps it. A missing or broken `equipped` is left to
 *   the schema (v3 creates it; this step never invents a whole look).
 *
 * Never edit this step; a later change needs a new version.
 */
import type { SaveVersion } from './types';

type Doc = Record<string, unknown> & {
  v: number;
  cosmetics?: { owned?: unknown; equipped?: Record<string, unknown> | null };
};

export const v8: SaveVersion = {
  v: 8,
  summary: 'Battle backdrop skins: cosmetics.equipped.backdrop (null = classic skies, A18.9.4)',
  up: (input) => {
    const doc = input as Doc;
    const cos = doc.cosmetics;
    const eq = cos?.equipped;
    if (cos && eq && typeof eq === 'object' && !Array.isArray(eq)) {
      const backdrop = typeof eq['backdrop'] === 'string' ? eq['backdrop'] : null;
      doc.cosmetics = { ...cos, equipped: { ...eq, backdrop } };
    }
    return { ...doc, v: 8 };
  },
};
