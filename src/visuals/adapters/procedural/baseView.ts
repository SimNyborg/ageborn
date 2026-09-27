/**
 * Procedural base view (DESIGN A11 Bases and Base clips): ambient idle (flags wave, torches and
 * lights flicker), hit shake, crumble stages at 75/50/25%, Treasury props, the Last Stand horn,
 * the 1.8 s evolve morph (squash, light pillar, rebuild) and the destroyed collapse.
 *
 * The root sits on the gate at ground level; side 1 is mirrored. `mountPoints()` returns the four
 * mounts in the root's parent space, bottom to top, so turret views can be placed next to the base.
 */
import { Container } from 'pixi.js';
import type { BaseView, VisualDef } from '@/contracts/art';
import type { AgeId, Pt, Side } from '@/contracts/ids';
import { mulberry32, type CosmeticRng } from '@/core/rng';
import type { PartBaker } from '../../bake';
import { procDeltas } from '../../clips/procedural';
import { FX_ZONES } from '../../effects/sprites';
import { getPart } from '../../parts/registry';
import type { BasePuppet } from '../../rigs/base';
import { CLIP_TIMING } from '../../style';
import type { BoneDelta } from '../../types';
import { PuppetSprites } from './puppetSprites';
import { partSprite, procContext, PuffList } from './shared';

export interface BaseViewOptions {
  age: AgeId;
  side: Side;
  teamColor: number;
  striped: boolean;
  baker: PartBaker;
  seed: number;
  /** Resolves the base puppet of an age (for morphs; skins are kept per age by the provider). */
  resolve: (age: AgeId) => { def: VisualDef; puppet: BasePuppet } | undefined;
}

export class ProceduralBaseView implements BaseView {
  readonly root = new Container();
  private readonly body = new Container();
  private readonly overlay = new Container();
  private rig: PuppetSprites;
  private puppet: BasePuppet;
  private readonly puffs: PuffList;
  private readonly rng: CosmeticRng;
  private readonly facing: 1 | -1;
  private readonly horn: Container;
  private readonly glow: Container;
  private crumble = 0;
  private treasury = 0;
  private clockMs = 0;
  private shakeMs = 0;
  private morph: { age: AgeId; t: number; ms: number; swapped: boolean } | null = null;
  private collapseT = -1;
  private hornOn = false;
  private popMs = 0;
  private destroyed = false;
  private readonly deltas = new Map<string, BoneDelta>();

  constructor(private readonly o: BaseViewOptions) {
    this.facing = o.side === 0 ? 1 : -1;
    this.rng = mulberry32(o.seed);
    const r = o.resolve(o.age);
    if (!r) throw new Error(`No base visual for age "${o.age}"`);
    this.puppet = r.puppet;
    this.root.label = r.def.source;
    this.rig = new PuppetSprites(r.puppet, o.baker, getPart, o.teamColor, o.striped);
    this.body.addChild(this.rig.container);
    this.body.scale.x = this.facing;
    this.glow = partSprite(o.baker, 'fx.p.glow', FX_ZONES);
    this.glow.tint = 0xffb3a0;
    this.glow.visible = false;
    this.horn = partSprite(o.baker, 'icon.horn', { ...FX_ZONES, bone: 0xede3c8, metal: 0x9aa3ab });
    this.horn.visible = false;
    this.root.addChild(this.glow, this.body, this.overlay);
    this.overlay.addChild(this.horn);
    this.puffs = new PuffList(this.overlay);
    this.placeHorn();
    this.apply();
  }

  private placeHorn(): void {
    const h = this.puppet.hornAt;
    this.horn.position.set(h.x * this.facing, h.y);
    this.horn.scale.set(1.6);
    this.glow.position.set(this.puppet.anchors.hitCenter.x * this.facing, this.puppet.anchors.hitCenter.y);
    this.glow.scale.set(this.puppet.heightLu / 14);
  }

  mountPoints(): Pt[] {
    return this.puppet.mounts.map((m) => ({ x: this.root.x + m.x * this.facing, y: this.root.y + m.y }));
  }

  setCrumble(stage: 0 | 1 | 2 | 3): void {
    if (stage > this.crumble) this.debris(6 + stage * 3);
    this.crumble = stage;
    this.rig.setState({ crumble: this.crumble, treasury: this.treasury });
  }

  setTreasury(level: number): void {
    if (level > this.treasury) this.popMs = 260;
    this.treasury = level;
    this.rig.setState({ crumble: this.crumble, treasury: this.treasury });
  }

  morphTo(age: AgeId, ms: number = CLIP_TIMING.baseMorphMs): void {
    this.morph = { age, t: 0, ms: Math.max(200, ms), swapped: false };
  }

  lastStandGlow(on: boolean): void {
    this.hornOn = on;
    this.horn.visible = on;
    this.glow.visible = on;
  }

  hit(): void {
    this.shakeMs = 240;
  }

  collapse(): void {
    if (this.collapseT < 0) {
      this.collapseT = 0;
      this.debris(24);
    }
  }

  update(dtMs: number): void {
    if (this.destroyed) return;
    this.clockMs += dtMs;
    let sx = 1;
    let sy = 1;
    let ox = 0;
    let oy = 0;
    if (this.shakeMs > 0) {
      this.shakeMs = Math.max(0, this.shakeMs - dtMs);
      const k = this.shakeMs / 240;
      ox = (this.rng.next() - 0.5) * 6 * k;
      oy = (this.rng.next() - 0.5) * 3 * k;
    }
    if (this.morph) {
      const m = this.morph;
      m.t += dtMs;
      const u = Math.min(1, m.t / m.ms);
      if (u < 0.25) {
        const s = Math.sin((u / 0.25) * Math.PI * 0.5);
        sx = 1 + 0.08 * s;
        sy = 1 - 0.12 * s;
      } else if (u < 0.5) {
        const s = (u - 0.25) / 0.25;
        sx = 1.08 - 0.3 * s;
        sy = 0.88 - 0.5 * s;
        this.rig.setFlash(s, 0xffffff);
      } else {
        if (!m.swapped) this.swapTo(m.age);
        const s = (u - 0.5) / 0.5;
        const back = 1 - Math.pow(1 - s, 3);
        sx = 0.78 + 0.22 * back + 0.05 * Math.sin(s * Math.PI);
        sy = 0.38 + 0.62 * back + 0.08 * Math.sin(s * Math.PI);
        this.rig.setFlash(Math.max(0, 1 - s * 2), 0xffffff);
      }
      if (u >= 1) {
        this.morph = null;
        this.rig.setFlash(0);
      }
    }
    if (this.collapseT >= 0) {
      this.collapseT += dtMs;
      const u = Math.min(1, this.collapseT / 1400);
      oy += u * u * 40;
      sy *= 1 - 0.45 * u;
      ox += (this.rng.next() - 0.5) * 4 * (1 - u);
      this.body.alpha = 1 - 0.55 * u;
      if (this.rng.next() < 0.3 * (1 - u)) this.debris(1);
    }
    if (this.popMs > 0) {
      this.popMs = Math.max(0, this.popMs - dtMs);
      const s = Math.sin((this.popMs / 260) * Math.PI);
      sx *= 1 + 0.02 * s;
      sy *= 1 - 0.02 * s;
    }
    this.body.position.set(ox, oy);
    this.body.scale.set(this.facing * sx, sy);
    if (this.hornOn) {
      const k = 0.5 + 0.5 * Math.sin(this.clockMs / 180);
      this.horn.y = this.puppet.hornAt.y - 4 * k;
      this.horn.rotation = Math.sin(this.clockMs / 260) * 0.08;
      this.glow.alpha = 0.35 + 0.35 * k;
    }
    this.apply();
    this.puffs.update(dtMs);
  }

  private apply(): void {
    this.deltas.clear();
    const ctx = procContext(this.puppet);
    for (const [b, d] of procDeltas(['wave'], ctx, 0, this.clockMs)) this.deltas.set(b, d);
    let i = 0;
    for (const f of this.puppet.flickers) {
      i++;
      const k = 1 + 0.12 * Math.sin(this.clockMs / 70 + i * 1.7) + 0.06 * Math.sin(this.clockMs / 31 + i);
      this.deltas.set(f, { r: 0, x: 0, y: 0, sx: 1 / k, sy: k });
    }
    this.rig.apply((b) => this.deltas.get(b));
  }

  private swapTo(age: AgeId): void {
    const r = this.o.resolve(age);
    if (!this.morph) return;
    this.morph.swapped = true;
    if (!r) return;
    const team = this.rig.team;
    this.rig.destroy();
    this.puppet = r.puppet;
    this.root.label = r.def.source;
    this.rig = new PuppetSprites(r.puppet, this.o.baker, getPart, team.color, team.striped);
    this.rig.setState({ crumble: this.crumble, treasury: this.treasury });
    this.body.addChild(this.rig.container);
    this.placeHorn();
  }

  private debris(n: number): void {
    const w = this.puppet.width;
    const h = this.puppet.heightLu;
    for (let i = 0; i < n; i++) {
      const s = partSprite(this.o.baker, i % 3 === 0 ? 'fx.p.dust' : 'fx.p.chunk', FX_ZONES);
      s.position.set(-this.rng.next() * w * this.facing, -h * (0.2 + this.rng.next() * 0.7));
      this.puffs.add(s, { vx: (this.rng.next() - 0.3) * 120 * this.facing, vy: -60 - this.rng.next() * 100, g: 520, life: 700, spin: (this.rng.next() - 0.5) * 10, s0: 1, s1: 0.8 });
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.puffs.clear();
    this.root.destroy({ children: true });
  }

  /** Test and gallery hooks. */
  get debug(): { crumble: number; treasury: number; age: string; horn: boolean; morphing: boolean } {
    return { crumble: this.crumble, treasury: this.treasury, age: this.puppet.age ?? '', horn: this.hornOn, morphing: this.morph !== null };
  }
}
