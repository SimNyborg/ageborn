/**
 * The player's General and the AI Generals' portraits ("Make your General", owner request 2026-10-07,
 * AUDIT §6). A layered cartoon bust drawn from parts in the battle art's style (cel shadow band,
 * highlight, colour-matched outline), with a low-detail version below 48 px, idle blink and bob, and
 * temporary moods on VS and Result.
 *
 * - The look comes from the save's `AvatarSpec`: the creator's `look` and `tints` (save v12), else the
 *   frozen mapping of a legacy seeded face. A player may instead show an owned troop (`portraitCard`).
 * - Starter parts ship with the first download; earned wearables load lazily the first time a look
 *   wears one (the drawing shows without it for a moment, never a broken image).
 * - Every General portrait is paired with the AI label by its caller (A7.1).
 */
import './avatar/avatar.css';
import type { AvatarSpec } from '@/contracts';
import { fnv1a32 } from '@/core';
import { signal } from '@preact/signals';
import { useMemo } from 'preact/hooks';
import { CardArt } from './CardTile';
import { useKit } from './kit';
import { generalLook, lookKey, resolveLook, wearablesIn } from './avatar/look';
import { avatarSvg, type AvatarCrop, type AvatarMood, type RenderOptions, type ResolvedLook } from './avatar/render';
import { STARTER_ART } from './avatar/starter';
import type { PartLibrary } from './avatar/types';
import { frameStyle } from './avatar/ProfileArt';

export type { AvatarCrop, AvatarMood, ResolvedLook };
export { legacyRoll, resolveLook, randomStarterLook, generalLook } from './avatar/look';

// ---------------------------------------------------------------------------------------------
// The part library: starters now, wearables on demand
// ---------------------------------------------------------------------------------------------

const library = signal<PartLibrary>(STARTER_ART);
let wearablesLoading: Promise<void> | null = null;

/** Loads the wearables' art (the creator calls it on open; looks that wear one call it on render). */
export function loadWearableArt(): Promise<void> {
  if (!wearablesLoading) {
    wearablesLoading = import('./avatar/wearables')
      .then((m) => {
        library.value = { ...STARTER_ART, ...m.WEARABLE_ART };
      })
      .catch(() => {
        wearablesLoading = null;
      });
  }
  return wearablesLoading;
}

/**
 * The crop that shows one accessory best in a creator tile: face pieces (glasses, patches, paint) on
 * the face, neck pieces (necklaces, scarves, medals) on the chest, anything larger on the bust. Reads
 * the library signal, so a tile re-crops once the wearables' art has loaded.
 */
export function accessoryCrop(id: string): AvatarCrop {
  const a = library.value[id];
  if (!a || a.aura) return 'bust';
  if (a.layers.faceAcc) return 'face';
  if (a.layers.over) return 'chest';
  return 'bust';
}

const cache = new Map<string, string>();
const CACHE_MAX = 400;

/** The SVG markup of a look (memoised per look, crop, detail, mood and motion; ids get a unique prefix). */
export function avatarMarkup(look: ResolvedLook, o: RenderOptions, lib: PartLibrary = library.value): string {
  const key = `${lookKey(look)}|${o.crop}|${o.detail}|${o.mood ?? ''}|${o.motion ? 1 : 0}|${o.part ?? ''}|${Object.keys(lib).length}`;
  let svg = cache.get(key);
  if (svg === undefined) {
    svg = avatarSvg(look, lib, o);
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
    cache.set(key, svg);
  }
  return svg;
}

let instances = 0;

function useLookSvg(look: ResolvedLook, size: number, o: { crop?: AvatarCrop; mood?: AvatarMood; detail?: 'low' | 'full'; part?: RenderOptions['part'] }): { html: string; delay: string } {
  const kit = useKit();
  const lib = library.value;
  const id = useMemo(() => (instances = (instances + 1) % 1e6), []);
  if (wearablesIn(look).some((w) => !lib[w])) void loadWearableArt();
  const crop = o.crop ?? (size < 72 ? 'head' : 'bust');
  const detail = o.detail ?? (size < 48 ? 'low' : 'full');
  const motion = !kit.reduceMotion && size >= 72;
  const svg = avatarMarkup(look, { crop, detail, ...(o.mood ? { mood: o.mood } : {}), ...(o.part ? { part: o.part } : {}), motion }, lib);
  // Each instance blinks on its own beat, so a row of Generals never blinks in unison.
  const delay = `${-((fnv1a32(lookKey(look)) + id * 997) % 4600) / 1000}s`;
  return { html: svg.replace(/§/g, `av${id}-`), delay };
}

export interface AvatarProps {
  spec: AvatarSpec;
  size?: number;
  frameColor?: string;
  label?: string;
  testid?: string;
  /** Head for chips and markers, bust for Profile, VS, Result and the creator (default by size). */
  crop?: AvatarCrop;
  /** A temporary expression (VS, Result); never saved. */
  mood?: AvatarMood;
  detail?: 'low' | 'full';
  /** Replays the equip pop (the creator bumps it on each change). */
  pop?: number;
  /** A Codex frame id: draws that frame's metal ring (Profile, the creator). */
  ring?: string;
  class?: string;
}

/** The player's General in a framed plate. */
export function Avatar(p: AvatarProps) {
  const size = p.size ?? 64;
  const style = { width: `${size}px`, height: `${size}px`, '--frame': p.frameColor ?? '#f2c14e' };
  if (p.spec.portraitCard) {
    return (
      <span class={`ui-avatar ${p.class ?? ''}`} style={style} role="img" aria-label={p.label} data-testid={p.testid}>
        <CardArt card={p.spec.portraitCard} age="stone" glyph="infantry" size={size} />
      </span>
    );
  }
  const ring = p.ring && p.ring !== 'none' ? p.ring : null;
  return (
    <LookPlate
      look={resolveLook(p.spec)}
      {...p}
      size={size}
      style={{ ...style, ...(ring ? frameStyle(ring) : {}) }}
      kind="ui-avatar"
      class={`${ring ? 'av--ring ' : ''}${p.class ?? ''}`}
    />
  );
}

/** A look drawn directly (the creator's preview and tiles). `ring` draws a Codex frame's metal ring. */
export function AvatarLookView(p: { look: ResolvedLook; size: number; crop?: AvatarCrop; mood?: AvatarMood; detail?: 'low' | 'full'; frameColor?: string; ring?: string; pop?: number; testid?: string; label?: string; class?: string }) {
  const ring = p.ring && p.ring !== 'none' ? p.ring : null;
  const style = { width: `${p.size}px`, height: `${p.size}px`, '--frame': p.frameColor ?? '#f2c14e', ...(ring ? frameStyle(ring) : {}) };
  return <LookPlate {...p} style={style} kind="ui-avatar" class={`${ring ? 'av--ring ' : ''}${p.class ?? ''}`} />;
}

function LookPlate(p: {
  look: ResolvedLook;
  size: number;
  style: Record<string, string>;
  kind: 'ui-avatar' | 'ui-general';
  crop?: AvatarCrop;
  mood?: AvatarMood;
  detail?: 'low' | 'full';
  pop?: number;
  label?: string;
  testid?: string;
  class?: string;
}) {
  const { html, delay } = useLookSvg(p.look, p.size, { ...(p.crop ? { crop: p.crop } : {}), ...(p.mood ? { mood: p.mood } : {}), ...(p.detail ? { detail: p.detail } : {}) });
  return (
    <span
      class={`${p.kind} av${p.pop ? ' av--pop' : ''} ${p.class ?? ''}`}
      style={{ ...p.style, '--av-delay': delay }}
      role="img"
      aria-label={p.label}
      aria-hidden={p.label ? undefined : 'true'}
      data-testid={p.testid}
      data-mood={p.mood ?? 'neutral'}
    >
      <span key={p.pop ?? 0} class="av__svg" dangerouslySetInnerHTML={{ __html: html }} />
    </span>
  );
}

/**
 * Portrait of an AI General or procedural commander: each General's fixed look from content (Grogg's
 * mammoth hood, the Warden's visor), a seeded starter look for other commanders, and two faces for
 * Ada & Ivo (A7.4). The caller shows the AI badge next to it (A7.1).
 */
export function GeneralPortrait(p: { generalId: string; name?: string; size?: number; label?: string; testid?: string; crop?: AvatarCrop; mood?: AvatarMood }) {
  const size = p.size ?? 96;
  const seed = fnv1a32(`${p.generalId}|${p.name ?? ''}`);
  const style = { width: `${size}px`, height: `${size}px` };
  if (p.generalId === 'twins') return <TwinsPortrait size={size} style={style} {...p} />;
  return <LookPlate look={generalLook(p.generalId, seed)} size={size} style={style} kind="ui-general" {...(p.crop ? { crop: p.crop } : { crop: size < 72 ? 'head' : 'bust' })} {...(p.mood ? { mood: p.mood } : {})} {...(p.label ? { label: p.label } : {})} {...(p.testid ? { testid: p.testid } : {})} />;
}

function TwinsPortrait(p: { size: number; style: Record<string, string>; label?: string; testid?: string; mood?: AvatarMood }) {
  const mood = p.mood ? { mood: p.mood } : {};
  const bg = useLookSvg(generalLook('twins', 1), p.size, { crop: 'bust', part: 'bg' });
  const a = useLookSvg(generalLook('twins', 1), p.size, { crop: 'bust', part: 'figure', ...mood });
  const b = useLookSvg(generalLook('twins_b', 2), p.size, { crop: 'bust', part: 'figure', ...mood });
  return (
    <span class="ui-general av av--twins" style={p.style} role="img" aria-label={p.label} aria-hidden={p.label ? undefined : 'true'} data-testid={p.testid}>
      <span class="av__svg" dangerouslySetInnerHTML={{ __html: bg.html }} />
      <span class="av__twin av__twin--a" dangerouslySetInnerHTML={{ __html: a.html }} />
      <span class="av__twin av__twin--b" dangerouslySetInnerHTML={{ __html: b.html }} />
    </span>
  );
}
