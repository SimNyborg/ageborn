/**
 * Base flags (DESIGN A18.9.4, PLAN 2a "Base flags", redrawn 2026-10-08 to the art sheet, AUDIT §3):
 * an emblem on the side's team colour (A11: the team reads first), cut as a swallowtail banner so it
 * never looks like a country, on the 60 x 40 field every flag shares.
 *
 * - **Cloth.** The team field with a hoist sleeve, fold shading as hard cel bands that bend like the
 *   ripple, three diagonal weave strokes, a stitched hem, the cloth's own shadow band and top light,
 *   and an outline in the team colour's dark (never black).
 * - **Emblem.** Two-tone cel parts (shadow band, one highlight, colour-matched outline) at 55-60% of
 *   the cloth height, with silhouettes that read at 32 px.
 * - **Rarity finish** (`tier`): Common a plain hem and a wooden knob; Rare a contrast border band and a
 *   brass ball; Epic a gold border, a tassel fringe at the fly end and a spear tip; Legendary a gold
 *   border and fringe, an embroidered emblem with metal highlights, a star finial with a soft aura and
 *   a glint. The pole and finial are drawn for the screens only (`flagPole`); the lane's pole is the
 *   base's own.
 *
 * National flags live in `nationalFlags.ts` (Track D, PLAN 2d); C0 (2026-10-08) moved their designs there.
 */
import {
  cel,
  circle,
  ellipsePath,
  fitShapes,
  gearPath,
  glow,
  line,
  mirrorPath,
  polyPath,
  ribbonPath,
  rotatePath,
  sparklePath,
  stadiumPath,
  symPath,
  xformPath,
  type Shape,
} from './shapes';

export const FLAG_W = 60;
export const FLAG_H = 40;

export type FlagTier = 'common' | 'rare' | 'epic' | 'legendary';

/** The swallowtail cut of a base flag (fly edge notched). */
export const BANNER_OUTLINE = 'M0 0H60L51 20L60 40H0Z';

// ---------------------------------------------------------------------------------------------
// Palette (fixed emblem colours that read on both team colours; the field is the team paint)
// ---------------------------------------------------------------------------------------------

const GOLD = '#f6c23e';
const GOLD_DEEP = '#e2a12e';
const CREAM = '#fff3d8';
const IVORY = '#f3e3c0';
const WOOD = '#a96d3d';
const WOOD_DARK = '#8a5530';
const FLAME = '#ffc43c';
const FLAME_HOT = '#ff8a2c';
const FLAME_CORE = '#fff1c6';
const RED = '#dc4a30';
const LEAF = '#7cbf50';
const STONE = '#bcc3cc';
const STONE_FAR = '#98a1ad';
const SNOW = '#f7fbff';
const STEEL = '#cdd5df';
const FUR = '#9b623b';
const FUR_FAR = '#7b4a2b';
const TUSK = '#f6ecd4';
const LEATHER = '#6e402a';
const WINE = '#b8443e';
const SKY_PALE = '#9fd2ee';
const FOAM = '#f1f8ff';

/** Emblem outline width (units): about 1.3 px on a tile, 2 px on the big preview. */
const LN = 1.15;
/** Interior lines (half the outline, AUDIT §3.1). */
const IN = 0.6;

const inner = (d: string, color: string, width = IN): Shape => ({ d, stroke: color, width, lo: true });

// ---------------------------------------------------------------------------------------------
// Emblems (centred near (28, 20); 22-25 units tall)
// ---------------------------------------------------------------------------------------------

const ember = (): Shape[] => [
  // two crossed logs with end grain
  cel(stadiumPath(19.4, 31.4, 37, 27.2, 3.6), WOOD_DARK, { sh: 1.2, hl: 0.8 }),
  cel(stadiumPath(19.4, 27.2, 37, 31.4, 3.6), WOOD, { sh: 1.2, hl: 0.8 }),
  inner('M22.6 28.6Q27 29.4 33.4 30.4', '#6b4024'),
  cel(ellipsePath(36.4, 31.3, 1.3, 1.5), '#e0b07a', { sh: 0, hl: 0, ln: 0.7 }),
  // the flame: outer tongue, hot middle and core
  cel(
    'M28.2 7.6C29.8 11.4 34.4 13.4 35.8 18.4C37 22.6 34.8 28.2 28.4 28.8C22.4 29.3 19.6 24.8 20.4 20.2C20.9 17.4 22.5 16.1 23.6 14.2C24.2 16.4 25 17.5 26.1 18C25.2 14.4 26.1 10.8 28.2 7.6Z',
    FLAME,
    { sh: 2.2, hl: 1.3, ln: LN },
  ),
  cel(
    'M28.3 13.6C29.5 16.3 32.6 18.2 33 21.6C33.4 25.1 31.2 27.6 28.3 27.7C25.3 27.8 23.4 25.6 23.6 22.8C23.8 21.3 24.7 20.2 25.6 19.4C25.9 20.7 26.5 21.5 27.3 21.9C26.8 19.2 27.1 16.2 28.3 13.6Z',
    FLAME_HOT,
    { sh: 1.4, hl: 0, ln: 0.8 },
  ),
  // the white-hot core: light inside the flame, not a part of its own
  { d: 'M28.4 20C29.6 22 30.8 23.3 30.7 25C30.6 26.5 29.5 27.3 28.3 27.3C26.9 27.3 25.9 26.3 26 24.9C26.1 23.3 27.5 22 28.4 20Z', fill: FLAME_CORE },
  // rising sparks
  cel(sparklePath(36.6, 10.8, 1.7, 1.1), FLAME, { sh: 0, hl: 0, ln: 0.6 }),
  cel(sparklePath(20.6, 11.4, 1.3, 0.9), FLAME, { sh: 0, hl: 0, ln: 0.6 }),
  cel(ellipsePath(38.6, 16.4, 0.8), FLAME, { sh: 0, hl: 0, ln: 0.5, lo: true }),
];

const dawn = (): Shape[] => {
  const rays: Shape[] = [];
  for (let k = -3; k <= 3; k += 1) {
    const a = ((-90 + k * 22) * Math.PI) / 180;
    const w = (5 * Math.PI) / 180;
    const r0 = 11;
    const r1 = k === 0 ? 16.6 : Math.abs(k) === 2 ? 15.6 : 14.6;
    const p = (r: number, aa: number) => [28 + Math.cos(aa) * r, 25.2 + Math.sin(aa) * r] as const;
    const [ax, ay] = p(r0, a - w);
    const [bx, by] = p(r1, a);
    const [cx, cy] = p(r0, a + w);
    rays.push(cel(polyPath([ax, ay, bx, by, cx, cy]), GOLD, { sh: 0, hl: 0, ln: 0.9 }));
  }
  return [
    ...rays,
    // the sun: a half disc over the hills
    cel('M18 25.4A10 10 0 0 1 38 25.4Z', GOLD, { sh: 2.2, hl: 1.4, ln: LN }),
    // two hills in front, the near one cream
    cel('M30 31.8C32 27.2 35.6 25.4 39 26.4C41 27 42.6 29 43.6 31.8Z', '#e9d9b6', { sh: 1.2, hl: 0.8 }),
    cel('M12.6 31.8C15.6 27.4 20.6 25.6 25 26.8C28.6 25 33.4 26 36.4 31.8Z', CREAM, { sh: 1.6, hl: 1 }),
    inner('M18.6 29.6Q21 28.6 23 29', '#c9b48c'),
  ];
};

const oak = (): Shape[] => {
  // an upright lobed leaf (half outline, mirrored) tilted 14° clockwise
  const half = [0, -12, 2.6, -11.6, 3.2, -9.2, 3.5, -7.6, 2.2, -6.8, 5.2, -6.9, 5.8, -4.3, 6, -2.6, 3.7, -2.1, 6.9, -1.3, 6.6, 1.4, 6.2, 3.2, 3.9, 3.1, 5.8, 4.8, 4.5, 6.4, 3, 7.8, 1, 7.7, 0.6, 8.2, 0, 8.4];
  const at = (d: string) => xformPath(d, { deg: 14, dx: 26.4, dy: 19.2 });
  const leaf = at(symPath(half));
  const veins = ['M0 -10L0 8.6', 'M0 -6.4L3.8 -4.6', 'M0 -1.2L4.9 0.4', 'M0 3.2L3.6 5', 'M0 -6.4L-3.8 -4.6', 'M0 -1.2L-4.9 0.4', 'M0 3.2L-3.6 5'];
  return [
    cel(at(ribbonPath([[0, 7.4], [0.6, 10.6], [1.8, 12.6]], 1.6, 0.9)), '#6a9a3a', { sh: 0, hl: 0, ln: 0.8 }),
    cel(leaf, LEAF, { sh: 2.2, hl: 1.3, ln: LN }),
    ...veins.map((v) => inner(at(v), '#4e7d2e')),
    // the acorn beside the stem
    cel(ellipsePath(36.6, 27.6, 2.7, 3.3), '#dba65c', { sh: 1.3, hl: 0.8 }),
    cel('M33.4 26C33.6 24 35 23 36.6 23C38.2 23 39.6 24 39.8 26C38 26.8 35.2 26.8 33.4 26Z', '#87562f', { sh: 0.9, hl: 0.5, ln: 0.9 }),
    inner('M34.4 24.6L38.8 25.6M35 23.8L39.2 24.8', '#5e3a1e'),
    line('M36.6 23L37.4 21.4', '#5e3a1e', 0.9),
  ];
};

const chevron = (): Shape[] => {
  const chev = (y0: number, t: number, fill: string) => cel(polyPath([16, y0 + 7.4, 28, y0, 40, y0 + 7.4, 40, y0 + 7.4 + t, 28, y0 + t, 16, y0 + 7.4 + t]), fill, { sh: 1.5, hl: 0.9, ln: LN });
  return [chev(20.4, 4.2, GOLD), chev(14.6, 4.2, CREAM), chev(8.8, 4.2, GOLD), cel(sparklePath(28, 6.4, 1.6, 1.1), CREAM, { sh: 0, hl: 0, ln: 0.6, lo: true })];
};

const wave = (): Shape[] => [
  // the water inside the curl (it shows through the pocket under the lip), then the wave face
  cel('M34.6 19.4C32.8 22.4 33.4 26.6 37.4 28.2C39.6 29 41.6 29 43.4 28.8V23.6C42.6 22.2 41.4 21.4 39.8 21.6C37.8 22 35.9 21.1 34.6 19.4Z', SKY_PALE, { sh: 1.4, hl: 0, ln: 0.8 }),
  cel(
    'M12.8 31.8C13.6 24.4 18.2 17.2 25.2 13.2C30.6 10.2 37.2 10 40.8 13.4C43.6 16 43 20.6 39.8 21.6C37.6 22.2 35.6 21 35.4 19.2C33.4 20.4 32.6 22.6 33.2 24.8C34 27.8 37.8 29.2 43.4 28.8L43.4 31.8Z',
    FOAM,
    { sh: 1.8, hl: 1.1, ln: LN },
  ),
  inner('M17.4 27.6Q20.4 21.6 26 17.8', '#9cb7cc'),
  inner('M21.4 30Q23.6 25.8 27.6 23.2', '#9cb7cc'),
  // foam claws reaching off the crest, and spray
  cel('M41.6 14.2C43.2 13.4 44.8 13.8 45.6 15.2C44.4 15 43.4 15.4 42.8 16.2Z', FOAM, { sh: 0, hl: 0, ln: 0.8 }),
  cel('M42.6 17.4C44 17 45.2 17.6 45.6 18.8C44.6 18.6 43.8 19 43.2 19.6Z', FOAM, { sh: 0, hl: 0, ln: 0.8 }),
  cel(ellipsePath(46.2, 12.2, 1), FOAM, { sh: 0, hl: 0, ln: 0.6 }),
  cel(ellipsePath(43.8, 10.2, 0.8), FOAM, { sh: 0, hl: 0, ln: 0.6, lo: true }),
  cel(sparklePath(18.4, 13.2, 1.6, 1.1), GOLD, { sh: 0, hl: 0, ln: 0.6 }),
];

const mountain = (): Shape[] => [
  cel(ellipsePath(38.4, 11.4, 3.4), GOLD, { sh: 1, hl: 0.7, ln: 0.9 }),
  cel('M26.6 31.8L35.8 14.6C36.2 13.9 36.9 13.9 37.3 14.6L46 31.8Z', STONE_FAR, { sh: 1.6, hl: 0, ln: LN }),
  cel('M12.4 31.8L25.1 9C25.5 8.3 26.3 8.3 26.7 9L40.4 31.8Z', STONE, { sh: 1.8, hl: 0, ln: LN }),
  // the shaded faces (texture, not a second highlight)
  { d: 'M25.9 8.7L40.4 31.8H31.2L27.8 21.4Z', fill: '#000000', alpha: 0.14 },
  { d: 'M36.6 14.2L46 31.8H40.8L37.6 22.4Z', fill: '#000000', alpha: 0.14 },
  cel('M25.9 8.6L30.5 16.8L28.4 15.6L26.8 18L24.6 15.9L22.2 17.4L25.2 9.4Z', SNOW, { sh: 0.8, hl: 0, ln: 0.8 }),
  cel('M36.6 14L39.6 20.2L37.8 19.4L36.6 21L35 19.6L33.6 20.4Z', SNOW, { sh: 0.6, hl: 0, ln: 0.8 }),
  inner('M19 26.4L22 24.2M30.6 27.4L33.2 24.8', '#7f8894'),
];

const twinStars = (): Shape[] => {
  const starD = (cx: number, cy: number, r: number, ri: number) => {
    const pts: number[] = [];
    for (let i = 0; i < 10; i += 1) {
      const a = ((i * 36 - 90) * Math.PI) / 180;
      const rr = i % 2 === 0 ? r : ri;
      pts.push(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    return polyPath(pts);
  };
  return [
    cel(starD(24.2, 18.8, 11, 4.9), GOLD, { sh: 2.4, hl: 1.4, ln: LN, mat: 'gold' }),
    cel(starD(36.4, 26.2, 6.4, 2.9), CREAM, { sh: 1.4, hl: 0.9, ln: LN }),
    cel(sparklePath(37, 12.6, 2.6, 1.7), CREAM, { sh: 0, hl: 0, ln: 0.7 }),
    cel(sparklePath(15.6, 29.4, 2, 1.3), GOLD, { sh: 0, hl: 0, ln: 0.6 }),
  ];
};

const mammoth = (): Shape[] => [
  // the far legs, then the body with its high shoulder hump and domed head (facing the fly)
  cel('M18.2 24H21.8V31.6H18.2Z', FUR_FAR, { sh: 0.9, hl: 0, ln: LN }),
  cel('M31.2 24.6H34.8V31.6H31.2Z', FUR_FAR, { sh: 0.9, hl: 0, ln: LN }),
  cel(ribbonPath([[15.8, 18.4], [14.4, 21], [13.4, 23.6]], 1.8, 1.2), FUR, { sh: 0.6, hl: 0, ln: 0.9 }),
  cel(
    'M16.2 31.6C15.2 27 14.8 21 16.8 17.4C19 13.6 23.2 11 27.6 10.1C30.8 9.4 33.6 9.6 35.6 10.8C37.6 9.6 40.4 9.8 41.8 11.8C43 13.6 42.8 16.4 41.8 18.4L39.8 22C39.4 25 39.2 28.4 39.4 31.6H35V26.6C31 27.6 25.4 27.6 21.6 26.8L21.4 31.6Z',
    FUR,
    { sh: 2.2, hl: 1.3, ln: LN },
  ),
  // fur strokes
  inner('M19.6 17.2Q21.4 15.4 23.6 15M24.6 13.2Q26.8 11.8 29 11.8M18 22Q19.2 20.6 20.8 20.4M29.4 15.4Q31.2 14.2 33.2 14.4', '#6e4126'),
  inner('M36.2 27.4L37.4 26.2M22.6 28.4L23.8 27.4', '#6e4126'),
  // ear, eye, then the raised trunk and the tusk
  cel(ellipsePath(36.4, 15.4, 2.1, 3), FUR_FAR, { sh: 0.8, hl: 0, ln: 0.9 }),
  circle(39.6, 14.4, 0.85, '#2a160c'),
  cel(ribbonPath([[41.2, 17.4], [43.6, 20], [45.6, 18.4], [46.4, 14.8], [45.6, 11.4], [44.2, 10.2]], 3.4, 1.5), FUR, { sh: 1, hl: 0.7, ln: LN }),
  inner('M44 19.4L45.2 18.6M45.6 16L46.8 15.6M45.4 13L46.6 12.8', '#6e4126'),
  cel(ribbonPath([[39.8, 19.8], [41.2, 23.4], [44.4, 24.8], [47.4, 22.6]], 2.4, 0.7, 'point'), TUSK, { sh: 0.8, hl: 0.5, ln: 0.9 }),
];

const crossedClubs = (): Shape[] => {
  // a knobbly club, upright about the origin (head up), then rotated into place
  const club = 'M0 -13.8C3 -13.8 4.4 -11.6 4.2 -9.6C5 -8.6 4.8 -6.8 3.8 -5.8L1.6 11.6C1.5 12.8 0.8 13.4 0 13.4C-0.8 13.4 -1.5 12.8 -1.6 11.6L-3.6 -5.6C-4.6 -6.6 -4.8 -8.6 -4 -9.8C-4.3 -12 -2.8 -13.8 0 -13.8Z';
  const parts = (deg: number, wood: string): Shape[] => {
    const at = (d: string) => xformPath(d, { deg, dx: 28, dy: 20.4 });
    return [
      cel(at(club), wood, { sh: 1.8, hl: 1.1, ln: LN }),
      inner(at('M-1.4 -11.4Q-0.8 -2 -0.5 8M1.4 -10.6Q1.2 -4 0.8 0'), '#7a4826'),
      cel(at(ellipsePath(-1.6, -9.6, 0.9, 1.2)), '#7f4c27', { sh: 0, hl: 0, ln: 0.6 }),
      cel(at(ellipsePath(2, -6.8, 0.7, 1)), '#7f4c27', { sh: 0, hl: 0, ln: 0.6, lo: true }),
      // the leather grip
      cel(at('M-1.9 6H1.9L1.6 11.4H-1.6Z'), LEATHER, { sh: 0.8, hl: 0, ln: 0.8 }),
      inner(at('M-1.8 7.6L1.8 8.6M-1.7 9.6L1.7 10.6'), '#3f2416'),
    ];
  };
  return [...parts(-36, WOOD_DARK), ...parts(36, WOOD), cel(ellipsePath(28, 20.4, 2.3), GOLD, { sh: 0.9, hl: 0.6, ln: 0.9, mat: 'gold' })];
};

const laurel = (): Shape[] => {
  // the left branch climbs a circle round (28, 19.4) from the bottom; the right one is its mirror
  const leafD = 'M0 -3.2C1.7 -1.4 1.6 0.9 0 3.2C-1.6 0.9 -1.7 -1.4 0 -3.2Z';
  const R = 11.4;
  const leaves: Shape[] = [];
  for (let i = 0; i < 6; i += 1) {
    const phi = ((106 + i * 25) * Math.PI) / 180;
    const out = i % 2 === 0 ? 1 : -1;
    const r = R + out * 1;
    const x = 28 + Math.cos(phi) * r;
    const y = 19.4 + Math.sin(phi) * r;
    // along the branch (the tangent going up), tilted out or in like a real laurel
    const deg = (Math.atan2(-Math.sin(phi), -Math.cos(phi)) * 180) / Math.PI + out * 22;
    const d = xformPath(leafD, { s: 1.32, deg, dx: x, dy: y });
    leaves.push(cel(d, LEAF, { sh: 1.2, hl: 0.7, ln: 0.95 }), cel(mirrorPath(d, 28), LEAF, { sh: 1.2, hl: 0.7, ln: 0.95 }));
  }
  const starD = polyPath(Array.from({ length: 10 }, (_, i) => [Math.cos(((i * 36 - 90) * Math.PI) / 180) * (i % 2 ? 2.8 : 6.4), Math.sin(((i * 36 - 90) * Math.PI) / 180) * (i % 2 ? 2.8 : 6.4)]).flat());
  return [
    { d: `M24.2 29.8A${R} ${R} 0 0 1 23.4 9M31.8 29.8A${R} ${R} 0 0 0 32.6 9`, stroke: '#4e7d2e', width: 1 },
    ...leaves,
    // the star and the ribbon tie with its two tails
    cel(xformPath(starD, { dx: 28, dy: 19.8 }), GOLD, { sh: 1.6, hl: 1, ln: LN, mat: 'gold' }),
    cel('M27.4 29.6L23.4 33.4L22.6 30.6L25.2 29.2ZM28.6 29.6L32.6 33.4L33.4 30.6L30.8 29.2Z', WINE, { sh: 0.7, hl: 0, ln: 0.85 }),
    cel('M28 28.2C30 27 31.8 27.6 31.6 29.4C31.4 30.8 29.6 30.6 28 30C26.4 30.6 24.6 30.8 24.4 29.4C24.2 27.6 26 27 28 28.2Z', WINE, { sh: 0.7, hl: 0.4, ln: 0.85 }),
  ];
};

const cogwheel = (): Shape[] => [
  // the small gold gear behind, meshing with the big steel one
  cel(gearPath(37.4, 26.4, 6, 4.7, 8, 22.5), GOLD, { sh: 1.4, hl: 0.8, ln: LN, mat: 'gold' }),
  cel(ellipsePath(37.4, 26.4, 1.7), 'teamDark', { sh: 0, hl: 0, ln: 0.8, lc: '#5d4717' }),
  cel(gearPath(25.4, 19.2, 11, 8.9, 10), STEEL, { sh: 2, hl: 1.2, ln: LN, mat: 'metal' }),
  // windows in the wheel (the cloth showing through), the hub and bolts
  ...[0, 72, 144, 216, 288].map((deg) => cel(rotatePath(ellipsePath(25.4, 13.6, 1.7, 2), deg, 25.4, 19.2), 'teamDark', { sh: 0, hl: 0, ln: 0.7, lc: '#505357', lo: true })),
  cel(ellipsePath(25.4, 19.2, 4.4), GOLD_DEEP, { sh: 1.1, hl: 0.7, ln: 0.9, mat: 'gold' }),
  cel(ellipsePath(25.4, 19.2, 1.8), 'teamDark', { sh: 0, hl: 0, ln: 0.8, lc: '#5d4717' }),
];

const lightning = (): Shape[] => [
  // the storm cloud and the bolt out of it
  cel(polyPath([31.8, 16.2, 23.2, 25, 28.2, 25, 23.8, 33, 36.6, 21.4, 31.2, 21.4, 35, 16.2]), GOLD, { sh: 1.6, hl: 1, ln: LN, mat: 'gold' }),
  cel('M17.4 17.2C16.2 14.6 17.8 11.6 20.8 11.4C21.8 8.2 25.6 6.8 28.6 8.2C30.6 6.6 34.6 7 36 9.8C38.8 9.8 40.8 12.4 39.8 15.2C39.4 16.6 38.2 17.6 36.6 17.8H19.8C18.8 17.8 17.8 17.6 17.4 17.2Z', '#e8ecf2', { sh: 1.8, hl: 1, ln: LN }),
  inner('M22.6 14.4Q24.4 12.8 26.6 13.4M30.4 13Q32.2 11.6 34 12.4', '#a9b1bc'),
  // sparks at the strike
  { d: 'M21 30.4L19 31.2M22.4 33.4L21.4 35M26.4 33.6L27.4 35.2', stroke: CREAM, width: 0.9, lo: true },
];

const comet = (): Shape[] => [
  glow(37.2, 12.4, 9.5, '#ffffff', 0.6),
  // three streaks of the tail (a wide gold flare, an orange inner, a cream core), then the bright head
  cel(ribbonPath([[36.4, 13.2], [29.4, 19.2], [21.6, 25.4], [13.4, 30.8]], 10.4, 1, 'point'), GOLD, { sh: 1.6, hl: 0.9, ln: LN }),
  cel(ribbonPath([[36.2, 13.4], [30.2, 18.6], [23.4, 23.8], [17.6, 27.4]], 6.4, 0.6, 'point'), '#ffe27a', { sh: 0.8, hl: 0, ln: 0.7 }),
  { d: ribbonPath([[36.4, 13], [31, 17.4], [25.6, 21.2]], 3.6, 0.4, 'point'), fill: CREAM },
  cel(ellipsePath(37.4, 12.2, 4.6), '#fffbec', { sh: 1.6, hl: 1.1, ln: LN }),
  cel(sparklePath(19.6, 11.4, 2.4, 1.5), CREAM, { sh: 0, hl: 0, ln: 0.6 }),
  cel(sparklePath(44.2, 25.4, 2, 1.3), GOLD, { sh: 0, hl: 0, ln: 0.6 }),
  cel(sparklePath(28.4, 8.4, 1.4, 0.9), CREAM, { sh: 0, hl: 0, ln: 0.5, lo: true }),
  cel(ellipsePath(41.6, 20.2, 0.8), CREAM, { sh: 0, hl: 0, ln: 0.5, lo: true }),
];

const GREEN = '#4f9c52';
const GREEN_FAR = '#3c7a40';

const wyvern = (): Shape[] => {
  const spade = xformPath('M0 -3.4C1.9 -1.7 2.5 0.4 1.1 1.5L0 0.9L-1.1 1.5C-2.5 0.4 -1.9 -1.7 0 -3.4Z', { deg: 135, dx: 21.4, dy: 25.2 });
  return [
    // the curled tail with its spade barb, the far leg
    cel(ribbonPath([[26.6, 27.6], [22.8, 30], [18.2, 29.8], [15.2, 27], [15.8, 23.4], [18.8, 22.6], [20.6, 24.4]], 3.4, 1.3), GREEN, { sh: 1.1, hl: 0.6, ln: LN }),
    cel(spade, GOLD, { sh: 0.7, hl: 0.4, ln: 0.85, mat: 'gold' }),
    cel(ribbonPath([[28.6, 25], [27.6, 28.4], [28.8, 31]], 2.8, 1.8), GREEN_FAR, { sh: 0.7, hl: 0, ln: 0.9 }),
    // the raised bat wing: gold membrane with scalloped edges between three finger bones
    cel('M27.2 17.6L23.2 13.4L19.8 7.2L12 9.6Q14.6 12.2 11.2 15.8Q14.4 17.4 14.4 21.8Q19.6 20.2 25.2 23.2Z', GOLD, { sh: 1.6, hl: 1, ln: LN, mat: 'gold' }),
    // the finger bones over the membrane: a dark edge and the green bone
    { d: 'M19.8 7.2Q15.8 8.2 12 9.6M19.8 7.2Q15.6 11.6 11.2 15.8M21.6 10.4Q17.8 16.2 14.4 21.8', stroke: '#1d3b20', width: 1.7 },
    { d: 'M19.8 7.2Q15.8 8.2 12 9.6M19.8 7.2Q15.6 11.6 11.2 15.8M21.6 10.4Q17.8 16.2 14.4 21.8', stroke: GREEN, width: 0.9 },
    cel(ribbonPath([[27.2, 17.6], [23.2, 13.4], [19.8, 7.2]], 2.4, 1.4), GREEN, { sh: 0.7, hl: 0.5, ln: 0.9 }),
    cel(polyPath([19.3, 7.6, 18.8, 4.8, 21, 7]), IVORY, { sh: 0, hl: 0, ln: 0.7 }),
    // gold spines down the neck, the horns and the fire it breathes
    cel(polyPath([31.4, 10.4, 28.8, 10.2, 30.2, 12.4]), GOLD_DEEP, { sh: 0, hl: 0, ln: 0.7 }),
    cel(polyPath([30.4, 13, 27.6, 13, 29.2, 15.2]), GOLD_DEEP, { sh: 0, hl: 0, ln: 0.7 }),
    cel(polyPath([29.2, 15.8, 26.4, 16, 28.2, 18]), GOLD_DEEP, { sh: 0, hl: 0, ln: 0.7 }),
    cel(ribbonPath([[35.2, 8.2], [33.4, 5.8], [30.8, 4.8], [29, 5.4]], 2.2, 0.4, 'point'), IVORY, { sh: 0.5, hl: 0, ln: 0.8 }),
    cel(ribbonPath([[36.6, 7.8], [36.2, 5.6], [34.8, 4.4]], 1.8, 0.3, 'point'), '#e2cfa6', { sh: 0.4, hl: 0, ln: 0.8 }),
    cel('M42.4 12.4C44.4 10.8 46.4 11 48 10C47.4 11.4 48.4 12 49.2 12C48.2 13.6 46.4 14.6 43.8 13.6Z', RED, { sh: 0.6, hl: 0, ln: 0.8 }),
    cel('M42.8 12.6C44.4 11.8 45.8 12 47 11.4C46.6 12.6 45.8 13.2 44 13.2Z', FLAME, { sh: 0, hl: 0, ln: 0 }),
    // body, neck and horned head in one silhouette, the cream belly plates, the eye
    cel(
      'M26 28C24.4 24.8 24.6 20.4 27 17.2C28.6 15 30 12.8 31 10.6C31.8 8.8 33.6 7.6 35.8 7.8C37.4 7.9 38.6 8.6 39.6 9L43.2 9.6C44.2 9.8 44.6 10.6 44 11.2L40.4 11.8L43.2 13.6C42 14.8 39.4 15.2 37.2 14.6C35.4 16.4 34.6 18.6 34.8 20.8C35 23.6 33.6 26.6 31 28.2C29.4 29.2 27.2 29.2 26 28Z',
      GREEN,
      { sh: 2, hl: 1.2, ln: LN },
    ),
    cel('M36.4 15.4C35 17.2 34.6 19 34.8 21C35 23.6 33.8 26.2 31.6 27.6L30.4 26.4C32.2 24.8 33 22.8 32.8 20.6C32.6 18.4 33.4 16.6 34.8 15.2Z', CREAM, { sh: 0.6, hl: 0, ln: 0.7 }),
    inner('M35 18.4L33 18.8M35 21.2L33 21.4M34.4 24L32.6 23.8', '#b9a27a'),
    circle(38, 10, 0.85, '#b0262e'),
    circle(42.8, 10.2, 0.4, '#24402a'),
    // the near leg with its claws
    cel(ribbonPath([[31.8, 23.8], [31.6, 27.6], [33.8, 30.4]], 3.2, 1.8), GREEN, { sh: 0.9, hl: 0.5, ln: LN }),
    { d: 'M33.4 30.6L35.6 31.4M34 29.8L36 29.8M32.6 31.2L33.8 32.6', stroke: IVORY, width: 0.85 },
  ];
};

const phoenix = (): Shape[] => {
  // one wing in three layers of flame feathers (outer red, orange, inner gold), mirrored
  const outer = 'M29.6 19.6C33 15.6 37.4 11.4 43.6 7.8C42.4 10.6 41.6 12 40 13.4C42.6 13.2 44.2 12.6 45.8 12C44.4 15 42.4 16.6 39.8 17.4C41.8 18 43.2 18.2 44.6 18.2C42.4 20.8 38.8 21.8 34.8 21.6C32.8 21.4 30.8 20.8 29.6 19.6Z';
  const middle = 'M29.8 19.4C32.6 16.4 35.8 13.6 40.2 11.4C39.4 13.4 38.4 14.8 37.2 15.6C39.2 15.6 40.6 15.4 41.8 15C40.2 17.4 37.8 18.8 34.8 19.6C33.2 20 31.2 20.2 29.8 19.4Z';
  const innerW = 'M30 19.2C31.8 17.6 33.8 16 36.6 14.8C35.8 16.4 34.8 17.6 33.4 18.4C34.6 18.6 35.6 18.6 36.6 18.4C35 19.8 32.6 20.4 30 19.2Z';
  const wing = (mirror: boolean): Shape[] => {
    const m = (d: string) => (mirror ? mirrorPath(d, 28) : d);
    return [cel(m(outer), RED, { sh: 1.4, hl: 0.9, ln: LN }), cel(m(middle), FLAME_HOT, { sh: 1, hl: 0, ln: 0.9 }), cel(m(innerW), FLAME, { sh: 0.8, hl: 0, ln: 0.8 })];
  };
  const tail = (pts: [number, number][], fill: string) => cel(ribbonPath(pts, 3, 0.5, 'point'), fill, { sh: 0.8, hl: 0, ln: 0.9 });
  return [
    // tail flames fanning down
    tail([[27, 25.4], [24.6, 28.4], [21.4, 30.4], [19.6, 29.2]], RED),
    tail([[29, 25.4], [31.4, 28.4], [34.6, 30.4], [36.4, 29.2]], RED),
    tail([[28, 25.6], [28, 29], [28, 32.2]], FLAME_HOT),
    ...wing(false),
    ...wing(true),
    // the crest of three plumes, the body and the head in profile
    cel(ribbonPath([[27.6, 9.6], [26.2, 7.4], [26.6, 5.4]], 1.6, 0.3, 'point'), RED, { sh: 0, hl: 0, ln: 0.8 }),
    cel(ribbonPath([[28.6, 9.2], [28.8, 7], [30, 5.4]], 1.5, 0.3, 'point'), FLAME_HOT, { sh: 0, hl: 0, ln: 0.8 }),
    cel(ribbonPath([[26.8, 10.6], [24.8, 9.2], [23.8, 7.6]], 1.4, 0.3, 'point'), FLAME, { sh: 0, hl: 0, ln: 0.8 }),
    cel('M28 12.4C30.4 13 31.4 15.6 31.2 18.4C31 21.8 29.8 24.8 28 26.6C26.2 24.8 25 21.8 24.8 18.4C24.6 15.6 25.6 13 28 12.4Z', GOLD, { sh: 1.8, hl: 1.1, ln: LN, mat: 'gold' }),
    inner('M26.6 17.4Q28 18.4 29.4 17.4M26.8 20.4Q28 21.4 29.2 20.4', '#c48a22'),
    cel(ellipsePath(28.4, 11, 2.6), GOLD, { sh: 1, hl: 0.7, ln: LN, mat: 'gold' }),
    cel(polyPath([30.6, 10.2, 33.4, 11.6, 30.6, 12.4]), '#f08a30', { sh: 0, hl: 0, ln: 0.8 }),
    circle(29.2, 10.5, 0.6, '#3a1608'),
  ];
};

/**
 * Each base flag's emblem, finish tier (it matches the item's rarity; a test checks it) and fit: the
 * scale about the emblem centre (28, 20) and a nudge, so every emblem fills 55-62% of the cloth height.
 */
const DESIGNS: Readonly<Record<string, { tier: FlagTier; emblem: () => Shape[]; fit?: [number, number, number] }>> = {
  ember: { tier: 'common', emblem: ember, fit: [1.04, 0, -0.4] },
  dawn: { tier: 'common', emblem: dawn, fit: [1.06, 0, -0.6] },
  oak: { tier: 'common', emblem: oak, fit: [1.1, 0, -0.4] },
  chevron: { tier: 'common', emblem: chevron },
  wave: { tier: 'common', emblem: wave, fit: [1.1, -1.4, -0.6] },
  mountain: { tier: 'rare', emblem: mountain, fit: [1.04, 0, -0.6] },
  twin_stars: { tier: 'rare', emblem: twinStars },
  mammoth: { tier: 'rare', emblem: mammoth, fit: [1.08, -1.6, -1] },
  crossed_clubs: { tier: 'rare', emblem: crossedClubs, fit: [1.04, 0, -0.4] },
  laurel: { tier: 'rare', emblem: laurel, fit: [1, 0, -0.4] },
  cogwheel: { tier: 'epic', emblem: cogwheel, fit: [1.04, 0, 0] },
  lightning: { tier: 'epic', emblem: lightning, fit: [1.06, 0, -0.6] },
  comet: { tier: 'epic', emblem: comet, fit: [1, -0.6, 0] },
  wyvern: { tier: 'legendary', emblem: wyvern, fit: [1.02, -0.6, 0.4] },
  phoenix: { tier: 'legendary', emblem: phoenix, fit: [1.06, 0, 0.6] },
};

const emblemOf = (d: { emblem: () => Shape[]; fit?: [number, number, number] }): Shape[] => (d.fit ? fitShapes(d.emblem(), d.fit[0], 28, 20, d.fit[1], d.fit[2]) : d.emblem());

// ---------------------------------------------------------------------------------------------
// The cloth (inside the outline clip)
// ---------------------------------------------------------------------------------------------

/** The hem line inset 2.2 units from the edges (the hoist side runs under the sleeve). */
const HEM = 'M6.4 2.2H56.6L48.6 20L56.6 37.8H6.4';
/** The same inset for the stitches inside a border band. */
const HEM_IN = 'M7 3.6H54L46.9 20L54 36.4H7';

/** The field, folds, weave and sleeve, under the emblem. */
export function flagCloth(tier: FlagTier): Shape[] {
  const out: Shape[] = [
    { d: BANNER_OUTLINE, fill: 'team' },
    // fold shading: hard bands that bend like the ripple (AUDIT §3.1), not straight stripes
    { d: 'M15.6 0C17.4 10 15.2 28 17.4 40H22.6C20.4 28 22.6 10 20.6 0Z', fill: 'teamDark', alpha: 0.26 },
    { d: 'M24.6 0C25.8 12 24.2 26 25.8 40H28C26.4 26 28 12 26.8 0Z', fill: 'teamLight', alpha: 0.3 },
    { d: 'M37.6 0C39.4 11 37.2 27 39.4 40H45.4C43.2 27 45.4 11 43.6 0Z', fill: 'teamDark', alpha: 0.24 },
    // three diagonal weave strokes per patch (texture, AUDIT §3.1)
    { d: 'M8.6 33.6L11 31.2M10.2 34.6L12.8 32M11.8 35.6L14.4 33', stroke: 'teamDark', width: 0.5, alpha: 0.42, lo: true },
    { d: 'M42.6 6.2L45 3.8M44.2 7.2L46.8 4.6M45.8 8.2L48.4 5.6', stroke: 'teamDark', width: 0.5, alpha: 0.42, lo: true },
    { d: 'M30.6 35.8L33 33.4M32.2 36.8L34.8 34.2M33.8 37.8L36.4 35.2', stroke: 'teamLight', width: 0.5, alpha: 0.42, lo: true },
  ];
  if (tier !== 'common') {
    // a border band along the edges: cream (Rare), gold (Epic, Legendary)
    const gold = tier !== 'rare';
    out.push({ d: BANNER_OUTLINE, fill: 'none', stroke: gold ? GOLD : CREAM, width: gold ? 5 : 4.2 });
    if (gold) {
      out.push({ d: 'M6 1.4H58.2L49.4 20L58.2 38.6H6', fill: 'none', stroke: '#fff0c4', width: 0.5, alpha: 0.9 });
      out.push({ d: 'M6 2.4H56.6L48.4 20L56.6 37.6H6', fill: 'none', stroke: '#9a6a1c', width: 0.45, alpha: 0.85 });
    }
  }
  return out;
}

/** Over the emblem: the stitched hem, the cloth's light and shadow band, and the hoist sleeve. */
export function flagTrim(tier: FlagTier): Shape[] {
  const stitchIn = tier !== 'common';
  return [
    { d: stitchIn ? HEM_IN : HEM, fill: 'none', stroke: tier === 'common' ? 'teamLight' : tier === 'rare' ? 'teamLight' : '#fff0c4', width: 0.55, dash: [1.6, 1.1], alpha: 0.85, lo: true },
    // the cloth part's own highlight (top edge) and shadow band (lower edge and notch underside)
    { d: 'M0 0H60L59.1 2H0Z', fill: 'teamLight', alpha: 0.45 },
    { d: `${BANNER_OUTLINE}M0 -3.2H60L51 16.8L60 36.8H0Z`, fill: 'teamDark', alpha: 0.42, evenodd: true },
    // the hoist sleeve the pole runs through
    { d: 'M0 0H5.6V40H0Z', fill: tier === 'legendary' || tier === 'epic' ? GOLD_DEEP : 'teamDark' },
    { d: 'M0 0H1.6V40H0Z', fill: '#ffffff', alpha: 0.22 },
    { d: 'M4.4 0H5.6V40H4.4Z', fill: '#000000', alpha: 0.22 },
    { d: 'M2.8 3.4V8.6M2.8 15.6V20.8M2.8 27.8V33', fill: 'none', stroke: tier === 'common' || tier === 'rare' ? 'teamLight' : '#fff0c4', width: 0.6, dash: [1.2, 0.9], alpha: 0.85, lo: true },
  ];
}

/** Outside the outline: Epic tassels at the fly end, the Legendary gold fringe. */
export function flagFringe(tier: FlagTier): Shape[] {
  if (tier === 'common' || tier === 'rare') return [];
  const tassel = (x: number, y: number): Shape[] => [
    { d: `M${x} ${y}L${x + 0.4} ${y + 1.4}`, stroke: '#9a6a1c', width: 0.5 },
    cel(`M${x + 0.4} ${y + 1.2}C${x + 1.5} ${y + 1.4} ${x + 1.5} ${y + 2.6} ${x + 0.4} ${y + 3.2}C${x - 0.7} ${y + 2.6} ${x - 0.7} ${y + 1.4} ${x + 0.4} ${y + 1.2}Z`, GOLD, { sh: 0.5, hl: 0, ln: 0.45, mat: 'gold' }),
  ];
  const out: Shape[] = [];
  if (tier === 'legendary') {
    // the gold fringe along the foot
    out.push({ d: 'M6.6 41H59.4', stroke: GOLD, width: 2, dash: [0.55, 0.45], cap: 'butt' });
    out.push({ d: 'M6.6 40.2H59.6', stroke: '#9a6a1c', width: 0.5 });
  }
  for (const [x, y] of tier === 'epic' ? ([[59.4, -0.2], [56.4, 6.4], [53.4, 13], [53.4, 25.2], [56.4, 31.8], [59.4, 38.2]] as const) : ([[59.4, -0.2], [59.4, 38.4]] as const)) out.push(...tassel(x, y));
  return out;
}

/** The pole behind the sleeve and its finial, for the screens (`viewBox` from {@link FLAG_POLE_BOX}). */
export function flagPole(tier: FlagTier): Shape[] {
  const pole: Shape[] = [
    // a round pole: its far (right) side in shadow, a lit sliver on the left
    cel('M1.6 -2.4H3.8V41.4H1.6Z', tier === 'legendary' ? '#7a4a2a' : WOOD, { sh: 0, shx: 0.8, hl: 0.6, ln: 0.8 }),
    // the ferrule at its foot
    cel('M1.2 39.6H4.2V41.8Q2.7 42.6 1.2 41.8Z', tier === 'common' ? '#6b4428' : GOLD_DEEP, { sh: 0, hl: 0, ln: 0.6, mat: 'gold' }),
  ];
  switch (tier) {
    case 'common':
      return [...pole, cel(ellipsePath(2.7, -4.2, 2.5), WOOD, { sh: 1, hl: 0.8, ln: 0.9 })];
    case 'rare':
      return [...pole, cel('M0.8 -2.2H4.6V-0.8H0.8Z', GOLD_DEEP, { sh: 0.4, hl: 0, ln: 0.6, mat: 'gold' }), cel(ellipsePath(2.7, -4.6, 2.7), GOLD, { sh: 1.1, hl: 0.9, ln: 0.9, mat: 'gold' })];
    case 'epic':
      return [
        ...pole,
        cel('M0.6 -2.6H4.8V-0.8H0.6Z', GOLD_DEEP, { sh: 0.4, hl: 0, ln: 0.6, mat: 'gold' }),
        cel('M2.7 -10.8C4.5 -8.4 4.9 -5.6 3.8 -2.6H1.6C0.5 -5.6 0.9 -8.4 2.7 -10.8Z', STEEL, { sh: 1.1, hl: 0.8, ln: 0.8, mat: 'metal' }),
        { d: 'M2.7 -9.6L2.7 -3.4', stroke: '#8a919a', width: 0.45, lo: true },
      ];
    case 'legendary': {
      const pts: number[] = [];
      for (let i = 0; i < 10; i += 1) {
        const a = ((i * 36 - 90) * Math.PI) / 180;
        const r = i % 2 === 0 ? 4.6 : 2;
        pts.push(2.7 + Math.cos(a) * r, -6.6 + Math.sin(a) * r);
      }
      return [
        glow(2.7, -6.4, 8, '#fff6d8', 0.75),
        ...pole,
        cel('M0.6 -2.6H4.8V-0.8H0.6Z', GOLD_DEEP, { sh: 0.4, hl: 0, ln: 0.6, mat: 'gold' }),
        cel(polyPath(pts), GOLD, { sh: 1.2, hl: 0.9, ln: 0.8, mat: 'gold' }),
      ];
    }
  }
}

/** The view box of a flag drawn with its pole and finial (`x y w h`). */
export const FLAG_POLE_BOX = [-4.4, -11.4, 66.4, 54.2] as const;

/** A diagonal glint band for the Legendary flags (the screens sweep it across; still under reduce motion). */
export const FLAG_GLINT = 'M-6 -2L2 -2L-10 42L-18 42Z';

// ---------------------------------------------------------------------------------------------
// The designs as the router and the lane read them
// ---------------------------------------------------------------------------------------------

/** The finish tier of a base flag, or undefined for an unknown id. */
export function baseFlagTier(id: string): FlagTier | undefined {
  return DESIGNS[id]?.tier;
}

/** Each base flag's cloth and emblem, the part inside the outline clip (the trim and fringe are added by `art.ts`). */
export const BASE_FLAGS: Readonly<Record<string, readonly Shape[]>> = Object.fromEntries(Object.entries(DESIGNS).map(([id, d]) => [id, [...flagCloth(d.tier), ...emblemOf(d)]]));

/** Each base flag's emblem alone, fitted (the 32 px silhouette test and the size test). */
export const BASE_FLAG_EMBLEMS: Readonly<Record<string, readonly Shape[]>> = Object.fromEntries(Object.entries(DESIGNS).map(([id, d]) => [id, emblemOf(d)]));
