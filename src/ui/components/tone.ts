/**
 * Colour ramps for code-drawn UI art (UI art audit §3.1, copied from the Blender pipeline's cel
 * shading in `art/blender/ageborn_art/config.py`), so icons, the Home diorama and the War Path map
 * shade like the battle sheets:
 * - shadow band: fill × 0.74 (matte) or × 0.65 (metal), warm fills shifted 8° toward red;
 * - highlight: 32% toward white (matte) or 60% (gloss and metal), warm `#FFF3D6` for gold;
 * - outline: fill × 0.40 with HSV value capped at 0.38, never pure black and never one fixed colour.
 *
 * Pure string maths with a small cache (icons call these on every render).
 */

type Rgb = [number, number, number];

function parse(hex: string): Rgb {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hex(c: Rgb): string {
  return `#${c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
}

function toHsv([r, g, b]: Rgb): [number, number, number] {
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

function fromHsv(h: number, s: number, v: number): Rgb {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

const cache = new Map<string, string>();

function memo(key: string, f: () => string): string {
  let v = cache.get(key);
  if (v === undefined) {
    v = f();
    cache.set(key, v);
  }
  return v;
}

/** The cel shadow band colour of a fill. */
export function shade(fill: string, material: 'matte' | 'metal' | 'skin' = 'matte'): string {
  return memo(`s|${fill}|${material}`, () => {
    const [h, s, v] = toHsv(parse(fill));
    const k = material === 'metal' ? 0.65 : material === 'skin' ? 0.84 : 0.74;
    const warm = h >= 15 && h <= 75;
    const hh = warm || material === 'skin' ? (h - 8 + 360) % 360 : h;
    const ss = material === 'skin' ? Math.min(1, s * 1.25) : Math.min(1, s * 1.08);
    return hex(fromHsv(hh, ss, v * k));
  });
}

/** The highlight colour of a fill (one shape near the top of each part). */
export function light(fill: string, material: 'matte' | 'gloss' | 'gold' = 'matte'): string {
  return memo(`l|${fill}|${material}`, () => {
    const c = parse(fill);
    const to: Rgb = material === 'gold' ? [255, 243, 214] : [255, 255, 255];
    const t = material === 'matte' ? 0.32 : 0.6;
    return hex([c[0] + (to[0] - c[0]) * t, c[1] + (to[1] - c[1]) * t, c[2] + (to[2] - c[2]) * t]);
  });
}

/** The outline colour of a fill: fill × 0.40, HSV value capped at 0.38. */
export function ink(fill: string): string {
  return memo(`i|${fill}`, () => {
    const [h, s, v] = toHsv(parse(fill));
    return hex(fromHsv(h, Math.min(1, s * 1.1), Math.min(0.38, v * 0.4)));
  });
}

/** Interior part lines: fill × 0.60. */
export function line(fill: string): string {
  return memo(`n|${fill}`, () => {
    const [h, s, v] = toHsv(parse(fill));
    return hex(fromHsv(h, s, v * 0.6));
  });
}

/** Mixes two colours (t = 0 → a, 1 → b). */
export function mix(a: string, b: string, t: number): string {
  const A = parse(a);
  const B = parse(b);
  return hex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}
