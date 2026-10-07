/**
 * The collected emotes (DESIGN A18.9.4): 24 small animated reactions, two per age and eight general
 * ones, drawn in the same 24 x 24 style as the six starter emote faces (ink outline, warm yellow faces,
 * one bright accent). Each emote is a stack of layers; a layer may loop one motion (bounce, wobble,
 * spin, pulse, float, shake, pop), written as SVG SMIL so the image animates wherever it is shown
 * (the emote wheel, the battle bubble, Customize and the Collection) without any script.
 */
import { band, circle, ellipse, INK, line, poly, rect, ring, rotRect, roundRect, star, type Shape } from './shapes';

export type EmoteMotion = 'bounce' | 'wobble' | 'spin' | 'pulse' | 'float' | 'shake' | 'pop' | 'tilt';

export interface EmoteLayer {
  shapes: Shape[];
  motion?: EmoteMotion;
  /** Pivot of the motion (view-box units); default the centre. */
  at?: [number, number];
  /** Start offset in seconds, so layers do not move in lockstep. */
  delay?: number;
}

export interface EmoteArt {
  layers: EmoteLayer[];
}

const FACE = '#ffd447';
const O = { stroke: INK, width: 1.4 };

/**
 * A cartoon face in the art sheet's style (AUDIT #15): the fill, a cel shadow band on the lower edge, a
 * highlight near the top and the outline last, so the features sit on a lit, rounded head.
 */
const face = (fill = FACE): Shape[] => [
  circle(12, 12.5, 9.3, fill),
  { d: 'M2.75 12.9A9.3 9.3 0 0 0 21.25 12.9A9.3 7.2 0 0 1 2.75 12.9Z', fill: '#b5650f', alpha: 0.26 },
  ellipse(8.6, 7.6, 2.6, 1.4, '#ffffff', { alpha: 0.55 }),
  circle(12, 12.5, 9.3, 'none', { stroke: INK, width: 1.6 }),
];
const eyes = (y = 11, dx = 3): Shape[] => [circle(12 - dx, y, 1.15, INK), circle(12 + dx, y, 1.15, INK)];
const smile = (y = 14.6): Shape => ({ d: `M8.6 ${y}c1.8 2.4 5 2.4 6.8 0`, stroke: INK, width: 1.5, fill: 'none' });
const note = (x: number, y: number, fill = '#6c5cff'): Shape[] => [circle(x, y, 1.6, fill, { stroke: INK, width: 0.9 }), rect(x + 1.1, y - 5, 1, 5, INK)];
/** A heart around (cx, cy), scaled by s (1 = 17 units wide). */
const heartPath = (cx: number, cy: number, s: number, fill: string): Shape => {
  const P = (x: number, y: number) => `${(cx + x * s).toFixed(2)} ${(cy + y * s).toFixed(2)}`;
  return {
    d: `M${P(0, 8)}C${P(-6, 4.4)} ${P(-8.6, 1)} ${P(-8.6, -2)}C${P(-8.6, -4.4)} ${P(-6.8, -6.2)} ${P(-4.4, -6.2)}C${P(-2.6, -6.2)} ${P(-1.2, -5.2)} ${P(0, -3.6)}C${P(1.2, -5.2)} ${P(2.6, -6.2)} ${P(4.4, -6.2)}C${P(6.8, -6.2)} ${P(8.6, -4.4)} ${P(8.6, -2)}C${P(8.6, 1)} ${P(6, 4.4)} ${P(0, 8)}z`,
    fill,
    stroke: INK,
    width: 1.4,
  };
};
const zee = (x: number, y: number, k: number): Shape => ({ d: `M${x} ${y}h${3 * k}l${-3 * k} ${3 * k}h${3 * k}`, stroke: '#6c5cff', width: 1.2, fill: 'none' });

export const EMOTES: Readonly<Record<string, EmoteArt>> = {
  // Stone
  bonk: {
    layers: [
      { shapes: [...face(), { d: 'M7.6 10.2l2.4 1.6M7.6 11.8l2.4-1.6M14 10.2l2.4 1.6M14 11.8l2.4-1.6', stroke: INK, width: 1.2, fill: 'none' }, ellipse(12, 16, 2, 1.6, '#8a2338', O)] },
      { shapes: [rotRect(17, 5, 3, 10, 35, '#b07a45', O), ellipse(19.6, 1.8, 3, 2.4, '#8f5f33', O)], motion: 'wobble', at: [14, 9] },
      { shapes: [star(4, 5, 2.2, '#ffcf3a', O), star(20, 13, 1.6, '#ffcf3a', O)], motion: 'spin', at: [12, 9], delay: 0.2 },
    ],
  },
  mammoth_toot: {
    layers: [
      {
        shapes: [
          ellipse(5.6, 12, 4, 5, '#9a8a7a', O),
          circle(12, 12, 7.5, '#b3a391', O),
          circle(9.4, 10.4, 1, INK),
          circle(14.6, 10.4, 1, INK),
          { d: 'M10.4 14.8c-.6 3 .2 5.4 2.4 6.6 1.6.8 3-.4 2.6-2.2', stroke: INK, width: 1.4, fill: '#b3a391' },
          { d: 'M8 16c-1.6 1-2.2 2.6-2 4.4M16 16c1.6 1 2.2 2.6 2 4.4', stroke: '#f4ecd6', width: 1.6, fill: 'none' },
        ],
        motion: 'bounce',
      },
      { shapes: [...note(19, 6), ...note(22, 3.4, '#ff6fa8')], motion: 'float', delay: 0.3 },
    ],
  },
  // Bronze
  laurel_crown: {
    layers: [
      { shapes: [...face(), ...eyes(), smile()] },
      {
        shapes: [
          ...[0, 1, 2, 3].map((i) => rotRect(4.8 + i * 1.6, 7.6 - i * 1.4, 2, 3.8, -60 + i * 16, '#7fd65f', { stroke: INK, width: 0.8 })),
          ...[0, 1, 2, 3].map((i) => rotRect(19.2 - i * 1.6, 7.6 - i * 1.4, 2, 3.8, 60 - i * 16, '#7fd65f', { stroke: INK, width: 0.8 })),
        ],
        motion: 'pulse',
        at: [12, 5],
      },
      { shapes: [star(12, 2.6, 1.6, '#ffcf3a', O)], motion: 'pop', at: [12, 2.6], delay: 0.4 },
    ],
  },
  amphora_cheers: {
    layers: [
      {
        shapes: [
          { d: 'M9 3h6v2c0 1 3 2 3 7 0 5-2 9-6 10-4-1-6-5-6-10 0-5 3-6 3-7z', fill: '#d9824b', ...O },
          { d: 'M7 10c-2.6-.4-3.4 2-2 3.6M17 10c2.6-.4 3.4 2 2 3.6', stroke: INK, width: 1.4, fill: 'none' },
          rect(7.6, 11, 8.8, 2, INK, { alpha: 0.85 }),
          rotRect(12, 12, 3, 1.2, 0, '#ffcf3a'),
          rect(9, 6, 1.6, 9, '#ffffff', { alpha: 0.35 }),
        ],
        motion: 'tilt',
        at: [12, 20],
      },
      { shapes: [ellipse(19, 4, 1, 1.5, '#b14bff', O), ellipse(21.5, 7, 0.9, 1.3, '#b14bff', O)], motion: 'float' },
    ],
  },
  // Medieval
  royal_bow: {
    layers: [
      {
        shapes: [...face(), ...eyes(11.6), smile(15), { d: 'M6.6 6.6l2 -3.4 2.2 2.6L12 2.4l1.2 3.4 2.2-2.6 2 3.4z', fill: '#ffcf3a', ...O }, circle(12, 4.4, 0.8, '#ff5f7a')],
        motion: 'tilt',
        at: [12, 21],
      },
    ],
  },
  lute_strum: {
    layers: [
      {
        shapes: [
          ellipse(9, 15, 6, 6.6, '#c98a4b', O),
          circle(9, 14.6, 1.8, INK),
          rotRect(15.6, 7.4, 2.6, 11, 45, '#8f5f33', O),
          rotRect(20, 3, 3.4, 3, 45, '#6b4a2a', O),
          line('M6 18l12-12', '#fff2c8', 0.5),
        ],
        motion: 'wobble',
        at: [9, 15],
      },
      { shapes: [...note(19, 13), ...note(4, 6, '#ff6fa8')], motion: 'float', delay: 0.5 },
    ],
  },
  // Gunpowder
  hat_tip: {
    layers: [
      { shapes: [...face(), ...eyes(12.4), smile(15.6)] },
      { shapes: [{ d: 'M3 8.4c3-.4 5-2.6 9-2.6s6 2.2 9 2.6c-2.4 1.6-5.6 2-9 2s-6.6-.4-9-2z', fill: '#2b2438', ...O }, rect(8, 7.4, 8, 1.2, '#ffcf3a')], motion: 'bounce', delay: 0.1 },
    ],
  },
  cannon_confetti: {
    layers: [
      { shapes: [rotRect(10, 15, 13, 6, -30, '#50555f', O), circle(6.6, 20, 3, '#8a5a32', O), circle(6.6, 20, 1, INK), ellipse(14.6, 12, 1.4, 3, INK, { alpha: 0.8 })] },
      {
        shapes: [rect(15, 4, 2, 2, '#ff6fa8'), rect(19, 7, 2, 2, '#57f0ff'), rect(21, 2, 2, 2, '#ffcf3a'), rect(17, 1, 1.6, 1.6, '#7fd65f'), rect(22, 10, 1.6, 1.6, '#b14bff')],
        motion: 'pop',
        at: [16, 9],
      },
    ],
  },
  // Industrial
  steam_whistle: {
    layers: [
      { shapes: [roundRect(8, 10, 8, 11, 2, '#d9a441', O), rect(10.6, 6, 2.8, 4.4, '#b07a2a', O), rect(6.6, 19.4, 10.8, 2.6, '#8a5a32', O), rect(9.4, 12, 1.4, 7, '#fff2c8', { alpha: 0.7 })] },
      { shapes: [circle(12, 4, 2.2, '#ffffff', O), circle(16, 2.6, 1.6, '#ffffff', O), circle(8.4, 2.4, 1.4, '#ffffff', O)], motion: 'float' },
    ],
  },
  gear_heart: {
    layers: [
      { shapes: [star(12, 12.5, 10.6, '#b8c0cc', { n: 9, ri: 8.6, ...O }), circle(12, 12.5, 7.6, '#d9dde4')], motion: 'spin', at: [12, 12.5] },
      { shapes: [heartPath(12, 12.5, 0.55, '#ff5f7a')], motion: 'pulse', at: [12, 12.5] },
    ],
  },
  // Modern
  radio_roger: {
    layers: [
      { shapes: [roundRect(8, 7, 8, 15, 2, '#4f6b3a', O), rect(13, 2, 1.6, 5, INK), rect(9.6, 9, 4.8, 4, '#b8f28a', O), circle(10.4, 16, 0.8, INK), circle(13.6, 16, 0.8, INK), circle(10.4, 18.6, 0.8, INK), circle(13.6, 18.6, 0.8, INK)] },
      { shapes: [{ d: 'M17 4a5 5 0 0 1 0 6M19.4 2a8 8 0 0 1 0 10', stroke: '#57f0ff', width: 1.4, fill: 'none' }], motion: 'pulse', at: [16, 7] },
    ],
  },
  medal_shine: {
    layers: [
      { shapes: [poly([7, 1, 11, 1, 13, 9, 10, 10], '#3a6ee8', O), poly([17, 1, 13, 1, 11, 9, 14, 10], '#ff5f7a', O), circle(12, 15, 6.6, '#ffcf3a', O), star(12, 15, 3.6, '#fff5c2', { ...O, width: 0.8 })], motion: 'tilt', at: [12, 1] },
      { shapes: [star(18, 11, 2, '#ffffff', { n: 4, ri: 0.5 })], motion: 'pop', at: [18, 11], delay: 0.3 },
    ],
  },
  // Future
  robo_dance: {
    layers: [
      {
        shapes: [roundRect(5, 5, 14, 13, 3, '#b8c0cc', O), roundRect(7, 8, 10, 5, 2, '#1c1f2b', O), rect(8.4, 9.6, 2.6, 1.8, '#57f0ff'), rect(13, 9.6, 2.6, 1.8, '#57f0ff'), rect(9, 15, 6, 1.4, INK), rect(11.3, 1.6, 1.4, 3.4, INK), circle(12, 1.6, 1.2, '#ff5f7a', O)],
        motion: 'bounce',
      },
      { shapes: [rect(1.4, 10, 3.6, 2, '#8a93a5', O), rect(19, 10, 3.6, 2, '#8a93a5', O), roundRect(8, 18, 8, 5, 1.4, '#8a93a5', O)], motion: 'shake', delay: 0.2 },
    ],
  },
  holo_wave: {
    layers: [
      {
        shapes: [
          { d: 'M8 22v-9l-2.4-3.2c-.8-1.2.8-2.6 1.8-1.6L9 10V4.6c0-1.4 2.2-1.4 2.2 0V10V3.4c0-1.4 2.2-1.4 2.2 0V10V4.4c0-1.4 2.2-1.4 2.2 0V11V6.6c0-1.4 2.2-1.4 2.2 0V15c0 4-2.4 7-6 7z', fill: '#57f0ff', stroke: '#1b8fb5', width: 1.3, alpha: 0.9 },
          line('M8 16h9M8 19h9', '#ffffff', 0.6, { alpha: 0.7 }),
        ],
        motion: 'wobble',
        at: [12, 22],
      },
      { shapes: [ellipse(12, 22.6, 7, 1.2, '#57f0ff', { alpha: 0.5 })], motion: 'pulse', at: [12, 22.6] },
    ],
  },
  // Cosmic
  supernova: {
    layers: [
      { shapes: [circle(12, 12, 10.5, '#ff7ad9', { alpha: 0.35 }), star(12, 12, 11.4, '#c86bff', { n: 8, ri: 7.4, stroke: INK, width: 1 })], motion: 'spin', at: [12, 12] },
      { shapes: [star(12, 12, 7.2, '#ffe066', { n: 8, ri: 4.6, stroke: INK, width: 1 }), circle(12, 12, 2.8, '#ffffff'), circle(11, 11, 1, '#fff6c8')], motion: 'pulse', at: [12, 12] },
    ],
  },
  orbit_heart: {
    layers: [
      { shapes: [heartPath(12, 12, 0.62, '#ff5f7a'), ellipse(10, 9, 1.6, 1, '#ffffff', { alpha: 0.7 })], motion: 'pulse', at: [12, 12] },
      { shapes: [ring(12, 12, 10, '#bda8ff', 0.8), circle(22, 12, 2, '#57f0ff', O)], motion: 'spin', at: [12, 12] },
    ],
  },
  // General
  clap: {
    layers: [
      { shapes: [roundRect(3, 8, 8, 13, 3, FACE, O), rect(5, 6, 1.6, 4, FACE, O), rect(7.4, 5, 1.6, 5, FACE, O)], motion: 'shake', at: [7, 14] },
      { shapes: [roundRect(13, 8, 8, 13, 3, FACE, O), rect(15, 5, 1.6, 5, FACE, O), rect(17.4, 6, 1.6, 4, FACE, O)], motion: 'shake', at: [17, 14], delay: 0.15 },
      { shapes: [line('M12 2v3M8.6 3l1 2M15.4 3l-1 2', '#ff8a2b', 1.2)], motion: 'pop', at: [12, 4] },
    ],
  },
  heart: {
    layers: [{ shapes: [heartPath(12, 12, 1.05, '#ff4d6d'), ellipse(8, 7.4, 2, 1.2, '#ffffff', { alpha: 0.7 })], motion: 'pulse', at: [12, 12] }],
  },
  wow: {
    layers: [
      { shapes: [...face(), circle(8.8, 10, 2, '#ffffff', O), circle(15.2, 10, 2, '#ffffff', O), circle(8.8, 10, 0.9, INK), circle(15.2, 10, 0.9, INK), ellipse(12, 16.4, 2.2, 2.8, '#8a2338', O)], motion: 'pop', at: [12, 12.5] },
      { shapes: [line('M2 4l2 2M22 4l-2 2M12 0.6v2', '#ff8a2b', 1.2)], motion: 'pulse', at: [12, 4] },
    ],
  },
  thinking: {
    layers: [
      { shapes: [...face(), ...eyes(10.6), { d: 'M9 15.4h5', stroke: INK, width: 1.5, fill: 'none' }, { d: 'M6.6 10.4c1-1 2.4-1.2 3.4-.8', stroke: INK, width: 1.1, fill: 'none' }, roundRect(10, 16.6, 6, 5, 2, FACE, O)] },
      { shapes: [circle(19, 5, 1.2, '#ffffff', O), circle(21.4, 2.6, 1.6, '#ffffff', O)], motion: 'float' },
    ],
  },
  sleepy: {
    layers: [
      { shapes: [...face('#ffe08a'), { d: 'M7 11.4c1 1 2.4 1 3.4 0M13.6 11.4c1 1 2.4 1 3.4 0', stroke: INK, width: 1.3, fill: 'none' }, ellipse(12, 16, 1.6, 1.2, '#8a2338', O)], motion: 'tilt', at: [12, 21] },
      { shapes: [zee(16, 2, 1.2), zee(20.4, 0.4, 0.8)], motion: 'float' },
    ],
  },
  party: {
    layers: [
      { shapes: [...face(), ...eyes(12.6), smile(15.8)], motion: 'bounce' },
      { shapes: [poly([7, 7, 12, -2, 15, 5.6], '#ff6fa8', O), circle(12, -1.4, 1.4, '#ffcf3a', O), line('M9 4.4l4 1.6', '#ffffff', 0.9)], motion: 'wobble', at: [11, 6] },
      { shapes: [rect(2, 3, 1.8, 1.8, '#57f0ff'), rect(20, 4, 1.8, 1.8, '#7fd65f'), rect(21, 12, 1.6, 1.6, '#ffcf3a'), rect(1.6, 14, 1.6, 1.6, '#b14bff')], motion: 'float', delay: 0.4 },
    ],
  },
  cool_shades: {
    layers: [
      { shapes: [...face(), roundRect(5.6, 8.8, 5.8, 3.8, 1.4, INK), roundRect(12.6, 8.8, 5.8, 3.8, 1.4, INK), rect(10.6, 9.4, 3, 1, INK), { d: 'M9 15.6c2 1.4 4.6 1.2 6.4-.6', stroke: INK, width: 1.5, fill: 'none' }] },
      { shapes: [band(6.6, 12, 9.6, 9, 1, '#ffffff', { alpha: 0.85 }), band(13.6, 12, 16.6, 9, 1, '#ffffff', { alpha: 0.85 })], motion: 'pulse', at: [12, 10.6] },
    ],
  },
  oops: {
    layers: [
      { shapes: [...face('#ffe08a'), ...eyes(11), { d: 'M8.4 16.4c1.2-1 2.2-1 3.6 0s2.4 1 3.6 0', stroke: INK, width: 1.4, fill: 'none' }], motion: 'shake' },
      { shapes: [{ d: 'M19 3c1.4 2 2.2 3.4 2.2 4.6a2.2 2.2 0 0 1-4.4 0c0-1.2.8-2.6 2.2-4.6z', fill: '#57b8ff', stroke: INK, width: 1.1 }], motion: 'float' },
    ],
  },
};
