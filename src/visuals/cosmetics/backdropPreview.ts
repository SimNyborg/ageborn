/**
 * Backdrop skin previews for the screens (DESIGN A18.9.4 "Backdrops"): the Customize live preview
 * and the collection tiles show the real thing, not a mock-up. The same painters and theme passes the
 * battle bakes (`backdrops/sky|silhouettes|ground|lighting|themes`) paint a small crop of one half of
 * the lane into a canvas; the theme's weather comes as a separate animated SVG layer (`fx`), so the
 * preview moves like the lane and Reduce motion can hold it still.
 *
 * The UI may not import the visuals (B2): the app injects these through `cosmeticImageUrl`. Without a
 * DOM (tests) everything returns null and the screens show their placeholder.
 */
import type { AgeId } from '@/contracts/ids';
import { mulberry32 } from '@/core/rng';
import { GROUND_FRAME, MID_FRAME, paintGround, paintMid } from '../backdrops/ground';
import { finishLayer } from '../backdrops/lighting';
import { FAR_FRAME, paintFar } from '../backdrops/silhouettes';
import { paintSky, SKY_FRAME, type LayerFrame } from '../backdrops/sky';
import { backdropId, BACKDROP_THEMES, themeLayer, themeSky, type BackdropTheme } from '../backdrops/themes';
import { toCss } from '../palette';

/** The crop of the lane a preview shows (world lu): your base's side of the lane, sky to ground. */
const CROP = { x0: -60, x1: 1080, y0: -520, y1: 36 };
/** Preview resolution: px per lu. */
const K = 0.46;
export const PREVIEW_W = Math.round((CROP.x1 - CROP.x0) * K);
export const PREVIEW_H = Math.round((CROP.y1 - CROP.y0) * K);
/**
 * A collection tile's crop (review 6): the part of the half where a theme differs most (the sky with
 * its sun, moon, eclipse or aurora over the hills), about 16:9, painted small.
 */
const THUMB = { x0: 170, x1: 1080, y0: -470, y1: 36, k: 0.3 };
/** The mid-ground's multiply in the lane (backdropView `MID_LAYER_TINT`). */
const MID_TINT = '#dcdad6';

type Kind = 'sky' | 'far' | 'mid' | 'ground';
interface Layer {
  c: HTMLCanvasElement;
  f: LayerFrame;
}
type Layers = Record<Kind, Layer>;

const baseCache = new Map<AgeId, Layers>();
/** Themed layers of the last few age and theme pairs (a tile and the big preview share them). */
const themedCache = new Map<string, Layers>();
const urlCache = new Map<string, string | null>();

function canvasFor(f: LayerFrame): { c: HTMLCanvasElement; x: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(f.width * f.pxPerLu));
  c.height = Math.max(1, Math.ceil(f.height * f.pxPerLu));
  const x = c.getContext('2d');
  return x ? { c, x } : null;
}

function frame(f: LayerFrame): LayerFrame {
  return { ...f, pxPerLu: K };
}

/**
 * The part of a layer inside the preview's crop (x only: the full height keeps the painters' vertical
 * gradients exactly as the lane has them). Theming only this part is what keeps a still cheap.
 */
function cropX(src: HTMLCanvasElement, f: LayerFrame): Layer {
  const x0 = Math.max(f.x0, CROP.x0);
  const x1 = Math.min(f.x0 + f.width, CROP.x1);
  const out = canvasFor({ ...f, x0, width: x1 - x0 });
  if (!out) return { c: src, f };
  out.x.drawImage(src, -Math.round((x0 - f.x0) * K), 0);
  return { c: out.c, f: { ...f, x0, width: x1 - x0 } };
}

/** An age's classic layers at preview scale, painted once per age (the whole frame, as the lane). */
function baseLayers(age: AgeId): Layers | null {
  const hit = baseCache.get(age);
  if (hit) return hit;
  const sky = canvasFor(frame(SKY_FRAME));
  const far = canvasFor(frame(FAR_FRAME));
  const mid = canvasFor(frame(MID_FRAME));
  const ground = canvasFor(frame(GROUND_FRAME));
  if (!sky || !far || !mid || !ground) return null;
  paintSky(sky.x, age, frame(SKY_FRAME));
  paintFar(far.x, age, frame(FAR_FRAME));
  finishLayer(far.c, far.x, 'far', age, frame(FAR_FRAME));
  paintMid(mid.x, age, frame(MID_FRAME));
  finishLayer(mid.c, mid.x, 'mid', age, frame(MID_FRAME));
  paintGround(ground.x, 'tar_pits', frame(GROUND_FRAME));
  const out: Layers = {
    sky: cropX(sky.c, frame(SKY_FRAME)),
    far: cropX(far.c, frame(FAR_FRAME)),
    mid: cropX(mid.c, frame(MID_FRAME)),
    ground: cropX(ground.c, frame(GROUND_FRAME)),
  };
  baseCache.set(age, out);
  return out;
}

function copyOf(src: HTMLCanvasElement): { c: HTMLCanvasElement; x: CanvasRenderingContext2D } | null {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const x = c.getContext('2d');
  if (!x) return null;
  x.drawImage(src, 0, 0);
  return { c, x };
}

/** The age's layers wearing a theme (the classic ones for null), with the lane's mid-ground tint. */
function layersFor(age: AgeId, id: string | null): Layers | null {
  const base = baseLayers(age);
  if (!base) return null;
  const ck = `${age}|${id ?? 'classic'}`;
  const hit = themedCache.get(ck);
  if (hit) return hit;
  const th = id ? BACKDROP_THEMES[id] : undefined;
  const layer = (kind: 'sky' | 'far' | 'mid'): Layer => {
    const b = base[kind];
    if (!th || !id) return b;
    const copy = copyOf(b.c);
    if (!copy) return b;
    // the crop is narrower than the lane's sky: fewer stars, so they are as dense as in battle
    if (kind === 'sky') themeSky(copy.x, id, age, { ...th, stars: Math.round((th.stars * b.f.width) / SKY_FRAME.width) }, b.f);
    else themeLayer(copy.c, copy.x, id, kind, age, th, b.f);
    return { c: copy.c, f: b.f };
  };
  const midThemed = layer('mid');
  // the lane multiplies the mid-ground a little darker (readability of grey units, art review)
  const mid = copyOf(midThemed.c);
  if (mid) {
    mid.x.globalCompositeOperation = 'multiply';
    mid.x.fillStyle = MID_TINT;
    mid.x.fillRect(0, 0, mid.c.width, mid.c.height);
    mid.x.globalCompositeOperation = 'destination-in';
    mid.x.drawImage(midThemed.c, 0, 0);
  }
  const out: Layers = { sky: layer('sky'), far: layer('far'), mid: mid ? { c: mid.c, f: midThemed.f } : midThemed, ground: base.ground };
  themedCache.set(ck, out);
  // a few pairs only (an age's tiles are painted one after another, then the big preview)
  while (themedCache.size > 4) themedCache.delete(themedCache.keys().next().value!);
  return out;
}

/** Draws the layers into a crop of the lane at `k` px per lu. */
function compose(l: Layers, crop: { x0: number; x1: number; y0: number; y1: number }, k: number): HTMLCanvasElement | null {
  const out = canvasFor({ x0: crop.x0, width: crop.x1 - crop.x0, yTop: crop.y0, height: crop.y1 - crop.y0, pxPerLu: k });
  if (!out) return null;
  out.x.imageSmoothingQuality = 'high';
  for (const kind of ['sky', 'far', 'mid', 'ground'] as const) {
    const { c, f } = l[kind];
    out.x.drawImage(c, (f.x0 - crop.x0) * k, (f.yTop - crop.y0) * k, f.width * k, f.height * k);
  }
  return out.c;
}

/**
 * A still of your half of the lane in `age`, wearing the backdrop skin `key` (`backdrop.<id>`), or
 * the classic sky for null / `backdrop.classic`. A PNG data URL, cached per age, skin and size.
 * `thumb`: the small tile crop (review 6). `cachedOnly`: only a still already painted, else null
 * (the screens paint tiles one per frame and ask first).
 */
export function backdropPreviewUrl(key: string | null, age: AgeId, o: { thumb?: boolean; cachedOnly?: boolean } = {}): string | null {
  if (typeof document === 'undefined') return null;
  const id = backdropId(key);
  const ck = `${age}|${id ?? 'classic'}|${o.thumb ? 't' : 'p'}`;
  const cached = urlCache.get(ck);
  if (cached !== undefined || o.cachedOnly) return cached ?? null;
  const layers = layersFor(age, id);
  const out = layers ? (o.thumb ? compose(layers, THUMB, THUMB.k) : compose(layers, CROP, K)) : null;
  if (!out) return null;
  let url: string | null;
  try {
    url = out.toDataURL('image/png');
  } catch {
    url = null;
  }
  if (urlCache.size > 240) urlCache.clear();
  urlCache.set(ck, url);
  return url;
}

// ---------------------------------------------------------------------------------------------
// The weather layer as an animated SVG (the preview's motion)
// ---------------------------------------------------------------------------------------------

const VW = 240;
const VH = 128;
/** The ground line in the SVG's box (the crop's y = 0). */
const GROUND_Y = Math.round((-CROP.y0 / (CROP.y1 - CROP.y0)) * VH);

function particle(th: BackdropTheme, i: number, rnd: () => number, animate: boolean): string {
  const c = toCss(th.weatherColor);
  const x = rnd() * VW;
  const dur = (a: number, b: number) => (a + rnd() * (b - a)).toFixed(2);
  const begin = `-${(rnd() * 12).toFixed(2)}s`;
  const move = (dx: number, dy: number, d: string, extra = '') =>
    animate ? `<animateTransform attributeName="transform" type="translate" from="0 0" to="${dx} ${dy}" dur="${d}s" begin="${begin}" repeatCount="indefinite"/>${extra}` : '';
  const blink = (d: string) => (animate ? `<animate attributeName="opacity" values="0;1;0" dur="${d}s" begin="${begin}" repeatCount="indefinite"/>` : '');
  switch (th.weather) {
    case 'snow': {
      const y = animate ? -6 : rnd() * GROUND_Y;
      return `<g>${move(-6 + rnd() * 12, GROUND_Y + 8, dur(5, 9))}<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.6 + rnd() * 0.8).toFixed(2)}" fill="${c}" opacity="${(0.7 + rnd() * 0.3).toFixed(2)}"/></g>`;
    }
    case 'rain': {
      const y = animate ? -12 : rnd() * GROUND_Y;
      return `<g>${move(-16, GROUND_Y + 14, dur(0.6, 0.9))}<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x - 1.4).toFixed(1)}" y2="${(y + 7).toFixed(1)}" stroke="${c}" stroke-width="0.5" opacity="0.5"/></g>`;
    }
    case 'petals':
    case 'leaves': {
      const y = animate ? -6 : rnd() * GROUND_Y;
      const spin = animate ? `<animateTransform attributeName="transform" type="rotate" from="0" to="${rnd() < 0.5 ? 360 : -360}" dur="${dur(2, 4)}s" repeatCount="indefinite" additive="sum"/>` : '';
      const shape =
        th.weather === 'petals'
          ? `<ellipse rx="1.5" ry="0.8" fill="${c}"/>`
          : `<path d="M-2 0Q0 -1.4 2 0Q0 1.4 -2 0Z" fill="${toCss(i % 3 === 0 ? 0xb0643a : th.weatherColor)}"/>`;
      return `<g>${move(20 + rnd() * 20, GROUND_Y + 8, dur(6, 10))}<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><g>${spin}${shape}</g></g></g>`;
    }
    case 'embers': {
      const y = animate ? GROUND_Y - 2 : GROUND_Y - rnd() * GROUND_Y * 0.8;
      return `<g>${move(6 + rnd() * 10, -GROUND_Y * 0.9, dur(4, 7), blink(dur(1, 2)))}<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.5 + rnd() * 0.5).toFixed(2)}" fill="${c}"/></g>`;
    }
    case 'lanterns': {
      const y = animate ? GROUND_Y - 6 : GROUND_Y - rnd() * GROUND_Y * 0.85;
      return `<g>${move(4 + rnd() * 6, -GROUND_Y - 10, dur(14, 22))}<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><circle r="4" fill="${c}" opacity="0.18"/><rect x="-1.5" y="-2.4" width="3" height="4" rx="1.1" fill="${c}"/></g></g>`;
    }
    case 'fireflies':
    case 'motes':
    case 'sparkles': {
      const y = th.weather === 'sparkles' ? rnd() * GROUND_Y * 0.6 : GROUND_Y - 4 - rnd() * GROUND_Y * (th.weather === 'motes' ? 0.8 : 0.45);
      const r = th.weather === 'fireflies' ? 0.9 : th.weather === 'motes' ? 0.6 : 0.8;
      const drift = th.weather === 'sparkles' ? '' : move(4 - rnd() * 8, -4 - rnd() * 6, dur(4, 7));
      return `<g>${drift}<g>${blink(dur(1.6, 3.4))}<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r * 2.4).toFixed(2)}" fill="${c}" opacity="0.2"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${c}"/></g></g>`;
    }
    default:
      return '';
  }
}

/** How many particles the preview draws per weather kind (about the lane's density at preview size). */
const COUNT: Record<BackdropTheme['weather'], number> = { none: 0, snow: 46, rain: 60, petals: 20, leaves: 18, embers: 22, lanterns: 12, fireflies: 14, motes: 16, sparkles: 14 };

/** The theme's weather over a preview (transparent SVG), or null for the classic sky. */
export function backdropWeatherSvg(key: string | null, animate: boolean): string | null {
  const id = backdropId(key);
  const th = id ? BACKDROP_THEMES[id] : undefined;
  if (!th || !id || th.weather === 'none') return null;
  const rng = mulberry32(id.length * 7919 + id.charCodeAt(0));
  const rnd = () => rng.next();
  const parts: string[] = [];
  for (let i = 0; i < COUNT[th.weather]; i++) parts.push(particle(th, i, rnd, animate));
  const flash =
    th.lightning && animate
      ? `<rect x="0" y="0" width="${VW}" height="${GROUND_Y}" fill="#e2e8f4" opacity="0"><animate attributeName="opacity" values="0;0;0.16;0.04;0.12;0;0" keyTimes="0;0.84;0.86;0.88;0.9;0.94;1" dur="7s" repeatCount="indefinite"/></rect>`
      : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMid slice"><defs><clipPath id="c"><rect width="${VW}" height="${GROUND_Y + 2}"/></clipPath></defs><g clip-path="url(#c)">${flash}${parts.join('')}</g></svg>`;
}

// ---------------------------------------------------------------------------------------------
// A small emblem (reward rows, capsule reveals, headless tests): the theme as a tiny landscape
// ---------------------------------------------------------------------------------------------

/** A 64 x 40 SVG emblem of a backdrop skin (`classic` is the classic sky), or null for an unknown id. */
export function backdropIconSvg(id: string): string | null {
  const th = id === 'classic' ? null : BACKDROP_THEMES[id];
  if (id !== 'classic' && !th) return null;
  const top = toCss(th ? th.skyTop : 0x8db3cf);
  const bottom = toCss(th ? th.skyBottom : 0xf0e2c4);
  const far = toCss(th ? mixHex(th.grade, 0x9c98a6, 0.5) : 0x9c98a6);
  const near = toCss(th ? mixHex(th.grade, 0x5f7247, 0.45) : 0x5f7247);
  const sun = toCss(th ? th.celestialColor : 0xfff1d6);
  const rim = th && th.rim === 'snow' ? `<path d="M6 25l8-9 6 5" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>` : '';
  const orb = th && th.celestial === 'eclipse' ? `<circle cx="45" cy="12" r="5" fill="#120e1c" stroke="${sun}" stroke-width="1.4"/>` : !th || th.celestial !== 'none' ? `<circle cx="45" cy="12" r="5" fill="${sun}"/>` : '';
  const aurora = th && th.aurora ? `<path d="M2 14c10-6 20 4 30-2s20-6 30 0" fill="none" stroke="#5ae8b0" stroke-width="3" opacity="0.55"/>` : '';
  const stars = th && th.stars > 0 ? [8, 18, 28, 36, 54].map((x, i) => `<circle cx="${x}" cy="${5 + (i % 3) * 3}" r="0.7" fill="#fff"/>`).join('') : '';
  const w = th ? toCss(th.weatherColor) : '#fff';
  const weather =
    th && th.weather !== 'none'
      ? [
          [10, 20],
          [22, 9],
          [33, 22],
          [52, 24],
          [58, 17],
          [16, 30],
        ]
          .map(([x, y]) => (th.weather === 'rain' ? `<path d="M${x} ${y}l-1 4" stroke="${w}" stroke-width="0.8" opacity="0.8"/>` : `<circle cx="${x}" cy="${y}" r="${th.weather === 'lanterns' || th.weather === 'fireflies' ? 1.3 : 1}" fill="${w}" opacity="0.9"/>`))
          .join('')
      : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 40"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient><clipPath id="r"><rect x="1" y="1" width="62" height="38" rx="6"/></clipPath></defs><g clip-path="url(#r)"><rect width="64" height="40" fill="url(#s)"/>${stars}${aurora}${orb}<path d="M0 30l12-14 10 8 12-12 14 13 16-7v22H0z" fill="${far}"/>${rim}<path d="M0 34c8-5 14-5 22-1s16 4 24 0 12-3 18 0v7H0z" fill="${near}"/>${weather}</g><rect x="1" y="1" width="62" height="38" rx="6" fill="none" stroke="#1b1330" stroke-width="2"/></svg>`;
}

function mixHex(a: number, b: number, t: number): number {
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}
