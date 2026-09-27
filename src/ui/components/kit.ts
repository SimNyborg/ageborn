/**
 * The UI kit context: what every component needs from the outside world, and nothing more.
 *
 * - `t`: translation (all text goes through i18n; CLAUDE.md, DESIGN C2/WP9).
 * - `portrait`: card portraits from the injected `ArtProvider.portrait` (DESIGN B5 Portraits). The
 *   UI layer never imports visuals (B2); without a provider, components draw a stylised fallback.
 * - `reduceMotion`: the player's setting (A9 Settings); CSS also honours `prefers-reduced-motion`.
 * - `locale`: for number formatting.
 */
import type { ArtProvider, CardId, Foil, SkinId } from '@/contracts';
import { i18n } from '@/i18n';
import { createContext } from 'preact';
import { useContext, useEffect, useState } from 'preact/hooks';

export type Translate = (key: string, params?: Record<string, string | number>) => string;

/** Same shape as `ArtProvider.portrait`, so the app can pass `art.portrait.bind(art)`. */
export type PortraitFn = ArtProvider['portrait'];

export interface UiKit {
  t: Translate;
  locale: string;
  portrait: PortraitFn | null;
  reduceMotion: boolean;
}

export const defaultKit: UiKit = {
  t: (key, params) => i18n.t(key, params),
  locale: 'en',
  portrait: null,
  reduceMotion: false,
};

export const UiKitContext = createContext<UiKit>(defaultKit);

export function useKit(): UiKit {
  return useContext(UiKitContext);
}

/** Shorthand for components that only translate. */
export function useT(): Translate {
  return useContext(UiKitContext).t;
}

const portraitCache = new Map<string, string>();

/** Clears cached portrait URLs (tests, or after the art provider changes). */
export function clearPortraitCache(): void {
  portraitCache.clear();
}

/**
 * Resolves a card portrait data URL through the injected provider, cached per
 * (card, skin, foil, size). Returns null while loading, on failure, or without a provider.
 */
export function usePortrait(card: CardId | null, o: { skin?: SkinId | null; foil?: Foil; size: number }): string | null {
  const { portrait } = useKit();
  const skin = o.skin ?? undefined;
  const foil = o.foil ?? 'none';
  const key = card ? `${card}|${skin ?? ''}|${foil}|${o.size}` : '';
  const [url, setUrl] = useState<string | null>(() => (key ? (portraitCache.get(key) ?? null) : null));
  useEffect(() => {
    if (!portrait || !card) {
      setUrl(null);
      return;
    }
    const hit = portraitCache.get(key);
    if (hit) {
      setUrl(hit);
      return;
    }
    let live = true;
    const req: Parameters<PortraitFn>[0] = { card, foil, size: o.size };
    if (skin) req.skin = skin;
    portrait(req).then(
      (u) => {
        portraitCache.set(key, u);
        if (live) setUrl(u);
      },
      () => {
        if (live) setUrl(null);
      },
    );
    return () => {
      live = false;
    };
  }, [portrait, key]);
  return url;
}
