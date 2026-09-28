/**
 * Sprite-sheet turret view (DESIGN A11 Turret clips, A2.8) for the 3D-rendered turrets.
 *
 * The static footing (`mount`) and the head (`idle` / `fire`) are separate sprites, so the head
 * rotates about its pivot to aim like the procedural rig; `build` and `destroyed` show the whole
 * turret. Code motion on top of the frames: the 1 s build drop-in with a landing squash and dust,
 * a 120 ms recoil squash with a one-frame muzzle flash at the sheet's per-frame muzzle anchor,
 * the sell / modernise sink with a poof, and the pulsing Modernise arrow.
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

function pair(): { team: Sprite; base: Sprite; c: Container } {
  const c = new Container();
  const team = new Sprite(Texture.EMPTY);
  const base = new Sprite(Texture.EMPTY);
  c.addChild(team, base);
  return { team, base, c };
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
  private outdated = false;
  private clockMs = 0;
  private landed = true;
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
    this.root.addChild(this.body, this.overlay);
    setFrame(this.mount.base, o.sheet.animations['mount']?.[0]);
    setFrame(this.mount.team, o.sheet.animations['mount_team']?.[0]);
    this.show();
  }

  aimAt(x: number): void {
    const dx = (x - this.root.x) * this.facing;
    const dy = -(this.root.y + this.pivot.y);
    const deg = (Math.atan2(dy, Math.max(1, dx)) * 180) / Math.PI;
    const [lo, hi] = this.aimLimits;
    this.aimTarget = Math.max(lo, Math.min(hi, deg));
  }

  play(clip: Mode): void {
    if (this.destroyed) return;
    if ((this.mode === 'sell' || this.mode === 'modernise') && clip !== 'build') return;
    if (clip === 'idle' && this.mode === 'build') return;
    this.mode = clip;
    this.t = 0;
    if (clip === 'fire') {
      this.flashFrames = 1;
      this.recoilMs = 120;
    }
    if (clip === 'build') {
      this.landed = false;
      this.body.alpha = 1;
    }
    if (clip === 'sell' || clip === 'modernise') this.poof(10);
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
    if (this.aimTarget !== null) {
      const step = (AIM_DEG_PER_SEC * dtMs) / 1000;
      const d = this.aimTarget - this.aimDeg;
      this.aimDeg += Math.max(-step, Math.min(step, d));
    }
    let sx = 1;
    let sy = 1;
    let oy = 0;
    if (this.mode === 'build') {
      if (this.t < DROP_MS) {
        const u = this.t / DROP_MS;
        oy = -DROP_LU * (1 - u * u);
        this.body.alpha = Math.min(1, 0.3 + u * 2);
      } else if (!this.landed) {
        this.landed = true;
        this.poof(7);
      }
      if (this.t >= BUILD_MS) {
        this.mode = 'idle';
        this.t = 0;
      }
    } else if (this.mode === 'fire') {
      const total = clipDurations(this.o.sheet, 'fire').reduce((a, b) => a + b, 0);
      if (this.t >= total) this.mode = 'idle';
    } else if (this.mode === 'sell' || this.mode === 'modernise') {
      const u = Math.min(1, this.t / SINK_MS);
      oy = 16 * u * u;
      sy = 1 - 0.25 * u;
      this.body.alpha = 1 - u;
    }
    if (this.recoilMs > 0) {
      this.recoilMs = Math.max(0, this.recoilMs - dtMs);
      const s = Math.sin((this.recoilMs / 120) * Math.PI);
      sx *= 1 + 0.06 * s;
      sy *= 1 - 0.06 * s;
    }
    this.body.position.set(0, oy);
    this.body.scale.set(this.facing * sx, sy);
    this.show();
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
    const wholeClip = this.mode === 'build' ? 'build' : this.mode === 'sell' || this.mode === 'modernise' ? 'destroyed' : null;
    if (wholeClip && A[wholeClip]) {
      const d = clipDurations(this.o.sheet, wholeClip);
      // build: frame 0 while dropping, then the landing squash frames
      const t = wholeClip === 'build' ? Math.max(0, this.t - DROP_MS + (d[0] ?? 0)) : this.t;
      const i = frameIndex(d, t, false);
      setFrame(this.whole.base, A[wholeClip]?.[i]);
      setFrame(this.whole.team, A[`${wholeClip}_team`]?.[i]);
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
    setFrame(this.head.base, A[clip]?.[i]);
    setFrame(this.head.team, A[`${clip}_team`]?.[i]);
    this.headPivot.rotation = (this.aimDeg * Math.PI) / 180;
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
    this.root.destroy({ children: true });
  }

  /** Test and gallery hooks. */
  get debug(): { aimDeg: number; outdated: boolean; action: string | null; muzzleFlash: boolean } {
    return { aimDeg: this.aimDeg, outdated: this.outdated, action: this.mode === 'idle' ? null : this.mode, muzzleFlash: this.muzzleFlash.visible };
  }
}
