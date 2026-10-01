/**
 * Card portraits for the HUD. The art provider renders them (`ArtProvider.portrait`, DESIGN B5
 * Portraits); the app injects a function, and the HUD caches the data URLs per (card, foil, size).
 */
import type { CardId, Foil } from '@/contracts';
import { useEffect, useState } from 'preact/hooks';

/** `plate: false` leaves the background transparent (the fort button and the drag ghost). */
export type PortraitFn = (card: CardId, foil: Foil, size: number, plate?: boolean) => Promise<string>;

const cache = new Map<string, string>();

export function usePortrait(fn: PortraitFn | undefined, card: CardId | null, foil: Foil, size: number, plate = true): string | null {
  const key = card ? `${card}|${foil}|${size}|${plate ? 1 : 0}` : '';
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
    (plate ? fn(card, foil, size) : fn(card, foil, size, false)).then(
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
