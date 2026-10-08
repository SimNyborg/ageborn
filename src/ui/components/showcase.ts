/**
 * The card detail showcase in the UI (ui-plan 4.4; owner request 2026-10-07): a live stage where the
 * card's real battle art moves and shows its attacks. The UI may not import render or Pixi (B2), so the
 * app provides a `ShowcaseMount` (render's `showcaseMount(art)`) through this context, the way it
 * provides cosmetic art (`CosmeticArtContext`). Without one (tests, some dev pages) the card stage
 * keeps its still portrait with its CSS motion.
 */
import type { ShowcaseMount } from '@/contracts';
import { createContext } from 'preact';
import { useContext } from 'preact/hooks';

export const ShowcaseContext = createContext<ShowcaseMount | null>(null);

export function useShowcase(): ShowcaseMount | null {
  return useContext(ShowcaseContext);
}
