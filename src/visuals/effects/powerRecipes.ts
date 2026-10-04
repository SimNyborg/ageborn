/**
 * Effect recipes of the power rework (DESIGN A2.9, A5.7, A12): the 32 new powers' effects, their
 * telegraph decorations and the shared cues (`fx.field_zone`, `fx.target_lock`, `fx.turret_jammed`,
 * `fx.power_cast_cue`). Pure data, played by `adapters/procedural/effectView.ts` like every recipe.
 *
 * The sim owns all timing (B5): sweeps and fields honour the `durationMs` the event mapper passes
 * (`loops`), charges run exactly `distance / speed` (`timedBy: 'run'`), strikes and barrage blasts
 * land on the impact tick, and every telegraph decoration lasts the power's own telegraph. Art never
 * decides when or where damage happens.
 *
 * Each recipe follows its family recipe (projectile rain, sweep, ground field, heavy strike, charge
 * runner, drop, aura) with per-age props and palette, and keeps a readable silhouette at phone size:
 * one big shape that reads at 0.9 px per lu, anticipation in the telegraph, a hard impact and a
 * follow-through that settles (dust, smoke, embers, debris). Colours follow A11 (pale warm tones;
 * saturated colour only in mint, magenta and lilac energy or small accents). Budgets (A12): a cast
 * stays under about 90 live sprites at its peak, a single barrage blast under 30.
 *
 * Nothing here flashes the screen or shakes the camera: those are the feel config's, and reduce
 * motion softens them there. Bright flashes stay local and last at most two frames.
 */
import type { FxRecipe, ParticleSpec, Range, SpriteKey, SpriteSpec } from './recipes';

/** The building blocks of `recipes.ts`, passed in so the two files do not import each other. */
export interface FxKit {
  flash(scale: number, tint?: number, life?: number): SpriteSpec;
  ring(scale: number, life: number, tint?: number, flat?: number): SpriteSpec;
  smoke(count: number, scale: number, life?: Range): ParticleSpec;
  sparks(count: number, speed: Range, sprite?: string, angle?: Range): ParticleSpec;
  dust(count: number, scale?: number): ParticleSpec;
  chunks(count: number, sprite?: string): ParticleSpec;
  bloom(scale: number, life: number, tint?: number, a?: number, delay?: number): SpriteSpec;
  scorch(scale: number, life: number): SpriteSpec;
}

/** Height (lu) at which flak bursts: the render's air altitude plus half an aircraft (render/depth.ts). */
const FLAK_Y = -128;

/** A sprite that bobs every `period` ms while it runs (gallop, rumble), riding a charge's run. */
function runner(sprite: string, period: number, bob: number, tilt: number, scale: number, y = 0): SpriteSpec {
  return {
    sprite,
    life: 0,
    loop: period,
    moveBy: 'distance',
    keys: [
      { t: 0, y, sx: scale, sy: scale, r: 0 },
      { t: 0.25, y: y - bob, sx: scale * 1.03, sy: scale * 0.97, r: -tilt },
      { t: 0.5, y, sx: scale * 0.98, sy: scale * 1.02, r: 0 },
      { t: 0.75, y: y - bob * 0.6, sx: scale, sy: scale, r: tilt },
      { t: 1, y, sx: scale, sy: scale, r: 0 },
    ],
  };
}

/** A team pennant riding a runner (A11 redundant team cue on charges). */
function pennantOn(period: number, bob: number, x: number, y: number, scale: number): SpriteSpec {
  return {
    sprite: 'fx.p.pennant',
    life: 0,
    loop: period,
    moveBy: 'distance',
    tint: 'team',
    keys: [
      { t: 0, x, y, sx: scale, sy: scale, r: 0 },
      { t: 0.25, x, y: y - bob, sx: scale * 0.9, sy: scale, r: -4 },
      { t: 0.5, x, y, sx: scale, sy: scale, r: 0 },
      { t: 0.75, x, y: y - bob * 0.6, sx: scale * 0.95, sy: scale, r: 3 },
      { t: 1, x, y, sx: scale, sy: scale, r: 0 },
    ],
  };
}

/** A sprite that crosses the zone from the caster's edge to the far edge over the sweep. */
function crossing(sprite: string, keys: readonly SpriteKey[], extra: Partial<SpriteSpec> = {}): SpriteSpec {
  return { sprite, life: 0, moveBy: 'zone', keys, ...extra };
}

/** An invisible marker crossing the zone at ground level: the point sweep particles follow. */
const SWEEP_FRONT: SpriteSpec = crossing('fx.p.glow', [
  { t: 0, x: -50, a: 0 },
  { t: 1, x: 50, a: 0 },
]);

/** A prop dropped at a fixed spot of the zone (x in % of the zone, -50..50) that lands with a squash. */
function dropIn(sprite: string, x: number, delay: number, o: { y?: number; scale?: number; from?: number; r?: number; tint?: number } = {}): SpriteSpec {
  const y = o.y ?? 0;
  const s = o.scale ?? 1;
  const r = o.r ?? 0;
  return {
    sprite,
    life: 0,
    delay,
    moveBy: 'zone',
    ...(o.tint !== undefined ? { tint: o.tint } : {}),
    keys: [
      { t: 0, x, y: y - (o.from ?? 40), sx: s * 0.8, sy: s * 1.2, a: 0, r: r - 30 },
      { t: 0.012, x, y: y - (o.from ?? 40) * 0.5, a: 1, r: r - 12 },
      { t: 0.022, x, y, sx: s * 1.3, sy: s * 0.7, r },
      { t: 0.032, x, y: y - 3, sx: s * 0.92, sy: s * 1.08, r },
      { t: 0.042, x, y, sx: s, sy: s, r },
      { t: 0.94, x, y, sx: s, sy: s, a: 1, r },
      { t: 1, x, y: y + 2, sx: s * 1.05, sy: s * 0.6, a: 0, r },
    ],
  };
}

/** The flight of a thrown or fired strike projectile from the caster's side into the target (origin). */
function strikeFlight(sprite: string, fromX: number, fromY: number, arriveT: number, life: number, scale: number, stick: boolean): SpriteSpec[] {
  const r = (Math.atan2(-fromY, -fromX) * 180) / Math.PI;
  const len = Math.hypot(fromX, fromY);
  const keys: SpriteKey[] = [
    { t: 0, x: fromX, y: fromY, r, sx: scale * 1.3, sy: scale * 0.8, a: 1 },
    { t: arriveT, x: 0, y: 0, r, sx: scale * 1.1, sy: scale * 0.9, a: 1 },
  ];
  if (stick) {
    // embedded: a thunk forward, then it quivers and fades
    keys.push(
      { t: arriveT + 0.03, x: 3, y: 1.5, r, sx: scale, sy: scale },
      { t: arriveT + 0.08, x: 2, y: 1, r: r + 5, sx: scale, sy: scale },
      { t: arriveT + 0.14, x: 2, y: 1, r: r - 4 },
      { t: arriveT + 0.2, x: 2, y: 1, r: r + 2 },
      { t: arriveT + 0.26, x: 2, y: 1, r, a: 1 },
      { t: 1, x: 2, y: 4, r: r + 8, a: 0 },
    );
  } else {
    keys.push({ t: arriveT + 0.001, x: 0, y: 0, r, a: 0 }, { t: 1, x: 0, y: 0, r, a: 0 });
  }
  return [
    // a motion streak along the flight path
    { sprite: 'fx.p.beam', life: Math.round(life * arriveT) + 110, keys: [{ t: 0, x: fromX, y: fromY, r, sx: 0, sy: 0.9 * scale, a: 0.7 }, { t: 0.5, x: fromX, y: fromY, r, sx: len / 10, sy: 0.7 * scale, a: 0.55 }, { t: 1, x: fromX, y: fromY, r, sx: len / 10, sy: 0.2, a: 0 }], tint: 0xfff6e2 },
    { sprite, life, keys },
  ];
}

export function powerFxRecipes(k: FxKit): FxRecipe[] {
  const { flash, ring, smoke, sparks, dust, chunks, bloom, scorch } = k;

  /** Dirt thrown up by a shell or a charge (the family's shared follow-through). */
  const clods = (count: number, speed: Range = [140, 280], delay?: Range): ParticleSpec => ({
    sprite: 'fx.p.clod',
    count,
    life: [500, 850],
    speed,
    angle: [-125, -55],
    spread: 6,
    gravity: 820,
    scale: [1.3, 1.1],
    alpha: [1, 0.4],
    spin: [-500, 500],
    ...(delay ? { delay } : {}),
  });

  return [
    // -----------------------------------------------------------------------------------------
    // Shared cues

    {
      // A persistent tinted zone decal under a field: whose it is (team colour) and how far it reaches.
      id: 'fx.field_zone',
      durationMs: 4000,
      loops: true,
      sprites: [
        { sprite: 'fx.p.groundDisc', life: 0, sizeWith: 'zone', tint: 'team', keys: [{ t: 0, sx: 0.5, sy: 0.08, a: 0 }, { t: 0.04, sx: 1.04, sy: 0.15, a: 0.3 }, { t: 0.07, sx: 1, sy: 0.14, a: 0.24 }, { t: 0.93, sx: 1, sy: 0.14, a: 0.24 }, { t: 1, sx: 1.02, sy: 0.14, a: 0 }] },
        { sprite: 'fx.p.groundRing', life: 0, sizeWith: 'zone', tint: 'team', keys: [{ t: 0, sx: 0.5, sy: 0.08, a: 0 }, { t: 0.04, sx: 1.05, sy: 0.15, a: 0.9 }, { t: 0.07, sx: 1, sy: 0.14, a: 0.7 }, { t: 0.93, sx: 1, sy: 0.14, a: 0.7 }, { t: 1, sx: 1.03, sy: 0.14, a: 0 }] },
        { sprite: 'fx.p.groundRing', life: 0, loop: 1100, sizeWith: 'zone', tint: 'team', keys: [{ t: 0, sx: 0.55, sy: 0.08, a: 0.5 }, { t: 1, sx: 1, sy: 0.14, a: 0 }] },
      ],
    },
    {
      // The strike lock: a team-tinted reticle that closes on its target through the telegraph.
      id: 'fx.target_lock',
      durationMs: 1500,
      loops: true,
      sprites: [
        { sprite: 'fx.p.lock', life: 0, tint: 'team', keys: [{ t: 0, sx: 3.4, sy: 3.4, a: 0, r: -60 }, { t: 0.25, sx: 2.2, sy: 2.2, a: 1, r: -10 }, { t: 0.7, sx: 1.7, sy: 1.7, a: 1, r: 0 }, { t: 0.9, sx: 1.45, sy: 1.45, a: 1, r: 0 }, { t: 1, sx: 1.2, sy: 1.2, a: 1, r: 0 }] },
        { sprite: 'fx.p.ring', life: 0, loop: 500, tint: 'team', keys: [{ t: 0, sx: 2.4, sy: 2.4, a: 0 }, { t: 0.3, sx: 1.8, sy: 1.8, a: 0.6 }, { t: 1, sx: 1.2, sy: 1.2, a: 0 }] },
        { sprite: 'fx.p.glint', life: 0, loop: 500, keys: [{ t: 0, sx: 0.3, sy: 0.3, a: 0 }, { t: 0.15, sx: 0.7, sy: 0.7, a: 1, r: 45 }, { t: 0.4, sx: 0.2, sy: 0.2, a: 0, r: 90 }, { t: 1, sx: 0.2, sy: 0.2, a: 0 }] },
      ],
    },
    {
      // A silenced mount (Suppress): the mount's gear seizes and shorts out, crackling arcs and sparks
      // and a thin trail of smoke for the whole silence. The jam mark itself is the render's overlay
      // (powerTargeting), so this is only the physical side. Lasts the silence (o.durationMs).
      id: 'fx.turret_jammed',
      durationMs: 5000,
      loops: true,
      sprites: [
        { ...flash(1.6, 0xe7dcff, 80), keys: [{ t: 0, y: -8, sx: 1, sy: 1, a: 1 }, { t: 1, y: -8, sx: 2.2, sy: 2.2, a: 0 }] },
        // a slow sick glow (0.7 s), never a strobe
        { sprite: 'fx.p.glow', life: 0, loop: 700, blendAdd: true, tint: 0xe7dcff, keys: [{ t: 0, y: -8, sx: 1.2, sy: 1.2, a: 0.08 }, { t: 0.5, y: -8, sx: 1.6, sy: 1.6, a: 0.35 }, { t: 1, y: -8, sx: 1.2, sy: 1.2, a: 0.08 }] },
      ],
      particles: [
        { sprite: 'fx.p.bolt', rate: 12, life: [80, 160], box: [10, 8], speed: [60, 140], angle: [-180, 0], spread: 8, scale: [1.2, 0.5], alpha: [1, 0], align: true, tint: 0xe7dcff },
        { sprite: 'fx.p.spark', rate: 10, life: [160, 300], box: [8, 6], speed: [80, 180], angle: [-160, -20], spread: 6, gravity: 420, scale: [1.2, 0.4], alpha: [1, 0], align: true },
        { sprite: 'fx.p.smoke', rate: 4, life: [700, 1100], box: [6, 4], speed: [10, 30], angle: [-110, -70], spread: 6, gravity: -40, scale: [0.6, 1.6], alpha: [0.55, 0], tint: 0x8e8984 },
      ],
    },
    {
      // A mount undermined (Undermine): its footing cracks, grit and stones trickle and dust puffs out
      // while it is silenced. The jam mark itself is the render's overlay.
      id: 'fx.jammed_rubble',
      durationMs: 5000,
      loops: true,
      sprites: [{ ...ring(2.4, 360, 0xd8ccb4, 0.5), keys: [{ t: 0, y: 6, sx: 0.6, sy: 0.3, a: 0.9 }, { t: 1, y: 6, sx: 2.4, sy: 1, a: 0 }] }],
      particles: [
        { ...dust(6, 1.4), tint: 0xcfc4b0 },
        { ...chunks(4), tint: 0x8a7e70 },
        { sprite: 'fx.p.rock', rate: 5, life: [400, 700], box: [12, 4], speed: [20, 70], angle: [-120, -60], gravity: 700, scale: [1, 0.8], alpha: [1, 0.4], spin: [-400, 400], tint: 0x8a7e70 },
        { sprite: 'fx.p.dust', rate: 4, life: [700, 1100], box: [12, 4], speed: [10, 30], angle: [-110, -70], gravity: -20, scale: [0.8, 1.8], alpha: [0.6, 0], tint: 0xcfc4b0 },
      ],
    },
    {
      // A signal at the caster's base when a power is committed (the "whose power" cue).
      id: 'fx.power_cast_cue',
      durationMs: 700,
      sprites: [
        { sprite: 'fx.p.streak', life: 520, tint: 'team', keys: [{ t: 0, sx: 0.6, sy: 0.1, a: 0 }, { t: 0.2, sx: 1.2, sy: 1.1, a: 0.9 }, { t: 1, sx: 0.4, sy: 1.5, a: 0, y: -40 }] },
        { ...ring(2.4, 420, 0xffffff, 0.35), tint: 'team' },
        bloom(1.6, 420, 0xfff6e2, 0.5),
      ],
      particles: [{ sprite: 'fx.p.xp', count: 6, life: [400, 650], speed: [60, 140], angle: [-110, -70], spread: 6, gravity: 60, scale: [1, 0.4], alpha: [1, 0], tint: 0xfff6e2, blendAdd: true }],
    },

    // -----------------------------------------------------------------------------------------
    // Telegraph decorations (anticipation; they last exactly the power's telegraph)

    {
      // Something is coming from the sky: a shadow gathers over the zone.
      id: 'fx.tele_shadow',
      durationMs: 1000,
      loops: true,
      sprites: [
        { sprite: 'fx.p.shadow', life: 0, sizeWith: 'zone', keys: [{ t: 0, sx: 0.3, sy: 0.6, a: 0 }, { t: 0.6, sx: 0.8, sy: 0.9, a: 0.28 }, { t: 1, sx: 1, sy: 1, a: 0.45 }] },
        { sprite: 'fx.p.shadow', life: 0, loop: 330, sizeWith: 'zone', keys: [{ t: 0, sx: 0.9, sy: 1, a: 0.12 }, { t: 0.5, sx: 1, sy: 1.1, a: 0.2 }, { t: 1, sx: 0.9, sy: 1, a: 0.12 }] },
      ],
      particles: [{ sprite: 'fx.p.dust', rate: 8, life: [300, 500], box: [45, 1], sizeWith: 'zone', speed: [10, 30], angle: [-120, -60], scale: [0.3, 0.6], alpha: [0.6, 0], tint: 0xc9bfae }],
    },
    {
      // The ground trembles where a sweep or a charge starts: hopping pebbles and puffs.
      id: 'fx.tele_rumble',
      durationMs: 1000,
      loops: true,
      particles: [
        { sprite: 'fx.p.rock', rate: 16, life: [260, 380], box: [45, 1], sizeWith: 'zone', speed: [60, 120], angle: [-110, -70], gravity: 900, scale: [0.6, 0.5], alpha: [1, 0.6], spin: [-400, 400], tint: 0x8a7e70 },
        { sprite: 'fx.p.dust', rate: 12, life: [300, 500], box: [45, 1], sizeWith: 'zone', speed: [10, 40], angle: [-150, -30], scale: [0.4, 0.9], alpha: [0.7, 0], tint: 0xd8ccb4 },
      ],
    },
    {
      // A strike is aimed: a glint from the caster's side and a faint sight line to the target.
      id: 'fx.tele_glint',
      durationMs: 1500,
      loops: true,
      sprites: [
        { sprite: 'fx.p.glint', life: 0, loop: 500, keys: [{ t: 0, x: -130, y: -150, sx: 0.4, sy: 0.4, a: 0, r: 0 }, { t: 0.12, x: -130, y: -150, sx: 1.6, sy: 1.6, a: 1, r: 30 }, { t: 0.35, x: -130, y: -150, sx: 0.5, sy: 0.5, a: 0.2, r: 60 }, { t: 1, x: -130, y: -150, sx: 0.4, sy: 0.4, a: 0 }] },
        { sprite: 'fx.p.beam', life: 0, keys: [{ t: 0, x: -130, y: -150, r: 49.1, sx: 19.8, sy: 0.18, a: 0 }, { t: 0.4, x: -130, y: -150, r: 49.1, sx: 19.8, sy: 0.18, a: 0.35 }, { t: 1, x: -130, y: -150, r: 49.1, sx: 19.8, sy: 0.3, a: 0.6 }], tint: 0xfff6e2 },
      ],
    },
    {
      // A field is forming: motes drawn inward toward the centre.
      id: 'fx.tele_gather',
      durationMs: 1000,
      loops: true,
      sprites: [{ sprite: 'fx.p.groundRing', life: 0, sizeWith: 'zone', tint: 'team', keys: [{ t: 0, sx: 1.4, sy: 0.2, a: 0 }, { t: 0.5, sx: 1.15, sy: 0.16, a: 0.5 }, { t: 1, sx: 1, sy: 0.14, a: 0.8 }] }],
      particles: [{ sprite: 'fx.p.xp', rate: 22, life: [400, 600], box: [55, 6], sizeWith: 'zone', attract: 5, speed: [0, 10], scale: [0.9, 0.3], alpha: [0, 1], tint: 0xf4ecd8 }],
    },

    {
      // A rally is called (buffs, 0.5 s): each unit about to be buffed draws a ring of light in.
      id: 'fx.tele_rally',
      durationMs: 500,
      loops: true,
      sprites: [
        { sprite: 'fx.p.ring', life: 0, tint: 'team', keys: [{ t: 0, y: 10, sx: 3.2, sy: 1, a: 0 }, { t: 0.4, y: 6, sx: 2.2, sy: 0.7, a: 0.7 }, { t: 1, y: 2, sx: 1.2, sy: 0.4, a: 0.9 }] },
        { sprite: 'fx.p.glow', life: 0, blendAdd: true, tint: 0xfff0d6, keys: [{ t: 0, sx: 0.6, sy: 0.6, a: 0 }, { t: 1, sx: 1.8, sy: 1.8, a: 0.4 }] },
      ],
      particles: [{ sprite: 'fx.p.xp', rate: 20, life: [250, 400], box: [22, 20], attract: 5, speed: [0, 10], scale: [0.9, 0.3], alpha: [0, 1], tint: 0xfff0d6 }],
    },
    {
      // Undermine's telegraph (1.5 s) at the enemy wall: the sappers' fuse fizzes underground, the
      // ground twitches and dust leaks from the cracks. Anchored at the base front (ground at y 44).
      id: 'fx.tele_sap',
      durationMs: 1500,
      loops: true,
      sprites: [{ sprite: 'fx.p.petrify', life: 0, keys: [{ t: 0, x: -24, y: 46, sx: 0.1, sy: 1.6, a: 0 }, { t: 0.6, x: -24, y: 46, sx: 1.2, sy: 2.4, a: 0.8 }, { t: 1, x: -24, y: 46, sx: 2, sy: 3, a: 1 }], tint: 0x4a4540 }],
      particles: [
        { sprite: 'fx.p.dust', rate: 16, life: [400, 700], box: [60, 2], speed: [20, 60], angle: [-120, -60], gravity: -10, scale: [1, 2.4], alpha: [0.85, 0], tint: 0x9a8a74 },
        { sprite: 'fx.p.rock', rate: 12, life: [250, 400], box: [60, 2], speed: [60, 130], angle: [-110, -70], gravity: 900, scale: [1.3, 1], alpha: [1, 0.5], spin: [-400, 400], tint: 0x6e665c },
        { sprite: 'fx.p.sparkHot', rate: 8, life: [120, 220], box: [40, 2], speed: [40, 120], angle: [-150, -30], gravity: 300, scale: [0.9, 0.3], alpha: [1, 0], align: true },
      ],
    },
    {
      // EMP Blackout's telegraph (1.5 s) at the enemy wall: charge builds, crawling arcs and a
      // tightening ring of mint light before the pulse.
      id: 'fx.tele_charge',
      durationMs: 1500,
      loops: true,
      sprites: [
        { sprite: 'fx.p.ring', life: 0, loop: 500, tint: 0x3af0b4, keys: [{ t: 0, y: -40, sx: 9, sy: 7, a: 0 }, { t: 0.5, y: -40, sx: 5, sy: 4, a: 0.5 }, { t: 1, y: -40, sx: 1.4, sy: 1.1, a: 0 }] },
        { sprite: 'fx.p.glow', life: 0, blendAdd: true, tint: 0xd8fff0, keys: [{ t: 0, y: -40, sx: 1, sy: 1, a: 0 }, { t: 1, y: -40, sx: 4, sy: 4, a: 0.5 }] },
      ],
      particles: [
        { sprite: 'fx.p.bolt', rate: 16, life: [80, 160], box: [60, 50], speed: [40, 120], angle: [-180, 180], scale: [1.1, 0.5], alpha: [1, 0], align: true, tint: 0xd8fff0 },
        { sprite: 'fx.p.nanite', rate: 20, life: [400, 600], box: [70, 60], attract: 6, speed: [0, 10], scale: [1, 0.3], alpha: [0, 1], tint: 0x3af0b4 },
      ],
    },
    {
      // AA Screen's telegraph (0.5 s): the anti-aircraft guns open up: tracers climb into the sky over
      // the zone before the shells burst.
      id: 'fx.tele_flak',
      durationMs: 500,
      loops: true,
      particles: [
        { sprite: 'fx.p.spark', rate: 40, life: [200, 320], box: [40, 1], sizeWith: 'zone', speed: [520, 700], angle: [-100, -80], scale: [1.6, 1], alpha: [1, 0.3], align: true },
        { sprite: 'fx.p.smoke', rate: 6, life: [400, 700], box: [40, 1], sizeWith: 'zone', speed: [10, 30], angle: [-110, -70], gravity: -30, scale: [0.4, 1.1], alpha: [0.5, 0], tint: 0x9a9690 },
      ],
    },

    // -----------------------------------------------------------------------------------------
    // Stone

    {
      // Rockslide (Home sweep): a landslide of tumbling boulders behind a dust front, left to right.
      id: 'fx.rockslide',
      durationMs: 1500,
      loops: true,
      sprites: [
        SWEEP_FRONT,
        crossing('fx.p.smoke', [{ t: 0, x: -58, y: -30, sx: 3.6, sy: 2.8, a: 0 }, { t: 0.1, x: -52, y: -40, sx: 6.2, sy: 4.8, a: 0.95 }, { t: 0.9, x: 44, y: -42, sx: 6.6, sy: 5.2, a: 0.95 }, { t: 1, x: 50, y: -48, sx: 7.2, sy: 5.6, a: 0 }], { tint: 0xcfc3ab }),
        crossing('fx.p.smoke', [{ t: 0, x: -62, y: -14, sx: 3, sy: 2, a: 0 }, { t: 0.12, x: -56, y: -18, sx: 5, sy: 3.2, a: 0.85 }, { t: 0.9, x: 40, y: -18, sx: 5.4, sy: 3.4, a: 0.85 }, { t: 1, x: 46, y: -22, sx: 6, sy: 3.8, a: 0 }], { tint: 0xa89c88 }),
        crossing('proj.boulder', [
          { t: 0, x: -58, y: -68.0, sx: 5.44, sy: 9.2, r: 0, a: 0 },
          { t: 0.06, x: -54, y: -17.0, sx: 6.12, sy: 7.5, r: 60, a: 1 },
          { t: 0.12, x: -48, y: -47.6, sx: 5.27, sy: 9.5, r: 130 },
          { t: 0.3, x: -30, y: -15.3, sx: 6.12, sy: 7.8, r: 330 },
          { t: 0.42, x: -18, y: -40.8, sx: 5.27, sy: 9.5, r: 480 },
          { t: 0.62, x: 2, y: -15.3, sx: 6.12, sy: 7.8, r: 700 },
          { t: 0.75, x: 16, y: -34.0, sx: 5.44, sy: 9.2, r: 860 },
          { t: 0.93, x: 36, y: -17.0, sx: 5.95, sy: 8.1, r: 1040 },
          { t: 1, x: 44, y: -20.4, sx: 5.44, sy: 9.2, r: 1100, a: 0 },
        ]),
        crossing('fx.p.slab', [
          { t: 0, x: -50, y: -54.0, sx: 2.88, sy: 5.2, r: 0, a: 0 },
          { t: 0.08, x: -44, y: -16.2, sx: 3.42, sy: 4.2, r: 80, a: 1 },
          { t: 0.24, x: -26, y: -43.2, sx: 2.88, sy: 5.2, r: 220 },
          { t: 0.46, x: -4, y: -14.4, sx: 3.42, sy: 4.2, r: 420 },
          { t: 0.64, x: 14, y: -39.6, sx: 2.88, sy: 5.2, r: 580 },
          { t: 0.86, x: 38, y: -14.4, sx: 3.42, sy: 4.2, r: 780 },
          { t: 1, x: 50, y: -18.0, sx: 2.88, sy: 5.2, r: 860, a: 0 },
        ]),
        crossing('proj.boulder', [
          { t: 0, x: -62, y: -34.0, sx: 3.74, sy: 6.4, r: 0, a: 0 },
          { t: 0.1, x: -56, y: -11.9, sx: 4.25, sy: 5.2, r: 90, a: 1 },
          { t: 0.28, x: -40, y: -34.0, sx: 3.57, sy: 6.6, r: 300 },
          { t: 0.5, x: -18, y: -10.2, sx: 4.25, sy: 5.2, r: 560 },
          { t: 0.7, x: 6, y: -30.6, sx: 3.57, sy: 6.6, r: 790 },
          { t: 0.9, x: 30, y: -10.2, sx: 4.25, sy: 5.2, r: 1010 },
          { t: 1, x: 40, y: -13.6, sx: 3.74, sy: 6.4, r: 1100, a: 0 },
        ]),
      ],
      particles: [
        { sprite: 'fx.p.dust', rate: 50, life: [500, 950], speed: [30, 90], angle: [-175, -95], spread: 20, gravity: -12, drag: 1.5, scale: [1.6, 3.8], alpha: [0.9, 0], followMove: true, tint: 0xd8ccb4 },
        { sprite: 'fx.p.rock', rate: 24, life: [420, 700], speed: [140, 300], angle: [-150, -50], spread: 14, gravity: 820, scale: [2, 1.6], alpha: [1, 0.5], spin: [-600, 600], followMove: true, tint: 0x8a7e70 },
        { sprite: 'fx.p.rock2', rate: 12, life: [420, 700], speed: [110, 240], angle: [-140, -60], spread: 14, gravity: 820, scale: [1.8, 1.5], alpha: [1, 0.5], spin: [-600, 600], followMove: true, tint: 0x6e665c },
        { ...dust(12, 2.6), delay: [1400, 1500], tint: 0xd8ccb4 },
      ],
    },
    {
      // Sticky Tar (Home snare): a glossy pitch pool splats down and bubbles for the field's duration.
      id: 'fx.sticky_tar',
      durationMs: 6000,
      loops: true,
      sprites: [
        { sprite: 'fx.p.tarPool', life: 0, sizeWith: 'zone', keys: [{ t: 0, sx: 0.25, sy: 0.5, a: 0, y: 2 }, { t: 0.015, sx: 1.12, sy: 3.6, a: 1, y: 1 }, { t: 0.03, sx: 0.96, sy: 1.8, y: 2 }, { t: 0.045, sx: 1, sy: 2.2 }, { t: 0.93, sx: 1, sy: 2.2, a: 1 }, { t: 1, sx: 0.9, sy: 1.4, a: 0 }] },
        { sprite: 'fx.p.shadow', life: 0, sizeWith: 'zone', keys: [{ t: 0, sx: 0.3, sy: 1.2, a: 0 }, { t: 0.02, sx: 1.05, sy: 1.3, a: 0.35 }, { t: 0.93, a: 0.35 }, { t: 1, a: 0 }] },
      ],
      particles: [
        { sprite: 'fx.p.drop', count: 20, life: [420, 700], box: [40, 2], sizeWith: 'zone', speed: [120, 260], angle: [-130, -50], gravity: 900, scale: [2.6, 2], alpha: [1, 0.6], spin: [-200, 200], tint: 0x3a332d },
        { sprite: 'fx.p.tarBubble', rate: 9, life: [500, 900], box: [42, 3], sizeWith: 'zone', scale: [1, 2.6], alpha: [1, 0], tint: 0xffffff },
        { sprite: 'fx.p.snow', rate: 3, life: [300, 500], box: [40, 2], sizeWith: 'zone', speed: [4, 12], angle: [-100, -80], scale: [1, 0.3], alpha: [0.8, 0], tint: 0xe8e2d8 },
      ],
    },
    {
      // Hunt Cry (Field rally): war cry claws rise over each buffed hunter, with speed streaks.
      id: 'fx.hunt_cry',
      durationMs: 1100,
      sprites: [
        { sprite: 'fx.p.claw', life: 900, keys: [{ t: 0, y: -24, sx: 0.4, sy: 0.4, a: 0, r: -14 }, { t: 0.12, y: -40, sx: 1.5, sy: 1.5, a: 1, r: 4 }, { t: 0.22, y: -42, sx: 1.2, sy: 1.2, r: 0 }, { t: 1, y: -64, sx: 1.1, sy: 1.1, a: 0, r: 0 }] },
        { ...ring(3, 500, 0xede3c8, 0.4), delay: 40 },
        bloom(1.8, 420, 0xfff0d6, 0.45),
      ],
      particles: [
        { sprite: 'fx.p.spark', count: 5, life: [220, 360], speed: [160, 260], angle: [175, 185], spread: 16, scale: [1.3, 0.4], alpha: [0.9, 0], align: true, tint: 0xf4ecd8 },
        { ...dust(4, 0.8), delay: [0, 60] },
      ],
    },
    {
      // Hunter's Spear (Field strike): a flint spear hurled from the caster's side thunks into its target.
      id: 'fx.spear_throw',
      durationMs: 1100,
      sprites: [
        ...strikeFlight('fx.p.spear', -190, -95, 0.06, 1000, 2.2, true),
        { ...bloom(2.4, 300, 0xfff0d8, 0.7), delay: 60 },
        { ...flash(1.8, 0xffffff, 90), delay: 60 },
        { ...ring(3.4, 340, 0xf4ecd8, 0.8), delay: 60 },
      ],
      particles: [{ ...dust(10, 1.6), delay: [60, 90] }, { ...chunks(5), delay: [60, 80], tint: 0x9a8e7c }, { ...sparks(6, [140, 260]), delay: [60, 70] }],
    },

    {
      // Pebble Hail (Field lane volley, X0): a fistful of sling pebbles arcs down on each unit it screens.
      id: 'fx.pebble_hail',
      durationMs: 900,
      fall: { sprite: 'proj.rock', count: 3, fromX: -90, fromY: -260, spreadX: 12, fallMs: 240, impact: 'fx.pebble_pop', scale: 1.5 },
    },
    {
      // A pebble cracking on the ground: a chip spray and a little dust.
      id: 'fx.pebble_pop',
      durationMs: 520,
      sprites: [ring(1.4, 260, 0xe8dcc4, 0.35)],
      particles: [
        { sprite: 'fx.p.rock2', count: 3, life: [260, 420], speed: [80, 160], angle: [-150, -30], spread: 10, gravity: 820, scale: [0.9, 0.7], alpha: [1, 0.4], spin: [-600, 600], tint: 0x9a8e7e },
        { ...dust(3, 0.7), tint: 0xd8ccb4 },
      ],
    },
    {
      // Tangle Vines (Home pull, X0): a root bed bursts open, thorny tendrils whip up and sway for the
      // field's 4 s, leaves drift off. Tendril spots assume the 300 lu zone; the bed scales with it.
      id: 'fx.tangle_vines',
      durationMs: 4000,
      loops: true,
      sprites: [
        { sprite: 'fx.p.shadow', life: 0, sizeWith: 'zone', keys: [{ t: 0, sx: 0.3, sy: 1.2, a: 0 }, { t: 0.03, sx: 1.02, sy: 1.3, a: 0.3 }, { t: 0.94, a: 0.3 }, { t: 1, a: 0 }] },
        { sprite: 'fx.p.vineMat', life: 0, sizeWith: 'zone', keys: [{ t: 0, sx: 0.2, sy: 0.4, a: 0, y: 2 }, { t: 0.025, sx: 1.06, sy: 2.4, a: 1, y: 1 }, { t: 0.045, sx: 0.98, sy: 1.6, y: 2 }, { t: 0.06, sx: 1, sy: 1.9 }, { t: 0.94, sx: 1, sy: 1.9, a: 1 }, { t: 1, sx: 0.94, sy: 1.2, a: 0 }] },
        ...[-128, -96, -66, -34, -6, 24, 52, 82, 112, 136].map((x, i): SpriteSpec => {
          const s = 1.6 + (i % 3) * 0.35;
          const f = i % 2 === 0 ? 1 : -1;
          const d = (i * 0.007) % 0.03;
          return {
            sprite: 'fx.p.vine',
            life: 0,
            keys: [
              { t: 0, x, y: 2, sx: s * 0.4 * f, sy: 0, a: 0, r: 0 },
              { t: 0.02 + d, x, y: 2, sx: s * 0.4 * f, sy: 0.05, a: 1, r: 0 },
              { t: 0.045 + d, x, y: 1, sx: s * 0.85 * f, sy: s * 1.3, r: -12 * f },
              { t: 0.07 + d, x, y: 1, sx: s * f, sy: s * 0.92, r: 8 * f },
              { t: 0.1 + d, x, y: 1, sx: s * f, sy: s, r: -3 * f },
              { t: 0.3, x, y: 1, sx: s * f, sy: s * 1.04, r: 6 * f },
              { t: 0.5, x, y: 1, sx: s * f, sy: s * 0.97, r: -5 * f },
              { t: 0.7, x, y: 1, sx: s * f, sy: s * 1.04, r: 6 * f },
              { t: 0.9, x, y: 1, sx: s * f, sy: s, r: -2 * f, a: 1 },
              { t: 1, x, y: 2, sx: s * 0.6 * f, sy: 0.1, r: 0, a: 0 },
            ],
          };
        }),
      ],
      particles: [
        { sprite: 'fx.p.clod', count: 14, life: [380, 640], box: [44, 2], sizeWith: 'zone', speed: [110, 220], angle: [-130, -50], gravity: 880, scale: [1.3, 1], alpha: [1, 0.5], spin: [-400, 400], tint: 0x6e5c48 },
        { ...dust(10, 1.4), box: [44, 2], sizeWith: 'zone', tint: 0xcfc4a8 },
        { sprite: 'fx.p.leaf', rate: 5, life: [900, 1500], box: [42, 4], sizeWith: 'zone', speed: [18, 46], angle: [-120, -60], gravity: 30, drag: 0.6, scale: [1.6, 1.2], alpha: [1, 0], spin: [-260, 260] },
      ],
    },

    // -----------------------------------------------------------------------------------------
    // Bronze Age: Hellas

    {
      // Zeus's Bolts: a thunderhead gathers over the zone during the telegraph and lingers over the barrage.
      id: 'fx.storm_cloud',
      durationMs: 2900,
      sprites: [
        { sprite: 'fx.p.stormCloud', life: 2900, sizeWith: 'zone', keys: [{ t: 0, y: -170, sx: 0.4, sy: 0.9, a: 0 }, { t: 0.3, y: -205, sx: 0.95, sy: 1.5, a: 0.9 }, { t: 0.86, y: -210, sx: 1.05, sy: 1.6, a: 0.9 }, { t: 1, y: -220, sx: 1.15, sy: 1.6, a: 0 }] },
        { sprite: 'fx.p.glow', life: 0, loop: 700, blendAdd: true, sizeWith: 'zone', keys: [{ t: 0, y: -205, sx: 0.4, sy: 1.2, a: 0 }, { t: 0.1, y: -205, sx: 0.45, sy: 1.6, a: 0.35 }, { t: 0.2, y: -205, sx: 0.4, sy: 1.2, a: 0 }, { t: 1, y: -205, sx: 0.4, sy: 1.2, a: 0 }], tint: 0xe7dcff },
        { sprite: 'fx.p.shadow', life: 2900, sizeWith: 'zone', keys: [{ t: 0, sx: 0.4, a: 0 }, { t: 0.3, sx: 1, a: 0.3 }, { t: 0.86, sx: 1, a: 0.3 }, { t: 1, sx: 1.1, a: 0 }] },
      ],
    },
    {
      // One of Zeus's bolts: a jagged white-lilac bolt cracks down, scorches and throws sparks.
      id: 'fx.lightning_bolt',
      durationMs: 800,
      sprites: [
        scorch(1.6, 700),
        { sprite: 'fx.p.lightning', life: 300, jitter: { x: 6, r: 4, s: [0.9, 1.1] }, keys: [{ t: 0, sx: 1.1, sy: 0.7, a: 1 }, { t: 0.14, sx: 1, sy: 0.7, a: 1 }, { t: 0.2, sx: 0.9, sy: 0.7, a: 0.15 }, { t: 0.3, sx: 1, sy: 0.7, a: 1 }, { t: 1, sx: 0.7, sy: 0.7, a: 0 }] },
        bloom(2.6, 320, 0xe7dcff, 0.75),
        flash(1.6, 0xffffff, 70),
        ring(3, 300, 0xe7dcff, 0.35),
      ],
      particles: [
        { sprite: 'fx.p.bolt', count: 6, life: [120, 240], speed: [140, 280], angle: [-170, -10], spread: 4, scale: [1.1, 0.5], alpha: [1, 0], align: true, tint: 0xe7dcff },
        sparks(5, [140, 260]),
        dust(5, 1),
        { sprite: 'fx.p.smoke', count: 2, life: [500, 800], speed: [10, 30], angle: [-110, -70], spread: 6, gravity: -30, scale: [0.5, 1.1], alpha: [0.5, 0], tint: 0x9a9690, delay: [80, 140] },
      ],
    },
    {
      // Medusa's Gaze (Home stun): the Gorgon's eye opens over the zone and its gaze turns the ground to stone.
      id: 'fx.medusa_gaze',
      durationMs: 2100,
      sprites: [
        { sprite: 'fx.p.petrify', life: 2000, sizeWith: 'zone', keys: [{ t: 0, sx: 0.05, sy: 1, a: 0, y: 2 }, { t: 0.07, sx: 0.1, a: 0.9 }, { t: 0.16, sx: 1, a: 0.9 }, { t: 0.85, sx: 1, a: 0.8 }, { t: 1, sx: 1, a: 0 }] },
        { sprite: 'fx.p.groundRing', life: 700, delay: 110, sizeWith: 'zone', keys: [{ t: 0, sx: 0.2, sy: 0.05, a: 0.9 }, { t: 1, sx: 1.1, sy: 0.16, a: 0 }], tint: 0xd6ecc4 },
        { sprite: 'fx.p.wedge', life: 900, delay: 100, keys: [{ t: 0, y: -112, r: 90, sx: 1, sy: 1.2, a: 0 }, { t: 0.12, y: -112, r: 90, sx: 5.4, sy: 4.4, a: 0.4 }, { t: 0.5, y: -112, r: 90, sx: 5.6, sy: 4.6, a: 0.2 }, { t: 1, y: -112, r: 90, sx: 5.6, sy: 4.6, a: 0 }], tint: 0xd6ecc4 },
        { sprite: 'fx.p.gorgonEye', life: 2000, keys: [{ t: 0, y: -118, sx: 0.4, sy: 0.05, a: 0 }, { t: 0.03, y: -120, sx: 2.2, sy: 0.25, a: 1 }, { t: 0.05, y: -120, sx: 2.4, sy: 0.3, a: 1 }, { t: 0.08, y: -122, sx: 2.3, sy: 2.6, a: 1 }, { t: 0.11, y: -121, sx: 2.2, sy: 2.2, a: 1 }, { t: 0.7, y: -124, sx: 2.2, sy: 2.2, a: 1 }, { t: 0.82, y: -124, sx: 2.3, sy: 0.3, a: 1 }, { t: 1, y: -126, sx: 1.6, sy: 0.05, a: 0 }] },
        { ...bloom(3, 500, 0xe4f2dc, 0.5), delay: 100 },
      ],
      particles: [
        { ...dust(14, 1.1), box: [42, 2], sizeWith: 'zone', delay: [140, 260], tint: 0xb9b4ae },
        { sprite: 'fx.p.xp', count: 10, life: [600, 1000], box: [40, 20], sizeWith: 'zone', delay: [120, 220], speed: [10, 30], angle: [-100, -80], scale: [1, 0.3], alpha: [1, 0], tint: 0xd6ecc4 },
      ],
    },
    {
      // Chariot Rush (Field charge): bronze chariots burst out of a dust cloud and thunder down the lane.
      id: 'fx.chariot_rush',
      durationMs: 1111,
      timedBy: 'run',
      sprites: [runner('fx.p.chariot', 170, 5, 3, 1.6), pennantOn(170, 5, -23, -74, 1)],
      particles: [
        { ...dust(6, 1.6), tint: 0xd8ccb4 },
        { sprite: 'fx.p.dust', rate: 24, life: [360, 640], speed: [10, 50], angle: [-175, -120], spread: 8, scale: [0.7, 1.6], alpha: [0.8, 0], followMove: true, tint: 0xd8ccb4 },
        { sprite: 'fx.p.rock', rate: 12, life: [260, 420], speed: [80, 160], angle: [-160, -110], spread: 8, gravity: 800, scale: [0.8, 0.6], alpha: [1, 0.5], spin: [-500, 500], followMove: true, tint: 0x8a7e70 },
        { ...dust(5, 1.5), atEnd: true, followMove: true, tint: 0xd8ccb4 },
      ],
    },
    {
      // Apollo's Arrow (Field strike): a golden arrow falls from the sun and bursts in light.
      id: 'fx.golden_arrow',
      durationMs: 1100,
      sprites: [
        ...strikeFlight('fx.p.goldArrow', -120, -280, 0.06, 1000, 1.7, true),
        { sprite: 'fx.p.sunburst', life: 620, delay: 60, keys: [{ t: 0, sx: 1.2, sy: 1.2, a: 1, r: 0 }, { t: 0.2, sx: 6, sy: 6, a: 0.95, r: 20 }, { t: 1, sx: 7.6, sy: 7.6, a: 0, r: 50 }], tint: 0xfff0cc },
        { sprite: 'fx.p.pillar', life: 420, delay: 40, keys: [{ t: 0, sx: 0.6, sy: 2.2, a: 0.9 }, { t: 0.2, sx: 1.4, sy: 2.2, a: 0.7 }, { t: 1, sx: 0.2, sy: 2.2, a: 0 }], tint: 0xfff2d6, blendAdd: true },
        { ...bloom(3.6, 480, 0xfff2d6, 0.8), delay: 60 },
        { ...flash(2.2, 0xffffff, 80), delay: 60 },
        { ...ring(4.6, 420, 0xfff2d6, 0.8), delay: 60 },
      ],
      particles: [
        { sprite: 'fx.p.xp', count: 16, life: [420, 800], speed: [120, 260], angle: [-180, 0], spread: 4, delay: [60, 80], gravity: 120, scale: [1.8, 0.4], alpha: [1, 0], tint: 0xfff2d6, blendAdd: true },
        { ...sparks(4, [140, 240]), delay: [60, 70] },
      ],
    },

    // -----------------------------------------------------------------------------------------
    // Medieval

    {
      // Caltrops (Home snare): a scatter of iron caltrops rains onto the zone and glints there.
      id: 'fx.caltrops',
      durationMs: 8000,
      loops: true,
      sprites: [
        ...[-44, -30, -18, -6, 6, 18, 30, 44].map((x, i) => dropIn('fx.p.caltrop', x, i * 25, { y: i % 2 === 0 ? 2 : -2, scale: 2.6, from: 70, r: (i * 47) % 40 - 20 })),
        ...[-38, -12, 12, 38].map((x, i) => dropIn('fx.p.caltrop', x, 60 + i * 30, { y: 4, scale: 2.2, from: 60, r: 15 })),
      ],
      particles: [
        { ...dust(8, 0.9), box: [44, 2], sizeWith: 'zone', delay: [120, 220] },
        { sprite: 'fx.p.glint', rate: 2.5, life: [260, 420], box: [44, 3], sizeWith: 'zone', scale: [0.5, 0.1], alpha: [1, 0], spin: [90, 180] },
      ],
    },
    {
      // Boiling Oil (Home sweep): a surge of scalding oil rolls across the zone in a cloud of steam.
      id: 'fx.boiling_oil',
      durationMs: 1000,
      loops: true,
      sprites: [
        crossing('fx.p.oilWave', [{ t: 0, x: -52, y: 0, sx: 1, sy: 0.6, a: 0 }, { t: 0.08, x: -48, sx: 2.2, sy: 2.4, a: 1 }, { t: 0.5, x: 0, sx: 2.5, sy: 2.1, a: 1 }, { t: 0.92, x: 46, sx: 2.3, sy: 1.8, a: 1 }, { t: 1, x: 50, sx: 1.6, sy: 0.6, a: 0 }]),
        { sprite: 'fx.p.tarPool', life: 0, sizeWith: 'zone', keys: [{ t: 0, x: -50, sx: 0, sy: 0.8, a: 0.9, y: 2 }, { t: 1, x: 0, sx: 1, sy: 0.8, a: 0.85, y: 2 }], tint: 0xb8a88e },
      ],
      particles: [
        { sprite: 'fx.p.smoke', rate: 44, life: [700, 1200], speed: [30, 80], angle: [-120, -60], spread: 16, gravity: -60, drag: 1.2, scale: [1.4, 3.4], alpha: [0.8, 0], followMove: true, tint: 0xf2eee8 },
        { sprite: 'fx.p.oilDrop', rate: 40, life: [320, 560], speed: [120, 260], angle: [-140, -40], spread: 14, gravity: 900, scale: [2.2, 1.6], alpha: [1, 0.6], followMove: true },
        { sprite: 'fx.p.smoke', count: 8, delay: [950, 1000], life: [900, 1500], speed: [10, 40], angle: [-110, -70], box: [45, 2], sizeWith: 'zone', gravity: -40, scale: [0.8, 1.8], alpha: [0.6, 0], tint: 0xf2eee8 },
      ],
    },
    {
      // Knights' Charge (Field charge): lances couched, knights gallop out of the dust in line.
      id: 'fx.knights_charge',
      durationMs: 1125,
      timedBy: 'run',
      sprites: [runner('fx.p.knight', 200, 6, 3, 1.45), pennantOn(200, 6, 43, -63, 0.75)],
      particles: [
        { ...dust(6, 1.6), tint: 0xd8ccb4 },
        { sprite: 'fx.p.dust', rate: 24, life: [360, 640], speed: [10, 50], angle: [-175, -120], spread: 8, scale: [0.7, 1.6], alpha: [0.8, 0], followMove: true, tint: 0xd8ccb4 },
        { sprite: 'fx.p.clod', rate: 14, life: [260, 420], speed: [80, 170], angle: [-165, -110], spread: 8, gravity: 800, scale: [1, 0.8], alpha: [1, 0.5], spin: [-500, 500], followMove: true },
        { ...dust(5, 1.5), atEnd: true, followMove: true, tint: 0xd8ccb4 },
      ],
    },
    {
      // Undermine (Field Suppress), at the enemy's gate: the sappers fire their tunnel under the wall. A
      // dark geyser of earth and broken props bursts up along the wall foot, then rains back down.
      // Anchored at the base front (44 lu above the ground), so ground-level parts sit at y 44.
      id: 'fx.undermine',
      durationMs: 1800,
      sprites: [
        { sprite: 'fx.p.petrify', life: 1700, keys: [{ t: 0, x: -24, y: 46, sx: 0.3, sy: 2, a: 0 }, { t: 0.05, x: -24, y: 46, sx: 2.2, sy: 3.4, a: 1 }, { t: 0.8, a: 0.9 }, { t: 1, x: -24, y: 46, sx: 2.2, sy: 3.4, a: 0 }], tint: 0x4a4540 },
        { ...flash(2.2, 0xfff0d8, 80), keys: [{ t: 0, x: -24, y: 40, sx: 0.8, sy: 0.5, a: 0.9 }, { t: 1, x: -24, y: 36, sx: 2.4, sy: 1.2, a: 0 }] },
        { sprite: 'fx.p.pillar', life: 700, keys: [{ t: 0, x: -24, y: 46, sx: 1.2, sy: 0.05, a: 0.95 }, { t: 0.18, x: -24, y: 46, sx: 2.6, sy: 0.9, a: 0.9 }, { t: 0.5, x: -24, y: 46, sx: 3.2, sy: 1.05, a: 0.55 }, { t: 1, x: -24, y: 46, sx: 3.8, sy: 1.1, a: 0 }], tint: 0x6b625a },
        ...[-60, -36, -12, 12].map((x, i): SpriteSpec => ({
          sprite: 'fx.p.smokeLobe',
          life: 1300,
          delay: 30 + i * 60,
          tint: i % 2 === 0 ? 0x6b625a : 0x857b70,
          keys: [
            { t: 0, x, y: 44, sx: 0.8, sy: 0.6, a: 1 },
            { t: 0.15, x: x + 2, y: 14, sx: 3.2, sy: 2.8, a: 0.95 },
            { t: 0.5, x: x + 4, y: -12, sx: 4.2, sy: 3.8, a: 0.7 },
            { t: 1, x: x + 6, y: -30, sx: 4.8, sy: 4.4, a: 0 },
          ],
        })),
        { ...ring(6, 520, 0xd8ccb4, 0.4), keys: [{ t: 0, x: -24, y: 46, sx: 1, sy: 0.3, a: 0.9 }, { t: 1, x: -24, y: 46, sx: 6, sy: 1.6, a: 0 }] },
      ],
      particles: [
        { ...clods(14, [220, 420]), box: [50, 2], tint: 0x6b625a },
        { sprite: 'fx.p.rock', count: 10, life: [700, 1000], box: [50, 2], speed: [220, 400], angle: [-118, -62], gravity: 900, scale: [2, 1.6], alpha: [1, 0.4], spin: [-600, 600], delay: [0, 200], tint: 0x6e665c },
        { sprite: 'fx.p.timber', count: 5, life: [800, 1100], box: [40, 2], speed: [240, 380], angle: [-125, -55], gravity: 900, scale: [1.8, 1.6], alpha: [1, 0.5], spin: [-700, 700], delay: [40, 200] },
        { sprite: 'fx.p.dust', count: 10, life: [900, 1400], box: [60, 2], speed: [30, 90], angle: [-150, -30], gravity: 30, drag: 1.4, scale: [1.8, 3.6], alpha: [0.85, 0], delay: [200, 600], tint: 0x958c82 },
      ],
    },

    // -----------------------------------------------------------------------------------------
    // Age of Muskets

    {
      // Volley Fire (Home sweep): a rolling musket volley rakes the zone and leaves its powder-smoke bank.
      id: 'fx.volley_fire',
      durationMs: 1000,
      loops: true,
      sprites: [
        SWEEP_FRONT,
        ...[-44, -30, -16, -2, 12, 26, 40].map((x, i): SpriteSpec => ({
          sprite: 'fx.p.muzzleFlash',
          life: 90,
          delay: 40 + i * 130,
          moveBy: 'zone',
          keys: [{ t: 0, x, y: -34, sx: 4.2, sy: 3.2, a: 1 }, { t: 1, x, y: -34, sx: 4.8, sy: 2, a: 0 }],
        })),
        ...[-44, -30, -16, -2, 12, 26, 40].map((x, i): SpriteSpec => ({
          sprite: 'fx.p.smokeLobe',
          life: 1300,
          delay: 50 + i * 130,
          moveBy: 'zone',
          tint: 0xeeeae4,
          keys: [{ t: 0, x, y: -34, sx: 1, sy: 0.9, a: 0.95 }, { t: 0.15, x: x + 2, y: -38, sx: 3.2, sy: 2.6, a: 0.9 }, { t: 1, x: x + 4, y: -58, sx: 4.4, sy: 3.6, a: 0 }],
        })),
      ],
      particles: [
        { sprite: 'fx.p.spark', rate: 70, life: [60, 110], speed: [700, 900], angle: [-4, 6], box: [6, 18], followMove: true, scale: [2.2, 1.2], alpha: [1, 0.2], align: true },
        { sprite: 'fx.p.spark', rate: 26, life: [140, 240], speed: [90, 180], angle: [-160, -20], spread: 10, gravity: 400, scale: [0.9, 0.3], alpha: [1, 0], align: true, followMove: true },
        { sprite: 'fx.p.dust', rate: 22, life: [300, 520], speed: [20, 60], angle: [-150, -30], spread: 10, scale: [0.5, 1.1], alpha: [0.8, 0], followMove: true },
        { sprite: 'fx.p.smoke', rate: 22, life: [1400, 2000], speed: [6, 18], angle: [-100, -80], box: [4, 12], followMove: true, gravity: -8, drag: 0.6, scale: [2, 4.2], alpha: [0.8, 0], spin: [-20, 20], tint: 0xeeeae4 },
        { sprite: 'fx.p.clod', rate: 30, life: [300, 520], speed: [120, 240], angle: [-112, -68], box: [8, 1], followMove: true, gravity: 950, scale: [1.5, 1.2], alpha: [1, 0.5], spin: [-500, 500] },
      ],
    },
    {
      // Boarding Nets (Home pull): grapnels fly, a tarred net drops over the zone and hauls tight.
      id: 'fx.boarding_nets',
      durationMs: 4000,
      loops: true,
      sprites: [
        { sprite: 'fx.p.shadow', life: 0, sizeWith: 'zone', keys: [{ t: 0, sx: 0.6, a: 0 }, { t: 0.04, sx: 1, a: 0.3 }, { t: 0.95, a: 0.3 }, { t: 1, a: 0 }] },
        { sprite: 'fx.p.net', life: 0, sizeWith: 'zone', keys: [{ t: 0, y: -150, sx: 0.55, sy: 3, a: 0 }, { t: 0.025, y: -80, sx: 0.85, sy: 2.6, a: 1 }, { t: 0.05, y: 0, sx: 1.08, sy: 1.8, a: 1 }, { t: 0.065, y: -3, sx: 1.02, sy: 2.6 }, { t: 0.09, y: 0, sx: 0.84, sy: 2.8 }, { t: 0.12, y: 0, sx: 0.9, sy: 2.4 }, { t: 0.94, y: 0, sx: 0.9, sy: 2.4, a: 1 }, { t: 1, y: 2, sx: 0.88, sy: 1.8, a: 0 }] },
        { sprite: 'fx.p.grapnel', life: 0, moveBy: 'zone', keys: [{ t: 0, x: -90, y: -90, r: 30, sx: 1.6, sy: 1.6, a: 1 }, { t: 0.05, x: -46, y: -2, r: 20, sx: 1.6, sy: 1.6 }, { t: 0.09, x: -40, y: -2, r: 10 }, { t: 0.94, x: -40, y: -2, a: 1 }, { t: 1, x: -40, y: -2, a: 0 }] },
        { sprite: 'fx.p.grapnel', life: 0, delay: 60, moveBy: 'zone', keys: [{ t: 0, x: -70, y: -120, r: 50, sx: 1.6, sy: 1.6, a: 1 }, { t: 0.05, x: 48, y: -2, r: 10, sx: 1.6, sy: 1.6 }, { t: 0.09, x: 40, y: -2, r: 4 }, { t: 0.94, x: 40, y: -2, a: 1 }, { t: 1, x: 40, y: -2, a: 0 }] },
      ],
      particles: [
        { ...dust(10, 1.1), box: [46, 2], sizeWith: 'zone', delay: [180, 240] },
        { sprite: 'fx.p.dust', count: 6, life: [300, 500], box: [30, 2], sizeWith: 'zone', attract: 3, speed: [40, 80], angle: [-170, -10], delay: [340, 380], scale: [0.5, 1], alpha: [0.7, 0], tint: 0xcfc4b0 },
      ],
    },
    {
      // A cannon shot slamming into the dirt (Horse Artillery's blast).
      id: 'fx.dirt_blast',
      durationMs: 1100,
      sprites: [scorch(1.8, 900), bloom(2.2, 260, 0xfff0d6, 0.6), flash(1.3, 0xfff6e2, 60), ring(3.2, 320, 0xf4ecd8, 0.35)],
      particles: [
        clods(10),
        { sprite: 'fx.p.dust', count: 8, life: [500, 900], speed: [40, 140], angle: [-125, -55], spread: 8, gravity: 60, drag: 1.5, scale: [1, 2.2], alpha: [0.85, 0], tint: 0xb9ad98 },
        { sprite: 'fx.p.smoke', count: 3, life: [800, 1200], speed: [10, 40], angle: [-100, -80], spread: 8, gravity: -40, scale: [0.8, 1.8], alpha: [0.6, 0], tint: 0x9c968e, delay: [80, 160] },
        sparks(4, [140, 260]),
      ],
    },
    { id: 'fx.horse_artillery', durationMs: 1300, fall: { sprite: 'proj.cannonball', count: 1, fromX: -170, fromY: -150, spreadX: 6, fallMs: 130, impact: 'fx.dirt_blast' } },
    {
      // Sharpshooter (Field strike): a rifle ball snaps in flat from the caster's side.
      id: 'fx.sharpshot',
      durationMs: 800,
      sprites: [
        { sprite: 'fx.p.beam', life: 110, keys: [{ t: 0, x: -340, y: -18, r: 3, sx: 34, sy: 0.5, a: 0.95 }, { t: 1, x: -340, y: -18, r: 3, sx: 34, sy: 0.15, a: 0 }], tint: 0xfff6e2 },
        bloom(2.2, 240, 0xfff1d2, 0.7),
        flash(1.8, 0xffffff, 60),
        ring(2.8, 260, 0xffffff, 0.8),
        { sprite: 'fx.p.glint', life: 240, keys: [{ t: 0, sx: 0.4, sy: 0.4, a: 1, r: 0 }, { t: 0.3, sx: 1.2, sy: 1.2, a: 1, r: 30 }, { t: 1, sx: 0.3, sy: 0.3, a: 0, r: 60 }] },
      ],
      particles: [sparks(8, [180, 320], 'fx.p.spark', [-40, 40]), { ...smoke(3, 1, [500, 800]), tint: 0xdcd8d2 }, { ...dust(4, 1) }],
    },

    // -----------------------------------------------------------------------------------------
    // Great War

    {
      // Gun Line (Home sweep): a machine-gun burst walks across the zone in spurts of dirt.
      id: 'fx.gun_line',
      durationMs: 1500,
      loops: true,
      sprites: [SWEEP_FRONT],
      particles: [
        { sprite: 'fx.p.clod', rate: 70, life: [340, 600], speed: [170, 320], angle: [-114, -66], box: [10, 1], followMove: true, gravity: 950, scale: [1.9, 1.5], alpha: [1, 0.5], spin: [-500, 500] },
        { sprite: 'fx.p.dust', rate: 34, life: [400, 700], speed: [40, 120], angle: [-130, -50], box: [10, 1], followMove: true, scale: [1.2, 2.8], alpha: [0.9, 0], tint: 0xc9bfae },
        { sprite: 'fx.p.spark', rate: 40, life: [60, 120], speed: [500, 700], angle: [-8, 4], box: [10, 16], followMove: true, scale: [2.2, 1.1], alpha: [1, 0.2], align: true },
        { sprite: 'fx.p.flash', rate: 18, life: [30, 60], box: [10, 1], followMove: true, scale: [1.1, 1.4], alpha: [1, 0.6] },
      ],
    },
    {
      // Barbed Wire (Home snare): coils spring out across the zone between pickets.
      id: 'fx.barbed_wire',
      durationMs: 6000,
      loops: true,
      sprites: [
        ...[-46, 0, 46].map((x, i) => dropIn('fx.p.picket', x, i * 70, { scale: 2.6, from: 30 })),
        ...[-36, -18, 0, 18, 36].map((x, i): SpriteSpec => ({
          sprite: 'fx.p.wireCoil',
          life: 0,
          delay: 40 + i * 50,
          moveBy: 'zone',
          keys: [
            { t: 0, x, y: 0, sx: 0.3, sy: 2.4, a: 0 },
            { t: 0.012, x, y: 0, sx: 3.4, sy: 1.7, a: 1 },
            { t: 0.024, x, y: 0, sx: 2.5, sy: 2.8 },
            { t: 0.036, x, y: 0, sx: 2.9, sy: 2.5 },
            { t: 0.95, x, y: 0, sx: 2.9, sy: 2.5, a: 1 },
            { t: 1, x, y: 2, sx: 2.9, sy: 1.5, a: 0 },
          ],
        })),
      ],
      particles: [
        { ...dust(8, 0.9), box: [46, 2], sizeWith: 'zone', delay: [60, 200] },
        { sprite: 'fx.p.glint', rate: 2.5, life: [240, 400], box: [44, 8], sizeWith: 'zone', scale: [0.45, 0.1], alpha: [1, 0], spin: [90, 180] },
      ],
    },
    {
      // Railway Gun (Field strike): a huge shell drops out of the sky and the ground erupts.
      id: 'fx.railway_shell',
      durationMs: 1800,
      fall: { sprite: 'fx.p.bigShell', count: 1, fromX: -110, fromY: -420, spreadX: 0, fallMs: 90, impact: 'fx.explosion_l' },
      sprites: [
        { sprite: 'fx.p.pillar', life: 1300, delay: 90, keys: [{ t: 0, sx: 1.4, sy: 0.05, a: 0.9 }, { t: 0.12, sx: 2.6, sy: 0.9, a: 0.85 }, { t: 0.5, sx: 3.2, sy: 1.05, a: 0.5 }, { t: 1, sx: 3.8, sy: 1.1, a: 0 }], tint: 0xa89c88 },
        { ...ring(7, 600, 0xf4ecd8, 0.3), delay: 90 },
      ],
      particles: [clods(12, [200, 420], [90, 110]), { ...smoke(6, 2, [1200, 1800]), delay: [300, 500], tint: 0x9c968e }],
    },
    {
      // Field Hospital (Field mend): a bandage wraps each patched soldier and green crosses rise.
      id: 'fx.field_hospital',
      durationMs: 1300,
      sprites: [
        bloom(3, 700, 0xd8fff0, 0.5),
        { sprite: 'fx.p.bandage', life: 900, keys: [{ t: 0, x: -18, y: 6, r: -20, sx: 0.6, sy: 0.6, a: 0 }, { t: 0.15, x: -16, y: 0, r: 10, sx: 2, sy: 2, a: 1 }, { t: 0.4, x: 13, y: -10, r: 40, sx: 1.8, sy: 1.8 }, { t: 0.65, x: -10, y: -20, r: 70, sx: 1.6, sy: 1.6, a: 1 }, { t: 1, x: 5, y: -34, r: 100, sx: 1.1, sy: 1.1, a: 0 }] },
        { sprite: 'fx.p.plus', life: 1000, delay: 120, keys: [{ t: 0, y: -30, sx: 0.6, sy: 0.6, a: 0 }, { t: 0.18, y: -44, sx: 2.6, sy: 2.6, a: 1 }, { t: 0.3, y: -46, sx: 2.1, sy: 2.1 }, { t: 1, y: -74, sx: 1.8, sy: 1.8, a: 0 }] },
      ],
      particles: [{ sprite: 'fx.p.plus', count: 4, life: [600, 900], box: [14, 12], speed: [20, 40], angle: [-100, -80], delay: [150, 400], scale: [1.2, 0.6], alpha: [1, 0] }],
    },

    // -----------------------------------------------------------------------------------------
    // Modern

    {
      // Strafing Run (Home sweep): a fighter dives across the zone, its guns walking a line of dirt.
      id: 'fx.strafing_run',
      durationMs: 1500,
      loops: true,
      sprites: [
        SWEEP_FRONT,
        crossing('fx.p.shadow', [{ t: 0, x: -64, sx: 0.4, sy: 0.6, a: 0 }, { t: 0.15, x: -48, a: 0.35 }, { t: 0.85, x: 44, a: 0.35 }, { t: 1, x: 62, a: 0 }]),
        crossing('fx.p.fighter', [{ t: 0, x: -80, y: -230, r: 18, sx: 2.8, sy: 2.8, a: 0 }, { t: 0.08, x: -62, y: -160, r: 12, a: 1 }, { t: 0.5, x: -6, y: -118, r: 2 }, { t: 0.9, x: 42, y: -130, r: -8, a: 1 }, { t: 1, x: 64, y: -190, r: -22, a: 0 }]),
        crossing('fx.p.beam', [{ t: 0.08, x: -62, y: -150, r: 70, sx: 11, sy: 0.35, a: 0 }, { t: 0.12, x: -58, y: -140, r: 70, sx: 11, sy: 0.35, a: 0.55 }, { t: 0.88, x: 38, y: -124, r: 72, sx: 10, sy: 0.35, a: 0.55 }, { t: 0.92, x: 40, y: -124, r: 72, sx: 10, sy: 0.35, a: 0 }], { tint: 0xfff1d2 }),
      ],
      particles: [
        { sprite: 'fx.p.clod', rate: 60, life: [340, 600], speed: [170, 320], angle: [-114, -66], box: [12, 1], followMove: true, gravity: 950, scale: [1.9, 1.5], alpha: [1, 0.5], spin: [-500, 500] },
        { sprite: 'fx.p.dust', rate: 34, life: [400, 700], speed: [40, 120], angle: [-130, -50], box: [12, 1], followMove: true, scale: [1.2, 2.8], alpha: [0.9, 0], tint: 0xc9bfae },
        { sprite: 'fx.p.flash', rate: 18, life: [30, 60], box: [12, 1], followMove: true, scale: [1.1, 1.4], alpha: [1, 0.6] },
        { sprite: 'fx.p.spark', rate: 30, life: [140, 240], speed: [90, 180], angle: [-160, -20], box: [8, 1], followMove: true, gravity: 400, scale: [0.9, 0.3], alpha: [1, 0], align: true },
      ],
    },
    {
      // AA Screen (Home flak): a burst of flak in the sky: flash, a dark puff and whistling shrapnel.
      id: 'fx.flak_burst',
      durationMs: 1400,
      sprites: [
        { ...bloom(2.4, 220, 0xfff0d6, 0.75), keys: [{ t: 0, y: FLAK_Y, sx: 0.7, sy: 0.7, a: 0.8 }, { t: 0.3, y: FLAK_Y, sx: 2.4, sy: 2.4, a: 0.7 }, { t: 1, y: FLAK_Y, sx: 2.8, sy: 2.8, a: 0 }] },
        { sprite: 'fx.p.flash', life: 60, keys: [{ t: 0, y: FLAK_Y, sx: 2.2, sy: 2.2, a: 1 }, { t: 1, y: FLAK_Y, sx: 2.6, sy: 2.6, a: 1 }], tint: 0xfff6e2 },
        { ...ring(4, 300, 0xf4ecd8, 0.9), keys: [{ t: 0, y: FLAK_Y, sx: 0.8, sy: 0.8, a: 0.9 }, { t: 1, y: FLAK_Y, sx: 4, sy: 4, a: 0 }] },
        ...[0, 1, 2, 3].map((i): SpriteSpec => ({
          sprite: 'fx.p.smokeLobe',
          life: 1200,
          delay: 30 + i * 20,
          jitter: { x: 4, y: 4, s: [0.85, 1.15], r: 60 },
          tint: 0x6a6770,
          keys: [
            { t: 0, x: [-8, 8, -4, 6][i] as number, y: FLAK_Y + ([-4, -6, 6, 4][i] as number), sx: 0.8, sy: 0.8, a: 0.95 },
            { t: 0.15, x: [-12, 12, -6, 9][i] as number, y: FLAK_Y + ([-7, -9, 8, 5][i] as number), sx: 1.9, sy: 1.8, a: 0.95 },
            { t: 1, x: [-18, 18, -9, 13][i] as number, y: FLAK_Y + ([-20, -22, -6, -9][i] as number), sx: 2.4, sy: 2.3, a: 0 },
          ],
        })),
      ],
      particles: [
        { sprite: 'fx.p.spark', count: 10, life: [160, 320], speed: [200, 360], angle: [-180, 180], box: [2, 2], scale: [1.2, 0.4], alpha: [1, 0], align: true, gravity: 200 },
        { sprite: 'fx.p.ember', count: 6, life: [400, 700], speed: [40, 120], angle: [-180, 180], box: [4, 4], gravity: 160, scale: [1, 0.4], alpha: [1, 0], blendAdd: true },
      ],
    },
    {
      // Tank Rush (Field charge): tanks roll out of their own gun smoke and grind down the lane.
      id: 'fx.tank_rush',
      durationMs: 1714,
      timedBy: 'run',
      sprites: [
        runner('fx.p.tank', 110, 1.4, 0.8, 1.55),
        pennantOn(110, 1.4, -20, -50, 0.85),
        { ...bloom(2.2, 240, 0xfff0d0, 0.8), keys: [{ t: 0, x: 72, y: -43, sx: 0.7, sy: 0.7, a: 0.9 }, { t: 1, x: 80, y: -43, sx: 2.2, sy: 2.2, a: 0 }] },
        { sprite: 'fx.p.muzzleFlash', life: 90, keys: [{ t: 0, x: 62, y: -43, sx: 3.2, sy: 2.6, a: 1 }, { t: 1, x: 66, y: -43, sx: 3.6, sy: 1.6, a: 0 }] },
      ],
      particles: [
        { sprite: 'fx.p.smoke', count: 7, life: [700, 1100], box: [8, 4], speed: [30, 80], angle: [-40, 20], gravity: -20, drag: 1.4, scale: [1.2, 2.8], alpha: [0.75, 0], tint: 0xdcd8d2 },
        { sprite: 'fx.p.dust', rate: 22, life: [400, 700], speed: [10, 40], angle: [-175, -120], spread: 10, scale: [0.8, 1.8], alpha: [0.8, 0], followMove: true, tint: 0xc9bfae },
        { sprite: 'fx.p.smoke', rate: 10, life: [600, 1000], speed: [10, 30], angle: [-150, -110], spread: 6, gravity: -30, scale: [0.4, 1.1], alpha: [0.55, 0], followMove: true, tint: 0x8e8984 },
        { sprite: 'fx.p.clod', rate: 12, life: [260, 420], speed: [60, 140], angle: [-170, -120], spread: 10, gravity: 800, scale: [0.9, 0.7], alpha: [1, 0.5], spin: [-400, 400], followMove: true },
        { ...dust(8, 1.4), atEnd: true, followMove: true, tint: 0xc9bfae },
      ],
    },
    {
      // Sniper Team (Field strike): one flat, fast tracer and a precise hit.
      id: 'fx.sniper_trace',
      durationMs: 700,
      sprites: [
        { sprite: 'fx.p.beam', life: 80, keys: [{ t: 0, x: -420, y: -24, r: 3.3, sx: 42, sy: 0.35, a: 1 }, { t: 1, x: -420, y: -24, r: 3.3, sx: 42, sy: 0.1, a: 0 }], tint: 0xffffff },
        bloom(2.2, 220, 0xfff6e2, 0.7),
        flash(1.8, 0xffffff, 50),
        ring(3, 280, 0xffffff, 0.9),
        { sprite: 'fx.p.glint', life: 220, keys: [{ t: 0, sx: 0.5, sy: 0.5, a: 1 }, { t: 0.3, sx: 1.4, sy: 1.4, a: 1, r: 45 }, { t: 1, sx: 0.2, sy: 0.2, a: 0, r: 90 }] },
      ],
      particles: [sparks(8, [180, 340], 'fx.p.spark', [-30, 30]), { ...dust(5, 1.1), delay: [0, 40] }, { ...smoke(2, 0.9, [400, 700]), tint: 0xdcd8d2 }],
    },

    // -----------------------------------------------------------------------------------------
    // Future

    {
      // A small plasma pop (Point Defense and Drone Swarm blasts): mint core, magenta sparks.
      id: 'fx.plasma_pop',
      durationMs: 700,
      sprites: [scorch(1.3, 500), bloom(2.4, 260, 0xd8fff0, 0.75), flash(1.5, 0xffffff, 50), ring(3.2, 280, 0x3af0b4, 0.35)],
      particles: [
        { sprite: 'fx.p.nanite', count: 4, life: [220, 380], speed: [100, 220], angle: [-170, -10], spread: 3, gravity: 200, scale: [1, 0.3], alpha: [1, 0], tint: 0xd8fff0 },
        { sprite: 'fx.p.spark', count: 3, life: [140, 240], speed: [120, 220], angle: [-160, -20], gravity: 300, scale: [0.9, 0.3], alpha: [1, 0], align: true, tint: 0xfbd6ec },
        { ...dust(2, 0.8), tint: 0xc9c2d4 },
      ],
    },
    { id: 'fx.point_defense', durationMs: 900, fall: { sprite: 'fx.p.microMissile', count: 1, fromX: -70, fromY: -280, spreadX: 4, fallMs: 110, impact: 'fx.plasma_pop', scale: 2.4 } },
    {
      // Stasis Field (Home stun): a hex-cell dome snaps shut over the zone, hums, then shatters.
      id: 'fx.stasis_dome',
      durationMs: 2100,
      sprites: [
        { sprite: 'fx.p.groundDisc', life: 2000, sizeWith: 'zone', keys: [{ t: 0, sx: 0.2, sy: 0.03, a: 0 }, { t: 0.05, sx: 1.05, sy: 0.16, a: 0.4 }, { t: 0.9, sx: 1, sy: 0.15, a: 0.35 }, { t: 1, a: 0 }], tint: 0x3af0b4 },
        { sprite: 'fx.p.hexDome', life: 2000, sizeWith: 'width', keys: [{ t: 0, sx: 0.1, sy: 0.05, a: 0 }, { t: 0.04, sx: 1.1, sy: 1.12, a: 1 }, { t: 0.07, sx: 0.97, sy: 0.96 }, { t: 0.1, sx: 1, sy: 1 }, { t: 0.86, sx: 1, sy: 1, a: 1 }, { t: 0.9, sx: 1.04, sy: 1.03, a: 0.9 }, { t: 0.93, sx: 1.08, sy: 1.06, a: 0.2 }, { t: 1, sx: 1.1, sy: 1.08, a: 0 }] },
        { sprite: 'fx.p.hexDome', life: 0, loop: 700, sizeWith: 'width', blendAdd: true, keys: [{ t: 0, sx: 1, sy: 1, a: 0.05 }, { t: 0.5, sx: 1.01, sy: 1.01, a: 0.14 }, { t: 1, sx: 1, sy: 1, a: 0.05 }] },
        { ...flash(2.4, 0xd8fff0, 80), keys: [{ t: 0, y: -20, sx: 1, sy: 1, a: 0.9 }, { t: 1, y: -20, sx: 3, sy: 3, a: 0 }] },
      ],
      particles: [
        { sprite: 'fx.p.nanite', rate: 10, life: [500, 800], box: [40, 20], sizeWith: 'width', speed: [4, 14], angle: [-100, -80], scale: [0.8, 0.3], alpha: [0.9, 0], tint: 0xd8fff0 },
        { sprite: 'fx.p.shard', count: 18, life: [500, 800], box: [44, 24], sizeWith: 'width', delay: [1840, 1880], speed: [60, 160], angle: [-160, -20], gravity: 500, scale: [1.6, 1], alpha: [1, 0], spin: [-600, 600], tint: 0xd8fff0 },
      ],
    },
    {
      // Drone Swarm (Field front barrage): the swarm hovers over the zone while its drones dive in.
      id: 'fx.drone_cloud',
      durationMs: 2000,
      loops: true,
      sprites: [
        ...[-40, -24, -8, 8, 24, 40].map((x, i): SpriteSpec => ({
          sprite: 'fx.p.drone',
          life: 0,
          loop: 360 + i * 40,
          moveBy: 'zone',
          keys: [
            { t: 0, x, y: -140 - (i % 3) * 16, sx: 2.4, sy: 2.4, r: -4 },
            { t: 0.5, x: x + 2, y: -146 - (i % 3) * 16, sx: 2.4, sy: 2.4, r: 4 },
            { t: 1, x, y: -140 - (i % 3) * 16, sx: 2.4, sy: 2.4, r: -4 },
          ],
        })),
      ],
      particles: [
        { sprite: 'fx.p.nanite', count: 12, life: [300, 500], box: [44, 20], sizeWith: 'zone', speed: [30, 80], angle: [-180, 180], scale: [1, 0.3], alpha: [1, 0], tint: 0xd8fff0 },
        { sprite: 'fx.p.nanite', rate: 8, life: [300, 500], box: [44, 10], sizeWith: 'zone', speed: [10, 30], angle: [60, 120], scale: [0.7, 0.2], alpha: [0.8, 0], tint: 0x3af0b4 },
      ],
    },
    { id: 'fx.drone_swarm', durationMs: 900, fall: { sprite: 'fx.p.drone', count: 1, fromX: -40, fromY: -150, spreadX: 4, fallMs: 120, impact: 'fx.plasma_pop', scale: 1.8 } },
    {
      // EMP Blackout (Field Suppress), at the enemy's gate: a pulse dome bursts and the lights go out.
      id: 'fx.emp_blackout',
      durationMs: 1800,
      sprites: [
        { sprite: 'fx.p.disc', life: 1700, keys: [{ t: 0, y: -30, sx: 2, sy: 1.6, a: 0 }, { t: 0.1, y: -30, sx: 11, sy: 9, a: 0.35 }, { t: 0.7, y: -30, sx: 12, sy: 10, a: 0.3 }, { t: 1, y: -30, sx: 12, sy: 10, a: 0 }], tint: 0x1b1830 },
        { ...ring(16, 700, 0x3af0b4, 0.8), keys: [{ t: 0, y: -40, sx: 1, sy: 0.8, a: 1 }, { t: 1, y: -40, sx: 16, sy: 13, a: 0 }] },
        { ...ring(12, 600, 0xffffff, 0.8), delay: 90, keys: [{ t: 0, y: -40, sx: 1, sy: 0.8, a: 0.9 }, { t: 1, y: -40, sx: 12, sy: 10, a: 0 }] },
        { ...bloom(6, 500, 0xd8fff0, 0.6), keys: [{ t: 0, y: -40, sx: 1, sy: 1, a: 0.7 }, { t: 0.3, y: -40, sx: 6, sy: 6, a: 0.5 }, { t: 1, y: -40, sx: 7, sy: 7, a: 0 }] },
        { ...flash(3, 0xd8fff0, 80), keys: [{ t: 0, y: -40, sx: 1.4, sy: 1.4, a: 1 }, { t: 1, y: -40, sx: 3, sy: 3, a: 0 }] },
      ],
      particles: [
        { sprite: 'fx.p.bolt', count: 16, life: [140, 300], box: [60, 50], speed: [120, 260], angle: [-180, 180], scale: [1.4, 0.6], alpha: [1, 0], align: true, tint: 0xd8fff0 },
        { sprite: 'fx.p.bolt', rate: 14, life: [100, 200], box: [60, 50], speed: [60, 160], angle: [-180, 180], scale: [1, 0.4], alpha: [1, 0], align: true, tint: 0xe7dcff },
        { sprite: 'fx.p.nanite', count: 14, life: [400, 800], box: [50, 40], speed: [30, 90], angle: [-180, 180], gravity: 120, scale: [1, 0.3], alpha: [1, 0], tint: 0x3af0b4 },
      ],
    },

    // -----------------------------------------------------------------------------------------
    // Cosmic

    {
      // Singularity (Home pull): a black hole opens over the zone and drags everything toward its core.
      id: 'fx.singularity',
      durationMs: 4000,
      loops: true,
      sprites: [
        { sprite: 'fx.p.shadow', life: 0, sizeWith: 'zone', keys: [{ t: 0, sx: 0.2, a: 0 }, { t: 0.05, sx: 0.8, a: 0.5 }, { t: 0.93, sx: 0.8, a: 0.5 }, { t: 1, sx: 0.3, a: 0 }] },
        { sprite: 'fx.p.ring', life: 0, loop: 600, sizeWith: 'zone', tint: 0xc9b8f0, keys: [{ t: 0, y: -52, sx: 0.5, sy: 0.2, a: 0 }, { t: 0.3, y: -52, sx: 0.36, sy: 0.15, a: 0.8 }, { t: 1, y: -52, sx: 0.05, sy: 0.03, a: 0 }] },
        { sprite: 'fx.p.accretion', life: 0, loop: 900, keys: [{ t: 0, y: -52, sx: 3.6, sy: 1, a: 0.95 }, { t: 0.5, y: -52, sx: 3.45, sy: 1.12, a: 1 }, { t: 1, y: -52, sx: 3.6, sy: 1, a: 0.95 }] },
        { sprite: 'fx.p.voidCore', life: 0, keys: [{ t: 0, y: -52, sx: 0.1, sy: 0.1, a: 0 }, { t: 0.03, y: -52, sx: 4.2, sy: 4.2, a: 1 }, { t: 0.05, y: -52, sx: 3.3, sy: 3.3 }, { t: 0.93, y: -52, sx: 3.4, sy: 3.4, a: 1 }, { t: 0.97, y: -52, sx: 4.4, sy: 4.4, a: 1 }, { t: 1, y: -52, sx: 0.1, sy: 0.1, a: 0 }] },
        { sprite: 'fx.p.glow', life: 0, loop: 900, blendAdd: true, keys: [{ t: 0, y: -52, sx: 5.4, sy: 5.4, a: 0.25 }, { t: 0.5, y: -52, sx: 6, sy: 6, a: 0.4 }, { t: 1, y: -52, sx: 5.4, sy: 5.4, a: 0.25 }], tint: 0xc9b8f0 },
      ],
      particles: [
        { sprite: 'fx.p.nanite', rate: 30, life: [500, 800], box: [55, 30], sizeWith: 'zone', attract: 6, speed: [20, 60], angle: [-180, 180], scale: [1.2, 0.3], alpha: [0.3, 1], tint: 0xe7dcff },
        { sprite: 'fx.p.dust', rate: 12, life: [500, 800], box: [50, 1], sizeWith: 'zone', attract: 4, speed: [10, 30], angle: [-150, -30], scale: [0.8, 0.3], alpha: [0.8, 0], tint: 0xb9ad98 },
      ],
    },
    {
      // Solar Flare (Home sweep): a looping arc of stellar plasma drags a white-hot column across the zone.
      id: 'fx.solar_flare',
      durationMs: 1500,
      loops: true,
      sprites: [
        SWEEP_FRONT,
        { sprite: 'fx.p.scorch', life: 0, sizeWith: 'zone', keys: [{ t: 0, x: -50, sx: 0, sy: 0.4, a: 0.6, y: 4 }, { t: 0.95, x: -3, sx: 0.95, sy: 0.4, a: 0.6, y: 4 }, { t: 1, x: 0, sx: 1, sy: 0.4, a: 0.3, y: 4 }] },
        crossing('fx.p.pillar', [{ t: 0, x: -50, sx: 1, sy: 1.8, a: 0 }, { t: 0.06, x: -47, sx: 2.8, sy: 1.8, a: 0.75 }, { t: 0.94, x: 47, sx: 2.8, sy: 1.8, a: 0.75 }, { t: 1, x: 50, sx: 1, sy: 1.8, a: 0 }], { tint: 0xffe9d6, blendAdd: true }),
        crossing('fx.p.pillar', [{ t: 0, x: -50, sx: 0.4, sy: 1.8, a: 0 }, { t: 0.06, x: -47, sx: 0.9, sy: 1.8, a: 1 }, { t: 0.94, x: 47, sx: 0.9, sy: 1.8, a: 1 }, { t: 1, x: 50, sx: 0.4, sy: 1.8, a: 0 }], { tint: 0xffffff }),
        crossing('fx.p.flareArc', [{ t: 0, x: -50, y: 0, sx: 0.4, sy: 0.4, a: 0 }, { t: 0.08, x: -46, sx: 1.5, sy: 1.6, a: 1 }, { t: 0.5, x: 0, sx: 1.7, sy: 1.9, a: 1 }, { t: 0.92, x: 46, sx: 1.5, sy: 1.6, a: 1 }, { t: 1, x: 50, sx: 0.5, sy: 0.4, a: 0 }], { blendAdd: true }),
        crossing('fx.p.glow', [{ t: 0, x: -50, y: -10, sx: 3, sy: 3, a: 0 }, { t: 0.06, x: -47, y: -10, sx: 5, sy: 5, a: 0.6 }, { t: 0.94, x: 47, y: -10, sx: 5, sy: 5, a: 0.6 }, { t: 1, x: 50, y: -10, sx: 3, sy: 3, a: 0 }], { tint: 0xfff0e0, blendAdd: true }),
      ],
      particles: [
        { sprite: 'fx.p.ember', rate: 60, life: [300, 600], box: [10, 2], followMove: true, speed: [60, 180], angle: [-160, -20], gravity: 160, scale: [1.4, 0.5], alpha: [1, 0], tint: 0xfff0e0, blendAdd: true },
        { sprite: 'fx.p.smoke', rate: 10, life: [700, 1100], box: [8, 2], followMove: true, speed: [10, 30], angle: [-110, -70], gravity: -40, scale: [0.6, 1.6], alpha: [0.5, 0], tint: 0xa9a196 },
      ],
    },
    {
      // Comet Run (Field charge): icy comets skim the ground, shedding crystal sparks.
      id: 'fx.comet_run',
      durationMs: 1000,
      timedBy: 'run',
      sprites: [
        runner('fx.p.comet', 120, 2, 0, 1.9, -18),
        { sprite: 'fx.p.glow', life: 0, moveBy: 'distance', blendAdd: true, keys: [{ t: 0, y: -16, sx: 3, sy: 2, a: 0.6 }, { t: 1, y: -16, sx: 3, sy: 2, a: 0.6 }], tint: 0xe7dcff },
        { ...flash(2, 0xe7dcff, 90), keys: [{ t: 0, y: -16, sx: 1, sy: 1, a: 1 }, { t: 1, y: -16, sx: 2.4, sy: 2.4, a: 0 }] },
      ],
      particles: [
        { sprite: 'fx.p.shard', rate: 22, life: [300, 560], speed: [40, 120], angle: [-170, -100], box: [4, 4], followMove: true, gravity: 300, scale: [1.3, 0.5], alpha: [1, 0], spin: [-500, 500] },
        { sprite: 'fx.p.xp', rate: 18, life: [300, 500], speed: [10, 40], angle: [-180, 180], box: [6, 4], followMove: true, scale: [1, 0.2], alpha: [1, 0], tint: 0xe7dcff, blendAdd: true },
        { sprite: 'fx.p.dust', rate: 12, life: [300, 500], speed: [10, 40], angle: [-160, -110], box: [4, 1], followMove: true, scale: [0.5, 1.2], alpha: [0.6, 0], tint: 0xc9c2d4 },
        { sprite: 'fx.p.shard', count: 7, atEnd: true, followMove: true, life: [400, 700], speed: [80, 180], angle: [-170, -10], gravity: 400, scale: [1.4, 0.6], alpha: [1, 0], spin: [-500, 500] },
      ],
    },
    // Bronze wave (CONTENT_PLAN 5.2)
    {
      // Sandstorm (Field signal, whole lane): a wall of pale sand rolls down the lane with streaks of grit.
      id: 'fx.sandstorm',
      durationMs: 1600,
      sprites: [
        { sprite: 'fx.p.dust', life: 1600, moveBy: 'zone', tint: 0xe6d8bc, keys: [{ t: 0, x: -50, sx: 3, sy: 2.4, a: 0 }, { t: 0.1, x: -42, sx: 5.2, sy: 4.4, a: 0.7, y: -18 }, { t: 0.85, x: 38, sx: 5.6, sy: 4.6, a: 0.6, y: -20 }, { t: 1, x: 50, sx: 4, sy: 3, a: 0, y: -24 }] },
        { sprite: 'fx.p.dust', life: 1500, delay: 100, moveBy: 'zone', tint: 0xd9cfbd, keys: [{ t: 0, x: -50, sx: 2, sy: 1.6, a: 0 }, { t: 0.12, x: -44, sx: 3.6, sy: 2.8, a: 0.55, y: -4 }, { t: 0.88, x: 40, sx: 3.8, sy: 3, a: 0.5, y: -6 }, { t: 1, x: 50, sx: 2.6, sy: 2, a: 0 }] },
      ],
      particles: [
        { sprite: 'fx.p.spark', rate: 55, life: [260, 480], box: [45, 14], sizeWith: 'zone', speed: [220, 340], angle: [-6, 6], align: true, scale: [1.6, 0.8], alpha: [0.75, 0], tint: 0xf6f2ea },
        { sprite: 'fx.p.dust', rate: 22, life: [600, 1000], box: [45, 4], sizeWith: 'zone', speed: [60, 140], angle: [-20, 0], gravity: -20, scale: [0.8, 1.8], alpha: [0.55, 0], tint: 0xd9cfbd },
      ],
    },
    {
      // Charybdis (Home pull): a churning whirlpool opens in the lane and drags units toward its eye.
      id: 'fx.whirlpool',
      durationMs: 4000,
      loops: true,
      sprites: [
        { sprite: 'fx.p.shadow', life: 0, sizeWith: 'zone', keys: [{ t: 0, sx: 0.2, sy: 0.5, a: 0 }, { t: 0.05, sx: 0.85, sy: 0.6, a: 0.45 }, { t: 0.93, sx: 0.85, sy: 0.6, a: 0.45 }, { t: 1, sx: 0.3, sy: 0.5, a: 0 }] },
        { sprite: 'fx.p.ring', life: 0, loop: 700, sizeWith: 'zone', tint: 0xa9d2da, keys: [{ t: 0, y: 2, sx: 0.5, sy: 0.16, a: 0, r: 0 }, { t: 0.3, y: 2, sx: 0.38, sy: 0.12, a: 0.9, r: 40 }, { t: 1, y: 2, sx: 0.06, sy: 0.02, a: 0, r: 120 }] },
        { sprite: 'fx.p.ring', life: 0, loop: 700, delay: 350, sizeWith: 'zone', tint: 0xeef8f6, keys: [{ t: 0, y: 2, sx: 0.46, sy: 0.15, a: 0 }, { t: 0.3, y: 2, sx: 0.34, sy: 0.11, a: 0.8 }, { t: 1, y: 2, sx: 0.05, sy: 0.02, a: 0 }] },
      ],
      particles: [
        { sprite: 'fx.p.snow', rate: 26, life: [500, 800], box: [48, 6], sizeWith: 'zone', attract: 5, speed: [20, 60], angle: [-180, 180], scale: [1.6, 0.5], alpha: [0.9, 0], tint: 0xeef8f6 },
        { sprite: 'fx.p.dust', rate: 8, life: [500, 800], box: [40, 2], sizeWith: 'zone', attract: 4, speed: [10, 30], angle: [-150, -30], scale: [0.8, 0.3], alpha: [0.6, 0], tint: 0xa9d2da },
      ],
    },
    // Medieval wave (CONTENT_PLAN 5.3)
    {
      // Longbow Volley (Field lane volley): a sheaf of long arrows drops steeply on each unit it screens.
      id: 'fx.longbow_volley',
      durationMs: 900,
      fall: { sprite: 'proj.longarrow', count: 3, fromX: -110, fromY: -300, spreadX: 14, fallMs: 260, impact: 'fx.arrow_thud', scale: 1.3 },
    },
    {
      // An arrow thudding home: a small ring, a puff of dust and a splinter.
      id: 'fx.arrow_thud',
      durationMs: 480,
      sprites: [ring(1.2, 240, 0xf2ecdc, 0.35)],
      particles: [{ ...dust(3, 0.7), tint: 0xd8ccb4 }, { ...chunks(2), tint: 0x9a8268 }],
    },
    {
      // Great Bell (Home stun): one huge stroke rolls out as rings of sound over the zone; the stunned
      // units wobble under the dizzy status. Gold stays pale (colour rule).
      id: 'fx.great_bell',
      durationMs: 1400,
      sprites: [
        { sprite: 'fx.p.groundDisc', life: 1200, sizeWith: 'zone', keys: [{ t: 0, sx: 0.2, sy: 0.03, a: 0 }, { t: 0.08, sx: 1.04, sy: 0.16, a: 0.35 }, { t: 1, sx: 1, sy: 0.15, a: 0 }], tint: 0xf2e6c4 },
        { sprite: 'fx.p.ring', life: 700, sizeWith: 'zone', tint: 0xf8f0d8, keys: [{ t: 0, y: -30, sx: 0.1, sy: 0.06, a: 1 }, { t: 1, y: -30, sx: 1.1, sy: 0.5, a: 0 }] },
        { sprite: 'fx.p.ring', life: 760, delay: 180, sizeWith: 'zone', tint: 0xe8dcb8, keys: [{ t: 0, y: -30, sx: 0.1, sy: 0.06, a: 0.9 }, { t: 1, y: -30, sx: 1.2, sy: 0.55, a: 0 }] },
        { sprite: 'fx.p.ring', life: 820, delay: 360, sizeWith: 'zone', tint: 0xf8f0d8, keys: [{ t: 0, y: -30, sx: 0.1, sy: 0.06, a: 0.7 }, { t: 1, y: -30, sx: 1.3, sy: 0.6, a: 0 }] },
        { ...flash(2.2, 0xfff6e0, 80), keys: [{ t: 0, y: -40, sx: 1, sy: 1, a: 0.9 }, { t: 1, y: -40, sx: 3, sy: 3, a: 0 }] },
      ],
      particles: [
        { sprite: 'fx.p.note', count: 5, life: [600, 900], box: [30, 10], sizeWith: 'zone', speed: [30, 70], angle: [-130, -50], gravity: -30, scale: [1, 0.6], alpha: [1, 0], spin: [-60, 60], tint: 0xf8f0d8 },
        { ...dust(6, 1.2), tint: 0xd8ccb4 },
      ],
    },
    // Gunpowder wave (CONTENT_PLAN 5.4)
    {
      // Rocket Volley (Field lane volley): a salvo of war rockets streaks down on each unit it screens.
      id: 'fx.rocket_volley',
      durationMs: 1000,
      fall: { sprite: 'proj.rocket', count: 2, fromX: -150, fromY: -240, spreadX: 16, fallMs: 300, impact: 'fx.rocket_pop', scale: 1.2 },
    },
    {
      // A rocket bursting on the ground: a pale flash, a puff ring, a few sparks and a smoke curl.
      id: 'fx.rocket_pop',
      durationMs: 620,
      sprites: [flash(1.1, 0xfff6e2, 90), ring(1.6, 300, 0xf4ecd8, 0.4), bloom(1.4, 220, 0xfff0d6, 0.5)],
      particles: [sparks(5, [140, 260]), { ...smoke(2, 0.7), tint: 0xdcd8d2 }],
    },
    {
      // Cannon Salute (Home stun): a ring of saluting guns fires over the zone; white smoke rolls across it
      // and the stunned units wobble under the dizzy status.
      id: 'fx.cannon_salute',
      durationMs: 1500,
      sprites: [
        { sprite: 'fx.p.groundDisc', life: 1300, sizeWith: 'zone', keys: [{ t: 0, sx: 0.2, sy: 0.03, a: 0 }, { t: 0.08, sx: 1.04, sy: 0.16, a: 0.3 }, { t: 1, sx: 1, sy: 0.15, a: 0 }], tint: 0xefe6cf },
        { sprite: 'fx.p.ring', life: 640, sizeWith: 'zone', tint: 0xfff6e2, keys: [{ t: 0, y: -10, sx: 0.1, sy: 0.05, a: 1 }, { t: 1, y: -10, sx: 1.1, sy: 0.32, a: 0 }] },
        { sprite: 'fx.p.ring', life: 700, delay: 160, sizeWith: 'zone', tint: 0xe8e0d0, keys: [{ t: 0, y: -10, sx: 0.1, sy: 0.05, a: 0.9 }, { t: 1, y: -10, sx: 1.2, sy: 0.36, a: 0 }] },
        { ...flash(2.4, 0xfff6e2, 90), keys: [{ t: 0, y: -20, sx: 1, sy: 1, a: 0.95 }, { t: 1, y: -20, sx: 3.2, sy: 3.2, a: 0 }] },
      ],
      particles: [
        { sprite: 'fx.p.smoke', count: 10, life: [800, 1300], box: [40, 6], sizeWith: 'zone', speed: [20, 60], angle: [-150, -30], gravity: -30, drag: 1.2, scale: [1, 2.2], alpha: [0.75, 0], spin: [-40, 40], tint: 0xe8e4dc },
        { ...sparks(8, [180, 320]), box: [30, 4], sizeWith: 'zone' },
        { ...dust(6, 1.2), tint: 0xd8ccb4 },
      ],
    },
    // Industrial wave (CONTENT_PLAN 5.5)
    {
      // Shrapnel Shells (Field lane volley): a shell whistles down over each unit it screens and bursts just above it.
      id: 'fx.shrapnel_shells',
      durationMs: 1000,
      fall: { sprite: 'proj.shell', count: 1, fromX: -170, fromY: -250, spreadX: 10, fallMs: 300, impact: 'fx.shrapnel_burst', scale: 1.2 },
    },
    {
      // An air burst: a pale flash and a smoke ball over the target, a fan of shrapnel raining down onto it.
      id: 'fx.shrapnel_burst',
      durationMs: 720,
      sprites: [
        { ...flash(1.3, 0xfff6e2, 100), keys: [{ t: 0, y: -28, sx: 1, sy: 1, a: 1 }, { t: 1, y: -28, sx: 2.4, sy: 2.4, a: 0 }] },
        { ...bloom(1.2, 260, 0xfff0d6, 0.5), keys: [{ t: 0, y: -28, sx: 0.6, sy: 0.6, a: 0.6 }, { t: 1, y: -28, sx: 1.6, sy: 1.6, a: 0 }] },
        ring(1.2, 300, 0xf4ecd8, 0.35),
      ],
      particles: [
        { ...sparks(8, [160, 280], 'fx.p.spark', [40, 140]), box: [6, 2] },
        { ...smoke(3, 0.9), tint: 0xdcd8d2 },
        { ...dust(3, 0.7), tint: 0xd8ccb4 },
      ],
    },
    {
      // Great Magnet (Home pull): a giant horseshoe magnet swings down over the zone; sparks and iron filings
      // stream in toward the centre while the drag lines pull units in.
      id: 'fx.great_magnet',
      durationMs: 4000,
      loops: true,
      sprites: [
        { sprite: 'fx.p.shadow', life: 0, sizeWith: 'zone', keys: [{ t: 0, sx: 0.2, sy: 0.5, a: 0 }, { t: 0.05, sx: 0.8, sy: 0.55, a: 0.4 }, { t: 0.93, sx: 0.8, sy: 0.55, a: 0.4 }, { t: 1, sx: 0.3, sy: 0.5, a: 0 }] },
        { sprite: 'fx.p.magnet', life: 0, keys: [{ t: 0, y: -260, sx: 3.2, sy: 3.2, a: 0 }, { t: 0.06, y: -118, sx: 3.2, sy: 3.2, a: 1 }, { t: 0.09, y: -128, sx: 3.4, sy: 3.0, a: 1 }, { t: 0.12, y: -124, sx: 3.2, sy: 3.2, a: 1 }, { t: 0.92, y: -124, sx: 3.2, sy: 3.2, a: 1 }, { t: 1, y: -260, sx: 3.2, sy: 3.2, a: 0 }] },
        { sprite: 'fx.p.ring', life: 0, loop: 600, sizeWith: 'zone', tint: 0xe7dcff, keys: [{ t: 0, y: 2, sx: 0.5, sy: 0.16, a: 0 }, { t: 0.3, y: 2, sx: 0.36, sy: 0.12, a: 0.8 }, { t: 1, y: 2, sx: 0.05, sy: 0.02, a: 0 }] },
      ],
      particles: [
        { sprite: 'fx.p.spark', rate: 22, life: [400, 700], box: [44, 6], sizeWith: 'zone', attract: 5, speed: [20, 60], angle: [-180, 180], scale: [1.2, 0.4], alpha: [1, 0], tint: 0xe7dcff },
        { sprite: 'fx.p.dust', rate: 8, life: [500, 800], box: [40, 2], sizeWith: 'zone', attract: 4, speed: [10, 30], angle: [-150, -30], scale: [0.8, 0.3], alpha: [0.6, 0], tint: 0x8d9398 },
      ],
    },
    // Modern wave (CONTENT_PLAN 5.6)
    {
      // Creeping Barrage (Field lane volley): a shell screams down onto each unit it screens and bursts on the ground.
      id: 'fx.creeping_barrage',
      durationMs: 1000,
      fall: { sprite: 'proj.shell', count: 1, fromX: -150, fromY: -280, spreadX: 14, fallMs: 320, impact: 'fx.barrage_burst', scale: 1.25 },
    },
    {
      // A ground burst: a hot flash, a column of dirt and smoke and a dust ring.
      id: 'fx.barrage_burst',
      durationMs: 820,
      sprites: [
        scorch(1.1, 700),
        { ...flash(1.6, 0xfff0d6, 90), keys: [{ t: 0, y: -12, sx: 1, sy: 1, a: 1 }, { t: 1, y: -12, sx: 2.6, sy: 2.6, a: 0 }] },
        { ...bloom(1.4, 280, 0xffe3b0, 0.55), keys: [{ t: 0, y: -12, sx: 0.6, sy: 0.6, a: 0.7 }, { t: 1, y: -12, sx: 1.8, sy: 1.8, a: 0 }] },
        ring(1.5, 320, 0xe8dcc4, 0.4),
      ],
      particles: [
        { sprite: 'fx.p.dust', count: 7, life: [380, 640], box: [6, 2], speed: [80, 180], angle: [-120, -60], gravity: 320, scale: [1.1, 0.5], alpha: [0.9, 0], tint: 0x8c7d68 },
        { ...smoke(3, 1.0), tint: 0xb8b2a8 },
        { ...sparks(5, [140, 240]), box: [4, 2] },
      ],
    },
    {
      // Concussion Shells (Home stun): shells thump down across the zone; grey smoke and shock rings roll out and
      // the stunned units wobble under the dizzy status.
      id: 'fx.concussion_shells',
      durationMs: 1400,
      sprites: [
        { sprite: 'fx.p.groundDisc', life: 1200, sizeWith: 'zone', keys: [{ t: 0, sx: 0.2, sy: 0.03, a: 0 }, { t: 0.08, sx: 1.02, sy: 0.16, a: 0.3 }, { t: 1, sx: 1, sy: 0.15, a: 0 }], tint: 0xd8d2c4 },
        { sprite: 'fx.p.ring', life: 560, sizeWith: 'zone', tint: 0xf4ecd8, keys: [{ t: 0, y: -6, sx: 0.1, sy: 0.04, a: 1 }, { t: 1, y: -6, sx: 1.1, sy: 0.3, a: 0 }] },
        { sprite: 'fx.p.ring', life: 620, delay: 180, sizeWith: 'zone', tint: 0xe0d8c8, keys: [{ t: 0, y: -6, sx: 0.1, sy: 0.04, a: 0.9 }, { t: 1, y: -6, sx: 1.2, sy: 0.34, a: 0 }] },
        { sprite: 'fx.p.ring', life: 620, delay: 360, sizeWith: 'zone', tint: 0xd8d0c0, keys: [{ t: 0, y: -6, sx: 0.1, sy: 0.04, a: 0.8 }, { t: 1, y: -6, sx: 1.15, sy: 0.32, a: 0 }] },
        { ...flash(2.0, 0xfff6e2, 80), keys: [{ t: 0, y: -16, sx: 1, sy: 1, a: 0.9 }, { t: 1, y: -16, sx: 3, sy: 3, a: 0 }] },
      ],
      particles: [
        { sprite: 'fx.p.smoke', count: 9, life: [700, 1200], box: [40, 6], sizeWith: 'zone', speed: [20, 60], angle: [-150, -30], gravity: -30, drag: 1.2, scale: [1, 2.1], alpha: [0.7, 0], spin: [-40, 40], tint: 0xbcb6ac },
        { ...dust(6, 1.1), tint: 0x9a8e7a },
      ],
    },
    // Future wave (CONTENT_PLAN 5.7)
    {
      // Target Painter (Field zone + mark): a hovering spotter drone sweeps a mint scan line over the zone, reticles
      // lock onto each foe and a crackle of data sparks marks them for the volleys to come.
      id: 'fx.target_paint',
      durationMs: 2000,
      sprites: [
        { sprite: 'fx.p.groundDisc', life: 1900, sizeWith: 'zone', keys: [{ t: 0, sx: 0.2, sy: 0.03, a: 0 }, { t: 0.1, sx: 1.02, sy: 0.16, a: 0.28 }, { t: 0.85, sx: 1, sy: 0.15, a: 0.25 }, { t: 1, sx: 1, sy: 0.15, a: 0 }], tint: 0xbff5e0 },
        { sprite: 'fx.p.drone', life: 1900, keys: [{ t: 0, x: -60, y: -150, sx: 1.4, sy: 1.4, a: 0 }, { t: 0.12, x: -20, y: -120, sx: 1.4, sy: 1.4, a: 1 }, { t: 0.5, x: 10, y: -126, sx: 1.4, sy: 1.4, a: 1 }, { t: 0.88, x: 30, y: -120, sx: 1.4, sy: 1.4, a: 1 }, { t: 1, x: 70, y: -160, sx: 1.4, sy: 1.4, a: 0 }] },
        { sprite: 'fx.p.beam', life: 1500, delay: 200, keys: [{ t: 0, x: -40, y: -60, r: 90, sx: 0.9, sy: 0.8, a: 0 }, { t: 0.1, x: -40, y: -60, r: 90, sx: 0.9, sy: 0.8, a: 0.5 }, { t: 0.5, x: 40, y: -60, r: 90, sx: 0.9, sy: 0.8, a: 0.5 }, { t: 0.9, x: -40, y: -60, r: 90, sx: 0.9, sy: 0.8, a: 0.4 }, { t: 1, x: -40, y: -60, r: 90, sx: 0.9, sy: 0.8, a: 0 }], tint: 0x3af0b4 },
        { sprite: 'fx.p.reticle', life: 900, delay: 500, keys: [{ t: 0, y: -30, sx: 2.6, sy: 2.6, a: 0, r: 0 }, { t: 0.3, y: -30, sx: 1.4, sy: 1.4, a: 1, r: 90 }, { t: 0.8, y: -30, sx: 1.3, sy: 1.3, a: 1, r: 90 }, { t: 1, y: -30, sx: 1.6, sy: 1.6, a: 0, r: 90 }], tint: 0xf8e0f0 },
      ],
      particles: [
        { sprite: 'fx.p.nanite', rate: 14, life: [300, 600], box: [40, 3], sizeWith: 'zone', speed: [20, 50], angle: [-120, -60], scale: [1, 0.3], alpha: [1, 0], tint: 0xbff5e0, blendAdd: true },
      ],
    },
    {
      // Nano Mesh (Home snare zone, hits air): a glittering hex net unfurls over the zone; nanite threads crawl over
      // anything inside and a dome of mesh catches the fliers too.
      id: 'fx.nano_mesh',
      durationMs: 6000,
      loops: true,
      sprites: [
        { sprite: 'fx.p.groundDisc', life: 0, sizeWith: 'zone', keys: [{ t: 0, sx: 0.2, sy: 0.03, a: 0 }, { t: 0.03, sx: 1.04, sy: 0.17, a: 0.32 }, { t: 0.93, sx: 1, sy: 0.16, a: 0.3 }, { t: 1, sx: 1, sy: 0.16, a: 0 }], tint: 0x3af0b4 },
        { sprite: 'fx.p.hexDome', life: 0, sizeWith: 'zone', keys: [{ t: 0, sx: 0.2, sy: 0.1, a: 0 }, { t: 0.04, sx: 1.06, sy: 0.9, a: 0.55 }, { t: 0.06, sx: 1, sy: 1, a: 0.5 }, { t: 0.93, sx: 1, sy: 1, a: 0.45 }, { t: 1, sx: 1.04, sy: 1.02, a: 0 }], tint: 0xbff5e0 },
        { sprite: 'fx.p.ring', life: 0, loop: 900, sizeWith: 'zone', tint: 0xbff5e0, keys: [{ t: 0, y: 2, sx: 0.1, sy: 0.04, a: 0.8 }, { t: 1, y: 2, sx: 1, sy: 0.3, a: 0 }] },
      ],
      particles: [
        { sprite: 'fx.p.nanite', rate: 26, life: [500, 900], box: [44, 30], sizeWith: 'zone', attract: 2, speed: [10, 30], angle: [-180, 180], scale: [1, 0.3], alpha: [1, 0], spin: [-180, 180], tint: 0xbff5e0, blendAdd: true },
        { sprite: 'fx.p.glint', rate: 6, life: [300, 500], box: [40, 28], sizeWith: 'zone', scale: [1, 0.2], alpha: [1, 0], tint: 0xffffff },
      ],
    },
    // Cosmic wave (CONTENT_PLAN 5.8)
    {
      // Meteor Drizzle (Field lane volley): a small glowing meteor streaks down onto each unit it screens and pops in
      // a violet-white burst.
      id: 'fx.meteor_drizzle',
      durationMs: 1000,
      fall: { sprite: 'proj.mini_star', count: 1, fromX: -130, fromY: -300, spreadX: 14, fallMs: 300, impact: 'fx.meteor_pop', scale: 1.3 },
    },
    {
      // A meteor pop: a white-hot flash, a violet bloom, star sparkles and rock dust.
      id: 'fx.meteor_pop',
      durationMs: 760,
      sprites: [
        scorch(1.0, 640),
        { ...flash(1.5, 0xfff8e8, 90), keys: [{ t: 0, y: -10, sx: 1, sy: 1, a: 1 }, { t: 1, y: -10, sx: 2.4, sy: 2.4, a: 0 }] },
        { ...bloom(1.3, 260, 0xe7dcff, 0.6), keys: [{ t: 0, y: -10, sx: 0.6, sy: 0.6, a: 0.7 }, { t: 1, y: -10, sx: 1.7, sy: 1.7, a: 0 }] },
        ring(1.4, 320, 0xe7dcff, 0.4),
      ],
      particles: [
        { sprite: 'fx.p.nanite', count: 7, life: [300, 560], speed: [80, 180], angle: [-160, -20], gravity: 200, scale: [1.1, 0.3], alpha: [1, 0], tint: 0xfff8d8, blendAdd: true },
        { ...dust(5, 0.9), tint: 0x9a90aa },
      ],
    },
    {
      // Pulsar Pulse (Home stun, hits air): a pulsar beam sweeps once across the zone; the ground and the sky above
      // flash violet in rings and the stunned units wobble under the dizzy status.
      id: 'fx.pulsar_pulse',
      durationMs: 1400,
      sprites: [
        { sprite: 'fx.p.groundDisc', life: 1200, sizeWith: 'zone', keys: [{ t: 0, sx: 0.2, sy: 0.03, a: 0 }, { t: 0.08, sx: 1.02, sy: 0.16, a: 0.34 }, { t: 1, sx: 1, sy: 0.15, a: 0 }], tint: 0xc08cff },
        { sprite: 'fx.p.beam', life: 700, keys: [{ t: 0, x: -150, y: -110, r: 70, sx: 1.6, sy: 3.0, a: 0 }, { t: 0.15, x: -110, y: -110, r: 75, sx: 1.6, sy: 3.0, a: 0.75 }, { t: 0.85, x: 110, y: -110, r: 105, sx: 1.6, sy: 3.0, a: 0.75 }, { t: 1, x: 150, y: -110, r: 110, sx: 1.6, sy: 3.0, a: 0 }], tint: 0xe7dcff, blendAdd: true },
        { sprite: 'fx.p.ring', life: 560, delay: 300, sizeWith: 'zone', tint: 0xe7dcff, keys: [{ t: 0, y: -6, sx: 0.1, sy: 0.04, a: 1 }, { t: 1, y: -6, sx: 1.1, sy: 0.3, a: 0 }] },
        { sprite: 'fx.p.ring', life: 620, delay: 480, sizeWith: 'zone', tint: 0xc08cff, keys: [{ t: 0, y: -60, sx: 0.1, sy: 0.08, a: 0.8 }, { t: 1, y: -60, sx: 1.1, sy: 0.6, a: 0 }] },
        { ...flash(2.2, 0xf1e6ff, 90), delay: 360, keys: [{ t: 0, y: -40, sx: 1, sy: 1, a: 0.9 }, { t: 1, y: -40, sx: 3.2, sy: 3.2, a: 0 }] },
      ],
      particles: [
        { sprite: 'fx.p.glint', count: 10, life: [400, 700], box: [40, 30], sizeWith: 'zone', scale: [1.2, 0.2], alpha: [1, 0], tint: 0xffffff },
        { sprite: 'fx.p.nanite', count: 12, life: [500, 900], box: [40, 10], sizeWith: 'zone', speed: [20, 60], angle: [-150, -30], scale: [1, 0.3], alpha: [1, 0], tint: 0xe7dcff, blendAdd: true },
      ],
    },
    {
      // Ion Cannon (Field strike): an orbital beam spears its target from the sky.
      id: 'fx.ion_cannon',
      durationMs: 1100,
      sprites: [
        scorch(1.8, 900),
        { sprite: 'fx.p.pillar', life: 420, keys: [{ t: 0, sx: 0.6, sy: 2.4, a: 1 }, { t: 0.15, sx: 3.6, sy: 2.4, a: 0.9 }, { t: 1, sx: 0.2, sy: 2.4, a: 0 }], tint: 0x3fe0b0, blendAdd: true },
        { sprite: 'fx.p.pillar', life: 360, keys: [{ t: 0, sx: 0.2, sy: 2.4, a: 1 }, { t: 0.15, sx: 1, sy: 2.4, a: 1 }, { t: 1, sx: 0.1, sy: 2.4, a: 0 }], tint: 0xffffff },
        bloom(4.4, 460, 0xd8fff0, 0.8),
        flash(2.8, 0xffffff, 70),
        ring(6, 460, 0x3fe0b0, 0.35),
        { ...ring(6, 520, 0xffffff, 0.3), delay: 60 },
      ],
      particles: [
        { sprite: 'fx.p.nanite', count: 12, life: [300, 600], speed: [120, 260], angle: [-170, -10], spread: 4, gravity: 260, scale: [1.2, 0.3], alpha: [1, 0], tint: 0xd8fff0 },
        { sprite: 'fx.p.ember', count: 8, life: [400, 700], speed: [40, 140], angle: [-160, -20], gravity: 120, scale: [1.2, 0.4], alpha: [1, 0], tint: 0xd8fff0, blendAdd: true },
        { ...dust(5, 1), tint: 0xc9c2d4 },
      ],
    },
  ];
}
