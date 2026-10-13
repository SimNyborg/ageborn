/**
 * A General's head performing a starter emote (PLAN 2a "Emotes (6 starter)", AUDIT #15): the look's own
 * parts with the emote's face, props and effects (`emotes.ts`), animated by the motion sheet
 * (`emote.css`): a 1.2 s loop of anticipation, action with overshoot, and settle on the key pose, with
 * squash and stretch on the head and its own motion for the hand, trophy, tears and steam. `still`
 * (Reduce motion) shows the key pose. The Customize tiles, the wheel preview, the HUD wheel and the
 * battle bubble all draw this one component.
 */
import './emote.css';
import type { AvatarSpec, BaseEmoteId } from '@/contracts';
import { useMemo } from 'preact/hooks';
import { avatarLibrary, loadWearableArt, resolveLook } from '../Avatar';
import { lookKey, wearablesIn } from './look';
import { avatarSvg, type ResolvedLook } from './render';
import type { PartLibrary } from './types';

const cache = new Map<string, string>();
const CACHE_MAX = 120;

/** The SVG of a look performing `emote` (memoised per look, emote and detail; ids carry the `§` placeholder). */
export function emoteMarkup(look: ResolvedLook, emote: BaseEmoteId, detail: 'low' | 'full', lib: PartLibrary = avatarLibrary()): string {
  const key = `${lookKey(look)}|${emote}|${detail}|${Object.keys(lib).length}`;
  let svg = cache.get(key);
  if (svg === undefined) {
    svg = avatarSvg(look, lib, { crop: 'head', detail, motion: false, emote });
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
    cache.set(key, svg);
  }
  return svg;
}

let instances = 0;

export interface EmoteHeadProps {
  emote: BaseEmoteId;
  /** Whose head: a saved General (the player, a generated online player) ... */
  spec?: AvatarSpec;
  /** ... or a look drawn directly (an AI General's fixed look). */
  look?: ResolvedLook;
  size: number;
  /** The key pose without motion (Reduce motion). */
  still?: boolean;
  class?: string;
  testid?: string;
}

export function EmoteHead(p: EmoteHeadProps) {
  const look = useMemo(() => p.look ?? (p.spec ? resolveLook(p.spec) : null), [p.look, p.spec]);
  const id = useMemo(() => (instances = (instances + 1) % 1e6), []);
  const lib = avatarLibrary();
  if (!look) return null;
  if (wearablesIn(look).some((w) => !lib[w])) void loadWearableArt();
  const html = emoteMarkup(look, p.emote, p.size < 48 ? 'low' : 'full', lib).replace(/§/g, `em${id}-`);
  return (
    <span
      class={`emo-v${p.still ? ' is-still' : ''} ${p.class ?? ''}`}
      style={{ width: `${p.size}px`, height: `${p.size}px` }}
      data-testid={p.testid}
      data-emote={p.emote}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
