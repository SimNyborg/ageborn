/**
 * Backdrop skins (DESIGN A18.9.4 "Backdrops", owner request 2026-09-30): themed variants of the
 * split-age backdrop that a player equips for their half of the battlefield (`backdrop.<id>`).
 *
 * A theme never replaces an age's landmarks: it re-grades the age's own layers so the age still
 * reads at a glance (a Winterfall castle is still a castle), and adds
 *
 * - **palette:** a sky gradient mixed over the age's sky, a horizon glow and a colour grade over the
 *   far and mid silhouettes (kept desaturated and low contrast, A11: backdrops never compete with the
 *   team colours or the units);
 * - **sky:** a sun, moon, harvest moon or eclipse, stars, aurora ribbons;
 * - **props:** snow on every top edge, blossom or autumn speckles along the tree lines, festival
 *   lights along the rooftops (the rim of each silhouette, so they fit every age's shapes);
 * - **weather:** snow, rain with distant lightning, petals, leaves, embers, sky lanterns, fireflies
 *   or motes, drawn behind the lane (never over units) by the backdrop view.
 *
 * Everything is code-drawn at bake time on top of the age's layer textures (one extra texture per
 * layer, age and theme), so the per-frame cost is only the weather particles. Presentation only: the
 * sim never sees a theme, so a backdrop can never change balance (B5).
 */
import type { AgeId } from '@/contracts/ids';
import { mix, toCss } from '../palette';
import { part } from '../parts/registry';
import { blob, ellipse, join, rrect } from '../svg';
import { mulberry32 } from '@/core/rng';
import type { Ctx2D, LayerFrame } from './sky';

export type BackdropWeather = 'none' | 'snow' | 'rain' | 'petals' | 'leaves' | 'embers' | 'lanterns' | 'fireflies' | 'motes' | 'sparkles';
export type BackdropRim = 'none' | 'snow' | 'blossom' | 'autumn' | 'lights';
export type Celestial = 'keep' | 'sun' | 'moon' | 'harvestMoon' | 'eclipse' | 'none';

export interface BackdropTheme {
  /** Sky gradient over the age's own sky: top and horizon colour, and how much of it (0..1). */
  skyTop: number;
  skyBottom: number;
  skyMix: number;
  /** A soft glow along the horizon (the light of the theme), and its strength. */
  glow: number;
  glowAlpha: number;
  /** Colour grade over the far and mid silhouettes (source-atop) and its strength (0..1). */
  grade: number;
  gradeMix: number;
  /** The mid layer gets a little less of the grade (it sits nearer, closer to the lane's own light). */
  midGradeScale: number;
  celestial: Celestial;
  celestialColor: number;
  /** Where the sun or moon sits (world lu); the age's sun when absent. */
  celestialAt?: { x: number; y: number; r: number };
  /** Painted stars in the upper sky. */
  stars: number;
  /** Aurora ribbons across the upper sky. */
  aurora: boolean;
  /** A prop along every top edge of the far and mid silhouettes. */
  rim: BackdropRim;
  rimColor: number;
  weather: BackdropWeather;
  weatherColor: number;
  /** Particles per second per 1,000 lu of visible half (before the Lite halving). */
  weatherRate: number;
  /** Distant lightning: a soft sky flash every few seconds (never a strobe). */
  lightning: boolean;
  /** Drifting cloud tint. */
  cloudTint: number;
  /** The UI swatch and tile edge colour. */
  accent: number;
  /** A night sky: a scene's window and lantern lights come on (PLAN 2b `lights`). */
  night?: boolean;
  /** How strong the rim prop paints (1 by default; `themeForScene` lowers it on scenes that take less grade). */
  rimAlpha?: number;
}

/** Every backdrop skin, by item id (`backdrop.<id>` in the content). */
export const BACKDROP_THEMES: Readonly<Record<string, BackdropTheme>> = {
  golden_dusk: {
    skyTop: 0x5c5876,
    skyBottom: 0xe9c6a2,
    skyMix: 0.82,
    glow: 0xf2cfa6,
    glowAlpha: 0.34,
    grade: 0x5a4a66,
    gradeMix: 0.42,
    midGradeScale: 0.75,
    celestial: 'sun',
    celestialColor: 0xffe2b8,
    celestialAt: { x: 1040, y: -215, r: 52 },
    stars: 0,
    aurora: false,
    rim: 'none',
    rimColor: 0xf6d6ac,
    weather: 'motes',
    weatherColor: 0xffe6bc,
    weatherRate: 4,
    lightning: false,
    cloudTint: 0xe6bfae,
    accent: 0xe0a878,
  },
  harvest: {
    skyTop: 0x3e4662,
    skyBottom: 0xd6ae88,
    skyMix: 0.78,
    glow: 0xe8c08e,
    glowAlpha: 0.26,
    grade: 0x6a5646,
    gradeMix: 0.36,
    midGradeScale: 0.85,
    celestial: 'harvestMoon',
    celestialColor: 0xf4d4a0,
    celestialAt: { x: 380, y: -240, r: 58 },
    stars: 30,
    aurora: false,
    rim: 'autumn',
    rimColor: 0xc98a4a,
    weather: 'leaves',
    weatherColor: 0xc8864a,
    weatherRate: 5,
    lightning: false,
    cloudTint: 0xc8a894,
    accent: 0xc88a4a,
  },
  winterfall: {
    skyTop: 0x9fb0c2,
    skyBottom: 0xe8edf1,
    skyMix: 0.78,
    glow: 0xf4f7fa,
    glowAlpha: 0.3,
    grade: 0xe4ebf1,
    gradeMix: 0.46,
    midGradeScale: 1.25,
    celestial: 'keep',
    celestialColor: 0xf6f8ff,
    stars: 0,
    aurora: false,
    rim: 'snow',
    rimColor: 0xf7fafc,
    weather: 'snow',
    weatherColor: 0xffffff,
    weatherRate: 22,
    lightning: false,
    cloudTint: 0xf2f4f7,
    accent: 0xa9c4dc,
  },
  blossom: {
    skyTop: 0xa8b8cc,
    skyBottom: 0xf2e4e4,
    skyMix: 0.62,
    glow: 0xf6e2e6,
    glowAlpha: 0.28,
    grade: 0xcfb0bc,
    gradeMix: 0.2,
    midGradeScale: 1,
    celestial: 'keep',
    celestialColor: 0xfff4ec,
    stars: 0,
    aurora: false,
    rim: 'blossom',
    rimColor: 0xf0b8cc,
    weather: 'petals',
    weatherColor: 0xf4c4d4,
    weatherRate: 8,
    lightning: false,
    cloudTint: 0xf8eeee,
    accent: 0xe8a8c0,
  },
  starry_night: {
    skyTop: 0x121831,
    skyBottom: 0x404a66,
    skyMix: 0.93,
    glow: 0x5a6a8e,
    glowAlpha: 0.22,
    grade: 0x1a2140,
    gradeMix: 0.56,
    midGradeScale: 0.8,
    celestial: 'moon',
    celestialColor: 0xf2f0e4,
    celestialAt: { x: 860, y: -250, r: 30 },
    stars: 160,
    aurora: false,
    rim: 'none',
    rimColor: 0xffffff,
    weather: 'fireflies',
    weatherColor: 0xe6f0a8,
    weatherRate: 3,
    lightning: false,
    cloudTint: 0x4a526e,
    accent: 0x6a78b0,
    night: true,
  },
  lantern_festival: {
    skyTop: 0x28223e,
    skyBottom: 0x76586c,
    skyMix: 0.9,
    glow: 0xd4a286,
    glowAlpha: 0.24,
    grade: 0x2c2640,
    gradeMix: 0.52,
    midGradeScale: 0.8,
    celestial: 'none',
    celestialColor: 0xffffff,
    stars: 70,
    aurora: false,
    rim: 'lights',
    rimColor: 0xffd08a,
    weather: 'lanterns',
    weatherColor: 0xf2b060,
    weatherRate: 1.6,
    lightning: false,
    cloudTint: 0x5a4a62,
    accent: 0xe0a060,
    night: true,
  },
  thunderstorm: {
    skyTop: 0x394250,
    skyBottom: 0x7a828c,
    skyMix: 0.9,
    glow: 0x9aa4ae,
    glowAlpha: 0.16,
    grade: 0x38404a,
    gradeMix: 0.5,
    midGradeScale: 0.85,
    celestial: 'none',
    celestialColor: 0xffffff,
    stars: 0,
    aurora: false,
    rim: 'none',
    rimColor: 0xffffff,
    weather: 'rain',
    weatherColor: 0xc4d0dc,
    weatherRate: 60,
    lightning: true,
    cloudTint: 0x5c646e,
    accent: 0x7a8898,
  },
  ember_sky: {
    skyTop: 0x2a1e24,
    skyBottom: 0x7a5c54,
    skyMix: 0.86,
    glow: 0xb0846c,
    glowAlpha: 0.26,
    grade: 0x382a2c,
    gradeMix: 0.5,
    midGradeScale: 0.85,
    celestial: 'sun',
    celestialColor: 0xd89a78,
    celestialAt: { x: 700, y: -235, r: 38 },
    stars: 0,
    aurora: false,
    rim: 'none',
    rimColor: 0xffffff,
    weather: 'embers',
    weatherColor: 0xf0a868,
    weatherRate: 10,
    lightning: false,
    cloudTint: 0x6a5454,
    accent: 0xb86a4a,
  },
  northern_lights: {
    skyTop: 0x0f1a2a,
    skyBottom: 0x2c4658,
    skyMix: 0.93,
    glow: 0x4a8a88,
    glowAlpha: 0.2,
    grade: 0x16222e,
    gradeMix: 0.54,
    midGradeScale: 0.8,
    celestial: 'none',
    celestialColor: 0xffffff,
    stars: 130,
    aurora: true,
    rim: 'snow',
    rimColor: 0xdce8ee,
    weather: 'snow',
    weatherColor: 0xeef6fa,
    weatherRate: 6,
    lightning: false,
    cloudTint: 0x34485a,
    accent: 0x5ad0a8,
    night: true,
  },
  eclipse: {
    skyTop: 0x191427,
    skyBottom: 0x564866,
    skyMix: 0.92,
    glow: 0x8a78a0,
    glowAlpha: 0.22,
    grade: 0x211a30,
    gradeMix: 0.54,
    midGradeScale: 0.8,
    celestial: 'eclipse',
    celestialColor: 0xfff2dc,
    celestialAt: { x: 820, y: -255, r: 40 },
    stars: 90,
    aurora: false,
    rim: 'none',
    rimColor: 0xffffff,
    weather: 'sparkles',
    weatherColor: 0xe8dcff,
    weatherRate: 4,
    lightning: false,
    cloudTint: 0x4a4260,
    accent: 0x9a86c8,
    night: true,
  },
};

/** The theme of a backdrop key (`backdrop.winterfall`) or bare id, or null (classic sky). */
export function backdropTheme(key: string | null | undefined): BackdropTheme | null {
  if (!key) return null;
  const id = key.startsWith('backdrop.') ? key.slice(9) : key;
  return BACKDROP_THEMES[id] ?? null;
}

/** True for a night sky theme (a scene's lights come on under it). */
export function isNightSky(key: string | null | undefined): boolean {
  return backdropTheme(key)?.night === true;
}

/**
 * The theme as a space scene shows it (PLAN 2b hint `weather: 'space'`): snow becomes ice motes, rain
 * becomes rare meteor streaks without lightning, petals and leaves become sparkles; the rest stays.
 */
export function spaceWeather(th: BackdropTheme): BackdropTheme {
  switch (th.weather) {
    case 'snow':
      return { ...th, weather: 'motes', weatherColor: 0xdcecf6, weatherRate: Math.max(3, th.weatherRate * 0.3) };
    case 'rain':
      return { ...th, weather: 'rain', weatherColor: 0xf2f0ff, weatherRate: 2.5, lightning: false };
    case 'petals':
    case 'leaves':
      return { ...th, weather: 'sparkles', weatherColor: 0xf2e6ff, weatherRate: Math.max(3, th.weatherRate * 0.6) };
    default:
      return th;
  }
}

/** The share of a theme's grade the back strip takes (review 1: it sat under the full far grade). */
export const BACK_GRADE_SCALE = 0.5;

/** Relative luminance of a colour, 0..1 (sRGB weights on the 8-bit channels; enough for a blend factor). */
function lightness(c: number): number {
  return (0.2126 * ((c >> 16) & 255) + 0.7152 * ((c >> 8) & 255) + 0.0722 * (c & 255)) / 255;
}

/**
 * A sky theme as a scene wears it on one layer (PLAN 2b hints, review 1), or null when the layer keeps
 * its own look:
 * - a space scene (`weather: 'space'`) keeps its own sky (stars and nebula, never a day sky over space);
 * - `skyGrade` < 1 tones a light theme down on a scene that is already pale or dark: the sky gradient and
 *   glow, the far and mid grade and the rim prop scale toward `skyGrade` by the theme's lightness, so
 *   Winterfall stops washing Bronze and Cosmic white while night themes (dark grades) keep almost their
 *   full strength;
 * - the back strip takes half the grade ({@link BACK_GRADE_SCALE}): it is already hazed into the sky.
 * The lane (`backdropView`) and the Customize stills (`backdropPreview`) both bake through this, so a
 * preview still matches the lane.
 */
export function themeForScene(th: BackdropTheme, hints: { skyGrade?: number; weather?: 'ground' | 'space' } | null | undefined, kind: 'sky' | 'back' | 'far' | 'mid'): BackdropTheme | null {
  if (kind === 'sky' && hints?.weather === 'space') return null;
  const g = Math.max(0, Math.min(1, hints?.skyGrade ?? 1));
  const light = kind === 'sky' ? lightness(mix(th.skyTop, th.skyBottom, 0.5)) : lightness(th.grade);
  const k = (1 - (1 - g) * light) * (kind === 'back' ? BACK_GRADE_SCALE : 1);
  if (k >= 0.999) return th;
  if (kind === 'sky') return { ...th, skyMix: th.skyMix * k, glowAlpha: th.glowAlpha * k };
  return { ...th, gradeMix: th.gradeMix * k, rimAlpha: (th.rimAlpha ?? 1) * (0.45 + 0.55 * k) };
}

/** A short cache key part for the way a scene takes themes (`themeForScene`'s inputs besides the theme). */
export function sceneGradeKey(hints: { skyGrade?: number; weather?: 'ground' | 'space' } | null | undefined): string {
  return `${hints?.skyGrade ?? 1}${hints?.weather === 'space' ? 's' : ''}`;
}

/** The bare id of a backdrop key, or null. */
export function backdropId(key: string | null | undefined): string | null {
  if (!key) return null;
  const id = key.startsWith('backdrop.') ? key.slice(9) : key;
  return BACKDROP_THEMES[id] ? id : null;
}

// ---------------------------------------------------------------------------------------------
// Bake-time painting: a themed copy of one layer texture
// ---------------------------------------------------------------------------------------------

function scratch(w: number, h: number): { c: HTMLCanvasElement; x: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = Math.max(1, w);
  c.height = Math.max(1, h);
  const x = c.getContext('2d');
  return x ? { c, x } : null;
}

/** Seeded per theme, layer and age, so every match paints the same props. */
function seedFor(id: string, kind: string, age: AgeId): number {
  let h = 2166136261;
  for (const ch of `${id}|${kind}|${age}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/**
 * Paints the theme over the sky layer already on `ctx` (the whole canvas is the frame `f`): the
 * theme's gradient, glow, stars, aurora and its sun or moon (`celestial: false` leaves the sun or moon
 * out, for a scene whose own sky object stays).
 */
export function themeSky(ctx: Ctx2D, id: string, age: AgeId, th: BackdropTheme, f: LayerFrame, o: { celestial?: boolean } = {}): void {
  const W = f.width * f.pxPerLu;
  const H = f.height * f.pxPerLu;
  const k = f.pxPerLu;
  const toY = (y: number) => (y - f.yTop) * k;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, toCss(th.skyTop, th.skyMix));
  g.addColorStop(0.55, toCss(mix(th.skyTop, th.skyBottom, 0.55), th.skyMix));
  g.addColorStop(0.9, toCss(th.skyBottom, th.skyMix));
  g.addColorStop(1, toCss(mix(th.skyBottom, th.glow, 0.5), th.skyMix));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // the theme's light along the horizon
  const hg = ctx.createLinearGradient(0, toY(-420), 0, H);
  hg.addColorStop(0, toCss(th.glow, 0));
  hg.addColorStop(1, toCss(th.glow, th.glowAlpha));
  ctx.fillStyle = hg;
  ctx.fillRect(0, toY(-420), W, H - toY(-420));
  const rng = mulberry32(seedFor(id, 'sky', age));
  // stars: denser and smaller up high, a few bright ones with a soft cross
  for (let i = 0; i < th.stars; i++) {
    const x = rng.next() * W;
    // spread over the whole sky, down to just above the hills (phones see only the lowest 290 lu)
    const yLu = -770 + rng.next() * 690;
    const y = toY(yLu);
    const bright = rng.next();
    const r = Math.max(0.5, (bright > 0.93 ? 1.6 : 0.9) * k * 2.2);
    ctx.fillStyle = toCss(0xfaf6ff, 0.35 + bright * 0.55);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    if (bright > 0.96) {
      ctx.fillStyle = toCss(0xfaf6ff, 0.35);
      ctx.fillRect(x - r * 4, y - r * 0.25, r * 8, r * 0.5);
      ctx.fillRect(x - r * 0.25, y - r * 4, r * 0.5, r * 8);
    }
  }
  if (th.aurora) paintAurora(ctx, f, rng);
  // a scene with its own big sky object (hint `celestial: 'own'`) keeps it: no theme sun or moon
  if (o.celestial !== false) paintCelestial(ctx, th, f);
  ctx.restore();
}

/** Three soft curtains of light (mint, teal and a violet edge), fading at top and bottom. */
function paintAurora(ctx: Ctx2D, f: LayerFrame, rng: { next(): number }): void {
  const k = f.pxPerLu;
  const W = f.width * k;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const bands: [number, number, number, number][] = [
    [0x5ae8b0, -300, 150, 0.3],
    [0x48c8c8, -250, 110, 0.24],
    [0xa888e8, -420, 110, 0.12],
  ];
  for (const [color, baseY, height, alpha] of bands) {
    const phase = rng.next() * Math.PI * 2;
    // one px columns, no overlap (overlapping columns add up under 'lighter' and read as stripes)
    const step = 1;
    for (let x = 0; x < W; x += step) {
      const u = x / W;
      const wave = Math.sin(u * 7 + phase) * 40 + Math.sin(u * 17 + phase * 2) * 14;
      const top = (baseY + wave - f.yTop) * k;
      const h = height * (0.65 + 0.35 * Math.sin(u * 11 + phase)) * k;
      const gr = ctx.createLinearGradient(0, top, 0, top + h);
      gr.addColorStop(0, toCss(color, 0));
      gr.addColorStop(0.35, toCss(color, alpha));
      gr.addColorStop(1, toCss(color, 0));
      ctx.fillStyle = gr;
      ctx.fillRect(x, top, step, h);
    }
  }
  ctx.restore();
}

function paintCelestial(ctx: Ctx2D, th: BackdropTheme, f: LayerFrame): void {
  if (th.celestial === 'keep' || th.celestial === 'none') return;
  const k = f.pxPerLu;
  // phones show about 290 lu of sky over the lane (A17.7), so every sky feature sits low enough to show
  const at = th.celestialAt ?? { x: 980, y: -250, r: 36 };
  const x = (at.x - f.x0) * k;
  const y = (at.y - f.yTop) * k;
  const r = at.r * k;
  const c = th.celestialColor;
  const halo = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * (th.celestial === 'eclipse' ? 3.4 : 5));
  halo.addColorStop(0, toCss(c, th.celestial === 'moon' ? 0.28 : 0.42));
  halo.addColorStop(1, toCss(c, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(x - r * 6, y - r * 6, r * 12, r * 12);
  if (th.celestial === 'eclipse') {
    // a corona ring around a dark disc
    ctx.strokeStyle = toCss(c, 0.85);
    ctx.lineWidth = Math.max(1, r * 0.16);
    ctx.beginPath();
    ctx.arc(x, y, r * 1.04, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = toCss(0x120e1c, 1);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = toCss(c, 0.9);
    ctx.beginPath();
    ctx.arc(x + r * 0.72, y - r * 0.66, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.fillStyle = toCss(c, 0.96);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  if (th.celestial === 'moon') {
    // a crescent: the sky colour bites into the disc
    ctx.fillStyle = toCss(th.skyTop, 0.92);
    ctx.beginPath();
    ctx.arc(x + r * 0.42, y - r * 0.18, r * 0.9, 0, Math.PI * 2);
    ctx.fill();
  } else if (th.celestial === 'harvestMoon') {
    // soft maria on a big warm moon
    ctx.fillStyle = toCss(mix(c, 0x8a6a4a, 0.4), 0.35);
    for (const [dx, dy, rr] of [
      [-0.3, -0.2, 0.28],
      [0.25, 0.1, 0.22],
      [-0.05, 0.38, 0.16],
    ] as const) {
      ctx.beginPath();
      ctx.arc(x + dx * r, y + dy * r, rr * r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = toCss(0xffffff, 0.5);
    ctx.beginPath();
    ctx.arc(x - r * 0.2, y - r * 0.2, r * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Re-grades a far or mid silhouette layer already on `canvas` (the whole canvas is the frame `f`):
 * the colour grade over every shape, then the theme's prop along every top edge.
 */
export function themeLayer(canvas: HTMLCanvasElement, ctx: Ctx2D, id: string, kind: 'far' | 'mid', age: AgeId, th: BackdropTheme, f: LayerFrame): void {
  const W = canvas.width;
  const H = canvas.height;
  const k = f.pxPerLu;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  const amount = th.gradeMix * (kind === 'mid' ? th.midGradeScale : 1);
  // a vertical grade: full strength at the top, a little lighter at the foot (keeps depth)
  const gr = ctx.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, toCss(th.grade, Math.min(1, amount * 1.1)));
  gr.addColorStop(1, toCss(mix(th.grade, th.skyBottom, 0.35), amount * 0.85));
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  if (th.rim !== 'none') paintRim(canvas, ctx, id, kind, age, th, k);
  if (th.aurora && kind === 'far') paintAuroraGlow(ctx, id, age, W, f);
}

/**
 * Aurora light on the far silhouettes (review 4): on a phone the far hills fill most of the little sky
 * a battle shows, so the curtains also light the hilltops in soft mint waves, fading downhill. Only
 * where the layer is opaque (source-atop), never over the sky.
 */
function paintAuroraGlow(ctx: Ctx2D, id: string, age: AgeId, W: number, f: LayerFrame): void {
  const k = f.pxPerLu;
  const rng = mulberry32(seedFor(id, 'glow', age));
  const phase = rng.next() * Math.PI * 2;
  const top = (-400 - f.yTop) * k;
  const bottom = (-110 - f.yTop) * k;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  const step = 2;
  for (let x = 0; x < W; x += step) {
    const u = x / W;
    const s = 0.4 + 0.6 * Math.abs(Math.sin(u * 9 + phase) * Math.sin(u * 3.3 + phase * 0.7));
    const g = ctx.createLinearGradient(0, top, 0, bottom);
    g.addColorStop(0, toCss(0x7af2c4, 0.8 * s));
    g.addColorStop(0.45, toCss(0x48c8c8, 0.34 * s));
    g.addColorStop(1, toCss(0x48c8c8, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x, top, step, bottom - top);
  }
  ctx.restore();
}

/**
 * The prop along every top edge: the silhouette minus itself shifted down (as `finishLayer` lights
 * the rims), filled with snow, speckled with blossom or autumn leaves, or dotted with warm lights.
 */
function paintRim(canvas: HTMLCanvasElement, ctx: Ctx2D, id: string, kind: 'far' | 'mid', age: AgeId, th: BackdropTheme, k: number): void {
  const W = canvas.width;
  const H = canvas.height;
  const depthLu = th.rim === 'snow' ? (kind === 'far' ? 11 : 8) : th.rim === 'lights' ? 4 : 9;
  const dy = Math.max(1, Math.round(depthLu * k));
  const s = scratch(W, H);
  if (!s) return;
  s.x.drawImage(canvas, 0, 0);
  s.x.globalCompositeOperation = 'destination-out';
  s.x.drawImage(canvas, 0, dy);
  s.x.globalCompositeOperation = 'source-in';
  const rimAlpha = th.rimAlpha ?? 1;
  if (th.rim === 'snow') {
    s.x.fillStyle = toCss(th.rimColor, (kind === 'far' ? 0.78 : 0.9) * rimAlpha);
    s.x.fillRect(0, 0, W, H);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(s.c, 0, 0);
    ctx.restore();
    return;
  }
  // speckles (blossom, autumn) or lights: a dot pattern clipped to the rim band
  const dots = scratch(W, H);
  if (!dots) return;
  const rng = mulberry32(seedFor(id, kind, age));
  const n = Math.round((W * H) / (th.rim === 'lights' ? 420 : 38));
  for (let i = 0; i < n; i++) {
    const x = rng.next() * W;
    const y = rng.next() * H;
    if (th.rim === 'lights') {
      const r = Math.max(0.8, k * (1.6 + rng.next() * 0.8));
      const glow = dots.x.createRadialGradient(x, y, 0, x, y, r * 3.2);
      glow.addColorStop(0, toCss(th.rimColor, 0.95));
      glow.addColorStop(0.35, toCss(th.rimColor, 0.55));
      glow.addColorStop(1, toCss(th.rimColor, 0));
      dots.x.fillStyle = glow;
      dots.x.fillRect(x - r * 3.2, y - r * 3.2, r * 6.4, r * 6.4);
    } else {
      const r = Math.max(0.9, k * (1.6 + rng.next() * 2));
      const c = rng.next() < 0.35 ? mix(th.rimColor, 0xffffff, 0.35) : rng.next() < 0.5 ? mix(th.rimColor, 0x6a4a3a, 0.2) : th.rimColor;
      dots.x.fillStyle = toCss(c, 0.9);
      dots.x.beginPath();
      dots.x.arc(x, y, r, 0, Math.PI * 2);
      dots.x.fill();
    }
  }
  s.x.drawImage(dots.c, 0, 0);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (th.rim === 'lights') ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.min(1, rimAlpha);
  ctx.drawImage(s.c, 0, 0);
  ctx.restore();
}

/** How strongly the ground takes a theme's grade, next to the far hills (units walk on it: keep it light). */
export const GROUND_GRADE_SCALE = 0.42;

/**
 * Re-grades the arena ground already on `canvas` for a theme (review 11: a themed sky over a daylight
 * lane looked pasted on). A lighter grade than the hills, so units keep their contrast; snow themes
 * frost the grass edge and lay a few soft drifts, blossom and autumn scatter a few petals or leaves.
 * The lane shows it on the themed half only (backdropView, through the seam blend).
 */
export function themeGround(canvas: HTMLCanvasElement, ctx: Ctx2D, id: string, th: BackdropTheme, f: LayerFrame): void {
  const W = canvas.width;
  const H = canvas.height;
  const k = f.pxPerLu;
  const toY = (y: number) => (y - f.yTop) * k;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  const amount = th.gradeMix * GROUND_GRADE_SCALE;
  const gr = ctx.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, toCss(th.grade, amount * 1.15));
  gr.addColorStop(1, toCss(mix(th.grade, th.skyBottom, 0.3), amount * 0.8));
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, W, H);
  const rng = mulberry32(seedFor(id, 'ground', 'stone'));
  if (th.rim === 'snow') {
    // frost along the grass edge, fading into the lane
    const fr = ctx.createLinearGradient(0, toY(-40), 0, toY(26));
    fr.addColorStop(0, toCss(th.rimColor, 0.8));
    fr.addColorStop(0.5, toCss(th.rimColor, 0.42));
    fr.addColorStop(1, toCss(th.rimColor, 0));
    ctx.fillStyle = fr;
    ctx.fillRect(0, toY(-40), W, toY(26) - toY(-40));
    // soft drifts on the lane, low and wide, never a hard white sheet
    for (let i = 0; i < Math.round(W / (140 * k)); i++) {
      const x = rng.next() * W;
      const y = toY(20 + rng.next() * 190);
      const rx = (40 + rng.next() * 90) * k;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
      g.addColorStop(0, toCss(th.rimColor, 0.34));
      g.addColorStop(1, toCss(th.rimColor, 0));
      ctx.fillStyle = g;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, 0.28);
      ctx.translate(-x, -y);
      ctx.fillRect(x - rx, y - rx, rx * 2, rx * 2);
      ctx.restore();
    }
  } else if (th.rim === 'blossom' || th.rim === 'autumn') {
    const n = Math.round((W * (toY(240) - toY(-30))) / (900 * Math.max(1, k * k)));
    for (let i = 0; i < n; i++) {
      const x = rng.next() * W;
      const y = toY(-30 + rng.next() * 270);
      const r = Math.max(0.8, k * (1.4 + rng.next() * 1.6));
      const c = th.rim === 'autumn' && rng.next() < 0.4 ? mix(th.rimColor, 0x6a3a1a, 0.35) : th.rimColor;
      ctx.fillStyle = toCss(c, 0.75);
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.5, r, rng.next() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Weather sprites (baked once through the part baker, like every backdrop part)
// ---------------------------------------------------------------------------------------------

part('bd.petal', [{ d: ellipse(0, 0, 3.2, 1.7), zone: 'white', line: 0, shade: false, light: false }]);
part('bd.leaf', [{ d: join(blob([-4, 0, -1.5, -2, 2.5, -1.6, 4.2, 0, 2.5, 1.6, -1.5, 2], 0.7)), zone: 'white', line: 0, shade: false, light: false }]);
part('bd.lantern', [
  { d: ellipse(0, -1, 9, 11), zone: 'white', line: 0, alpha: 0.18, shade: false, light: false },
  { d: rrect(-3.4, -6.4, 6.8, 9.4, 2.6), zone: 'white', line: 0, shade: false, light: false },
  { d: rrect(-2.4, 3, 4.8, 1.4, 0.6), zone: 'white', line: 0, alpha: 0.7, shade: false, light: false },
]);
part('bd.streak', [{ d: rrect(-0.35, -9, 0.7, 18, 0.35), zone: 'white', line: 0, shade: false, light: false }]);
