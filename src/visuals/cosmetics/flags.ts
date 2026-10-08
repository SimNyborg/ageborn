/**
 * Base flags, drawn in our own clean style (DESIGN A18.9.4, owner 2026-09-28): emblems on the side's
 * team colour (A11: the team reads first), cut as swallowtail banners so they never look like a country,
 * on the 60 x 40 field every flag shares, with a light sheen from the top left, gentle cloth folds and
 * the game's ink outline.
 *
 * National flags live in `nationalFlags.ts` (Track D, PLAN 2d); C0 (2026-10-08) moved their designs there.
 */
import { band, circle, ellipse, INK, line, poly, rect, rotRect, star, type Shape } from './shapes';

export const FLAG_W = 60;
export const FLAG_H = 40;

const W = FLAG_W;
const H = FLAG_H;

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
