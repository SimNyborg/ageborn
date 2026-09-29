/**
 * Flags, drawn in our own clean style (DESIGN A18.9.4, owner 2026-09-28): every flag sits on the same
 * 60 x 40 field with softly rounded corners, a light sheen from the top left, gentle cloth folds and
 * the game's ink outline, so a Danish, a Brazilian and a Mammoth flag read as one family.
 *
 * - National flags are country flags only, simplified where a flag carries a detailed coat of arms
 *   (Spain shows its plain civil form, Portugal a simplified sphere and shield). No political or hate symbols, and a player's
 *   flag is only ever their own pick.
 * - Base flags are emblems on the side's team colour (A11: the team reads first), cut as swallowtail
 *   banners so they never look like a country.
 */
import { band, circle, ellipse, group, INK, line, poly, rect, ring, rotRect, star, type Shape } from './shapes';

export const FLAG_W = 60;
export const FLAG_H = 40;

const W = FLAG_W;
const H = FLAG_H;

// ---------------------------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------------------------

const hStripes = (colors: readonly string[], weights?: readonly number[]): Shape[] => {
  const ws = weights ?? colors.map(() => 1);
  const total = ws.reduce((a, b) => a + b, 0);
  let y = 0;
  return colors.map((c, i) => {
    const h = (H * ws[i]!) / total;
    const s = rect(0, y, W, h + 0.3, c);
    y += h;
    return s;
  });
};

const vStripes = (colors: readonly string[], weights?: readonly number[]): Shape[] => {
  const ws = weights ?? colors.map(() => 1);
  const total = ws.reduce((a, b) => a + b, 0);
  let x = 0;
  return colors.map((c, i) => {
    const w = (W * ws[i]!) / total;
    const s = rect(x, 0, w + 0.3, H, c);
    x += w;
    return s;
  });
};

/** Nordic cross: the upright sits toward the hoist (x 17-25 for w 8). */
const nordic = (bg: string, cross: string, w: number, inner?: { color: string; w: number }): Shape[] => {
  const cx = 21;
  const out: Shape[] = [rect(0, 0, W, H, bg), rect(cx - w / 2, 0, w, H, cross), rect(0, H / 2 - w / 2, W, w, cross)];
  if (inner) out.push(rect(cx - inner.w / 2, 0, inner.w, H, inner.color), rect(0, H / 2 - inner.w / 2, W, inner.w, inner.color));
  return out;
};

const centredCross = (bg: string, c: string, w: number): Shape[] => [rect(0, 0, W, H, bg), rect(W / 2 - w / 2, 0, w, H, c), rect(0, H / 2 - w / 2, W, w, c)];

const saltire = (bg: string, c: string, w: number, x = 0, y = 0, ww = W, hh = H): Shape[] => [
  rect(x, y, ww, hh, bg),
  band(x, y, x + ww, y + hh, w, c),
  band(x + ww, y, x, y + hh, w, c),
];

/** The Union Flag in a box (whole flag or a canton). */
function unionFlag(x: number, y: number, w: number, h: number): Shape[] {
  const k = h / 40;
  const blue = '#012169';
  const red = '#c8102e';
  const cx = x + w / 2;
  const cy = y + h / 2;
  const off = 1.6 * k;
  return [
    group(
      [x, y, w, h],
      [
        rect(x, y, w, h, blue),
        band(x, y, x + w, y + h, 8 * k, '#ffffff'),
        band(x + w, y, x, y + h, 8 * k, '#ffffff'),
        // the red diagonals are counterchanged like a pinwheel: facing out from the centre, each
        // arm's red lies on its anticlockwise side (below the white at the upper hoist)
        band(x - off, y + off, cx - off, cy + off, 2.6 * k, red),
        band(cx + off, cy - off, x + w + off, y + h - off, 2.6 * k, red),
        band(x + w - off, y - off, cx - off, cy - off, 2.6 * k, red),
        band(cx + off, cy + off, x + off, y + h + off, 2.6 * k, red),
        rect(cx - 6.5 * k, y, 13 * k, h, '#ffffff'),
        rect(x, cy - 6.5 * k, w, 13 * k, '#ffffff'),
        rect(cx - 4 * k, y, 8 * k, h, red),
        rect(x, cy - 4 * k, w, 8 * k, red),
      ],
    ),
  ];
}

function usStars(): Shape[] {
  const out: Shape[] = [];
  const cw = 24;
  const ch = (H * 7) / 13;
  for (let row = 0; row < 9; row += 1) {
    const n = row % 2 === 0 ? 6 : 5;
    for (let i = 0; i < n; i += 1) {
      const sx = row % 2 === 0 ? (cw / 12) * (1 + 2 * i) : (cw / 12) * (2 + 2 * i);
      const sy = (ch / 10) * (1 + row);
      out.push(star(sx, sy, 0.95, '#ffffff'));
    }
  }
  return out;
}

const MAPLE =
  'M30 7.5l-2 4.2c-.3.5-.7.4-1.2.2l-1.5-.8 1.1 5.9c.2 1.1-.4 1.1-.8.6l-2.6-2.9-.4 1.5c-.1.3-.4.5-.8.4l-3.3-.7.9 3.2c.2.7.3 1-.2 1.2l-1.2.5 5.7 4.6c.2.2.3.5.3.8l-.5 1.6c2-.2 3.8-.6 5.8-.8.2 0 .5.2.5.4l-.3 6.2h1.1l-.3-6.2c0-.2.3-.4.5-.4 2 .2 3.8.6 5.8.8l-.5-1.6c-.1-.3 0-.6.3-.8l5.7-4.6-1.2-.5c-.5-.2-.4-.5-.2-1.2l.9-3.2-3.3.7c-.4.1-.7-.1-.8-.4l-.4-1.5-2.6 2.9c-.4.5-1 .5-.8-.6l1.1-5.9-1.5.8c-.5.2-.9.3-1.2-.2z';

/**
 * Taegukgi. The taegeuk's S-line and the geon/gon trigrams lie on the upper-left to lower-right
 * diagonal (the gam/ri pair on the other one); red is on top with its head at the upper left, blue
 * below with its head at the lower right. Each trigram's bars stand across its diagonal, facing the
 * centre: geon ☰ upper left, gam ☵ upper right, ri ☲ lower left, gon ☷ lower right.
 */
function taeguk(): Shape[] {
  const cx = 30;
  const cy = 20;
  const r = 10; // diameter = half the flag's height
  const diag = (Math.atan2(H, W) * 180) / Math.PI; // 33.7° on a 3:2 field
  const rad = (diag * Math.PI) / 180;
  const ux = Math.cos(rad);
  const uy = Math.sin(rad);
  const p = (t: number) => `${(cx + ux * t).toFixed(2)} ${(cy + uy * t).toFixed(2)}`;
  const red = '#cd2e3a';
  const blue = '#0047a0';
  // the big upper half, minus the lower-right small circle, plus the upper-left small circle
  const top = `M${p(-r)}A${r} ${r} 0 0 1 ${p(r)}A${r / 2} ${r / 2} 0 0 0 ${p(0)}A${r / 2} ${r / 2} 0 0 1 ${p(-r)}z`;
  const ink = '#111111';
  const barLen = H / 4; // 10
  const barW = 1.7;
  const step = 2.55; // bar thickness plus the gap
  const gap = 1.3;
  const dist = r + 5 + step; // trigram centre from the flag centre
  /** One trigram centred on the diagonal at angle `axisDeg`, bars across it; `broken` lists the bars from the centre out. */
  const trigram = (axisDeg: number, sign: 1 | -1, broken: readonly boolean[]): Shape[] => {
    const a = (axisDeg * Math.PI) / 180;
    const ax = Math.cos(a) * sign;
    const ay = Math.sin(a) * sign;
    // the bar direction is the axis turned 90°
    const bx = -ay;
    const by = ax;
    const barDeg = (Math.atan2(-bx, by) * 180) / Math.PI; // rotRect's long side (h) is (−sin, cos)
    return broken.flatMap((isBroken, i) => {
      const d = dist + (i - 1) * step;
      const ox = cx + ax * d;
      const oy = cy + ay * d;
      if (!isBroken) return [rotRect(ox, oy, barW, barLen, barDeg, ink)];
      const half = (barLen - gap) / 2;
      const o = (half + gap) / 2;
      return [rotRect(ox - bx * o, oy - by * o, barW, half, barDeg, ink), rotRect(ox + bx * o, oy + by * o, barW, half, barDeg, ink)];
    });
  };
  return [
    rect(0, 0, W, H, '#ffffff'),
    circle(cx, cy, r, blue),
    { d: top, fill: red },
    ...trigram(diag, -1, [false, false, false]), // geon, upper left
    ...trigram(diag, 1, [true, true, true]), // gon, lower right
    ...trigram(-diag, 1, [true, false, true]), // gam, upper right
    ...trigram(-diag, -1, [false, true, false]), // ri, lower left
  ];
}

function sunRays(cx: number, cy: number, r: number, color: string): Shape[] {
  return [star(cx, cy, r * 1.9, color, { ri: r * 1.1, n: 16 }), circle(cx, cy, r, color, { stroke: '#8a5a00', width: 0.4 })];
}

function chakra(cx: number, cy: number, r: number): Shape[] {
  const navy = '#000080';
  const out: Shape[] = [ring(cx, cy, r, navy, 0.9), circle(cx, cy, 1, navy)];
  for (let i = 0; i < 12; i += 1) {
    const a = (i * Math.PI) / 12;
    out.push(line(`M${cx - Math.cos(a) * r} ${cy - Math.sin(a) * r}L${cx + Math.cos(a) * r} ${cy + Math.sin(a) * r}`, navy, 0.45));
  }
  return out;
}

function crescentStar(bg: string, cx: number): Shape[] {
  return [rect(0, 0, W, H, bg), circle(cx, 20, 10, '#ffffff'), circle(cx + 2.6, 20, 8, bg), star(cx + 11.5, 20, 5, '#ffffff', { rotDeg: -90, ri: 2 })];
}

/** The Southern Cross: Australia's stars have seven points, New Zealand's five (red, white-edged). */
function southernCross(fill: string, outline?: string): Shape[] {
  const s = (x: number, y: number, r: number) =>
    outline ? star(x, y, r, fill, { stroke: outline, width: 0.8 }) : star(x, y, r * 1.1, fill, { n: 7, ri: r * 0.5 });
  return [s(45, 31, 2.6), s(38, 18, 2.4), s(46, 8, 2.2), s(52, 16.5, 2.4)];
}

// ---------------------------------------------------------------------------------------------
// National flags (country codes; ids use `_` for `-`)
// ---------------------------------------------------------------------------------------------

export const NATIONAL_FLAGS: Readonly<Record<string, readonly Shape[]>> = {
  dk: nordic('#c8102e', '#ffffff', 6),
  fo: nordic('#ffffff', '#0065bd', 9, { color: '#ed2939', w: 4.5 }),
  gl: [rect(0, 0, W, H / 2, '#ffffff'), rect(0, H / 2, W, H / 2, '#d00c33'), group([10, 8, 24, 12], [circle(22, 20, 12, '#d00c33')]), group([10, 20, 24, 12], [circle(22, 20, 12, '#ffffff')])],
  se: nordic('#006aa7', '#fecc02', 6),
  no: nordic('#ba0c2f', '#ffffff', 9, { color: '#00205b', w: 4.5 }),
  fi: nordic('#ffffff', '#002f6c', 8),
  is: nordic('#02529c', '#ffffff', 9, { color: '#dc1e35', w: 4.5 }),
  gb: unionFlag(0, 0, W, H),
  gb_eng: centredCross('#ffffff', '#ce1124', 7),
  gb_sct: saltire('#005eb8', '#ffffff', 7),
  ie: vStripes(['#169b62', '#ffffff', '#ff883e']),
  us: [
    ...hStripes(Array.from({ length: 13 }, (_, i) => (i % 2 === 0 ? '#b22234' : '#ffffff'))),
    rect(0, 0, 24, (H * 7) / 13, '#3c3b6e'),
    ...usStars(),
  ],
  ca: [rect(0, 0, W, H, '#ffffff'), rect(0, 0, 15, H, '#d52b1e'), rect(45, 0, 15, H, '#d52b1e'), { d: MAPLE, fill: '#d52b1e' }],
  de: hStripes(['#000000', '#dd0000', '#ffce00']),
  fr: vStripes(['#0055a4', '#ffffff', '#ef4135']),
  nl: hStripes(['#ae1c28', '#ffffff', '#21468b']),
  be: vStripes(['#000000', '#fdda24', '#ef3340']),
  lu: hStripes(['#ed2939', '#ffffff', '#00a1de']),
  ch: [rect(0, 0, W, H, '#da291c'), rect(26.5, 10, 7, 20, '#ffffff'), rect(20, 16.5, 20, 7, '#ffffff')],
  at: hStripes(['#c8102e', '#ffffff', '#c8102e']),
  it: vStripes(['#009246', '#ffffff', '#ce2b37']),
  es: hStripes(['#aa151b', '#f1bf00', '#aa151b'], [1, 2, 1]),
  pt: [
    rect(0, 0, 24, H, '#046a38'),
    rect(24, 0, 36, H, '#da291c'),
    ring(24, 20, 7.5, '#ffe900', 2.2),
    { d: 'M20 15h8v6.5c0 2.6-1.8 4-4 4.8-2.2-.8-4-2.2-4-4.8z', fill: '#ffffff', stroke: '#da291c', width: 1.4 },
    // the five blue quinas, set as a cross
    ...[
      [24, 17.6],
      [21.9, 20.2],
      [24, 20.2],
      [26.1, 20.2],
      [24, 22.8],
    ].map(([x, y]) => circle(x!, y!, 0.85, '#003399')),
  ],
  pl: hStripes(['#ffffff', '#dc143c']),
  cz: [rect(0, 0, W, H / 2, '#ffffff'), rect(0, H / 2, W, H / 2, '#d7141a'), poly([0, 0, 30, 20, 0, 40], '#11457e')],
  hu: hStripes(['#ce2939', '#ffffff', '#477050']),
  gr: [
    ...hStripes(Array.from({ length: 9 }, (_, i) => (i % 2 === 0 ? '#0d5eaf' : '#ffffff'))),
    rect(0, 0, 22.2, 22.2, '#0d5eaf'),
    rect(8.9, 0, 4.4, 22.2, '#ffffff'),
    rect(0, 8.9, 22.2, 4.4, '#ffffff'),
  ],
  ee: hStripes(['#0072ce', '#000000', '#ffffff']),
  lv: hStripes(['#9e3039', '#ffffff', '#9e3039'], [2, 1, 2]),
  lt: hStripes(['#fdb913', '#006a44', '#c1272d']),
  ua: hStripes(['#0057b7', '#ffd700']),
  ro: vStripes(['#002b7f', '#fcd116', '#ce1126']),
  bg: hStripes(['#ffffff', '#00966e', '#d62612']),
  tr: crescentStar('#e30a17', 21),
  jp: [rect(0, 0, W, H, '#ffffff'), circle(30, 20, 12, '#bc002d')],
  kr: taeguk(),
  in: [...hStripes(['#ff9933', '#ffffff', '#138808']), ...chakra(30, 20, 5.6)],
  th: hStripes(['#a51931', '#f4f5f8', '#2d2a4a', '#f4f5f8', '#a51931'], [1, 1, 2, 1, 1]),
  vn: [rect(0, 0, W, H, '#da251d'), star(30, 20.5, 11, '#ffff00')],
  id: hStripes(['#ce1126', '#ffffff']),
  au: [rect(0, 0, W, H, '#012169'), ...unionFlag(0, 0, 30, 20), star(15, 30, 5.4, '#ffffff', { n: 7, ri: 2.5 }), ...southernCross('#ffffff'), star(48.5, 24, 1.3, '#ffffff')],
  nz: [rect(0, 0, W, H, '#012169'), ...unionFlag(0, 0, 30, 20), ...southernCross('#cc142b', '#ffffff')],
  br: [
    rect(0, 0, W, H, '#009c3b'),
    poly([6, 20, 30, 4.5, 54, 20, 30, 35.5], '#ffdf00'),
    circle(30, 20, 10, '#002776'),
    group([20, 10, 20, 20], [{ d: 'M18 19.5c6-3.5 16-3.5 24 2.6v2.4c-8-6-18-6-24-2.4z', fill: '#ffffff' }]),
    star(26, 25, 0.8, '#ffffff'),
    star(31, 27, 0.8, '#ffffff'),
    star(34, 23.5, 0.8, '#ffffff'),
  ],
  ar: [...hStripes(['#74acdf', '#ffffff', '#74acdf']), ...sunRays(30, 20, 3.4, '#f6b40e')],
  cl: [rect(0, 0, W, H / 2, '#ffffff'), rect(0, H / 2, W, H / 2, '#d52b1e'), rect(0, 0, 20, 20, '#0039a6'), star(10, 10.4, 5, '#ffffff')],
  co: hStripes(['#fcd116', '#003893', '#ce1126'], [2, 1, 1]),
  za: [
    rect(0, 0, W, H / 2, '#e03c31'),
    rect(0, H / 2, W, H / 2, '#001489'),
    poly([0, 0, 9, 0, 29, 15, 60, 15, 60, 25, 29, 25, 9, 40, 0, 40], '#ffffff'),
    poly([0, 3.5, 4.5, 3.5, 25.5, 17.3, 60, 17.3, 60, 22.7, 25.5, 22.7, 4.5, 36.5, 0, 36.5], '#007749'),
    poly([0, 7.5, 17, 20, 0, 32.5], '#ffb81c'),
    poly([0, 10.5, 13, 20, 0, 29.5], '#000000'),
  ],
  ng: vStripes(['#008751', '#ffffff', '#008751']),
  gh: [...hStripes(['#ce1126', '#fcd116', '#006b3f']), star(30, 20.6, 6.5, '#000000')],
  jm: [
    rect(0, 0, W, H, '#009b3a'),
    poly([0, 0, 30, 20, 0, 40], '#000000'),
    poly([60, 0, 30, 20, 60, 40], '#000000'),
    band(0, 0, 60, 40, 6, '#fed100'),
    band(60, 0, 0, 40, 6, '#fed100'),
  ],
};

// ---------------------------------------------------------------------------------------------
// Base flags: emblems on the team colour
// ---------------------------------------------------------------------------------------------

const GOLD = '#ffcf3a';
const GOLD_DARK = '#d99a12';
const WHITE = '#fff8e8';

/** The swallowtail cut of a base flag (fly edge notched). */
export const BANNER_OUTLINE = 'M0 0H60L51 20L60 40H0Z';

const field = (): Shape[] => [
  rect(0, 0, W, H, 'team'),
  rect(0, 0, W, 5, 'teamLight', { alpha: 0.55 }),
  rect(0, 35, W, 5, 'teamDark', { alpha: 0.6 }),
  rect(0, 0, 4.5, H, GOLD),
  rect(4.5, 0, 1.2, H, GOLD_DARK),
];

const emblem = (shapes: Shape[]): Shape[] => [...field(), ...shapes];

export const BASE_FLAGS: Readonly<Record<string, readonly Shape[]>> = {
  ember: emblem([
    { d: 'M27 33c-6.5 0-9.5-4.8-8.4-9.8.9-4 4.4-5.6 4-10 3.3 1.8 4.6 4.7 4.3 7.2 1.5-1.2 2-3.2 1.7-5.4 4.3 2.6 6.7 6.7 6.6 10.4C35.1 30.3 32 33 27 33z', fill: '#ff8a2b', stroke: INK, width: 1.2 },
    { d: 'M27 31c-3 0-4.6-2.2-4-4.6.5-2 2.2-2.6 2.6-5 2.6 1.8 3.7 3.8 3.4 5.4 1-.6 1.4-1.6 1.4-2.8 1.6 1.4 2.3 3 2.1 4.3C32.2 30 30 31 27 31z', fill: GOLD },
  ]),
  dawn: emblem([
    ...Array.from({ length: 7 }, (_, i) => {
      const a = ((-90 + (i - 3) * 26) * Math.PI) / 180;
      return band(27 + Math.cos(a) * 9, 30 + Math.sin(a) * 9, 27 + Math.cos(a) * 17, 30 + Math.sin(a) * 17, 2.6, GOLD);
    }),
    { d: 'M17 30a10 10 0 0 1 20 0z', fill: GOLD, stroke: INK, width: 1.2 },
    rect(12, 30, 30, 2.2, WHITE),
  ]),
  oak: emblem([
    {
      d: 'M27 8c2.2 2 3 3.8 2.2 5.6 2-.8 3.8-.4 4.2 1-1.4 1-1.8 2.4-1 3.6 2-.4 3.4.4 3.4 1.8-1.8.6-2.6 2-2 3.6 1.8.4 2.4 1.4 1.8 2.6-2.6 0-4.6.6-6.4 2.4l-.8 5.4h-2.8l-.8-5.4c-1.8-1.8-3.8-2.4-6.4-2.4-.6-1.2 0-2.2 1.8-2.6.6-1.6-.2-3-2-3.6 0-1.4 1.4-2.2 3.4-1.8.8-1.2.4-2.6-1-3.6.4-1.4 2.2-1.8 4.2-1-.8-1.8 0-3.6 2.2-5.6z',
      fill: '#8fd16a',
      stroke: INK,
      width: 1.2,
    },
    line('M27 12v22', '#3f7a2a', 1.2),
  ]),
  chevron: emblem([poly([14, 14, 27, 24, 40, 14, 40, 20, 27, 30, 14, 20], WHITE, { stroke: INK, width: 1.1 }), poly([17, 8, 27, 15.5, 37, 8, 37, 12, 27, 19.5, 17, 12], GOLD, { stroke: INK, width: 1 })]),
  wave: emblem([0, 1, 2].map((i) => line(`M12 ${13 + i * 7}c3.5-3.5 7-3.5 10.5 0s7 3.5 10.5 0 7-3.5 10.5 0`, i === 1 ? GOLD : WHITE, 2.6))),
  mountain: emblem([
    poly([10, 32, 22, 12, 29, 22, 33, 17, 44, 32], WHITE, { stroke: INK, width: 1.2 }),
    poly([22, 12, 26.5, 19, 24, 18, 22, 20.5, 19.6, 17.6], '#bfe3ff'),
    poly([33, 17, 36.5, 22, 34.6, 21.4, 33, 23, 31.6, 20.6], '#bfe3ff'),
    rect(9, 32, 36, 2, GOLD),
  ]),
  twin_stars: emblem([star(20, 17, 7.5, GOLD, { stroke: INK, width: 1.1 }), star(34, 24, 6, WHITE, { stroke: INK, width: 1.1 })]),
  mammoth: emblem([
    {
      d: 'M13 30v-7c0-6 5-10 12-10 5 0 8.6 2.6 9.8 6.6 1 3.4.2 6.8-1.2 9 .8 2.4 2.6 3.6 4.8 3.2-.2 1.8-2 3-4.4 2.8-2.6-.2-4.2-2-4.8-4.4l-.4 2.8h-3.6v-4.4h-5.2V30h-3.4v-3.6L16.2 30z',
      fill: WHITE,
      stroke: INK,
      width: 1.2,
    },
    { d: 'M31 22.4c2.4 1.4 3.8 3.6 3.6 6', stroke: GOLD, width: 2, fill: 'none' },
    circle(29.4, 18.2, 0.9, INK),
  ]),
  crossed_clubs: emblem([
    rotRect(27, 20, 4, 24, 40, '#c98a4b', { stroke: INK, width: 1.1 }),
    rotRect(27, 20, 4, 24, -40, '#c98a4b', { stroke: INK, width: 1.1 }),
    ellipse(35, 11, 4.2, 3.6, '#a8703a', { stroke: INK, width: 1.1 }),
    ellipse(19, 11, 4.2, 3.6, '#a8703a', { stroke: INK, width: 1.1 }),
    circle(27, 20, 2.2, GOLD, { stroke: INK, width: 0.9 }),
  ]),
  laurel: emblem([
    // two leafy branches meeting at the bottom, open at the top (y down: 90° is the bottom)
    ...[115, 140, 165, 190, 215, 240].map((deg) => {
      const a = (deg * Math.PI) / 180;
      return rotRect(27 + Math.cos(a) * 10.5, 21 + Math.sin(a) * 10.5, 3, 6.6, deg + 20, '#9be07a', { stroke: INK, width: 0.8 });
    }),
    ...[65, 40, 15, -10, -35, -60].map((deg) => {
      const a = (deg * Math.PI) / 180;
      return rotRect(27 + Math.cos(a) * 10.5, 21 + Math.sin(a) * 10.5, 3, 6.6, deg - 20, '#9be07a', { stroke: INK, width: 0.8 });
    }),
    star(27, 20, 4.5, GOLD, { stroke: INK, width: 0.9 }),
  ]),
  cogwheel: emblem([
    star(27, 20, 12, '#d9dde4', { n: 10, ri: 9.6, stroke: INK, width: 1.1 }),
    circle(27, 20, 8.6, '#b8c0cc'),
    circle(27, 20, 4, 'team', { stroke: INK, width: 1.1 }),
    rect(26, 8.6, 2, 3, GOLD),
  ]),
  lightning: emblem([poly([30, 6, 17, 22, 25.5, 22, 22, 34, 37, 16, 28.5, 16], GOLD, { stroke: INK, width: 1.2 }), poly([29, 8.5, 20.5, 19.5, 24, 19.5], '#fff2a8')]),
  comet: emblem([
    poly([12, 30, 30, 15.5, 33.5, 20.5], WHITE, { alpha: 0.55 }),
    poly([14, 34, 31, 19.5, 33, 23.5], GOLD, { alpha: 0.7 }),
    circle(34, 17, 6, WHITE, { stroke: INK, width: 1.2 }),
    circle(32.6, 15.6, 2, '#ffffff'),
  ]),
  wyvern: emblem([
    { d: 'M14 29c3-1 6-3.4 8-6.6L16 13l9 4.6 3-7.6 3 7.2 7.6-3.2-3.8 8c2.6 1.4 4.4 3.6 5.4 6.8l-4.2-1.2c-.8 1.6-2.2 2.6-4 3-3.6.8-6.8-.2-9.8.8z', fill: WHITE, stroke: INK, width: 1.2 },
    circle(35.4, 22.8, 0.9, INK),
    poly([28, 10, 29.4, 5.6, 30.6, 10.4], GOLD),
  ]),
  phoenix: emblem([
    { d: 'M27 14c-5-4-11-5-15-3 4 1.6 7 4 8.4 7.4-3-.6-6 0-8.4 1.8 4 .6 7 2 9 4.4l-.4 7.4 3.4-3 3 4.4 3-4.4 3.4 3-.4-7.4c2-2.4 5-3.8 9-4.4-2.4-1.8-5.4-2.4-8.4-1.8C35 15 38 12.6 42 11c-4-2-10-1-15 3z', fill: '#ff8a2b', stroke: INK, width: 1.2 },
    { d: 'M27 16.6c-1.6 0-2.6 1.4-2.6 3s1 4.4 2.6 6.8c1.6-2.4 2.6-5.2 2.6-6.8s-1-3-2.6-3z', fill: GOLD },
    circle(27, 13.4, 2.2, GOLD, { stroke: INK, width: 1 }),
  ]),
};

// ---------------------------------------------------------------------------------------------
// The finish shared by every flag
// ---------------------------------------------------------------------------------------------

/** Sheen and folds drawn over a flag's design (inside its outline). */
export function flagFinish(): Shape[] {
  return [
    poly([0, 0, 26, 0, 0, 22], '#ffffff', { alpha: 0.14 }),
    rect(16, 0, 5, H, '#000000', { alpha: 0.05 }),
    rect(36, 0, 6, H, '#000000', { alpha: 0.07 }),
    rect(22, 0, 3, H, '#ffffff', { alpha: 0.07 }),
    rect(0, H - 3, W, 3, '#000000', { alpha: 0.08 }),
  ];
}
