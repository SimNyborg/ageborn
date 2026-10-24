/**
 * Combat effects (queue item 38, Phase A4/A5/A6; DIAGNOSIS P5, P7): what a hit, a landing, a clash and a fall leave
 * on screen. Track B triggers them from `feel.config.json` rules and the event mapper; the look is here.
 *
 * - `fx.contact_spark` `{ tier, kind, dir }` at the contact point: sized by the hit's tier, drawn by its kind (a
 *   blunt impact star with dust, a slash arc, pierce and bullet sparks spraying back, a metal clang, wood splinters).
 * - `fx.land_dust` `{ size, dir }` on the ground: a flat ring and dust skating out, most of it along `dir`.
 * - `fx.clash_dust` `{ widthLu }` on the ground: a dust curtain along a contact line; `fx.clash_ring` `{ widthLu }` its
 *   flat dust rings, which the battle view draws in the ground layer under the units (review A, S4).
 * - `fx.bits` `{ age, dir, count, seed | bitsSeed, side?, heightLu?, mat? }` at a fallen unit's feet: a helmet or hat,
 *   a weapon shard, a cloth scrap in the team colour, a pebble, in the age's material; tossed, bouncing, lying
 *   `BITS_LIE_MS`, then fading; at most `MAX_BITS` on the field (the oldest go first).
 * - `fx.stuck` `{ kind, dir }` at the contact point (the battle view makes it follow the unit): an arrow (or bolt),
 *   a javelin-length shaft, a porcupine's quill or an energy needle that quivers, stays 1.2-1.9 s and fades.
 * - `fx.ground_glow` `{ size, color }` on the ground: a short additive glow under an impact or a muzzle flash.
 *
 * Every effect reads `lite: 1` (Graphics Lite: about half the pieces) and `reduce: 1` (Reduce motion: no spin, no
 * bounce, shorter travel), which the battle view passes; neither is visible to the effect view otherwise. Options
 * are numbers (`createEffect(id, o?: Record<string, number>)`); the codes below mirror `src/render/combatFeel.ts`
 * (track B, render may not import visuals). The randomness is the view's seeded RNG, or for the bits the seed the
 * battle view derives from match data (unit id and tick), never `Math.random`, so a replay draws the same pieces.
 * Colours follow A11: pale warm sparks and dust, the ages' muted materials, saturated colour only as small accents
 * and in the energy hits. No blood, ever.
 */
import type { Sprite } from 'pixi.js';
import { mulberry32 } from '@/core/rng';
import type { PartBaker } from '../bake';
import { getPart } from '../parts/registry';
import type { FxKit } from './powerRecipes';
import type { CustomFx, CustomFxContext, FxRecipe, ParticleSpec, SpriteSpec } from './recipes';
import { FX_ZONES } from './sprites';

// ---------------------------------------------------------------------------------------------
// Option codes (numbers; the index is the code). Mirrored in src/render/combatFeel.ts.

export const FX_TIERS = ['light', 'medium', 'heavy', 'kill'] as const;
export const FX_CONTACT_KINDS = ['blunt', 'slash', 'pierce', 'bullet', 'metal', 'wood', 'laser', 'blast'] as const;
export const FX_STUCK_KINDS = ['arrow', 'javelin', 'quill', 'needle'] as const;
export const FX_SIZES = ['s', 'm', 'l'] as const;
export const FX_AGES = ['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern', 'future', 'cosmic'] as const;
/** `mat` of `fx.bits`: what the fallen unit is made of (a beast drops no helmet, a machine drops plates and cogs). */
export const FX_BITS_MATS = ['soldier', 'mech', 'beast'] as const;

type Opts = Readonly<Record<string, number>>;

/** An option read as a code in [0, n). */
function code(o: Opts, key: string, n: number): number {
  const v = Math.round(o[key] ?? 0);
  return Number.isFinite(v) ? Math.max(0, Math.min(n - 1, v)) : 0;
}

const flag = (o: Opts, key: string): boolean => (o[key] ?? 0) > 0;

/** A custom player that has nothing left to draw itself (its nested recipe plays as the view's sub-effect). */
const NOTHING: CustomFx = { update: () => {}, done: true, destroy: () => {} };

// ---------------------------------------------------------------------------------------------
// fx.contact_spark

/**
 * The whole spark's size by tier (light, medium, heavy, kill). Light and medium were 0.8 and 1: at game scale they hid
 * in the sheets' own painted impact dust (review A, N8), so they are about 20% larger; heavy and kill barely changed.
 */
export const SPARK_TIER_SCALE: readonly number[] = [0.95, 1.2, 1.4, 1.65];
/** Particle counts by tier, before Lite halves them. */
const SPARK_TIER_COUNT: readonly number[] = [1, 1.3, 1.7, 2.1];

/** The concrete recipe of a contact spark, by kind, tier, Lite and Reduce motion (cached: 8 x 4 x 2 x 2). */
export function contactSparkRecipe(k: FxKit, kind: number, tier: number, lite: boolean, reduce: boolean): FxRecipe {
  const s = SPARK_TIER_SCALE[tier] ?? 1;
  const big = tier >= 2;
  const n = (base: number): number => Math.max(1, Math.round(base * (SPARK_TIER_COUNT[tier] ?? 1) * (lite ? 0.5 : 1)));
  const v = reduce ? 0.6 : 1;
  const spin: readonly [number, number] = reduce ? [0, 0] : [-320, 320];
  const glow = !lite || big;
  const sprites: SpriteSpec[] = [];
  const particles: ParticleSpec[] = [];
  const star = (scale: number, life: number, tint: number): SpriteSpec => ({
    sprite: 'fx.p.flash',
    life,
    jitter: { r: 25, s: [0.9, 1.1] },
    keys: [
      { t: 0, sx: 0.35 * scale, sy: 0.35 * scale, a: 1 },
      { t: 0.3, sx: scale, sy: scale, a: 1 },
      { t: 1, sx: 1.12 * scale, sy: 1.12 * scale, a: 0 },
    ],
    tint,
  });
  const name = FX_CONTACT_KINDS[kind] ?? 'blunt';
  switch (name) {
    case 'slash': {
      if (glow) sprites.push(k.bloom(0.75 * s, 130, 0xffffff, 0.45));
      sprites.push(
        { sprite: 'fx.p.slash', life: 150, keys: [{ t: 0, sx: 0.6 * s, sy: 0.6 * s, a: 1, r: -38 }, { t: 0.4, sx: 1.1 * s, sy: 1.1 * s, a: 1, r: 4 }, { t: 1, sx: 1.3 * s, sy: 1.3 * s, a: 0, r: 24 }], tint: 0xffffff },
        star(0.55 * s, 55, 0xfff6e2),
      );
      particles.push({ ...k.sparks(n(3), [110 * s * v, 200 * s * v], 'fx.p.spark', [-60, 20]) });
      if (big) particles.push({ ...k.dust(n(2), 0.6 * s), angle: [-120, -40], speed: [30 * v, 70 * v] });
      break;
    }
    case 'pierce':
    case 'laser': {
      const energy = name === 'laser';
      const tint = energy ? 0xbff5e0 : 0xfff6e2;
      if (glow) sprites.push(k.bloom(0.65 * s, 110, energy ? 0xbff5e0 : 0xfff6e2, 0.5));
      sprites.push(star(0.55 * s, 60, energy ? 0xeafff6 : 0xffffff), k.ring(0.8 * s, 140, tint, 0.9));
      // the splinters spray back out the way the shot came in
      particles.push({ ...k.sparks(n(4), [130 * s * v, 230 * s * v], 'fx.p.spark', [-212, -148]), tint });
      if (big && !energy) particles.push({ ...k.chunks(n(1), 'fx.p.splinter'), speed: [80 * v, 150 * v], angle: [-200, -140], scale: [0.8, 0.7], life: [300, 460], spin });
      break;
    }
    case 'bullet': {
      if (glow) sprites.push(k.bloom(0.55 * s, 100, 0xfff1d2, 0.5));
      sprites.push(star(0.5 * s, 50, 0xffffff));
      // one small puff (machine-gun fire lands ten of these a second on one body)
      particles.push({ ...k.sparks(n(4), [150 * s * v, 260 * s * v], 'fx.p.spark', [-218, -142]) }, { ...k.dust(n(1), 0.5 * s), angle: [-160, -100], speed: [30 * v, 70 * v] });
      break;
    }
    case 'metal': {
      // the clang: a white-hot star, a thin ring and a fan of bright sparks, a few hot ones
      if (glow) sprites.push(k.bloom(1.05 * s, 140, 0xfffaf0, 0.65));
      sprites.push(star(0.95 * s, 65, 0xffffff), k.ring(1.25 * s, 150, 0xffffff, 0.85));
      particles.push(
        { ...k.sparks(n(7), [180 * s * v, 320 * s * v], 'fx.p.spark', [-205, 25]), gravity: 420, life: [150, 300] },
        { ...k.sparks(n(2), [150 * s * v, 270 * s * v], 'fx.p.sparkHot', [-185, -5]), gravity: 480 },
      );
      break;
    }
    case 'wood': {
      // a thock: a short pale star and ring, a few thin splinters flicking off (no dust: under a volley the puffs
      // piled up into smoke at chest height, P/U/look/u12_wood_close.jpg)
      sprites.push(star(0.6 * s, 65, 0xfff1d2), k.ring(0.95 * s, 160, 0xf4ecdc, 0.7));
      particles.push({ ...k.chunks(n(2), 'fx.p.splinter'), speed: [80 * s * v, 150 * s * v], angle: [-130, -30], gravity: 820, scale: [0.85, 0.75], life: [260, 420], spin: reduce ? [0, 0] : [-560, 560] });
      break;
    }
    default: {
      // blunt (and blast): the cartoon impact star, a flat ring and dust; heavy blows add KO stars and pebbles
      const blast = name === 'blast';
      if (glow) sprites.push(k.bloom(1.0 * s, 150, blast ? 0xffe2c4 : 0xfff0d8, 0.5));
      sprites.push(star(0.9 * s, 75, blast ? 0xfff1d2 : 0xfff6e2), k.ring(1.3 * s, 190, 0xfff6e2, 0.75));
      particles.push({ ...k.dust(n(2), 0.7 * s), angle: [-165, -15], speed: [40 * s * v, 100 * s * v] });
      if (big) {
        particles.push(
          { sprite: 'fx.p.star', count: n(2), life: [220, 340], speed: [70 * s * v, 120 * s * v], angle: [-150, -30], scale: [0.6 * s, 0.3 * s], alpha: [1, 0], spin },
          { ...k.chunks(n(2), 'fx.p.rock'), tint: 0x8e867c, scale: [0.65, 0.55], speed: [80 * v, 160 * v], spin },
        );
      }
      if (blast) particles.push({ sprite: 'fx.p.ember', count: n(2), life: [300, 520], speed: [40 * v, 120 * v], angle: [-160, -20], gravity: 90, drag: 1, scale: [1.1, 0.5], alpha: [1, 0], blendAdd: true });
      break;
    }
  }
  return { id: `fx.contact_spark/${name}/${tier}${lite ? '/lite' : ''}${reduce ? '/reduce' : ''}`, durationMs: 700, sprites, particles };
}

// ---------------------------------------------------------------------------------------------
// fx.land_dust and fx.clash_dust

/** The landing dust's size by `size` (s, m, l). */
export const LAND_DUST_SCALE: readonly number[] = [0.7, 1, 1.5];

export function landDustRecipe(k: FxKit, size: number, lite: boolean, reduce: boolean): FxRecipe {
  const s = LAND_DUST_SCALE[size] ?? 1;
  const n = (base: number): number => Math.max(1, Math.round(base * (lite ? 0.5 : 1)));
  const v = reduce ? 0.6 : 1;
  const skate = (count: number, angle: readonly [number, number]): ParticleSpec => ({
    ...k.dust(count, 0.85 * s),
    angle,
    speed: [50 * s * v, 115 * s * v],
    gravity: -6,
    drag: 3,
    spread: 2.5 * s,
    life: [380, 620],
  });
  const particles: ParticleSpec[] = [
    // most of the dust skates out along `dir` (the way the body slid), some back
    skate(n(5), [-14, -2]),
    skate(n(3), [-178, -166]),
    { ...k.dust(n(2), 0.65 * s), angle: [-115, -65], speed: [18 * v, 45 * v] },
  ];
  if (size >= 2 && !reduce) particles.push({ ...k.chunks(n(3), 'fx.p.rock'), tint: 0x8a7e70, scale: [0.55, 0.5], speed: [60, 130], angle: [-150, -30], gravity: 760, life: [380, 560], spin: [-400, 400] });
  return {
    id: `fx.land_dust/${FX_SIZES[size] ?? 'm'}${lite ? '/lite' : ''}${reduce ? '/reduce' : ''}`,
    durationMs: 700,
    sprites: [{ ...k.ring(2.3 * s, 340, 0xf4ecdc, 0.26) }],
    particles,
  };
}

/** The clash curtain's width is quantized to this (lu) for the recipe cache. */
const CLASH_WIDTH_STEP = 10;

/** The clash's flat dust rings on the ground (`fx.clash_ring`; the battle view draws them under the units, review A S4). */
export function clashRingRecipe(k: FxKit, widthLu: number, lite: boolean, reduce: boolean): FxRecipe {
  const w = Math.max(30, Math.min(400, Math.round(widthLu / CLASH_WIDTH_STEP) * CLASH_WIDTH_STEP));
  return {
    id: `fx.clash_ring/${w}${lite ? '/lite' : ''}${reduce ? '/reduce' : ''}`,
    durationMs: 480,
    sprites: [
      { ...k.ring(w / 9, 420, 0xf4ecdc, 0.16) },
      ...(lite ? [] : [{ ...k.ring(w / 12, 360, 0xfff6e2, 0.18), delay: 60 }]),
    ],
  };
}

/** The clash's dust curtain (`fx.clash_dust`): puffs along the contact line and rolling out at its ends, pebbles. */
export function clashDustRecipe(k: FxKit, widthLu: number, lite: boolean, reduce: boolean): FxRecipe {
  const w = Math.max(30, Math.min(400, Math.round(widthLu / CLASH_WIDTH_STEP) * CLASH_WIDTH_STEP));
  const n = (base: number): number => Math.max(1, Math.round(base * (lite ? 0.5 : 1)));
  const v = reduce ? 0.6 : 1;
  const per = w / 18;
  const half = w / 2;
  return {
    id: `fx.clash_dust/${w}${lite ? '/lite' : ''}${reduce ? '/reduce' : ''}`,
    durationMs: 1000,
    sprites: [],
    particles: [
      // the curtain: puffs kicked up along the whole contact line, hugging the legs (a curtain that rose to the
      // chest hid the blows of the clash it marks, P/U/look/u12_wood_close2.jpg)
      { ...k.dust(n(per), 1.05), box: [half, 2], angle: [-122, -58], speed: [20 * v, 55 * v], gravity: -5, drag: 2.2, life: [420, 720] },
      // and rolling out at both ends along the ground
      { ...k.dust(n(per * 0.4), 1), box: [half * 0.6, 1], angle: [-178, -165], speed: [60 * v, 130 * v], drag: 2.6, life: [420, 700] },
      { ...k.dust(n(per * 0.4), 1), box: [half * 0.6, 1], angle: [-15, -2], speed: [60 * v, 130 * v], drag: 2.6, life: [420, 700] },
      ...(reduce ? [] : [{ ...k.chunks(n(Math.max(1, w / 70)), 'fx.p.rock'), tint: 0x8a7e70, box: [half * 0.8, 1] as const, scale: [0.6, 0.55] as const, speed: [70, 150] as const, gravity: 760 }]),
    ],
  };
}

// ---------------------------------------------------------------------------------------------
// fx.ground_glow and fx.stuck (single-sprite players)

/** The ground glow's radius scale by `size` (s, m, l; the glow sprite is 10 lu across its radius) and its life. */
export const GLOW_SCALE: readonly number[] = [1.2, 1.8, 2.8];
export const GLOW_MS: readonly number[] = [170, 200, 260];

class GlowFx implements CustomFx {
  private t = 0;
  private readonly s: Sprite;
  private readonly size: number;
  private readonly peak: number;
  done = false;

  constructor(ctx: CustomFxContext) {
    this.size = code(ctx.o, 'size', FX_SIZES.length);
    this.s = ctx.sprite('fx.p.glow');
    this.s.blendMode = 'add';
    const c = ctx.o['color'];
    this.s.tint = c !== undefined && Number.isFinite(c) && c >= 0 ? c & 0xffffff : 0xfff0d8;
    this.peak = flag(ctx.o, 'reduce') ? 0.55 : 0.8;
    ctx.layer.addChild(this.s);
    this.update(0);
  }

  update(dtMs: number): void {
    if (this.done) return;
    this.t += dtMs;
    const life = GLOW_MS[this.size] ?? 200;
    const u = Math.min(1, this.t / life);
    const k = GLOW_SCALE[this.size] ?? 1.8;
    const grow = u < 0.25 ? 0.55 + 0.45 * (u / 0.25) : 1 + 0.15 * ((u - 0.25) / 0.75);
    // flattened on the ground plane
    this.s.scale.set(k * grow, k * grow * 0.32);
    this.s.alpha = this.peak * (u < 0.25 ? u / 0.25 : 1 - (u - 0.25) / 0.75);
    if (u >= 1) {
      this.s.visible = false;
      this.done = true;
    }
  }

  destroy(): void {
    this.s.destroy();
  }
}

/** How long a stuck arrow, javelin, quill and needle stay (ms, the last `STUCK_FADE_MS` fading) and how far they point down. */
export const STUCK_MS: readonly number[] = [1500, 1900, 1500, 1200];
/** The part each stuck kind draws (`FX_STUCK_KINDS` order). */
const STUCK_PARTS: readonly string[] = ['fx.p.stuckArrow', 'fx.p.stuckJavelin', 'fx.p.stuckQuill', 'fx.p.stuckNeedle'];
export const STUCK_FADE_MS = 300;
const STUCK_DOWN_RAD = (18 * Math.PI) / 180;
const STUCK_QUIVER_RAD = (9 * Math.PI) / 180;

class StuckFx implements CustomFx {
  private t = 0;
  private readonly s: Sprite;
  private readonly dir: 1 | -1;
  private readonly life: number;
  private readonly quiver: boolean;
  done = false;

  constructor(ctx: CustomFxContext) {
    const kind = code(ctx.o, 'kind', FX_STUCK_KINDS.length);
    this.dir = (ctx.o['dir'] ?? 1) < 0 ? -1 : 1;
    this.life = STUCK_MS[kind] ?? 1500;
    this.quiver = !flag(ctx.o, 'reduce');
    this.s = ctx.sprite(STUCK_PARTS[kind] ?? 'fx.p.stuckArrow');
    // the shaft runs back from the buried head (at the contact point) against the blow, angled as it came down
    this.s.scale.set(this.dir, 1);
    ctx.layer.addChild(this.s);
    this.update(0);
  }

  update(dtMs: number): void {
    if (this.done) return;
    this.t += dtMs;
    const q = this.quiver && this.t < 260 ? STUCK_QUIVER_RAD * Math.exp(-this.t / 70) * Math.sin(this.t / 16) : 0;
    this.s.rotation = this.dir * (STUCK_DOWN_RAD + q);
    const left = this.life - this.t;
    this.s.alpha = left < STUCK_FADE_MS ? Math.max(0, left / STUCK_FADE_MS) : 1;
    if (left <= 0) {
      this.s.visible = false;
      this.done = true;
    }
  }

  destroy(): void {
    this.s.destroy();
  }
}

// ---------------------------------------------------------------------------------------------
// fx.bits

/** At most this many bits lie on the field at once; past it the oldest fade out early. */
export const MAX_BITS = 40;
/** A bit lies this long after it settles (ms), then fades over `BITS_FADE_MS`; an early fade (the cap) takes `BITS_DROP_MS`. */
export const BITS_LIE_MS = 5000;
export const BITS_FADE_MS = 500;
export const BITS_DROP_MS = 250;
const BITS_GRAVITY = 900;
const BITS_SCALE = 1.1;
/** Cloth scraps draw smaller than the hard pieces (a saturated team colour reads big). */
const CLOTH_SCALE = 0.75;

/** `a` mixed toward `b` by `t` (RGB). */
function mixRgb(a: number, b: number, t: number): number {
  const ch = (sh: number): number => Math.round(((a >> sh) & 255) * (1 - t) + ((b >> sh) & 255) * t) << sh;
  return ch(16) | ch(8) | ch(0);
}

/** One piece of a kit: its part, how high its centre sits when it lies (lu), whether it is cloth (team tint, lies flat). */
interface BitKind {
  part: string;
  restLu: number;
  cloth?: boolean;
}

const B = (part: string, restLu: number, cloth = false): BitKind => ({ part, restLu, ...(cloth ? { cloth } : {}) });
const CLOTH = B('fx.bit.cloth', 1.4, true);

/** Per age (soldiers): one headgear at most, then the weapon shard, the cloth scrap and a small piece. */
export const BIT_KITS: Readonly<Record<(typeof FX_AGES)[number], { head: BitKind; rest: readonly BitKind[] }>> = {
  stone: { head: B('fx.bit.bone', 1.6), rest: [B('fx.bit.splinter', 1.2), B('fx.bit.fur', 2.2), B('fx.bit.pebble', 1.8)] },
  bronze: { head: B('fx.bit.helmBronze', 3.4), rest: [B('fx.bit.shardBronze', 1.3), CLOTH, B('fx.bit.splinter', 1.2)] },
  medieval: { head: B('fx.bit.helmKettle', 3.4), rest: [B('fx.bit.shardSteel', 1.3), CLOTH, B('fx.bit.splinter', 1.2)] },
  gunpowder: { head: B('fx.bit.hatTricorn', 2.6), rest: [B('fx.bit.splinter', 1.2), CLOTH, B('fx.bit.button', 1.6)] },
  industrial: { head: B('fx.bit.helmBrodie', 2.4), rest: [B('fx.bit.cog', 3.6), CLOTH, B('fx.bit.shardSteel', 1.3)] },
  modern: { head: B('fx.bit.helmM1', 3.6), rest: [B('fx.bit.casing', 1.3), CLOTH, B('fx.bit.shardSteel', 1.3)] },
  future: { head: B('fx.bit.visor', 3), rest: [B('fx.bit.plate', 2.6), B('fx.bit.chip', 2), CLOTH] },
  cosmic: { head: B('fx.bit.crystal', 4.4), rest: [B('fx.bit.plateCosmic', 2.6), B('fx.bit.crystal', 4.4), B('fx.bit.mote', 1.6)] },
};
/** Machines shed plates, cogs and shards; beasts a tuft, a bone and pebbles (no helmets). */
const MECH_KIT: readonly BitKind[] = [B('fx.bit.plate', 2.6), B('fx.bit.cog', 3.6), B('fx.bit.shardSteel', 1.3), B('fx.bit.chip', 2)];
const BEAST_KIT: readonly BitKind[] = [B('fx.bit.fur', 2.2), B('fx.bit.bone', 1.6), B('fx.bit.pebble', 1.8), B('fx.bit.pebble', 1.8)];

/** The pieces of one death: `count` kinds from the age's kit (or the mech or beast kit), the order from the seed. */
export function bitKinds(age: number, mat: number, count: number, seed: number): BitKind[] {
  const n = Math.max(1, Math.min(6, Math.round(count)));
  const s = seed >>> 0;
  if (mat === 1 || mat === 2) {
    const kit = mat === 1 ? MECH_KIT : BEAST_KIT;
    return Array.from({ length: n }, (_, i) => kit[(s + i) % kit.length] ?? kit[0] as BitKind);
  }
  const kit = BIT_KITS[FX_AGES[age] ?? 'stone'];
  // the headgear comes off in most deaths (never twice), the rest cycle from a seeded start
  const out: BitKind[] = [];
  if (n >= 2 || s % 3 !== 0) out.push(kit.head);
  for (let i = 0; out.length < n; i++) out.push(kit.rest[(s + i) % kit.rest.length] ?? CLOTH);
  return out;
}

/** Every part the fallen of an age can leave: its soldiers' kit, and the machine and beast kits. */
export function bitPartsFor(age: number): string[] {
  const kit = BIT_KITS[FX_AGES[age] ?? 'stone'];
  return [...new Set([kit.head.part, ...kit.rest.map((b) => b.part), ...MECH_KIT.map((b) => b.part), ...BEAST_KIT.map((b) => b.part)])];
}

/** Ages whose bits are baked or queued, per baker. */
const WARMED = new WeakMap<PartBaker, Set<number>>();

/** Runs `fn` when the browser is idle (a frame has time left), else soon. */
function whenIdle(fn: () => void): void {
  const ric = (globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
  if (ric) ric(fn, { timeout: 2000 });
  else setTimeout(fn, 50);
}

/**
 * Bakes an age's bits ahead of its first death, one part per idle callback (the atlas unit view calls it on its first
 * hit, so only battles bake them). The bits' parts bake on first use otherwise, on the death frame itself: about 1 ms
 * a part with the CPU throttled 4x, plus the first runtime page's canvas (about 6 ms) on the battle's first death.
 * Once per age and baker.
 */
export function warmBits(baker: PartBaker, age: number): void {
  if (!baker.enabled) return;
  let ages = WARMED.get(baker);
  if (!ages) {
    ages = new Set();
    WARMED.set(baker, ages);
  }
  if (ages.has(age)) return;
  ages.add(age);
  const todo = bitPartsFor(age);
  const step = (): void => {
    const id = todo.shift();
    const p = id !== undefined ? getPart(id) : undefined;
    if (p && !baker.has(p, FX_ZONES)) baker.get(p, FX_ZONES);
    if (todo.length > 0) whenIdle(step);
    else baker.flush();
  };
  whenIdle(step);
}

interface Piece {
  owner: BitsFx;
  kind: BitKind;
  s: Sprite;
  shadow: Sprite | null;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  spin: number;
  bounces: number;
  /** 0 flying, 1 settling, 2 lying. */
  state: number;
  restT: number;
  restRot: number;
  /** Fading out early because the field holds too many (`MAX_BITS`), ms into the drop; -1 when not. */
  dropT: number;
  gone: boolean;
}

/** Every live piece on the field, oldest first (the cap is across the lane, not per death). */
const LIVE: Piece[] = [];

/** Pieces live on the field now (tests, the dev overlay). */
export function liveBits(): number {
  return LIVE.length;
}

function admit(pieces: readonly Piece[]): void {
  LIVE.push(...pieces);
  let over = LIVE.filter((p) => p.dropT < 0).length - MAX_BITS;
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

/** The nearest angle a piece lies flat at (upright or upside down). */
function flatAngle(rot: number): number {
  return Math.round(rot / Math.PI) * Math.PI;
}

class BitsFx implements CustomFx {
  private readonly pieces: Piece[] = [];
  private readonly reduce: boolean;

  constructor(ctx: CustomFxContext) {
    const o = ctx.o;
    const lite = flag(o, 'lite');
    this.reduce = flag(o, 'reduce');
    const dir = (o['dir'] ?? 1) < 0 ? -1 : 1;
    const seed = Math.trunc(o['bitsSeed'] ?? o['seed'] ?? 1) >>> 0;
    const count = Math.round(o['count'] ?? 3);
    const kinds = bitKinds(code(o, 'age', FX_AGES.length), code(o, 'mat', FX_BITS_MATS.length), lite ? Math.ceil(count / 2) : count, seed);
    const h = Math.max(20, Math.min(220, o['heightLu'] ?? 60));
    const side = o['side'];
    const cloth = side === undefined ? 0xd8cfc0 : mixRgb(ctx.teamColor(side), 0x8a8478, 0.3);
    const r = mulberry32(seed ^ 0x5bd1e995);
    const v = this.reduce ? 0.55 : 1;
    for (let i = 0; i < kinds.length; i++) {
      const kind = kinds[i] as BitKind;
      const shadow = lite ? null : ctx.sprite('fx.p.disc');
      if (shadow) {
        shadow.tint = 0x000000;
        shadow.alpha = 0.2;
        ctx.layer.addChild(shadow);
      }
      const s = ctx.sprite(kind.part);
      if (kind.cloth) s.tint = cloth;
      ctx.layer.addChild(s);
      // most pieces fly along the blow, one in three back over the body
      const back = i % 3 === 2 ? -0.45 : 1;
      const p: Piece = {
        owner: this,
        kind,
        s,
        shadow,
        x: (r.next() - 0.5) * 10,
        y: -(0.32 + 0.33 * r.next()) * h,
        vx: dir * back * (30 + 90 * r.next()) * v,
        vy: -(70 + 100 * r.next()) * v,
        rot: (r.next() - 0.5) * Math.PI,
        spin: this.reduce ? 0 : (r.next() - 0.5) * 2 * (6 + 10 * r.next()) * dir,
        bounces: 0,
        state: 0,
        restT: 0,
        restRot: 0,
        dropT: -1,
        gone: false,
      };
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
      if (p.state === 0) {
        p.vy += BITS_GRAVITY * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.spin * dt;
        const floor = -p.kind.restLu * BITS_SCALE;
        if (p.y >= floor && p.vy > 0) {
          p.y = floor;
          if (!this.reduce && p.bounces < 2 && p.vy > 90) {
            // a bounce: most of the speed is lost, the spin slows
            p.vy = -p.vy * 0.32;
            p.vx *= 0.55;
            p.spin *= 0.45;
            p.bounces++;
          } else {
            p.state = 1;
            p.vx = 0;
            p.vy = 0;
            p.restRot = flatAngle(p.rot);
            p.restT = 0;
          }
        }
      } else {
        p.restT += dtMs;
        if (p.state === 1) {
          // settle onto its side over 120 ms
          const u = Math.min(1, p.restT / 120);
          p.rot += (p.restRot - p.rot) * u;
          if (u >= 1) p.state = 2;
        }
      }
      let alpha = 1;
      if (p.dropT >= 0) {
        p.dropT += dtMs;
        alpha = Math.max(0, 1 - p.dropT / BITS_DROP_MS);
      } else if (p.state > 0 && p.restT > BITS_LIE_MS) alpha = Math.max(0, 1 - (p.restT - BITS_LIE_MS) / BITS_FADE_MS);
      p.s.alpha = alpha;
      if (alpha <= 0) {
        this.remove(p);
        continue;
      }
      this.place(p);
    }
  }

  private place(p: Piece): void {
    const k = p.kind.cloth ? BITS_SCALE * CLOTH_SCALE : BITS_SCALE;
    const flat = p.kind.cloth && p.state > 0 ? 0.68 : 1;
    p.s.position.set(p.x, p.y);
    p.s.rotation = p.rot;
    p.s.scale.set(k, k * flat);
    if (p.shadow) {
      const lift = Math.max(0, -p.y - p.kind.restLu * BITS_SCALE);
      const k = 1 - Math.min(0.6, lift / 60);
      p.shadow.position.set(p.x, 0.6);
      p.shadow.scale.set(0.42 * k, 0.11 * k);
      p.shadow.alpha = 0.2 * k * p.s.alpha;
    }
  }

  private remove(p: Piece): void {
    p.gone = true;
    p.s.visible = false;
    if (p.shadow) p.shadow.visible = false;
    forget(p);
  }

  destroy(): void {
    for (const p of this.pieces) {
      forget(p);
      p.s.destroy();
      p.shadow?.destroy();
    }
    this.pieces.length = 0;
  }
}

// ---------------------------------------------------------------------------------------------
// The recipes

/** Every concrete variant recipe the combat effects can play (the colour-rule test runs over them). */
export function combatVariantRecipes(k: FxKit): FxRecipe[] {
  const out: FxRecipe[] = [];
  for (const lite of [false, true]) {
    for (const reduce of [false, true]) {
      for (let kind = 0; kind < FX_CONTACT_KINDS.length; kind++) for (let tier = 0; tier < FX_TIERS.length; tier++) out.push(contactSparkRecipe(k, kind, tier, lite, reduce));
      for (let size = 0; size < FX_SIZES.length; size++) out.push(landDustRecipe(k, size, lite, reduce));
      out.push(clashDustRecipe(k, 160, lite, reduce), clashRingRecipe(k, 160, lite, reduce));
    }
  }
  return out;
}

/** The parts a custom player draws itself (the colour-rule test rasterises them). */
export const COMBAT_PARTS: readonly string[] = [
  ...STUCK_PARTS,
  'fx.p.splinter',
  ...new Set([...Object.values(BIT_KITS).flatMap((kit) => [kit.head.part, ...kit.rest.map((b) => b.part)]), ...MECH_KIT.map((b) => b.part), ...BEAST_KIT.map((b) => b.part)]),
];

/**
 * The seven combat recipes. Each is one complete effect sized by its options (`tier`, `size`, `count`, `widthLu`), so a
 * multi-count emit (the feel rules' `count`, made for the small legacy sparks) draws it once: `maxInstances: 1`.
 */
export function combatFxRecipes(k: FxKit): FxRecipe[] {
  const sparks = new Map<string, FxRecipe>();
  const lands = new Map<string, FxRecipe>();
  const clashes = new Map<string, FxRecipe>();
  const rings = new Map<string, FxRecipe>();
  const cached = (m: Map<string, FxRecipe>, key: string, make: () => FxRecipe): FxRecipe => {
    let r = m.get(key);
    if (!r) {
      r = make();
      m.set(key, r);
    }
    return r;
  };
  return [
    {
      id: 'fx.contact_spark',
      durationMs: 700,
      maxInstances: 1,
      custom: (ctx) => {
        const kind = code(ctx.o, 'kind', FX_CONTACT_KINDS.length);
        const tier = code(ctx.o, 'tier', FX_TIERS.length);
        const lite = flag(ctx.o, 'lite');
        const reduce = flag(ctx.o, 'reduce');
        ctx.play(cached(sparks, `${kind}|${tier}|${lite}|${reduce}`, () => contactSparkRecipe(k, kind, tier, lite, reduce)), 0, 0);
        return NOTHING;
      },
    },
    {
      id: 'fx.land_dust',
      durationMs: 700,
      maxInstances: 1,
      custom: (ctx) => {
        const size = code(ctx.o, 'size', FX_SIZES.length);
        const lite = flag(ctx.o, 'lite');
        const reduce = flag(ctx.o, 'reduce');
        ctx.play(cached(lands, `${size}|${lite}|${reduce}`, () => landDustRecipe(k, size, lite, reduce)), 0, 0);
        return NOTHING;
      },
    },
    {
      id: 'fx.clash_dust',
      durationMs: 1000,
      maxInstances: 1,
      custom: (ctx) => {
        const w = Math.max(30, Math.min(400, Math.round((ctx.o['widthLu'] ?? 120) / CLASH_WIDTH_STEP) * CLASH_WIDTH_STEP));
        const lite = flag(ctx.o, 'lite');
        const reduce = flag(ctx.o, 'reduce');
        ctx.play(cached(clashes, `${w}|${lite}|${reduce}`, () => clashDustRecipe(k, w, lite, reduce)), 0, 0);
        return NOTHING;
      },
    },
    {
      id: 'fx.clash_ring',
      durationMs: 480,
      maxInstances: 1,
      custom: (ctx) => {
        const w = Math.max(30, Math.min(400, Math.round((ctx.o['widthLu'] ?? 120) / CLASH_WIDTH_STEP) * CLASH_WIDTH_STEP));
        const lite = flag(ctx.o, 'lite');
        const reduce = flag(ctx.o, 'reduce');
        ctx.play(cached(rings, `${w}|${lite}|${reduce}`, () => clashRingRecipe(k, w, lite, reduce)), 0, 0);
        return NOTHING;
      },
    },
    { id: 'fx.bits', durationMs: BITS_LIE_MS + BITS_FADE_MS + 800, maxInstances: 1, custom: (ctx) => new BitsFx(ctx) },
    { id: 'fx.stuck', durationMs: 1900, maxInstances: 1, custom: (ctx) => new StuckFx(ctx) },
    { id: 'fx.ground_glow', durationMs: 260, maxInstances: 1, custom: (ctx) => new GlowFx(ctx) },
  ];
}
