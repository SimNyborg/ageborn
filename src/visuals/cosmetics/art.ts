/**
 * Cosmetic art lookup and SVG output (DESIGN A18.9.4, A14.4 `cosmetic.<collection>.<id>`): the router from
 * a collection key to the module that draws it (PLAN 2f interface 2, set up by C0 on 2026-10-08), so each
 * track changes its own art without touching this file:
 *
 * | Key | Drawn by | Owner |
 * |---|---|---|
 * | `scene.<id>` (`{ age, thumb }` or `{ age, sky }`) | `backdrops/scenePreview.ts` | Track A |
 * | `backdrop.<id>` (`{ age, scene? }`; `layer: 'fx'` the weather) | `scenePreview.ts`, `backdropPreview.ts` | Track A |
 * | `baseSkin.<id>` (`layer: 'tint' \| 'fx' \| 'thumb'`) | `baseSkins.ts` | Track B |
 * | `decoration.<id>` (`{ hd? }`) | `decorations.ts` | Track B |
 * | `nationalFlag.<id>` (`{ size?: 'tile' \| 'big', cached? }`, default big) | `nationalFlags.ts` | Track D |
 * | `baseFlag.<id>`, `emote.<id>`, `quote.<id>` | `flags.ts` (and `nationalFlags.ts REGION_PENNANTS`), `emotes.ts`, here | Track C |
 *
 * The UI may not import the visuals (B2), so the app injects {@link cosmeticImageUrl} into the screens
 * and the HUD; the battle's base dressing bakes the same drawings into textures ({@link drawFlag},
 * {@link drawDecoration}). Keys are the collection keys `<collection>.<id>` (`nationalFlag.dk`); unknown
 * keys return null.
 */
import type { AgeId } from '@/contracts/ids';
import { hasSceneArt, scenePreviewUrl } from '../backdrops/scenePreview';
import { BACKDROP_THEMES } from '../backdrops/themes';
import { backdropIconSvg, backdropPreviewUrl, backdropWeatherSvg } from './backdropPreview';
import { baseSkinArt, baseSkinLayerSvg, baseSkinSvg, baseSkinThumbUrl, BASE_SKINS, hasBaseSkinArt } from './baseSkins';
import { decorationArtUrl, decorationSvg, DECO_H, DECO_W, DECORATIONS, drawDecoration, hasDecorationArt } from './decorations';
import { EMOTE_BOX, EMOTE_MOTIONS, EMOTES, type EmoteLayer, type EmoteMotion } from './emotes';
import { BANNER_OUTLINE, BASE_FLAGS, baseFlagTier, FLAG_GLINT, FLAG_H, FLAG_POLE_BOX, FLAG_W, flagCloth, flagFringe, flagPole, flagTrim, type FlagTier } from './flags';
import { drawNationalFlag, hasNationalFlagArt, NATIONAL_FLAGS, nationalFlagSvg, nationalFlagSvgUrl, nationalFlagUrl, REGION_PENNANT_TIER, REGION_PENNANTS } from './nationalFlags';
import { celRamp, circle, drawShapes, hex, INK, shapesToSvg, type Ctx2D, type Paints, type Shape } from './shapes';

/** `avatar` (the General's wardrobe) is drawn by the UI's avatar renderer, so the visuals have no art for it. */
export const COSMETIC_COLLECTIONS = ['emote', 'quote', 'baseFlag', 'nationalFlag', 'baseSkin', 'decoration', 'backdrop', 'scene', 'avatar'] as const;
export type CosmeticCollectionId = (typeof COSMETIC_COLLECTIONS)[number];

/** The default team colour of previews (side 0, A11). */
export const PREVIEW_TEAM = 0x2f7df6;

export function parseCosmeticKey(key: string): { collection: CosmeticCollectionId; id: string } | null {
  const dot = key.indexOf('.');
  if (dot <= 0) return null;
  const collection = key.slice(0, dot) as CosmeticCollectionId;
  if (!COSMETIC_COLLECTIONS.includes(collection)) return null;
  return { collection, id: key.slice(dot + 1) };
}

/** True when the visuals can draw this item (quotes are text and always drawable). */
export function hasCosmeticArt(collection: string, id: string): boolean {
  switch (collection) {
    case 'emote':
      return EMOTES[id] !== undefined;
    case 'quote':
      return true;
    case 'baseFlag':
      return baseFlagShapes(id) !== undefined;
    case 'nationalFlag':
      return hasNationalFlagArt(id);
    case 'baseSkin':
      return hasBaseSkinArt(id);
    case 'decoration':
      return hasDecorationArt(id);
    case 'backdrop':
      return id === 'classic' || BACKDROP_THEMES[id] !== undefined;
    case 'scene':
      return hasSceneArt(id);
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------------------------
// Flags
// ---------------------------------------------------------------------------------------------

export type FlagKind = 'nationalFlag' | 'baseFlag';

/**
 * The finish tier of a Flag Atlas reward (Track D's `REGION_PENNANT_TIER`): the Region Pennants are
 * Epic-styled, World Compass Legendary (PLAN 2d).
 */
const pennantTier = (id: string): FlagTier => REGION_PENNANT_TIER[id] ?? 'epic';

/**
 * A base flag's design: `flags.ts` (cloth and emblem), or one of the Flag Atlas's rewards
 * (`nationalFlags.ts`, Track D: the whole field and emblem, given our cloth finish on top).
 */
function baseFlagParts(id: string): { shapes: readonly Shape[]; tier: FlagTier } | undefined {
  const own = BASE_FLAGS[id];
  if (own) return { shapes: own, tier: baseFlagTier(id) ?? 'common' };
  const pennant = REGION_PENNANTS[id];
  if (!pennant) return undefined;
  const tier = pennantTier(id);
  return { shapes: [...pennant, ...flagCloth(tier).slice(1)], tier };
}
const baseFlagShapes = (id: string): readonly Shape[] | undefined => baseFlagParts(id)?.shapes;

/** The shapes, outline and finish tier of a base flag, or null (national flags are drawn by `nationalFlags.ts`). */
export function baseFlagDesign(id: string): { shapes: readonly Shape[]; outline: string; tier: FlagTier } | null {
  const d = baseFlagParts(id);
  return d ? { shapes: d.shapes, outline: BANNER_OUTLINE, tier: d.tier } : null;
}

let clipSeq = 0;

/**
 * A base flag as SVG: cloth, emblem and trim inside the swallowtail, its outline in the team colour's
 * dark (AUDIT §3.1, never black), the fringe outside it. `pole` adds the pole and the tier's finial
 * (the screens' tiles); `animate` sweeps the Legendary glint (off under reduce motion).
 */
function baseFlagSvg(id: string, p: Paints, o: { pole?: boolean; animate?: boolean } = {}): string | null {
  const d = baseFlagDesign(id);
  if (!d) return null;
  const clip = `cf${(clipSeq = (clipSeq + 1) % 1e6)}`;
  const line = celRamp(hex(p.team), 'cloth').line;
  const box = o.pole ? FLAG_POLE_BOX.join(' ') : `-2 -2 ${FLAG_W + 4} ${FLAG_H + 4}`;
  const glint =
    d.tier === 'legendary' && o.animate
      ? `<path d="${FLAG_GLINT}" fill="#ffffff" opacity="0.4"><animateTransform attributeName="transform" type="translate" values="-8 0;86 0;86 0" keyTimes="0;0.3;1" dur="5s" repeatCount="indefinite"/></path>`
      : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}">` +
    (o.pole ? shapesToSvg(flagPole(d.tier), p) : '') +
    `<defs><clipPath id="${clip}"><path d="${d.outline}"/></clipPath></defs>` +
    `<g clip-path="url(#${clip})">${shapesToSvg(d.shapes, p)}${shapesToSvg(flagTrim(d.tier), p)}${glint}</g>` +
    `<path d="${d.outline}" fill="none" stroke="${line}" stroke-width="1.6" stroke-linejoin="round" data-flag-outline=""/>` +
    shapesToSvg(flagFringe(d.tier), p) +
    `</svg>`
  );
}

/** Draws a flag into a canvas at `px` pixels per view-box unit, with a 2-unit margin (for textures). */
export function drawFlag(ctx: Ctx2D, kind: FlagKind, id: string, p: Paints, px: number): boolean {
  if (kind === 'nationalFlag') return drawNationalFlag(ctx, id, px);
  const d = baseFlagDesign(id);
  if (!d) return false;
  ctx.save();
  ctx.scale(px, px);
  ctx.translate(2, 2);
  const outline = new Path2D(d.outline);
  ctx.save();
  ctx.clip(outline);
  drawShapes(ctx, d.shapes, p);
  drawShapes(ctx, flagTrim(d.tier), p);
  ctx.restore();
  ctx.strokeStyle = celRamp(hex(p.team), 'cloth').line;
  ctx.lineWidth = 1.6;
  ctx.lineJoin = 'round';
  ctx.stroke(outline);
  drawShapes(ctx, flagFringe(d.tier), p);
  ctx.restore();
  return true;
}

// ---------------------------------------------------------------------------------------------
// Emotes (CSS keyframes inside the SVG; `emotes.ts`)
// ---------------------------------------------------------------------------------------------

/** The motions a layer tree uses (each written into the SVG's style once). */
function motionsIn(layers: readonly EmoteLayer[], out: Set<EmoteMotion> = new Set()): Set<EmoteMotion> {
  for (const l of layers) {
    if (l.motion) out.add(l.motion);
    if (l.sub) motionsIn(l.sub, out);
  }
  return out;
}

/** One layer: its shapes and its attached parts (behind or in front), moving with its motion. */
function emoteLayerSvg(l: EmoteLayer, p: Paints, animate: boolean): string {
  const subs = l.sub ?? [];
  const back = subs.filter((x) => x.behind).map((x) => emoteLayerSvg(x, p, animate)).join('');
  const front = subs.filter((x) => !x.behind).map((x) => emoteLayerSvg(x, p, animate)).join('');
  const inner = `${back}${shapesToSvg(l.shapes, p)}${front}`;
  if (!l.motion || !animate) return `<g>${inner}</g>`;
  const [x, y] = l.at ?? [EMOTE_BOX / 2, EMOTE_BOX / 2];
  const delay = l.delay ? `;animation-delay:${-l.delay}s` : '';
  return `<g class="m-${l.motion}" style="transform-origin:${x}px ${y}px${delay}">${inner}</g>`;
}

/**
 * An emote as SVG: its layers in the 96-unit box and, with motion on, the CSS keyframes of the motions
 * it uses (a 1.2 s loop each: anticipation, action with overshoot, settle on the key pose). Without
 * motion (Reduce motion) there is no style at all, so the key pose shows still.
 */
function emoteSvg(id: string, p: Paints, animate: boolean): string | null {
  const e = EMOTES[id];
  if (!e) return null;
  const css = animate
    ? [...motionsIn(e.layers)]
        .map((m) => {
          const k = EMOTE_MOTIONS[m];
          return `.m-${m}{transform-box:view-box;animation:e-${m} ${k.dur ?? 1.2}s ${k.ease} infinite}@keyframes e-${m}{${k.kf}}`;
        })
        .join('')
    : '';
  const body = e.layers.map((l) => emoteLayerSvg(l, p, animate)).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${EMOTE_BOX} ${EMOTE_BOX}" overflow="visible">${css ? `<style>${css}</style>` : ''}${body}</svg>`;
}

// ---------------------------------------------------------------------------------------------
// The sky's weather over a space scene (PLAN 2b `weather: 'space'`)
// ---------------------------------------------------------------------------------------------

/**
 * True for a scene whose hints say `weather: 'space'`: every Cosmic scene (the classic Crystal Moon Base,
 * Ringed Giant and Nebula Shipyard, PLAN 2b), so the preview never snows over space. Read from the age,
 * which holds for all 24 planned scenes; the lane reads the hint from the scene's own `layers.json`.
 */
export function isSpaceScene(age: AgeId, scene?: string | null): boolean {
  void scene;
  return age === 'cosmic';
}

/** A tiny seeded stream for the motes' positions (the same picture every time). */
function seq(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

/**
 * A sky's weather as the lane shows it over a space scene (the preview's motion layer, a transparent
 * SVG over the still): snow becomes drifting ice motes, rain becomes meteor streaks, and petals, leaves,
 * embers, lanterns and fireflies become twinkling sparkles in the sky's weather colour. Null for a sky
 * without weather. `animate` off draws the same particles still (Reduce motion).
 */
export function spaceWeatherSvg(id: string, animate: boolean): string | null {
  const th = BACKDROP_THEMES[id];
  if (!th || th.weather === 'none') return null;
  const W = 240;
  const H = 96;
  const c = hex(th.weatherColor);
  const rnd = seq(id.length * 7919 + id.charCodeAt(0) * 31);
  const n = (a: number, b: number) => (a + rnd() * (b - a)).toFixed(2);
  const parts: string[] = [];
  if (th.weather === 'snow') {
    for (let i = 0; i < 22; i += 1) {
      const x = n(0, W);
      const y = n(4, H);
      const r = Number(n(0.9, 1.7));
      const begin = `-${n(0, 9)}s`;
      const drift = animate ? `<animateTransform attributeName="transform" type="translate" values="0 0;${n(-14, -6)} ${n(4, 10)};0 0" dur="${n(7, 12)}s" begin="${begin}" repeatCount="indefinite"/>` : '';
      const tw = animate ? `<animate attributeName="opacity" values="0.25;1;0.25" dur="${n(1.6, 3.2)}s" begin="${begin}" repeatCount="indefinite"/>` : '';
      parts.push(`<g>${drift}<path d="M${x} ${(Number(y) - r).toFixed(2)}l${(r * 0.6).toFixed(2)} ${r}l${(-r * 0.6).toFixed(2)} ${r}l${(-r * 0.6).toFixed(2)} ${-r}z" fill="#e6f4ff" opacity="0.85">${tw}</path></g>`);
    }
  } else if (th.weather === 'rain') {
    for (let i = 0; i < 6; i += 1) {
      const x = Number(n(60, W + 40));
      const y = Number(n(-10, H * 0.45));
      const len = Number(n(14, 26));
      const begin = `-${n(0, 6)}s`;
      const dur = n(2.6, 4.2);
      const fly = animate ? `<animateTransform attributeName="transform" type="translate" values="0 0;-90 52;-90 52" keyTimes="0;0.34;1" dur="${dur}s" begin="${begin}" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;0;0" keyTimes="0;0.08;0.34;1" dur="${dur}s" begin="${begin}" repeatCount="indefinite"/>` : '';
      parts.push(
        `<g opacity="${animate ? 0 : 0.8}">${fly}<path d="M${x.toFixed(1)} ${y.toFixed(1)}l${(len * 0.86).toFixed(1)} ${(-len * 0.5).toFixed(1)}" stroke="${c}" stroke-width="0.9" stroke-linecap="round" opacity="0.55"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.3" fill="#ffffff"/></g>`,
      );
    }
  } else {
    for (let i = 0; i < 14; i += 1) {
      const x = Number(n(4, W - 4));
      const y = Number(n(4, H * 0.8));
      const r = Number(n(1.4, 2.6));
      const begin = `-${n(0, 4)}s`;
      const tw = animate
        ? `<animateTransform attributeName="transform" type="scale" values="0.3;1;0.3" dur="${n(1.8, 3.4)}s" begin="${begin}" repeatCount="indefinite" additive="sum"/>`
        : '';
      parts.push(
        `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><g>${tw}<path d="M0 ${-r}Q0 0 ${r * 0.62} 0Q0 0 0 ${r}Q0 0 ${-r * 0.62} 0Q0 0 0 ${-r}Z" fill="${c}"/><circle r="${(r * 0.9).toFixed(2)}" fill="${c}" opacity="0.18"/></g></g>`,
      );
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} 128" preserveAspectRatio="xMidYMid slice">${parts.join('')}</svg>`;
}

/** A speech bubble with three dots: the quote collection's icon (the line itself is text). */
function quoteSvg(): string {
  const O = { stroke: INK, width: 1.5 };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${shapesToSvg(
    [{ d: 'M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-8l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', fill: '#fffbe6', ...O }, circle(8, 10.5, 1.3, INK), circle(12, 10.5, 1.3, INK), circle(16, 10.5, 1.3, INK)],
    { team: PREVIEW_TEAM },
  )}</svg>`;
}

// ---------------------------------------------------------------------------------------------
// Public SVG API (injected into the UI)
// ---------------------------------------------------------------------------------------------

export interface CosmeticSvgOptions {
  /** The team colour for team paints (default: side 0 blue). */
  team?: number;
  /** Emote motion on (default true); off for Reduce motion. */
  animate?: boolean;
  /**
   * A base skin's layers for drawing it over the real base art (the Customize mock-up and tiles):
   * `tint` is a flat swatch of the body tint, to multiply over the base picture as the lane does;
   * `fx` is the ambient particle layer on a clear background (also a backdrop's weather); `thumb` is
   * the skin model's pre-rendered thumbnail (a picture: {@link cosmeticImageUrl} only). Null for other
   * collections.
   */
  layer?: 'tint' | 'fx' | 'thumb';
  /**
   * Backdrops and scenes (A18.9.4, PLAN 2b): the age whose half of the lane the preview shows (default
   * Stone). Without `layer` a backdrop or a scene is a painted still of that half (a picture, see
   * {@link cosmeticImageUrl}); `layer: 'fx'` is a backdrop's weather as an animated SVG to lay over it.
   */
  age?: AgeId;
  /** Backdrops and scenes: the small still for a collection tile. */
  thumb?: boolean;
  /**
   * Backdrops and scenes: only a still already painted, else null (the screens paint tiles one per
   * frame). National flags: a `tile` waits for the atlas cell (null while the atlas loads).
   */
  cached?: boolean;
  /** Scenes: the sky (`backdrop.<id>`) that grades the still; null or absent is the scene's own daylight. */
  sky?: string | null;
  /** Backdrops (the skies): the scene (`scene.<id>`) under the sky; absent is the age's classic scene. */
  scene?: string | null;
  /** Decorations: the HD picture (Customize's big stage). */
  hd?: boolean;
  /** National flags: a grid tile picture (an atlas cell) or the big picture (the SVG, the default). */
  size?: 'tile' | 'big';
  /** Base flags: drawn on their pole with the rarity's finial (collection tiles). */
  pole?: boolean;
}

/** SVG markup for a cosmetic key (`nationalFlag.dk`), or null when there is no art for it. */
export function cosmeticSvg(key: string, o: CosmeticSvgOptions = {}): string | null {
  const k = parseCosmeticKey(key);
  if (!k) return null;
  const p: Paints = { team: o.team ?? PREVIEW_TEAM };
  // a sky's weather; over a space scene its snow, rain and petals become motes, streaks and sparkles
  if (o.layer === 'fx' && k.collection === 'backdrop') return isSpaceScene(o.age ?? 'stone', o.scene) ? spaceWeatherSvg(k.id, o.animate ?? true) : backdropWeatherSvg(key, o.animate ?? true);
  // a skin model's thumbnail is a picture (cosmeticImageUrl), never SVG
  if (o.layer === 'thumb') return null;
  if (o.layer) return k.collection === 'baseSkin' ? baseSkinLayerSvg(k.id, o.layer, o.animate ?? true) : null;
  switch (k.collection) {
    case 'nationalFlag':
      return nationalFlagSvg(k.id);
    case 'baseFlag':
      return baseFlagSvg(k.id, p, { pole: !!o.pole, animate: o.animate ?? true });
    case 'decoration':
      return decorationSvg(k.id, p);
    case 'emote':
      return emoteSvg(k.id, p, o.animate ?? true);
    case 'quote':
      return quoteSvg();
    case 'baseSkin':
      return baseSkinSvg(k.id, p);
    case 'backdrop':
      // the emblem; the screens show the painted still (a PNG, `cosmeticImageUrl`) when they can
      return backdropIconSvg(k.id);
    case 'scene':
      // scenes are pictures only (cosmeticImageUrl)
      return null;
    case 'avatar':
      return null;
  }
}

/** The SVG as a data URL for an `<img>` (each image keeps its own ids and animations). */
export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * A collection item's picture for the screens (the table in the module note): the owning track's picture
 * when it has one (scene and sky stills, skin thumbnails, prop and flag pictures), else `cosmeticSvg` as
 * a data URL, cached per key, team, motion and layer.
 */
const urlCache = new Map<string, string | null>();
export function cosmeticImageUrl(key: string, o: CosmeticSvgOptions = {}): string | null {
  const age = o.age ?? 'stone';
  // A scene's thumbnail or its still under a sky (Track A; cached per age, scene and sky there)
  if (!o.layer && key.startsWith('scene.')) return scenePreviewUrl(key, age, { thumb: !!o.thumb, sky: o.sky ?? null, cachedOnly: !!o.cached });
  // A sky's still: over the given scene (Track A), else over the age's classic scene, painted by the
  // same painters the lane uses (cached per age and skin there)
  if (!o.layer && key.startsWith('backdrop.')) {
    const sky = key === 'backdrop.classic' ? null : key;
    const still = o.scene
      ? scenePreviewUrl(o.scene, age, { thumb: !!o.thumb, sky, cachedOnly: !!o.cached })
      : backdropPreviewUrl(sky, age, { thumb: !!o.thumb, cachedOnly: !!o.cached });
    if (still || o.cached) return still;
  }
  // A base skin model's thumbnail (Track B; null until it has one)
  if (o.layer === 'thumb') return key.startsWith('baseSkin.') ? baseSkinThumbUrl(key.slice('baseSkin.'.length)) : null;
  // The vendored national flags (Track D): every picture, with or without a size. 'big' (the SVG) by
  // default, one request per flag shown; a grid of many asks for 'tile' (one atlas for all of them),
  // and `cached` waits for the atlas (null meanwhile). The hand-drawn design (`nationalFlagSvg`) is only
  // the fallback for an id without a vendored picture.
  if (key.startsWith('nationalFlag.')) {
    const id = key.slice('nationalFlag.'.length);
    if (nationalFlagSvgUrl(id)) return nationalFlagUrl(id, o.size ?? 'big', { cached: !!o.cached });
  }
  // The Blender props (Track B) when they are in
  if (key.startsWith('decoration.')) {
    const url = decorationArtUrl(key.slice('decoration.'.length), o.hd ? { hd: true } : {});
    if (url) return url;
  }
  const space = o.layer === 'fx' && isSpaceScene(age, o.scene) ? 's' : '';
  const ck = `${key}|${o.team ?? PREVIEW_TEAM}|${o.animate ?? true}|${o.layer ?? ''}|${o.pole ? 'p' : ''}${space}`;
  let u = urlCache.get(ck);
  if (u === undefined) {
    const svg = cosmeticSvg(key, o);
    u = svg ? svgDataUrl(svg) : null;
    if (urlCache.size > 600) urlCache.clear();
    urlCache.set(ck, u);
  }
  return u;
}

export { baseSkinArt, drawDecoration, DECORATIONS, DECO_W, DECO_H, EMOTES, NATIONAL_FLAGS, BASE_FLAGS, BASE_SKINS, FLAG_W, FLAG_H };

/**
 * Calls `cb` whenever a picture asked for with `cached: true` got better (Track A re-composes a scene or
 * sky still once its Blender strips have streamed in); returns the unsubscribe. The app hands it to the
 * screens through `CosmeticPicturesContext`, so a still shown before its strips arrived updates itself.
 */
export { onBackdropPicturesChanged as onCosmeticPicturesChanged } from './backdropPreview';
