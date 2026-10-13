/**
 * The six starter emotes performed by a General's own head (PLAN 2a "Emotes (6 starter)", closing AUDIT
 * #15): the player's look, or the opponent's (the AI General's fixed look, the generated player's look),
 * with expression parts that override the eyes, mouth and brows for the moment (never the saved look)
 * and props drawn in the same art sheet style as the parts (cel shadow band, one highlight, outline
 * in the fill's own dark, never black):
 *
 * - **Laugh:** eyes squeezed shut, the open laughing mouth, joy tears flying off.
 * - **Salute:** a gloved hand snapped to the brow, a proud smile.
 * - **Cry:** shut eyes, tear streams down the cheeks with drops falling, a wobbly mouth, worried brows.
 * - **Angry:** a red flush, an anger mark, steam puffs, furrowed brows and gritted teeth.
 * - **Thumbs up:** a gloved fist with the thumb up, a wink and a grin.
 * - **GG:** a small gold trophy held up, happy eyes and a grin, two sparkles.
 *
 * Parts live in the avatar's 120-unit box (head centre 60, 52). The renderer puts them in four groups
 * the motion sheet animates (`emote.css`): `emo-head` (the whole figure, with `emo-front`: tears and
 * flush on the face), `emo-fx` (joy tears, drops, steam, sparkles) and `emo-prop` (the hand or the
 * trophy). Every group's resting state is the emote's key pose, which Reduce motion shows still.
 */
import type { BaseEmoteId } from '@/contracts';
import { both, ell, mapPath, rr } from './path';
import type { PartLibrary, Shape, Tone } from './types';

const S = (d: string, c: Tone, o: Partial<Shape> = {}): Shape => ({ d, c, ...o });
const L = (d: string, c: Tone, ln: number, o: Partial<Shape> = {}): Shape => ({ d, c, st: true, ln, ...o });
const lash = (d: string, w = 2.6): Shape => L(both(d), 'skin', w, { lc: 'line' });
const brow = (d: string, w = 4.2): Shape => L(both(d), 'hair', w, { lc: 'inner' });

/** Expression parts only an emote uses (never offered in the creator). */
export const EMOTE_PARTS: PartLibrary = {
  // laugh: shut tight, chevrons pointing at the nose
  emo_eyes_squeeze: { layers: { eyes: [lash('M42.4 50.2L52.8 54.6L42.4 59', 3)] } },
  // cry: shut and slanting down to the outer corner, a wet lower lid
  emo_eyes_cry: {
    layers: {
      eyes: [lash('M53.6 52.2Q48.6 56.8 42.2 55', 3), L(both('M44 58.4Q47.6 60.2 51.6 58.6'), 'skin', 1.6, { lc: 'inner', lo: true })],
    },
  },
  // angry: a steep V
  emo_brows_furrow: { layers: { brows: [brow('M41.4 42.8L54 49.4', 4.6)] } },
  // angry: clenched teeth in a tight grimace
  emo_mouth_grit: {
    layers: {
      mouth: [
        S('M50.6 70.6Q60 66.4 69.4 70.6L68.6 75.4Q60 72.8 51.4 75.4Z', 'white', { ln: 2.1, lc: 'ink', sh: 1.2 }),
        L('M51.2 73Q60 69.8 68.8 73', 'ink', 1, { op: 0.55 }),
        L('M55.8 70.2V74.4M60 69.4V73.4M64.2 70.2V74.4', 'ink', 0.9, { op: 0.45, lo: true }),
      ],
    },
  },
  // cry: an open, wavy wail
  emo_mouth_wobble: {
    layers: {
      mouth: [
        S('M51.6 73Q54.2 69.4 57 71.6Q60 68.8 63 71.6Q65.8 69.4 68.4 73Q66.4 79.2 60 79.4Q53.6 79.2 51.6 73Z', 'mouth', { ln: 2, lc: 'ink' }),
        S('M54.6 77.2Q60 74 65.4 77.2Q60 80.2 54.6 77.2Z', '#d8696a', { ln: 0 }),
      ],
    },
  },
};

/** The face each emote wears (an emote's eyes, mouth and brows; the look's own uni or scarred brows stay). */
export const EMOTE_FACES: Readonly<Record<BaseEmoteId, { eyes: string; mouth: string; brows?: string }>> = {
  laugh: { eyes: 'emo_eyes_squeeze', mouth: 'mouth_laugh', brows: 'brows_raised' },
  salute: { eyes: 'eyes_bright', mouth: 'mouth_smile', brows: 'brows_determined' },
  cry: { eyes: 'emo_eyes_cry', mouth: 'emo_mouth_wobble', brows: 'brows_worried' },
  angry: { eyes: 'eyes_sharp', mouth: 'emo_mouth_grit', brows: 'emo_brows_furrow' },
  thumbsUp: { eyes: 'eyes_wink', mouth: 'mouth_grin', brows: 'brows_raised' },
  gg: { eyes: 'eyes_happy', mouth: 'mouth_grin', brows: 'brows_raised' },
};

// ---------------------------------------------------------------------------------------------
// Props (a glove, a trophy) and effects (tears, flush, steam, sparkles)
// ---------------------------------------------------------------------------------------------

const GLOVE: Tone = '#f4eee2';
const GOLD: Tone = '#e8b23a';
const TEAR: Tone = '#86cdf5';
const FLUSH: Tone = '#e2513f';
const STEAM: Tone = '#eef1f4';

/** Rotates by `deg` (clockwise on screen) and moves by (dx, dy): a prop drawn at the origin, then placed. */
function place(d: string, deg: number, dx: number, dy: number): string {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return mapPath(d, (x, y) => [Math.round((x * c - y * s + dx) * 100) / 100, Math.round((x * s + y * c + dy) * 100) / 100]);
}

/** A flat gloved hand pointing along +x from the wrist at the origin, fingers together, palm out. */
const BLADE = 'M0 -5.6C6 -6.8 14.4 -6.8 22.2 -5.4C26.4 -4.6 28 -1.4 26.8 1.4C25.8 3.8 22.6 4.6 19 4.4L8.4 4.8C4.6 6.4 1.2 6.6 0 5.6Z';
const BLADE_THUMB = 'M4.6 3.2C8.6 7.8 15 8.6 17.6 6.6C18.8 5.4 17.6 3.6 15.2 3.6L8.2 3.4Z';
const BLADE_LINES = 'M10.4 -1.8L24.6 -1.8M10.4 1.6L23.6 1.8';
const CUFF = 'M-3.4 -7.6L2 -7.8L2.6 7.8L-3.4 7.4Z';
const SLEEVE = 'M-3.2 -7.4L-26 -10.6L-27 10.4L-3.2 7.2Z';

function saluteHand(): Shape[] {
  // the General's right hand at the brow (viewer's left), fingertips at the outer corner of the brow
  const at = (d: string) => place(d, -40, 17.6, 59);
  return [
    S(at(SLEEVE), 'cloth', { sh: 2.6, hl: 1.4, ln: 3 }),
    S(at(CUFF), 'clothLight', { sh: 1.4, ln: 2.4 }),
    S(at(BLADE), GLOVE, { sh: 2.4, hl: 1.4, ln: 2.8 }),
    S(at(BLADE_THUMB), GLOVE, { sh: 1.2, ln: 2.2 }),
    L(at(BLADE_LINES), GLOVE, 1.3, { lc: 'inner', lo: true }),
  ];
}

/** A gloved fist with the thumb up, centred on the origin (the thumb up along -y). */
const FIST = rr(-9.4, -6.4, 18.8, 14.6, 5.4);
const THUMB = 'M-6.6 -5.2C-7.8 -10.6 -6.8 -16.6 -3.6 -18.6C-0.8 -20.4 2.6 -18.8 2.4 -15L1.8 -6Z';
const KNUCKLES = 'M-9 -1.4H5.4M-9 2.6H5.6M-8.6 6.2H4.4';
const FIST_CUFF = 'M-8.4 7.6H8.6L9.6 12.4H-9.4Z';
const FIST_SLEEVE = 'M-9.6 12.2H9.8L13.4 30H-11.6Z';

function thumbsHand(): Shape[] {
  const at = (d: string) => place(d, 9, 96, 80.6);
  return [
    S(at(FIST_SLEEVE), 'cloth', { sh: 2.6, hl: 1.2, ln: 3 }),
    S(at(FIST_CUFF), 'clothLight', { sh: 1.2, ln: 2.4 }),
    S(at(FIST), GLOVE, { sh: 2.8, hl: 1.4, ln: 2.8 }),
    L(at(KNUCKLES), GLOVE, 1.3, { lc: 'inner', lo: true }),
    S(at(THUMB), GLOVE, { sh: 1.8, hl: 1.2, ln: 2.6 }),
  ];
}

/** A small gold cup with handles, a star on its face, a stem and a stepped base, held up by a glove. */
function trophy(): Shape[] {
  const at = (d: string) => place(d, -8, 97, 42);
  return [
    // the hand under the base
    S(at(rr(-8.6, 15.6, 17.2, 11.6, 4.6)), GLOVE, { sh: 2.2, hl: 1, ln: 2.6 }),
    S(at('M-7.8 26.6H8.2L10.4 40H-9.6Z'), 'cloth', { sh: 2.2, ln: 2.8 }),
    // handles behind the bowl
    L(at('M-9.8 -9.2C-17.2 -10 -17.6 -0.6 -8.2 1.6M9.8 -9.2C17.2 -10 17.6 -0.6 8.2 1.6'), GOLD, 4.2, { lc: 'line' }),
    L(at('M-9.8 -9.2C-17.2 -10 -17.6 -0.6 -8.2 1.6M9.8 -9.2C17.2 -10 17.6 -0.6 8.2 1.6'), GOLD, 2, { op: 0.9 }),
    // bowl, stem, base
    S(at('M-11 -12.4H11C11 -1 6.6 6.2 0 6.8C-6.6 6.2 -11 -1 -11 -12.4Z'), GOLD, { m: 'gold', sh: 3.4, hl: 1.8, ln: 2.8 }),
    S(at(rr(-2.4, 6, 4.8, 5.6, 1.2)), GOLD, { m: 'gold', sh: 1.2, ln: 2.4 }),
    S(at(rr(-8, 11, 16, 5, 1.8)), '#a8692e', { sh: 1.6, hl: 0.9, ln: 2.4 }),
    // a star on its face (no text: A11 icons never carry words)
    S(at('M0 -8.6L1.5 -5.3L5.1 -5L2.4 -2.6L3.2 0.9L0 -0.9L-3.2 0.9L-2.4 -2.6L-5.1 -5L-1.5 -5.3Z'), '#fff1b8', { ln: 1.2, lc: 'inner' }),
  ];
}

/** A tear drop (point up) centred on (x, y). */
const drop = (x: number, y: number, r: number): string =>
  `M${x} ${y - r * 1.9}C${x + r * 0.5} ${y - r * 1.1} ${x + r} ${y - r * 0.5} ${x + r} ${y + r * 0.1}A${r} ${r} 0 0 1 ${x - r} ${y + r * 0.1}C${x - r} ${y - r * 0.5} ${x - r * 0.5} ${y - r * 1.1} ${x} ${y - r * 1.9}Z`;

/** A four-point sparkle centred on (x, y). */
const sparkle = (x: number, y: number, r: number): string =>
  `M${x} ${y - r}Q${x} ${y} ${x + r * 0.62} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r * 0.62} ${y}Q${x} ${y} ${x} ${y - r}Z`;

/** A puff of steam: three lobes. */
const puff = (x: number, y: number, s: number): string =>
  `M${x - 5 * s} ${y + 2 * s}C${x - 8.4 * s} ${y + 2 * s} ${x - 8.4 * s} ${y - 3.4 * s} ${x - 4.6 * s} ${y - 3.2 * s}C${x - 4 * s} ${y - 7 * s} ${x + 1.6 * s} ${y - 7.6 * s} ${x + 2.8 * s} ${y - 4 * s}C${x + 6.8 * s} ${y - 5 * s} ${x + 8.6 * s} ${y + 0.6 * s} ${x + 5 * s} ${y + 2 * s}Z`;

/** What each emote adds around the head, by motion group. `fx` shapes carry their own class (`fx`). */
export interface EmoteExtras {
  /** On the face, moving with the head (tear streams, the flush). */
  front?: Shape[];
  /** Flying, falling or rising effects, each with its own motion class. */
  fx?: Shape[];
  /** The hand or the trophy. */
  prop?: Shape[];
}

export const EMOTE_EXTRAS: Readonly<Record<BaseEmoteId, EmoteExtras>> = {
  laugh: {
    fx: [S(place(drop(0, 0, 2.6), -58, 34.4, 49), TEAR, { m: 'gloss', hl: 0.9, ln: 1.6, fx: 'emo-joy emo-joy--l' }), S(place(drop(0, 0, 2.6), 58, 85.6, 49), TEAR, { m: 'gloss', hl: 0.9, ln: 1.6, fx: 'emo-joy emo-joy--r' })],
  },
  salute: { prop: saluteHand() },
  cry: {
    front: [
      S(both('M43.2 57.4C42.4 63.6 41.6 70.2 43 76.4C43.8 79.2 47.4 79.2 47.8 76C48.4 70.4 49 63.6 48.6 57.6Z'), TEAR, { m: 'gloss', hl: 1, ln: 1.8, op: 0.92, fx: 'emo-stream' }),
    ],
    fx: [
      S(drop(45.6, 85, 2.4), TEAR, { m: 'gloss', hl: 0.8, ln: 1.6, fx: 'emo-drop emo-drop--a' }),
      S(drop(74.4, 85, 2.4), TEAR, { m: 'gloss', hl: 0.8, ln: 1.6, fx: 'emo-drop emo-drop--b' }),
    ],
  },
  angry: {
    front: [
      S(ell(60, 46.6, 22.6, 10.4), FLUSH, { ln: 0, op: 0.26, fx: 'emo-flush' }),
      S(both(ell(42.8, 64.6, 6.4, 3.6)), FLUSH, { ln: 0, op: 0.42, fx: 'emo-flush' }),
      // the anger mark: four short curves around a gap, high on the forehead
      L('M73.2 27.4Q76.2 30.4 73.4 33.4M81.6 27.4Q78.6 30.4 81.4 33.4M74.2 26.2Q77.4 29 80.6 26.2M74.4 34.6Q77.4 31.8 80.4 34.6', FLUSH, 2.2, { fx: 'emo-mark' }),
    ],
    fx: [S(puff(27, 22, 1), STEAM, { sh: 1.6, hl: 1, ln: 2.2, fx: 'emo-steam emo-steam--l' }), S(puff(93, 22, 1), STEAM, { sh: 1.6, hl: 1, ln: 2.2, fx: 'emo-steam emo-steam--r' })],
  },
  thumbsUp: {
    prop: thumbsHand(),
    fx: [S(sparkle(108, 58, 4.6), '#ffe58a', { ln: 1.4, fx: 'emo-spark emo-spark--a' })],
  },
  gg: {
    prop: trophy(),
    fx: [S(sparkle(83, 22, 4.4), '#ffe58a', { ln: 1.4, fx: 'emo-spark emo-spark--a' }), S(sparkle(112, 30, 3.2), '#ffe58a', { ln: 1.2, fx: 'emo-spark emo-spark--b' })],
  },
};

/** The emote's view of the 120-unit box: the head with room for the hand or the trophy beside it. */
export const EMOTE_VIEWBOX = '8 3 104 104';
