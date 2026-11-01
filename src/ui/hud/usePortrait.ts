/**
 * Card portraits for the HUD. The art provider renders them (`ArtProvider.portrait`, DESIGN B5
 * Portraits); the app injects a function, and the HUD caches the data URLs per (card, foil, size, skin).
 */
import type { CardId, Foil, SkinId } from '@/contracts';
import { useEffect, useState } from 'preact/hooks';

/**
 * `plate: false` leaves the background transparent (the fort button and the drag ghost). `skin` (queue item 46, the
 * training card): the equipped skin's rendered still when it has one; the card's own portrait otherwise.
 */
export type PortraitFn = (card: CardId, foil: Foil, size: number, plate?: boolean, skin?: SkinId) => Promise<string>;

const cache = new Map<string, string>();

export function usePortrait(fn: PortraitFn | undefined, card: CardId | null, foil: Foil, size: number, plate = true, skin: SkinId | null = null): string | null {
  const key = card ? `${card}|${foil}|${size}|${plate ? 1 : 0}${skin ? `|${skin}` : ''}` : '';
  const [url, setUrl] = useState<string | null>(() => (key ? (cache.get(key) ?? null) : null));
  useEffect(() => {
    if (!fn || !card) {
      setUrl(null);
      return;
    }
    const hit = cache.get(key);
    if (hit) {
      setUrl(hit);
      return;
    }
    let live = true;
    (skin ? fn(card, foil, size, plate, skin) : plate ? fn(card, foil, size) : fn(card, foil, size, false)).then(
      (u) => {
        cache.set(key, u);
        if (live) setUrl(u);
      },
      () => {
        if (live) setUrl(null);
      },
    );
    return () => {
      live = false;
    };
  }, [fn, key]);
  return url;
}
