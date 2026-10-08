/**
 * The victory moment's art (owner request 2026-10-07; DESIGN A11 cartoon style): props, hands, face
 * overlays, extra expressions and the little stage, all drawn as avatar-style shapes through
 * {@link shapesSvg}, so every piece gets the parts' cel shadow band, highlight sliver and
 * colour-matched outline. Data only: each export is a box size and its shapes; the scenes place them.
 *
 * Coordinates: each piece in its own box (`w` x `h`), except the overlays and face parts, which use the
 * avatar's 120 x 120 bust box (head centre 60, 52; eyes at 48 and 72, y 54) so they sit on any face.
 */
import { mix, shade } from '../../../components/avatar/color';
import { ell, rr, star } from '../../../components/avatar/path';
import { shapesSvg, type ResolvedLook } from '../../../components/avatar/render';
import { bumps, L, S } from '../../../components/avatar/starter';
import type { PartLibrary, Shape, Tone } from '../../../components/avatar/types';

export interface Art {
  w: number;
  h: number;
  shapes: readonly Shape[];
}

const art = (w: number, h: number, shapes: Shape[]): Art => ({ w, h, shapes });

/** The SVG markup of a piece (tones that use tints resolve against `look`). */
export function svgOf(a: Art, look?: ResolvedLook): string {
  return shapesSvg(a.shapes, `0 0 ${a.w} ${a.h}`, look);
}

const pt = (cx: number, cy: number, rx: number, ry: number, deg: number): string => {
  const r = (deg * Math.PI) / 180;
  return `${Math.round((cx + Math.cos(r) * rx) * 100) / 100} ${Math.round((cy + Math.sin(r) * ry) * 100) / 100}`;
};

/** A closed scalloped blob (clouds, cream, dust puffs). */
function scallop(cx: number, cy: number, rx: number, ry: number, n: number, out: number, start = 180): string {
  return `M${pt(cx, cy, rx, ry, start)}${bumps(cx, cy, rx, ry, start, start + 360, n, out)}Z`;
}

/** A puff cloud from circles (each its own outlined shape, back to front). */
function puffs(circles: readonly (readonly [number, number, number])[], c: Tone, o: Partial<Shape> = {}): Shape[] {
  return circles.map(([x, y, r]) => S(ell(x, y, r), c, { sh: r * 0.32, hl: r * 0.12, ln: 2.6, ...o }));
}

// =================================================================================================
// Hands (32 x 32): floating cartoon hands in the General's skin tone (the busts have no arms)
// =================================================================================================

export const HAND_FIST = art(32, 32, [
  S('M7 13C7 7.5 11 4.5 16.5 4.5C23 4.5 27 8.5 27 14.5C27 21.5 22.5 27 16 27C10.5 27 7 22.5 7 17Z', 'skin', { sh: 3.2, hl: 1.4, ln: 2.6 }),
  L('M12 6.5Q13.2 11 12 15.5M16.8 5.6Q18 10.5 16.8 15.5M21.5 7Q22.6 11.5 21.5 15.5', 'skin', 1.3, { lc: 'inner' }),
  S('M7.5 15.5C4 15.8 2.8 19.6 5.2 21.8C7.2 23.6 11 22.6 12.2 19.8C11 17.6 9.5 16 7.5 15.5Z', 'skin', { sh: 1.4, ln: 2.2 }),
]);

export const HAND_OPEN = art(32, 32, [
  S(rr(9, 2.5, 4.4, 14, 2.2) + rr(13.6, 1, 4.4, 15, 2.2) + rr(18.2, 1.8, 4.4, 14, 2.2) + rr(22.6, 4.5, 3.8, 11.5, 1.9), 'skin', { sh: 1.6, hl: 1, ln: 2.2 }),
  S('M8.5 14C8.5 11.5 11 10.5 16 10.5C21.5 10.5 26 11.5 26 14.5V21C26 26.5 22 29.5 17 29.5C12 29.5 8.5 26.5 8.5 21Z', 'skin', { sh: 3, hl: 1.2, ln: 2.6 }),
  S('M9 19C6 18.5 3.5 16 3.8 13.6C4.4 11.8 7.4 12.8 9.6 15.5Z', 'skin', { sh: 1.2, ln: 2.2 }),
  L('M13 21Q17 23.5 22 21', 'skin', 1.2, { lc: 'inner', lo: true }),
]);

// =================================================================================================
// The lower body (bust box 120 x 160): mostly behind the wall; seen when a General flies or pops up
// =================================================================================================

export const LOWER_BODY = art(120, 160, [
  S('M26 110C21 126 25 144 40 151H80C95 144 99 126 94 110Z', '#3d3a44', { sh: 4, hl: 1.5, ln: 3.2 }),
  S(ell(45, 153, 11.5, 6.2) + ell(75, 153, 11.5, 6.2), '#4a3428', { sh: 2, hl: 1, ln: 2.6 }),
  S(rr(26, 114, 68, 8, 3), '#6b4a2e', { sh: 2, ln: 2.4 }),
  S(rr(54, 113, 12, 10, 2.5), '#d4a437', { m: 'gold', ln: 1.8, hl: 0.8 }),
]);

// =================================================================================================
// Extra expressions: face parts merged into the library only for the moment (never saved, never in
// the creator; the avatar test keeps the creator's parts equal to content)
// =================================================================================================

/** Squeezed-shut "> <" eyes (the impact). */
const EYES_SQUEEZE = L('M42.6 49.6L52.4 54.4L42.6 59.2', 'ink', 2.8);
/** A wobbly mouth (dizzy, nervous). */
const MOUTH_WOBBLE = L('M50.4 72.6Q53.2 69.4 56 72.6T61.6 72.6T67.2 72.6T70 71', 'skin', 2.4, { lc: 'line' });

export const MOMENT_FACES: PartLibrary = {
  vm_eyes_none: { layers: {} },
  vm_eyes_squeeze: { layers: { eyes: [{ ...EYES_SQUEEZE, d: EYES_SQUEEZE.d + 'M77.4 49.6L67.6 54.4L77.4 59.2' }] } },
  vm_mouth_wobble: { layers: { mouth: [MOUTH_WOBBLE] } },
  vm_mouth_o: { layers: { mouth: [S(ell(60, 73, 3.6, 4.4), 'mouth', { ln: 2, lc: 'ink' })] } },
};

/** An expression: the face parts it swaps in (brows only when the look's brows allow it). */
export interface Expression {
  eyes: string;
  mouth: string;
  brows?: string;
}

export const EXPRESSIONS = {
  /** The look as created. */
  base: null,
  smug: { eyes: 'eyes_sharp', mouth: 'mouth_smirk', brows: 'brows_arched' },
  effort: { eyes: 'eyes_sharp', mouth: 'mouth_toothy', brows: 'brows_determined' },
  cheer: { eyes: 'eyes_happy', mouth: 'mouth_laugh' },
  nervous: { eyes: 'eyes_wide', mouth: 'vm_mouth_wobble', brows: 'brows_worried' },
  shock: { eyes: 'eyes_wide', mouth: 'mouth_shout', brows: 'brows_raised' },
  ouch: { eyes: 'vm_eyes_squeeze', mouth: 'mouth_shout', brows: 'brows_worried' },
  dizzy: { eyes: 'vm_eyes_none', mouth: 'vm_mouth_wobble', brows: 'brows_raised' },
  blank: { eyes: 'vm_eyes_none', mouth: 'vm_mouth_o', brows: 'brows_raised' },
  sulk: { eyes: 'eyes_tired', mouth: 'mouth_frown', brows: 'brows_worried' },
  determined: { eyes: 'eyes_sharp', mouth: 'mouth_flat', brows: 'brows_determined' },
  wry: { eyes: 'eyes_tired', mouth: 'mouth_smirk', brows: 'brows_raised' },
  squint: { eyes: 'eyes_happy', mouth: 'mouth_toothy', brows: 'brows_worried' },
} as const satisfies Record<string, Expression | null>;

export type ExpressionId = keyof typeof EXPRESSIONS;

/** A look wearing an expression (the saved look never changes). */
export function withExpression(look: ResolvedLook, id: ExpressionId): ResolvedLook {
  const x: Expression | null = EXPRESSIONS[id];
  if (!x) return look;
  const parts = { ...look.parts, eyes: x.eyes, mouth: x.mouth };
  if (x.brows && look.parts.brows !== 'brows_uni' && look.parts.brows !== 'brows_scarred') parts.brows = x.brows;
  return { parts, tints: look.tints };
}

// =================================================================================================
// Face overlays (bust box 120 x 120)
// =================================================================================================

/** Wide white cartoon eyes peeking out of cream, tar or a dark cannon mouth (the node blinks). */
export const PEEK_EYES = art(120, 120, [
  S(ell(48, 53, 6.6, 7.6) + ell(72, 53, 6.6, 7.6), 'white', { ln: 2, lc: '#3a2a22', sh: 1.4 }),
  S(ell(49.4, 54.4, 2.8, 3.3) + ell(73.4, 54.4, 2.8, 3.3), '#1d1512', { ln: 0 }),
  S(ell(48.2, 52.4, 1.1) + ell(72.2, 52.4, 1.1), 'white', { ln: 0 }),
]);

/** One spiral eye (16 x 16; the dizzy eyes turn). */
export const SPIRAL_EYE = art(16, 16, [
  S(ell(8, 8, 7.2), 'white', { ln: 1.8, lc: '#3a2a22', sh: 1.2 }),
  L(spiral(8, 8, 5.6, 2.25), '#2a1d18', 1.5),
]);

function spiral(cx: number, cy: number, r: number, turns: number): string {
  const n = Math.round(turns * 16);
  let d = '';
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * turns * Math.PI * 2;
    const rr2 = (i / n) * r;
    d += `${i === 0 ? 'M' : 'L'}${Math.round((cx + Math.cos(a) * rr2) * 100) / 100} ${Math.round((cy + Math.sin(a) * rr2) * 100) / 100}`;
  }
  return d;
}

export const SWEAT = art(12, 16, [
  S('M6 1C9 6 11 9 11 11.5C11 14.5 8.8 16 6 16C3.2 16 1 14.5 1 11.5C1 9 3 6 6 1Z', '#a8dcff', { m: 'gloss', sh: 1.8, hl: 1, ln: 1.8 }),
]);

const CREAM = '#fffaf0';

/** Cream over the face after the pie (the drips grow from separate nodes). */
export const CREAM_FACE = art(120, 120, [
  S(scallop(60, 55, 33, 31, 15, 0.1), CREAM, { sh: 4, hl: 2, ln: 2.8 }),
  S('M40 78C40 86 38 90 41 92C43.5 93.5 46 92 46 89C46 85 45 81 46 78ZM76 80C76 86 75 89 77.5 90.5C80 91.5 82 90 81.8 87C81.6 84 80.6 82 81 80Z', CREAM, { sh: 1.6, hl: 0.8, ln: 2.4 }),
  S(ell(38, 44, 3.4) + ell(84, 64, 2.6) + ell(50, 30, 2.8), '#ffffff', { ln: 0, op: 0.9, lo: true }),
]);

/** A cream drip (8 x 24; grows down from its top). */
export const CREAM_DRIP = art(8, 24, [S('M1 0C1 10 0 18 2 21.5C3.5 24 6.5 23.5 7 20.5C7.4 16 6.6 8 7 0Z', CREAM, { sh: 1.4, hl: 0.8, ln: 2 })]);

const TAR = '#26222c';

/**
 * Tar over the head: a glossy cap over the hair and brow that drips down the cheeks and sides; the
 * eyes peek out of its edge (a separate node) and the mouth stays visible, so the General is still
 * recognisable under it.
 */
export const TAR_COAT = art(120, 120, [
  S(
    'M13 64C7 30 30 -8 60 -8C90 -8 113 30 107 64C106 71 101 73 99 68C97 80 92 85 89 76C87 68 85 64 81 62C78 68 75 70 72 65C69 61 66 60 62 62C59 64 56 64 53 61C50 58 46 60 44 64C42 69 38 69 36 63C33 70 29 72 27 66C26 78 21 82 18 75C15 72 13 68 13 64Z',
    TAR,
    { m: 'gloss', sh: 5, hl: 2.6, ln: 3 },
  ),
  S('M17 70C16 84 14 95 18 100C20.5 103 25 102 25 97C25 90 23 81 24 71ZM95 72C95 84 94 92 97 96C99.5 99 103 97.5 103 94C103 88 101 81 102 72Z', TAR, { m: 'gloss', sh: 2, hl: 1, ln: 2.6 }),
  L('M33 16Q42 3 57 0', '#ffffff', 2.8, { op: 0.34 }),
  L('M90 22Q96 32 95 44', '#ffffff', 2.2, { op: 0.22 }),
  S(ell(46, 36, 2.6) + ell(76, 28, 2.2) + ell(60, 50, 1.8), '#ffffff', { ln: 0, op: 0.26, lo: true }),
]);

/** A drip of tar that runs down the face (8 x 26; grows down from its top). */
export const TAR_DRIP = art(8, 26, [S('M1 0C1 11 0 19 2 23C3.5 26 6.5 25.5 7 22.5C7.4 18 6.6 9 7 0Z', TAR, { m: 'gloss', hl: 0.9, ln: 1.8 })]);

/** The blob of tar flying out of the bucket (40 x 34). */
export const TAR_BLOB = art(40, 34, [
  S('M6 20C2 12 8 4 17 5C22 0 32 1 35 7C41 9 41 18 37 22C38 28 31 33 24 30C19 34 10 32 9 26C5 26 4 23 6 20Z', TAR, { m: 'gloss', sh: 3, hl: 1.6, ln: 2.4 }),
  L('M12 11Q17 7 24 8', '#ffffff', 2, { op: 0.35 }),
]);

/** Soot and a bump after the scuffle (smudges over the face, a crossed plaster on the cheek). */
export const SCUFFED = art(120, 120, [
  S(ell(42, 66, 9, 6) + ell(76, 42, 8, 5) + ell(67, 74, 6, 4), '#3a3440', { ln: 0, op: 0.45 }),
  S(ell(72, 54, 9.5, 8.5), '#7a4a8a', { ln: 0, op: 0.42 }),
  S('M76 64L90 58L91.8 62.4L77.8 68.4Z', '#efd9b4', { ln: 1.6, sh: 1, lc: 'inner' }),
  S('M80 56.6L84.4 55L89.6 67L85.2 68.6Z', '#efd9b4', { ln: 1.6, sh: 1, lc: 'inner' }),
]);

// =================================================================================================
// Props
// =================================================================================================

const WOOD = '#c98a4b';

/** The giant mallet (100 x 150; the grip is at 50, 128). */
export const MALLET = art(100, 150, [
  S(rr(45, 50, 10, 98, 5), '#b97c43', { sh: 2.4, hl: 1.4, ln: 2.8 }),
  L('M48 62V98M52 70V106', '#b97c43', 1, { lc: 'inner', lo: true }),
  S(rr(43.5, 108, 13, 38, 5), '#7c4a2c', { sh: 2, hl: 1, ln: 2.6 }),
  L('M44 117L56 113M44 125L56 121M44 133L56 129M44 141L56 137', '#7c4a2c', 1.2, { lc: 'inner', lo: true }),
  S('M8 22C8 12.5 14.5 7 24 7H76C85.5 7 92 12.5 92 22V42C92 51.5 85.5 57 76 57H24C14.5 57 8 51.5 8 42Z', WOOD, { sh: 8, hl: 3, ln: 3.4 }),
  S('M8 22C8 12.5 14.5 7 24 7H27V57H24C14.5 57 8 51.5 8 42Z', shade(WOOD, 0.8) as Tone, { ln: 0, op: 0.55 }),
  L('M36 20Q50 16.5 64 20M36 33Q50 30 64 33M36 45Q50 43 64 45', WOOD, 1.2, { lc: 'inner', lo: true }),
  S(rr(22, 4, 9, 56, 3) + rr(69, 4, 9, 56, 3), '#9aa0a6', { m: 'metal', sh: 4, hl: 2, ln: 2.6 }),
  S(ell(26.5, 14, 1.5) + ell(26.5, 50, 1.5) + ell(73.5, 14, 1.5) + ell(73.5, 50, 1.5), '#e3e7ea', { ln: 0, lo: true }),
]);

/** The cream pie (64 x 40). */
export const PIE = art(64, 40, [
  S('M6 22H58L52 37C51.5 38.4 50 39 48.5 39H15.5C14 39 12.5 38.4 12 37Z', '#c4c8ce', { m: 'metal', sh: 3, hl: 1.4, ln: 2.6 }),
  L('M15 25L17.5 36M23 25L24.5 36M32 25V36M41 25L39.5 36M49 25L46.5 36', '#c4c8ce', 1.1, { lc: 'inner', lo: true }),
  S(rr(4, 19, 56, 6, 3), '#e3b26a', { sh: 1.6, hl: 1, ln: 2.4 }),
  S('M5 21C4 15 9 12 13.5 13.5C15 8 21 5.5 26 8.5C29.5 3.5 37.5 3.5 40.5 8.5C45.5 6 52.5 9.5 53 15C57.5 15.5 60 19 58.5 21.5C42 23.5 22 23.5 5 21Z', CREAM, { sh: 3.2, hl: 1.4, ln: 2.6 }),
  L('M32.5 2.5Q35 -1.5 39 -1', '#4f7a2a', 1.6),
  S(ell(32, 6.5, 4.4), '#cf2f3d', { m: 'gloss', sh: 1.6, hl: 1.2, ln: 2.2 }),
]);

/** The pie tin stuck on a face, seen from below (64 x 60). */
export const PIE_STUCK = art(64, 60, [
  S(scallop(32, 30, 30, 28, 13, 0.14), CREAM, { sh: 3, hl: 1.6, ln: 2.6 }),
  S(ell(32, 30, 24, 22), '#c4c8ce', { m: 'metal', sh: 4, hl: 2, ln: 2.8 }),
  L(ell(32, 30, 17, 15.5), '#c4c8ce', 1.4, { lc: 'inner' }),
  L(ell(32, 30, 9, 8), '#c4c8ce', 1.2, { lc: 'inner', lo: true }),
]);

export const CHERRY = art(12, 16, [L('M6.5 5Q8.5 1 12 1.5', '#4f7a2a', 1.6), S(ell(6, 10, 4.4), '#cf2f3d', { m: 'gloss', sh: 1.6, hl: 1.2, ln: 2.2 })]);

/** A blob of cream or water flying off (12 x 12). */
export const BLOB = art(12, 12, [S(ell(6, 6, 4.6, 4.2), CREAM, { sh: 1.4, hl: 0.8, ln: 1.8 })]);

/** The bucket of tar (60 x 64; tipped over the opponent's head). */
export const TAR_BUCKET = art(60, 64, [
  L('M9 20C10 1 50 1 51 20', '#4a4e58', 2.4),
  S('M8 16H52L47 58C46.6 61 44 62.5 40 62.5H20C16 62.5 13.4 61 13 58Z', '#8a5a3a', { sh: 5, hl: 2, ln: 2.8 }),
  L('M20 18L22 61M30 18V62M40 18L38 61', '#8a5a3a', 1.2, { lc: 'inner', lo: true }),
  S('M9.4 26H50.6L50 31.5H10ZM11.4 48H48.6L48 53.5H12Z', '#5a5e66', { m: 'metal', sh: 1.6, hl: 0.8, ln: 2.2 }),
  S(ell(30, 16, 22, 5.4), '#6e4a30', { sh: 1.6, ln: 2.4 }),
  S(ell(30, 16.6, 19, 3.8), TAR, { m: 'gloss', hl: 1, ln: 0 }),
  S('M40 15C42 15 43 17.5 43 23C43 26 41 27 40 25C39 23 39 18.5 40 15Z', TAR, { m: 'gloss', hl: 0.8, ln: 1.6 }),
  S(ell(24, 15.6, 2.2, 1.1), '#5a5266', { ln: 0, op: 0.9 }),
]);

/** The pouring tar (24 x 70; grows down from the bucket's mouth). */
export const TAR_STREAM = art(24, 70, [
  S('M6 0H18C17 14 20 28 17 42C15 54 18 62 15 67C13.5 70 10.5 70 9.5 67C7 61 9.5 53 7.5 42C5 28 7 14 6 0Z', TAR, { m: 'gloss', hl: 1.4, ln: 2.4 }),
]);

/** The pillow (80 x 56). */
export const PILLOW = art(80, 56, [
  S('M7 9C20 3 60 3 73 9C79 21 79 35 73 47C60 53 20 53 7 47C1 35 1 21 7 9Z', '#f4eef6', { sh: 6, hl: 3, ln: 2.8 }),
  L('M20 7V50M32 6V51M44 6V51M56 6V51M68 7.5V49.5', '#e48aa6', 2.6, { op: 0.75, lo: true }),
  S('M7 9L2 4L11 6.6ZM73 9L78 4L69 6.6ZM7 47L2 52L11 49.4ZM73 47L78 52L69 49.4Z', '#f4eef6', { ln: 2, sh: 0.8 }),
]);

/** One feather (14 x 34). */
export const FEATHER = art(14, 34, [
  S('M7 2C11 7 12.4 15 11.4 23C10.6 28 8.6 31 7 32.4C5.4 31 3.4 28 2.6 23C1.6 15 3 7 7 2Z', '#fbfaf6', { sh: 2.2, hl: 1, ln: 1.8 }),
  L('M3.4 14.4L6.2 16M3 20.4L6.2 21.6M10.8 12.4L7.8 14M11.2 18.6L7.8 20.2', '#fbfaf6', 1.1, { lc: 'inner', lo: true }),
  L('M7 5V34', '#b9b2a4', 1.2),
]);

/** A white puff (the pillow bursting, the cloud clearing) (64 x 52). */
export const PUFF = art(64, 52, puffs([[18, 30, 13], [44, 30, 14], [31, 20, 15], [30, 36, 12]], '#ffffff'));

const IRON = '#3a3f45';

/** The cannon's carriage and wheels (130 x 66; the barrel is a child node). */
export const CANNON = art(130, 66, [
  S('M16 30L96 22L106 44H12Z', '#7a4e2a', { sh: 5, hl: 2, ln: 2.8 }),
  S(rr(10, 38, 98, 12, 4), '#6a4226', { sh: 3, hl: 1, ln: 2.6 }),
  ...[30, 86].flatMap((cx): Shape[] => [
    S(ell(cx, 48, 15), '#5a3a22', { sh: 4, hl: 1.6, ln: 2.8 }),
    L(`M${cx - 10} 48H${cx + 10}M${cx} 38V58M${cx - 7} 41L${cx + 7} 55M${cx + 7} 41L${cx - 7} 55`, '#3e2614', 2),
    L(ell(cx, 48, 15), IRON, 3),
    S(ell(cx, 48, 4.2), '#9aa0a6', { m: 'metal', hl: 1, ln: 1.8 }),
  ]),
]);

/** The barrel (112 x 44; pivot at 30, 30; the muzzle at the right end, the fuse at the left). */
export const BARREL = art(112, 44, [
  L('M16 8C12 -1 18 -7 24 -12', '#d8c08a', 2.4),
  S('M6 12C6 7.5 9 5 13.5 5H86L96 9V35L86 39H13.5C9 39 6 36.5 6 32Z', IRON, { m: 'metal', sh: 6, hl: 2.6, ln: 3 }),
  S(rr(30, 4, 7, 36, 2.4) + rr(62, 5, 6, 34, 2.2), '#4c535b', { m: 'metal', sh: 2, hl: 1, ln: 2.2 }),
  S(ell(5.5, 22, 6), '#4c535b', { m: 'metal', sh: 2, hl: 1, ln: 2.4 }),
  S(rr(89, 1, 18, 42, 6), '#2e3238', { m: 'metal', sh: 4, hl: 2, ln: 2.8 }),
  S(ell(99.5, 22, 10.5, 16), '#0e0f12', { ln: 2, lc: '#000000' }),
]);

/** Two big white eyes in the dark of the cannon's mouth (30 x 16). */
export const DARK_EYES = art(30, 16, [
  S(ell(8, 8, 6.4, 7.2) + ell(22, 8, 6.4, 7.2), 'white', { ln: 1.6, lc: '#0e0f12', sh: 1.2 }),
  S(ell(9.4, 8.8, 2.8, 3.2) + ell(23.4, 8.8, 2.8, 3.2), '#1d1512', { ln: 0 }),
  S(ell(8.2, 6.8, 1.1) + ell(22.2, 6.8, 1.1), 'white', { ln: 0 }),
]);

/** A long match with its flame (12 x 60; the flame flickers as its own node). */
export const MATCH = art(12, 60, [S(rr(4.4, 12, 3.2, 47, 1.6), '#e8c98a', { sh: 1, hl: 0.6, ln: 1.8 }), S(ell(6, 12, 3.6, 4.6), '#c43a2a', { m: 'gloss', sh: 1.2, hl: 0.8, ln: 1.8 })]);

export const FLAME = art(14, 20, [
  S('M7 0C11.5 6 12.5 11.5 7 18C1.5 11.5 2.5 6 7 0Z', '#ffad33', { ln: 1.6, lc: '#b8501a' }),
  S('M7 6C9.4 9.5 9.6 12.5 7 15.5C4.4 12.5 4.6 9.5 7 6Z', '#fff1a8', { ln: 0 }),
]);

/** A spark (10 x 10). */
export const SPARK = art(10, 10, [S(star(5, 5, 4, 5, 1.6, -90), '#fff1a8', { ln: 1.2, lc: '#e08a1a' })]);

/** Grey smoke (64 x 52). */
export const SMOKE = art(64, 52, puffs([[18, 32, 13], [44, 31, 14], [31, 19, 15], [30, 37, 12]], '#c9c4bd'));

/** The muzzle flash (56 x 56). */
export const BLAST = art(56, 56, [S(star(28, 28, 9, 27, 11), '#ffd23f', { ln: 2.4, lc: '#c2491c', sh: 4 }), S(star(28, 28, 9, 15, 7, -70), '#fff6c8', { ln: 0 })]);

/** The dust cloud of the scuffle (200 x 130): uneven puffs, swirls of the brawl inside, specks, action lines. */
export const DUST_CLOUD = art(200, 130, [
  ...puffs(
    [
      [22, 54, 15],
      [180, 48, 16],
      [36, 80, 27],
      [166, 78, 28],
      [64, 46, 30],
      [136, 40, 32],
      [100, 26, 27],
      [50, 106, 22],
      [152, 106, 24],
      [100, 102, 30],
      [100, 66, 40],
    ],
    '#dcc59a',
  ),
  L('M68 72Q82 56 98 66Q112 76 126 62M80 94Q96 86 114 96M58 56Q66 47 77 50M122 46Q132 42 140 48', '#a88c5c', 2.6, { op: 0.85 }),
  S(ell(72, 30, 3) + ell(140, 98, 2.6) + ell(42, 94, 2.2) + ell(164, 30, 2.4) + ell(118, 112, 2), '#8a7048', { ln: 0, op: 0.75 }),
  L('M10 36L-4 30M6 68L-8 70M190 30L204 22M196 68L210 70M26 120L14 130M174 120L186 130', '#9a7e50', 3.2, { lo: true }),
]);

/** A boot kicking out of the cloud (36 x 30). */
export const BOOT = art(36, 30, [
  S('M4 4H18V16H30C34 16 35 20 34 24C33.4 26.6 31 27.5 28 27.5H6C4 27.5 3 26 3 24Z', '#4a3428', { sh: 3, hl: 1.2, ln: 2.6 }),
  S(rr(2, 22, 33, 6, 2.6), '#2c1f18', { ln: 2 }),
]);

/** A gold cartoon star (16 x 16): dizzy stars, sparks of an impact. */
export const STAR = art(16, 16, [S(star(8, 8.4, 5, 7.6, 3.4), '#ffd84a', { m: 'gold', sh: 1.8, hl: 1, ln: 1.8 })]);

/** The far-off twinkle where the launched opponent vanishes (32 x 32). */
export const TWINKLE = art(32, 32, [
  S('M16 0L19.4 12.6L32 16L19.4 19.4L16 32L12.6 19.4L0 16L12.6 12.6Z', '#fffbe0', { ln: 1.6, lc: '#e0a51a' }),
  S('M16 7L17.6 14.4L25 16L17.6 17.6L16 25L14.4 17.6L7 16L14.4 14.4Z', '#ffffff', { ln: 0 }),
]);

/** The surrender flag that pops up behind the wall (40 x 64). */
export const WHITE_FLAG = art(40, 64, [
  S(rr(4, 2, 4.4, 62, 2.2), '#9a6a3c', { sh: 1, hl: 0.8, ln: 2 }),
  S('M8.4 6C16 1.5 24 10 37 5.5V28C24 32.5 16 24 8.4 28.5Z', '#fbfaf6', { sh: 3, hl: 1.4, ln: 2.4 }),
]);

/** A small grey rain cloud (90 x 54) and a drop (6 x 12). */
export const RAIN_CLOUD = art(90, 54, puffs([[24, 32, 16], [64, 32, 17], [44, 22, 19], [45, 36, 15]], '#5f6a80'));
export const DROP = art(8, 14, [S('M4 0.6C6.4 5 7.4 7.4 7.4 9.6C7.4 12 5.8 13.6 4 13.6C2.2 13.6 0.6 12 0.6 9.6C0.6 7.4 1.6 5 4 0.6Z', '#9fd0ff', { ln: 1.4, lc: '#2f5f8a', hl: 0.8, m: 'gloss' })]);

/** The tumbleweed of the stand-off (44 x 44): a ball of dry twigs. */
export const TUMBLEWEED = art(44, 44, [
  S(ell(22, 22, 19), '#c49a5c', { ln: 2.4, sh: 4, hl: 1.6, op: 0.95 }),
  L(
    'M6 22C10 8 30 4 38 16M8 30C18 38 34 36 38 24M12 10C22 18 24 30 18 40M30 6C26 16 30 30 36 34M4 18C14 22 28 18 40 22M14 36C16 26 26 14 34 10M22 3C20 14 22 28 26 41',
    '#7a5426',
    2.2,
  ),
  L('M10 16C16 12 24 12 30 16M12 28C20 32 28 30 34 28', '#e6c48a', 1.4, { op: 0.9 }),
]);

/** A streak of wind (60 x 8). */
export const WIND = art(60, 8, [L('M2 5C14 1 26 7 38 4S54 2 58 4', '#ffffff', 2.4, { op: 0.75 })]);

/** A question mark over a shrug (20 x 30). */
export const QUESTION = art(20, 30, [
  L('M4.6 9C4.6 4.2 8 2 11 2C14.8 2 16.6 4.8 16.6 7.6C16.6 11.2 13 12.4 11.6 14.6C10.8 15.8 10.8 17.2 10.8 19', '#3a2a10', 6.6),
  L('M4.6 9C4.6 4.2 8 2 11 2C14.8 2 16.6 4.8 16.6 7.6C16.6 11.2 13 12.4 11.6 14.6C10.8 15.8 10.8 17.2 10.8 19', '#ffd84a', 3.6),
  S(ell(10.8, 25.4, 2.8), '#ffd84a', { m: 'gold', ln: 1.8, lc: '#3a2a10' }),
]);


/** A trail puff behind a flying General (16 x 16). */
export const TRAIL = art(16, 16, [S(ell(8, 8, 6.4), '#f2efe8', { sh: 1.6, ln: 1.6 })]);

const CONFETTI_COLORS = ['#ffcf3a', '#3cc46b', '#ef5a4a', '#a855f7', '#22b8cf', '#ff8fc8'];

/** A confetti strip (8 x 12) in one of six colours. */
export function confetti(k: number): Art {
  const c = CONFETTI_COLORS[k % CONFETTI_COLORS.length]!;
  return art(8, 12, [S(k % 3 === 0 ? ell(4, 6, 3.6, 4.6) : rr(0.6, 0.6, 6.8, 10.8, 1.4), c as Tone, { ln: 1.2, hl: 0.8 })]);
}

/** The comic burst behind an impact word (110 x 64); the word is SVG text over it. */
export const BURST = art(110, 64, [
  S('M55 1L64 13L79 4L80 18L98 13L92 27L109 32L92 38L99 52L80 47L78 62L64 52L55 63L46 52L32 62L30 47L11 52L18 38L1 32L18 27L12 13L30 18L31 4L46 13Z', '#ffd23f', { ln: 2.6, lc: '#9a3a12', sh: 3, hl: 1.6 }),
  S('M55 12L61 20L72 15L71 25L84 26L76 33L84 40L71 41L72 51L61 46L55 54L49 46L38 51L39 41L26 40L34 33L26 26L39 25L38 15L49 20Z', '#ff8a3a', { ln: 0, op: 0.55 }),
]);

/** The burst with its word as one SVG (the word comes translated; letters are escaped). */
export function burstSvg(word: string, look?: ResolvedLook): string {
  const esc = word.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  const base = svgOf(BURST, look);
  const fs = word.length > 6 ? 17 : 21;
  const text = `<text x="55" y="38.5" text-anchor="middle" style="font-family:var(--ui-font-display),sans-serif" font-weight="900" font-size="${fs}" letter-spacing="0.5" fill="#fffdf4" stroke="#5a1e0a" stroke-width="4.4" stroke-linejoin="round" paint-order="stroke fill">${esc}</text>`;
  return base.replace('</svg>', `${text}</svg>`);
}

// =================================================================================================
// The stage: sky (CSS), sun, clouds, hills, ground and the wall the Generals stand behind
// =================================================================================================

/** Stage palettes per outcome (warm for a win, cool dusk for a loss, neutral for a draw). */
export const STAGE_PALETTE = {
  win: { hillFar: '#b7c88f', hillNear: '#8fb062', ground: '#7ea457', sun: '#fff1b8' },
  loss: { hillFar: '#8f9cb3', hillNear: '#6f8796', ground: '#62806e', sun: '#dfe6f2' },
  draw: { hillFar: '#a9bfa6', hillNear: '#86a585', ground: '#789c70', sun: '#fff5d6' },
} as const;

export type StageMood = keyof typeof STAGE_PALETTE;

/** The wide strips span 1,000 units so a wide slot never shows their ends (360 + 320 each side). */
export const STRIP_W = 1000;
export const STRIP_X = -320;

export function hills(mood: StageMood): { far: Art; near: Art } {
  const p = STAGE_PALETTE[mood];
  return {
    far: art(STRIP_W, 70, [
      S('M0 70V40C80 18 150 22 230 34C310 46 360 14 450 18C540 22 580 44 660 38C740 32 800 10 880 16C940 20 980 30 1000 34V70Z', p.hillFar as Tone, { sh: 0, hl: 2, ln: 0, op: 0.95 }),
    ]),
    near: art(STRIP_W, 60, [
      S('M0 60V38C70 26 140 24 210 36C280 48 330 30 400 28C470 26 540 46 610 42C690 38 740 22 820 26C900 30 950 40 1000 38V60Z', p.hillNear as Tone, { sh: 0, hl: 2.2, ln: 2.4, lc: 'inner' }),
      S(ell(206, 30, 16, 12) + ell(226, 33, 12, 9) + ell(612, 36, 15, 11) + ell(800, 22, 14, 10), shade(p.hillNear, 0.86) as Tone, { ln: 2, lc: 'inner', hl: 1.4 }),
    ]),
  };
}

export function ground(mood: StageMood): Art {
  const g = STAGE_PALETTE[mood].ground;
  return art(STRIP_W, 30, [S(`M0 6C200 2 800 2 1000 6V30H0Z`, g as Tone, { hl: 1.6, ln: 0 }), L('M0 7C200 3 800 3 1000 7', shade(g, 0.7) as Tone, 2, { op: 0.6 })]);
}

/** The wall: stone blocks under a timber rail, across the whole strip (1000 x 60). */
export const WALL = art(STRIP_W, 60, (() => {
  const shapes: Shape[] = [S('M0 8H1000V60H0Z', '#b6a68a', { sh: 0, ln: 0 })];
  let blocks = '';
  for (let row = 0; row < 3; row++) {
    const y = 12 + row * 16;
    for (let x = row % 2 === 0 ? 0 : -24; x < STRIP_W; x += 48) blocks += rr(x + 1.5, y, 45, 14, 3.5);
  }
  shapes.push(S(blocks, '#c2b295', { sh: 3, hl: 1.2, ln: 2, lc: 'inner' }));
  shapes.push(S(rr(-4, 2, STRIP_W + 8, 12, 4), '#8a5a3a', { sh: 3, hl: 1.6, ln: 2.6 }));
  shapes.push(L('M0 7H1000', '#8a5a3a', 1, { lc: 'inner', op: 0.8 }));
  return shapes;
})());

/** A team pennant hanging from the rail: a circle for you, a diamond for the opponent (A11 cues). */
export function pennant(colour: string, mine: boolean): Art {
  const glyph = mine ? ell(14, 17, 5) : 'M14 11L20 17L14 23L8 17Z';
  return art(28, 40, [
    S('M2 0H26V30L14 38L2 30Z', colour as Tone, { sh: 4, hl: 1.6, ln: 2.4 }),
    S(glyph, mix(colour, '#ffffff', 0.78) as Tone, { ln: 1.6, lc: 'inner' }),
  ]);
}

export function cloud(): Art {
  return art(80, 36, puffs([[20, 24, 11], [52, 23, 13], [36, 16, 14], [64, 27, 8]], '#ffffff', { op: 0.92 }));
}

export function sun(mood: StageMood): Art {
  const c = STAGE_PALETTE[mood].sun;
  let rays = '';
  for (let i = 0; i < 12; i++) {
    const a0 = (i / 12) * Math.PI * 2;
    const a1 = a0 + Math.PI / 24;
    const p = (a: number, r: number): string => `${Math.round((40 + Math.cos(a) * r) * 10) / 10} ${Math.round((40 + Math.sin(a) * r) * 10) / 10}`;
    rays += `M${p(a0 - 0.02, 20)}L${p(a0 - 0.05, 40)}L${p(a1 + 0.05, 40)}L${p(a1 + 0.02, 20)}Z`;
  }
  return art(80, 80, [S(rays, c as Tone, { ln: 0, op: 0.45 }), S(ell(40, 40, 17), c as Tone, { ln: 0, hl: 2 })]);
}
