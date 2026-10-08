/**
 * Picture art for the profile look (AUDIT #9; redrawn to the art sheet 2026-10-08, PLAN 2a):
 *
 * - **Frames**: material rings 11 units wide in the 120-unit avatar box, with corner ornaments and cel
 *   bands from one ring path (the ring minus itself moved gives the lit inner lip and the shaded outer
 *   edge): bark with grain, knots and leaves; carved bone with leather lashings; bronze with a laurel
 *   relief; iron with rivets and corner brackets; brass with gears and a gauge; bevelled steel plates
 *   with bolts; chrome with a polished bevel and reflection bands; Aeon gold with hourglass gems. Chrome
 *   glints and Aeon shimmers (stills under reduce motion). They draw inside the plate (`frameStyle`).
 * - **Banners**: woven cloth on a rod with finials, the rod's cast shadow, folds, stitched hems, an
 *   embroidered emblem per arena, a gold fringe on the points; the hem sways (still under reduce motion).
 *   Arena colours only, never the reserved team blue and orange (ui-plan 3.2).
 * - **Titles**: a ribbon styled by how the title is earned: parchment for the basics, bronze, silver or
 *   gold end caps for milestones, a wax seal for feats, gold leaf with a sheen for the two grandest.
 */
import type { TitleDef } from '@/content/types';
import { useMemo } from 'preact/hooks';
import { ramp } from './color';
import { ell, mapPath, star } from './path';
import { shapesMarkup } from './render';
import type { Shape } from './types';

// ---------------------------------------------------------------------------------------------
// Shared geometry
// ---------------------------------------------------------------------------------------------

type Pt = (x: number, y: number) => [number, number];

const r2 = (n: number): string => String(Math.round(n * 100) / 100);

/** A closed circle drawn clockwise (a hole inside a counter-clockwise `ell`). */
const cw = (cx: number, cy: number, r: number): string => `M${r2(cx - r)} ${r2(cy)}A${r2(r)} ${r2(r)} 0 1 1 ${r2(cx + r)} ${r2(cy)}A${r2(r)} ${r2(r)} 0 1 1 ${r2(cx - r)} ${r2(cy)}Z`;

/** A path rotated by `deg` about (ox, oy). */
const rot = (d: string, deg: number, ox: number, oy: number): string => {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return mapPath(d, (x, y) => [ox + (x - ox) * c - (y - oy) * s, oy + (x - ox) * s + (y - oy) * c]);
};

/** A four-point sparkle with concave sides. */
const sparkle = (cx: number, cy: number, r: number): string =>
  `M${r2(cx)} ${r2(cy - r)}Q${r2(cx)} ${r2(cy)} ${r2(cx + r * 0.7)} ${r2(cy)}Q${r2(cx)} ${r2(cy)} ${r2(cx)} ${r2(cy + r)}Q${r2(cx)} ${r2(cy)} ${r2(cx - r * 0.7)} ${r2(cy)}Q${r2(cx)} ${r2(cy)} ${r2(cx)} ${r2(cy - r)}Z`;

/** A gear with `n` flat-topped teeth. */
const gear = (cx: number, cy: number, ro: number, ri: number, n: number): string => {
  const at = (r: number, deg: number) => `${r2(cx + Math.cos(((deg - 90) * Math.PI) / 180) * r)} ${r2(cy + Math.sin(((deg - 90) * Math.PI) / 180) * r)}`;
  const p = 360 / n;
  let d = '';
  for (let i = 0; i < n; i += 1) {
    const a = i * p;
    d += `${i ? 'L' : 'M'}${at(ri, a - p * 0.3)}L${at(ro, a - p * 0.17)}L${at(ro, a + p * 0.17)}L${at(ri, a + p * 0.3)}A${r2(ri)} ${r2(ri)} 0 0 1 ${at(ri, a + p * 0.7)}`;
  }
  return `${d}Z`;
};

/** A regular hexagon (a bolt head). */
const hex = (cx: number, cy: number, r: number): string => {
  let d = '';
  for (let i = 0; i < 6; i += 1) d += `${i ? 'L' : 'M'}${r2(cx + Math.cos(((i * 60 + 30) * Math.PI) / 180) * r)} ${r2(cy + Math.sin(((i * 60 + 30) * Math.PI) / 180) * r)}`;
  return `${d}Z`;
};

// ---------------------------------------------------------------------------------------------
// Frames (the 120-unit avatar box; the ring is the outer 11 units)
// ---------------------------------------------------------------------------------------------

const OUTER = 'M0 0H120V120H0Z';
/** The opening, drawn the other way round, so the ring path has a hole. */
const INNER = 'M20 11Q11 11 11 20V100Q11 109 20 109H100Q109 109 109 100V20Q109 11 100 11Z';
export const FRAME_RING = OUTER + INNER;

/** The four sides of a path drawn along the top (quarter turns about the centre). */
const SIDE_TURNS: Pt[] = [(x, y) => [x, y], (x, y) => [120 - y, x], (x, y) => [120 - x, 120 - y], (x, y) => [y, 120 - x]];
const sides = (d: string): string => SIDE_TURNS.map((f) => mapPath(d, f)).join('');
/** The four corners of a path drawn in the top-left corner (mirror flips). */
const CORNER_FLIPS: Pt[] = [(x, y) => [x, y], (x, y) => [120 - x, y], (x, y) => [x, 120 - y], (x, y) => [120 - x, 120 - y]];
const corners = (d: string, which: readonly number[] = [0, 1, 2, 3]): string => which.map((i) => mapPath(d, CORNER_FLIPS[i]!, i === 1 || i === 2)).join('');

/** Laurel relief leaves along the top side, growing toward the middle. */
const LAUREL = (() => {
  const leaf = 'M0 0C1.8 -2.2 4.8 -2.4 6.8 -0.8C4.8 1 1.8 1.2 0 0Z';
  let d = '';
  [26, 33, 40, 47].forEach((x, i) => {
    const tilt = i % 2 ? 24 : -24;
    d += rot(mapPath(leaf, (px, py) => [px + x, py + 5.6]), tilt, x, 5.6);
    d += rot(mapPath(leaf, (px, py) => [120 - (px + x), py + 5.6], true), -tilt, 120 - x, 5.6);
  });
  return d;
})();

const HOURGLASS_CAPS = 'M55.4 1.4H64.6V2.9H55.4ZM55.4 8.1H64.6V9.6H55.4Z';
const HOURGLASS_GLASS = 'M56.6 2.9H63.4L60.7 5.5L63.4 8.1H56.6L59.3 5.5Z';

interface FrameArt {
  shapes: Shape[];
  /** Raw markup clipped to the ring (reflection bands). */
  bands?: string;
  /** The live motion: a glint sweep (Chrome) or a shimmer (Aeon). */
  fx?: 'glint' | 'shimmer';
}

const FRAMES: Record<string, FrameArt> = {
  bark: {
    shapes: [
      { d: FRAME_RING, c: '#8e6440', sh: 3.2, hl: 2, ln: 2.6 },
      { d: sides('M24 3.4C40 4.8 52 2.6 66 4.2S90 5 100 3.6'), c: '#5c3c22', st: true, ln: 1.1, op: 0.8 },
      { d: sides('M27 7.8C44 9 60 6.8 74 8.2S92 8.8 97 7.8'), c: '#5c3c22', st: true, ln: 1, op: 0.65, lo: true },
      { d: ell(40, 5.6, 3, 1.8) + ell(114.4, 72, 1.8, 3) + ell(76, 114.4, 3, 1.8) + ell(5.6, 46, 1.8, 3), c: '#6e4a2c', sh: 0.8, hl: 0, ln: 1 },
      { d: corners('M9 9C14 3.4 22 2.4 28.4 5C22 9.6 15 11.2 9 9ZM9 9C3.4 14 2.4 22 5 28.4C9.6 22 11.2 15 9 9Z', [0, 3]), c: '#5e8f3a', sh: 1.4, hl: 0.9, ln: 1.4 },
      { d: corners('M10 8.6Q18 5.6 26.8 5.2M8.6 10Q5.6 18 5.2 26.8', [0, 3]), c: '#3f6b26', st: true, ln: 0.8 },
    ],
  },
  bone: {
    shapes: [
      { d: FRAME_RING, c: '#e8dcc0', sh: 3, hl: 2, ln: 2.4 },
      { d: sides('M28 1.6V9.6M44 1.6V9.6M60 1.6V9.6M76 1.6V9.6M92 1.6V9.6'), c: '#a08e6c', st: true, ln: 1.6 },
      { d: sides('M29.3 2V9.4M45.3 2V9.4M61.3 2V9.4M77.3 2V9.4M93.3 2V9.4'), c: '#fff8ea', st: true, ln: 0.8, op: 0.9, lo: true },
      { d: corners('M2.6 12.6L12.6 2.6M5.2 15.6L15.6 5.2M8.4 18.2L18.2 8.4'), c: '#7a4a2c', st: true, ln: 2.8 },
      { d: corners('M3.2 11.6L11.6 3.2M5.8 14.6L14.6 5.8M9 17.2L17.2 9'), c: '#b07a52', st: true, ln: 0.9, lo: true },
    ],
  },
  bronze: {
    shapes: [
      { d: FRAME_RING, c: '#c8893a', m: 'gold', sh: 3, hl: 2.2, ln: 2.4 },
      { d: sides(LAUREL), c: '#e2ab5c', m: 'gold', sh: 0.6, hl: 0, ln: 0.7 },
      { d: ell(60, 5.5, 5.2) + ell(60, 114.5, 5.2) + ell(5.5, 60, 5.2) + ell(114.5, 60, 5.2), c: '#b07830', m: 'gold', sh: 1, hl: 0.8, ln: 1.2 },
      { d: ell(60, 5.5, 3) + ell(60, 114.5, 3) + ell(5.5, 60, 3) + ell(114.5, 60, 3), c: '#4f8f7f', m: 'gloss', sh: 0.8, hl: 0.8, ln: 1 },
    ],
  },
  iron: {
    shapes: [
      { d: FRAME_RING, c: '#7f868e', m: 'metal', sh: 3, hl: 2, ln: 2.4 },
      { d: corners('M4.6 27V20Q4.6 4.6 20 4.6H27V11.4H20Q11.4 11.4 11.4 20V27Z'), c: '#5d646c', m: 'metal', sh: 1.2, hl: 0.8, ln: 1.2 },
      { d: sides([36, 48, 60, 72, 84].map((x) => ell(x, 5.6, 1.9)).join('')) + corners(ell(23.6, 8, 1.5) + ell(8, 23.6, 1.5) + ell(9.4, 9.4, 1.5)), c: '#bec5cd', m: 'metal', sh: 0.8, hl: 0.6, ln: 0.9 },
    ],
  },
  brass: {
    shapes: [
      { d: FRAME_RING, c: '#d6a640', m: 'gold', sh: 3, hl: 2, ln: 2.4 },
      { d: sides('M30 5.6H90'), c: '#9a6c1c', st: true, ln: 2.4 },
      { d: sides('M30 4.9H90'), c: '#f6dc98', st: true, ln: 0.7, op: 0.9, lo: true },
      { d: corners(gear(12.6, 12.6, 9.2, 7.2, 8)), c: '#c08a2a', m: 'gold', sh: 1.4, hl: 1, ln: 1.3 },
      { d: corners(ell(12.6, 12.6, 2.8)), c: '#5a3c10', sh: 0, hl: 0, ln: 0.8 },
      { d: ell(60, 5.6, 4.7), c: '#f3e7c6', sh: 0.8, hl: 0, ln: 1.4, lc: '#553a0e' },
      { d: 'M60 5.6L62.8 3.2', c: '#b03a2e', st: true, ln: 1 },
    ],
  },
  steel: {
    shapes: [
      { d: FRAME_RING, c: '#c7d0da', m: 'metal', sh: 3, hl: 2, ln: 2.4 },
      { d: corners('M5 5L12.8 12.8'), c: '#6f767e', st: true, ln: 1.6 },
      { d: corners('M6.2 4.6L13.6 12'), c: '#f2f5f8', st: true, ln: 0.8 },
      { d: sides('M24 3.1H96'), c: '#f6f8fa', st: true, ln: 1, op: 0.9 },
      { d: sides('M22 9H98'), c: '#8c939b', st: true, ln: 0.9, op: 0.8, lo: true },
      { d: sides(hex(60, 5.6, 2.7) + hex(32, 5.6, 2.1) + hex(88, 5.6, 2.1)), c: '#a9b2bc', m: 'metal', sh: 0.8, hl: 0.6, ln: 1 },
    ],
  },
  chrome: {
    shapes: [{ d: FRAME_RING, c: '#e9ecf0', m: 'gloss', sh: 4, hl: 2.4, ln: 2.4 }],
    bands:
      '<path d="M-14 46L46 -14H54L-6 54Z" fill="#7a8592" opacity=".42"/><path d="M-4 54L54 -4H58L0 58Z" fill="#ffffff" opacity=".9"/>' +
      '<path d="M66 134L134 66V76L76 134Z" fill="#7a8592" opacity=".38"/><path d="M80 130L130 80V84L84 130Z" fill="#ffffff" opacity=".85"/>',
    fx: 'glint',
  },
  aeon: {
    shapes: [
      { d: FRAME_RING, c: '#e8b23a', m: 'gold', sh: 3, hl: 2.2, ln: 2.4 },
      { d: sides('M26 5.6H50M70 5.6H94'), c: '#a8701a', st: true, ln: 0.9, op: 0.8 },
      { d: sides(HOURGLASS_CAPS), c: '#a8701a', m: 'gold', sh: 0.5, hl: 0, ln: 0.9 },
      { d: sides(HOURGLASS_GLASS), c: '#a77bff', m: 'gloss', sh: 1, hl: 0.8, ln: 1 },
      { d: corners(sparkle(12.4, 12.4, 4)), c: '#fff7dc', sh: 0, hl: 0, ln: 0.8, lc: '#5a3a08' },
    ],
    fx: 'shimmer',
  },
};

/** The frame as a standalone SVG (`live`: with its glint or shimmer), or null for none and unknown ids. */
export function frameSvg(id: string, live = false): string | null {
  const f = FRAMES[id];
  if (!f) return null;
  const m = shapesMarkup(f.shapes, 'f');
  let defs = `${m.defs}<clipPath id="§ring"><path d="${FRAME_RING}"/></clipPath>`;
  let extra = f.bands ? `<g clip-path="url(#§ring)">${f.bands}</g>` : '';
  if (live && f.fx === 'glint') {
    extra += `<g clip-path="url(#§ring)"><path d="M-40 34L34 -40H44L-30 44Z" fill="#ffffff" opacity=".95"><animateTransform attributeName="transform" type="translate" values="0 0;150 150;150 150" keyTimes="0;.32;1" dur="4.2s" repeatCount="indefinite"/></path></g>`;
  }
  if (live && f.fx === 'shimmer') {
    defs += `<linearGradient id="§shim" x1="0" y1="0" x2="1" y2="1"><stop offset=".3" stop-color="#ffffff" stop-opacity="0"/><stop offset=".5" stop-color="#e9dcff" stop-opacity=".9"/><stop offset=".7" stop-color="#ffffff" stop-opacity="0"/></linearGradient>`;
    extra += `<g clip-path="url(#§ring)"><rect x="-120" y="-120" width="240" height="240" fill="url(#§shim)"><animateTransform attributeName="transform" type="translate" values="-60 -60;60 60;60 60" keyTimes="0;.45;1" dur="5s" repeatCount="indefinite"/></rect></g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs>${defs}</defs>${m.body}${extra}</svg>`.replace(/§/g, 'p');
}

const frameUrlCache = new Map<string, string | null>();
function frameUrl(id: string, live: boolean): string | null {
  const k = `${id}|${live}`;
  let u = frameUrlCache.get(k);
  if (u === undefined) {
    const svg = frameSvg(id, live);
    u = svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : null;
    frameUrlCache.set(k, u);
  }
  return u;
}

/** Each frame's metal (the ring colour behind the art, and the outline of the plate). */
export const FRAME_COLORS: Record<string, string> = {
  none: '#3a3f55',
  bark: '#8e6440',
  bone: '#e8dcc0',
  bronze: '#c8893a',
  iron: '#7f868e',
  brass: '#d6a640',
  steel: '#c7d0da',
  chrome: '#e9ecf0',
  aeon: '#e8b23a',
};

/**
 * The CSS variables of a frame for an `.ui-avatar` with `av--ring`: the bevel ramp (`--frame`, …) and
 * the material ring drawn inside the plate (`--frame-art`; `--frame-art-live` with its motion, which the
 * stylesheet swaps for the still under reduce motion).
 */
export function frameStyle(id: string): Record<string, string> {
  const r = ramp(FRAME_COLORS[id] ?? FRAME_COLORS.none!, id === 'none' ? 'matte' : 'metal');
  const out: Record<string, string> = { '--frame': r.fill, '--frame-hl': r.hl, '--frame-sh': r.shadow, '--frame-line': r.line };
  const art = frameUrl(id, false);
  if (art) out['--frame-art'] = `url("${art}")`;
  const live = FRAMES[id]?.fx ? frameUrl(id, true) : null;
  if (live) out['--frame-art-live'] = `url("${live}")`;
  return out;
}

// ---------------------------------------------------------------------------------------------
// Banners (a 40 × 54 box; the backer variant stretches)
// ---------------------------------------------------------------------------------------------

type Hex = `#${string}`;

interface BannerLook {
  cloth: Hex;
  trim: Hex;
  /** The embroidered emblem (cel parts centred near (20, 23)). */
  emblem: Shape[];
  /** A soft glow behind the emblem (neon, rift). */
  glow?: Hex;
}

const GOLD: Hex = '#e8b23a';

const BANNERS: Record<string, BannerLook> = {
  tar_pit: {
    cloth: '#5a3a2a',
    trim: GOLD,
    emblem: [
      { d: 'M10.6 30.4C10.6 27.8 14.8 26.4 20 26.4C25.2 26.4 29.4 27.8 29.4 30.4C29.4 32.8 25.2 34 20 34C14.8 34 10.6 32.8 10.6 30.4Z', c: '#2a1c15', sh: 1, hl: 0.7, ln: 1.4 },
      { d: ell(14.4, 28.8, 1.6) + ell(26, 29.6, 1.2), c: '#4a3328', sh: 0, hl: 0.5, ln: 0.9 },
      { d: 'M20 12.4C22 16.2 26 17.6 26.2 22.2C26.4 26.2 23.6 28.6 20 28.6C16.4 28.6 13.6 26.4 13.8 22.6C14 19.8 15.8 18.4 16.8 16.6C17.2 18.8 18.2 19.8 19.2 20.2C18.6 17.2 18.8 14.6 20 12.4Z', c: '#ff9a3a', sh: 2.2, hl: 1.2, ln: 1.5 },
      { d: 'M20 18C21.2 20.4 23.4 21.6 23.4 24.4C23.4 26.8 21.8 28 20 28C18.2 28 16.6 26.8 16.6 24.6C16.6 23 17.6 22 18.4 21.2C18.8 22.6 19.4 23.2 20 23.4C19.6 21.6 19.6 19.8 20 18Z', c: '#ffd34a', sh: 1, hl: 0, ln: 0.8 },
    ],
  },
  frostfang: {
    cloth: '#3f8f9a',
    trim: '#e6f6ff',
    emblem: [
      { d: 'M15 13.4C18.4 14 22 14 25.6 13.4C25.4 20.4 23.4 27.4 19.6 33.6C18.4 26.8 17 20 15 13.4Z', c: '#f4fbff', sh: 2, hl: 1, ln: 1.5 },
      { d: 'M13.6 12.6C17.6 11.4 22.6 11.4 27 12.6L26.6 15.2C22.4 14.2 18 14.2 14 15.2Z', c: '#b8dcea', sh: 0.8, hl: 0.5, ln: 1.3 },
      { d: sparkle(11.2, 22, 2.6) + sparkle(28.8, 26.4, 2) + sparkle(27.6, 18, 1.5), c: '#ffffff', sh: 0, hl: 0, ln: 0.7, lc: '#1d4a52' },
    ],
  },
  moat: {
    cloth: '#3f7f46',
    trim: '#c7d0da',
    emblem: [
      { d: 'M9.6 30.6Q12.3 29.2 15 30.6T20.4 30.6T25.8 30.6T31 30.6V34H9.6Z', c: '#8cc0d8', sh: 1, hl: 0.6, ln: 1.2 },
      { d: 'M10.6 30.4V15.4H15.2V30.4ZM24.8 30.4V15.4H29.4V30.4Z', c: '#b9bfc7', sh: 1.4, hl: 0.8, ln: 1.3 },
      { d: 'M14.6 30.4V20.6H16.4V18.6H18.2V20.6H19.1V18.6H20.9V20.6H21.8V18.6H23.6V20.6H25.4V30.4Z', c: '#cdd3da', sh: 1.6, hl: 1, ln: 1.3 },
      { d: 'M10 15.6L12.9 10.6L15.8 15.6ZM24.2 15.6L27.1 10.6L30 15.6Z', c: '#a8473c', sh: 0.8, hl: 0.5, ln: 1.2 },
      { d: 'M18.2 30.4V26.6Q20 24.2 21.8 26.6V30.4Z', c: '#3a2a22', sh: 0, hl: 0, ln: 0.9 },
      { d: 'M27.1 10.6V7.4L30.2 8.5L27.1 9.6', c: '#e6ebef', sh: 0, hl: 0, ln: 0.8 },
    ],
  },
  harbor: {
    cloth: '#26304a',
    trim: GOLD,
    emblem: [
      { d: 'M18.4 13.6C14.6 16 22.8 20.8 18.6 24C16 26 20.6 27.6 19 30', c: '#5d5950', st: true, ln: 2.2 },
      { d: 'M11.4 25.2L13.6 24.8C14 28.6 16.6 30.6 20 30.6C23.4 30.6 26 28.6 26.4 24.8L28.6 25.2L27 21.6L24.4 24.6L25.6 24.8C25 27.4 23 28.6 20 28.6C17 28.6 15 27.4 14.4 24.8L15.6 24.6L13 21.6Z', c: GOLD, m: 'gold', sh: 1.2, hl: 0.8, ln: 1.3 },
      { d: 'M18.9 15.2H21.1V30H18.9Z', c: GOLD, m: 'gold', sh: 0.8, hl: 0.6, ln: 1.2 },
      { d: 'M14.6 16.6H25.4Q26.2 16.6 26.2 17.4V18Q26.2 18.8 25.4 18.8H14.6Q13.8 18.8 13.8 18V17.4Q13.8 16.6 14.6 16.6Z', c: GOLD, m: 'gold', sh: 0.8, hl: 0.6, ln: 1.2 },
      { d: ell(20, 12.6, 2.9) + cw(20, 12.6, 1.3), c: GOLD, m: 'gold', sh: 0.9, hl: 0.6, ln: 1.2 },
      { d: 'M18.4 13.6C14.6 16 22.8 20.8 18.6 24C16 26 20.6 27.6 19 30', c: '#ece0c4', st: true, ln: 1 },
    ],
  },
  barbed: {
    cloth: '#6b6e4a',
    trim: '#b0b0b0',
    emblem: [
      { d: 'M11.2 27.6C10.4 20.6 16.6 15.4 21.6 18.4C26 21 23 27.4 17.8 25.6C12.6 23.8 15.6 14 23 14.2C28.4 14.4 30.6 19.6 29 24.4C27.8 28 24.6 30.8 20.6 31.2', c: '#2e3236', st: true, ln: 3.8 },
      { d: 'M11.2 27.6C10.4 20.6 16.6 15.4 21.6 18.4C26 21 23 27.4 17.8 25.6C12.6 23.8 15.6 14 23 14.2C28.4 14.4 30.6 19.6 29 24.4C27.8 28 24.6 30.8 20.6 31.2', c: '#d8dde2', st: true, ln: 2.2 },
      { d: 'M11.6 21.2l2.6 2.6m0-2.6l-2.6 2.6M24.4 12.6l2.6 2.6m0-2.6l-2.6 2.6M27.6 26.2l2.6 2.6m0-2.6l-2.6 2.6M16.8 29.6l2.6 2.6m0-2.6l-2.6 2.6', c: '#2e3236', st: true, ln: 2.4 },
      { d: 'M11.6 21.2l2.6 2.6m0-2.6l-2.6 2.6M24.4 12.6l2.6 2.6m0-2.6l-2.6 2.6M27.6 26.2l2.6 2.6m0-2.6l-2.6 2.6M16.8 29.6l2.6 2.6m0-2.6l-2.6 2.6', c: '#e4e8ec', st: true, ln: 1.1 },
      { d: 'M14.6 17.4C16.4 16 18.8 15.8 20.6 16.8', c: '#ffffff', st: true, ln: 0.7, op: 0.8 },
    ],
  },
  neon: {
    cloth: '#7a2a8e',
    trim: '#5ff2ff',
    glow: '#ff4fd8',
    emblem: [
      { d: 'M23.2 11.4L13.6 24.8H19.2L16.4 34.4L27.6 20.2H21.8L25.6 11.4Z', c: '#ffe96a', sh: 1.4, hl: 0.9, ln: 1.5 },
      // the neon tube running through the bolt
      { d: 'M23.4 13L16.6 23.4H21.4L19.4 30.6L25.4 21.4H20.6L23.6 13', c: '#fff7c8', st: true, ln: 0.7, op: 0.9 },
    ],
  },
  starfield: {
    cloth: '#2a2450',
    trim: '#ffe9a0',
    emblem: [
      { d: star(20, 22.6, 5, 9.4, 4.1), c: '#ffe9a0', m: 'gold', sh: 2, hl: 1.2, ln: 1.5 },
      { d: sparkle(11.4, 13.8, 2.4) + sparkle(29.2, 30.4, 2) + sparkle(29.4, 13.4, 1.6) + sparkle(10.8, 30.8, 1.6), c: '#fff6d0', sh: 0, hl: 0, ln: 0.6, lc: '#4a3e14' },
    ],
  },
  rift: {
    cloth: '#3a1e4a',
    trim: '#c86ab0',
    glow: '#ff7ac8',
    emblem: [
      { d: 'M22.6 10.6L16.6 19.4L22.6 22.6L15 34.4L25.8 21.6L20.2 18.4L26.4 10.6Z', c: '#ff9ad0', sh: 1.4, hl: 1, ln: 1.4, lc: '#5a1f4a' },
      { d: 'M23.6 12L18.8 19.4L23.8 22.2L18 31', c: '#fff0fa', st: true, ln: 0.8 },
    ],
  },
};

const CLOTH = 'M5 5.4H35V45.6L20 38.6L5 45.6Z';

/** The banner's inner markup (with `§` ids): rod, cloth, emblem, fringe; the cloth group sways. */
function bannerMarkup(id: string): string {
  const b = BANNERS[id] ?? BANNERS.tar_pit!;
  const c = ramp(b.cloth, 'cloth');
  const t = ramp(b.trim, 'gold');
  const cloth = shapesMarkup(
    [
      { d: CLOTH, c: b.cloth, m: 'cloth', sh: 4.2, hl: 2, ln: 2.2 },
      // folds that bend, the trim at the head and the hem bands at the points
      { d: 'M12.4 5.4C13.2 18 12 30 13 43L15.6 41.8C14.6 30 15.8 18 15 5.4Z', c: '#000000', op: 0.16, ln: 0 },
      { d: 'M24.6 5.4C25.2 18 24.4 30 25 40.2L26.4 40.8C25.8 30 26.6 18 26 5.4Z', c: '#ffffff', op: 0.14, ln: 0 },
      { d: 'M29.4 5.4C30 17 29 29 29.8 42.8L32 43.8C31.2 29 32.2 17 31.6 5.4Z', c: '#000000', op: 0.14, ln: 0 },
      { d: 'M5 5.4H35V8.6H5Z', c: b.trim, m: 'gold', sh: 1, hl: 0.6, ln: 1 },
      { d: 'M5 8.6H35V10H5Z', c: '#000000', op: 0.26, ln: 0 },
      { d: 'M5 42.4L20 35.4L35 42.4V45.6L20 38.6L5 45.6Z', c: b.trim, m: 'gold', sh: 0.8, hl: 0.5, ln: 1 },
      // weave strokes (texture)
      { d: 'M8 31.4l2-2M9.4 32.5l2-2M10.8 33.6l2-2M28.4 13.4l2-2M29.8 14.5l2-2M31.2 15.6l2-2', c: c.shadow as Hex, st: true, ln: 0.5, op: 0.7, lo: true },
      ...(b.glow ? [{ d: ell(20, 22.6, 11), c: b.glow, ln: 0, grad: { kind: 'radial', stops: [[0, b.glow, 0.6], [1, b.glow, 0]] } } satisfies Shape] : []),
      ...b.emblem,
    ],
    'b',
  );
  const stitch = `<path d="M7.2 11V41.4M32.8 11V41.4" fill="none" stroke="${t.hl}" stroke-width=".6" stroke-dasharray="1.2 .9" opacity=".9"/>`;
  const fringe =
    `<path d="M5.4 46.9L20 40L34.6 46.9" fill="none" stroke="${t.fill}" stroke-width="2.2" stroke-dasharray=".6 .5"/>` +
    `<path d="M5 45.8L5.2 47.6M35 45.8L34.8 47.6" stroke="${t.line}" stroke-width=".6"/>` +
    `<path d="M5.2 47.4C6.5 47.6 6.5 49.2 5.2 50C3.9 49.2 3.9 47.6 5.2 47.4ZM34.8 47.4C36.1 47.6 36.1 49.2 34.8 50C33.5 49.2 33.5 47.6 34.8 47.4Z" fill="${t.fill}" stroke="${t.line}" stroke-width=".6"/>`;
  const rod = shapesMarkup(
    [
      { d: 'M3 3.1H37Q38.4 3.1 38.4 4.4Q38.4 5.7 37 5.7H3Q1.6 5.7 1.6 4.4Q1.6 3.1 3 3.1Z', c: '#6e4a2c', sh: 0.8, hl: 0.5, ln: 1.1 },
      { d: ell(1.8, 4.4, 2.1) + ell(38.2, 4.4, 2.1), c: b.trim, m: 'gold', sh: 0.8, hl: 0.7, ln: 1 },
    ],
    'r',
  );
  return `<defs>${cloth.defs}${rod.defs}</defs><g class="av-banner__cloth">${cloth.body}${stitch}${fringe}</g>${rod.body}`;
}

/** A banner as a standalone SVG (the tone test reads it). */
export function bannerSvg(id: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 54">${bannerMarkup(id)}</svg>`.replace(/§/g, 't');
}

let bannerSeq = 0;

/**
 * A banner's cloth pennant (`width` px wide; the height follows). `backer` draws the cloth that hangs
 * behind a portrait: no rod or emblem (the portrait covers them, and a rod corner peeking past a round
 * plate reads as a stray bar), a trim hem and fringe on the swallowtail, and it stretches to the box CSS
 * gives it so the tails end exactly where the layout reserves room for them.
 */
export function BannerArt(p: { id: string; width?: number; class?: string; testid?: string; backer?: boolean }) {
  const seq = useMemo(() => (bannerSeq = (bannerSeq + 1) % 1e6), []);
  const b = BANNERS[p.id] ?? BANNERS.tar_pit!;
  const w = p.width ?? 40;
  const html = useMemo(() => (p.backer ? '' : bannerMarkup(p.id).replace(/§/g, `bn${seq}-`)), [p.id, p.backer, seq]);
  if (p.backer) {
    const c = ramp(b.cloth, 'cloth');
    const t = ramp(b.trim, 'gold');
    const back = 'M2 0H38V58L20 49L2 58Z';
    return (
      <svg class={`av-banner av-banner--backer ${p.class ?? ''}`} viewBox="0 0 40 60" preserveAspectRatio="none" aria-hidden="true" data-testid={p.testid}>
        <path d={back} fill={c.fill} />
        <path d="M2 0H38V58L20 49L2 58ZM2 0H38V53L20 44L2 53Z" fill-rule="evenodd" fill={c.shadow} />
        <path d="M10 0C11 18 9.6 34 10.6 52L13 51C12 34 13.4 18 12.4 0Z" fill="#000000" opacity=".14" />
        <path d="M27 0C27.6 18 26.6 34 27.4 48L29.4 49C28.6 34 29.6 18 29 0Z" fill="#000000" opacity=".12" />
        <path d="M5 0H8V52L5 54Z" fill={c.hl} opacity=".5" />
        <path d="M2 54.6L20 45.6L38 54.6V58L20 49L2 58Z" fill={t.fill} />
        <path d="M2 59L20 50L38 59" fill="none" stroke={t.fill} stroke-width="1.6" stroke-dasharray=".7 .6" vector-effect="non-scaling-stroke" />
        <path d={back} fill="none" stroke={c.line} stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
      </svg>
    );
  }
  return (
    <svg
      class={`av-banner ${p.class ?? ''}`}
      viewBox="0 0 40 54"
      width={w}
      height={(w * 54) / 40}
      aria-hidden="true"
      data-testid={p.testid}
      data-banner={p.id}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ---------------------------------------------------------------------------------------------
// Titles
// ---------------------------------------------------------------------------------------------

/** How a title's ribbon looks, by how it is earned (PLAN 2a "Titles"). */
export type RibbonTier = 'parchment' | 'bronze' | 'silver' | 'gold' | 'seal' | 'leaf';

/**
 * A title's ribbon style from its unlock: the basics stay parchment; milestones get bronze, silver or
 * gold end caps by how far they reach; feats a wax seal; owning every card and maxing the collection
 * a gold-leaf ribbon.
 */
export function titleTier(t: Pick<TitleDef, 'unlock'> | undefined): RibbonTier {
  const u = t?.unlock;
  if (!u) return 'parchment';
  switch (u.kind) {
    case 'start':
    case 'firstWin':
      return 'parchment';
    case 'feat':
      return 'seal';
    case 'albumComplete':
    case 'collectionMaxed':
      return 'leaf';
    case 'arena':
      return u.arena >= 8 ? 'gold' : u.arena >= 5 ? 'silver' : 'bronze';
    case 'codexLevel':
      return u.level >= 60 ? 'gold' : u.level >= 30 ? 'silver' : 'bronze';
    case 'finalAgeBefore':
      return u.ms <= 600000 ? 'gold' : 'bronze';
    case 'wins':
      return u.count >= 500 ? 'gold' : u.count >= 100 ? 'silver' : 'bronze';
    case 'conquestStars':
      return u.stars >= 27 ? 'gold' : 'silver';
    case 'cardsMaxed':
    case 'flagsOwned':
      return 'gold';
    case 'beatGeneral':
    case 'winAfterLastStand':
      return 'silver';
    case 'ownCard':
    case 'reachAge':
    case 'cardsOwned':
      return 'bronze';
  }
}

/** The title as a ribbon with folded ends; `tier` dresses it by how it was earned ({@link titleTier}). */
export function TitleRibbon(p: { text: string; tier?: RibbonTier; class?: string; testid?: string }) {
  const tier = p.tier ?? 'parchment';
  return (
    <span class={`av-ribbon av-ribbon--${tier} ${p.class ?? ''}`} data-testid={p.testid} data-tier={tier}>
      <span class="av-ribbon__end av-ribbon__end--l" aria-hidden="true" />
      {tier === 'seal' ? <span class="av-ribbon__seal" aria-hidden="true" /> : null}
      <span class="av-ribbon__text">{p.text}</span>
      <span class="av-ribbon__end av-ribbon__end--r" aria-hidden="true" />
    </span>
  );
}
