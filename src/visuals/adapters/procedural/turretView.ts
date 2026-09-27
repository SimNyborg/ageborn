/**
 * Procedural turret view (DESIGN A11 Turret clips): build drop-in, idle scan, aim rotation toward
 * the target, fire recoil (120 ms squash plus a one-frame muzzle flash), modernise (the old turret
 * sinks), sell poof and the outdated (Modernise) arrow glow.
 *
 * Coordinates: the root sits on a mount point in the parent's space; `aimAt(x)` takes an x in that
 * same space and aims at ground level (y = 0 of the parent space).
 */
import { Container } from 'pixi.js';
import type { TurretView, VisualDef } from '@/contracts/art';
import type { Side } from '@/contracts/ids';
import { mulberry32, type CosmeticRng } from '@/core/rng';
import { Animator } from '../../animator';
import type { PartBaker } from '../../bake';
import { FX_ZONES } from '../../effects/sprites';
import { getPart } from '../../parts/registry';
import type { TurretPuppet } from '../../rigs/turret';
import { PuppetSprites } from './puppetSprites';
import { clipResolver, partSprite, procContext, PuffList } from './shared';

export interface TurretViewOptions {
  def: VisualDef;
  puppet: TurretPuppet;
  baker: PartBaker;
  side: Side;
  teamColor: number;
  striped: boolean;
  seed: number;
}

const AIM_DEG_PER_SEC = 360;

export class ProceduralTurretView implements TurretView {
  readonly root = new Container();
  private readonly body = new Container();
  private readonly overlay = new Container();
  private readonly rig: PuppetSprites;
  private readonly animator: Animator;
  private readonly puffs: PuffList;
  private readonly rng: CosmeticRng;
  private readonly facing: 1 | -1;
  private readonly muzzleFlash: Container;
  private readonly arrow: Container;
  private aimDeg = 0;
  private aimTarget: number | null = null;
  private flashFrames = 0;
  private outdated = false;
  private clockMs = 0;
  private destroyed = false;
  private pendingBuildDust = false;

  constructor(private readonly o: TurretViewOptions) {
    this.facing = o.side === 0 ? 1 : -1;
    this.rng = mulberry32(o.seed);
    this.root.label = o.def.source;
    this.rig = new PuppetSprites(o.puppet, o.baker, getPart, o.teamColor, o.striped);
    this.body.addChild(this.rig.container);
    this.body.scale.x = this.facing;
    this.muzzleFlash = partSprite(o.baker, 'fx.p.flash', FX_ZONES);
    this.muzzleFlash.visible = false;
    this.muzzleFlash.scale.set(0.9);
    this.body.addChild(this.muzzleFlash);
    this.root.addChild(this.body, this.overlay);
    this.arrow = partSprite(o.baker, 'icon.modernise', { ...FX_ZONES });
    this.arrow.visible = false;
    this.arrow.position.set(0, -o.puppet.heightLu - 12);
    this.overlay.addChild(this.arrow);
    this.puffs = new PuffList(this.overlay);
    this.animator = new Animator(clipResolver(o.def), procContext(o.puppet), o.seed);
    this.apply();
  }

  aimAt(x: number): void {
    const pivotY = this.o.puppet.anchors.hitCenter.y;
    const dx = (x - this.root.x) * this.facing;
    const dy = -(this.root.y + pivotY);
    const deg = (Math.atan2(dy, Math.max(1, dx)) * 180) / Math.PI;
    const [lo, hi] = this.o.puppet.aimLimits;
    this.aimTarget = Math.max(lo, Math.min(hi, deg));
  }

  play(clip: 'build' | 'idle' | 'fire' | 'sell' | 'modernise'): void {
    if (this.destroyed) return;
    this.animator.play(clip);
    if (clip === 'fire') this.flashFrames = 2;
    if (clip === 'build') this.pendingBuildDust = true;
    if (clip === 'sell' || clip === 'modernise') this.poof(8);
  }

  setOutdated(on: boolean): void {
    this.outdated = on;
    this.arrow.visible = on;
  }

  update(dtMs: number): void {
    if (this.destroyed) return;
    this.clockMs += dtMs;
    this.animator.update(dtMs);
    if (this.aimTarget !== null) {
      const step = (AIM_DEG_PER_SEC * dtMs) / 1000;
      const d = this.aimTarget - this.aimDeg;
      this.aimDeg += Math.max(-step, Math.min(step, d));
    }
    this.apply();
    // one-frame muzzle flash (two frames at 60 fps, since it is drawn after this update)
    if (this.flashFrames > 0) {
      const m = this.rig.boneMatrix('muzzle');
      if (m) this.muzzleFlash.position.set(m[4], m[5]);
      this.muzzleFlash.rotation = (this.aimDeg * Math.PI) / 180;
      this.muzzleFlash.visible = true;
      this.flashFrames--;
    } else {
      this.muzzleFlash.visible = false;
    }
    if (this.pendingBuildDust && this.animator.state.action === 'build') {
      // dust when the drop-in lands (about 55% into the clip)
      const root = this.rig.boneMatrix('root');
      if (root && root[5] > -2) {
        this.poof(6);
        this.pendingBuildDust = false;
      }
    }
    if (this.outdated) {
      const k = 0.5 + 0.5 * Math.sin(this.clockMs / 220);
      this.arrow.alpha = 0.55 + 0.45 * k;
      this.arrow.y = -this.o.puppet.heightLu - 12 - 3 * k;
    }
    this.body.alpha = this.animator.alpha;
    this.puffs.update(dtMs);
  }

  private apply(): void {
    const sample = this.animator.sample();
    this.rig.apply((b) => {
      const d = sample.get(b);
      if (b !== 'pivot' || this.aimDeg === 0) return d;
      const base = d ?? { r: 0, x: 0, y: 0, sx: 1, sy: 1 };
      return { ...base, r: base.r + this.aimDeg };
    });
  }

  private poof(n: number): void {
    for (let i = 0; i < n; i++) {
      const s = partSprite(this.o.baker, 'fx.p.dust', FX_ZONES);
      const a = (i / n) * Math.PI - Math.PI;
      s.position.set(Math.cos(a) * 10, -8 + Math.sin(a) * 6);
      this.puffs.add(s, { vx: Math.cos(a) * (40 + this.rng.next() * 40), vy: Math.sin(a) * 40 - 10, life: 420, s0: 0.6, s1: 1.4, a0: 0.85 });
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.puffs.clear();
    this.root.destroy({ children: true });
  }

  /** Test and gallery hooks. */
  get debug(): { aimDeg: number; outdated: boolean; action: string | null; hasPart: boolean } {
    return { aimDeg: this.aimDeg, outdated: this.outdated, action: this.animator.state.action, hasPart: getPart('icon.modernise') !== undefined };
  }
}
