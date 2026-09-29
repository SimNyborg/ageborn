/**
 * Sprite-sheet turret view (DESIGN A11 Turret clips, A2.8) for the 3D-rendered turrets.
 *
 * The static footing (`mount`) and the head (`idle` / `fire`) are separate sprites, so the head
 * rotates about its pivot to aim like the procedural rig; `build` and `destroyed` show the whole
 * turret. Code motion on top of the frames: the 1 s build drop-in (a stretched fall over a growing
 * shadow, a landing squash that springs back, a white impact flash, dust, sparks and three bolts
 * set one after another),
 * a 120 ms recoil shudder (3%, ui-plan 5.8) plus a two-frame head kick-back with a one-frame muzzle flash at the
 * sheet's per-frame muzzle anchor, an idle breathing bob and a slow head scan every few seconds
 * while nothing is being aimed at (so turrets never sit frozen next to lively units), the sell sink
 * with a poof, and the pulsing Modernise arrow. Modernise morphs: the old turret glows white,
 * squashes and pulls up into a streak of light (`play('modernise')`), and the new one grows out of
 * that light with an overshoot, a ring and sparks (`modernisedIn()`, duck-typed). Reduce motion
 * (`setMotion`) keeps the fades and drops the squash and bounce. `muzzlePoint()` gives the render
 * layer the live muzzle for projectile origins (docs/requests/wp5-turret-muzzle-anchor.md).
 *
 * Coordinates: the root sits on a mount point in the parent's space (lu); `aimAt(x)` aims at
 * ground level (y = 0) of that space, as in the procedural view.
 */
import { Container, Sprite, Texture } from 'pixi.js';
import type { TurretView, VisualDef } from '@/contracts/art';
import type { Side } from '@/contracts/ids';
import { mulberry32, type CosmeticRng } from '@/core/rng';
import type { PartBaker } from '../../bake';
import { FX_ZONES } from '../../effects/sprites';
import { partSprite, PuffList } from '../procedural/shared';
import { clipDurations, frameIndex, setFrame, type WorldSheet } from '../worldAtlas';
import { Bits, bump, clamp01, DEFAULT_MOTION, easeInQuad, easeOutCubic, springSettle, type ViewMotion } from './upgradeFx';

export interface AtlasTurretOptions {
  def: VisualDef;
  sheet: WorldSheet;
  decor: PartBaker;
  side: Side;
  teamColor: number;
  seed: number;
}

type Mode = 'idle' | 'fire' | 'build' | 'sell' | 'modernise';

const AIM_DEG_PER_SEC = 360;
const BUILD_MS = 1000;
const DROP_MS = 380;
const DROP_LU = 70;
const SINK_MS = 650;
/** Landing squash spring after the drop (ms). */
const LAND_MS = 380;
/** Modernise: the old turret glows and squashes, then pulls up into light (ms). */
const GLOW_MS = 190;
const VANISH_MS = 240;
/** Modernise: the new turret appears out of the light after this delay (ms). */
const EMERGE_DELAY_MS = 260;
const EMERGE_MS = 460;
/** Idle motion: head bob (lu, period ms), and a head scan (deg) every SCAN_EVERY_MS once aiming stops. */
const BOB_LU = 1.2;
const BOB_MS = 1700;
const SCAN_DEG = 7;
const SCAN_EVERY_MS = 3400;
const SCAN_MS = 1300;
const AIM_IDLE_MS = 1500;
/** Fire kick-back: the head snaps back this far for two frames, then eases home. */
const KICK_LU = 3.2;
const KICK_HOLD_MS = 34;
const KICK_MS = 150;

interface Pair {
  team: Sprite;
  base: Sprite;
  /** Additive white copy of the frame for the impact and modernise glow. */
  flash: Sprite;
  c: Container;
}

function pair(): Pair {
  const c = new Container();
  const team = new Sprite(Texture.EMPTY);
  const base = new Sprite(Texture.EMPTY);
  const flash = new Sprite(Texture.EMPTY);
  flash.blendMode = 'add';
  flash.tint = 0xfff6e8;
  flash.alpha = 0;
  c.addChild(team, base, flash);
  return { team, base, flash, c };
}

function frame(p: Pair, base: Texture | undefined, team: Texture | undefined): void {
  setFrame(p.base, base);
  setFrame(p.team, team);
  setFrame(p.flash, base);
}

export class AtlasTurretView implements TurretView {
  readonly root = new Container();
  private readonly body = new Container();
  private readonly art = new Container();
  private readonly overlay = new Container();
  private readonly mount = pair();
  private readonly head = pair();
  private readonly headPivot = new Container();
  private readonly whole = pair();
  private readonly muzzleFlash: Container;
  private readonly arrow: Container;
  private readonly puffs: PuffList;
  private readonly bits: Bits;
  private readonly shadow: Container;
  private readonly rng: CosmeticRng;
  private readonly facing: 1 | -1;
  private readonly k: number;
  private readonly pivot: { x: number; y: number };
  private readonly aimLimits: [number, number];
  private mode: Mode = 'idle';
  private t = 0;
  private idleT = 0;
  private aimDeg = 0;
  private aimTarget: number | null = null;
  private flashFrames = 0;
  private recoilMs = 0;
  private kickMs = 0;
  private sinceAimMs = 1e9;
  private outdated = false;
  private clockMs = 0;
  private landed = true;
  /** The build is a Modernise: grow out of light instead of dropping. */
  private emerge = false;
  private emerged = false;
  private bolts = 0;
  private vanished = false;
  private flashA = 0;
  private motion: ViewMotion = DEFAULT_MOTION;
  private destroyed = false;

  constructor(private readonly o: AtlasTurretOptions) {
    const m = o.sheet.meta;
    this.facing = o.side === 0 ? 1 : -1;
    this.rng = mulberry32(o.seed);
    this.k = o.sheet.luPerUnit;
    this.root.label = o.def.source;
    const p = m.pivotLu ?? [0, m.heightLu * 0.5];
    this.pivot = { x: p[0], y: -p[1] };
    this.aimLimits = m.aimLimits ?? [-55, 40];
    for (const s of [this.mount, this.head, this.whole]) s.team.tint = o.teamColor;
    // the head's sprites are anchored at the feet like every frame; the pivot container moves the
    // rotation centre to the pivot
    this.headPivot.position.set(this.pivot.x / this.k, this.pivot.y / this.k);
    this.head.c.position.set(-this.pivot.x / this.k, -this.pivot.y / this.k);
    this.headPivot.addChild(this.head.c);
    this.art.scale.set(this.k);
    this.art.addChild(this.mount.c, this.headPivot, this.whole.c);
    this.muzzleFlash = partSprite(o.decor, 'fx.p.flash', FX_ZONES);
    this.muzzleFlash.visible = false;
    this.muzzleFlash.scale.set(0.8);
    this.body.addChild(this.art, this.muzzleFlash);
    this.body.scale.x = this.facing;
    this.arrow = partSprite(o.decor, 'icon.modernise', { ...FX_ZONES });
    this.arrow.visible = false;
    this.arrow.position.set(0, -m.heightLu - 12);
    this.overlay.addChild(this.arrow);
    this.puffs = new PuffList(this.overlay);
    this.bits = new Bits(this.overlay, 40);
    // the drop shadow grows under a falling turret (only visible during the build)
    this.shadow = partSprite(o.decor, 'shared.shadow', FX_ZONES);
    this.shadow.visible = false;
    this.root.addChild(this.shadow, this.body, this.overlay);
    frame(this.mount, o.sheet.animations['mount']?.[0], o.sheet.animations['mount_team']?.[0]);
    this.show();
  }

  aimAt(x: number): void {
    this.sinceAimMs = 0;
    const dx = (x - this.root.x) * this.facing;
    const dy = -(this.root.y + this.pivot.y);
    const deg = (Math.atan2(dy, Math.max(1, dx)) * 180) / Math.PI;
    const [lo, hi] = this.aimLimits;
    this.aimTarget = Math.max(lo, Math.min(hi, deg));
  }

  /** Motion options from the render layer (duck-typed on top of the TurretView contract). */
  setMotion(m: ViewMotion): void {
    this.motion = m;
  }

  /** The new turret of a Modernise: it grows out of the old one's light (duck-typed). */
  modernisedIn(): void {
    this.play('build');
    this.emerge = true;
    this.emerged = false;
    this.body.alpha = 0;
  }

  play(clip: Mode): void {
    if (this.destroyed) return;
    if ((this.mode === 'sell' || this.mode === 'modernise') && clip !== 'build') return;
    if (clip === 'idle' && this.mode === 'build') return;
    this.mode = clip;
    this.t = 0;
    this.emerge = false;
    this.vanished = false;
    if (clip === 'fire') {
      this.flashFrames = 1;
      this.recoilMs = 120;
      this.kickMs = KICK_MS;
    }
    if (clip === 'build') {
      this.landed = false;
      this.bolts = 0;
      this.body.alpha = 1;
    }
    if (clip === 'sell') this.poof(10);
    this.show();
  }

  setOutdated(on: boolean): void {
    this.outdated = on;
    this.arrow.visible = on;
  }

  update(dtMs: number): void {
    if (this.destroyed) return;
    this.clockMs += dtMs;
    this.t += dtMs;
    this.idleT += dtMs;
    this.sinceAimMs += dtMs;
    if (this.aimTarget !== null) {
      const step = (AIM_DEG_PER_SEC * dtMs) / 1000;
      const d = this.aimTarget - this.aimDeg;
      this.aimDeg += Math.max(-step, Math.min(step, d));
    }
    let sx = 1;
    let sy = 1;
    let oy = 0;
    const reduce = this.motion.reduce;
    this.flashA = 0;
    this.shadow.visible = false;
    if (this.mode === 'build' && this.emerge) {
      ({ sx, sy } = this.stepEmerge());
      if (this.t >= BUILD_MS) {
        this.mode = 'idle';
        this.t = 0;
        this.emerge = false;
        this.body.alpha = 1;
        sx = 1;
        sy = 1;
        this.flashA = 0;
      }
    } else if (this.mode === 'build') {
      if (this.t < DROP_MS) {
        const u = this.t / DROP_MS;
        oy = reduce ? 0 : -DROP_LU * (1 - u * u);
        this.body.alpha = reduce ? u : Math.min(1, 0.3 + u * 2);
        // stretched in the fall, over a shadow that grows as it nears the ledge
        if (!reduce) {
          sx = 0.9;
          sy = 1.12;
        }
        this.shadow.visible = true;
        this.shadow.scale.set(0.5 + 0.9 * u, 0.6 + 0.4 * u);
        this.shadow.alpha = 0.25 + 0.6 * u;
      } else {
        if (!this.landed) {
          this.landed = true;
          this.poof(9);
          this.sparks(0, -4, this.motion.lite ? 3 : 6, 200, 0xfff1d2);
        }
        const i = this.t - DROP_MS;
        if (!reduce) {
          // a sheet whose build clip has landing frames already squashes (a 3D-rendered squash of
          // ~25%); stacking the full code squash on it flattened the turret into a pancake
          const s = springSettle(i / LAND_MS, 2, 4.5);
          // Props and buildings settle with at most 3% on a landing (ui-plan 5.8, realistic weight).
          const k = 0.03;
          sx = 1 + k - k * s;
          sy = 1 - k + k * s;
        }
        this.flashA = 0.85 * (1 - easeOutCubic(i / 220));
        // three bolts set one after another along the footing
        while (this.bolts < 3 && i >= 150 + this.bolts * 110) {
          this.bolt((this.bolts - 1) * 10);
          this.bolts++;
        }
      }
      if (this.t >= BUILD_MS) {
        this.mode = 'idle';
        this.t = 0;
      }
    } else if (this.mode === 'fire') {
      const total = clipDurations(this.o.sheet, 'fire').reduce((a, b) => a + b, 0);
      if (this.t >= total) this.mode = 'idle';
    } else if (this.mode === 'modernise') {
      ({ sx, sy } = this.stepVanish());
    } else if (this.mode === 'sell') {
      const u = Math.min(1, this.t / SINK_MS);
      oy = 16 * u * u;
      sy = 1 - 0.25 * u;
      this.body.alpha = 1 - u;
    }
    for (const p of [this.mount, this.head, this.whole]) p.flash.alpha = Math.min(1, this.flashA);
    if (this.recoilMs > 0) {
      this.recoilMs = Math.max(0, this.recoilMs - dtMs);
      // MR-107: the barrel kick carries the recoil; the body only shudders (at most 3%, 5.8).
      const s = Math.sin((this.recoilMs / 120) * Math.PI);
      sx *= 1 + 0.03 * s;
      sy *= 1 - 0.03 * s;
    }
    this.body.position.set(0, oy);
    this.body.scale.set(this.facing * sx, sy);
    this.show();
    this.moveHead(dtMs);
    // A11: a one-frame muzzle flash on the shot, at the sheet's muzzle anchor turned with the aim
    if (this.flashFrames > 0) {
      const mz = this.muzzle();
      this.muzzleFlash.position.set(mz.x, mz.y);
      this.muzzleFlash.rotation = (this.aimDeg * Math.PI) / 180;
      this.muzzleFlash.visible = true;
      this.flashFrames--;
    } else {
      this.muzzleFlash.visible = false;
    }
    if (this.outdated) {
      const k = 0.5 + 0.5 * Math.sin(this.clockMs / 220);
      this.arrow.alpha = 0.55 + 0.45 * k;
      this.arrow.y = -this.o.sheet.meta.heightLu - 12 - 3 * k;
    }
    this.puffs.update(dtMs);
    this.bits.update(dtMs);
  }

  /** Modernise (old turret): glow and squash, then pull up into a streak of light. */
  private stepVanish(): { sx: number; sy: number } {
    const reduce = this.motion.reduce;
    const t = this.t;
    if (t < GLOW_MS) {
      const u = t / GLOW_MS;
      this.flashA = u;
      return reduce ? { sx: 1, sy: 1 } : { sx: 1 + 0.12 * easeOutCubic(u), sy: 1 - 0.16 * easeOutCubic(u) };
    }
    if (!this.vanished) {
      this.vanished = true;
      this.sparks(0, -this.o.sheet.meta.heightLu * 0.5, this.motion.lite ? 4 : 8, 160, 0xfff6e2);
    }
    const u = clamp01((t - GLOW_MS) / VANISH_MS);
    this.flashA = 1;
    this.body.alpha = 1 - easeInQuad(u);
    return reduce ? { sx: 1, sy: 1 } : { sx: 1.12 * (1 - 0.9 * easeInQuad(u)), sy: 0.84 + 0.9 * easeOutCubic(u) };
  }

  /** Modernise (new turret): a light orb, then the turret grows out of it with an overshoot. */
  private stepEmerge(): { sx: number; sy: number } {
    const reduce = this.motion.reduce;
    const t = this.t;
    if (t < EMERGE_DELAY_MS) {
      this.body.alpha = 0;
      return { sx: 0.2, sy: 0.2 };
    }
    if (!this.emerged) {
      this.emerged = true;
      const h = this.o.sheet.meta.heightLu;
      const ring = partSprite(this.o.decor, 'fx.p.ringThick', FX_ZONES);
      ring.tint = 0xfff4e2;
      ring.position.set(0, -h * 0.45);
      this.bits.add(ring, { life: 360, s0: 0.6, s1: 4.2, a0: 0.8 });
      const g = partSprite(this.o.decor, 'fx.p.glow', FX_ZONES);
      g.tint = 0xfff0d6;
      g.blendMode = 'add';
      g.position.set(0, -h * 0.45);
      this.bits.add(g, { life: 520, s0: 1, s1: 4.4, a0: 0.8, pulse: true });
      this.sparks(0, -h * 0.45, this.motion.lite ? 5 : 10, 240, 0xfff6e2);
      for (let i = 0; i < (this.motion.lite ? 2 : 5); i++) {
        const s = partSprite(this.o.decor, 'fx.p.xp', FX_ZONES);
        s.tint = 0xfff8e4;
        s.blendMode = 'add';
        s.position.set((this.rng.next() - 0.5) * 30, -4 - this.rng.next() * 10);
        this.bits.add(s, { vy: -60 - this.rng.next() * 50, life: 700, s0: 1.1, s1: 0.2, delay: i * 60, fadeIn: 0.1 });
      }
      this.poof(6);
    }
    const i = t - EMERGE_DELAY_MS;
    this.body.alpha = clamp01(i / 120);
    this.flashA = 1 - easeOutCubic(i / 360);
    if (reduce) return { sx: 1, sy: 1 };
    const s = springSettle(i / EMERGE_MS, 2.2, 4.2);
    // grows up out of the light: tall and thin first, then round
    const g = 0.15 + 0.85 * s;
    return { sx: g * (1 - 0.12 * bump(i / EMERGE_MS, 0, 0.5)), sy: g * (1 + 0.14 * bump(i / EMERGE_MS, 0, 0.5)) };
  }

  /** Idle bob and scan, and the fire kick-back, applied to the head's pivot container. */
  private moveHead(dtMs: number): void {
    const a = (this.aimDeg * Math.PI) / 180;
    let dx = 0;
    let dy = 0;
    let scan = 0;
    if (this.mode === 'idle' || this.mode === 'fire') {
      dy = -BOB_LU * 0.5 * (1 - Math.cos((this.clockMs / BOB_MS) * Math.PI * 2));
      if (this.sinceAimMs > AIM_IDLE_MS && this.mode === 'idle') {
        const t = (this.clockMs % SCAN_EVERY_MS) / SCAN_MS;
        if (t < 1) scan = SCAN_DEG * Math.sin(t * Math.PI) * (Math.floor(this.clockMs / SCAN_EVERY_MS) % 2 ? -1 : 1);
      }
    }
    if (this.kickMs > 0) {
      this.kickMs = Math.max(0, this.kickMs - dtMs);
      const held = KICK_MS - this.kickMs <= KICK_HOLD_MS;
      const k = held ? 1 : this.kickMs / (KICK_MS - KICK_HOLD_MS);
      const d = KICK_LU * k * k;
      dx -= Math.cos(a) * d;
      dy -= Math.sin(a) * d;
    }
    this.headPivot.position.set((this.pivot.x + dx) / this.k, (this.pivot.y + dy) / this.k);
    this.headPivot.rotation = ((this.aimDeg + scan) * Math.PI) / 180;
  }

  /**
   * The current muzzle in the root's parent space (lu): where a shot leaves on this frame, following
   * the aim and the fire clip's per-frame anchor. Render can launch projectiles from here.
   */
  muzzlePoint(): { x: number; y: number } {
    const mz = this.muzzle();
    const sx = this.root.scale.x * this.body.scale.x;
    return { x: this.root.x + mz.x * sx, y: this.root.y + (this.body.y + mz.y * this.body.scale.y) * this.root.scale.y };
  }

  /** Muzzle point in body space (lu, y down, facing right) for the current fire frame and aim. */
  private muzzle(): { x: number; y: number } {
    const list = this.o.sheet.meta.clips['fire']?.anchorsLu?.['muzzle'];
    const d = clipDurations(this.o.sheet, 'fire');
    const i = frameIndex(d, this.t, false);
    const raw = list?.[Math.min(i, (list?.length ?? 1) - 1)] ?? [this.pivot.x + 20, -this.pivot.y];
    const vx = raw[0] - this.pivot.x;
    const vy = -raw[1] - this.pivot.y;
    const a = (this.aimDeg * Math.PI) / 180;
    return { x: this.pivot.x + vx * Math.cos(a) - vy * Math.sin(a), y: this.pivot.y + vx * Math.sin(a) + vy * Math.cos(a) };
  }

  private show(): void {
    const A = this.o.sheet.animations;
    // a Modernise shows the turret itself glowing away; a sale shows it breaking down
    const wholeClip = this.mode === 'build' ? 'build' : this.mode === 'sell' ? 'destroyed' : null;
    if (wholeClip && A[wholeClip]) {
      const d = clipDurations(this.o.sheet, wholeClip);
      // build: frame 0 while dropping, then the landing squash frames
      const t = wholeClip === 'build' ? Math.max(0, this.t - (this.emerge ? EMERGE_DELAY_MS : DROP_MS) + (d[0] ?? 0)) : this.t;
      const i = frameIndex(d, t, false);
      frame(this.whole, A[wholeClip]?.[i], A[`${wholeClip}_team`]?.[i]);
      this.whole.c.visible = true;
      this.mount.c.visible = false;
      this.headPivot.visible = false;
      return;
    }
    this.whole.c.visible = false;
    this.mount.c.visible = true;
    this.headPivot.visible = true;
    const clip = this.mode === 'fire' && A['fire'] ? 'fire' : 'idle';
    const d = clipDurations(this.o.sheet, clip);
    const i = frameIndex(d, clip === 'fire' ? this.t : this.idleT, clip === 'idle');
    frame(this.head, A[clip]?.[i], A[`${clip}_team`]?.[i]);
  }

  private sparks(x: number, y: number, n: number, speed: number, tint: number): void {
    for (let i = 0; i < n; i++) {
      const s = partSprite(this.o.decor, i % 3 === 0 ? 'fx.p.sparkHot' : 'fx.p.spark', FX_ZONES);
      if (i % 3 !== 0) s.tint = tint;
      s.blendMode = 'add';
      s.position.set(x, y);
      const a = -Math.PI / 2 + (this.rng.next() - 0.5) * Math.PI * 1.5;
      const sp = speed * (0.5 + this.rng.next() * 0.5);
      this.bits.add(s, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 380, drag: 2.5, life: 300 + this.rng.next() * 220, s0: 1.1, s1: 0.3, align: true });
    }
  }

  /** A bolt set into the footing: a bright star tick with two sparks. */
  private bolt(x: number): void {
    const s = partSprite(this.o.decor, 'fx.p.star', FX_ZONES);
    s.tint = 0xfff6dc;
    s.blendMode = 'add';
    s.position.set(x * this.facing, -3);
    this.bits.add(s, { life: 220, s0: 0.1, s1: 0.9, spin: 6, pulse: true });
    this.sparks(x * this.facing, -3, 2, 120, 0xfff1d2);
  }

  private poof(n: number): void {
    for (let i = 0; i < n; i++) {
      const s = partSprite(this.o.decor, 'fx.p.dust', FX_ZONES);
      const a = (i / n) * Math.PI - Math.PI;
      s.position.set(Math.cos(a) * 12, -6 + Math.sin(a) * 6);
      this.puffs.add(s, { vx: Math.cos(a) * (40 + this.rng.next() * 50), vy: Math.sin(a) * 40 - 12, life: 460, s0: 0.7, s1: 1.6, a0: 0.9 });
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.puffs.clear();
    this.bits.clear();
    this.root.destroy({ children: true });
  }

  /** Test and gallery hooks. */
  get debug(): { aimDeg: number; outdated: boolean; action: string | null; muzzleFlash: boolean; kick: number } {
    return { aimDeg: this.aimDeg, outdated: this.outdated, action: this.mode === 'idle' ? null : this.mode, muzzleFlash: this.muzzleFlash.visible, kick: this.kickMs };
  }
}
