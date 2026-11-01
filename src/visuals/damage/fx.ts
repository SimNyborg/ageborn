/**
 * The damage effects (queue item 40, design 3.3-3.4 and 6): the step's burst and the emitters' particles, played by the
 * battle view through the shared particle pool in world space (trails stay behind flyers), at the lowest priority.
 *
 * - `fx.dmg_burst` `{ mat, stage, dir, size, groundLu, side?, lite?, reduce? }` at the new mark: a puff of the surface
 *   (dust and fibres, sparks, splinters, chips, flakes, mint arcs) and 1-3 pieces flung along the blow that land, lie
 *   2 s and fade (at most `MAX_PIECES` across the lane). Reduce motion: the puff only, softer.
 * - `fx.dmg_smoke`, `fx.dmg_smoke_dark`, `fx.dmg_steam`, `fx.dmg_fire`, `fx.dmg_spark`, `fx.dmg_breath`,
 *   `fx.dmg_motes` `{ dir, scale }`: one emitted puff, flame, spark spray, breath or mote each. Smoke drifts away from
 *   the facing (`dir` = the unit's facing), rises and fades by about 30-40 lu, under 0.6 alpha, so it never reaches the
 *   health bar; flames stay on the hull; sparks live under 200 ms. Normal blend (no additive layer on a unit, WebKit).
 * - `fx.dmg_ignite` at a machine's stage 3: the fire catching (a soft flare and three tongues); `fx.dmg_mend` a heal's
 *   small mint glint where the newest mark faded.
 *
 * Colours follow A11: pale cream, peach and brown-rimmed flames under 40% saturation, neutral greys, pale mint for energy
 * and mending; nothing red, lilac or blue. Option codes are numbers (`createEffect(id, o)`): `mat` indexes `MARK_MATS`.
 */
import type { Sprite } from 'pixi.js';
import { mulberry32 } from '@/core/rng';
import type { FxKit } from '../effects/powerRecipes';
import type { CustomFx, CustomFxContext, FxRecipe, ParticleSpec, SpriteSpec } from '../effects/recipes';
import './kit';
import { mixRgb, STRIP_DULL, STRIP_DUST } from './stage';
import { MARK_MATS, type MarkMat } from './types';

type Opts = Readonly<Record<string, number>>;
const flag = (o: Opts, key: string): boolean => (o[key] ?? 0) > 0;
const code = (o: Opts, key: string, n: number): number => {
  const v = Math.round(o[key] ?? 0);
  return Number.isFinite(v) ? Math.max(0, Math.min(n - 1, v)) : 0;
};

/** The effect ids (the feel config's rules name them; DESIGN A14.1). */
export const DAMAGE_FX_IDS = ['fx.dmg_burst', 'fx.dmg_smoke', 'fx.dmg_smoke_dark', 'fx.dmg_steam', 'fx.dmg_fire', 'fx.dmg_spark', 'fx.dmg_breath', 'fx.dmg_motes', 'fx.dmg_ignite', 'fx.dmg_mend'] as const;

// ---------------------------------------------------------------------------------------------
// Emitter particles

const SMOKE: ParticleSpec = {
  sprite: 'fx.p.smoke',
  count: 1,
  life: [1100, 1500],
  speed: [14, 24],
  angle: [-112, -96],
  spread: 1.5,
  gravity: -10,
  drag: 0.8,
  scale: [0.42, 1.2],
  alpha: [0.5, 0],
  spin: [-30, 30],
  tint: 0xb4aea6,
};

const emitterRecipes: FxRecipe[] = [
  { id: 'fx.dmg_smoke', durationMs: 1500, particles: [SMOKE] },
  // a darker neutral grey than the light smoke (the column reads against pale skies by its tone, not by its size)
  { id: 'fx.dmg_smoke_dark', durationMs: 2000, particles: [{ ...SMOKE, life: [1400, 1900], speed: [18, 30], scale: [0.55, 1.45], alpha: [0.6, 0], tint: 0x57534f }] },
  { id: 'fx.dmg_steam', durationMs: 1000, particles: [{ sprite: 'fx.p.dust', count: 1, life: [700, 1000], speed: [26, 40], angle: [-104, -84], spread: 1, gravity: -18, drag: 1, scale: [0.4, 1.25], alpha: [0.55, 0], spin: [-20, 20], tint: 0xffffff }] },
  {
    id: 'fx.dmg_fire',
    durationMs: 460,
    sprites: [
      {
        sprite: 'fx.p.dmgFlame',
        life: 440,
        jitter: { x: 2.2, y: 1, s: [0.8, 1.15], r: 14 },
        keys: [
          { t: 0, sx: 0.45, sy: 0.35, a: 0.9 },
          { t: 0.25, sx: 0.9, sy: 1.15, a: 1, y: -1 },
          { t: 0.6, sx: 0.78, sy: 1.0, a: 0.95, y: -3.5 },
          { t: 1, sx: 0.4, sy: 0.65, a: 0, y: -7 },
        ],
      },
    ],
  },
  { id: 'fx.dmg_spark', durationMs: 220, particles: [{ sprite: 'fx.p.spark', count: 3, life: [110, 190], speed: [70, 140], angle: [-155, -25], spread: 1.5, gravity: 420, drag: 1, scale: [0.75, 0.3], alpha: [1, 0], align: true }] },
  { id: 'fx.dmg_breath', durationMs: 900, particles: [{ sprite: 'fx.p.dust', count: 1, life: [600, 900], speed: [14, 24], angle: [-34, -12], spread: 1, gravity: -8, drag: 1.2, scale: [0.25, 0.85], alpha: [0.55, 0], tint: 0xffffff }] },
  { id: 'fx.dmg_motes', durationMs: 1100, particles: [{ sprite: 'fx.p.disc', count: 2, life: [700, 1100], speed: [10, 26], angle: [-150, -30], spread: 3, gravity: -20, drag: 0.6, scale: [0.17, 0.05], alpha: [0.95, 0], tint: 0xe2f8ee }] },
];

// ---------------------------------------------------------------------------------------------
// The step's burst

/** At most this many burst pieces lie on the field at once (the oldest fade early). */
export const MAX_PIECES = 24;
/** A piece lies this long after it lands, then fades (design 3.4: they lie 2 s). */
export const PIECE_LIE_MS = 2000;
export const PIECE_FADE_MS = 300;
const PIECE_DROP_MS = 200;
const PIECE_GRAVITY = 900;

/** The piece each surface throws, and its tint (cloth threads take the team colour dulled toward dust). */
const PIECES: Readonly<Record<MarkMat, { part: string; tint: number | 'team'; scale: number }>> = {
  cloth: { part: 'fx.p.dmgThread', tint: 'team', scale: 0.95 },
  hide: { part: 'fx.p.dmgTuft', tint: 0xcbb99c, scale: 1 },
  metal: { part: 'fx.p.dmgPlate', tint: 0xaeb3b8, scale: 1 },
  wood: { part: 'fx.p.splinter', tint: 0xffffff, scale: 0.8 },
  stone: { part: 'fx.p.rock', tint: 0x9a9288, scale: 0.5 },
  glass: { part: 'fx.p.dmgFlake', tint: 0xe6eeee, scale: 0.9 },
  energy: { part: 'fx.p.dmgFlake', tint: 0xdff5ec, scale: 0.9 },
};

/** The puff of a surface, by its body class (0 small, 1 medium, 2 large) and Lite and Reduce motion. */
export function burstPuffRecipe(k: FxKit, mat: MarkMat, size: number, stage: number, lite: boolean, reduce: boolean): FxRecipe {
  const s = [0.85, 1.05, 1.35][size] ?? 1;
  const n = (base: number): number => Math.max(1, Math.round(base * (lite ? 0.5 : 1)));
  const v = reduce ? 0.55 : 1;
  const sprites: SpriteSpec[] = [];
  const particles: ParticleSpec[] = [];
  const puff = (tint: number, count: number, scale = 0.6): ParticleSpec => ({ ...k.dust(n(count), scale * s), tint, angle: [-170, -10], speed: [24 * v, 60 * v], alpha: [reduce ? 0.55 : 0.75, 0] });
  switch (mat) {
    case 'cloth':
      particles.push(puff(0xffffff, 2));
      if (!reduce) particles.push({ sprite: 'fx.p.dmgThread', count: n(3), life: [260, 420], speed: [50, 110], angle: [-160, -20], gravity: 260, drag: 1.5, scale: [0.8 * s, 0.5 * s], alpha: [1, 0], spin: [-500, 500], tint: 'team' });
      break;
    case 'hide':
      particles.push(puff(0xffffff, 3, 0.7));
      if (!reduce) particles.push({ sprite: 'fx.p.dmgTuft', count: n(2), life: [300, 460], speed: [40, 90], angle: [-160, -20], gravity: 220, drag: 1.5, scale: [0.75 * s, 0.5 * s], alpha: [1, 0], spin: [-400, 400], tint: 0xcbb99c });
      break;
    case 'metal':
      if (!reduce) particles.push({ ...k.sparks(n(stage >= 3 ? 6 : 4), [140 * s, 260 * s], 'fx.p.spark', [-200, 20]), gravity: 420, life: [120, 200] });
      particles.push({ ...k.smoke(n(1), 0.5 * s, [500, 800]), tint: 0x8a847c, alpha: [0.55, 0], speed: [12 * v, 30 * v] });
      if (!reduce) sprites.push({ ...k.ring(0.9 * s, 150, 0xffffff, 0.8) });
      break;
    case 'wood':
      particles.push(puff(0xe8dcc8, 2));
      if (!reduce) particles.push({ ...k.chunks(n(3), 'fx.p.splinter'), speed: [80 * s, 150 * s], angle: [-140, -30], gravity: 820, scale: [0.8, 0.7], life: [260, 420], spin: [-560, 560] });
      break;
    case 'stone':
      particles.push(puff(0xffffff, 3));
      if (!reduce) particles.push({ ...k.chunks(n(3), 'fx.p.rock'), tint: 0x9a9288, scale: [0.45, 0.4], speed: [70 * s, 140 * s], gravity: 760, life: [300, 460], spin: [-400, 400] });
      break;
    case 'glass':
      if (!reduce) particles.push({ sprite: 'fx.p.dmgFlake', count: n(4), life: [220, 360], speed: [80 * s, 150 * s], angle: [-170, -10], gravity: 600, scale: [0.7 * s, 0.4 * s], alpha: [1, 0], spin: [-600, 600], tint: 0xeef4f4 });
      sprites.push({ sprite: 'fx.p.star', life: 120, keys: [{ t: 0, sx: 0.3 * s, sy: 0.3 * s, a: 1 }, { t: 1, sx: 0.8 * s, sy: 0.8 * s, a: 0 }], tint: 0xffffff });
      break;
    case 'energy':
      sprites.push({ sprite: 'fx.p.dmgArc', life: 160, jitter: { r: 180 }, keys: [{ t: 0, sx: 0.6 * s, sy: 0.6 * s, a: 1 }, { t: 1, sx: 1.2 * s, sy: 1.2 * s, a: 0 }] });
      if (!reduce) {
        sprites.push({ sprite: 'fx.p.dmgArc', life: 140, delay: 50, jitter: { r: 180 }, keys: [{ t: 0, sx: 0.5 * s, sy: 0.5 * s, a: 1 }, { t: 1, sx: 1 * s, sy: 1 * s, a: 0 }] });
        particles.push({ sprite: 'fx.p.dmgFlake', count: n(3), life: [260, 420], speed: [40 * s, 90 * s], angle: [-170, -10], gravity: -30, drag: 1, scale: [0.6 * s, 0.2 * s], alpha: [1, 0], spin: [-300, 300], tint: 0xdff5ec });
      }
      break;
  }
  return { id: `fx.dmg_burst/${mat}/${size}/${stage}${lite ? '/lite' : ''}${reduce ? '/reduce' : ''}`, durationMs: 700, sprites, particles };
}

interface Piece {
  s: Sprite;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  spin: number;
  floor: number;
  bounced: boolean;
  /** -1 flying, else ms lying. */
  restT: number;
  /** Fading early (the cap), ms into the drop; -1 when not. */
  dropT: number;
  gone: boolean;
}

const LIVE: Piece[] = [];

/** Burst pieces on the field now (tests). */
export function liveDamagePieces(): number {
  return LIVE.length;
}

function admit(ps: readonly Piece[]): void {
  LIVE.push(...ps);
  let over = LIVE.filter((p) => p.dropT < 0).length - MAX_PIECES;
  for (const p of LIVE) {
    if (over <= 0) break;
    if (p.dropT >= 0) continue;
    p.dropT = 0;
    over--;
  }
}

function forget(p: Piece): void {
  const i = LIVE.indexOf(p);
  if (i >= 0) LIVE.splice(i, 1);
}

class BurstFx implements CustomFx {
  private readonly pieces: Piece[] = [];

  constructor(ctx: CustomFxContext, puff: FxRecipe) {
    const o = ctx.o;
    const reduce = flag(o, 'reduce');
    const lite = flag(o, 'lite');
    ctx.play(puff, 0, 0);
    if (reduce) return;
    const mat = MARK_MATS[code(o, 'mat', MARK_MATS.length)] as MarkMat;
    const stage = code(o, 'stage', 4);
    const size = code(o, 'size', 3);
    const dir = (o['dir'] ?? 1) < 0 ? -1 : 1;
    const ground = Math.max(4, Math.min(160, o['groundLu'] ?? 30));
    const kit = PIECES[mat];
    const n = lite ? 1 : Math.min(3, (stage >= 3 ? 2 : 1) + (size >= 2 ? 1 : 0));
    const r = mulberry32(((o['seed'] ?? 1) ^ 0x7f4a7c15) >>> 0 || 1);
    const side = o['side'];
    const tint = kit.tint === 'team' ? (side === undefined ? 0xd8cfc0 : mixRgb(ctx.teamColor(side), STRIP_DUST, STRIP_DULL)) : kit.tint;
    for (let i = 0; i < n; i++) {
      const s = ctx.sprite(kit.part);
      s.tint = tint;
      ctx.layer.addChild(s);
      const p: Piece = {
        s,
        x: (r.next() - 0.5) * 4,
        y: (r.next() - 0.5) * 3,
        vx: dir * (40 + 80 * r.next()),
        vy: -(70 + 90 * r.next()),
        rot: (r.next() - 0.5) * Math.PI,
        spin: dir * (6 + 10 * r.next()),
        floor: ground - 1.2,
        bounced: false,
        restT: -1,
        dropT: -1,
        gone: false,
      };
      s.scale.set(kit.scale);
      this.pieces.push(p);
      this.place(p);
    }
    admit(this.pieces);
  }

  get done(): boolean {
    return this.pieces.every((p) => p.gone);
  }

  update(dtMs: number): void {
    const dt = Math.min(0.1, Math.max(0, dtMs) / 1000);
    for (const p of this.pieces) {
      if (p.gone) continue;
      if (p.restT < 0) {
        p.vy += PIECE_GRAVITY * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.spin * dt;
        if (p.y >= p.floor && p.vy > 0) {
          p.y = p.floor;
          if (!p.bounced && p.vy > 120) {
            p.bounced = true;
            p.vy = -p.vy * 0.3;
            p.vx *= 0.5;
            p.spin *= 0.4;
          } else {
            p.restT = 0;
            p.rot = Math.round(p.rot / Math.PI) * Math.PI;
          }
        }
      } else p.restT += dtMs;
      let a = 1;
      if (p.dropT >= 0) {
        p.dropT += dtMs;
        a = Math.max(0, 1 - p.dropT / PIECE_DROP_MS);
      } else if (p.restT > PIECE_LIE_MS) a = Math.max(0, 1 - (p.restT - PIECE_LIE_MS) / PIECE_FADE_MS);
      p.s.alpha = a;
      if (a <= 0) {
        p.gone = true;
        p.s.visible = false;
        forget(p);
        continue;
      }
      this.place(p);
    }
  }

  private place(p: Piece): void {
    p.s.position.set(p.x, p.y);
    p.s.rotation = p.rot;
  }

  destroy(): void {
    for (const p of this.pieces) {
      forget(p);
      p.s.destroy();
    }
    this.pieces.length = 0;
  }
}

// ---------------------------------------------------------------------------------------------
// The recipes

/** Every concrete burst variant (the colour-rule test runs over them). */
export function damageBurstVariants(k: FxKit): FxRecipe[] {
  const out: FxRecipe[] = [];
  for (const mat of MARK_MATS) for (const size of [0, 1, 2]) for (const stage of [1, 3]) for (const lite of [false, true]) for (const reduce of [false, true]) out.push(burstPuffRecipe(k, mat, size, stage, lite, reduce));
  return out;
}

/** The plain damage recipes (emitters, ignite, mend; the colour-rule test runs over them). */
export function damagePlainRecipes(k: FxKit): FxRecipe[] {
  return [
    ...emitterRecipes,
    {
      id: 'fx.dmg_ignite',
      durationMs: 700,
      sprites: [
        k.bloom(1.3, 260, 0xfff0d8, 0.45),
        ...[-4, 0, 4].map(
          (x, i): SpriteSpec => ({
            sprite: 'fx.p.dmgFlame',
            life: 480 + i * 60,
            delay: i * 40,
            jitter: { s: [0.9, 1.1], r: 10 },
            keys: [
              { t: 0, x, sx: 0.4, sy: 0.3, a: 1 },
              { t: 0.2, x, sx: 1.05, sy: 1.35, a: 1, y: -2 },
              { t: 1, x, sx: 0.5, sy: 0.7, a: 0, y: -10 },
            ],
          }),
        ),
      ],
      particles: [{ sprite: 'fx.p.ember', count: 4, life: [400, 700], speed: [30, 80], angle: [-130, -50], gravity: 60, drag: 1, scale: [1, 0.4], alpha: [1, 0] }],
    },
    {
      id: 'fx.dmg_mend',
      durationMs: 600,
      sprites: [
        { sprite: 'fx.p.star', life: 260, keys: [{ t: 0, sx: 0.2, sy: 0.2, a: 0, r: 0 }, { t: 0.3, sx: 0.75, sy: 0.75, a: 1, r: 25 }, { t: 1, sx: 0.4, sy: 0.4, a: 0, r: 60 }], tint: 0xe2fbef },
        { sprite: 'fx.p.plus', life: 520, delay: 60, keys: [{ t: 0, sx: 0.25, sy: 0.25, a: 0 }, { t: 0.25, sx: 0.55, sy: 0.55, a: 0.9, y: -3 }, { t: 1, sx: 0.5, sy: 0.5, a: 0, y: -14 }] },
      ],
    },
  ];
}

/** The damage recipes the provider plays (`recipes.ts` adds them to `FX_RECIPES`). */
export function damageFxRecipes(k: FxKit): FxRecipe[] {
  const puffs = new Map<string, FxRecipe>();
  return [
    ...damagePlainRecipes(k),
    {
      id: 'fx.dmg_burst',
      durationMs: 2600,
      maxInstances: 1,
      custom: (ctx) => {
        const mat = MARK_MATS[code(ctx.o, 'mat', MARK_MATS.length)] as MarkMat;
        const size = code(ctx.o, 'size', 3);
        const stage = code(ctx.o, 'stage', 4) >= 3 ? 3 : 1;
        const lite = flag(ctx.o, 'lite');
        const reduce = flag(ctx.o, 'reduce');
        const key = `${mat}|${size}|${stage}|${lite}|${reduce}`;
        let puff = puffs.get(key);
        if (!puff) {
          puff = burstPuffRecipe(k, mat, size, stage, lite, reduce);
          puffs.set(key, puff);
        }
        return new BurstFx(ctx, puff);
      },
    },
  ];
}
