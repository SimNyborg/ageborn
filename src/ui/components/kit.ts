/**
 * The UI kit context: what every component needs from the outside world, and nothing more.
 *
 * - `t`: translation (all text goes through i18n; CLAUDE.md, DESIGN C2/WP9).
 * - `portrait`: card portraits from the injected `ArtProvider.portrait` (DESIGN B5 Portraits). The
 *   UI layer never imports visuals (B2); without a provider, components draw a stylised fallback.
 * - `reduceMotion`: the player's setting (A9 Settings); CSS also honours `prefers-reduced-motion`.
 * - `locale`: for number formatting.
 * - `sound`: optional UI sound hook (`ui_click`, `ui_deny`, `ui_tab`, `ui_toggle`, `ui_sheet`...;
 *   ui-plan 5.4). The app passes the audio service's `play`; without it the UI is silent.
 */
import type { ArtProvider, CardId, Foil, Side, SkinId } from '@/contracts';
import { i18n } from '@/i18n';
import { createContext } from 'preact';
import { useContext, useEffect, useState } from 'preact/hooks';

export type Translate = (key: string, params?: Record<string, string | number>) => string;

/**
 * `ArtProvider.portrait` plus the optional `plate` flag WP4's provider already supports
 * (docs/requests/wp4-portrait-plate-contract.md): `plate: false` gives a transparent background, used
 * for silhouettes. Any contract `ArtProvider.portrait` is assignable, so the app passes
 * `art.portrait.bind(art)`.
 */
export type PortraitRequest = Parameters<ArtProvider['portrait']>[0] & { plate?: boolean };
export type PortraitFn = (o: PortraitRequest) => Promise<string>;

export interface UiKit {
  t: Translate;
  locale: string;
  portrait: PortraitFn | null;
  reduceMotion: boolean;
  /** `pitchBp` (10000 = as recorded) raises a caller-pitched sound, e.g. each star a step higher (MR-41). */
  sound?: (id: string, o?: { pitchBp?: number }) => void;
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

/**
 * Where modals render: the UI root (set by the ScreenHost). Rendering them there keeps them above
 * every panel, whatever transforms or filters the panels use. Null renders modals in place.
 */
export const PortalContext = createContext<{ current: HTMLElement | null }>({ current: null });

const portraitCache = new Map<string, string>();

/** Clears cached portrait URLs (tests, or after the art provider changes). */
export function clearPortraitCache(): void {
  portraitCache.clear();
}

/**
 * Resolves a card portrait data URL through the injected provider, cached per
 * (card, skin, foil, size, plate, side). `side: 1` paints the team areas in the opponent's colour.
 * Returns null while loading, on failure (an empty URL), or without a provider.
 */
export function usePortrait(card: CardId | null, o: { skin?: SkinId | null; foil?: Foil; size: number; plate?: boolean; side?: Side }): string | null {
  const { portrait } = useKit();
  const skin = o.skin ?? undefined;
  const foil = o.foil ?? 'none';
  const plate = o.plate ?? true;
  const side = o.side ?? 0;
  const key = card ? `${card}|${skin ?? ''}|${foil}|${o.size}|${plate ? 1 : 0}|${side}` : '';
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
    const req: PortraitRequest = { card, foil, size: o.size };
    if (skin) req.skin = skin;
    if (!plate) req.plate = false;
    if (side) req.side = side;
    portrait(req).then(
      (u) => {
        if (u) portraitCache.set(key, u);
        if (live) setUrl(u || null);
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

/** MR-41: each stamped star sounds a step higher (star 1 as recorded, then +2 and +4 semitones). */
export function starPitchBp(star: number): number {
  const semis = [0, 0, 2, 4, 7][Math.max(0, Math.min(4, star))] ?? 0;
  return Math.round(10000 * 2 ** (semis / 12));
}

/** A sprite strip (one clip, square cells side by side) and its frame count. */
export interface SpriteStripArt {
  url: string;
  frames: number;
}

const stripFrames = new Map<string, number>();

/**
 * One unit clip as a CSS sprite strip (UI art audit #6), through the injected portrait provider with
 * the card id `strip:<clip>:<card>` (the provider composites the Blender sheet's frames, team layer
 * tinted). Null while loading, without a provider, or for a unit without a sheet (draw a fallback).
 */
export function useSpriteStrip(card: CardId | null, clip: 'idle' | 'walk', size: number): SpriteStripArt | null {
  const url = usePortrait(card ? (`strip:${clip}:${card}` as CardId) : null, { size, plate: false });
  const [frames, setFrames] = useState<number | null>(() => (url ? (stripFrames.get(url) ?? null) : null));
  useEffect(() => {
    if (!url) {
      setFrames(null);
      return;
    }
    const known = stripFrames.get(url);
    if (known) {
      setFrames(known);
      return;
    }
    if (typeof Image === 'undefined') return;
    let live = true;
    const im = new Image();
    im.onload = () => {
      const n = Math.max(1, Math.round(im.naturalWidth / Math.max(1, im.naturalHeight)));
      stripFrames.set(url, n);
      if (live) setFrames(n);
    };
    im.src = url;
    return () => {
      live = false;
    };
  }, [url]);
  return url && frames ? { url, frames } : null;
}
