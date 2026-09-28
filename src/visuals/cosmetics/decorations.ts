/**
 * Base decorations (DESIGN A18.9.4): small props that stand in the base's fixed anchor spots, never
 * over mounts or the HP bar. Drawn in the game's cel style: a flat base colour, a shadow side, a
 * highlight and the ink outline. View box 48 x 64 with the ground at y = 62 and the foot at x = 24.
 * Braziers and some statues have a light (`glow`) the battle view animates.
 */
import { band, circle, ellipse, INK, line, poly, rect, ring, roundRect, star, type Shape } from './shapes';

export const DECO_W = 48;
export const DECO_H = 64;
export const DECO_GROUND = 62;

export interface DecorationArt {
  shapes: Shape[];
  /** A light the view flickers (a flame or a glow), in view-box units. */
  glow?: { x: number; y: number; r: number; color: number };
  /** Sways in the wind (banners, plants). */
  sway?: boolean;
}

const O = { stroke: INK, width: 1.4 };
const shadow = (w = 30): Shape => ellipse(24, 62, w / 2, 2.4, '#000000', { alpha: 0.22 });

/** A stone plinth under statues and trophies. */
const plinth = (top = 50, color = '#b9b2a6'): Shape[] => [
  rect(12, top, 24, 62 - top, color, O),
  rect(24, top + 1, 11, 62 - top - 2, '#000000', { alpha: 0.12 }),
  rect(10, top - 3, 28, 4, color, O),
  rect(13, top - 2, 10, 1.2, '#ffffff', { alpha: 0.45 }),
];

const pole = (x: number, top: number, color = '#7a5230'): Shape[] => [rect(x - 1.3, top, 2.6, 62 - top, color, O), circle(x, top, 2.2, '#ffcf3a', O)];

export const DECORATIONS: Readonly<Record<string, DecorationArt>> = {
  // Statues
  stone_idol: {
    shapes: [
      shadow(26),
      roundRect(14, 20, 20, 42, 7, '#a59d8f', O),
      rect(24, 22, 9, 38, '#000000', { alpha: 0.12 }),
      rect(17, 30, 5, 3, INK),
      rect(26, 30, 5, 3, INK),
      rect(20, 40, 8, 2.4, INK),
      poly([14, 24, 24, 14, 34, 24], '#8f877a', O),
      line('M17 48h14M17 53h14', '#7d7568', 1.2),
      rect(16, 22, 2, 16, '#ffffff', { alpha: 0.35 }),
    ],
  },
  lion_statue: {
    shapes: [
      shadow(34),
      ...plinth(50, '#c9c1b3'),
      { d: 'M13 46c0-6 3-10 8-11l1-5c1-4 5-6 9-5 5 1 7 5 6 9-1 3-3 4-5 4l1 8h-3l-1-4-6 1-1 3z', fill: '#e2c27a', ...O },
      circle(31, 29, 7, '#d19a4a', O),
      circle(31, 30, 4.2, '#e9cc8a'),
      circle(32.6, 29, 0.8, INK),
      { d: 'M13 40c-3 0-4-3-2-5', stroke: INK, width: 1.4, fill: 'none' },
      rect(15, 38, 12, 2, '#ffffff', { alpha: 0.35 }),
    ],
  },
  knight_statue: {
    shapes: [
      shadow(30),
      ...plinth(52, '#b8b8c4'),
      roundRect(17, 26, 14, 24, 3, '#9aa3b4', O),
      { d: 'M18 26v-6c0-4 3-7 6-7s6 3 6 7v6z', fill: '#aeb6c6', ...O },
      rect(19.5, 19, 9, 1.8, INK),
      rect(30, 14, 2, 36, '#d9dde4', O),
      rect(27, 30, 8, 2, '#d99a12', O),
      { d: 'M13 30h8v10c0 3-2 5-4 6-2-1-4-3-4-6z', fill: 'team', ...O },
      rect(18, 28, 2, 18, '#ffffff', { alpha: 0.3 }),
    ],
  },
  owl_statue: {
    shapes: [
      shadow(28),
      ...plinth(50, '#d8cfae'),
      ellipse(24, 36, 10, 13, '#c9a45e', O),
      ellipse(24, 40, 6, 7.5, '#e6cf93'),
      circle(20, 31, 4, '#fff6d6', O),
      circle(28, 31, 4, '#fff6d6', O),
      circle(20, 31, 1.6, INK),
      circle(28, 31, 1.6, INK),
      poly([22.6, 34, 25.4, 34, 24, 37], '#e08a2b', O),
      poly([15, 24, 18, 27, 15, 29], '#b88b43', O),
      poly([33, 24, 30, 27, 33, 29], '#b88b43', O),
      rect(17, 42, 2, 5, '#ffffff', { alpha: 0.3 }),
    ],
    glow: { x: 24, y: 31, r: 9, color: 0xfff0b0 },
  },
  astro_statue: {
    shapes: [
      shadow(30),
      ...plinth(52, '#c8c4dc'),
      roundRect(16, 30, 16, 20, 5, '#eef0f6', O),
      circle(24, 23, 8.5, '#eef0f6', O),
      roundRect(18.5, 19, 11, 8, 4, '#3a2d6b', O),
      rect(20, 20, 4, 2, '#b8f2ff', { alpha: 0.9 }),
      rect(21, 35, 6, 5, 'team', O),
      rect(30, 34, 5, 2.4, '#eef0f6', O),
      star(37, 30, 3.4, '#ffcf3a', O),
      rect(18, 32, 2, 14, '#ffffff', { alpha: 0.5 }),
    ],
    glow: { x: 37, y: 30, r: 7, color: 0xfff3b0 },
  },
  // Banners
  hide_banner: {
    shapes: [shadow(14), ...pole(16, 10, '#8a5a32'), { d: 'M17 13h17l-3 8 3 8H17z', fill: '#d9b68a', ...O }, circle(24, 21, 3.4, 'team', O), line('M20 15l2 2M28 25l2 2', '#8a6a45', 1)],
    sway: true,
  },
  royal_standard: {
    shapes: [
      shadow(14),
      ...pole(24, 6, '#6b4a2a'),
      rect(14, 10, 20, 2.6, '#d99a12', O),
      { d: 'M15 12.6h18V34l-9 5-9-5z', fill: 'team', ...O },
      { d: 'M18 16h12v10l-6 4-6-4z', fill: '#ffcf3a', ...O },
      star(24, 21, 3, 'team'),
      rect(16, 13, 2, 18, '#ffffff', { alpha: 0.28 }),
    ],
    sway: true,
  },
  regiment_colors: {
    shapes: [
      shadow(14),
      ...pole(14, 6, '#5a3d24'),
      { d: 'M15 9h22c-2 5-2 9 0 14H15z', fill: 'team', ...O },
      rect(15, 14, 21.4, 3, '#ffffff'),
      circle(26, 15.5, 3, '#ffcf3a', O),
      line('M15 23c3 2 5 5 5 9', '#ffcf3a', 1.2),
      circle(20, 33, 1.6, '#ffcf3a', O),
    ],
    sway: true,
  },
  neon_banner: {
    shapes: [
      shadow(18),
      rect(22.6, 8, 2.8, 54, '#3b3f4a', O),
      roundRect(12, 10, 24, 30, 3, '#1c1f2b', O),
      roundRect(14, 12, 20, 26, 2, 'none', { stroke: '#57f0ff', width: 1.6 }),
      poly([20, 18, 30, 24, 20, 30], 'team', { stroke: '#ff5fd2', width: 1.2 }),
      rect(16, 44, 16, 3, '#57f0ff', { alpha: 0.8 }),
    ],
    glow: { x: 24, y: 25, r: 16, color: 0x57f0ff },
  },
  // Braziers
  fire_bowl: {
    shapes: [
      shadow(24),
      poly([17, 62, 20, 44, 28, 44, 31, 62], '#7a6a5a', O),
      { d: 'M10 38h28c0 6-6 9-14 9s-14-3-14-9z', fill: '#8c7b68', ...O },
      rect(10, 36, 28, 3, '#a4927d', O),
      { d: 'M24 12c3 5 8 8 8 15 0 5-4 9-8 9s-8-4-8-9c0-4 2-6 4-8 0 3 1 4 2 5 0-4 1-8 2-12z', fill: '#ff8a2b', ...O },
      { d: 'M24 22c2 3 4 5 4 8 0 3-2 4-4 4s-4-1-4-4c0-2 1-3 2-4 0 2 1 2 1 3 0-2 .5-5 1-7z', fill: '#ffe066' },
    ],
    glow: { x: 24, y: 28, r: 16, color: 0xffa040 },
  },
  iron_brazier: {
    shapes: [
      shadow(22),
      line('M16 62l6-18M32 62l-6-18M24 62V44', '#3b3f4a', 2.4),
      { d: 'M12 34h24l-3 10H15z', fill: '#50555f', ...O },
      rect(11, 32, 26, 3, '#6b717c', O),
      line('M16 34v9M24 34v10M32 34v9', '#2c3038', 1),
      { d: 'M24 10c3 5 8 9 8 15 0 4-3 8-8 8s-8-4-8-8c0-3 2-6 4-7 0 2 1 4 2 4 0-4 1-8 2-12z', fill: '#ff7a1f', ...O },
      { d: 'M24 20c2 3 3.6 5 3.6 7.4S26 31 24 31s-3.6-1.4-3.6-3.6c0-2 1-3 2-3.8 0 1.4.6 2 1 2.4 0-2 .4-5 1-6z', fill: '#ffe066' },
    ],
    glow: { x: 24, y: 26, r: 15, color: 0xff9a3c },
  },
  gas_lamp: {
    shapes: [
      shadow(16),
      rect(22.5, 26, 3, 36, '#2f3a33', O),
      rect(18, 58, 12, 4, '#2f3a33', O),
      poly([16, 12, 32, 12, 30, 26, 18, 26], '#fff1b8', O),
      rect(16, 10, 16, 3, '#2f3a33', O),
      poly([18, 10, 24, 4, 30, 10], '#2f3a33', O),
      line('M24 12v14', '#2f3a33', 1.2),
      rect(18, 14, 3, 10, '#ffffff', { alpha: 0.5 }),
    ],
    glow: { x: 24, y: 19, r: 14, color: 0xffe08a },
  },
  plasma_brazier: {
    shapes: [
      shadow(22),
      poly([14, 62, 18, 42, 30, 42, 34, 62], '#3a3f55', O),
      roundRect(10, 36, 28, 7, 3, '#565e7d', O),
      rect(12, 38, 24, 1.6, '#57f0ff', { alpha: 0.9 }),
      ellipse(24, 24, 8, 11, '#7b5cff', { ...O, alpha: 0.95 }),
      ellipse(24, 26, 4.5, 6.5, '#c9f7ff'),
      ring(24, 25, 12, '#57f0ff', 1),
    ],
    glow: { x: 24, y: 25, r: 17, color: 0x8a7bff },
  },
  // Trophies
  mammoth_tusks: {
    shapes: [
      shadow(34),
      ...plinth(52, '#9c8b74'),
      { d: 'M14 49c-6-8-6-20 2-30 1 9 2 16 6 24z', fill: '#f4ecd6', ...O },
      { d: 'M34 49c6-8 6-20-2-30-1 9-2 16-6 24z', fill: '#f4ecd6', ...O },
      line('M12 40c1 2 3 4 5 5M36 40c-1 2-3 4-5 5', '#cfc3a2', 1),
      circle(24, 45, 3.4, 'team', O),
    ],
  },
  knight_helm: {
    shapes: [
      shadow(26),
      rect(22.6, 36, 2.8, 26, '#6b4a2a', O),
      { d: 'M14 36V22c0-6 4.5-10 10-10s10 4 10 10v14z', fill: '#b9c0cc', ...O },
      rect(16, 24, 16, 2.4, INK),
      line('M24 28v7M20 30v4M28 30v4', INK, 1.2),
      { d: 'M24 12c-1-5 2-8 7-8-2 2-2 5-1 8z', fill: 'team', ...O },
      rect(16, 20, 2.4, 14, '#ffffff', { alpha: 0.45 }),
    ],
  },
  golden_cup: {
    shapes: [
      shadow(28),
      ...plinth(52, '#5c4a7a'),
      { d: 'M14 16h20v8c0 7-4.5 11-10 11s-10-4-10-11z', fill: '#ffcf3a', ...O },
      { d: 'M14 19H9c0 5 2 8 6 9M34 19h5c0 5-2 8-6 9', stroke: INK, width: 1.6, fill: 'none' },
      rect(22, 35, 4, 8, '#e0a51e', O),
      rect(16, 43, 16, 4, '#ffcf3a', O),
      rect(17, 18, 3, 10, '#fff5c2', { alpha: 0.9 }),
      star(24, 25, 3, '#fff5c2'),
    ],
    glow: { x: 24, y: 24, r: 11, color: 0xffe07a },
  },
  star_trophy: {
    shapes: [
      shadow(28),
      ...plinth(52, '#2d2550'),
      rect(22.5, 34, 3, 16, '#c8c4dc', O),
      star(24, 22, 13, '#ffcf3a', { ...O, ri: 6 }),
      star(24, 22, 6, '#fff5c2', { ri: 3 }),
      ring(24, 22, 16, '#bda8ff', 1.2),
      circle(38, 10, 1.4, '#ffffff'),
      circle(10, 30, 1.1, '#ffffff'),
    ],
    glow: { x: 24, y: 22, r: 16, color: 0xfff0a0 },
  },
  shield_rack: {
    shapes: [
      shadow(34),
      line('M10 62V36M38 62V36', '#6b4a2a', 3),
      rect(8, 40, 32, 3, '#8a5a32', O),
      { d: 'M11 30h12v10c0 5-3 8-6 9-3-1-6-4-6-9z', fill: 'team', ...O },
      { d: 'M25 30h12v10c0 5-3 8-6 9-3-1-6-4-6-9z', fill: '#c9c1b3', ...O },
      band(17, 32, 17, 46, 2, '#ffcf3a'),
      circle(31, 38, 2.6, '#d99a12', O),
    ],
  },
  // Plants
  fern: {
    shapes: [
      shadow(30),
      ...[-50, -25, 0, 25, 50].map((deg, i) => {
        const a = ((deg - 90) * Math.PI) / 180;
        const len = i === 2 ? 30 : 24;
        return { d: `M24 60Q${24 + Math.cos(a) * len * 0.5 - 4} ${60 + Math.sin(a) * len * 0.5} ${24 + Math.cos(a) * len} ${60 + Math.sin(a) * len}`, stroke: i % 2 ? '#5fbf4a' : '#7fd65f', width: 5, fill: 'none' } as Shape;
      }),
      ...[-50, -25, 0, 25, 50].map((deg) => {
        const a = ((deg - 90) * Math.PI) / 180;
        return circle(24 + Math.cos(a) * 22, 60 + Math.sin(a) * 22, 2, '#a8ec8a');
      }),
    ],
    sway: true,
  },
  olive_tree: {
    shapes: [
      shadow(30),
      { d: 'M22 62c1-8 0-14-3-20l3-1c2 4 3 7 3 10 1-5 3-8 6-10l2 2c-4 4-5 10-5 19z', fill: '#8a6a45', ...O },
      ellipse(24, 28, 16, 11, '#8fb06a', O),
      ellipse(16, 32, 8, 6, '#a3c47c', O),
      ellipse(32, 31, 8, 6, '#7a9c58', O),
      ...[
        [18, 26],
        [27, 23],
        [31, 30],
        [21, 33],
      ].map(([x, y]) => ellipse(x!, y!, 1.6, 1.1, '#3b2d5a')),
    ],
    sway: true,
  },
  topiary: {
    shapes: [
      shadow(24),
      poly([16, 62, 18, 50, 30, 50, 32, 62], '#b86b43', O),
      rect(15, 48, 18, 3, '#c97c52', O),
      rect(22.8, 36, 2.4, 13, '#6b4a2a'),
      circle(24, 27, 11, '#5fae4c', O),
      circle(24, 12, 6.5, '#6cc257', O),
      circle(20, 23, 3, '#8fe07a', { alpha: 0.8 }),
      circle(22, 10, 1.8, '#8fe07a', { alpha: 0.8 }),
    ],
  },
  potted_cactus: {
    shapes: [
      shadow(22),
      poly([15, 62, 17, 48, 31, 48, 33, 62], '#d9824b', O),
      rect(14, 46, 20, 3, '#e8955c', O),
      roundRect(19, 18, 10, 30, 5, '#5cb85c', O),
      { d: 'M19 34h-4c-2 0-3-1-3-3v-6c0-1.4 1-2 2-2s2 .6 2 2v5h3z', fill: '#5cb85c', ...O },
      { d: 'M29 30h4c2 0 3-1 3-3v-5c0-1.4-1-2-2-2s-2 .6-2 2v4h-3z', fill: '#5cb85c', ...O },
      line('M24 21v25', '#3f8f3f', 1),
      circle(24, 17, 2.6, '#ff6fa8', O),
    ],
  },
  bonsai: {
    shapes: [
      shadow(28),
      roundRect(12, 52, 24, 8, 2, '#3b5f8f', O),
      rect(10, 50, 28, 3, '#4d74a8', O),
      { d: 'M24 50c-1-5-4-7-8-9l1-2c3 1 5 3 7 5 0-4 2-8 6-10l1 2c-3 2-4 6-4 10 0 1 0 3 .5 4z', fill: '#7a5230', ...O },
      ellipse(14, 36, 8, 4.6, '#6aa84f', O),
      ellipse(30, 28, 9, 5, '#6aa84f', O),
      ellipse(22, 22, 7, 4, '#86c46a', O),
    ],
  },
  crystal_flower: {
    shapes: [
      shadow(22),
      roundRect(15, 52, 18, 9, 3, '#3a2d6b', O),
      line('M24 52V30', '#5fae4c', 2),
      poly([24, 8, 30, 20, 24, 32, 18, 20], '#b8a8ff', O),
      poly([24, 8, 30, 20, 24, 20], '#e6dcff'),
      poly([14, 22, 20, 26, 16, 33, 11, 28], '#8fe8ff', O),
      poly([34, 22, 37, 28, 32, 33, 28, 26], '#ff9ad8', O),
    ],
    glow: { x: 24, y: 20, r: 12, color: 0xc0a8ff },
  },
};
