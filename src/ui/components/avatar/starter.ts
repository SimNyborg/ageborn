/**
 * The free starter parts of the avatar (AUDIT §6.3): every player owns these. Drawn in a 120 × 120 box
 * to the art sheet (§3.1, §3.2): chunky rounded shapes, a cel shadow band on the lower edge of each
 * part, one highlight sliver, colour-matched outlines (3.5 units outside, half that inside). Part ids
 * match `src/content/raw/avatar.ts`.
 */
import { mix, shade } from './color';
import { both, ell, mirrorPath, rr } from './path';
import type { PartArt, PartLibrary, Shape, Tone } from './types';

const S = (d: string, c: Tone, o: Partial<Shape> = {}): Shape => ({ d, c, ...o });
/** A stroke line. */
const L = (d: string, c: Tone, ln: number, o: Partial<Shape> = {}): Shape => ({ d, c, st: true, ln, ...o });

const pt = (cx: number, cy: number, rx: number, ry: number, deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [Math.round((cx + Math.cos(a) * rx) * 100) / 100, Math.round((cy + Math.sin(a) * ry) * 100) / 100];
};

/** Scalloped curve segments along an ellipse from angle a0 to a1 (degrees, 0 = right, -90 = top). */
export function bumps(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n: number, out: number): string {
  let d = '';
  for (let i = 0; i < n; i += 1) {
    const m = a0 + ((a1 - a0) * (i + 0.5)) / n;
    const e = a0 + ((a1 - a0) * (i + 1)) / n;
    const [qx, qy] = pt(cx, cy, rx * (1 + out), ry * (1 + out), m);
    const [ex, ey] = pt(cx, cy, rx, ry, e);
    d += `Q${qx} ${qy} ${ex} ${ey}`;
  }
  return d;
}

// ---------------------------------------------------------------------------------------------
// Face shapes (with ears and cheeks)
// ---------------------------------------------------------------------------------------------

function face(d: string, halfW: number, earY = 55): PartArt {
  const ex = 60 - halfW + 0.8;
  const ear = ell(ex, earY, 5.6, 7.6);
  return {
    layers: {
      ears: [
        S(ear + mirrorPath(ear), 'skin', { sh: 3, ln: 3 }),
        L(`M${ex + 1.6} ${earY - 4}Q${ex - 1.8} ${earY} ${ex + 1.6} ${earY + 4}` + mirrorPath(`M${ex + 1.6} ${earY - 4}Q${ex - 1.8} ${earY} ${ex + 1.6} ${earY + 4}`), 'skin', 1.8, { lc: 'inner', lo: true }),
      ],
      face: [S(d, 'skin', { sh: 7, hl: 2.2 }), S(both(ell(44.5, 64.5, 4.6, 2.7)), '#ec7d68', { ln: 0, op: 0.3, lo: true })],
    },
  };
}

const FACES: PartLibrary = {
  face_round: face(ell(60, 52, 29, 30.5), 29),
  face_oval: face(ell(60, 51.5, 26.5, 31.5), 26.5),
  face_square: face('M31 46C31 27 43 20 60 20C77 20 89 27 89 46V61C89 76 78 84.5 60 84.5C42 84.5 31 76 31 61Z', 29),
  face_long: face('M34.5 47C34.5 26 45 18 60 18C75 18 85.5 26 85.5 47V64C85.5 79 75 87 60 87C45 87 34.5 79 34.5 64Z', 25.5, 56),
  face_heart: face('M30 47C30 27 43 20 60 20C77 20 90 27 90 47C90 64 78 79 60 85C42 79 30 64 30 47Z', 30),
};

// ---------------------------------------------------------------------------------------------
// Eyes (left eye at 48, 54; mirrored to 72)
// ---------------------------------------------------------------------------------------------

const PUPIL = '#1d1512';
const sclera = (d: string): Shape => S(both(d), 'white', { ln: 1.7, lc: 'ink', sh: 1.6 });
const iris = (r: number, cx = 48.6, cy = 54.4): Shape => S(both(ell(cx, cy, r)), 'eyes', { ln: 0, sh: r * 0.45 });
const pupil = (r: number, cx = 48.8, cy = 54.6): Shape => S(both(ell(cx, cy, r)), PUPIL, { ln: 0 });
const glint = (r: number, cx = 47.4, cy = 52.8): Shape => S(both(ell(cx, cy, r)), 'white', { ln: 0 });
const dot = (rx: number, ry: number, cx = 48, cy = 54): Shape => S(both(ell(cx, cy, rx, ry)), 'eyesDark', { ln: 0, hl: 0.9, m: 'gloss' });
const lash = (d: string, w = 2.4): Shape => L(both(d), 'skin', w, { lc: 'line' });

const EYES: PartLibrary = {
  eyes_bright: { layers: { eyes: [sclera(ell(48, 54, 5.2, 6.2)), iris(3.7), pupil(1.9), glint(1.35), lash('M42.6 50.4Q48 46.6 53.4 50.4', 2)] } },
  eyes_wide: { layers: { eyes: [sclera(ell(48, 54, 6.2, 7.2)), iris(3.1, 48.4, 54.8), pupil(1.6, 48.5, 55), glint(1.2, 47.2, 53.2), lash('M41.6 49.6Q48 45 54.4 49.6', 1.8)] } },
  eyes_happy: { layers: { eyes: [lash('M42.8 55.6Q48 49 53.2 55.6', 2.8)] } },
  eyes_sleepy: {
    layers: {
      eyes: [
        S(both('M42.8 53.6H53.2A5.2 5.2 0 0 1 42.8 53.6Z'), 'white', { ln: 1.6, lc: 'ink' }),
        S(both('M45.2 53.6H52A3.4 3.4 0 0 1 45.2 53.6Z'), 'eyes', { ln: 0 }),
        lash('M42.2 53.6H53.8', 2.6),
      ],
    },
  },
  eyes_sharp: {
    layers: {
      eyes: [
        S(both('M42 55.2Q47 48.6 54.4 52.4Q50 58.6 42 55.2Z'), 'white', { ln: 1.7, lc: 'ink' }),
        iris(2.9, 48.8, 54.2),
        pupil(1.5, 49, 54.3),
        glint(1, 47.9, 53),
        lash('M41.4 55.4Q46.6 47.6 55 52', 2.4),
      ],
    },
  },
  eyes_round: { layers: { eyes: [dot(3.5, 4.3), glint(1.35, 46.9, 52.4)] } },
  eyes_almond: {
    layers: {
      eyes: [
        S(both('M42 54.4Q48 48.4 54 54.4Q48 59.4 42 54.4Z'), 'white', { ln: 1.7, lc: 'ink' }),
        iris(3, 48.2, 54.3),
        pupil(1.5, 48.3, 54.4),
        glint(1.1, 47.2, 53.1),
        lash('M41.4 54.4Q48 47.8 54.8 53.6', 2.2),
      ],
    },
  },
  eyes_wink: {
    layers: {
      eyes: [
        S(ell(48, 54, 3.5, 4.3), 'eyesDark', { ln: 0, hl: 0.9, m: 'gloss' }),
        S(ell(46.9, 52.4, 1.35), 'white', { ln: 0 }),
        L('M66.8 55.4Q72 50 77.2 55.4', 'skin', 2.8, { lc: 'line' }),
      ],
    },
  },
  eyes_tired: {
    layers: {
      eyes: [dot(3.2, 3.6, 48, 54.6), glint(1.1, 47, 53.4), lash('M43.4 51.6H52.6', 2.2), L(both('M44 59.4Q48 61.2 52 59.4'), 'skin', 1.5, { lc: 'inner', lo: true })],
    },
  },
  eyes_starry: {
    layers: {
      eyes: [
        sclera(ell(48, 54, 5.8, 6.6)),
        iris(4.4, 48.4, 54.6),
        pupil(2, 48.5, 54.8),
        glint(1.6, 46.8, 52.6),
        S(both(ell(50.4, 57.2, 0.9)), 'white', { ln: 0 }),
        lash('M41.8 50Q48 45.6 54.2 50', 2),
      ],
    },
  },
};

// ---------------------------------------------------------------------------------------------
// Brows (hair tone, drawn as thick shapes)
// ---------------------------------------------------------------------------------------------

const brow = (d: string, w = 3.8): Shape => L(both(d), 'hair', w, { lc: 'inner' });

const BROWS: PartLibrary = {
  brows_determined: { layers: { brows: [brow('M42.2 45.2L53.2 48')] } },
  brows_raised: { layers: { brows: [brow('M42.4 45.4Q47.6 41.4 53 44')] } },
  brows_arched: { layers: { brows: [brow('M42 47.4Q45.4 42 53.2 44.6')] } },
  brows_bushy: { layers: { brows: [S(both('M40.6 47.6Q43.6 41 53.6 42.6Q55 44.2 54.2 46.8Q46.4 44.8 40.6 47.6Z'), 'hair', { ln: 2, lc: 'line', sh: 1.4 })] } },
  brows_thin: { layers: { brows: [brow('M42.8 45.4Q47.8 43.4 52.8 45.2', 2.2)] } },
  brows_scarred: {
    layers: {
      brows: [brow('M42.2 45.2L53.2 48'), L('M69.4 43L72.4 50.6', 'skin', 1.8), L('M69.4 43L72.4 50.6', 'skin', 0.9, { lc: 'inner', lo: true })],
    },
  },
  brows_uni: { layers: { brows: [L('M42 46.6Q50 43.2 60 45.6Q70 43.2 78 46.6', 'hair', 4, { lc: 'inner' })] } },
  brows_worried: { layers: { brows: [brow('M42.4 47.4L53 44.4')] } },
};

// ---------------------------------------------------------------------------------------------
// Noses (skin tone)
// ---------------------------------------------------------------------------------------------

const NOSES: PartLibrary = {
  nose_button: { layers: { nose: [S(ell(60, 62.6, 3.4, 2.8), 'skin', { ln: 1.6, lc: 'inner', sh: 1.4, hl: 0.9 })] } },
  nose_round: {
    layers: {
      nose: [S(ell(60, 62.4, 4.8, 3.8), 'skin', { ln: 1.7, lc: 'inner', sh: 1.8, hl: 1 }), S(both(ell(57.6, 64.4, 0.9, 0.7)), 'skinDark', { ln: 0, op: 0.8, lo: true })],
    },
  },
  nose_long: { layers: { nose: [L('M58.6 53Q57.4 60 56.2 64Q59.6 66.6 63.6 64.4', 'skin', 2, { lc: 'inner' })] } },
  nose_hook: { layers: { nose: [S('M58.6 53.4Q66.6 59.6 63 64.8Q59.6 66.4 56.8 64.2Q60.8 63 59.6 57.6Z', 'skin', { ln: 1.7, lc: 'inner', sh: 1.6 })] } },
  nose_wide: { layers: { nose: [S('M53.8 63.6Q55.6 59.4 60 60.2Q64.4 59.4 66.2 63.6Q60 67.4 53.8 63.6Z', 'skin', { ln: 1.7, lc: 'inner', sh: 1.6, hl: 0.9 })] } },
  nose_small: { layers: { nose: [L('M58.2 62.4Q60 64.4 61.8 62.4', 'skin', 1.9, { lc: 'inner' })] } },
};

// ---------------------------------------------------------------------------------------------
// Mouths
// ---------------------------------------------------------------------------------------------

const lip = (d: string, w = 2.5): Shape => L(d, 'skin', w, { lc: 'line' });

const MOUTHS: PartLibrary = {
  mouth_smile: { layers: { mouth: [lip('M52.6 69.6Q60 75.8 67.4 69.6')] } },
  mouth_grin: {
    layers: {
      mouth: [
        S('M51 68.6Q60 80 69 68.6Q60 71.4 51 68.6Z', 'mouth', { ln: 2, lc: 'ink' }),
        S('M53 69.8Q60 72.2 67 69.8L66.2 71.6Q60 73.6 53.8 71.6Z', 'white', { ln: 0 }),
        S('M56 75.4Q60 73.8 64 75.4Q60 77.4 56 75.4Z', '#d8696a', { ln: 0, lo: true }),
      ],
    },
  },
  mouth_flat: { layers: { mouth: [lip('M54 71.4H66')] } },
  mouth_shout: {
    layers: {
      mouth: [
        S(ell(60, 72.4, 5.4, 6), 'mouth', { ln: 2, lc: 'ink' }),
        S('M55.6 69.2Q60 67.8 64.4 69.2L64 70.6Q60 69.6 56 70.6Z', 'white', { ln: 0 }),
        S(ell(60, 75.8, 3.2, 2), '#d8696a', { ln: 0 }),
      ],
    },
  },
  mouth_smirk: { layers: { mouth: [lip('M53.6 71.6Q61 73 66.6 68.4')] } },
  mouth_whistle: { layers: { mouth: [S(ell(61, 71.4, 2.4, 2.8), 'mouth', { ln: 1.8, lc: 'ink' })] } },
  mouth_toothy: {
    layers: {
      mouth: [
        S('M50.4 68.8Q60 78.6 69.6 68.8Q60 72 50.4 68.8Z', 'white', { ln: 2, lc: 'ink' }),
        L('M55.6 70.6V74.2M60 71.2V75.4M64.4 70.6V74.2', 'ink', 1, { op: 0.55, lo: true }),
      ],
    },
  },
  mouth_gap: {
    layers: {
      mouth: [
        S('M51.6 68.8Q60 78.6 68.4 68.8Q60 71.6 51.6 68.8Z', 'mouth', { ln: 2, lc: 'ink' }),
        S('M53.4 70H58.8V73Q55.6 72.8 53.6 71.2ZM61.2 70H66.6L66.4 71.2Q64.4 72.8 61.2 73Z', 'white', { ln: 0 }),
      ],
    },
  },
  mouth_laugh: {
    layers: {
      mouth: [
        S('M49.6 67.6Q60 85 70.4 67.6Q60 70.6 49.6 67.6Z', 'mouth', { ln: 2, lc: 'ink' }),
        S('M51.6 68.6Q60 71.2 68.4 68.6L67.4 70.8Q60 73 52.6 70.8Z', 'white', { ln: 0 }),
        S('M54.4 77.4Q60 73.8 65.6 77.4Q60 81.6 54.4 77.4Z', '#d8696a', { ln: 0 }),
      ],
    },
  },
  mouth_frown: { layers: { mouth: [lip('M53 73.6Q60 68.4 67 73.6')] } },
};

// ---------------------------------------------------------------------------------------------
// Facial hair (hair tone; drawn under the mouth)
// ---------------------------------------------------------------------------------------------

const MOUSTACHE = 'M60 65.6Q53 64 48.2 67.8Q46.4 70.8 49 71.4Q54 68.8 60 69Q66 68.8 71 71.4Q73.6 70.8 71.8 67.8Q67 64 60 65.6Z';

const FACIAL: PartLibrary = {
  beard_none: { layers: {} },
  beard_stubble: {
    layers: {
      beard: [S('M35.6 63Q37.6 80.6 60 84.4Q82.4 80.6 84.4 63Q78.6 72.4 68.4 74.6Q60 70.4 51.6 74.6Q41.4 72.4 35.6 63ZM52 66.4Q60 63.6 68 66.4Q60 67.6 52 66.4Z', 'hair', { ln: 0, op: 0.32 })],
    },
  },
  beard_full: {
    layers: {
      beard: [
        S('M32.4 57Q32.6 87.6 60 93Q87.4 87.6 87.6 57Q84 72 72.6 74.6Q66.4 68.6 60 69.4Q53.6 68.6 47.4 74.6Q36 72 32.4 57Z', 'hair', { sh: 5, hl: 1.6, ln: 3 }),
        L('M50 80Q52 84 51 87M60 82V89M70 80Q68 84 69 87', 'hair', 1.4, { lc: 'inner', lo: true }),
        S(MOUSTACHE, 'hair', { sh: 1.6, ln: 2.2 }),
      ],
    },
  },
  beard_moustache: { layers: { beard: [S(MOUSTACHE, 'hair', { sh: 1.6, hl: 0.8, ln: 2.4 })] } },
  beard_goatee: {
    layers: {
      beard: [S('M54 76.2Q60 74.4 66 76.2Q66.6 85 60 87.8Q53.4 85 54 76.2Z', 'hair', { sh: 2.4, hl: 0.9, ln: 2.4 }), S('M60 66.2Q55 65 52 67.6Q51.4 69.4 53 69.4Q56 68 60 68.2Q64 68 67 69.4Q68.6 69.4 68 67.6Q65 65 60 66.2Z', 'hair', { ln: 2 })],
    },
  },
  beard_chops: { layers: { beard: [S(both('M30.6 49L36.4 49.4Q37.6 64 47 72.4Q40.4 76.6 34 70.2Q29.6 62 30.6 49Z'), 'hair', { sh: 3, hl: 1, ln: 2.6 })] } },
  beard_braided: {
    layers: {
      beard: [
        S('M33.4 58Q34 82 50 87.6L60 88.6L70 87.6Q86 82 86.6 58Q83 71.6 72.4 74.2Q66.4 68.6 60 69.4Q53.6 68.6 47.6 74.2Q37 71.6 33.4 58Z', 'hair', { sh: 4.4, hl: 1.4, ln: 3 }),
        S(ell(60, 92.4, 4.4, 3.8), 'hair', { sh: 1.6, ln: 2.4 }),
        S(ell(60, 99, 3.8, 3.4), 'hair', { sh: 1.4, ln: 2.4 }),
        S(rr(56.2, 102, 7.6, 3.2, 1.4), '#c9a227', { m: 'gold', ln: 1.8, hl: 0.8 }),
        S(MOUSTACHE, 'hair', { sh: 1.6, ln: 2.2 }),
      ],
    },
  },
  beard_handlebar: {
    layers: {
      beard: [S(both('M60 65.4C55 63.4 49 63.8 45 66.8C43 68.4 40.6 68 40 66C39.6 64.6 40.6 63.4 41.8 64C41.4 65.4 42.8 65.8 44.2 64.6C49 61.4 55 62 60 63Z'), 'hair', { sh: 1.2, ln: 2.2 })],
    },
  },
};

// ---------------------------------------------------------------------------------------------
// Hair (16 styles; `hairBack` behind the head, `hairFront` over it)
// ---------------------------------------------------------------------------------------------

const H = (d: string, o: Partial<Shape> = {}): Shape => S(d, 'hair', { sh: 4, hl: 2, ln: 3.2, cast: 2.6, ...o });
const strand = (d: string): Shape => L(d, 'hair', 1.5, { lc: 'inner', lo: true });

const curlsTop = (): string => {
  const [x0, y0] = pt(60, 40, 33, 27, 165);
  return `M${x0} ${y0}${bumps(60, 40, 33, 27, 165, 375, 11, 0.12)}C87 42 80 36.4 70 37Q64 40.4 58 37.6Q51 40.4 46 37C38.8 36.6 33 41 ${x0} ${y0}Z`;
};
const afroBack = (): string => {
  const [x0, y0] = pt(60, 42, 40, 35, 0);
  return `M${x0} ${y0}${bumps(60, 42, 40, 35, 0, 360, 16, 0.12)}Z`;
};
const wildBack = (): string => `M24 70L18 58L24 52L16 40L26 36L22 22L34 24L36 12L46 18L52 6L60 14L68 6L74 18L84 12L86 24L98 22L94 36L104 40L96 52L102 58L96 70L84 66L80 74L72 64H48L40 74L36 66Z`;

const HAIR: PartLibrary = {
  hair_bald: { layers: { hairFront: [S(ell(49, 28.4, 6.4, 3.2), '#ffffff', { ln: 0, op: 0.28, lo: true })] }, capped: { hairFront: [] } },
  hair_crop: {
    layers: { hairFront: [H('M30 48C28 26 42 15.6 60 15.6C78 15.6 92 26 90 48C88.4 40.6 84.4 35 78.4 32.6C70 36.4 55.6 37.2 44 33.2C38 36 33.2 41 30 48Z'), strand('M48 22Q52 27 52 33M66 21Q68 26 70 32')] },
  },
  hair_spikes: {
    layers: {
      hairFront: [H('M30 46L26.4 29.6L37 33.6L35.6 17.6L46 25.4L52 9.6L60 23L68 9.6L74 25.4L84.4 17.6L83 33.6L93.6 29.6L90 46C86.4 38.4 80.4 34 74 33.2C66 36 54 36 46 33.2C39.6 34 33.6 38.4 30 46Z', { sh: 3.4 })],
    },
  },
  hair_long: {
    layers: {
      hairBack: [S('M27.6 46C26 22 42 13.6 60 13.6C78 13.6 94 22 92.4 46L95.6 96C87 100.4 78.6 98.4 74.4 92.4V62H45.6V92.4C41.4 98.4 33 100.4 24.4 96Z', 'hair', { sh: 5, ln: 3.2 })],
      hairFront: [H('M29 50C27 26 42 14.6 60 14.6C78 14.6 93 26 91 50C88.6 38.4 80.6 30.4 70 28.4C62 34.4 50 36.6 36 38.6C33 41.4 30.4 45.4 29 50Z'), strand('M56 18Q62 24 66 29M44 22Q50 28 52 34')],
    },
  },
  hair_topknot: {
    layers: {
      hairBack: [S(ell(60, 12.6, 8.4, 7.4), 'hair', { sh: 3, hl: 1.6, ln: 3 })],
      hairFront: [H('M30 46C28.6 26 42.4 17 60 17C77.6 17 91.4 26 90 46C86.6 38.6 78 33.6 60 33.6C42 33.6 33.4 38.6 30 46Z'), S(rr(55, 17.4, 10, 4.2, 1.6), '#b83a3a', { ln: 2, sh: 1.2 })],
    },
  },
  hair_mohawk: {
    layers: {
      hairFront: [
        S('M30.4 46C29.6 27 43 18.6 60 18.6C77 18.6 90.4 27 89.6 46C86 38 76 33.4 60 33.4C44 33.4 34 38 30.4 46Z', 'hair', { ln: 0, op: 0.3 }),
        H('M52.4 35C50 22 52 9.6 60 4.6C68 9.6 70 22 67.6 35C63.6 36.8 56.4 36.8 52.4 35Z', { sh: 3 }),
      ],
    },
    capped: { hairFront: [] },
  },
  hair_braids: {
    layers: {
      hairBack: [S(both('M26.4 50Q22.4 58 27.2 64Q22.4 70 27.2 76Q22.4 82 27.2 88Q24.4 94 30 98.4L36 96.4Q38.2 90.4 34.2 88Q38.2 82 34.2 76Q38.2 70 34.2 64Q38.2 58 34.2 50Z'), 'hair', { sh: 2.6, hl: 1.2, ln: 2.8 })],
      hairFront: [H('M29.4 50C27.6 26 42 15 60 15C78 15 92.4 26 90.6 50C88 40 82 34 74 31.6C68 31.6 62.4 28 60 22.6C57.6 28 52 31.6 46 31.6C38 34 32 40 29.4 50Z')],
    },
  },
  hair_bob: {
    layers: {
      hairBack: [S('M26.6 46C25 22 42 13.6 60 13.6C78 13.6 95 22 93.4 46L94.4 76.6C86.4 80.6 80.4 78.6 78.4 74.6H41.6C39.6 78.6 33.6 80.6 25.6 76.6Z', 'hair', { sh: 5, ln: 3.2 })],
      hairFront: [H('M28.8 52C27 26 42 14.8 60 14.8C78 14.8 93 26 91.2 52L88 53C86.6 45 84.6 40.6 82.4 39.4H37.6C35.4 40.6 33.4 45 32 53Z')],
    },
  },
  hair_curls: { layers: { hairFront: [H(curlsTop(), { sh: 3.4 })] } },
  hair_afro: {
    layers: { hairBack: [S(afroBack(), 'hair', { sh: 6, hl: 2.4, ln: 3.2 })], hairFront: [H(curlsTop(), { sh: 3, ln: 2.6 })] },
    capped: { hairFront: [] },
  },
  hair_ponytail: {
    layers: {
      hairBack: [S('M75 30C92.6 29 101.4 46 97 67C94.8 77.4 88.4 83.4 83.6 81.2C87.6 68.6 87.4 54.6 79.4 44.6Z', 'hair', { sh: 4, hl: 1.6, ln: 3 })],
      hairFront: [H('M30 47C28.6 26 42.4 16.4 60 16.4C77.6 16.4 91.4 26 90 47C87 39.6 80.6 34.6 72 33.6C64 35.6 52 35.6 46 33C38.6 35.6 33 40 30 47Z')],
    },
  },
  hair_sidepart: {
    layers: { hairFront: [H('M29 50C27 26 42 15 60 15C80 15 93 26 91 50C90 44 87 39 82 36.4C72 36.4 58 33.4 50.4 26.4C46.4 34.4 38.4 40.4 29 50Z'), strand('M52 20Q62 26 76 28')] },
  },
  hair_buzz: { layers: { hairFront: [S('M30.4 46C29.6 26 43 17.8 60 17.8C77 17.8 90.4 26 89.6 46C86 38.4 76 33.6 60 33.6C44 33.6 34 38.4 30.4 46Z', 'hair', { ln: 2, op: 0.85, sh: 2, cast: 1.6 })] } },
  hair_bun: {
    layers: {
      hairBack: [S(ell(60, 13.6, 11.4, 9.4), 'hair', { sh: 3.6, hl: 1.8, ln: 3 })],
      hairFront: [H('M30 47C28.6 26 42.4 17 60 17C77.6 17 91.4 26 90 47C86.6 38.6 77 33.4 60 33.4C43 33.4 33.4 38.6 30 47Z'), strand('M46 22Q54 26 58 33M74 22Q66 26 62 33')],
    },
  },
  hair_wild: {
    layers: {
      hairBack: [S(wildBack(), 'hair', { sh: 5, hl: 2, ln: 3.2 })],
      hairFront: [H('M29 50L30 34L38 36L40 22L50 30L56 16L62 28L70 18L74 32L84 26L82 38L91 40L91 50C87 42 80 38 72 36.6Q64 40 56 37Q46 40 40 38C35 40 31 44 29 50Z', { sh: 3 })],
    },
    capped: { hairFront: [] },
  },
  hair_tiedback: {
    layers: {
      hairBack: [S(ell(60, 18.6, 7, 4.6), 'hair', { sh: 2, ln: 2.6 })],
      hairFront: [H('M30.4 48C29.4 26 43 16.4 60 16.4C77 16.4 90.6 26 89.6 48C86 36.6 76 30.6 60 30.6C44 30.6 34 36.6 30.4 48Z', { sh: 3 }), strand('M40 30Q50 22 60 21.4M80 30Q70 22 60 21.4M48 32Q54 25 60 24.4')],
    },
  },
};

// ---------------------------------------------------------------------------------------------
// Starter headwear (today's six hats, so every legacy look keeps its hat)
// ---------------------------------------------------------------------------------------------

const METAL = '#9aa0a6';
const GOLD = '#e8b23a';

const HATS: PartLibrary = {
  hat_none: { layers: {} },
  hat_horned_helm: {
    capsHair: true,
    layers: {
      hat: [
        S(both('M30.4 33.6C19.6 29.6 15 19.6 18.2 7.6C21.6 15.6 27.6 20.4 36.4 23.6Z'), '#ede3c8', { sh: 2.6, hl: 1.4, ln: 3 }),
        S('M27 46C27 24.6 42 15 60 15C78 15 93 24.6 93 46Z', METAL, { m: 'metal', sh: 6, hl: 2.4, cast: 2 }),
        L('M60 16V42', METAL, 2, { lc: 'inner', lo: true }),
        S(rr(23.6, 41, 72.8, 8.6, 4.2), '#7f868e', { m: 'metal', sh: 2.4, hl: 1.2, ln: 3 }),
        S(both(ell(33, 45.3, 1.5)) + both(ell(46.5, 45.3, 1.5)), '#d8dde2', { ln: 0, lo: true }),
      ],
    },
  },
  hat_headband: {
    layers: {
      hat: [
        S('M88.6 41.6L100 37.4L98.4 45.6ZM88.6 44L98.6 50.6L92.4 52.6Z', '#a83c32', { ln: 2.4, sh: 1.2 }),
        S('M29 39.6C40 33.6 80 33.6 91 39.6V47.2C80 41.2 40 41.2 29 47.2Z', '#c0473a', { sh: 2.4, hl: 1.1, ln: 3, cast: 2 }),
      ],
    },
  },
  hat_ranger_hat: {
    capsHair: true,
    layers: {
      hat: [
        S(ell(60, 38.6, 35, 6.6), '#26503f', { sh: 2.6, ln: 3 }),
        S('M36 37C36 17.6 46 11.4 60 11.4C74 11.4 84 17.6 84 37Z', '#2e5e4e', { sh: 4, hl: 2, cast: 3 }),
        S('M36 29.4C46 31.6 74 31.6 84 29.4V36.6C74 38.6 46 38.6 36 36.6Z', '#c9a227', { m: 'gold', sh: 1.6, hl: 1, ln: 2.4 }),
      ],
    },
  },
  hat_tin_crown: {
    layers: {
      hat: [
        S('M33.6 37.4L36.4 17.4L45.4 27.4L52.4 12.6L60 24.6L67.6 12.6L74.6 27.4L83.6 17.4L86.4 37.4Z', GOLD, { m: 'gold', sh: 4, hl: 1.8, cast: 2 }),
        S(rr(32.4, 33.6, 55.2, 8.4, 3.4), '#d29c2c', { m: 'gold', sh: 2, hl: 1, ln: 3 }),
        S(ell(60, 37.8, 2.6), '#c0473a', { ln: 1.4, hl: 0.8, m: 'gloss' }),
        S(both(ell(46, 37.8, 1.9)), '#3f8a6a', { ln: 1.2, m: 'gloss', lo: true }),
      ],
    },
  },
  hat_olive_helmet: {
    capsHair: true,
    layers: {
      hat: [
        L('M33 46Q34 62 42 70M87 46Q86 62 78 70', '#4e5238', 2.4, { lo: true }),
        S('M26 46C26 22 42 12.6 60 12.6C78 12.6 94 22 94 46Z', '#62664a', { sh: 6, hl: 2.4, cast: 2.4 }),
        S(rr(20, 41.6, 80, 7.6, 3.8), '#575b40', { sh: 2.2, hl: 1, ln: 3 }),
        L('M40 24Q44 20 50 19', '#ffffff', 2, { op: 0.25, lo: true }),
      ],
    },
  },
};

// ---------------------------------------------------------------------------------------------
// Tops (cloth tint)
// ---------------------------------------------------------------------------------------------

export const BODY = 'M12 124C12 104 22 95 40 91L50 88.6H70L80 91C98 95 108 104 108 124Z';
const body = (c: Tone = 'cloth', o: Partial<Shape> = {}): Shape => S(BODY, c, { hl: 2.6, ln: 3.5, ...o });
/** Arm-side shading that gives the bust volume (drawn after the body fill, before details). */
const sides = (c: Tone = 'clothDark'): Shape => S(both('M14.6 124C14.6 106 21 98 31 93.8C28 104 27.6 114 29.4 124Z'), c, { ln: 0, op: 0.42 });
const chinShade = (c: Tone = 'clothDark'): Shape => S('M45 90Q60 101 75 90Q60 95.6 45 90Z', c, { ln: 0, op: 0.55 });
const fold = (d: string, c: Tone = 'cloth'): Shape => L(d, c, 1.6, { lc: 'inner', lo: true });

const TOPS: PartLibrary = {
  top_tunic: {
    layers: {
      body: [body(), sides(), fold('M38 104Q40 112 38 122M82 104Q80 112 82 122')],
      collar: [S('M50 88.6L60 102L70 88.6Z', 'skin', { ln: 0, sh: 3 }), L('M49 88.6L60 103L71 88.6', 'clothLight', 3)],
    },
  },
  top_hoodie: {
    layers: {
      body: [body(), sides(), S(rr(40, 108, 40, 14, 5), 'clothDark', { ln: 2, lc: 'inner', op: 0.9 })],
      collar: [
        S('M36.4 93C40 83.6 50 83 60 85.6C70 83 80 83.6 83.6 93C77 98.6 68.6 96 60 98.4C51.4 96 43 98.6 36.4 93Z', 'clothDark', { sh: 2, hl: 1.2, ln: 3 }),
        L('M54 96.6V108M66 96.6V108', 'white', 1.8),
        S(both(ell(54, 109, 1.4)), 'white', { ln: 0.8, lc: 'ink' }),
      ],
    },
  },
  top_vest: {
    layers: {
      body: [
        body('#efe6d6'),
        S('M14 124C14 104 24 96 41 92L50 89.6L56 124Z', 'cloth', { sh: 0, hl: 1.6, ln: 3, m: 'matte' }),
        S('M106 124C106 104 96 96 79 92L70 89.6L64 124Z', 'cloth', { hl: 1.6, ln: 3, m: 'matte' }),
        L('M28 104L34 104M86 104L92 104', 'clothLight', 1.6, { lo: true }),
        S(both(ell(53.4, 108, 1.2)) + both(ell(53.8, 116, 1.2)), '#c9a227', { ln: 0.8, m: 'gold', lo: true }),
      ],
      collar: [L('M51 89L60 96.4L69 89', '#d8ccb4', 2.4)],
    },
  },
  top_tee: {
    layers: {
      body: [body(), sides(), fold('M28 106Q30 114 28 122M92 106Q90 114 92 122')],
      collar: [chinShade(), L('M47.4 89.4Q60 97.4 72.6 89.4', 'clothDark', 3.6)],
    },
  },
  top_padded: {
    layers: {
      body: [body(), sides(), L('M18 106Q60 112 102 106M14 117Q60 123 106 117', 'clothDark', 1.8, { lo: true }), L('M60 96V124', 'clothDark', 2)],
      collar: [S('M44 84.6Q60 90 76 84.6L78 94Q60 100 42 94Z', 'clothDark', { sh: 2, hl: 1, ln: 3 }), S(both(ell(56, 103, 1.3)) + both(ell(56, 113, 1.3)), '#c9c2b4', { ln: 0.8, lc: 'ink', lo: true })],
    },
  },
  top_robe: {
    layers: {
      body: [body(), sides(), S('M50 88.6L74 124H66L46 90Z', 'clothLight', { ln: 2, lc: 'inner' }), fold('M28 104Q31 113 29 122')],
      collar: [S('M50 88.6L60 98L70 88.6Z', 'skin', { ln: 0, sh: 2 }), S('M16 112Q60 122 104 110L104 116Q60 128 16 118Z', '#c9a227', { m: 'gold', ln: 2, sh: 1.4, hl: 0.8 })],
    },
  },
};

// ---------------------------------------------------------------------------------------------
// Starter accessories
// ---------------------------------------------------------------------------------------------

const ACCESSORIES: PartLibrary = {
  acc_none: { layers: {} },
  acc_war_paint: { layers: { faceAcc: [S(both('M37.4 57.6L47.6 59.2L47.4 61.8L37.4 60.8Z') + both('M38.4 62.6L46.6 63.8L46.4 65.6L38.6 65Z'), '#b83a3a', { ln: 0, op: 0.85 })] } },
  acc_freckles: {
    layers: {
      faceAcc: [S(both(ell(42.6, 61.6, 0.9)) + both(ell(45.6, 63.4, 0.8)) + both(ell(46.4, 60.2, 0.75)) + both(ell(43, 64.8, 0.7)), 'skinDark', { ln: 0, op: 0.6, lo: true })],
    },
  },
  acc_bandage: {
    layers: {
      faceAcc: [S('M63 59.4L76 55.2L77.6 60L64.6 64.2Z', '#efe3c8', { ln: 1.6, lc: 'inner', sh: 1 }), L('M68.6 58.6L71.4 61.2M71.4 58.6L68.6 61.2', '#c9a37a', 0.9, { lo: true })],
    },
  },
};

// ---------------------------------------------------------------------------------------------
// Background plates (8): a soft radial light and a lit ring, in the art sheet's style
// ---------------------------------------------------------------------------------------------

const plate = (hex: string): PartArt => ({
  layers: {
    bg: [
      S('M0 0H120V120H0Z', hex as Tone, {
        ln: 0,
        grad: { kind: 'radial', cx: 0.5, cy: 0.38, r: 0.75, stops: [[0, mix(hex, '#ffffff', 0.32) as Tone], [0.62, hex as Tone], [1, shade(hex, 0.58) as Tone]] },
      }),
      S(ell(60, 54, 46), '#ffffff', { ln: 0, op: 0.1 }),
      L('M8 30L36 0M84 120L120 82', '#ffffff', 10, { op: 0.06, lo: true }),
    ],
  },
});

const BACKGROUNDS: PartLibrary = {
  bg_sky: plate('#4a8fd0'),
  bg_meadow: plate('#4caf6a'),
  bg_violet: plate('#9a5ad8'),
  bg_ember: plate('#d8603e'),
  bg_sun: plate('#e8b84a'),
  bg_lagoon: plate('#2fb0c4'),
  bg_rose: plate('#d86a9a'),
  bg_slate: plate('#5a6a80'),
};

/** Every starter part's art. */
export const STARTER_ART: PartLibrary = { ...FACES, ...EYES, ...BROWS, ...NOSES, ...MOUTHS, ...FACIAL, ...HAIR, ...HATS, ...TOPS, ...ACCESSORIES, ...BACKGROUNDS };

export { S, L, H as hairShape, body, sides, chinShade, fold, plate, METAL, GOLD };
