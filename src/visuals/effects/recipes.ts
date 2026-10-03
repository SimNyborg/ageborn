/**
 * Effect recipes for every effect id in DESIGN A14.1 (hit, death, status, ability, power and match
 * effects). Pure data: `adapters/procedural/effectView.ts` plays them with baked sprites.
 *
 * Options passed to `ArtProvider.createEffect(id, o)` / `EffectView.playAt(at, o)` (all numbers):
 *   side (0/1, team tint), dir (+1/-1, facing), radius, zone, width, height, length, toX, toY,
 *   durationMs, distance, speed, scale, fallMs; `scale` also sizes the whole effect, and `small: 1`
 *   draws it at 0.6x (A12: the enemy's evolve pillar is smaller than your own).
 * `sizeWith` scales a sprite or particle by one of them relative to a 10 lu base sprite.
 *
 * Colour rule (A11): lane effects use pale warm tones and mint, magenta or lilac energy; saturated
 * orange appears only as a small accent. The overdrive frame, siege vignette, coins and XP sparkles
 * are screen or UI cues and exempt (`exemptColorRule`, docs/decisions.md WP4).
 */

import { fortFxRecipes } from './fortRecipes';
import { mvpFxRecipes } from './mvpRecipes';
import { powerFxRecipes } from './powerRecipes';

export type Range = readonly [number, number];
export type SizeKey = 'radius' | 'zone' | 'width' | 'height' | 'length' | 'scale';

export interface ParticleSpec {
  sprite: string;
  /** Burst count at start (after `delay`). */
  count?: number;
  /** Emission rate per second while the effect runs (streams and loops). */
  rate?: number;
  life: Range;
  speed?: Range;
  /** Degrees; 0 = +x (mirrored by `dir`), -90 = up. */
  angle?: Range;
  /** Spawn jitter radius (lu). */
  spread?: number;
  /** Spawn box half-extents (x, y); x scales with `sizeWith` when set. */
  box?: readonly [number, number];
  gravity?: number;
  drag?: number;
  scale?: Range;
  alpha?: Range;
  spin?: Range;
  delay?: Range;
  tint?: number | 'team';
  align?: boolean;
  sizeWith?: SizeKey;
  /** Particles drift toward the centre (gravity well, nanites). */
  attract?: number;
  /** Stream particles spawn at the first moving sprite (dust behind the aurochs). */
  followMove?: boolean;
  /** Burst when the effect's duration ends (a charge's dust as it stops) instead of at the start. */
  atEnd?: boolean;
  blendAdd?: boolean;
}

export interface SpriteKey {
  t: number;
  sx?: number;
  sy?: number;
  a?: number;
  r?: number;
  x?: number;
  y?: number;
}

export interface SpriteSpec {
  sprite: string;
  /** Life in ms; 0 = the effect's duration. */
  life: number;
  delay?: number;
  keys: readonly SpriteKey[];
  tint?: number | 'team';
  sizeWith?: SizeKey;
  /** Repeat the keys every `loop` ms while the effect runs. */
  loop?: number;
  /** Fit a 100 x 100 sprite to o.width x o.height (screen overlays). */
  screenFit?: boolean;
  /** Stretch a 10 lu long sprite from `at` to (toX, toY) (beams). */
  toTarget?: boolean;
  /** Move across o.zone (sweeps) or o.distance (runs) along `dir` over the life. */
  moveBy?: 'zone' | 'distance';
  blendAdd?: boolean;
  /** Per-play random variation: offset (lu), scale factor range and rotation (deg). */
  jitter?: { x?: number; y?: number; s?: Range; r?: number };
}

export interface FallSpec {
  sprite: string;
  count: number;
  /** Start offset relative to the landing point. */
  fromX: number;
  fromY: number;
  spreadX: number;
  fallMs: number;
  /** Sub-effect played where each object lands. */
  impact?: string;
  /** Draw size of the falling object (default 1). */
  scale?: number;
}

export interface ChainSpec {
  segments: number;
  jitter: number;
  tint: number;
  width: number;
  refreshMs: number;
}

export interface FxRecipe {
  id: string;
  durationMs: number;
  sprites?: readonly SpriteSpec[];
  particles?: readonly ParticleSpec[];
  fall?: FallSpec;
  chain?: ChainSpec;
  /** Honours o.durationMs (status loops, sweeps and fields the sim times). */
  loops?: boolean;
  /**
   * `run`: the duration is the charge's run, o.distance / o.speed (lu, lu/s), so a runner arrives when
   * the sim's does (the sim owns the timing, B5).
   */
  timedBy?: 'run';
  /** Drawn in screen space, sized by o.width x o.height. */
  screen?: boolean;
  exemptColorRule?: boolean;
  /**
   * Multi-count emits (`n` instances) draw only the first `maxInstances` (the rest finish at once):
   * a burst of 120 debris effects stays a readable handful of chunks, not pepper noise.
   */
  maxInstances?: number;
}

// ---------------------------------------------------------------------------------------------
// Building blocks

const flash = (scale: number, tint = 0xfff1d2, life = 120): SpriteSpec => ({
  sprite: 'fx.p.disc',
  life,
  keys: [
    { t: 0, sx: 0.25 * scale, sy: 0.25 * scale, a: 0.95 },
    { t: 1, sx: 0.8 * scale, sy: 0.8 * scale, a: 0 },
  ],
  tint,
});

const ring = (scale: number, life: number, tint = 0xffffff, flat = 0.4): SpriteSpec => ({
  sprite: 'fx.p.ring',
  life,
  keys: [
    { t: 0, sx: 0.2 * scale, sy: 0.2 * scale * flat, a: 0.9 },
    { t: 1, sx: scale, sy: scale * flat, a: 0 },
  ],
  tint,
});

const smoke = (count: number, scale: number, life: Range = [500, 900]): ParticleSpec => ({
  sprite: 'fx.p.smoke',
  count,
  life,
  speed: [20 * scale, 70 * scale],
  angle: [-170, -10],
  spread: 5 * scale,
  gravity: -30,
  drag: 1.5,
  scale: [0.5 * scale, 1.3 * scale],
  alpha: [0.85, 0],
  spin: [-60, 60],
});

const sparks = (count: number, speed: Range, sprite = 'fx.p.spark', angle: Range = [-180, 0]): ParticleSpec => ({
  sprite,
  count,
  life: [140, 260],
  speed,
  angle,
  spread: 2,
  gravity: 200,
  drag: 2,
  scale: [1, 0.4],
  alpha: [1, 0],
  align: true,
});

const dust = (count: number, scale = 1): ParticleSpec => ({
  sprite: 'fx.p.dust',
  count,
  life: [300, 520],
  speed: [30, 90],
  angle: [-170, -10],
  spread: 4,
  gravity: -10,
  drag: 2,
  scale: [0.45 * scale, 1.1 * scale],
  alpha: [0.85, 0],
  spin: [-40, 40],
});

const chunks = (count: number, sprite = 'fx.p.chunk'): ParticleSpec => ({
  sprite,
  count,
  life: [500, 800],
  speed: [80, 200],
  angle: [-150, -30],
  spread: 4,
  gravity: 700,
  scale: [1, 0.9],
  alpha: [1, 0.3],
  spin: [-400, 400],
});

/** A soft additive glow that swells and fades (fireball cores, impact blooms). */
const bloom = (scale: number, life: number, tint = 0xffe6bc, a = 0.8, delay = 0): SpriteSpec => ({
  sprite: 'fx.p.glow',
  life,
  delay,
  blendAdd: true,
  keys: [
    { t: 0, sx: 0.3 * scale, sy: 0.3 * scale, a },
    { t: 0.25, sx: scale, sy: scale, a: a * 0.9 },
    { t: 1, sx: 1.25 * scale, sy: 1.25 * scale, a: 0 },
  ],
  tint,
});

/** A scorch mark left on the ground, flattened for the lane's perspective. */
const scorch = (scale: number, life: number): SpriteSpec => ({
  sprite: 'fx.p.scorch',
  life,
  keys: [
    { t: 0, sx: 0.4 * scale, sy: 0.16 * scale, a: 0.75, y: 4 },
    { t: 0.1, sx: scale, sy: 0.38 * scale, a: 0.7, y: 4 },
    { t: 1, sx: 1.1 * scale, sy: 0.4 * scale, a: 0, y: 4 },
  ],
});

/**
 * Explosions (A12, art review): a white-hot flash sprite for two frames at 1.3x, then a fireball
 * built from six overlapping cel-shaded lobes of random size (white-hot core, pale warm body, a
 * darker warm-brown rim, so saturation stays within the A11 colour rule) that squash in (0.6 ->
 * 1.15 -> 1.0 over 120 ms), rise a little and cool into smoke lobes that fade out one by one. Two
 * shock rings, a scorch, a lingering smoke column, sparks, embers and rounded brown and grey chunks
 * that spin and fall on an arc.
 */
function lobe(s: number, i: number, n: number): SpriteSpec[] {
  const a = (i / n) * Math.PI * 2 + 0.6;
  const d = (i === 0 ? 0 : 9.5) * s;
  const x = Math.cos(a) * d;
  const y = Math.sin(a) * d * 0.75 - 6 * s;
  const k = (i === 0 ? 1.25 : 0.8 + ((i * 37) % 5) * 0.09) * s;
  const out = 150 + i * 55;
  const life = 250 + out;
  return [
    {
      sprite: 'fx.p.fireLobe',
      life,
      delay: i * 12,
      jitter: { x: 2.5 * s, y: 2 * s, s: [0.85, 1.2], r: 40 },
      keys: [
        { t: 0, x, y, sx: 0.6 * k, sy: 0.6 * k, a: 1 },
        { t: 60 / life, x, y, sx: 1.15 * k, sy: 1.1 * k, a: 1 },
        { t: 120 / life, x, y: y - 1 * s, sx: 1.0 * k, sy: 1.0 * k, a: 1 },
        { t: 0.75, x, y: y - 6 * s, sx: 1.1 * k, sy: 1.08 * k, a: 1 },
        { t: 1, x, y: y - 9 * s, sx: 1.15 * k, sy: 1.1 * k, a: 0 },
      ],
    },
    {
      sprite: 'fx.p.smokeLobe',
      life: 520 + i * 60,
      delay: life - 120 + i * 12,
      jitter: { x: 2 * s, y: 2 * s, s: [0.9, 1.15], r: 60 },
      keys: [
        { t: 0, x, y: y - 8 * s, sx: 1.0 * k, sy: 1.0 * k, a: 0.85 },
        { t: 1, x: x * 1.2, y: y - 26 * s, sx: 1.35 * k, sy: 1.3 * k, a: 0 },
      ],
    },
  ];
}

function explosion(id: string, s: number): FxRecipe {
  const lobes = 6;
  const sprites: SpriteSpec[] = [scorch(2.2 * s, 1000 * Math.min(1.4, s)), bloom(2.2 * s, 360, 0xffe6c4, 0.55)];
  for (let i = lobes - 1; i >= 0; i--) sprites.push(...lobe(s, i, lobes));
  sprites.push(
    // the two-frame white flash at 1.3x the fireball
    { sprite: 'fx.p.flash', life: 34, keys: [{ t: 0, sx: 2.6 * s, sy: 2.6 * s, a: 1 }, { t: 1, sx: 2.8 * s, sy: 2.8 * s, a: 1 }], tint: 0xfffaf0 },
    { sprite: 'fx.p.disc', life: 34, blendAdd: true, keys: [{ t: 0, sx: 1.7 * s, sy: 1.7 * s, a: 0.9 }, { t: 1, sx: 1.9 * s, sy: 1.9 * s, a: 0.7 }], tint: 0xffffff },
    ring(3 * s, 320, 0xfff6e2),
    { ...ring(4.2 * s, 460, 0xf4ecd8, 0.3), delay: 60 },
  );
  return {
    id,
    durationMs: 1300 * Math.min(1.4, s),
    sprites,
    particles: [
      { ...smoke(Math.round(4 * s), s * 1.2, [900, 1500]), speed: [10 * s, 40 * s], angle: [-110, -70], gravity: -45, tint: 0xa8a39c, delay: [200, 380] },
      sparks(Math.round(5 * s), [120 * s, 280 * s], 'fx.p.spark'),
      sparks(Math.max(1, Math.round(2 * s)), [120 * s, 240 * s], 'fx.p.sparkHot'),
      { sprite: 'fx.p.rock', count: Math.round(3 * s), life: [600, 900], delay: [60, 110], speed: [150 * s, 260 * s], angle: [-150, -30], spread: 14 * s, gravity: 760, scale: [1.2, 1.1], alpha: [1, 0.4], spin: [-500, 500], tint: 0x6e5a48 },
      { sprite: 'fx.p.rock2', count: Math.round(3 * s), life: [600, 900], delay: [60, 110], speed: [140 * s, 240 * s], angle: [-150, -30], spread: 14 * s, gravity: 760, scale: [1.1, 1], alpha: [1, 0.4], spin: [-500, 500], tint: 0x8a8580 },
      { sprite: 'fx.p.ember', count: Math.round(7 * s), life: [500, 1000], speed: [40, 150 * s], angle: [-160, -20], gravity: 90, drag: 1, scale: [1.2, 0.5], alpha: [1, 0], spread: 5 * s, blendAdd: true },
    ],
  };
}

// ---------------------------------------------------------------------------------------------
// Recipes

export const FX_RECIPES: readonly FxRecipe[] = [
  // Instant and attack effects
  {
    id: 'fx.beam_laser',
    durationMs: 140,
    sprites: [
      { sprite: 'fx.p.beam', life: 140, toTarget: true, keys: [{ t: 0, sy: 1.6, a: 0.55 }, { t: 1, sy: 0.4, a: 0 }], tint: 0x3af0b4 },
      { sprite: 'fx.p.beam', life: 120, toTarget: true, keys: [{ t: 0, sy: 0.7, a: 1 }, { t: 1, sy: 0.2, a: 0 }], tint: 0xffffff },
    ],
  },
  {
    id: 'fx.beam_rail',
    durationMs: 260,
    sprites: [
      { sprite: 'fx.p.beam', life: 260, toTarget: true, keys: [{ t: 0, sy: 2.6, a: 0.7 }, { t: 1, sy: 0.3, a: 0 }], tint: 0xf03aa8 },
      { sprite: 'fx.p.beam', life: 200, toTarget: true, keys: [{ t: 0, sy: 1.1, a: 1 }, { t: 1, sy: 0.2, a: 0 }], tint: 0xffffff },
    ],
    particles: [{ sprite: 'fx.p.spark', count: 4, life: [120, 220], speed: [40, 120], angle: [-180, 180], scale: [0.8, 0.3], alpha: [1, 0], align: true, tint: 0xfbd6ec }],
  },
  { id: 'fx.arc_chain', durationMs: 220, chain: { segments: 7, jitter: 7, tint: 0xd8fff0, width: 2.2, refreshMs: 45 }, sprites: [flash(0.9, 0xd8fff0, 120)] },
  {
    id: 'fx.tongue',
    durationMs: 420,
    sprites: [{ sprite: 'fx.p.beam', life: 420, toTarget: true, keys: [{ t: 0, sx: 0, sy: 1.3, a: 1 }, { t: 0.35, sx: 1, sy: 1.3, a: 1 }, { t: 0.55, sx: 1, sy: 1.2, a: 1 }, { t: 1, sx: 0, sy: 1.2, a: 1 }], tint: 0xd98fa8 }],
  },
  {
    id: 'fx.pitch_pour',
    durationMs: 520,
    particles: [
      { sprite: 'fx.p.drop', rate: 60, life: [260, 380], speed: [20, 60], angle: [70, 110], spread: 6, gravity: 700, scale: [1, 0.8], alpha: [1, 0.6], box: [8, 2] },
      { sprite: 'fx.p.smoke', rate: 10, life: [500, 800], speed: [10, 30], angle: [-110, -70], spread: 10, gravity: -40, scale: [0.4, 0.9], alpha: [0.35, 0], tint: 0xe8e4de },
    ],
  },
  {
    id: 'fx.heal_beam',
    durationMs: 380,
    sprites: [
      { sprite: 'fx.p.beam', life: 380, toTarget: true, keys: [{ t: 0, sy: 1.4, a: 0 }, { t: 0.2, sy: 1.4, a: 0.7 }, { t: 1, sy: 0.6, a: 0 }], tint: 0x5fe0a8 },
      { sprite: 'fx.p.plus', life: 380, delay: 60, keys: [{ t: 0, sx: 0.5, sy: 0.5, a: 0 }, { t: 0.3, sx: 1, sy: 1, a: 1 }, { t: 1, y: -10, a: 0 }] },
    ],
  },

  // A17.12 instant attacks
  {
    id: 'fx.sun_beam',
    durationMs: 160,
    sprites: [
      { sprite: 'fx.p.beam', life: 160, toTarget: true, keys: [{ t: 0, sy: 1.8, a: 0.5 }, { t: 1, sy: 0.5, a: 0 }], tint: 0xfff1d6 },
      { sprite: 'fx.p.beam', life: 130, toTarget: true, keys: [{ t: 0, sy: 0.7, a: 1 }, { t: 1, sy: 0.2, a: 0 }], tint: 0xffffff },
    ],
  },
  {
    id: 'fx.gorgon_gaze',
    durationMs: 420,
    sprites: [
      { sprite: 'fx.p.beam', life: 360, toTarget: true, keys: [{ t: 0, sy: 0.4, a: 0 }, { t: 0.2, sy: 2.2, a: 0.6 }, { t: 1, sy: 1.2, a: 0 }], tint: 0xd6ecc4 },
      { sprite: 'fx.p.beam', life: 300, toTarget: true, keys: [{ t: 0, sy: 0.2, a: 0 }, { t: 0.25, sy: 0.8, a: 1 }, { t: 1, sy: 0.3, a: 0 }], tint: 0xffffff },
    ],
    particles: [{ sprite: 'fx.p.dust', count: 3, life: [300, 500], speed: [20, 50], angle: [-160, -20], scale: [0.5, 0.9], alpha: [0.8, 0], tint: 0xc9c2b4 }],
  },
  // Bronze wave instants (CONTENT_PLAN 5.2): the Aulos Piper's note and the Tragic Chorus's wail
  {
    id: 'fx.note_pop',
    durationMs: 640,
    sprites: [
      { sprite: 'fx.p.beam', life: 360, toTarget: true, keys: [{ t: 0, sy: 0.5, a: 0 }, { t: 0.25, sy: 1.2, a: 0.5 }, { t: 1, sy: 0.4, a: 0 }], tint: 0xc8f4e0 },
      flash(0.7, 0xe8fff4, 140),
    ],
    particles: [{ sprite: 'fx.p.note', count: 2, life: [420, 640], speed: [30, 60], angle: [-120, -60], spread: 4, gravity: -30, scale: [0.9, 0.6], alpha: [1, 0], spin: [-60, 60], tint: 0xe8fff4 }],
  },
  {
    id: 'fx.wail_ring',
    durationMs: 600,
    sprites: [
      ring(1.6, 420, 0xd8c8f0, 0.5),
      { ...ring(2.4, 520, 0xc9b8f0, 0.3), delay: 80 },
      { sprite: 'fx.p.beam', life: 380, toTarget: true, keys: [{ t: 0, sy: 0.6, a: 0 }, { t: 0.3, sy: 1.6, a: 0.45 }, { t: 1, sy: 0.6, a: 0 }], tint: 0xc9b8f0 },
    ],
  },
  // Medieval wave instants (CONTENT_PLAN 5.3): the Lindworm's marsh-fire breath and the Grapple Crane's hook
  {
    id: 'fx.lindworm_breath',
    durationMs: 620,
    sprites: [
      { sprite: 'fx.p.beam', life: 520, toTarget: true, keys: [{ t: 0, sx: 0, sy: 1.6, a: 0.7 }, { t: 0.3, sx: 1, sy: 3.2, a: 0.75 }, { t: 0.7, sx: 1, sy: 3.6, a: 0.5 }, { t: 1, sx: 1, sy: 2.4, a: 0 }], tint: 0x8fe39a },
      { sprite: 'fx.p.beam', life: 440, toTarget: true, keys: [{ t: 0, sx: 0, sy: 0.8, a: 1 }, { t: 0.3, sx: 1, sy: 1.4, a: 1 }, { t: 1, sx: 1, sy: 0.6, a: 0 }], tint: 0xe8ffe6 },
    ],
    particles: [
      { sprite: 'fx.p.ember', rate: 40, life: [300, 520], speed: [30, 80], angle: [-150, -30], spread: 10, gravity: -60, scale: [0.9, 0.4], alpha: [1, 0], tint: 0xb8f5c0 },
      { sprite: 'fx.p.smoke', rate: 12, life: [500, 800], speed: [10, 30], angle: [-110, -70], spread: 12, gravity: -40, scale: [0.5, 1], alpha: [0.35, 0], tint: 0xb9c2b8 },
    ],
  },
  {
    id: 'fx.grapple_hook',
    durationMs: 420,
    sprites: [
      { sprite: 'fx.p.beam', life: 400, toTarget: true, keys: [{ t: 0, sx: 0, sy: 0.5, a: 1 }, { t: 0.3, sx: 1, sy: 0.5, a: 1 }, { t: 0.75, sx: 1, sy: 0.45, a: 1 }, { t: 1, sx: 0, sy: 0.45, a: 1 }], tint: 0x8a7458 },
      flash(0.6, 0xf2efe6, 120),
    ],
    particles: [{ sprite: 'fx.p.dust', count: 3, life: [260, 420], speed: [20, 50], angle: [-160, -20], scale: [0.5, 0.8], alpha: [0.8, 0], tint: 0xc9c2b4 }],
  },
  // Gunpowder wave instants (CONTENT_PLAN 5.4): the Blunderbuss's cone of shot, the Drummer Boy's drumroll boom,
  // the Bagpiper's droning skirl and the Mesmerist's hypnotic spiral
  {
    id: 'fx.blunderbuss_spray',
    durationMs: 560,
    sprites: [
      { sprite: 'fx.p.beam', life: 220, toTarget: true, keys: [{ t: 0, sx: 0, sy: 2.4, a: 0.9 }, { t: 0.35, sx: 1, sy: 4.2, a: 0.7 }, { t: 1, sx: 1, sy: 5.4, a: 0 }], tint: 0xfff1d2 },
      flash(1.1, 0xfff6e2, 110),
    ],
    particles: [
      { ...sparks(9, [260, 420], 'fx.p.spark', [-20, 20]), life: [120, 220], gravity: 60 },
      { ...smoke(4, 0.8), angle: [-40, 10] },
    ],
  },
  {
    id: 'fx.drum_boom',
    durationMs: 520,
    sprites: [ring(1.4, 360, 0xf8f0d8, 0.45), { ...ring(2.0, 440, 0xefe6cf, 0.4), delay: 90 }, flash(0.6, 0xfff6e2, 90)],
    particles: [{ sprite: 'fx.p.note', count: 2, life: [380, 560], speed: [30, 60], angle: [-120, -60], spread: 4, gravity: -30, scale: [0.9, 0.6], alpha: [1, 0], spin: [-40, 40], tint: 0xf8f0d8 }],
  },
  {
    id: 'fx.pipe_drone',
    durationMs: 640,
    sprites: [
      { sprite: 'fx.p.beam', life: 520, toTarget: true, keys: [{ t: 0, sx: 0, sy: 0.6, a: 0 }, { t: 0.3, sx: 1, sy: 1.4, a: 0.45 }, { t: 0.65, sx: 1, sy: 0.8, a: 0.4 }, { t: 1, sx: 1, sy: 1.2, a: 0 }], tint: 0xe2ead8 },
      ring(1.2, 420, 0xd8e2cc, 0.45),
    ],
    particles: [{ sprite: 'fx.p.note', count: 3, life: [420, 700], speed: [30, 60], angle: [-130, -50], spread: 6, gravity: -30, scale: [0.9, 0.5], alpha: [1, 0], spin: [-60, 60], tint: 0xe2ead8 }],
  },
  {
    id: 'fx.mesmer_spiral',
    durationMs: 700,
    sprites: [
      { sprite: 'fx.p.beam', life: 420, toTarget: true, keys: [{ t: 0, sx: 0, sy: 0.5, a: 0.8 }, { t: 0.4, sx: 1, sy: 0.7, a: 0.7 }, { t: 1, sx: 1, sy: 0.3, a: 0 }], tint: 0xe7dcff },
      { sprite: 'fx.p.swirl', life: 640, keys: [{ t: 0, sx: 0.4, sy: 0.4, a: 0, r: 0 }, { t: 0.25, sx: 1.4, sy: 1.4, a: 0.9, r: 180 }, { t: 1, sx: 1.8, sy: 1.8, a: 0, r: 540 }], tint: 0xe7dcff },
    ],
    particles: [{ sprite: 'fx.p.xp', count: 4, life: [380, 600], speed: [20, 50], angle: [-180, 180], spread: 6, scale: [1, 0.3], alpha: [1, 0], tint: 0xe7dcff, blendAdd: true }],
  },
  { id: 'fx.tesla_arc', durationMs: 260, chain: { segments: 8, jitter: 9, tint: 0xe6ecff, width: 2.4, refreshMs: 40 }, sprites: [flash(1, 0xe6ecff, 130)] },
  // Industrial wave instants (CONTENT_PLAN 5.5): the Spark Scientist's coil-gun arc (it jumps on to a second foe)
  // and the Steam Hammer's ground shock at its gate
  {
    id: 'fx.coil_arc',
    durationMs: 300,
    chain: { segments: 9, jitter: 10, tint: 0xe7dcff, width: 2.6, refreshMs: 35 },
    sprites: [flash(1.1, 0xf2ecff, 140), bloom(1.2, 220, 0xe7dcff, 0.5)],
    particles: [{ ...sparks(5, [120, 240]), tint: 0xe7dcff }],
  },
  {
    id: 'fx.hammer_shock',
    durationMs: 640,
    sprites: [flash(1.2, 0xfff6e2, 90), ring(2.2, 420, 0xf2ecdc, 0.3), { ...ring(3.0, 520, 0xd8ccb4, 0.25), delay: 80 }],
    particles: [{ ...dust(6, 1.1), tint: 0xd8ccb4 }, { ...chunks(4), tint: 0x9a9288 }, { ...smoke(3, 0.9), tint: 0xeeeae2 }],
  },
  {
    id: 'fx.beam_void',
    durationMs: 200,
    sprites: [
      { sprite: 'fx.p.beam', life: 200, toTarget: true, keys: [{ t: 0, sy: 2.2, a: 0.6 }, { t: 1, sy: 0.5, a: 0 }], tint: 0xb49ae0 },
      { sprite: 'fx.p.beam', life: 160, toTarget: true, keys: [{ t: 0, sy: 0.8, a: 1 }, { t: 1, sy: 0.2, a: 0 }], tint: 0xffffff },
    ],
  },
  {
    id: 'fx.beam_ion',
    durationMs: 140,
    sprites: [
      { sprite: 'fx.p.beam', life: 140, toTarget: true, keys: [{ t: 0, sy: 1.5, a: 0.55 }, { t: 1, sy: 0.4, a: 0 }], tint: 0x3fe0b0 },
      { sprite: 'fx.p.beam', life: 120, toTarget: true, keys: [{ t: 0, sy: 0.6, a: 1 }, { t: 1, sy: 0.2, a: 0 }], tint: 0xffffff },
    ],
  },
  {
    id: 'fx.beam_tachyon',
    durationMs: 300,
    sprites: [
      { sprite: 'fx.p.beam', life: 300, toTarget: true, keys: [{ t: 0, sy: 3, a: 0.6 }, { t: 1, sy: 0.4, a: 0 }], tint: 0xc9b8f0 },
      { sprite: 'fx.p.beam', life: 240, toTarget: true, keys: [{ t: 0, sy: 1.3, a: 1 }, { t: 1, sy: 0.2, a: 0 }], tint: 0xffffff },
    ],
    particles: [{ sprite: 'fx.p.spark', count: 5, life: [120, 240], speed: [60, 140], angle: [-180, 180], scale: [0.8, 0.3], alpha: [1, 0], align: true, tint: 0xe7dcff }],
  },

  // Hit and death effects
  { id: 'fx.spark_blunt', durationMs: 520, sprites: [bloom(0.9, 160, 0xfff0d8, 0.55), flash(0.9, 0xfff6e2, 90), ring(1.1, 180, 0xfff6e2, 0.8)], particles: [dust(4, 0.8), { sprite: 'fx.p.star', count: 2, life: [220, 320], speed: [60, 110], angle: [-150, -30], scale: [0.6, 0.3], alpha: [1, 0], spin: [-300, 300] }] },
  {
    id: 'fx.spark_slash',
    durationMs: 260,
    sprites: [bloom(0.7, 140, 0xffffff, 0.5), { sprite: 'fx.p.slash', life: 170, keys: [{ t: 0, sx: 0.7, sy: 0.7, a: 1, r: -20 }, { t: 1, sx: 1.25, sy: 1.25, a: 0, r: 25 }] }],
    particles: [sparks(3, [100, 180])],
  },
  { id: 'fx.spark_pierce', durationMs: 260, sprites: [bloom(0.6, 120, 0xfff6e2, 0.5), flash(0.6, 0xffffff, 70)], particles: [sparks(5, [140, 240], 'fx.p.spark', [-210, -150])] },
  { id: 'fx.spark_bullet', durationMs: 320, sprites: [bloom(0.55, 110, 0xfff1d2, 0.55), flash(0.5, 0xffffff, 60)], particles: [sparks(4, [150, 260], 'fx.p.spark', [-220, -140]), dust(2, 0.5)] },
  {
    id: 'fx.scorch_laser',
    durationMs: 520,
    sprites: [
      flash(0.9, 0x3af0b4, 130),
      { sprite: 'fx.p.scorch', life: 500, keys: [{ t: 0, sx: 0.6, sy: 0.6, a: 0.7 }, { t: 1, sx: 1, sy: 1, a: 0 }] },
    ],
    particles: [{ sprite: 'fx.p.ember', count: 4, life: [200, 360], speed: [40, 110], angle: [-160, -20], gravity: 120, scale: [1, 0.5], alpha: [1, 0], tint: 0xd8fff0 }],
  },
  explosion('fx.blast', 0.8),
  {
    id: 'fx.spark_effective',
    durationMs: 360,
    sprites: [
      bloom(1.3, 200, 0xfff0d8, 0.7),
      flash(1.3, 0xffffff, 110),
      ring(1.8, 220, 0xffffff, 0.8),
      { sprite: 'fx.p.star', life: 220, keys: [{ t: 0, sx: 0.6, sy: 0.6, a: 1 }, { t: 1, sx: 2, sy: 2, a: 0, r: 60 }], tint: 0xfff6e2 },
    ],
    particles: [sparks(6, [160, 280]), sparks(2, [150, 240], 'fx.p.sparkHot')],
  },
  {
    id: 'fx.puff_resisted',
    durationMs: 460,
    sprites: [ring(1.2, 220, 0xb9b4ae, 0.9)],
    particles: [{ ...dust(3, 0.7), tint: 0xa8a39c }],
  },
  {
    id: 'fx.muzzle',
    durationMs: 380,
    sprites: [bloom(0.9, 110, 0xfff0d0, 0.7), { sprite: 'fx.p.flash', life: 50, keys: [{ t: 0, sx: 0.9, sy: 0.9, a: 1 }, { t: 1, sx: 1.1, sy: 1.1, a: 1 }] }],
    particles: [
      { sprite: 'fx.p.smoke', count: 3, life: [320, 560], speed: [30, 70], angle: [-25, 15], gravity: -30, drag: 2, scale: [0.3, 0.9], alpha: [0.6, 0], tint: 0xd8d4ce, spin: [-60, 60] },
      { sprite: 'fx.p.spark', count: 2, life: [80, 140], speed: [120, 200], angle: [-15, 15], scale: [0.7, 0.3], alpha: [1, 0], align: true },
    ],
  },
  { id: 'fx.trail', durationMs: 420, particles: [{ sprite: 'fx.p.smoke', count: 1, life: [320, 420], speed: [0, 10], gravity: -20, scale: [0.35, 0.8], alpha: [0.55, 0], tint: 0xdcd8d2 }] },
  { id: 'fx.splash_ring', durationMs: 320, sprites: [{ ...ring(1, 300, 0xfff6e2, 0.32), sizeWith: 'radius' }] },
  explosion('fx.explosion_s', 1),
  explosion('fx.explosion_m', 1.6),
  explosion('fx.explosion_l', 2.4),
  { id: 'fx.dust_poof', durationMs: 620, sprites: [ring(1.8, 260, 0xf4ecdc, 0.35)], particles: [dust(9, 1.15), { ...dust(4, 0.7), speed: [60, 130], angle: [-175, -135] }, { ...dust(4, 0.7), speed: [60, 130], angle: [-45, -5] }] },
  {
    id: 'fx.ko_stars',
    durationMs: 700,
    particles: [{ sprite: 'fx.p.star', count: 3, life: [520, 680], speed: [40, 70], angle: [-130, -50], gravity: -20, drag: 1, scale: [1, 0.6], alpha: [1, 0], spin: [-240, 240] }],
  },
  {
    id: 'fx.coin',
    durationMs: 700,
    exemptColorRule: true,
    sprites: [{ sprite: 'fx.p.coin', life: 700, keys: [{ t: 0, sx: 0.6, sy: 0.6, a: 1 }, { t: 0.2, sx: 1.1, sy: 1.1 }, { t: 0.5, sx: 0.4, sy: 1.1 }, { t: 0.8, sx: 1.1, sy: 1.1, a: 1 }, { t: 1, sx: 0.8, sy: 0.8, a: 0.9 }] }],
  },
  {
    id: 'fx.xp_sparkle',
    durationMs: 600,
    exemptColorRule: true,
    sprites: [{ sprite: 'fx.p.xp', life: 600, keys: [{ t: 0, sx: 0.5, sy: 0.5, a: 1 }, { t: 0.5, sx: 1.2, sy: 1.2, r: 90 }, { t: 1, sx: 0.6, sy: 0.6, a: 0.8, r: 180 }] }],
  },
  {
    id: 'fx.debris',
    durationMs: 900,
    maxInstances: 12,
    particles: [
      { ...chunks(1, 'fx.p.rock'), tint: 0x8a7e70, scale: [1.6, 1.5] },
      { ...chunks(1, 'fx.p.rock2'), tint: 0x6e665c, scale: [1.4, 1.3] },
    ],
  },

  // Status and ability effects
  {
    id: 'fx.heal_glyph',
    durationMs: 800,
    sprites: [
      { sprite: 'fx.p.plus', life: 700, keys: [{ t: 0, sx: 0.4, sy: 0.4, a: 0 }, { t: 0.2, sx: 1, sy: 1, a: 1, y: -4 }, { t: 1, sx: 0.9, sy: 0.9, a: 0, y: -22 }] },
      { sprite: 'fx.p.plus', life: 600, delay: 180, keys: [{ t: 0, x: 7, sx: 0.3, sy: 0.3, a: 0 }, { t: 0.2, x: 7, sx: 0.7, sy: 0.7, a: 1, y: -2 }, { t: 1, x: 8, a: 0, y: -18 }] },
    ],
  },
  {
    id: 'fx.shield_bubble',
    durationMs: 6000,
    loops: true,
    sprites: [
      { sprite: 'fx.p.bubble', life: 0, keys: [{ t: 0, sx: 0.5, sy: 0.5, a: 0 }, { t: 0.03, sx: 1.08, sy: 1.08, a: 0.9 }, { t: 0.06, sx: 1, sy: 1 }, { t: 0.95, sx: 1, sy: 1, a: 0.8 }, { t: 1, sx: 1.15, sy: 1.15, a: 0 }], tint: 0xe4fbf1, sizeWith: 'radius' },
    ],
  },
  {
    id: 'fx.mark_reticle',
    durationMs: 4000,
    loops: true,
    sprites: [{ sprite: 'fx.p.reticle', life: 0, loop: 600, keys: [{ t: 0, sx: 1.2, sy: 1.2, a: 0.95, r: 0 }, { t: 0.5, sx: 1, sy: 1, a: 1, r: 45 }, { t: 1, sx: 1.2, sy: 1.2, a: 0.95, r: 90 }] }],
  },
  {
    id: 'fx.gravity_swirl',
    durationMs: 900,
    loops: true,
    sprites: [{ sprite: 'fx.p.swirl', life: 0, sizeWith: 'radius', keys: [{ t: 0, sx: 0.4, sy: 0.16, a: 0, r: 0 }, { t: 0.15, sx: 1, sy: 0.4, a: 0.9, r: 90 }, { t: 1, sx: 0.6, sy: 0.24, a: 0, r: 540 }] }],
    particles: [{ sprite: 'fx.p.nanite', rate: 30, life: [300, 500], box: [9, 2], sizeWith: 'radius', attract: 5, scale: [1, 0.3], alpha: [0.9, 0], tint: 0xc9b8f0 }],
  },
  {
    id: 'fx.smoke_cloud',
    durationMs: 7000,
    loops: true,
    particles: [{ sprite: 'fx.p.cloud', rate: 9, life: [1800, 2600], box: [50, 12], sizeWith: 'width', speed: [4, 14], angle: [-120, -60], scale: [1.4, 2.4], alpha: [0.75, 0], spin: [-10, 10], tint: 0xa9a5a0 }],
  },
  {
    id: 'fx.emp_ring',
    durationMs: 520,
    sprites: [{ ...ring(1, 420, 0x3af0b4, 0.45), sizeWith: 'radius' }, flash(1.2, 0xd8fff0, 120)],
    particles: [{ sprite: 'fx.p.bolt', count: 6, life: [160, 300], speed: [120, 260], angle: [-180, 0], scale: [1, 0.6], alpha: [1, 0], align: true, tint: 0xd8fff0 }],
  },
  {
    id: 'fx.time_ripple',
    durationMs: 900,
    sprites: [
      { sprite: 'fx.p.clock', life: 900, keys: [{ t: 0, sx: 0.5, sy: 0.5, a: 0 }, { t: 0.2, sx: 2.2, sy: 2.2, a: 0.9, r: 0 }, { t: 1, sx: 2.6, sy: 2.6, a: 0, r: -90 }] },
      { ...ring(1, 700, 0xc9b8f0, 0.45), sizeWith: 'radius' },
      { ...ring(0.7, 600, 0xffffff, 0.45), delay: 120, sizeWith: 'radius' },
    ],
  },
  {
    id: 'fx.roar_ring',
    durationMs: 600,
    sprites: [
      { ...ring(1, 520, 0xf4ecd0, 0.45), sizeWith: 'radius' },
      { sprite: 'fx.p.wedge', life: 360, keys: [{ t: 0, x: 8, sx: 0.5, sy: 0.5, a: 0.8 }, { t: 1, x: 30, sx: 2, sy: 2, a: 0 }], tint: 0xf4ecd0 },
    ],
  },
  {
    id: 'fx.call_marker',
    durationMs: 1000,
    loops: true,
    sprites: [
      { sprite: 'fx.p.reticle', life: 0, loop: 250, keys: [{ t: 0, sx: 1.4, sy: 0.55, a: 1 }, { t: 0.5, sx: 1.1, sy: 0.45, a: 0.6 }, { t: 1, sx: 1.4, sy: 0.55, a: 1 }] },
    ],
  },
  {
    id: 'fx.dizzy',
    durationMs: 1500,
    loops: true,
    particles: [{ sprite: 'fx.p.star', rate: 5, life: [500, 700], box: [8, 2], speed: [10, 20], angle: [-100, -80], scale: [0.8, 0.4], alpha: [1, 0], spin: [-200, 200] }],
  },
  {
    id: 'fx.legendary_aura',
    durationMs: 2000,
    loops: true,
    sprites: [{ sprite: 'fx.p.glow', life: 0, loop: 1800, sizeWith: 'radius', keys: [{ t: 0, sx: 1, sy: 1, a: 0.35 }, { t: 0.5, sx: 1.08, sy: 1.08, a: 0.55 }, { t: 1, sx: 1, sy: 1, a: 0.35 }] }],
  },

  // A17.12 ability effects
  {
    id: 'fx.stomp_ring',
    durationMs: 700,
    sprites: [{ ...ring(1, 520, 0xf4ecd0, 0.35), sizeWith: 'radius' }, { ...ring(0.7, 440, 0xfff6e2, 0.35), delay: 80, sizeWith: 'radius' }, bloom(2, 260, 0xfff0d6, 0.5)],
    particles: [dust(8, 1.3), { ...chunks(3), tint: 0x9a8e7c }],
  },
  {
    id: 'fx.fuse_spark',
    durationMs: 1000,
    loops: true,
    particles: [{ sprite: 'fx.p.spark', rate: 26, life: [120, 220], speed: [40, 110], angle: [-160, -20], gravity: 220, scale: [0.8, 0.3], alpha: [1, 0], align: true, tint: 0xfff6e2 }],
  },
  {
    id: 'fx.beacon_ring',
    durationMs: 700,
    sprites: [{ ...ring(1, 600, 0x3fe0b0, 0.4), sizeWith: 'radius' }, { ...ring(0.8, 500, 0xffffff, 0.4), delay: 90, sizeWith: 'radius' }, bloom(1.4, 400, 0xd8fff0, 0.6)],
    particles: [{ sprite: 'fx.p.nanite', count: 8, life: [400, 700], speed: [30, 80], angle: [-170, -10], scale: [1, 0.3], alpha: [1, 0], tint: 0xd8fff0 }],
  },
  {
    id: 'fx.blink',
    durationMs: 520,
    sprites: [
      { sprite: 'fx.p.portal', life: 460, keys: [{ t: 0, sx: 0.1, sy: 0.3, a: 0, y: -30 }, { t: 0.25, sx: 1, sy: 1, a: 1, y: -30 }, { t: 0.8, sx: 0.9, sy: 1, a: 0.9, y: -30 }, { t: 1, sx: 0.1, sy: 0.4, a: 0, y: -30 }] },
      flash(1.2, 0xe7dcff, 140),
    ],
    particles: [{ sprite: 'fx.p.nanite', count: 10, life: [300, 520], speed: [40, 120], angle: [-180, 180], spread: 6, scale: [1, 0.3], alpha: [1, 0], tint: 0xc9b8f0 }],
  },

  // Power effects
  {
    id: 'fx.telegraph_zone',
    durationMs: 1000,
    loops: true,
    sprites: [
      { sprite: 'fx.p.zone', life: 0, loop: 330, tint: 'team', keys: [{ t: 0, sy: 1, a: 0.35 }, { t: 0.5, sy: 1.4, a: 0.7 }, { t: 1, sy: 1, a: 0.35 }], sizeWith: 'zone' },
      { sprite: 'fx.p.zoneEdge', life: 0, loop: 330, tint: 'team', keys: [{ t: 0, x: -50, a: 0.6 }, { t: 0.5, x: -50, a: 1 }, { t: 1, x: -50, a: 0.6 }], sizeWith: 'zone' },
      { sprite: 'fx.p.zoneEdge', life: 0, loop: 330, tint: 'team', keys: [{ t: 0, x: 50, a: 0.6 }, { t: 0.5, x: 50, a: 1 }, { t: 1, x: 50, a: 0.6 }], sizeWith: 'zone' },
    ],
  },
  {
    id: 'fx.aurochs',
    durationMs: 1250,
    sprites: [{ sprite: 'fx.p.aurochs', life: 1250, moveBy: 'distance', keys: [{ t: 0, a: 0, sx: 1.4, sy: 1.4 }, { t: 0.1, a: 0.85 }, { t: 0.85, a: 0.85 }, { t: 1, a: 0 }] }],
    particles: [{ sprite: 'fx.p.dust', rate: 30, life: [300, 500], speed: [10, 40], angle: [-170, -120], scale: [0.5, 1.1], alpha: [0.7, 0], followMove: true }],
  },
  { id: 'fx.meteor', durationMs: 1100, fall: { sprite: 'fx.p.meteor', count: 1, fromX: -110, fromY: -340, spreadX: 0, fallMs: 220, impact: 'fx.explosion_m' } },
  { id: 'fx.arrow_rain', durationMs: 700, fall: { sprite: 'fx.p.arrowFall', count: 3, fromX: -60, fromY: -300, spreadX: 14, fallMs: 200, impact: 'fx.spark_pierce' } },
  {
    id: 'fx.decree_glow',
    durationMs: 900,
    sprites: [{ sprite: 'fx.p.glow', life: 900, keys: [{ t: 0, sx: 0.5, sy: 0.5, a: 0 }, { t: 0.3, sx: 2.4, sy: 2.4, a: 0.7 }, { t: 1, sx: 3, sy: 3, a: 0 }], tint: 0xf4ecd0 }],
    particles: [{ sprite: 'fx.p.xp', count: 5, life: [500, 800], box: [10, 4], speed: [20, 50], angle: [-100, -80], scale: [1, 0.4], alpha: [1, 0], tint: 0xf4ecd0, spin: [-180, 180] }],
  },
  { id: 'fx.cannonball_rain', durationMs: 1000, fall: { sprite: 'proj.cannonball', count: 1, fromX: -80, fromY: -320, spreadX: 0, fallMs: 200, impact: 'fx.explosion_s' } },
  {
    id: 'fx.plane_bomber',
    durationMs: 1500,
    sprites: [
      { sprite: 'fx.p.plane', life: 1500, moveBy: 'zone', keys: [{ t: 0, x: -60, y: -230, sx: 2.2, sy: 2.2, a: 1 }, { t: 1, x: 60, y: -230, sx: 2.2, sy: 2.2, a: 1 }] },
      { sprite: 'fx.p.disc', life: 1500, moveBy: 'zone', keys: [{ t: 0, x: -60, sx: 3, sy: 0.4, a: 0.15 }, { t: 1, x: 60, sx: 3, sy: 0.4, a: 0.15 }], tint: 0x000000 },
    ],
  },
  {
    id: 'fx.parachute',
    durationMs: 1200,
    sprites: [{ sprite: 'fx.p.parachute', life: 1200, keys: [{ t: 0, y: -260, r: -8, a: 1, sx: 1.6, sy: 1.6 }, { t: 0.5, y: -120, r: 8 }, { t: 0.95, y: -30, r: -4, a: 1 }, { t: 1, y: -30, a: 0 }] }],
  },
  {
    id: 'fx.orbital_beam',
    durationMs: 2000,
    loops: true,
    sprites: [
      { sprite: 'fx.p.pillar', life: 0, moveBy: 'zone', keys: [{ t: 0, x: -50, sx: 1.4, sy: 1.6, a: 0 }, { t: 0.06, x: -47, a: 0.8 }, { t: 0.94, x: 47, a: 0.8 }, { t: 1, x: 50, a: 0 }], tint: 0x3af0b4 },
      { sprite: 'fx.p.pillar', life: 0, moveBy: 'zone', keys: [{ t: 0, x: -50, sx: 0.5, sy: 1.6, a: 0 }, { t: 0.06, x: -47, a: 1 }, { t: 0.94, x: 47, a: 1 }, { t: 1, x: 50, a: 0 }], tint: 0xffffff },
    ],
    particles: [{ sprite: 'fx.p.ember', rate: 50, life: [200, 400], box: [45, 1], sizeWith: 'zone', speed: [40, 120], angle: [-160, -20], gravity: 150, scale: [1.2, 0.5], alpha: [1, 0], tint: 0xd8fff0 }],
  },
  {
    id: 'fx.nanite_swarm',
    durationMs: 4000,
    loops: true,
    particles: [{ sprite: 'fx.p.nanite', rate: 14, life: [600, 1000], box: [10, 14], speed: [10, 30], angle: [-120, -60], attract: 2, scale: [1.1, 0.4], alpha: [1, 0], spin: [-180, 180] }],
  },

  // A17.12 power effects
  {
    id: 'fx.tidal_wave',
    durationMs: 2000,
    sprites: [
      { sprite: 'fx.p.wave', life: 2000, moveBy: 'zone', keys: [{ t: 0, x: -50, sx: 1.4, sy: 0.4, a: 0 }, { t: 0.08, x: -46, sx: 1.6, sy: 1.5, a: 0.95 }, { t: 0.9, x: 46, sx: 1.6, sy: 1.4, a: 0.95 }, { t: 1, x: 50, sx: 1.4, sy: 0.4, a: 0 }] },
    ],
    particles: [
      { sprite: 'fx.p.snow', rate: 60, life: [300, 600], box: [45, 1], sizeWith: 'zone', speed: [60, 150], angle: [-150, -30], gravity: 420, scale: [2, 1], alpha: [0.95, 0], tint: 0xeef8f6 },
      { sprite: 'fx.p.dust', rate: 10, life: [400, 700], box: [45, 1], sizeWith: 'zone', speed: [10, 40], angle: [-120, -60], scale: [0.6, 1.2], alpha: [0.5, 0], tint: 0xd8eef0 },
    ],
  },
  {
    id: 'fx.aegis_glow',
    durationMs: 1000,
    sprites: [
      bloom(2.6, 900, 0xf4e6c8, 0.5),
      { sprite: 'fx.p.aegis', life: 900, keys: [{ t: 0, sx: 0.4, sy: 0.4, a: 0, y: -30 }, { t: 0.25, sx: 2.2, sy: 2.2, a: 1, y: -40 }, { t: 1, sx: 2.6, sy: 2.6, a: 0, y: -52 }] },
      { ...ring(3, 700, 0xf4e6c8, 0.35), delay: 100 },
    ],
    particles: [{ sprite: 'fx.p.xp', count: 6, life: [500, 800], box: [10, 4], speed: [20, 50], angle: [-100, -80], scale: [1, 0.4], alpha: [1, 0], tint: 0xf4ecd0, spin: [-180, 180] }],
  },
  {
    id: 'fx.iron_horse',
    durationMs: 1400,
    sprites: [{ sprite: 'fx.p.engine', life: 1400, moveBy: 'distance', keys: [{ t: 0, a: 0, sx: 1.5, sy: 1.5 }, { t: 0.08, a: 1 }, { t: 0.88, a: 1 }, { t: 1, a: 0 }] }],
    particles: [
      { sprite: 'fx.p.smoke', rate: 26, life: [500, 900], speed: [10, 40], angle: [-120, -80], scale: [0.6, 1.4], alpha: [0.7, 0], followMove: true, tint: 0xdcd8d2 },
      { sprite: 'fx.p.spark', rate: 20, life: [120, 220], speed: [60, 140], angle: [-170, -120], gravity: 300, scale: [0.8, 0.3], alpha: [1, 0], align: true, followMove: true },
    ],
  },
  {
    id: 'fx.zeppelin',
    durationMs: 2000,
    sprites: [
      { sprite: 'fx.p.zeppelin', life: 2000, moveBy: 'zone', keys: [{ t: 0, x: -60, y: -240, sx: 2.4, sy: 2.4, a: 1 }, { t: 1, x: 60, y: -240, sx: 2.4, sy: 2.4, a: 1 }] },
      { sprite: 'fx.p.disc', life: 2000, moveBy: 'zone', keys: [{ t: 0, x: -60, sx: 3.4, sy: 0.4, a: 0.15 }, { t: 1, x: 60, sx: 3.4, sy: 0.4, a: 0.15 }], tint: 0x000000 },
    ],
  },
  { id: 'fx.star_shard_rain', durationMs: 1000, fall: { sprite: 'proj.star_shard', count: 1, fromX: -90, fromY: -330, spreadX: 0, fallMs: 220, impact: 'fx.explosion_s' } },
  {
    id: 'fx.warp_portal',
    durationMs: 1000,
    sprites: [
      { sprite: 'fx.p.portal', life: 1000, keys: [{ t: 0, sx: 0.1, sy: 0.3, a: 0, y: -34 }, { t: 0.2, sx: 1.6, sy: 1.6, a: 1, y: -34 }, { t: 0.8, sx: 1.5, sy: 1.6, a: 0.9, y: -34 }, { t: 1, sx: 0.1, sy: 0.5, a: 0, y: -34 }] },
      bloom(2, 700, 0xe7dcff, 0.5, 150),
      { ...ring(2.4, 600, 0xc9b8f0, 0.35), delay: 200 },
    ],
    particles: [{ sprite: 'fx.p.nanite', rate: 30, life: [300, 600], box: [6, 20], speed: [20, 60], angle: [-180, 180], attract: 3, scale: [1, 0.3], alpha: [1, 0], tint: 0xc9b8f0 }],
  },

  // Match effects
  {
    id: 'fx.evolve_pillar',
    durationMs: 1500,
    sprites: [
      // art review: peak within the first second, gone by 1.5 s; warm-white core, pale warm edge,
      // additive at low alpha so the base's morph stays visible underneath
      bloom(7, 1000, 0xfff0d6, 0.35),
      { sprite: 'fx.p.pillar', life: 1300, blendAdd: true, keys: [{ t: 0, sx: 0.3, sy: 0.1, a: 0 }, { t: 0.12, sx: 3.4, sy: 1.6, a: 0.32 }, { t: 0.55, sx: 2.8, sy: 1.8, a: 0.22 }, { t: 1, sx: 1.2, sy: 2, a: 0 }], tint: 0xf2dcb4 },
      { sprite: 'fx.p.pillar', life: 950, blendAdd: true, keys: [{ t: 0, sx: 0.1, sy: 0.1, a: 0 }, { t: 0.14, sx: 1.3, sy: 1.8, a: 0.5 }, { t: 0.6, sx: 0.9, sy: 2, a: 0.3 }, { t: 1, sx: 0.2, sy: 2.1, a: 0 }], tint: 0xfff6e6 },
      ring(9, 700, 0xfff6e6, 0.35),
      { ...ring(12, 900, 0xf4e6cc, 0.3), delay: 150 },
    ],
    particles: [
      { sprite: 'fx.p.confetti', count: 30, life: [900, 1300], speed: [120, 280], angle: [-120, -60], gravity: 260, drag: 1.2, spread: 10, scale: [1.2, 1], alpha: [1, 0], spin: [-720, 720], tint: 0xf4ecd0 },
      { sprite: 'fx.p.xp', rate: 22, life: [500, 800], box: [24, 4], speed: [60, 140], angle: [-100, -80], scale: [1.1, 0.3], alpha: [0.9, 0], spin: [-180, 180], tint: 0xfff8e4, blendAdd: true },
    ],
  },
  {
    id: 'fx.last_stand_wave',
    durationMs: 800,
    sprites: [{ ...ring(1, 700, 0xffffff, 0.4), sizeWith: 'radius' }, { ...ring(0.8, 600, 0xf4ecd0, 0.4), delay: 80, sizeWith: 'radius' }, flash(4, 0xffffff, 160)],
    particles: [dust(10, 1.6)],
  },
  {
    id: 'fx.overdrive_frame',
    durationMs: 2000,
    loops: true,
    screen: true,
    exemptColorRule: true,
    sprites: [{ sprite: 'fx.p.frame', life: 0, loop: 900, screenFit: true, keys: [{ t: 0, a: 0.35 }, { t: 0.5, a: 0.8 }, { t: 1, a: 0.35 }], tint: 0xf2c14e }],
  },
  {
    id: 'fx.siege_vignette',
    durationMs: 2000,
    loops: true,
    screen: true,
    exemptColorRule: true,
    sprites: [{ sprite: 'fx.p.vignette', life: 0, loop: 1100, screenFit: true, keys: [{ t: 0, a: 0.35 }, { t: 0.5, a: 0.6 }, { t: 1, a: 0.35 }], tint: 0xc0392b }],
    particles: [{ sprite: 'fx.p.chunk', rate: 6, life: [900, 1400], box: [50, 1], sizeWith: 'width', speed: [10, 40], angle: [80, 100], gravity: 300, scale: [0.8, 0.8], alpha: [1, 0.2], spin: [-200, 200] }],
  },

  // The power rework (A2.9, A5.7): the new powers' effects, telegraph decorations and shared cues.
  ...powerFxRecipes({ flash, ring, smoke, sparks, dust, chunks, bloom, scorch }),
  // A16.14.8 forts
  ...fortFxRecipes({ flash, ring, smoke, sparks, dust, chunks, bloom, scorch }),
  // MVP pass: stance cues, slow and snare marks, Brace, research done, levy pennant
  ...mvpFxRecipes({ flash, ring, smoke, sparks, dust, chunks, bloom, scorch }),
];

export const FX_RECIPE_BY_ID: ReadonlyMap<string, FxRecipe> = new Map(FX_RECIPES.map((r) => [r.id, r]));

// ---------------------------------------------------------------------------------------------
// Projectile recipes (A14.1 proj.*)

export interface ProjectileRecipe {
  id: string;
  sprite: string;
  /** Team-tinted tail (A12: "bright core, team-tinted tail"); length and width in lu. */
  tail?: { length: number; width: number; alpha: number };
  /** Spin in degrees per second (rocks, boulders, logs); otherwise the sprite aligns to its path. */
  spin?: number;
  /** Side-to-side wobble amplitude (bees). */
  wobble?: number;
  /** Puff trail emitted every `every` ms (rockets, mortars). */
  puff?: { sprite: string; every: number; tint?: number };
  /** Rolls along the ground instead of flying (log). */
  rolls?: boolean;
  scale?: number;
}

export const PROJECTILE_RECIPES: readonly ProjectileRecipe[] = [
  { id: 'proj.rock', sprite: 'proj.rock', spin: 540, tail: { length: 14, width: 2, alpha: 0.45 } },
  { id: 'proj.boulder', sprite: 'proj.boulder', spin: 300, tail: { length: 18, width: 4, alpha: 0.35 } },
  { id: 'proj.bee', sprite: 'proj.bee', wobble: 3, tail: { length: 8, width: 1, alpha: 0.3 } },
  { id: 'proj.log', sprite: 'proj.log', spin: 400, rolls: true },
  { id: 'proj.arrow', sprite: 'proj.arrow', tail: { length: 18, width: 1.6, alpha: 0.5 } },
  // Stone wave (CONTENT_PLAN 5.1)
  { id: 'proj.bolas', sprite: 'proj.bolas', spin: 900, tail: { length: 10, width: 2, alpha: 0.35 } },
  { id: 'proj.dart', sprite: 'proj.dart', tail: { length: 16, width: 1.4, alpha: 0.45 } },
  { id: 'proj.herb', sprite: 'proj.herb', wobble: 2, tail: { length: 10, width: 3, alpha: 0.3 } },
  { id: 'proj.quill', sprite: 'proj.quill', tail: { length: 10, width: 1, alpha: 0.4 } },
  { id: 'proj.snowball', sprite: 'proj.snowball', spin: 360, tail: { length: 12, width: 2.6, alpha: 0.35 } },
  { id: 'proj.bolt', sprite: 'proj.bolt', tail: { length: 18, width: 2, alpha: 0.5 } },
  // Bronze wave (CONTENT_PLAN 5.2): the Cretan Archer's high arc reuses the arrow with a longer trail
  { id: 'proj.discus', sprite: 'proj.discus', spin: 1080, tail: { length: 12, width: 3, alpha: 0.4 } },
  { id: 'proj.net', sprite: 'proj.net', spin: 240, wobble: 1.5, tail: { length: 8, width: 3, alpha: 0.25 } },
  { id: 'proj.arrow_arc', sprite: 'proj.arrow', tail: { length: 24, width: 1.6, alpha: 0.5 } },
  // Medieval wave (CONTENT_PLAN 5.3)
  { id: 'proj.longarrow', sprite: 'proj.longarrow', tail: { length: 26, width: 1.6, alpha: 0.5 } },
  { id: 'proj.note', sprite: 'proj.note', wobble: 2.5, tail: { length: 8, width: 2, alpha: 0.3 } },
  { id: 'proj.vial', sprite: 'proj.vial', spin: 720, tail: { length: 10, width: 2.4, alpha: 0.35 }, puff: { sprite: 'fx.p.smoke', every: 60, tint: 0xc8f0d8 } },
  { id: 'proj.spear_bolt', sprite: 'proj.spear_bolt', tail: { length: 24, width: 2.6, alpha: 0.5 } },
  { id: 'proj.goose', sprite: 'proj.goose', wobble: 2, tail: { length: 12, width: 3, alpha: 0.3 } },
  { id: 'proj.musket', sprite: 'proj.musket', tail: { length: 22, width: 1.6, alpha: 0.55 } },
  { id: 'proj.lob', sprite: 'proj.lob', spin: 360, tail: { length: 10, width: 2, alpha: 0.35 }, puff: { sprite: 'fx.p.ember', every: 40 } },
  { id: 'proj.cannonball', sprite: 'proj.cannonball', tail: { length: 20, width: 5, alpha: 0.4 }, puff: { sprite: 'fx.p.smoke', every: 70, tint: 0xd8d4ce } },
  { id: 'proj.grapeshot', sprite: 'proj.grapeshot', tail: { length: 16, width: 4, alpha: 0.4 } },
  { id: 'proj.rocket', sprite: 'proj.rocket', tail: { length: 22, width: 2.4, alpha: 0.5 }, puff: { sprite: 'fx.p.smoke', every: 35, tint: 0xdcd8d2 } },
  { id: 'proj.chainshot', sprite: 'proj.chainshot', spin: 900, tail: { length: 16, width: 5, alpha: 0.35 } },
  // Gunpowder wave (CONTENT_PLAN 5.4): the Coehorn Crew's lobbed shell, its fuse fizzing on the high arc
  { id: 'proj.mortar_shell', sprite: 'proj.mortar_shell', spin: 240, tail: { length: 12, width: 3, alpha: 0.35 }, puff: { sprite: 'fx.p.ember', every: 40 } },
  { id: 'proj.bomb', sprite: 'proj.bomb', tail: { length: 10, width: 2, alpha: 0.3 } },
  { id: 'proj.bullet', sprite: 'proj.bullet', tail: { length: 26, width: 1.4, alpha: 0.55 } },
  { id: 'proj.shell', sprite: 'proj.shell', tail: { length: 22, width: 2.6, alpha: 0.5 }, puff: { sprite: 'fx.p.smoke', every: 60, tint: 0xdcd8d2 } },
  { id: 'proj.flak', sprite: 'proj.flak', tail: { length: 20, width: 2, alpha: 0.5 } },
  { id: 'proj.plasma', sprite: 'proj.plasma', tail: { length: 24, width: 3, alpha: 0.6 } },
  { id: 'proj.plasma_mortar', sprite: 'proj.plasma_mortar', tail: { length: 20, width: 6, alpha: 0.5 }, puff: { sprite: 'fx.p.nanite', every: 40, tint: 0xf6c6e4 } },
  // Industrial wave (CONTENT_PLAN 5.5): the Bomb Bowler's rolling bomb (fuse sparking), the Rivet Spitter's hot rivet
  { id: 'proj.bowl_bomb', sprite: 'proj.bowl_bomb', spin: 540, tail: { length: 10, width: 3, alpha: 0.3 }, puff: { sprite: 'fx.p.ember', every: 45 } },
  { id: 'proj.rivet', sprite: 'proj.rivet', tail: { length: 18, width: 1.8, alpha: 0.5 }, puff: { sprite: 'fx.p.ember', every: 30 } },
  { id: 'proj.gravity_orb', sprite: 'proj.gravity_orb', spin: 360, tail: { length: 16, width: 5, alpha: 0.4 }, puff: { sprite: 'fx.p.nanite', every: 50, tint: 0xc9b8f0 } },
  // A17.12
  { id: 'proj.javelin', sprite: 'proj.javelin', tail: { length: 18, width: 1.6, alpha: 0.45 } },
  { id: 'proj.scorpion_bolt', sprite: 'proj.scorpion_bolt', tail: { length: 22, width: 2.4, alpha: 0.5 } },
  { id: 'proj.harpoon', sprite: 'proj.harpoon', tail: { length: 20, width: 1.4, alpha: 0.4 } },
  { id: 'proj.flare', sprite: 'proj.flare', tail: { length: 18, width: 3, alpha: 0.55 }, puff: { sprite: 'fx.p.ember', every: 35, tint: 0xf8e0f0 } },
  { id: 'proj.ion', sprite: 'proj.ion', tail: { length: 24, width: 2.6, alpha: 0.6 } },
  { id: 'proj.starburst', sprite: 'proj.starburst', spin: 540, tail: { length: 14, width: 3, alpha: 0.5 } },
  { id: 'proj.star_shard', sprite: 'proj.star_shard', tail: { length: 22, width: 3, alpha: 0.55 }, puff: { sprite: 'fx.p.nanite', every: 45, tint: 0xe0d6fa } },
];

export const PROJECTILE_BY_ID: ReadonlyMap<string, ProjectileRecipe> = new Map(PROJECTILE_RECIPES.map((r) => [r.id, r]));
