/**
 * Cosmetic art lookup and SVG output (DESIGN A18.9.4, A14.4 `cosmetic.<collection>.<id>`).
 *
 * The UI may not import the visuals (B2), so the app injects {@link cosmeticSvg} into the screens and
 * the HUD; the battle view bakes the same shapes into textures ({@link drawCosmetic}). Keys are the
 * collection keys `<collection>.<id>` (`nationalFlag.dk`); unknown keys return null.
 */
import type { AgeId } from '@/contracts/ids';
import { BACKDROP_THEMES } from '../backdrops/themes';
import { backdropIconSvg, backdropPreviewUrl, backdropWeatherSvg } from './backdropPreview';
import { BASE_SKINS } from './baseSkins';
import { DECO_H, DECO_W, DECORATIONS } from './decorations';
import { EMOTES, type EmoteLayer, type EmoteMotion } from './emotes';
import { BANNER_OUTLINE, BASE_FLAGS, FLAG_H, FLAG_W, flagFinish, NATIONAL_FLAGS } from './flags';
import { circle, drawShapes, hex, INK, poly, rect, roundRect, shade, shapesToSvg, star, type Ctx2D, type Paints, type Shape } from './shapes';

/** `avatar` (the General's wardrobe) is drawn by the UI's avatar renderer, so the visuals have no art for it. */
export const COSMETIC_COLLECTIONS = ['emote', 'quote', 'baseFlag', 'nationalFlag', 'baseSkin', 'decoration', 'backdrop', 'avatar'] as const;
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
      return BASE_FLAGS[id] !== undefined;
    case 'nationalFlag':
      return NATIONAL_FLAGS[id] !== undefined;
    case 'baseSkin':
      return BASE_SKINS[id] !== undefined;
    case 'decoration':
      return DECORATIONS[id] !== undefined;
    case 'backdrop':
      return id === 'classic' || BACKDROP_THEMES[id] !== undefined;
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------------------------
// Flags
// ---------------------------------------------------------------------------------------------

const ROUNDED = roundRect(0, 0, FLAG_W, FLAG_H, 3, 'none').d;

export type FlagKind = 'nationalFlag' | 'baseFlag';

/** The shapes and outline of a flag, or null. */
export function flagDesign(kind: FlagKind, id: string): { shapes: readonly Shape[]; outline: string } | null {
  const shapes = kind === 'nationalFlag' ? NATIONAL_FLAGS[id] : BASE_FLAGS[id];
  if (!shapes) return null;
  return { shapes, outline: kind === 'nationalFlag' ? ROUNDED : BANNER_OUTLINE };
}

let clipSeq = 0;

function flagSvg(kind: FlagKind, id: string, p: Paints): string | null {
  const d = flagDesign(kind, id);
  if (!d) return null;
  const clip = `cf${(clipSeq = (clipSeq + 1) % 1e6)}`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 ${FLAG_W + 4} ${FLAG_H + 4}">` +
    `<defs><clipPath id="${clip}"><path d="${d.outline}"/></clipPath></defs>` +
    `<g clip-path="url(#${clip})">${shapesToSvg(d.shapes, p)}${shapesToSvg(flagFinish(), p)}</g>` +
    `<path d="${d.outline}" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/></svg>`
  );
}

/** Draws a flag into a canvas at `px` pixels per view-box unit, with a 2-unit margin (for textures). */
export function drawFlag(ctx: Ctx2D, kind: FlagKind, id: string, p: Paints, px: number): boolean {
  const d = flagDesign(kind, id);
  if (!d) return false;
  ctx.save();
  ctx.scale(px, px);
  ctx.translate(2, 2);
  const outline = new Path2D(d.outline);
  ctx.save();
  ctx.clip(outline);
  drawShapes(ctx, d.shapes, p);
  drawShapes(ctx, flagFinish(), p);
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  ctx.lineJoin = 'round';
  ctx.stroke(outline);
  ctx.restore();
  return true;
}

// ---------------------------------------------------------------------------------------------
// Decorations and base skins
// ---------------------------------------------------------------------------------------------

function decorationSvg(id: string, p: Paints): string | null {
  const d = DECORATIONS[id];
  if (!d) return null;
  const glow = d.glow
    ? `<circle cx="${d.glow.x}" cy="${d.glow.y}" r="${d.glow.r}" fill="${hex(d.glow.color)}" opacity="0.28"/>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${DECO_W} ${DECO_H}">${glow}${shapesToSvg(d.shapes, p)}</svg>`;
}

/** Draws a decoration (without its glow) at `px` pixels per unit. */
export function drawDecoration(ctx: Ctx2D, id: string, p: Paints, px: number): boolean {
  const d = DECORATIONS[id];
  if (!d) return false;
  ctx.save();
  ctx.scale(px, px);
  drawShapes(ctx, d.shapes, p);
  ctx.restore();
  return true;
}

/** The standard base (no skin) in the Customize mock-up. */
const STANDARD_BASE = { tint: 0xffffff, trim: 0xc9a227, particles: 'dust', particleColor: 0xd9cdb8 } as const;

/** Multiplies two colours (a tint over the base's stone, as the lane's sprite tint does). */
function mul(a: number, b: number): number {
  const ch = (s: number) => Math.round((((a >> s) & 255) * ((b >> s) & 255)) / 255);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** A small keep in the skin's colours with its ambient particles, for tiles and the base mock-up. */
function baseSkinShapes(id: string): Shape[] | null {
  const plain = id === 'default';
  const s = plain ? STANDARD_BASE : BASE_SKINS[id];
  if (!s) return null;
  const stone = mul(0xe2d6bf, plain ? 0xffffff : s.tint);
  const wall = hex(stone);
  const side = hex(shade(stone, -0.16));
  const dark = hex(shade(stone, -0.4));
  const hi = hex(shade(stone, 0.45));
  const trim = hex(s.trim);
  const trimDark = hex(shade(s.trim, -0.3));
  const O = { stroke: INK, width: 1.3 };
  const crenels = (x0: number, x1: number, y: number, w = 3.2): Shape[] => {
    const out: Shape[] = [];
    for (let x = x0; x + w <= x1 + 0.01; x += w * 2) out.push(rect(x, y - 3, w, 3.2, wall, O));
    return out;
  };
  const bricks = (x0: number, x1: number, y0: number, y1: number): Shape[] => {
    const out: Shape[] = [];
    for (let y = y0 + 4; y < y1 - 1; y += 4.5) out.push({ d: `M${x0 + 1} ${y}H${x1 - 1}`, stroke: dark, width: 0.5, alpha: 0.45 });
    return out;
  };
  const dots: Shape[] = [];
  for (let i = 0; i < (plain ? 0 : 7); i += 1) {
    const x = 6 + ((i * 37) % 52);
    const y = 4 + ((i * 23) % 24);
    dots.push(s.particles === 'glints' || s.particles === 'stars' ? star(x, y, 2, hex(s.particleColor), { n: 4, ri: 0.6 }) : circle(x, y, 1.1, hex(s.particleColor), { alpha: 0.9 }));
  }
  return [
    // side towers with conical roofs in the skin's trim
    rect(5, 16, 11, 30, side, O),
    ...bricks(5, 16, 16, 46),
    poly([3.5, 16.5, 10.5, 5, 17.5, 16.5], trim, O),
    poly([10.5, 5, 17.5, 16.5, 12, 16.5], trimDark, { alpha: 0.6 }),
    rect(48, 16, 11, 30, side, O),
    ...bricks(48, 59, 16, 46),
    poly([46.5, 16.5, 53.5, 5, 60.5, 16.5], trim, O),
    poly([53.5, 5, 60.5, 16.5, 55, 16.5], trimDark, { alpha: 0.6 }),
    // curtain wall
    rect(14, 22, 36, 24, wall, O),
    ...bricks(14, 50, 22, 46),
    ...crenels(14.6, 22, 22),
    ...crenels(42, 49.4, 22),
    // the keep
    rect(23, 9, 18, 37, wall, O),
    rect(34, 10, 6.4, 35.4, dark, { alpha: 0.22 }),
    ...bricks(23, 41, 9, 46),
    ...crenels(23.4, 41, 9, 3),
    rect(24.5, 10.5, 1.6, 33, hi, { alpha: 0.7 }),
    // windows with warm light, and the gate
    { d: 'M29 20v-3a3 3 0 0 1 6 0v3z', fill: '#ffd27a', stroke: INK, width: 1 },
    rect(9, 24, 3, 4.4, '#ffd27a', { stroke: INK, width: 0.9 }),
    rect(52, 24, 3, 4.4, '#ffd27a', { stroke: INK, width: 0.9 }),
    { d: 'M27.5 46v-8a4.5 4.5 0 0 1 9 0v8z', fill: '#4a3424', stroke: INK, width: 1.2 },
    { d: 'M30.5 46v-9M33.5 46v-9', stroke: '#2e2016', width: 0.7 },
    // the team banner on the keep
    { d: 'M29 24h6v7l-3-1.6-3 1.6z', fill: 'team', stroke: INK, width: 1 },
    rect(29, 24, 6, 1.4, trim),
    // footing
    rect(3, 45.2, 58, 2.4, trim, O),
    ...dots,
  ];
}

/**
 * A base skin's tint swatch or its particle layer (see {@link CosmeticSvgOptions.layer}). The
 * particles move like the lane's: snow and petals fall, embers and fireflies rise, dust drifts,
 * glints and stars twinkle; still when `animate` is off (Reduce motion).
 */
function baseSkinLayerSvg(id: string, layer: 'tint' | 'fx', animate: boolean): string | null {
  const s = BASE_SKINS[id];
  if (!s) return null;
  if (layer === 'tint') return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" preserveAspectRatio="none"><rect width="10" height="10" fill="${hex(s.tint)}"/></svg>`;
  const color = hex(s.particleColor);
  const twinkle = s.particles === 'glints' || s.particles === 'stars';
  const parts: string[] = [];
  for (let i = 0; i < 14; i += 1) {
    const x = 6 + ((i * 41) % 88);
    const y = 6 + ((i * 29) % 84);
    const dur = 2.6 + ((i * 7) % 10) / 4;
    const begin = `begin="-${((i * 13) % 20) / 4}s" dur="${dur}s" repeatCount="indefinite"`;
    const shape = twinkle
      ? shapesToSvg([star(x, y, s.particles === 'stars' ? 2.6 : 2.2, color, { n: 4, ri: 0.7 })], { team: PREVIEW_TEAM })
      : `<ellipse cx="${x}" cy="${y}" rx="${s.particles === 'petals' ? 1.9 : 1.3}" ry="${s.particles === 'petals' ? 1.1 : 1.3}" fill="${color}"/>`;
    if (!animate) {
      parts.push(`<g opacity="0.85">${shape}</g>`);
      continue;
    }
    const drift =
      s.particles === 'snow' || s.particles === 'petals'
        ? `<animateTransform attributeName="transform" type="translate" values="0 -18;${i % 2 ? 4 : -4} 18" ${begin}/>`
        : s.particles === 'embers' || s.particles === 'fireflies'
          ? `<animateTransform attributeName="transform" type="translate" values="0 16;${i % 2 ? 3 : -3} -16" ${begin}/>`
          : s.particles === 'dust'
            ? `<animateTransform attributeName="transform" type="translate" values="-10 2;10 -2" ${begin}/>`
            : '';
    const fade = `<animate attributeName="opacity" values="0;0.95;0" keyTimes="0;.5;1" ${begin}/>`;
    parts.push(`<g opacity="0">${shape}${drift}${fade}</g>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">${parts.join('')}</svg>`;
}

// ---------------------------------------------------------------------------------------------
// Emotes (SMIL motion)
// ---------------------------------------------------------------------------------------------

const MOTION: Record<EmoteMotion, { dur: number }> = {
  bounce: { dur: 0.9 },
  wobble: { dur: 1.1 },
  tilt: { dur: 1.8 },
  spin: { dur: 3.2 },
  pulse: { dur: 1 },
  float: { dur: 1.8 },
  shake: { dur: 0.36 },
  pop: { dur: 1.2 },
};

const SPLINE = 'keySplines=".45 0 .55 1;.45 0 .55 1" calcMode="spline" keyTimes="0;.5;1"';

function motionSvg(l: EmoteLayer, inner: string): string {
  const m = l.motion;
  if (!m) return `<g>${inner}</g>`;
  const [cx, cy] = l.at ?? [12, 12];
  const dur = MOTION[m].dur;
  const begin = `begin="${-(l.delay ?? 0)}s" dur="${dur}s" repeatCount="indefinite"`;
  const rot = (values: string, extra = SPLINE) => `<g>${inner}<animateTransform attributeName="transform" type="rotate" values="${values}" ${extra} ${begin}/></g>`;
  const scaleAbout = (values: string, extraAnim = '') =>
    `<g transform="translate(${cx} ${cy})"><g><animateTransform attributeName="transform" type="scale" values="${values}" ${SPLINE} ${begin}/>${extraAnim}<g transform="translate(${-cx} ${-cy})">${inner}</g></g></g>`;
  switch (m) {
    case 'bounce':
      return `<g>${inner}<animateTransform attributeName="transform" type="translate" values="0 0;0 -1.8;0 0" ${SPLINE} ${begin}/></g>`;
    case 'wobble':
      return rot(`-11 ${cx} ${cy};11 ${cx} ${cy};-11 ${cx} ${cy}`);
    case 'tilt':
      return rot(`0 ${cx} ${cy};-13 ${cx} ${cy};0 ${cx} ${cy}`);
    case 'spin':
      return rot(`0 ${cx} ${cy};360 ${cx} ${cy}`, '');
    case 'pulse':
      return scaleAbout('1;1.14;1');
    case 'shake':
      return `<g>${inner}<animateTransform attributeName="transform" type="translate" values="-0.7 0;0.7 0;-0.7 0" ${SPLINE} ${begin}/></g>`;
    case 'float':
      return `<g>${inner}<animateTransform attributeName="transform" type="translate" values="0 1.2;0 -1.6;0 1.2" ${SPLINE} ${begin}/><animate attributeName="opacity" values="0.35;1;0.35" ${SPLINE} ${begin}/></g>`;
    case 'pop':
      return scaleAbout('0.82;1.18;0.82', `<animate attributeName="opacity" values="0.6;1;0.6" ${SPLINE} ${begin}/>`);
  }
}

function emoteSvg(id: string, p: Paints, animate: boolean): string | null {
  const e = EMOTES[id];
  if (!e) return null;
  const body = e.layers.map((l) => (animate ? motionSvg(l, shapesToSvg(l.shapes, p)) : `<g>${shapesToSvg(l.shapes, p)}</g>`)).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -3 28 28" overflow="visible">${body}</svg>`;
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
   * `fx` is the ambient particle layer on a clear background. Null for other collections.
   */
  layer?: 'tint' | 'fx';
  /**
   * Backdrops (A18.9.4): the age whose half of the lane the preview shows (default Stone). Without
   * `layer` a backdrop is a painted still of that half (a PNG, see {@link cosmeticImageUrl});
   * `layer: 'fx'` is its weather as an animated SVG to lay over it.
   */
  age?: AgeId;
  /** Backdrops: the small still for a collection tile (the sky-heavy crop, painted small). */
  thumb?: boolean;
  /** Backdrops: only a still already painted, else null (the screens paint tiles one per frame). */
  cached?: boolean;
}

/** SVG markup for a cosmetic key (`nationalFlag.dk`), or null when there is no art for it. */
export function cosmeticSvg(key: string, o: CosmeticSvgOptions = {}): string | null {
  const k = parseCosmeticKey(key);
  if (!k) return null;
  const p: Paints = { team: o.team ?? PREVIEW_TEAM };
  if (o.layer === 'fx' && k.collection === 'backdrop') return backdropWeatherSvg(key, o.animate ?? true);
  if (o.layer) return k.collection === 'baseSkin' ? baseSkinLayerSvg(k.id, o.layer, o.animate ?? true) : null;
  switch (k.collection) {
    case 'nationalFlag':
    case 'baseFlag':
      return flagSvg(k.collection, k.id, p);
    case 'decoration':
      return decorationSvg(k.id, p);
    case 'emote':
      return emoteSvg(k.id, p, o.animate ?? true);
    case 'quote':
      return quoteSvg();
    case 'baseSkin': {
      const shapes = baseSkinShapes(k.id);
      return shapes ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 48">${shapesToSvg(shapes, p)}</svg>` : null;
    }
    case 'backdrop':
      // the emblem; the screens show the painted still (a PNG, `cosmeticImageUrl`) when they can
      return backdropIconSvg(k.id);
    case 'avatar':
      return null;
  }
}

/** The SVG as a data URL for an `<img>` (each image keeps its own ids and animations). */
export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** `cosmeticSvg` as a data URL, cached per key, team and motion. */
const urlCache = new Map<string, string | null>();
export function cosmeticImageUrl(key: string, o: CosmeticSvgOptions = {}): string | null {
  // A backdrop's still is painted by the same painters the lane uses (cached per age and skin there)
  if (!o.layer && key.startsWith('backdrop.')) {
    const still = backdropPreviewUrl(key === 'backdrop.classic' ? null : key, o.age ?? 'stone', { thumb: !!o.thumb, cachedOnly: !!o.cached });
    if (still || o.cached) return still;
  }
  const ck = `${key}|${o.team ?? PREVIEW_TEAM}|${o.animate ?? true}|${o.layer ?? ''}`;
  let u = urlCache.get(ck);
  if (u === undefined) {
    const svg = cosmeticSvg(key, o);
    u = svg ? svgDataUrl(svg) : null;
    if (urlCache.size > 600) urlCache.clear();
    urlCache.set(ck, u);
  }
  return u;
}

/** The base skin art (tint, trim, particles), or null. */
export function baseSkinArt(key: string | null | undefined) {
  const k = key ? parseCosmeticKey(key) : null;
  return k && k.collection === 'baseSkin' ? (BASE_SKINS[k.id] ?? null) : null;
}

export { DECORATIONS, DECO_W, DECO_H, EMOTES, NATIONAL_FLAGS, BASE_FLAGS, BASE_SKINS, FLAG_W, FLAG_H };
