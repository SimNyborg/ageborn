/**
 * Sprite-sheet base view (DESIGN A11 Bases and Base clips) for the 3D-rendered bases.
 *
 * Frames: the body per crumble stage (75/50/25%), waving flags (looping clips, dropped by crumble
 * stage), Treasury props per level. Code motion on top: torch and window light flicker, damage
 * smoke from stage 2, hit shake with a white flash and debris, the Last Stand horn and glow, the
 * evolve sequence, the Treasury and new-slot moments, and the collapse.
 *
 * The evolve sequence (A11, A12; owner 2026-09-28: "the base upgrade must be much more satisfying"):
 * - Build-up (`ascend(ms)`, the sim's Ascension, duck-typed on top of the BaseView contract): the
 *   base trembles harder and harder, light seeps through cracks, the windows burn brighter, energy
 *   motes rise from a glowing footprint and dust trickles off; the last 12% squash down in
 *   anticipation.
 * - Beat (`morphTo`, on `ageUp`): the old body breaks into shards that burst away, a core flash,
 *   a ground shockwave and an air ring, sparks and rubble; the new body assembles from bands that
 *   drop in bottom-up, each landing with a squash, a white edge flash and dust; then the whole base
 *   settles with overshoot, the flags unfurl and the Treasury pops back.
 * - Flourish: a gleam over the new body, twinkles at its lights and ledges, a light pulse.
 * Everything scales with the age (later ages: more shards, sparks and shake). If the next age's
 * sheet has not arrived yet, the build-up holds at its peak (at most 3 s).
 *
 * The Treasury moment (`setTreasury` up): coins burst out of the Treasury and rain back into it,
 * the new Treasury level pops in with squash and stretch and a golden glint. A new turret slot
 * (`mountBuilt(i)`, duck-typed): a ledge slides out of the wall and blocks fly in and set on it
 * with dust (metal plates and sparks from the Industrial Age on).
 *
 * Reduce motion (`setMotion`): no shake, no flying shards and no squash bounces (fades instead).
 * Lite: fewer shards, bands and particles. All of it is cosmetic; the sim owns every timing.
 *
 * The root sits on the gate at ground level; side 1 is mirrored. `mountPoints()` returns the
 * sheet's `mountsLu` (the same four points in every age, `WORLD_BASE_MOUNTS_LU`), so turrets and
 * tap targets sit on real ledges and never move on a morph.
 */
import { Container, Sprite, Texture } from 'pixi.js';
import type { BaseView, VisualDef } from '@/contracts/art';
import type { AgeId, Pt, Side } from '@/contracts/ids';
import { mulberry32, type CosmeticRng } from '@/core/rng';
import { AGES } from '../../ages';
import type { PartBaker } from '../../bake';
import { FX_ZONES } from '../../effects/sprites';
import { CLIP_TIMING } from '../../style';
import { partSprite, PuffList } from '../procedural/shared';
import { clipDurations, frameIndex, setFrame, type WorldAtlas, type WorldSheet } from '../worldAtlas';
import {
  Bits,
  bump,
  clamp01,
  DEFAULT_MOTION,
  destroyPiece,
  easeInQuad,
  easeOutBack,
  easeOutCubic,
  makePiece,
  springSettle,
  texRect,
  unionRect,
  type Piece,
  type Rect,
  type ViewMotion,
} from './upgradeFx';

export interface AtlasBaseOptions {
  age: AgeId;
  side: Side;
  teamColor: number;
  decor: PartBaker;
  seed: number;
  world: WorldAtlas;
  /** The sheet source of an age's base (for morphs); undefined when that age has no sheet. */
  sourceFor: (age: AgeId) => string | undefined;
  def: VisualDef;
}

interface Pair {
  c: Container;
  team: Sprite;
  base: Sprite;
}

function pair(tint: number): Pair {
  const c = new Container();
  const team = new Sprite(Texture.EMPTY);
  team.tint = tint;
  const base = new Sprite(Texture.EMPTY);
  c.addChild(team, base);
  return { c, team, base };
}

/** Rubble tints per age: the base's own large-area colours (wall, dark stone, accent material). */
const RUBBLE_COLORS: Record<AgeId, readonly number[]> = {
  stone: [0x8c7b68, 0x77695a, 0xa08e78, 0x6e8b3d],
  medieval: [0x9a9c98, 0x7c7f80, 0xaeb0aa, 0x7a5e44],
  gunpowder: [0xb8a88a, 0x9a8c72, 0xcabb9c, 0x857860],
  modern: [0xa29f96, 0x86837b, 0xb6b3a9, 0x62664a],
  future: [0xbfc4cb, 0x3a3f4a, 0xced3d9, 0x23262e],
  // A17.12: Ziggurat sandstone and verdigris, Foundry brick and iron, Star Ark hull plates and void
  bronze: [0xcdbe9e, 0xb0a282, 0xdccfb2, 0x4f8f7f],
  industrial: [0x8a6a63, 0x5b6168, 0x9c7e76, 0x2b2a2e],
  cosmic: [0xc8c4dc, 0x33264c, 0xe0dcf2, 0x8e44c8],
};
const DUST_COLORS: Record<AgeId, number> = {
  stone: 0xb8a88e,
  bronze: 0xcfc2a6,
  medieval: 0xb4b2aa,
  gunpowder: 0xcfc2a6,
  industrial: 0xa8a29a,
  modern: 0xb0ada4,
  future: 0xa8adb8,
  cosmic: 0xa8a4c0,
};
/** Sparks and energy of the evolve per age: pale warm for the old ages, mint and lilac for the last (A11 colour rule). */
const ENERGY_COLORS: Record<AgeId, number> = {
  stone: 0xfff0d2,
  bronze: 0xfff0d2,
  medieval: 0xfff4dc,
  gunpowder: 0xfff4dc,
  industrial: 0xfff6e4,
  modern: 0xf4f8ff,
  future: 0xc8fff0,
  cosmic: 0xe6dcff,
};
/** At most this many rubble chunks live at once (hits, crumbles and the collapse share it). */
const MAX_CHUNKS = 40;
const EVOLVE_FLASH_MAX = 0.55;
/** The reference length of the evolve beat; a morph of `ms` scales every beat time by ms / 1800. */
const MORPH_REF_MS = CLIP_TIMING.baseMorphMs;
/** Longest hold at the peak of the build-up while the next age's sheet loads. */
const MAX_HOLD_MS = 3000;
const GOLD = 0xffd760;
const GOLD_GLINT = 0xfff0b8;

interface Chunk {
  s: Container;
  vx: number;
  vy: number;
  spin: number;
  age: number;
  life: number;
  bounces: number;
}

const LIGHT_COLORS: Record<AgeId, number> = {
  stone: 0xffc27a,
  medieval: 0xffd08a,
  gunpowder: 0xffd89a,
  modern: 0xf2ecd2,
  future: 0x9ff5d8,
  bronze: 0xffc27a, // braziers
  industrial: 0xf6e2b0, // gas lamps
  cosmic: 0xa8f2dc, // mint hull lights
};

/** A light leaking through a crack during the build-up. */
interface Crack {
  c: Container;
  at: number;
  phase: number;
  a: number;
}

interface Ascend {
  t: number;
  ms: number;
  cracks: Crack[];
  footprint: Container;
  moteAcc: number;
  dustAcc: number;
  over?: number;
}

interface Shard {
  p: Piece;
  vx: number;
  vy: number;
  spin: number;
  life: number;
}

interface Band {
  p: Piece;
  start: number;
  dur: number;
  drop: number;
  landed: boolean;
}

interface Morph {
  age: AgeId;
  ms: number;
  /** Time since the beat (ms); negative while waiting for the next sheet. */
  t: number;
  hold: number;
  started: boolean;
  next: WorldSheet | null;
  power: number;
  shards: Shard[];
  bands: Band[];
  /** Beat time when every band has landed: art shows, the settle and the flags start. */
  assembled: number;
  shown: boolean;
  end: number;
  twinkled: number;
}

/** A block flying onto a new ledge (new turret slot). */
interface Flyer {
  s: Container;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  arc: number;
  spin: number;
  delay: number;
  t: number;
  T: number;
  hold: number;
  landed: boolean;
}

interface SlotBuild {
  x: number;
  y: number;
  t: number;
  ledge: Container;
  flyers: Flyer[];
  metal: boolean;
}

export class AtlasBaseView implements BaseView {
  readonly root = new Container();
  private readonly body = new Container();
  private readonly art = new Container();
  private readonly lightLayer = new Container();
  /** New-body bands while it assembles (lu, mirrored with the body). */
  private readonly bandLayer = new Container();
  /** Crack light of the build-up (lu, mirrored with the body, so it shakes along). */
  private readonly crackLayer = new Container();
  /** Shards of the old body (lu, mirrored; not squashed with the body). */
  private readonly shardLayer = new Container();
  private readonly overlay = new Container();
  private readonly fxLayer = new Container();
  private readonly glow: Container;
  private readonly horn: Container;
  private readonly puffs: PuffList;
  private readonly bits: Bits;
  private readonly chunkLayer = new Container();
  private chunks: Chunk[] = [];
  private readonly shadow: Container;
  private readonly rng: CosmeticRng;
  private readonly facing: 1 | -1;
  private sheet: WorldSheet;
  private age: AgeId;
  private backFlags: Pair[] = [];
  private frontFlags: Pair[] = [];
  private bodyPair: Pair;
  private treasuryPair: Pair;
  private readonly flash: Sprite;
  private lights: { s: Container; phase: number; crumbleMax: number; a: number }[] = [];
  private crumble = 0;
  private treasury = 0;
  private clockMs = 0;
  private shakeMs = 0;
  private shakeAmp = 1;
  private flashMs = 0;
  private popMs = 0;
  private smokeAcc = 0;
  private hornOn = false;
  private motion: ViewMotion = DEFAULT_MOTION;
  /** False until the first update: the state a view is created with never plays a moment. */
  private live = false;
  private ascending: Ascend | null = null;
  private morph: Morph | null = null;
  /** The Treasury pop (ms since it started; -1 = none) and whether coins fly with it. */
  private treasuryT = -1;
  private slots: SlotBuild[] = [];
  /** Extra light on the windows (the build-up and the flourish), 0..1.5. */
  private lightBoost = 0;
  private collapseT = -1;
  private destroyed = false;
  /** A cosmetic base skin's body tint (A18.9.4), or null; the team layer keeps its colour. */
  private skinTint: number | null = null;

  constructor(private readonly o: AtlasBaseOptions) {
    const s = o.world.get(o.def.source);
    if (!s) throw new Error(`World sheet "${o.def.source}" is not loaded`);
    this.sheet = s;
    this.age = o.age;
    this.facing = o.side === 0 ? 1 : -1;
    this.rng = mulberry32(o.seed);
    this.root.label = o.def.source;
    this.bodyPair = pair(o.teamColor);
    this.treasuryPair = pair(o.teamColor);
    this.flash = new Sprite(Texture.EMPTY);
    this.flash.blendMode = 'add';
    this.flash.tint = 0xfff0d8;
    this.flash.visible = false;
    this.body.addChild(this.art, this.lightLayer, this.bandLayer, this.crackLayer);
    this.body.scale.x = this.facing;
    this.shardLayer.scale.x = this.facing;
    this.glow = partSprite(o.decor, 'fx.p.glow', FX_ZONES);
    this.glow.tint = 0xffb3a0;
    this.glow.visible = false;
    this.horn = partSprite(o.decor, 'icon.horn', { ...FX_ZONES, bone: 0xede3c8, metal: 0x9aa3ab });
    this.horn.visible = false;
    // soft contact shadow: a wide pale ellipse and a tighter darker one at the foot
    this.shadow = new Container();
    for (const [sx, sy, a] of [
      [1, 1, 0.9],
      [0.72, 0.55, 1],
    ] as const) {
      const sh = partSprite(o.decor, 'shared.shadow', FX_ZONES);
      sh.scale.set(sx, sy);
      sh.alpha = a;
      this.shadow.addChild(sh);
    }
    this.root.addChild(this.shadow, this.glow, this.body, this.shardLayer, this.overlay, this.chunkLayer, this.fxLayer);
    this.overlay.addChild(this.horn);
    this.puffs = new PuffList(this.overlay);
    this.bits = new Bits(this.fxLayer);
    this.build();
  }

  /** (Re)builds the sprite layers for the current sheet. */
  private build(): void {
    // the flash sprite lives across rebuilds (it is re-added below): only detach it
    for (const c of [...this.art.children]) {
      if (c === this.flash) this.art.removeChild(c);
      else c.destroy({ children: true });
    }
    for (const c of [...this.lightLayer.children]) c.destroy({ children: true });
    const m = this.sheet.meta;
    const k = this.sheet.luPerUnit;
    this.art.scale.set(k);
    const tint = this.o.teamColor;
    this.bodyPair = pair(tint);
    if (this.skinTint !== null) this.bodyPair.base.tint = this.skinTint;
    this.treasuryPair = pair(tint);
    const flags = m.flags ?? [];
    this.backFlags = flags.filter((f) => f.z === 'back').map(() => pair(tint));
    this.frontFlags = flags.filter((f) => f.z !== 'back').map(() => pair(tint));
    this.art.addChild(...this.backFlags.map((p) => p.c), this.bodyPair.c, this.flash, this.treasuryPair.c, ...this.frontFlags.map((p) => p.c));
    this.lights = (m.lightsLu ?? []).map((l, i) => {
      const s = partSprite(this.o.decor, 'fx.p.glow', FX_ZONES);
      s.tint = LIGHT_COLORS[this.age];
      s.blendMode = 'add';
      s.position.set(l.x, -l.y);
      s.scale.set(Math.max(0.5, l.r / 9));
      this.lightLayer.addChild(s);
      return { s, phase: i * 1.7, crumbleMax: l.crumbleMax, a: 0.38 };
    });
    this.placeHorn();
    const w = m.widthLu ?? 160;
    this.shadow.position.set(-w * 0.48 * this.facing, 3);
    this.shadow.scale.set((w * 1.25) / 36, 2.4);
    this.show();
  }

  private placeHorn(): void {
    const h = this.sheet.meta.hornLu ?? [-80, 250];
    this.horn.position.set(h[0] * this.facing, -h[1]);
    this.horn.scale.set(1.6);
    const hc = this.o.def.anchors.hitCenter;
    this.glow.position.set(hc.x * this.facing, hc.y);
    this.glow.scale.set(this.sheet.meta.heightLu / 14);
  }

  /** Duck-typed by the base dressing (A18.9.4): tints the body, never the team layer (A11). */
  setSkinTint(tint: number | null): void {
    this.skinTint = tint;
    this.bodyPair.base.tint = tint ?? 0xffffff;
  }

  mountPoints(): Pt[] {
    return (this.sheet.meta.mountsLu ?? []).map(([x, y]) => ({ x: this.root.x + x * this.facing, y: this.root.y - y }));
  }

  /** Motion options from the render layer (duck-typed on top of the BaseView contract). */
  setMotion(m: ViewMotion): void {
    this.motion = m;
  }

  setCrumble(stage: 0 | 1 | 2 | 3): void {
    if (stage > this.crumble) this.debris(4 + stage * 2);
    this.crumble = stage;
    this.show();
  }

  setTreasury(level: number): void {
    const up = level > this.treasury;
    this.treasury = level;
    this.show();
    if (!up || !this.live) return;
    this.popMs = 320;
    // during the evolve the assembly pops the Treasury itself
    if (this.morph && !this.morph.shown) return;
    this.treasuryT = 0;
    this.coinBurst();
  }

  /**
   * The Ascension build-up (duck-typed; render calls it on `ascendStart`): `ms` is the time until
   * `ageUp`, when `morphTo` fires the beat.
   */
  ascend(ms: number): void {
    if (this.destroyed || this.collapseT >= 0) return;
    this.endAscend(false);
    const footprint = partSprite(this.o.decor, 'fx.p.glow', FX_ZONES);
    footprint.tint = ENERGY_COLORS[this.age];
    footprint.blendMode = 'add';
    const r = this.bodyRect();
    footprint.position.set((r ? r.x + r.w / 2 : -80) * this.facing, -2);
    footprint.scale.set(((r?.w ?? 160) * 0.75) / 10, 1.6);
    footprint.alpha = 0;
    this.overlay.addChildAt(footprint, 0);
    this.ascending = { t: 0, ms: Math.max(300, ms), cracks: this.makeCracks(), footprint, moteAcc: 0, dustAcc: 0 };
  }

  /** A new turret slot is built on mount `i` (duck-typed; render calls it on `mountBought`). */
  mountBuilt(i: number): void {
    const m = this.sheet.meta.mountsLu?.[i];
    if (!m || this.destroyed) return;
    const colors = RUBBLE_COLORS[this.age];
    const metal = AGES.indexOf(this.age) >= AGES.indexOf('industrial');
    const x = m[0] * this.facing;
    const y = -m[1];
    const ledge = new Container();
    const slab = partSprite(this.o.decor, 'fx.p.beam', FX_ZONES);
    slab.tint = colors[1] ?? 0x77695a;
    slab.position.set(0, -2);
    slab.scale.set(1, 1.3);
    const lip = partSprite(this.o.decor, 'fx.p.beam', FX_ZONES);
    lip.tint = colors[2] ?? 0xa08e78;
    lip.scale.set(1, 0.5);
    lip.position.set(0, -3.2);
    // a dark underside and a warm top edge so the grey ledge reads against the grey wall
    const under = partSprite(this.o.decor, 'fx.p.beam', FX_ZONES);
    under.tint = 0x2a2220;
    under.alpha = 0.7;
    under.scale.set(1, 0.9);
    under.position.set(0, 2.4);
    const edge = partSprite(this.o.decor, 'fx.p.beam', FX_ZONES);
    edge.tint = 0xffe7b0;
    edge.blendMode = 'add';
    edge.alpha = 0.55;
    edge.scale.set(1, 0.22);
    edge.position.set(0, -4.4);
    ledge.addChild(under, slab, lip, edge);
    // the ledge slides out of the wall toward the lane: its left end sits at the wall
    ledge.position.set(x - 18 * this.facing, y + 2);
    ledge.scale.set(0, 1.4);
    this.overlay.addChild(ledge);
    const flyers: Flyer[] = [];
    const n = this.motion.lite ? 4 : 6;
    for (let j = 0; j < n; j++) {
      const s = partSprite(this.o.decor, metal ? 'fx.p.chunk' : j % 2 ? 'fx.p.rock' : 'fx.p.rock2', FX_ZONES);
      s.tint = colors[j % 3] ?? 0x8c7b68;
      s.scale.set(metal ? 1.9 : 1.8);
      s.visible = false;
      this.overlay.addChild(s);
      const x1 = x + (-15 + (30 * j) / Math.max(1, n - 1)) * this.facing;
      flyers.push({
        s,
        x0: x - (30 + this.rng.next() * 30) * this.facing,
        y0: y + 50 + this.rng.next() * 30,
        x1,
        y1: y - 3,
        arc: 45 + this.rng.next() * 25,
        spin: (this.rng.next() - 0.5) * 14,
        delay: 140 + j * 70,
        t: 0,
        T: 240,
        hold: 520 - j * 40,
        landed: false,
      });
    }
    this.slots.push({ x, y, t: 0, ledge, flyers, metal });
    this.dust(x, y + 2, 3, 0.8);
  }

  morphTo(age: AgeId, ms: number = CLIP_TIMING.baseMorphMs): void {
    this.finishMorph();
    const idx = Math.max(0, AGES.indexOf(age));
    const m: Morph = {
      age,
      ms: Math.max(200, ms),
      t: 0,
      hold: 0,
      started: false,
      next: null,
      power: 0.78 + 0.075 * idx,
      shards: [],
      bands: [],
      assembled: 0,
      shown: false,
      end: 0,
      twinkled: 0,
    };
    this.morph = m;
    const src = this.o.sourceFor(age);
    if (src) {
      const hit = this.o.world.get(src);
      if (hit) m.next = hit;
      else void this.o.world.ensure(src).then((s) => (m.next = s));
    }
    // the next sheet is usually loaded (one age ahead); otherwise the build-up holds at its peak
    if (!m.next && src !== undefined && !this.ascending) this.ascend(MAX_HOLD_MS);
  }

  lastStandGlow(on: boolean): void {
    this.hornOn = on;
    this.horn.visible = on;
    this.glow.visible = on;
  }

  hit(): void {
    this.shakeAmp = this.shakeMs > 0 ? Math.max(this.shakeAmp, 1) : 1;
    this.shakeMs = Math.max(this.shakeMs, 240);
    this.flashMs = 90;
    this.debris(2);
  }

  collapse(): void {
    if (this.collapseT < 0) {
      this.endAscend(false);
      this.finishMorph();
      this.collapseT = 0;
      this.debris(16, 1.6);
      this.billows(4);
    }
  }

  update(dtMs: number): void {
    if (this.destroyed) return;
    this.live = true;
    this.clockMs += dtMs;
    const reduce = this.motion.reduce;
    let sx = 1;
    let sy = 1;
    let ox = 0;
    let oy = 0;
    if (this.shakeMs > 0) {
      this.shakeMs = Math.max(0, this.shakeMs - dtMs);
      const k = (this.shakeMs / 240) * this.shakeAmp * (reduce ? 0 : 1);
      ox = (this.rng.next() - 0.5) * 6 * k;
      oy = (this.rng.next() - 0.5) * 3 * k;
    }
    let flash = this.flashMs > 0 ? this.flashMs / 90 : 0;
    this.flashMs = Math.max(0, this.flashMs - dtMs);
    this.lightBoost = 0;
    if (this.ascending) {
      const a = this.stepAscend(dtMs);
      ox += a.ox;
      oy += a.oy;
      sx *= a.sx;
      sy *= a.sy;
      flash = Math.max(flash, a.flash);
    }
    if (this.morph) {
      const m = this.stepMorph(dtMs);
      sx *= m.sx;
      sy *= m.sy;
      flash = Math.max(flash, m.flash);
    }
    if (this.collapseT >= 0) {
      this.collapseT += dtMs;
      const u = Math.min(1, this.collapseT / 1400);
      oy += u * u * 40;
      sy *= 1 - 0.45 * u;
      ox += (this.rng.next() - 0.5) * 4 * (1 - u);
      this.body.alpha = 1 - 0.55 * u;
      this.shadow.alpha = 1 - 0.6 * u;
      if (this.rng.next() < 0.06 * (1 - u)) this.debris(1, 1.2);
    }
    if (this.popMs > 0) {
      this.popMs = Math.max(0, this.popMs - dtMs);
      const s = Math.sin((this.popMs / 320) * Math.PI) * (reduce ? 0 : 1);
      sx *= 1 + 0.025 * s;
      sy *= 1 - 0.02 * s;
    }
    this.stepTreasury(dtMs);
    // squash and stretch about the body's bottom centre, not the gate
    const r = this.bodyRect();
    const cx = r ? r.x + r.w / 2 : -(this.sheet.meta.widthLu ?? 160) * 0.48;
    this.body.pivot.set(cx, 0);
    this.body.position.set(cx * this.facing + ox, oy);
    this.body.scale.set(this.facing * sx, sy);
    this.flash.visible = flash > 0.01;
    this.flash.alpha = Math.min(1, flash) * EVOLVE_FLASH_MAX;
    // lights flicker (two sines, per light phase), brighter during the build-up and the flourish
    for (const l of this.lights) {
      const on = this.crumble <= l.crumbleMax && this.collapseT < 0;
      l.s.visible = on;
      if (on) {
        const f = 1 + 0.14 * Math.sin(this.clockMs / 83 + l.phase) + 0.08 * Math.sin(this.clockMs / 37 + l.phase * 2);
        l.s.alpha = Math.min(1, l.a * f * (1 + this.lightBoost));
        l.s.scale.y = l.s.scale.x * (0.96 + 0.06 * f);
      }
    }
    // damage smoke from the stage-2 crumble on
    const smoke = (this.sheet.meta.smokeLu ?? []).filter((s) => this.crumble >= s.crumbleMin);
    if (smoke.length > 0 && this.collapseT < 0) {
      this.smokeAcc += (dtMs / 1000) * 1.1 * smoke.length;
      while (this.smokeAcc >= 1) {
        this.smokeAcc -= 1;
        const s = smoke[Math.floor(this.rng.next() * smoke.length)] ?? smoke[0];
        if (s) this.smokePuff(s.x, s.y);
      }
    }
    if (this.hornOn) {
      const k = 0.5 + 0.5 * Math.sin(this.clockMs / 180);
      const h = this.sheet.meta.hornLu ?? [-80, 250];
      this.horn.y = -h[1] - 4 * k;
      this.horn.rotation = Math.sin(this.clockMs / 260) * 0.08;
      this.glow.alpha = 0.35 + 0.35 * k;
    }
    this.show();
    this.stepSlots(dtMs);
    this.puffs.update(dtMs);
    this.bits.update(dtMs);
    this.stepChunks(dtMs);
  }

  // ------------------------------------------------------------------------------------------
  // Evolve: build-up

  /** Spots on the body where light leaks: its lights, ledges and centre, jittered. */
  private crackSpots(): Pt[] {
    const m = this.sheet.meta;
    const spots: Pt[] = [];
    for (const l of m.lightsLu ?? []) spots.push({ x: l.x, y: -l.y });
    for (const [x, y] of m.mountsLu ?? []) spots.push({ x: x - 10, y: -y + 14 });
    const hc = this.o.def.anchors.hitCenter;
    spots.push({ x: hc.x, y: hc.y }, { x: hc.x, y: hc.y - 40 }, { x: hc.x + 20, y: hc.y + 30 });
    return spots;
  }

  private makeCracks(): Crack[] {
    const spots = this.crackSpots();
    const idx = Math.max(0, AGES.indexOf(this.age));
    const n = this.motion.lite ? 4 : Math.min(spots.length + 3, 7 + Math.round(idx * 0.5));
    const tint = LIGHT_COLORS[this.age];
    const out: Crack[] = [];
    for (let i = 0; i < n; i++) {
      const p = spots[Math.floor(this.rng.next() * spots.length)] ?? { x: -80, y: -100 };
      const c = new Container();
      // a jagged streak: two thin sparks at an angle, and a soft glow behind them
      const g = partSprite(this.o.decor, 'fx.p.glow', FX_ZONES);
      g.tint = tint;
      g.blendMode = 'add';
      g.scale.set(2.2);
      c.addChild(g);
      const rot = -Math.PI / 2 + (this.rng.next() - 0.5) * 1.2;
      for (let j = 0; j < 2; j++) {
        const s = partSprite(this.o.decor, 'fx.p.spark', FX_ZONES);
        s.tint = 0xfff8ea;
        s.blendMode = 'add';
        s.rotation = rot + (j ? 0.6 : -0.3);
        s.scale.set(2.6 + this.rng.next() * 1.4, 1.3);
        s.position.set(j ? 4 : -3, j ? -7 : 6);
        c.addChild(s);
      }
      c.position.set(p.x + (this.rng.next() - 0.5) * 16, p.y + (this.rng.next() - 0.5) * 16);
      c.alpha = 0;
      this.crackLayer.addChild(c);
      out.push({ c, at: 0.08 + (0.62 * i) / Math.max(1, n), phase: this.rng.next() * 6, a: 0 });
    }
    return out;
  }

  private stepAscend(dtMs: number): { ox: number; oy: number; sx: number; sy: number; flash: number } {
    const a = this.ascending;
    if (!a) return { ox: 0, oy: 0, sx: 1, sy: 1, flash: 0 };
    a.t = Math.min(a.ms, a.t + dtMs);
    if (a.t >= a.ms && !this.morph) {
      // no ageUp followed (the match ended): let the peak go after a while
      a.over = (a.over ?? 0) + dtMs;
      if (a.over > MAX_HOLD_MS) {
        this.endAscend(false);
        return { ox: 0, oy: 0, sx: 1, sy: 1, flash: 0 };
      }
    }
    const u = a.t / a.ms;
    const reduce = this.motion.reduce;
    const power = 0.78 + 0.075 * Math.max(0, AGES.indexOf(this.age) + 1);
    // tremble: grows with u², faster near the end
    const amp = reduce ? 0 : (0.25 + 1.9 * u * u) * power;
    const hz = 18 + 16 * u;
    const ox = amp * (Math.sin((this.clockMs / 1000) * hz * Math.PI * 2) * 0.7 + (this.rng.next() - 0.5) * 0.6);
    const oy = amp * 0.35 * (this.rng.next() - 0.5);
    // anticipation: the last 12% squash down
    const ant = reduce ? 0 : easeInQuad((u - 0.88) / 0.12);
    const sx = 1 + 0.035 * ant;
    const sy = 1 - 0.055 * ant;
    for (const c of a.cracks) {
      const v = clamp01((u - c.at) / 0.18);
      const flick = 0.82 + 0.18 * Math.sin(this.clockMs / 47 + c.phase) * Math.sin(this.clockMs / 113 + c.phase * 2);
      c.c.alpha = Math.min(1, v * flick * (0.7 + 0.5 * u));
      c.c.scale.set(0.6 + 0.6 * v + 0.45 * u);
    }
    a.footprint.alpha = 0.15 + 0.55 * u * (0.85 + 0.15 * Math.sin(this.clockMs / 90));
    this.lightBoost = Math.max(this.lightBoost, 1.4 * u);
    // energy motes rising around the base, dust trickling off it
    const r = this.bodyRect();
    const w = r?.w ?? 160;
    const x0 = r?.x ?? -160;
    if (!this.motion.lite) {
      a.moteAcc += (dtMs / 1000) * (5 + 22 * u) * power;
      while (a.moteAcc >= 1) {
        a.moteAcc -= 1;
        const s = partSprite(this.o.decor, 'fx.p.xp', FX_ZONES);
        s.tint = ENERGY_COLORS[this.age];
        s.blendMode = 'add';
        s.position.set((x0 + this.rng.next() * w) * this.facing, -2 - this.rng.next() * 12);
        this.bits.add(s, { vx: (this.rng.next() - 0.5) * 16, vy: -70 - this.rng.next() * 90 - 60 * u, life: 800 + this.rng.next() * 500, s0: 0.9 + 0.5 * u, s1: 0.2, a0: 0.9, fadeIn: 0.15, spin: (this.rng.next() - 0.5) * 6 });
      }
    }
    a.dustAcc += (dtMs / 1000) * (1 + 7 * u) * (this.motion.lite ? 0.5 : 1);
    while (a.dustAcc >= 1) {
      a.dustAcc -= 1;
      const s = partSprite(this.o.decor, this.rng.next() < 0.5 ? 'fx.p.dust' : 'fx.p.rock2', FX_ZONES);
      s.tint = DUST_COLORS[this.age];
      const h = this.sheet.meta.heightLu;
      s.position.set((x0 + w * (0.15 + this.rng.next() * 0.7)) * this.facing, -h * (0.3 + this.rng.next() * 0.55));
      this.bits.add(s, { vx: (this.rng.next() - 0.5) * 20, vy: 10, g: 520, life: 700, s0: 0.5, s1: 0.35, a0: 0.8, spin: 3 });
    }
    // the body heats up: a pulsing glow that quickens toward the beat
    const pulse = 0.75 + 0.25 * Math.sin((this.clockMs / 1000) * (4 + 10 * u) * Math.PI * 2);
    return { ox, oy, sx, sy, flash: (0.06 + 0.5 * u * u) * pulse };
  }

  /** Ends the build-up; with `burst` its crack lights blow out as sparks. */
  private endAscend(burst: boolean): void {
    const a = this.ascending;
    if (!a) return;
    this.ascending = null;
    for (const c of a.cracks) {
      if (burst) this.sparks(c.c.x * this.facing, c.c.y, 3, 220, ENERGY_COLORS[this.age]);
      c.c.destroy({ children: true });
    }
    a.footprint.destroy({ children: true });
  }

  // ------------------------------------------------------------------------------------------
  // Evolve: beat, assembly, flourish

  private stepMorph(dtMs: number): { sx: number; sy: number; flash: number } {
    const m = this.morph;
    if (!m) return { sx: 1, sy: 1, flash: 0 };
    if (!m.started) {
      const waiting = !m.next && m.hold < MAX_HOLD_MS && this.o.sourceFor(m.age) !== undefined;
      if (waiting) {
        m.hold += dtMs;
        return { sx: 1, sy: 1, flash: 0 };
      }
      this.beat(m);
    } else {
      m.t += dtMs;
    }
    const f = m.ms / MORPH_REF_MS;
    const reduce = this.motion.reduce;
    let sx = 1;
    let sy = 1;
    let flash = 0;
    // old shards burst away
    const dt = dtMs / 1000;
    for (const s of m.shards) {
      const u = clamp01(m.t / s.life);
      s.vy += 1150 * dt;
      s.p.c.x += s.vx * dt;
      s.p.c.y += s.vy * dt;
      s.p.c.rotation += s.spin * dt;
      s.p.c.alpha = 1 - easeInQuad((u - 0.35) / 0.65);
      s.p.c.scale.set(1 - 0.25 * u);
      if (s.p.flash) s.p.flash.alpha = Math.max(0, 0.9 - u * 3);
      s.p.c.visible = u < 1;
    }
    // the new body assembles band by band
    for (const b of m.bands) {
      const bt = m.t - b.start;
      if (bt < 0) {
        b.p.c.visible = false;
        continue;
      }
      b.p.c.visible = true;
      const land = b.dur * 0.55;
      if (reduce) {
        b.p.c.alpha = clamp01(bt / (b.dur * 0.6));
        b.p.c.position.set(b.p.x, b.p.y);
        if (b.p.flash) b.p.flash.alpha = 0.6 * bump(bt / b.dur, 0, 1);
        continue;
      }
      if (bt < land) {
        const u = bt / land;
        b.p.c.alpha = clamp01(u * 3);
        b.p.c.position.set(b.p.x, b.p.y - b.drop * (1 - easeInQuad(u)));
        b.p.c.scale.set(0.96, 1.06);
        if (b.p.flash) b.p.flash.alpha = 0.5 * (1 - u);
      } else {
        if (!b.landed) {
          b.landed = true;
          this.bandLanded(b, m);
        }
        const u = clamp01((bt - land) / (b.dur - land));
        const s = springSettle(u, 2, 4.5);
        b.p.c.alpha = 1;
        // squash on the landing, then settle: scale about the band's bottom edge
        const ssy = 0.84 + 0.16 * s;
        const ssx = 1.08 - 0.08 * s;
        b.p.c.scale.set(ssx, ssy);
        b.p.c.position.set(b.p.x, b.p.y + (b.p.h / 2) * (1 - ssy));
        if (b.p.flash) b.p.flash.alpha = 0.9 * (1 - easeOutCubic(u * 1.6));
      }
    }
    if (!m.shown && m.t >= m.assembled) {
      m.shown = true;
      for (const b of m.bands) destroyPiece(b.p);
      m.bands = [];
      this.art.visible = true;
      this.lightLayer.visible = true;
      // the settle thump: ground dust and a camera-free squash
      if (!reduce) this.billows(this.motion.lite ? 1 : 2, 0.5);
      this.treasuryT = 0;
    }
    if (m.shown) {
      const st = m.t - m.assembled;
      if (!reduce) {
        const u = clamp01(st / (440 * f));
        const s = springSettle(u, 2.2, 4.2);
        sy = 0.93 + 0.07 * s;
        sx = 1.045 - 0.045 * s;
      }
      // flags unfurl from their tops
      this.unfurlFlags(clamp01(st / (460 * f)));
      // flourish: a gleam over the new body and twinkles at its lights and ledges
      const fl = st - 220 * f;
      flash = Math.max(flash, 0.5 * bump(fl / (520 * f), 0, 1));
      this.lightBoost = Math.max(this.lightBoost, 1.5 * bump(fl / (700 * f), 0, 1));
      const spots = this.crackSpots();
      const want = Math.min(spots.length, 6);
      while (fl > 0 && m.twinkled < want && fl >= m.twinkled * 70 * f) {
        const p = spots[(m.twinkled * 5 + 1) % spots.length];
        if (p) this.twinkle(p.x * this.facing, p.y, m.twinkled === 0 ? 1.4 : 1);
        m.twinkled++;
      }
    }
    // the beat's core flash
    flash = Math.max(flash, 1 - clamp01(m.t / (260 * f)));
    if (m.t >= m.end) this.finishMorph();
    return { sx, sy, flash };
  }

  /** The transformation beat: the old body shatters, the new sheet swaps in as bands. */
  private beat(m: Morph): void {
    m.started = true;
    m.t = 0;
    this.endAscend(true);
    const f = m.ms / MORPH_REF_MS;
    const reduce = this.motion.reduce;
    const lite = this.motion.lite;
    const k0 = this.sheet.luPerUnit;
    const oldAge = this.age;
    // 1. the old body breaks into shards
    const A0 = this.sheet.animations;
    const stage0 = Math.max(0, Math.min((A0['body']?.length ?? 1) - 1, this.crumble));
    const oldMain = A0['body']?.[stage0];
    const oldTeam = A0['body_team']?.[stage0];
    const r0 = unionRect(texRect(oldMain), texRect(oldTeam));
    if (r0) {
      const cols = reduce ? 1 : lite ? 3 : Math.round(3 + m.power * 1.4);
      const rows = reduce ? 1 : lite ? 3 : Math.round(4 + m.power * 1.6);
      const cxAll = r0.x + r0.w / 2;
      const cyAll = r0.y + r0.h * 0.55;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const rect: Rect = { x: r0.x + (r0.w * i) / cols, y: r0.y + (r0.h * j) / rows, w: r0.w / cols + 0.5, h: r0.h / rows + 0.5 };
          const p = makePiece(oldTeam, oldMain, rect, k0, this.o.teamColor, true);
          if (!p) continue;
          this.shardLayer.addChild(p.c);
          const dx = (rect.x + rect.w / 2 - cxAll) / (r0.w / 2);
          const dy = (rect.y + rect.h / 2 - cyAll) / (r0.h / 2);
          const sp = reduce ? 0 : (170 + this.rng.next() * 170) * m.power;
          m.shards.push({
            p,
            // outward from the centre and mostly up, only a little toward the back: the base sits
            // at the world's end, so shards that fly backward leave the screen at once (review
            // in a real battle); up-and-over arcs stay in view and clear the lane as they fall
            vx: reduce ? 0 : (dx * 0.85 - 0.1) * sp + (this.rng.next() - 0.5) * 50,
            vy: reduce ? 0 : dy * sp * 0.3 - (170 + this.rng.next() * 190) * m.power,
            spin: reduce ? 0 : (this.rng.next() - 0.5) * 9,
            life: (reduce ? 320 : 480 + this.rng.next() * 300) * f,
          });
        }
      }
    }
    // 2. the new sheet
    if (m.next) {
      this.sheet = m.next;
      this.age = m.age;
      const src = this.o.sourceFor(m.age);
      if (src) this.root.label = src;
      this.build();
    }
    this.art.visible = false;
    this.lightLayer.visible = false;
    const A = this.sheet.animations;
    const stage = Math.max(0, Math.min((A['body']?.length ?? 1) - 1, this.crumble));
    const main = A['body']?.[stage];
    const team = A['body_team']?.[stage];
    const r = unionRect(texRect(main), texRect(team));
    const k = this.sheet.luPerUnit;
    let last = 0;
    if (r) {
      const n = lite || reduce ? 3 : m.power > 1.1 ? 5 : 4;
      for (let i = 0; i < n; i++) {
        // i = 0 is the bottom band
        const rect: Rect = { x: r.x, y: r.y + (r.h * (n - 1 - i)) / n, w: r.w, h: r.h / n + 0.6 };
        const p = makePiece(team, main, rect, k, this.o.teamColor, true);
        if (!p) continue;
        p.c.visible = false;
        this.bandLayer.addChild(p.c);
        const start = (110 + i * (reduce ? 70 : 105)) * f;
        const dur = (reduce ? 260 : 330) * f;
        m.bands.push({ p, start, dur, drop: (38 + 16 * i) * (0.8 + 0.25 * m.power), landed: false });
        last = Math.max(last, start + dur);
      }
    }
    m.assembled = last;
    m.end = Math.max(m.ms, last + 1000 * f);
    // 3. the beat itself: core glow, shockwave, sparks, rubble, dust
    const hc = this.o.def.anchors.hitCenter;
    const rb = this.bodyRect();
    const cx = rb ? rb.x + rb.w / 2 : hc.x;
    const w = rb?.w ?? 160;
    const energy = ENERGY_COLORS[m.age];
    const core = partSprite(this.o.decor, 'fx.p.glow', FX_ZONES);
    core.tint = 0xfff6e8;
    core.blendMode = 'add';
    core.position.set(cx * this.facing, hc.y);
    this.bits.add(core, { life: 420 * f, s0: 3, s1: 12 * m.power, a0: 0.8 });
    if (!reduce) {
      const ground = partSprite(this.o.decor, 'fx.p.ringThick', FX_ZONES);
      ground.tint = 0xfff4e2;
      ground.position.set(cx * this.facing, -2);
      this.bits.add(ground, { life: 560 * f, s0: 1.5, s1: (w / 10) * 1.1 * m.power, a0: 0.7 });
      ground.scale.y = 0.3;
      const ring = partSprite(this.o.decor, 'fx.p.ring', FX_ZONES);
      ring.tint = energy;
      ring.blendMode = 'add';
      ring.position.set(cx * this.facing, hc.y);
      this.bits.add(ring, { life: 480 * f, s0: 2, s1: 11 * m.power, a0: 0.75, delay: 40 });
    }
    this.sparks(cx * this.facing, hc.y, Math.round((lite ? 8 : 16) * m.power), 520 * m.power, energy);
    this.debrisOf(oldAge, Math.round((lite ? 4 : 8) * m.power), 1.2);
    this.billows(lite ? 2 : 3, 0.8);
    this.shakeMs = reduce ? 0 : 260;
    this.shakeAmp = 1.6 * m.power;
    // the ground squash: the shadow flattens and springs back
    this.popMs = 0;
  }

  /** A band sets down: dust at its corners, a little shake, sparks on the last one. */
  private bandLanded(b: Band, m: Morph): void {
    const left = b.p.x - b.p.w / 2;
    const right = b.p.x + b.p.w / 2;
    const y = b.p.y + b.p.h / 2;
    this.dust(left * this.facing + 6 * this.facing, y, this.motion.lite ? 1 : 2, 0.7);
    this.dust(right * this.facing - 6 * this.facing, y, this.motion.lite ? 1 : 2, 0.7);
    this.shakeMs = Math.max(this.shakeMs, this.motion.reduce ? 0 : 110);
    this.shakeAmp = Math.max(0.5, 0.6 * m.power);
    if (b === m.bands[m.bands.length - 1]) this.sparks(b.p.x * this.facing, b.p.y - b.p.h / 2, this.motion.lite ? 4 : 8, 260, ENERGY_COLORS[m.age]);
  }

  /** Flags grow down from their tops with a spring (u = 0..1; 1 resets them). */
  private unfurlFlags(u: number): void {
    const A = this.sheet.animations;
    const flags = this.sheet.meta.flags ?? [];
    let bi = 0;
    let fi = 0;
    for (let i = 0; i < flags.length; i++) {
      const f = flags[i];
      if (!f) continue;
      const p = f.z === 'back' ? this.backFlags[bi++] : this.frontFlags[fi++];
      if (!p) continue;
      if (u >= 1 || this.motion.reduce) {
        p.c.pivot.set(0, 0);
        p.c.position.set(0, 0);
        p.c.scale.set(1);
        p.c.alpha = this.motion.reduce ? clamp01(u * 2) : 1;
        continue;
      }
      const r = texRect(A[f.clip]?.[0]);
      if (!r) continue;
      const lu = clamp01((u - i * 0.12) / 0.8);
      p.c.pivot.set(r.x + r.w / 2, r.y);
      p.c.position.set(r.x + r.w / 2, r.y);
      p.c.scale.set(0.55 + 0.45 * easeOutBack(lu, 2.2), Math.max(0.01, springSettle(lu, 2.4, 4)));
      p.c.alpha = clamp01(lu * 4);
    }
  }

  /** Clears whatever the running morph left (shards, bands), shows the art and resets the flags. */
  private finishMorph(): void {
    const m = this.morph;
    if (!m) return;
    this.morph = null;
    for (const s of m.shards) destroyPiece(s.p);
    for (const b of m.bands) destroyPiece(b.p);
    if (!m.started && m.next) {
      // interrupted before the beat: take the new sheet at once
      this.sheet = m.next;
      this.age = m.age;
      this.build();
    }
    this.art.visible = true;
    this.lightLayer.visible = true;
    this.unfurlFlags(1);
  }

  // ------------------------------------------------------------------------------------------
  // Treasury

  /** The Treasury prop's rect in lu (unmirrored, y down), or null. */
  private treasuryRect(): Rect | null {
    const tl = Math.min(this.treasury, this.sheet.animations['treasury']?.length ?? 0);
    const r = texRect(this.sheet.animations['treasury']?.[tl - 1]);
    const k = this.sheet.luPerUnit;
    return r ? { x: r.x * k, y: r.y * k, w: r.w * k, h: r.h * k } : null;
  }

  /** The Treasury pops in with squash and stretch and a golden glint. */
  private stepTreasury(dtMs: number): void {
    const c = this.treasuryPair.c;
    if (this.treasuryT < 0) return;
    this.treasuryT += dtMs;
    const t = this.treasuryT;
    const tl = Math.min(this.treasury, this.sheet.animations['treasury']?.length ?? 0);
    const r = texRect(this.sheet.animations['treasury']?.[tl - 1]);
    const done = t >= 520 || !r;
    if (done || this.motion.reduce) {
      c.pivot.set(0, 0);
      c.position.set(0, 0);
      c.scale.set(1);
      c.alpha = this.motion.reduce && !done ? clamp01(t / 200) : 1;
      if (done) this.treasuryT = -1;
      return;
    }
    // pivot at the prop's bottom centre
    c.pivot.set(r.x + r.w / 2, r.y + r.h);
    c.position.set(r.x + r.w / 2, r.y + r.h);
    let sx: number;
    let sy: number;
    if (t < 110) {
      const u = t / 110;
      sx = 0.2 + 0.45 * u;
      sy = 0.2 + 1.2 * easeOutCubic(u);
    } else if (t < 220) {
      const u = (t - 110) / 110;
      sx = 0.65 + 0.7 * easeOutCubic(u);
      sy = 1.4 - 0.65 * easeOutCubic(u);
    } else {
      const s = springSettle((t - 220) / 300, 1.6, 4);
      sx = 1.35 - 0.35 * s;
      sy = 0.75 + 0.25 * s;
    }
    c.scale.set(sx, sy);
    c.alpha = 1;
    if (t - dtMs < 200 && t >= 200) {
      const tr = this.treasuryRect();
      if (tr) this.glint((tr.x + tr.w * 0.7) * this.facing, tr.y + tr.h * 0.2, 1.6);
    }
  }

  /** Coins burst out of the Treasury and rain back into it; each one lands with a tiny glint. */
  private coinBurst(): void {
    const tr = this.treasuryRect();
    const r = this.bodyRect();
    const cx = tr ? tr.x + tr.w / 2 : r ? r.x + r.w * 0.6 : -60;
    const top = tr ? tr.y + tr.h * 0.3 : -30;
    const x = cx * this.facing;
    const lite = this.motion.lite;
    const burst = lite ? 6 : 12;
    const onKill = (kx: number, ky: number): void => {
      if (this.rng.next() < 0.6) this.glint(kx, ky, 0.55);
    };
    for (let i = 0; i < burst; i++) {
      const s = partSprite(this.o.decor, 'fx.p.coin', FX_ZONES);
      s.position.set(x + (this.rng.next() - 0.5) * 8, top);
      const a = -Math.PI / 2 + (this.rng.next() - 0.5) * 1.3;
      const sp = 300 + this.rng.next() * 170;
      this.bits.add(s, { vx: Math.cos(a) * sp * 0.3, vy: Math.sin(a) * sp, g: 1100, life: 1400, s0: 1.9, s1: 1.5, flip: 0.02 + this.rng.next() * 0.01, killY: top + 6, onKill, delay: i * 12 });
    }
    const rain = lite ? 5 : 10;
    for (let i = 0; i < rain; i++) {
      const s = partSprite(this.o.decor, 'fx.p.coin', FX_ZONES);
      s.position.set(x + (this.rng.next() - 0.5) * 36, top - 90 - this.rng.next() * 60);
      this.bits.add(s, { vx: -(s.x - x) * 0.6, vy: 40 + this.rng.next() * 60, g: 900, life: 1400, s0: 1.7, s1: 1.4, flip: 0.02 + this.rng.next() * 0.01, killY: top + 4, onKill, delay: 260 + i * 55, fadeIn: 0.08 });
    }
    const g = partSprite(this.o.decor, 'fx.p.glow', FX_ZONES);
    g.tint = GOLD;
    g.blendMode = 'add';
    g.position.set(x, top);
    this.bits.add(g, { life: 800, s0: 1, s1: 6, a0: 0.7, pulse: true });
  }

  // ------------------------------------------------------------------------------------------
  // New turret slot

  private stepSlots(dtMs: number): void {
    for (let i = this.slots.length - 1; i >= 0; i--) {
      const sl = this.slots[i];
      if (!sl) continue;
      sl.t += dtMs;
      // the ledge slides out with an overshoot, holds, then fades into the modelled ledge
      const u = clamp01(sl.t / 320);
      const ext = this.motion.reduce ? (u > 0 ? 1 : 0) : easeOutBack(u, 2);
      sl.ledge.scale.set(3.6 * ext * this.facing, 1.4);
      sl.ledge.alpha = sl.t < 900 ? 1 : 1 - clamp01((sl.t - 900) / 300);
      if (this.motion.reduce) sl.ledge.alpha *= clamp01(sl.t / 200);
      for (const f of sl.flyers) {
        if (sl.t < f.delay) continue;
        f.s.visible = true;
        f.t = sl.t - f.delay;
        if (f.t < f.T) {
          const v = f.t / f.T;
          f.s.position.set(f.x0 + (f.x1 - f.x0) * v, f.y0 + (f.y1 - f.y0) * v - f.arc * Math.sin(Math.PI * v));
          f.s.rotation = f.spin * (1 - v);
          f.s.alpha = clamp01(v * 4);
        } else {
          if (!f.landed) {
            f.landed = true;
            f.s.position.set(f.x1, f.y1);
            f.s.rotation = 0;
            if (sl.metal) this.sparks(f.x1, f.y1, 4, 200, 0xfff4dc);
            else this.dust(f.x1, f.y1 + 2, 2, 0.8);
            this.twinkle(f.x1, f.y1 - 2, 0.35);
          }
          const lt = f.t - f.T;
          const sq = this.motion.reduce ? 0 : bump(lt / 160, 0, 1);
          f.s.scale.set(1.8 * (1 + 0.3 * sq), 1.8 * (1 - 0.3 * sq));
          f.s.alpha = 1 - clamp01((lt - f.hold) / 250);
        }
      }
      if (sl.t - dtMs < 720 && sl.t >= 720) {
        // done: a golden ring and glow on the new ledge (a slot is a reward), sparks and a twinkle
        const ring = partSprite(this.o.decor, 'fx.p.ringThick', FX_ZONES);
        ring.tint = GOLD;
        ring.blendMode = 'add';
        ring.position.set(sl.x, sl.y - 6);
        this.bits.add(ring, { life: 460, s0: 0.8, s1: 5.5, a0: 0.9 });
        const g = partSprite(this.o.decor, 'fx.p.glow', FX_ZONES);
        g.tint = GOLD;
        g.blendMode = 'add';
        g.position.set(sl.x, sl.y - 8);
        this.bits.add(g, { life: 600, s0: 1, s1: 4, a0: 0.7, pulse: true });
        this.sparks(sl.x, sl.y - 6, this.motion.lite ? 4 : 8, 240, 0xfff1d2);
        this.twinkle(sl.x, sl.y - 14, 1.2);
        this.popMs = 320;
      }
      if (sl.t > 1400) {
        sl.ledge.destroy({ children: true });
        for (const f of sl.flyers) f.s.destroy({ children: true });
        this.slots.splice(i, 1);
      }
    }
  }

  // ------------------------------------------------------------------------------------------
  // Small effects

  /** The body frame's rect in lu (unmirrored, y down). */
  private bodyRect(): Rect | null {
    const A = this.sheet.animations;
    const r = texRect(A['body']?.[0]);
    const k = this.sheet.luPerUnit;
    return r ? { x: r.x * k, y: r.y * k, w: r.w * k, h: r.h * k } : null;
  }

  private sparks(x: number, y: number, n: number, speed: number, tint: number): void {
    for (let i = 0; i < n; i++) {
      const s = partSprite(this.o.decor, i % 3 === 0 ? 'fx.p.sparkHot' : 'fx.p.spark', FX_ZONES);
      if (i % 3 !== 0) s.tint = tint;
      s.blendMode = 'add';
      s.position.set(x, y);
      const a = -Math.PI / 2 + (this.rng.next() - 0.5) * Math.PI * 1.6;
      const sp = speed * (0.45 + this.rng.next() * 0.55);
      this.bits.add(s, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 420, drag: 2.2, life: 380 + this.rng.next() * 300, s0: 1.5, s1: 0.4, align: true });
    }
  }

  private twinkle(x: number, y: number, size: number): void {
    const s = partSprite(this.o.decor, 'fx.p.star', FX_ZONES);
    s.tint = 0xfff8e6;
    s.blendMode = 'add';
    s.position.set(x, y);
    this.bits.add(s, { life: 520, s0: 0.1, s1: 2.8 * size, spin: 4, pulse: true });
  }

  private glint(x: number, y: number, size: number): void {
    const s = partSprite(this.o.decor, 'fx.p.star', FX_ZONES);
    s.tint = GOLD_GLINT;
    s.blendMode = 'add';
    s.position.set(x, y);
    this.bits.add(s, { life: 360, s0: 0.1, s1: 1.6 * size, spin: 5, pulse: true });
  }

  private dust(x: number, y: number, n: number, size: number): void {
    for (let i = 0; i < n; i++) {
      const s = partSprite(this.o.decor, 'fx.p.dust', FX_ZONES);
      s.tint = DUST_COLORS[this.age];
      s.position.set(x + (this.rng.next() - 0.5) * 8, y);
      const dir = this.rng.next() < 0.5 ? -1 : 1;
      this.puffs.add(s, { vx: dir * (30 + this.rng.next() * 40), vy: -14 - this.rng.next() * 16, life: 520, s0: 0.8 * size, s1: 2 * size, a0: 0.85 });
    }
  }

  private smokePuff(x: number, y: number): void {
    const s = partSprite(this.o.decor, 'fx.p.smoke', FX_ZONES);
    s.tint = this.age === 'future' || this.age === 'cosmic' ? 0x8c8aa0 : 0x7a746c;
    s.position.set(x * this.facing + (this.rng.next() - 0.5) * 8, -y);
    this.puffs.add(s, { vx: 6 + this.rng.next() * 8, vy: -26 - this.rng.next() * 14, life: 1600, s0: 1.1, s1: 3.2, a0: 0.45 });
  }

  /** Rubble chunks: spin, fall under gravity, bounce on the ground (y = 0) twice, then fade. */
  private stepChunks(dtMs: number): void {
    const dt = dtMs / 1000;
    for (let i = this.chunks.length - 1; i >= 0; i--) {
      const c = this.chunks[i];
      if (!c) continue;
      c.age += dtMs;
      if (c.age >= c.life) {
        c.s.destroy();
        this.chunks.splice(i, 1);
        continue;
      }
      c.vy += 900 * dt;
      c.s.x += c.vx * dt;
      c.s.y += c.vy * dt;
      c.s.rotation += c.spin * dt;
      if (c.s.y > 0 && c.vy > 0) {
        c.s.y = 0;
        if (c.bounces < 2) {
          c.vy *= -0.38;
          c.vx *= 0.6;
          c.spin *= 0.5;
          c.bounces++;
        } else {
          c.vy = 0;
          c.vx *= 0.8;
          c.spin = 0;
        }
      }
      const fade = c.life - c.age;
      c.s.alpha = Math.min(1, fade / 300);
    }
  }

  private show(): void {
    const A = this.sheet.animations;
    const stage = Math.max(0, Math.min((A['body']?.length ?? 1) - 1, this.crumble));
    setFrame(this.bodyPair.base, A['body']?.[stage]);
    setFrame(this.bodyPair.team, A['body_team']?.[stage]);
    setFrame(this.flash, A['body']?.[stage]);
    const tl = Math.min(this.treasury, A['treasury']?.length ?? 0);
    this.treasuryPair.c.visible = tl > 0;
    if (tl > 0) {
      setFrame(this.treasuryPair.base, A['treasury']?.[tl - 1]);
      setFrame(this.treasuryPair.team, A['treasury_team']?.[tl - 1]);
    }
    const flags = this.sheet.meta.flags ?? [];
    let bi = 0;
    let fi = 0;
    for (const f of flags) {
      const p = f.z === 'back' ? this.backFlags[bi++] : this.frontFlags[fi++];
      if (!p) continue;
      p.c.visible = this.crumble <= f.crumbleMax;
      if (!p.c.visible) continue;
      const i = frameIndex(clipDurations(this.sheet, f.clip), this.clockMs + fi * 170 + bi * 90, true);
      setFrame(p.base, A[f.clip]?.[i]);
      setFrame(p.team, A[`${f.clip}_team`]?.[i]);
    }
  }

  /** Knocks `n` rounded chunks off the base in its own palette (`size` scales them). */
  private debris(n: number, size = 1): void {
    this.debrisOf(this.age, n, size);
  }

  private debrisOf(age: AgeId, n: number, size: number): void {
    const w = this.sheet.meta.widthLu ?? 150;
    const h = this.sheet.meta.heightLu;
    const colors = RUBBLE_COLORS[age];
    for (let i = 0; i < n; i++) {
      if (this.chunks.length >= MAX_CHUNKS) {
        const old = this.chunks.shift();
        old?.s.destroy();
      }
      const s = partSprite(this.o.decor, i % 2 ? 'fx.p.rock' : 'fx.p.rock2', FX_ZONES);
      s.tint = colors[i % colors.length] ?? 0x9a9288;
      s.scale.set(size * (0.9 + this.rng.next() * 1.1));
      s.rotation = this.rng.next() * Math.PI * 2;
      s.position.set(-(0.1 + this.rng.next() * 0.8) * w * this.facing, -h * (0.2 + this.rng.next() * 0.6));
      this.chunkLayer.addChild(s);
      this.chunks.push({
        s,
        vx: (this.rng.next() - 0.25) * 150 * this.facing,
        vy: -120 - this.rng.next() * 180,
        spin: (this.rng.next() - 0.5) * 9,
        age: 0,
        life: 1400 + this.rng.next() * 900,
        bounces: 0,
      });
    }
  }

  /** Big soft dust billows that grow, rise a little and fade (the collapse, the evolve). */
  private billows(n: number, size = 1): void {
    const w = this.sheet.meta.widthLu ?? 150;
    for (let i = 0; i < n; i++) {
      const s = partSprite(this.o.decor, 'fx.p.cloud', FX_ZONES);
      s.tint = DUST_COLORS[this.age];
      s.position.set(-(0.15 + (i / Math.max(1, n - 1)) * 0.7) * w * this.facing, -10 - this.rng.next() * 30 * size);
      this.puffs.add(s, { vx: (this.rng.next() - 0.5) * 30, vy: -14 - this.rng.next() * 14, life: (1800 + this.rng.next() * 700) * size, s0: 2.2 * size, s1: 5.2 * size, a0: 0.8 });
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.endAscend(false);
    this.finishMorph();
    this.destroyed = true;
    this.puffs.clear();
    this.bits.clear();
    for (const c of this.chunks) c.s.destroy();
    this.chunks = [];
    this.slots = [];
    this.root.destroy({ children: true });
  }

  /** Test and gallery hooks. */
  get debug(): { crumble: number; treasury: number; age: string; horn: boolean; morphing: boolean; ascending: boolean; fx: number } {
    return {
      crumble: this.crumble,
      treasury: this.treasury,
      age: this.age,
      horn: this.hornOn,
      morphing: this.morph !== null,
      ascending: this.ascending !== null,
      fx: this.bits.items.length + this.puffs.items.length + this.chunks.length,
    };
  }
}
