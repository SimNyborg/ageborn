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
  /** Honours o.durationMs (status loops). */
  loops?: boolean;
  /** Drawn in screen space, sized by o.width x o.height. */
  screen?: boolean;
  exemptColorRule?: boolean;
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

function explosion(id: string, s: number): FxRecipe {
  return {
    id,
    durationMs: 900 * Math.min(1.4, s),
    sprites: [flash(2.6 * s, 0xfff1d2, 140), flash(1.4 * s, 0xffffff, 90), ring(3 * s, 320, 0xfff6e2)],
    particles: [
      smoke(Math.round(5 * s), s),
      sparks(Math.round(4 * s), [120 * s, 260 * s], 'fx.p.spark'),
      sparks(Math.max(1, Math.round(1.5 * s)), [120 * s, 220 * s], 'fx.p.sparkHot'),
      { ...chunks(Math.round(3 * s)), speed: [100 * s, 220 * s] },
      { sprite: 'fx.p.ember', count: Math.round(5 * s), life: [400, 800], speed: [40, 140 * s], angle: [-160, -20], gravity: 90, drag: 1, scale: [1.2, 0.6], alpha: [1, 0], spread: 4 * s },
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

  // Hit and death effects
  { id: 'fx.spark_blunt', durationMs: 520, sprites: [flash(0.9, 0xfff6e2, 90)], particles: [dust(4, 0.8), { sprite: 'fx.p.star', count: 2, life: [220, 320], speed: [60, 110], angle: [-150, -30], scale: [0.6, 0.3], alpha: [1, 0], spin: [-300, 300] }] },
  {
    id: 'fx.spark_slash',
    durationMs: 260,
    sprites: [{ sprite: 'fx.p.slash', life: 170, keys: [{ t: 0, sx: 0.7, sy: 0.7, a: 1, r: -20 }, { t: 1, sx: 1.25, sy: 1.25, a: 0, r: 25 }] }],
    particles: [sparks(3, [100, 180])],
  },
  { id: 'fx.spark_pierce', durationMs: 260, sprites: [flash(0.6, 0xffffff, 70)], particles: [sparks(5, [140, 240], 'fx.p.spark', [-210, -150])] },
  { id: 'fx.spark_bullet', durationMs: 320, sprites: [flash(0.5, 0xffffff, 60)], particles: [sparks(4, [150, 260], 'fx.p.spark', [-220, -140]), dust(2, 0.5)] },
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
      flash(1.3, 0xffffff, 110),
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
    sprites: [{ sprite: 'fx.p.flash', life: 50, keys: [{ t: 0, sx: 0.9, sy: 0.9, a: 1 }, { t: 1, sx: 1.1, sy: 1.1, a: 1 }] }],
    particles: [{ sprite: 'fx.p.smoke', count: 2, life: [280, 420], speed: [30, 60], angle: [-20, 20], gravity: -30, drag: 2, scale: [0.3, 0.8], alpha: [0.6, 0], tint: 0xd8d4ce }],
  },
  { id: 'fx.trail', durationMs: 420, particles: [{ sprite: 'fx.p.smoke', count: 1, life: [320, 420], speed: [0, 10], gravity: -20, scale: [0.35, 0.8], alpha: [0.55, 0], tint: 0xdcd8d2 }] },
  { id: 'fx.splash_ring', durationMs: 320, sprites: [{ ...ring(1, 300, 0xfff6e2, 0.32), sizeWith: 'radius' }] },
  explosion('fx.explosion_s', 1),
  explosion('fx.explosion_m', 1.6),
  explosion('fx.explosion_l', 2.4),
  { id: 'fx.dust_poof', durationMs: 620, particles: [dust(8, 1.1)] },
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
  { id: 'fx.debris', durationMs: 900, particles: [chunks(4), { ...chunks(2, 'fx.p.chunkWood') }, dust(2, 0.8)] },

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

  // Match effects
  {
    id: 'fx.evolve_pillar',
    durationMs: 1400,
    sprites: [
      { sprite: 'fx.p.pillar', life: 1200, keys: [{ t: 0, sx: 0.2, sy: 0.1, a: 0 }, { t: 0.15, sx: 3.2, sy: 1.6, a: 0.95 }, { t: 0.7, sx: 2.6, sy: 1.8, a: 0.7 }, { t: 1, sx: 0.4, sy: 2, a: 0 }], tint: 0xfffbe8 },
      ring(9, 700, 0xffffff, 0.35),
    ],
    particles: [{ sprite: 'fx.p.confetti', count: 30, life: [900, 1300], speed: [120, 280], angle: [-120, -60], gravity: 260, drag: 1.2, spread: 10, scale: [1.2, 1], alpha: [1, 0], spin: [-720, 720], tint: 0xf4ecd0 }],
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
  { id: 'proj.bolt', sprite: 'proj.bolt', tail: { length: 18, width: 2, alpha: 0.5 } },
  { id: 'proj.goose', sprite: 'proj.goose', wobble: 2, tail: { length: 12, width: 3, alpha: 0.3 } },
  { id: 'proj.musket', sprite: 'proj.musket', tail: { length: 22, width: 1.6, alpha: 0.55 } },
  { id: 'proj.lob', sprite: 'proj.lob', spin: 360, tail: { length: 10, width: 2, alpha: 0.35 }, puff: { sprite: 'fx.p.ember', every: 40 } },
  { id: 'proj.cannonball', sprite: 'proj.cannonball', tail: { length: 20, width: 5, alpha: 0.4 }, puff: { sprite: 'fx.p.smoke', every: 70, tint: 0xd8d4ce } },
  { id: 'proj.grapeshot', sprite: 'proj.grapeshot', tail: { length: 16, width: 4, alpha: 0.4 } },
  { id: 'proj.rocket', sprite: 'proj.rocket', tail: { length: 22, width: 2.4, alpha: 0.5 }, puff: { sprite: 'fx.p.smoke', every: 35, tint: 0xdcd8d2 } },
  { id: 'proj.chainshot', sprite: 'proj.chainshot', spin: 900, tail: { length: 16, width: 5, alpha: 0.35 } },
  { id: 'proj.bomb', sprite: 'proj.bomb', tail: { length: 10, width: 2, alpha: 0.3 } },
  { id: 'proj.bullet', sprite: 'proj.bullet', tail: { length: 26, width: 1.4, alpha: 0.55 } },
  { id: 'proj.shell', sprite: 'proj.shell', tail: { length: 22, width: 2.6, alpha: 0.5 }, puff: { sprite: 'fx.p.smoke', every: 60, tint: 0xdcd8d2 } },
  { id: 'proj.flak', sprite: 'proj.flak', tail: { length: 20, width: 2, alpha: 0.5 } },
  { id: 'proj.plasma', sprite: 'proj.plasma', tail: { length: 24, width: 3, alpha: 0.6 } },
  { id: 'proj.plasma_mortar', sprite: 'proj.plasma_mortar', tail: { length: 20, width: 6, alpha: 0.5 }, puff: { sprite: 'fx.p.nanite', every: 40, tint: 0xf6c6e4 } },
  { id: 'proj.gravity_orb', sprite: 'proj.gravity_orb', spin: 360, tail: { length: 16, width: 5, alpha: 0.4 }, puff: { sprite: 'fx.p.nanite', every: 50, tint: 0xc9b8f0 } },
];

export const PROJECTILE_BY_ID: ReadonlyMap<string, ProjectileRecipe> = new Map(PROJECTILE_RECIPES.map((r) => [r.id, r]));
