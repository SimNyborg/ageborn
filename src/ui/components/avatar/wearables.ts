/**
 * The earned wearables of the avatar (AUDIT §6.5): 96 items, Common to Legendary, never sold. This
 * module is loaded lazily (the creator, or a look that wears one), so the first download only carries
 * the starter parts. Epic pieces have a small idle motion, Legendaries an animated accent and the
 * white aura (A12). Part ids match `src/content/raw/avatar.ts`.
 */
import { both, ell, mirrorPath, rr, star } from './path';
import { BODY, GOLD, L, METAL, S, body, chinShade, fold, sides } from './starter';
import type { PartArt, PartLibrary, Shape, Tone } from './types';

const r2 = (n: number): number => Math.round(n * 100) / 100;

/** An almond leaf or feather centred at (cx, cy), `len` long, `w` wide, turned by `deg`. */
function leaf(cx: number, cy: number, len: number, w: number, deg: number): string {
  const a = (deg * Math.PI) / 180;
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  const p = (s: number, t: number): string => `${r2(cx + ux * s - uy * t)} ${r2(cy + uy * s + ux * t)}`;
  return `M${p(-len / 2, 0)}Q${p(0, -w)} ${p(len / 2, 0)}Q${p(0, w)} ${p(-len / 2, 0)}Z`;
}

/** Leaves along an arc around the head (a wreath), both sides. */
function wreath(n: number, rx: number, ry: number, cy: number, len: number, w: number): string {
  let d = '';
  for (let i = 0; i < n; i += 1) {
    const deg = 200 + (i * 62) / Math.max(1, n - 1);
    const a = (deg * Math.PI) / 180;
    const x = 60 + Math.cos(a) * rx;
    const y = cy + Math.sin(a) * ry;
    const l = leaf(x, y, len, w, deg + 90 + 25);
    d += l + mirrorPath(l);
  }
  return d;
}

const DOME = (top: number, y = 46, w = 34): string => `M${60 - w} ${y}C${60 - w} ${top + 10} ${60 - w * 0.55} ${top} 60 ${top}C${60 + w * 0.55} ${top} ${60 + w} ${top + 10} ${60 + w} ${y}Z`;
const HOOD_FRAME = 'M23 62C21 26 39 11 60 11C81 11 99 26 97 62L93 93H83.4C86 70 84 41.6 60 37.4C36 41.6 34 70 36.6 93H27Z';
const HOOD_BACK = 'M22 64C20 28 38 11 60 11C82 11 100 28 98 64L100 98H20Z';

function beanie(c: Tone, cuff: Tone, pom: Tone | null, extra: Shape[] = []): PartArt {
  return {
    capsHair: true,
    layers: {
      hat: [
        S(DOME(13, 42, 30.6), c, { sh: 5, hl: 2.2, cast: 2.4 }),
        L('M44 18Q46 30 45 40M60 14V40M76 18Q74 30 75 40', c, 1.6, { lc: 'inner', lo: true }),
        S(rr(27.4, 36.6, 65.2, 10.6, 5.2), cuff, { sh: 2.6, hl: 1.2, ln: 3 }),
        ...(pom ? [S(ell(60, 11.6, 6.6), pom, { sh: 2.4, hl: 1.4, ln: 2.8 })] : []),
        ...extra,
      ],
    },
  };
}

function brimHat(crown: string, c: Tone, brim: [number, number, number, number], band: Tone | null, o: { mat?: Shape['m']; extra?: Shape[]; caps?: boolean } = {}): PartArt {
  const [cx, cy, rx, ry] = brim;
  return {
    capsHair: o.caps ?? true,
    layers: {
      hat: [
        S(ell(cx, cy, rx, ry), c, { sh: 2.6, ln: 3, ...(o.mat ? { m: o.mat } : {}) }),
        S(crown, c, { sh: 4, hl: 2, cast: 3, ...(o.mat ? { m: o.mat } : {}) }),
        ...(band ? [S(`M${cx - rx * 0.62} ${cy - 7}Q60 ${cy - 4.6} ${cx + rx * 0.62} ${cy - 7}V${cy - 1}Q60 ${cy + 1.4} ${cx - rx * 0.62} ${cy - 1}Z`, band, { sh: 1.4, hl: 0.8, ln: 2.4 })] : []),
        ...(o.extra ?? []),
      ],
    },
  };
}

const aura = (p: PartArt): PartArt => ({ ...p, aura: true });

// ---------------------------------------------------------------------------------------------
// Headwear (32)
// ---------------------------------------------------------------------------------------------

const HEADWEAR: PartLibrary = {
  // Common
  hat_wool_cap: beanie('#b8503a', '#9a3e2e', '#efe6d6'),
  hat_bone_band: {
    layers: {
      hat: [
        S('M29 39.6C40 33.4 80 33.4 91 39.6V46.8C80 40.8 40 40.8 29 46.8Z', '#7a5232', { sh: 2.2, hl: 1, ln: 3, cast: 2 }),
        S('M40 36.6L42.6 28.4L45.4 36ZM52 35L54 26.4L56.4 34.6ZM63.6 34.6L66 26.4L68 35ZM74.6 36L77.4 28.4L80 36.6Z', '#ede3c8', { sh: 1.4, ln: 2 }),
        S(ell(60, 36.4, 3, 2.6), '#c0473a', { ln: 1.6, m: 'gloss', hl: 0.8 }),
      ],
    },
  },
  hat_straw_hat: brimHat('M40 37C40 22 48 16 60 16C72 16 80 22 80 37Z', '#e0c070', [60, 38.6, 41, 8], '#b83a3a', {
    extra: [L('M28 38Q60 46 92 38M44 22Q60 18 76 22', '#a8873e', 1.2, { lo: true })],
  }),
  hat_hood: {
    capsHair: true,
    hidesHairBack: true,
    hidesEars: true,
    layers: { hatBack: [S(HOOD_BACK, '#7a5a3a', { sh: 6, ln: 3.4 })], hat: [S(HOOD_FRAME, '#8a6844', { sh: 5, hl: 2.2, cast: 2.6 }), fold('M40 20Q50 16 60 15.6')] },
  },
  hat_sailor_cap: {
    capsHair: true,
    layers: {
      hat: [
        S('M28 40C28 30 42 24 60 24C78 24 92 30 92 40C80 44 40 44 28 40Z', '#f4f1ea', { sh: 3.6, hl: 1.6, cast: 2.4 }),
        S('M30 38.6C42 42.4 78 42.4 90 38.6V45C78 48.6 42 48.6 30 45Z', '#2c3a5a', { sh: 1.6, ln: 3 }),
        S('M86 44L95 52L90 54L84 46Z', '#2c3a5a', { ln: 2.2 }),
      ],
    },
  },
  hat_flat_cap: {
    capsHair: true,
    layers: {
      hat: [
        S('M28.6 42C27.6 26 44 18.6 62 18.6C80 18.6 93 27 92 40.6C80 44.6 44 46 28.6 42Z', '#6a5a48', { sh: 4.4, hl: 2, cast: 2.6 }),
        S('M28 41C34 47 52 50 70 47.6L67 42.6C54 44 38 44 28 41Z', '#5a4a3a', { sh: 1.6, ln: 3 }),
        L('M38 28Q56 22 80 26M34 35Q60 30 88 34', '#4e4032', 1.4, { lo: true }),
      ],
    },
  },
  hat_beret: {
    capsHair: true,
    layers: {
      hat: [
        S('M27.6 40.6C23 30 36 17.6 58 17.6C82 17.6 99 27.6 93 38.6C80 44.4 44 44.4 27.6 40.6Z', '#8e2a4a', { sh: 4, hl: 2.2, cast: 2.4 }),
        S('M56.6 18.4Q57 13 60.4 12.4L61.6 18Z', '#6e1f38', { ln: 2 }),
      ],
    },
  },
  hat_field_cap: {
    capsHair: true,
    layers: {
      hat: [
        S('M31 42.6L35 22.6C46 17.6 74 17.6 85 22.6L89 42.6Z', '#6b6e4a', { sh: 4, hl: 2, cast: 2.4 }),
        S(rr(26, 39.4, 68, 8, 4), '#585b3c', { sh: 2, ln: 3 }),
        S(ell(60, 30, 3.4), '#c9a227', { m: 'gold', ln: 1.6, hl: 1 }),
      ],
    },
  },
  hat_space_beanie: beanie('#3f8f8a', '#e6eef0', null, [
    L('M60 13V4', '#8a9aa4', 1.8),
    S(ell(60, 3.6, 3.2), '#ff5e8a', { ln: 1.6, hl: 1, m: 'gloss', fx: 'av-pulse' }),
  ]),
  hat_bandana: {
    capsHair: true,
    layers: {
      hat: [
        S('M28.6 46C27 25 42 15 60 15C78 15 93 25 91.4 46C80 40 40 40 28.6 46Z', '#b83a3a', { sh: 3.6, hl: 2, cast: 2.4 }),
        S('M88 40L101 34L99 46ZM89 43L99 52L92 53.6Z', '#a33232', { ln: 2.4, sh: 1.2 }),
        S(both(ell(44, 27, 1.5)) + ell(60, 23, 1.5) + both(ell(52, 34, 1.3)), '#f4f1ea', { ln: 0, lo: true }),
      ],
    },
  },
  // Rare
  hat_laurel: { layers: { hat: [S(wreath(6, 30, 18, 42, 9.6, 3.4), '#6f9a3e', { ln: 1.6, sh: 1.2, hl: 0.8 })] } },
  hat_coif: {
    capsHair: true,
    hidesHairBack: true,
    hidesEars: true,
    layers: {
      hatBack: [S(HOOD_BACK, '#8a9098', { m: 'metal', sh: 6, ln: 3.4 })],
      hat: [S(HOOD_FRAME, METAL, { m: 'metal', sh: 5, hl: 2.4, cast: 2.4 }), L('M30 30Q60 20 90 30M27 46Q60 32 93 46M28 62Q30 70 30 82M92 62Q90 70 90 82', '#6a7078', 1.3, { lo: true, op: 0.8 })],
    },
  },
  hat_tricorne: {
    capsHair: true,
    layers: {
      hat: [
        S('M18.6 41Q28 15 60 13.6Q92 15 101.4 41Q88 33 80 35.6Q60 27.6 40 35.6Q32 33 18.6 41Z', '#2a2430', { sh: 4, hl: 2, cast: 3 }),
        L('M20.6 39.6Q30 33.6 40 35.6Q60 27.6 80 35.6Q90 33.6 99.4 39.6', GOLD, 2),
      ],
    },
  },
  hat_pith_helmet: brimHat(DOME(13, 38, 26), '#e8dcc0', [60, 39.6, 38, 7], '#8e6440', { extra: [S(ell(60, 13.6, 3, 2), '#d8ccb0', { ln: 2 })] }),
  hat_aviator: {
    capsHair: true,
    hidesEars: true,
    layers: {
      hat: [
        S('M26.6 62C25 30 40 15 60 15C80 15 95 30 93.4 62L86 64C86 50 84 42 80 39H40C36 42 34 50 34 64Z', '#7a4e2e', { sh: 5, hl: 2.2, cast: 2.4 }),
        S(both(ell(47.6, 33, 8.4, 6.6)), '#c9a227', { m: 'gold', ln: 2.6, sh: 1.4 }),
        S(both(ell(47.6, 33, 5.6, 4.2)), '#7cc4d8', { m: 'gloss', ln: 1.4, hl: 1.2 }),
        L('M56 33H64', '#5a3a22', 2.4),
      ],
    },
  },
  hat_visor_band: {
    layers: {
      hat: [
        S('M28.6 40C40 33 80 33 91.4 40V48C80 41.6 40 41.6 28.6 48Z', '#3a4048', { m: 'metal', sh: 2, hl: 1, ln: 3, cast: 2 }),
        L('M34 41.6Q60 36.6 86 41.6', '#5ff2ff', 2.6, { fx: 'av-pulse' }),
      ],
    },
  },
  hat_feather_cap: {
    capsHair: true,
    layers: {
      hat: [
        S(leaf(80, 22, 34, 5.6, -60), '#c0473a', { sh: 2, hl: 1.2, ln: 2.4, fx: 'av-sway' }),
        S('M29.6 42C29 28 42 20 60 20C78 20 91 28 90.4 42C78 38 42 38 29.6 42Z', '#3f7f46', { sh: 3.4, hl: 1.8, cast: 2.4 }),
        S('M28 40.6C40 36.4 80 36.4 92 40.6V45.4C80 41.6 40 41.6 28 45.4Z', '#2e5e36', { ln: 2.6 }),
      ],
    },
  },
  hat_wizard: brimHat('M42 37L58 0L78 37Z', '#5a3a9a', [60, 38.6, 34, 6.6], null, {
    extra: [S(star(56, 18, 5, 3.6, 1.6) + star(66, 30, 5, 2.8, 1.2) + star(52, 31, 5, 2.4, 1), '#ffd76a', { ln: 1, m: 'gold', fx: 'av-twinkle' })],
  }),
  hat_pirate: {
    capsHair: true,
    layers: {
      hat: [
        S('M16 40Q22 12 60 10Q98 12 104 40Q90 30 60 31Q30 30 16 40Z', '#26222c', { sh: 4, hl: 2.4, cast: 3 }),
        L('M18 38Q30 30.6 60 31.4Q90 30.6 102 38', GOLD, 2.2),
        L('M60 15.6V26.4M55 18.4H65M55.4 24.6Q60 28.6 64.6 24.6', '#e8b23a', 1.8),
      ],
    },
  },
  // Epic (War Path bosses: one per age)
  hat_mammoth_hood: {
    capsHair: true,
    hidesHairBack: true,
    hidesEars: true,
    layers: {
      hatBack: [S(HOOD_BACK, '#6a4a30', { sh: 6, ln: 3.4 })],
      hat: [
        S(HOOD_FRAME, '#7a5636', { sh: 5, hl: 2.2, cast: 2.6 }),
        S('M44 13C48 6 72 6 76 13C74 22 46 22 44 13Z', '#8a6644', { sh: 2.4, ln: 2.6 }),
        S(both(ell(50, 13.6, 1.8)), '#2a1a12', { ln: 0 }),
        S(both('M33 36C22 40 16 54 20 66C23 58 28 50 37 46Z'), '#efe6d0', { sh: 2.4, hl: 1.4, ln: 2.8, fx: 'av-sway' }),
        L('M30 22Q36 18 40 22M80 22Q84 18 90 22', '#5a3e26', 1.6, { lo: true }),
      ],
    },
  },
  hat_crest_helm: {
    capsHair: true,
    hidesEars: true,
    layers: {
      hat: [
        S('M58 4C40 2 26 12 22 26L32 28C36 16 46 12 60 12Z', '#c0473a', { sh: 2.4, hl: 1.4, ln: 2.8, fx: 'av-sway' }),
        S('M27 64V44C27 22 42 13 60 13C78 13 93 22 93 44V64L84 66V48C84 42 80 40 74 40H46C40 40 36 42 36 48V66Z', '#c8893a', { m: 'gold', sh: 5, hl: 2.4, cast: 2.4 }),
        L('M40 40V30M80 40V30', '#8a5a26', 1.6, { lo: true }),
      ],
    },
  },
  hat_great_helm: {
    capsHair: true,
    hidesEars: true,
    layers: {
      hat: [
        S(leaf(70, 10, 30, 7, -30) + leaf(82, 14, 26, 6, -10), '#f4f1ea', { sh: 2, hl: 1.2, ln: 2.6, fx: 'av-sway' }),
        S('M26.6 62V42C26.6 22 42 13 60 13C78 13 93.4 22 93.4 42V62L85 64V47.4H35V64Z', '#aab3bd', { m: 'metal', sh: 5, hl: 2.6, cast: 2.4 }),
        S(rr(57, 40, 6, 22, 3), '#9aa3ad', { m: 'metal', ln: 2.4, sh: 1.6 }),
        L('M30 30H90', '#7a838d', 1.4, { lo: true }),
        S(both(ell(40, 37, 1.4)) + both(ell(52, 37, 1.4)), '#e6eaee', { ln: 0, lo: true }),
      ],
    },
  },
  hat_bicorne: {
    capsHair: true,
    layers: {
      hat: [
        S('M10 38Q20 8 60 8Q100 8 110 38Q92 30 60 31Q28 30 10 38Z', '#1e2230', { sh: 4.4, hl: 2.4, cast: 3 }),
        L('M12 36Q30 28 60 29Q90 28 108 36', GOLD, 2.6),
        S(ell(60, 22, 6.4), '#f4f1ea', { ln: 2, sh: 1.4 }),
        S(ell(60, 22, 3), '#b83a3a', { ln: 1.4 }),
        S(leaf(70, 12, 18, 4, -20), GOLD, { m: 'gold', ln: 1.6, fx: 'av-sway' }),
      ],
    },
  },
  hat_top_hat: brimHat('M42 37V8C42 5 78 5 78 8V37Z', '#2a2632', [60, 38.4, 30, 6], '#8e6440', {
    extra: [
      S(both(ell(51, 28, 5.4)), '#c9a227', { m: 'gold', ln: 2.2, sh: 1.4 }),
      S(both(ell(51, 28, 3.4)), '#9ad8c8', { m: 'gloss', ln: 1.2, hl: 1 }),
      L('M78 20H86V12', '#8a6a3a', 2),
      S(ell(86, 9, 3.4), '#ffd76a', { ln: 1.6, m: 'gloss', fx: 'av-flicker' }),
    ],
  }),
  hat_tank_goggles: {
    capsHair: true,
    hidesEars: true,
    layers: {
      hat: [
        S('M26 60C25 28 40 14 60 14C80 14 95 28 94 60L86 62C86 48 84 41 80 38.6H40C36 41 34 48 34 62Z', '#4a4038', { sh: 5, hl: 2.2, cast: 2.4 }),
        L('M44 16V36M60 14V36M76 16V36', '#3a322c', 2, { lo: true }),
        S(both(ell(48, 33.6, 8.6, 6.8)), '#6b6e4a', { ln: 2.6, sh: 1.6 }),
        S(both(ell(48, 33.6, 5.8, 4.4)), '#e8a83a', { m: 'gloss', ln: 1.4, hl: 1.2 }),
      ],
    },
  },
  hat_holo_crown: {
    layers: {
      hat: [
        S('M34 34L37 16L46 26L53 10L60 22L67 10L74 26L83 16L86 34Z', '#5ff2ff', { op: 0.55, ln: 2, lc: '#2fb8d0', fx: 'av-pulse' }),
        L('M34 34Q60 30 86 34', '#bffaff', 2.6, { fx: 'av-pulse' }),
        S(ell(60, 22, 2.4) + ell(46, 26, 1.6) + ell(74, 26, 1.6), '#ffffff', { ln: 0, fx: 'av-twinkle' }),
      ],
    },
  },
  hat_astro_helm: {
    layers: {
      hat: [
        S(ell(60, 50, 40, 42), '#bfe8ff', { op: 0.22, ln: 3, lc: '#8ab8d0' }),
        L('M30 30Q38 18 52 14', '#ffffff', 4, { op: 0.6 }),
        S(ell(76, 24, 3, 2), '#ffffff', { ln: 0, op: 0.7 }),
        S('M24 82C30 96 90 96 96 82L98 90C92 104 28 104 22 90Z', '#d8dde2', { m: 'metal', sh: 2.4, hl: 1.2, ln: 3 }),
      ],
    },
  },
  hat_frost_helm: {
    capsHair: true,
    layers: {
      hat: [
        S(both('M31 32L18 14L24 30L14 26L28 40Z'), '#bfe8ff', { m: 'gloss', sh: 2, hl: 1.4, ln: 2.4, lc: '#4a7a9a' }),
        S(DOME(14, 44, 32), '#8ab8d0', { m: 'metal', sh: 5, hl: 2.4, cast: 2.4 }),
        S(rr(25, 40, 70, 8, 4), '#6a98b4', { m: 'metal', sh: 2, ln: 3 }),
        S('M56 40L60 30L64 40Z', '#e6f6ff', { ln: 1.6, fx: 'av-twinkle' }),
      ],
    },
  },
  // Legendary
  hat_sun_crown: aura({
    layers: {
      hatBack: [L('M60 14V-2M42 18L34 4M78 18L86 4M28 28L16 20M92 28L104 20', '#ffd76a', 3.4, { fx: 'av-pulse' })],
      hat: [
        S('M32 38L35 14L45 25L52 8L60 21L68 8L75 25L85 14L88 38Z', GOLD, { m: 'gold', sh: 4, hl: 2, cast: 2 }),
        S(rr(31, 33.6, 58, 9, 3.6), '#d29c2c', { m: 'gold', sh: 2, hl: 1, ln: 3 }),
        S(ell(60, 22, 5.4), '#ffb03a', { m: 'gloss', ln: 1.8, hl: 1.2, fx: 'av-pulse' }),
        S(both(ell(44, 38, 2)), '#c0473a', { m: 'gloss', ln: 1.2 }),
      ],
    },
  }),
  hat_chrono_helm: aura({
    capsHair: true,
    hidesEars: true,
    layers: {
      hat: [
        S('M27 60V44C27 22 42 14 60 14C78 14 93 22 93 44V60L85 62V48H35V62Z', '#c9a227', { m: 'gold', sh: 5, hl: 2.4, cast: 2.4 }),
        S('M50 2H70L62 12L70 22H50L58 12Z', '#e6f6ff', { op: 0.85, ln: 2.2, lc: '#8a6a2a' }),
        S('M53 20H67L60 15Z', '#ffd76a', { ln: 0, fx: 'av-pulse' }),
        S(rr(47, 0, 26, 3, 1.4) + rr(47, 21, 26, 3, 1.4), '#8a6a2a', { ln: 1.4 }),
        S(ell(60, 31, 4.6), '#5ff2ff', { m: 'gloss', ln: 1.8, hl: 1, fx: 'av-pulse' }),
      ],
    },
  }),
  hat_curator_laurel: aura({
    layers: { hat: [S(wreath(7, 30, 19, 42, 10, 3.6), GOLD, { m: 'gold', ln: 1.6, sh: 1.2, hl: 1 }), S(ell(60, 23, 3.4), '#7a4aa8', { m: 'gloss', ln: 1.6, hl: 1, fx: 'av-twinkle' })] },
  }),
  hat_starborn_halo: aura({
    layers: {
      hatBack: [S(`${ell(60, 10, 22, 6)}${ell(60, 10, 16, 3.4)}`, '#ffe9a0', { ln: 2, lc: '#c9a227', fx: 'av-pulse' })],
      hat: [S(star(36, 8, 5, 4, 1.7) + star(84, 12, 5, 3.4, 1.4) + star(60, 2, 5, 3, 1.3), '#fff6c8', { ln: 1.2, lc: '#c9a227', fx: 'av-twinkle' })],
    },
  }),
};

// ---------------------------------------------------------------------------------------------
// Tops (32)
// ---------------------------------------------------------------------------------------------

const top = (c: Tone, extra: Shape[], collar: Shape[] = [], o: { m?: Shape['m']; aura?: boolean } = {}): PartArt => ({
  ...(o.aura ? { aura: true } : {}),
  layers: { body: [body(c, o.m ? { m: o.m } : {}), sides(), ...extra], collar: [chinShade(), ...collar] },
});
const vNeck = (skinDepth = 100): Shape => S(`M50 88.6L60 ${skinDepth}L70 88.6Z`, 'skin', { ln: 0, sh: 3 });
const btns = (c: Tone, ys: number[], x = 60): Shape => S(ys.map((y) => ell(x, y, 1.6)).join(''), c, { ln: 1, m: 'gold', hl: 0.6 });

const TOPS: PartLibrary = {
  // Common
  top_fur_wrap: top('#8a6440', [S('M14 108L20 104L24 110L30 104L34 110L40 104L44 110L50 104L56 110L62 104L68 110L74 104L80 110L86 104L90 110L96 104L102 110L106 106V124H14Z', '#6a4a30', { ln: 2.4, sh: 2 }), L('M42 90L62 124', '#4e3424', 3)]),
  top_linen_chiton: top('#efe6d6', [S('M40 91L50 88.6L84 124H70Z', '#ddd2bc', { ln: 1.8, lc: 'inner' }), fold('M30 102Q34 112 32 122M88 104Q86 114 90 122')], [S(ell(44, 94, 3), GOLD, { m: 'gold', ln: 1.4, hl: 0.8 })]),
  top_peasant_tunic: top('#8a6a48', [fold('M36 104Q38 114 36 122M84 104Q82 114 84 122')], [vNeck(102), L('M55.6 92L64.4 96M55.6 97L64.4 92M56 98L64 102', '#d8c09a', 1.4)]),
  top_sailor_shirt: top('#f4f1ea', [L('M14 104H106M13 112H107M13 120H107', '#2c3a5a', 3.4)], [S('M44 89L60 104L76 89L82 92L60 112L38 92Z', '#2c3a5a', { ln: 2, sh: 1.4 }), S('M55 106L60 112L65 106L60 118Z', '#b83a3a', { ln: 1.4 })]),
  top_work_overalls: top('#c9b48a', [S('M36 124V102C36 99 40 97 44 97H76C80 97 84 99 84 102V124Z', '#4a6a8a', { sh: 0, hl: 1.4, ln: 3 }), L('M44 97L40 90M76 97L80 90', '#4a6a8a', 4), btns('#c9a227', [100], 44), btns('#c9a227', [100], 76)]),
  top_jumpsuit: top('#7a7a52', [L('M60 92V124', '#5a5a3c', 2), S(rr(66, 102, 14, 10, 2.4), '#6a6a46', { ln: 1.8, lc: 'inner' })], [S('M46 87.6L60 96L74 87.6L76 93L60 101L44 93Z', '#6a6a46', { ln: 2.4 })]),
  top_track_jacket: top('#3f7f46', [L('M60 93V124', '#d8dde2', 2), L('M26 100L18 124M94 100L102 124', '#f4f1ea', 3.2)], [S('M46 87L60 93L74 87L74 93.6L60 99L46 93.6Z', '#2e5e36', { ln: 2.4 })]),
  top_cadet_suit: top('#e6eef0', [S('M60 92L66 124H54Z', '#2f8f8a', { ln: 2 }), L('M26 104H38M82 104H94', '#2f8f8a', 3)], [S('M45 87.6Q60 94 75 87.6V93Q60 99 45 93Z', '#2f8f8a', { ln: 2.4, hl: 1 })]),
  top_space_poncho: top('#5a3a9a', [S('M14 110Q60 98 106 110V124H14Z', '#4a2e82', { ln: 2.4 }), S(star(36, 106, 5, 3.4, 1.4) + star(82, 112, 5, 2.8, 1.2) + ell(58, 116, 1.6), '#ffd76a', { ln: 0.8, m: 'gold', lo: true })]),
  top_scarf_sweater: top('#d0a23a', [L('M20 106H100M18 114H102', '#b8862a', 1.8, { lo: true })], [S('M40 90C46 84 74 84 80 90C76 98 44 98 40 90Z', '#b83a3a', { sh: 2, hl: 1.2, ln: 3 }), S('M66 94L74 94L76 112L66 114Z', '#a83232', { ln: 2.4, sh: 1.4 })]),
  top_apron: top('#efe6d6', [S('M38 124V96C44 94 76 94 82 96V124Z', '#8a5a3a', { hl: 1.4, ln: 3 }), L('M38 96L46 89M82 96L74 89', '#6a4228', 3), S(rr(50, 106, 20, 10, 3), '#7a4e2e', { ln: 1.6, lc: 'inner' })]),
  top_rain_slicker: top('#e8c43a', [L('M60 92V124', '#b8962a', 2), btns('#3a3a3a', [104, 114], 64)], [S('M44 86.6L60 95L76 86.6L78 94L60 102L42 94Z', '#d0ae2e', { ln: 2.4, hl: 1 })]),
  // Rare (War Path star chests: one per age)
  top_fur_mantle: top('#8a6440', [], [
    S('M18 104C18 92 34 86 60 86C86 86 102 92 102 104C94 100 88 104 82 100C76 106 68 100 60 104C52 100 44 106 38 100C32 104 26 100 18 104Z', '#e6dcc4', { sh: 3, hl: 1.6, ln: 3 }),
    S(ell(60, 98, 4, 3), '#efe6d0', { ln: 2, sh: 1.2 }),
  ]),
  top_bronze_cuirass: top('#c8893a', [L('M46 100Q52 108 60 106Q68 108 74 100M50 114Q60 118 70 114', '#8a5a26', 1.8), S('M14 112L22 108L22 124H14ZM106 112L98 108L98 124H106Z', '#b83a3a', { ln: 2 })], [], { m: 'gold' }),
  top_surcoat: top('#7a2a3a', [S('M40 124V94L60 90L80 94V124Z', '#e6dcc4', { ln: 2.6, hl: 1.2 }), S('M48 102L60 112L72 102V108L60 118L48 108Z', '#7a2a3a', { ln: 1.8 })], [S('M44 88.6Q60 96 76 88.6', METAL, { st: true, ln: 4, m: 'metal' })]),
  top_naval_coat: top('#26304a', [btns('#e8b23a', [100, 108, 116], 52), btns('#e8b23a', [100, 108, 116], 68), S(both('M22 98Q26 92 36 92L36 98Z'), GOLD, { m: 'gold', ln: 1.8 })], [vNeck(98), S('M50 88.6L44 104L52 100Z', '#f4f1ea', { ln: 1.8 }), S(mirrorPath('M50 88.6L44 104L52 100Z'), '#f4f1ea', { ln: 1.8 })]),
  top_waistcoat: top('#f4f1ea', [S('M42 124V95L60 104L78 95V124Z', '#6b3a3a', { ln: 2.6, hl: 1.2 }), btns(GOLD, [108, 116]), L('M64 112Q72 116 76 110', GOLD, 1.4), S(ell(77, 109.6, 2.2), GOLD, { m: 'gold', ln: 1.2 })], [S('M54 92L60 98L66 92L62 89H58Z', '#2a2430', { ln: 1.6 })]),
  top_flight_jacket: top('#7a4e2e', [L('M60 96V124', '#5a3820', 2), S(rr(70, 104, 12, 8, 2), '#6a4228', { ln: 1.6, lc: 'inner' })], [S('M38 92C42 84 52 84 60 88C68 84 78 84 82 92L74 100L60 92L46 100Z', '#efe3c8', { sh: 2.4, hl: 1.2, ln: 3 })]),
  top_hardlight_suit: top('#2a3040', [L('M30 98L44 124M90 98L76 124M60 96V124', '#5ff2ff', 2, { fx: 'av-pulse' }), S(ell(60, 106, 3.4), '#5ff2ff', { ln: 1.6, lc: '#2fb8d0', fx: 'av-pulse' })], [S('M45 87Q60 94 75 87V93Q60 100 45 93Z', '#3a4458', { ln: 2.4, m: 'metal', hl: 1 })]),
  top_star_cloak: top('#2a2450', [S(star(30, 106, 5, 3.4, 1.4) + star(88, 102, 5, 3, 1.3) + star(72, 118, 5, 2.4, 1) + star(44, 120, 5, 2.4, 1), '#ffe9a0', { ln: 0.8, lc: '#c9a227', fx: 'av-twinkle' })], [S(both(ell(42, 94, 3.4)), GOLD, { m: 'gold', ln: 1.6, hl: 1 }), L('M45 94Q60 100 75 94', GOLD, 1.6)]),
  top_chainmail: top(METAL, [L('M18 104Q60 110 102 104M15 112Q60 118 105 112M14 120Q60 126 106 120', '#6a7078', 1.4, { lo: true })], [S('M44 88Q60 96 76 88', '#7f868e', { st: true, ln: 4 })], { m: 'metal' }),
  top_ranger_cloak: top('#5a4a3a', [], [S('M18 106C16 92 34 85 60 85C86 85 104 92 102 106L94 104C90 96 76 92 60 92C44 92 30 96 26 104Z', '#3f6a3a', { sh: 2.4, hl: 1.4, ln: 3 }), S(ell(60, 96, 3.6), '#c9a227', { m: 'gold', ln: 1.6, hl: 0.8 })]),
  // Epic
  top_dragon_scale: top('#3f7f46', [S(
    [100, 108, 116].flatMap((y, row) => [26, 38, 50, 62, 74, 86].map((x) => `M${x + (row % 2) * 6 - 6} ${y}Q${x + (row % 2) * 6} ${y + 7} ${x + (row % 2) * 6 + 6} ${y}`)).join(''),
    '#c9a227',
    { st: true, ln: 1.6, op: 0.85 },
  )], [S('M44 88Q60 96 76 88V94Q60 102 44 94Z', '#c9a227', { m: 'gold', ln: 2.4, hl: 1 })]),
  top_admiral_coat: top('#f4f1ea', [btns(GOLD, [100, 110, 120], 54), btns(GOLD, [100, 110, 120], 66), S(both('M14 98Q20 88 36 90L38 98Q24 96 14 102Z'), GOLD, { m: 'gold', ln: 2, sh: 1.4, hl: 1 }), L(both('M18 100V108M22 99V108M26 98V107'), '#c9a227', 1.4)], [S(ell(44, 104, 3) + ell(37, 106, 2.6), '#b83a3a', { ln: 1.4 }), S(star(44, 109, 5, 2.6, 1.1), GOLD, { m: 'gold', ln: 1 })]),
  top_steam_armor: top('#8a6a3a', [S(rr(42, 98, 36, 22, 5), '#c9a227', { m: 'gold', sh: 3, hl: 1.4, ln: 2.6 }), S(ell(60, 108, 6), '#efe6d0', { ln: 2, sh: 1 }), L('M60 108L63 104', '#3a2620', 1.4), L(both('M24 100Q28 94 36 96'), '#b07a4a', 3.4), S(both(ell(48, 101, 1.3)) + both(ell(48, 117, 1.3)), '#8a6a2a', { ln: 0, lo: true })]),
  top_nebula_cape: top('#3a2470', [
    S('M14 124C14 104 24 95 42 91L60 98L78 91C96 95 106 104 106 124Z', '#5a3a9a', { ln: 2.4, grad: { kind: 'linear', angle: 60, stops: [[0, '#3a2470'], [0.5, '#8a3a9a'], [1, '#e86a8a']] } }),
    S(star(34, 108, 4, 2.6, 1) + star(86, 112, 4, 2.4, 1) + star(60, 118, 4, 2, 0.8), '#ffffff', { ln: 0, fx: 'av-twinkle' }),
  ], [S(both(ell(44, 94, 3.2)), '#ff9ad0', { m: 'gloss', ln: 1.6, hl: 1 })]),
  top_mech_harness: top('#4a4e58', [S('M30 124V100L42 94H78L90 100V124Z', '#6a7078', { m: 'metal', ln: 2.6, sh: 0, hl: 1.4 }), S(ell(60, 106, 6), '#5ff2ff', { ln: 2, lc: '#2fb8d0', m: 'gloss', fx: 'av-pulse' }), S(both(ell(36, 104, 1.5)) + both(ell(36, 116, 1.5)), '#c7d0da', { ln: 0, lo: true })], [], { m: 'metal' }),
  top_royal_robe: top('#8e2a3a', [S('M50 88.6L66 124H54Z', '#c9a227', { m: 'gold', ln: 2 })], [S('M30 98C34 88 48 86 60 90C72 86 86 88 90 98C84 102 76 98 70 102C66 98 54 98 50 102C44 98 36 102 30 98Z', '#f4f1ea', { sh: 2.4, hl: 1.2, ln: 3 }), S(both(ell(42, 96, 0.9)) + ell(60, 96, 0.9) + both(ell(52, 98, 0.9)) + both(ell(80, 96, 0.9)), '#2a2430', { ln: 0, lo: true })]),
  // Legendary
  top_titan_pauldrons: top('#4a4e58', [S(both('M8 112C6 96 16 86 34 86C44 86 48 92 48 100L40 108C30 104 20 106 8 112Z'), '#6a7078', { m: 'metal', sh: 4, hl: 2, ln: 3.2 }), S(both(ell(22, 96, 1.8)) + both(ell(34, 92, 1.8)), GOLD, { m: 'gold', ln: 1, fx: 'av-twinkle' }), S(ell(60, 108, 5), '#ffb03a', { m: 'gloss', ln: 1.8, fx: 'av-pulse' })], [], { m: 'metal', aura: true }),
  top_archivist_robe: top('#2e4a6a', [S('M50 88.6L68 124H52Z', '#e8dfc8', { ln: 2 }), S(rr(70, 100, 16, 12, 2) + rr(72, 98, 12, 3, 1), '#8e2a3a', { ln: 2, sh: 1.4 }), S('M24 96L32 90L36 98L28 102Z', '#efe9da', { ln: 1.4, fx: 'av-sway' }), S('M88 90L96 86L98 94L90 96Z', '#efe9da', { ln: 1.4, fx: 'av-sway' })], [L('M46 90Q60 98 74 90', GOLD, 2.4)], { aura: true }),
  top_phoenix_mantle: top('#b83a2a', [S(leaf(24, 104, 26, 6, -60) + leaf(96, 104, 26, 6, -120) + leaf(34, 112, 22, 5, -70) + leaf(86, 112, 22, 5, -110), '#ffb03a', { ln: 1.6, lc: '#a83222', sh: 2, fx: 'av-flicker' })], [S(ell(60, 96, 4.4), '#ffd76a', { m: 'gloss', ln: 1.8, hl: 1, fx: 'av-pulse' })], { aura: true }),
  top_aeon_armor: top('#e8b23a', [S('M50 98H70L64 108L70 118H50L56 108Z', '#bfe8ff', { op: 0.85, ln: 2, lc: '#8a6a2a' }), S('M53 116H67L60 111Z', '#ffd76a', { ln: 0, fx: 'av-pulse' }), L(both('M24 100Q30 94 40 96'), '#fff3d6', 2, { op: 0.8 })], [], { m: 'gold', aura: true }),
};

// ---------------------------------------------------------------------------------------------
// Accessories (16)
// ---------------------------------------------------------------------------------------------

const lens = (cx: number, cy: number, r: number, tint: Tone, op = 0.35): Shape[] => [S(ell(cx, cy, r), tint, { op, ln: 0 }), L(`M${cx - r * 0.5} ${cy - r * 0.3}Q${cx - r * 0.2} ${cy - r * 0.7} ${cx + r * 0.3} ${cy - r * 0.6}`, '#ffffff', 1.2, { op: 0.8 })];

const ACCESSORIES: PartLibrary = {
  // Common
  acc_bone_necklace: { layers: { over: [L('M42 92Q60 104 78 92', '#5a3e26', 1.6), S([46, 53, 60, 67, 74].map((x, i) => `M${x - 1.6} ${96 + (i === 2 ? 3 : i % 2 ? 2 : 0)}L${x} ${103 + (i === 2 ? 3 : i % 2 ? 2 : 0)}L${x + 1.6} ${96 + (i === 2 ? 3 : i % 2 ? 2 : 0)}Z`).join(''), '#efe6d0', { ln: 1.4, lc: '#8a7a5a' })] } },
  acc_eyepatch: { layers: { faceAcc: [L('M34 44L86 40', '#2a2430', 1.8), S(ell(72, 53.6, 7, 6.4), '#2a2430', { ln: 1.6, hl: 1 })] } },
  acc_monocle: { layers: { faceAcc: [...lens(72, 54, 6.8, '#dff4ff'), L(ell(72, 54, 6.8), GOLD, 2.2), L('M78.6 56Q83 70 78 82', GOLD, 1.2)] } },
  acc_round_glasses: { layers: { faceAcc: [...lens(48, 54, 6.8, '#dff4ff'), ...lens(72, 54, 6.8, '#dff4ff'), L(`${ell(48, 54, 6.8)}${ell(72, 54, 6.8)}M55 53Q60 50.6 65 53M41.2 53L32 50M78.8 53L88 50`, '#3a2a22', 1.8)] } },
  acc_red_scarf: { layers: { over: [S('M38 91C44 84 76 84 82 91C78 99 42 99 38 91Z', '#b83a3a', { sh: 2.4, hl: 1.2, ln: 3 }), S('M44 94L52 96L48 114L40 112Z', '#a33232', { ln: 2.4, sh: 1.4, fx: 'av-sway' })] } },
  acc_medal: { layers: { over: [S('M66 96L70 96L72 106L68 108L64 106Z', '#b83a3a', { ln: 1.4 }), S(ell(68, 110, 4.4), '#c8893a', { m: 'gold', ln: 1.8, sh: 1.2, hl: 1 })] } },
  acc_goggles: { layers: { faceAcc: [L('M30 50L90 50', '#5a3a22', 3), S(both(ell(48, 51, 8.6, 7.4)), '#c9a227', { m: 'gold', ln: 2.2, sh: 1.2 }), S(both(ell(48, 51, 6.2, 5.2)), '#9ad8c8', { m: 'gloss', ln: 1.2, hl: 1.2, op: 0.9 })] } },
  // Rare
  acc_aviator_shades: { layers: { faceAcc: [S(both('M39.6 49.6H55.6Q56.6 58 50 60Q42 61 39.6 54Z'), '#2a2430', { m: 'gloss', ln: 1.6, lc: '#8a6a2a', hl: 1.4 }), L('M55.6 50.4H64.4M39.6 50L32 48M80.4 50L88 48', '#8a6a2a', 1.6)] } },
  acc_war_horn: { layers: { over: [L('M40 90Q60 106 82 92', '#5a3e26', 1.6), S('M62 100Q74 98 82 106L78 112Q72 104 62 106Z', '#efe6d0', { ln: 1.8, sh: 1.4, hl: 0.8 }), S(rr(61, 99, 3, 8, 1), GOLD, { m: 'gold', ln: 1 })] } },
  acc_compass_pendant: { layers: { over: [L('M44 90Q60 104 76 90', GOLD, 1.4), S(ell(60, 106, 5.6), GOLD, { m: 'gold', ln: 1.8, sh: 1.4 }), S(ell(60, 106, 3.8), '#f4f1ea', { ln: 0 }), S('M60 102.6L61.4 106L60 109.4L58.6 106Z', '#b83a3a', { ln: 0 })] } },
  acc_cyber_eye: { layers: { faceAcc: [S('M64 46H82L84 60H66Z', '#4a4e58', { m: 'metal', ln: 2, sh: 1.6, hl: 1 }), S(ell(73, 53, 3.6), '#ff5e5e', { m: 'gloss', ln: 1.2, fx: 'av-pulse' }), L('M84 52L90 50', '#4a4e58', 1.6)] } },
  acc_gold_chain: { layers: { over: [L('M40 90Q60 112 80 90', GOLD, 3.2), L('M40 90Q60 112 80 90', '#fff3d6', 1, { op: 0.7, lo: true }), S(ell(60, 104, 3.2), '#b83a3a', { m: 'gloss', ln: 1.4, hl: 0.8 })] } },
  // Epic
  acc_dragon_tooth: { layers: { over: [L('M42 90Q60 104 78 90', '#3a2a22', 1.6), S('M56 98L64 98L60 114Z', '#efe6d0', { ln: 1.6, sh: 1.6, hl: 0.8 }), S(both(ell(54, 98, 1.6)), '#3f8a6a', { m: 'gloss', ln: 1, fx: 'av-twinkle' })] } },
  acc_holo_monocle: { layers: { faceAcc: [S(ell(72, 54, 8), '#5ff2ff', { op: 0.3, ln: 1.6, lc: '#2fb8d0', fx: 'av-pulse' }), L('M66 54H78M72 48V60', '#bffaff', 1, { op: 0.8 }), L('M80 52L90 46', '#5ff2ff', 1.6)] } },
  // Legendary
  acc_scout_spyglass: { aura: true, layers: { over: [S('M86 122L96 84L104 86L96 124Z', '#c9a227', { m: 'gold', sh: 2, hl: 1.4, ln: 2.6 }), S(rr(94, 78, 12, 10, 2), '#8a6a2a', { m: 'gold', ln: 2.2, sh: 1 }), S(ell(100, 80, 3.4, 1.6), '#bfe8ff', { m: 'gloss', ln: 1, fx: 'av-twinkle' })] } },
  acc_comet_orbit: { aura: true, layers: { fx: [L(ell(60, 30, 44, 10), '#bfe8ff', 1.4, { op: 0.45 }), S(ell(18, 32, 3.4) + ell(98, 26, 2.6) + ell(70, 39.6, 2), '#ffe9a0', { ln: 1.2, lc: '#c9a227', fx: 'av-twinkle' })] } },
};

// ---------------------------------------------------------------------------------------------
// Backgrounds (16): one scene per age, then skies; Legendary skies move
// ---------------------------------------------------------------------------------------------

const sky = (a: string, b: string): Shape => S('M0 0H120V120H0Z', a as Tone, { ln: 0, grad: { kind: 'linear', angle: 90, stops: [[0, a as Tone], [1, b as Tone]] } });
const ground = (d: string, c: Tone): Shape => S(d, c, { ln: 1.4, sh: 3, hl: 1.2 });
const scene = (shapes: Shape[], o: { aura?: boolean } = {}): PartArt => ({ ...(o.aura ? { aura: true } : {}), layers: { bg: shapes } });

const BACKGROUNDS: PartLibrary = {
  // Common: age scenes
  bg_cave: scene([sky('#c9a470', '#7a5a3a'), S('M0 120V30Q20 6 60 4Q100 6 120 30V120H96V60Q88 34 60 32Q32 34 24 60V120Z', '#5a4a3a', { ln: 1.6, sh: 4, hl: 1.6 }), S(ell(98, 96, 6, 9), '#ffb03a', { ln: 0, op: 0.7, fx: 'av-flicker' }), ground('M0 104Q60 96 120 104V120H0Z', '#7a6448')]),
  bg_temple: scene([sky('#f2d48a', '#d89a5a'), S('M14 58L60 38L106 58Z', '#e8dcc0', { ln: 1.6, sh: 2 }), S('M20 62H28V104H20ZM40 62H48V104H40ZM72 62H80V104H72ZM92 62H100V104H92Z', '#efe6d0', { ln: 1.4, sh: 0, hl: 1 }), ground('M0 104H120V120H0Z', '#c8a878')]),
  bg_castle: scene([sky('#9ab8d8', '#e8dcc0'), S('M10 104V50H22V44H28V50H38V44H44V50H50V70H70V50H76V44H82V50H92V44H98V50H110V104Z', '#8a909a', { m: 'metal', ln: 1.6, sh: 3, hl: 1.2 }), S('M56 104V86Q60 80 64 86V104Z', '#3a3040', { ln: 0 }), L('M30 50V30', '#5a4a3a', 1.4), S('M30 30L40 34L30 38Z', '#7a2a3a', { ln: 1, fx: 'av-sway' }), ground('M0 104Q60 98 120 104V120H0Z', '#6f9a3e')]),
  bg_harbor: scene([sky('#f2c27a', '#8ac8e0'), S('M0 92H120V120H0Z', '#3f8fc4', { ln: 0 }), L('M10 98H30M50 104H74M90 96H110', '#e8f7ff', 1.6, { op: 0.8 }), S('M66 90L72 52L74 90ZM74 60L92 82L74 82Z', '#efe6d0', { ln: 1.2, fx: 'av-sway' }), S('M52 90H96L90 98H58Z', '#6a4228', { ln: 1.4 })]),
  bg_foundry: scene([sky('#8a6a63', '#d8905a'), S('M10 104V60H34V40H44V60H60V30H70V60H110V104Z', '#4a3e3a', { ln: 1.6, sh: 2.4 }), S(ell(39, 30, 5, 4) + ell(66, 20, 6, 5), '#c9c2b4', { ln: 0, op: 0.7, fx: 'av-sway' }), S('M20 72H28V80H20ZM80 72H88V80H80ZM94 72H102V80H94Z', '#ffd76a', { ln: 0, fx: 'av-flicker' }), ground('M0 104H120V120H0Z', '#3a3230')]),
  bg_city: scene([sky('#8ab8d8', '#e8dcc0'), S('M6 104V54H24V104ZM28 104V36H48V104ZM52 104V60H66V104ZM70 104V44H90V104ZM94 104V64H114V104Z', '#5a6a80', { ln: 1.4, sh: 0, hl: 1 }), S('M32 44H36V48H32ZM40 56H44V60H40ZM74 52H78V56H74ZM82 64H86V68H82ZM98 72H102V76H98Z', '#ffe9a0', { ln: 0, op: 0.9 }), ground('M0 104H120V120H0Z', '#4a4e58')]),
  bg_skyline: scene([sky('#2a2450', '#e86a8a'), S('M8 104V50L16 40L24 50V104ZM34 104V30L44 20L54 30V104ZM66 104V40H86V104ZM94 104V56L104 46L114 56V104Z', '#3a3060', { ln: 1.4, hl: 1 }), L('M44 30V96M76 46V96M16 54V96M104 60V96', '#5ff2ff', 1.4, { op: 0.8, fx: 'av-pulse' }), ground('M0 104H120V120H0Z', '#2a2440')]),
  // Rare
  bg_nebula: scene([sky('#1e1830', '#5a2a7a'), S(ell(40, 40, 30, 20), '#e86ab0', { ln: 0, op: 0.35 }), S(ell(84, 70, 34, 18), '#6a8aff', { ln: 0, op: 0.3 }), S(star(20, 20, 4, 2.4, 0.9) + star(96, 28, 4, 2, 0.8) + star(70, 96, 4, 2.4, 0.9) + star(30, 88, 4, 1.8, 0.7), '#ffffff', { ln: 0, fx: 'av-twinkle' })]),
  bg_sunset_dunes: scene([sky('#f28a5a', '#f2d48a'), S(ell(84, 62, 14), '#ffe9a0', { ln: 0 }), ground('M0 92Q30 78 60 90Q90 102 120 86V120H0Z', '#d8a85a'), ground('M0 106Q40 96 80 108Q100 112 120 104V120H0Z', '#c8904a')]),
  bg_aurora: scene([sky('#1a2440', '#2a4a6a'), S('M0 40Q30 20 60 40Q90 60 120 36V56Q90 80 60 60Q30 40 0 60Z', '#5ff2aa', { ln: 0, op: 0.4, fx: 'av-sway' }), ground('M0 100L20 84L36 96L54 80L74 98L94 82L120 98V120H0Z', '#e6eef0')]),
  bg_volcano: scene([sky('#3a2430', '#b84a2a'), ground('M10 110L48 46H72L110 110Z', '#4a3a36'), S('M48 46H72L66 58Q60 52 54 58Z', '#ff8a3a', { ln: 0, fx: 'av-flicker' }), S(ell(60, 30, 10, 8) + ell(70, 18, 8, 6), '#6a5a56', { ln: 0, op: 0.7, fx: 'av-sway' })]),
  // Epic
  bg_battle_flags: scene([sky('#f2c27a', '#d86a4a'), L('M24 112V30M96 112V30', '#5a3e26', 2.4), S('M24 30L48 38L24 48Z', '#7a2a3a', { ln: 1.6, sh: 2, fx: 'av-sway' }), S('M96 30L72 38L96 48Z', '#3f7f46', { ln: 1.6, sh: 2, fx: 'av-sway' }), ground('M0 104Q60 96 120 104V120H0Z', '#7a6448')]),
  bg_storm: scene([sky('#2a3040', '#5a6a80'), S(ell(30, 24, 30, 14) + ell(90, 20, 34, 14), '#4a5468', { ln: 0 }), S('M70 30L58 58H68L56 86L82 50H70L80 30Z', '#ffe96a', { ln: 1.4, lc: '#c9a227', fx: 'av-flicker' })]),
  bg_starfield: scene([sky('#0e1024', '#2a2450'), S(star(14, 18, 4, 2.4, 0.9) + star(40, 50, 4, 1.6, 0.6) + star(100, 20, 4, 2.6, 1) + star(84, 80, 4, 1.8, 0.7) + star(22, 96, 4, 2, 0.8) + star(64, 12, 4, 1.4, 0.5), '#ffffff', { ln: 0, fx: 'av-twinkle' }), S(ell(96, 100, 14), '#c86ab0', { ln: 1.6, sh: 3, hl: 1.4 })]),
  // Legendary
  bg_golden_sky: scene([sky('#ffd76a', '#e88a3a'), L('M60 60L60 -20M60 60L120 0M60 60L140 60M60 60L120 120M60 60L0 120M60 60L-20 60M60 60L0 0', '#fff3d6', 10, { op: 0.35, fx: 'av-spin' }), S(ell(60, 60, 18), '#fff6c8', { ln: 0, op: 0.9 })], { aura: true }),
  bg_time_vortex: scene([sky('#1e1830', '#3a2470'), L('M60 60m-40 0a40 40 0 1 1 40 40a30 30 0 1 1 -30 -30a20 20 0 1 1 20 20a10 10 0 1 1 -10 -10', '#5ff2ff', 3, { op: 0.6, fx: 'av-spin' }), S('M54 48H66L61 60L66 72H54L59 60Z', '#ffd76a', { ln: 1.4, lc: '#8a6a2a' })], { aura: true }),
};

/** Every wearable's art. */
export const WEARABLE_ART: PartLibrary = { ...HEADWEAR, ...TOPS, ...ACCESSORIES, ...BACKGROUNDS };

/** Draws the body outline only (used by tiles that show a top on its own). */
export const BODY_OUTLINE = BODY;
