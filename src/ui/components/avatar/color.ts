/**
 * Colour ramps for the avatar parts, copied from the art direction sheet (AUDIT §3.1, the Blender
 * pipeline's numbers): shadow = fill × 0.74 (matte), × 0.65 (metal and gold), skin × 0.84 with more
 * saturation; warm fills shift the shadow toward red; highlight mixes toward white (32% matte, 60%
 * gloss and metal) or warm cream for gold; outline = fill × 0.40 with HSV value capped at 0.38,
 * never pure black and never one fixed colour.
 */

export type Material = 'matte' | 'skin' | 'hair' | 'metal' | 'gold' | 'gloss' | 'cloth';

export interface Ramp {
  fill: string;
  shadow: string;
  hl: string;
  line: string;
  inner: string;
}

type RGB = [number, number, number];

function hex(h: string): RGB {
  const s = h.replace('#', '');
  const f = s.length === 3 ? s.split('').map((c) => c + c).join('') : s;
  return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)];
}

function toHex(c: RGB): string {
  return `#${c.map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('')}`;
}

function rgbToHsv([r, g, b]: RGB): [number, number, number] {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === R) h = ((G - B) / d) % 6;
    else if (max === G) h = (B - R) / d + 2;
    else h = (R - G) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max === 0 ? 0 : d / max, max];
}

function hsvToRgb(h: number, s: number, v: number): RGB {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/** Multiplies the HSV value, with an optional hue shift (degrees, negative = toward red) and saturation factor. */
export function shade(h: string, k: number, hueShift = 0, sat = 1): string {
  const [hh, s, v] = rgbToHsv(hex(h));
  return toHex(hsvToRgb((hh + hueShift + 360) % 360, Math.min(1, s * sat), Math.min(1, v * k)));
}

/** Mixes toward another colour by `t` (0..1). */
export function mix(a: string, b: string, t: number): string {
  const A = hex(a);
  const B = hex(b);
  return toHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

/** Warm fills (hue 15-75°) shift their shadow 8° toward red. */
function warmShift(h: string): number {
  const [hh, s] = rgbToHsv(hex(h));
  return s > 0.12 && hh >= 15 && hh <= 75 ? -8 : 0;
}

const SHADOW: Record<Material, number> = { matte: 0.74, cloth: 0.72, skin: 0.84, hair: 0.7, metal: 0.65, gold: 0.65, gloss: 0.7 };
const HL: Record<Material, number> = { matte: 0.32, cloth: 0.28, skin: 0.3, hair: 0.18, metal: 0.6, gold: 0.6, gloss: 0.6 };

const cache = new Map<string, Ramp>();

/** The full ramp of one fill in one material. */
export function ramp(fill: string, mat: Material = 'matte'): Ramp {
  const key = `${fill}|${mat}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const shift = warmShift(fill);
  const shadow = mat === 'skin' ? shade(fill, SHADOW.skin, -8, 1.25) : shade(fill, SHADOW[mat], shift, mat === 'gold' ? 1.1 : 1);
  const hlTarget = mat === 'gold' ? '#fff3d6' : mat === 'hair' ? '#fff0dc' : '#ffffff';
  const hl = mix(fill, hlTarget, HL[mat]);
  const [hh, s, v] = rgbToHsv(hex(fill));
  const line = toHex(hsvToRgb((hh + shift + 360) % 360, Math.min(1, s * 1.15 + 0.08), Math.min(0.38, v * 0.4)));
  const inner = shade(fill, 0.6, shift, 1.1);
  const r = { fill, shadow, hl, line, inner };
  cache.set(key, r);
  return r;
}
