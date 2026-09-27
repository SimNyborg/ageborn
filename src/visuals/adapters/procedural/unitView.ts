/**
 * `ProceduralPuppetView` for units (DESIGN B5, A11): a baked cutout rig animated by keyframe clips.
 *
 * Layers (back to front): shadow and ground ring with the role glyph and level trim (never
 * mirrored), legendary aura, the body (mirrored by facing), then status overlays (dizzy stars, the
 * time-stop clock, the shield bubble) and view-owned puffs (spawn dust).
 *
 * Health bars are drawn by the battle view (render/healthbars.ts, WP5), not here.
 */
import { Container, Sprite } from 'pixi.js';
import type { Anchors, ClipName, UnitPose, UnitView, VisualDef } from '@/contracts/art';
import type { RoleGroup, Side } from '@/contracts/ids';
import { mulberry32, type CosmeticRng } from '@/core/rng';
import { Animator } from '../../animator';
import type { PartBaker } from '../../bake';
import { FX_ZONES } from '../../effects/sprites';
import { puppetBounds } from '../../draw';
import { getPart } from '../../parts/registry';
import { TRIM_COLORS } from '../../palette';
import { CLIP_TIMING, STYLE } from '../../style';
import type { PuppetDef } from '../../types';
import { PuppetSprites } from './puppetSprites';
import { clipResolver, partSprite, procContext, PuffList, tintPartSprite, type PropPool } from './shared';

export interface UnitViewOptions {
  def: VisualDef;
  puppet: PuppetDef;
  baker: PartBaker;
  side: Side;
  teamColor: number;
  striped: boolean;
  props: PropPool;
  quality: 'high' | 'lite';
  seed: number;
}

const UI_ZONES = {
  ...FX_ZONES,
  trim_bronze: TRIM_COLORS.bronze,
  trim_silver: TRIM_COLORS.silver,
  trim_gold: TRIM_COLORS.gold,
};

export class ProceduralUnitView implements UnitView {
  readonly root = new Container();
  readonly anchors: Anchors;
  private readonly ground = new Container();
  private readonly aura: Container | null;
  private readonly body = new Container();
  private readonly overlay = new Container();
  private readonly rig: PuppetSprites;
  private readonly animator: Animator;
  private readonly puffs: PuffList;
  private readonly rng: CosmeticRng;
  private ring: Container | null = null;
  private glyph: Container | null = null;
  private glyphGroup: RoleGroup | null = null;
  private trim: Container | null = null;
  private trimName: UnitPose['levelTrim'] = 'none';
  private stars: Container | null = null;
  private clock: Container | null = null;
  private bubble: Container | null = null;
  private lastX: number | null = null;
  private facing: 1 | -1;
  private poseAlpha = 1;
  private stunned = false;
  private frozenPose = false;
  private requestedBase: string = 'idle';
  private flashMs = 0;
  private flashDur = 0;
  private flashColor = 0xffffff;
  private clockMs = 0;
  private dead = false;
  private destroyed = false;
  private readonly skinAlpha: number;
  /** Frosty breath puffs (snow aura skins, A5.8): where they leave the mouth and when the next comes. */
  private readonly breathAt: { x: number; y: number } | null;
  private breathMs = 0;

  constructor(private readonly o: UnitViewOptions) {
    const p = o.puppet;
    this.anchors = o.def.anchors;
    this.facing = o.side === 0 ? 1 : -1;
    this.rng = mulberry32(o.seed);
    this.skinAlpha = p.alpha ?? o.def.filters?.alpha ?? 1;
    this.root.label = o.def.source;
    // ground: shadow, ring, glyph, trim
    if (o.quality === 'high') {
      const sh = partSprite(o.baker, 'shared.shadow', UI_ZONES);
      sh.scale.set(this.sizeScale() * 1.1, 1);
      this.ground.addChild(sh);
    }
    this.ring = partSprite(o.baker, o.side === 0 ? 'shared.ring.circle' : 'shared.ring.diamond', UI_ZONES, o.teamColor);
    this.ring.scale.set(this.sizeScale(), 1);
    this.ground.addChild(this.ring);
    this.root.addChild(this.ground);
    // legendary aura (High preset only, B6)
    this.aura = null;
    const wantsAura = (p.aura ?? null) !== null && o.quality === 'high';
    if (wantsAura) {
      const a = partSprite(o.baker, 'fx.p.glow', UI_ZONES);
      a.position.set(this.anchors.hitCenter.x * this.facing, this.anchors.hitCenter.y);
      a.scale.set((p.heightLu / 20) * 1.05);
      if (p.aura === 'ghost') a.tint = 0xe6f2ee;
      if (p.aura === 'snow') a.tint = 0xf4f7fb;
      if (p.aura === 'neon') a.tint = 0xf6d8ec;
      this.root.addChild(a);
      this.aura = a;
    }
    // body
    this.rig = new PuppetSprites(p, o.baker, getPart, o.teamColor, o.striped);
    this.body.addChild(this.rig.container);
    this.body.scale.x = this.facing;
    this.root.addChild(this.body);
    this.root.addChild(this.overlay);
    this.puffs = new PuffList(this.overlay);
    this.animator = new Animator(clipResolver(o.def), procContext(p), o.seed);
    if (p.aura === 'snow' && o.quality === 'high') {
      const b = puppetBounds({ ...p, slots: p.slots.filter((sl) => sl.tag !== 'weapon') }, getPart);
      this.breathAt = { x: b.maxX - 6, y: -p.heightLu * 0.46 };
      this.breathMs = 600 + this.rng.next() * 900;
    } else {
      this.breathAt = null;
    }
    this.applyAlpha();
    this.rig.apply((b) => this.animator.sample().get(b));
  }

  private sizeScale(): number {
    const cw = STYLE.collisionWidthLu[this.o.puppet.size ?? 'small'];
    return Math.max(1, cw / 26);
  }

  setPose(p: UnitPose): void {
    if (this.destroyed) return;
    this.root.position.set(p.x, p.y);
    if (p.facing !== this.facing) {
      this.facing = p.facing;
      this.body.scale.x = p.facing;
      if (this.aura) this.aura.x = this.anchors.hitCenter.x * p.facing;
    }
    if (this.lastX !== null && this.animator.state.base === 'walk') this.animator.moved(p.x - this.lastX);
    this.lastX = p.x;
    this.poseAlpha = p.alpha;
    this.setGlyph(p.roleGlyph);
    this.setTrim(p.levelTrim);
    if (p.stunned !== this.stunned) {
      this.stunned = p.stunned;
      if (p.stunned) this.animator.play('stun');
      else this.animator.play(this.requestedBase);
      this.showStars(p.stunned);
    }
    if (p.frozen !== this.frozenPose) {
      this.frozenPose = p.frozen;
      this.showClock(p.frozen);
      this.body.tint = p.frozen ? 0xd9d2f2 : 0xffffff;
    }
    this.showBubble(p.shieldBp);
    this.applyAlpha();
  }

  private applyAlpha(): void {
    this.root.alpha = this.poseAlpha;
    this.body.alpha = this.skinAlpha * this.animator.alpha;
    this.ground.alpha = this.dead ? Math.max(0, this.animator.alpha) : 1;
  }

  private setGlyph(g: RoleGroup): void {
    if (g === this.glyphGroup) return;
    this.glyphGroup = g;
    this.glyph?.destroy({ children: true });
    this.glyph = partSprite(this.o.baker, `icon.role.${g}`, UI_ZONES, this.o.teamColor);
    this.glyph.position.set(0, 6.6 + (this.sizeScale() - 1) * 2);
    this.glyph.scale.set(STYLE.roleGlyphLu / 17.2);
    this.ground.addChild(this.glyph);
    if (this.trim) this.ground.addChild(this.trim);
  }

  private setTrim(t: UnitPose['levelTrim']): void {
    if (t === this.trimName) return;
    this.trimName = t;
    this.trim?.destroy({ children: true });
    this.trim = null;
    if (t === 'none') return;
    this.trim = partSprite(this.o.baker, `trim.${t}`, UI_ZONES);
    this.trim.position.set(9.6, 5.4);
    this.trim.scale.set(0.8);
    this.ground.addChild(this.trim);
  }

  private showStars(on: boolean): void {
    if (on && !this.stars) {
      this.stars = new Container();
      for (let i = 0; i < 3; i++) this.stars.addChild(partSprite(this.o.baker, 'fx.p.star', UI_ZONES));
      this.stars.position.set(this.anchors.head.x * this.facing, this.anchors.head.y - 6);
      this.overlay.addChild(this.stars);
    }
    if (this.stars) this.stars.visible = on;
  }

  private showClock(on: boolean): void {
    if (on && !this.clock) {
      this.clock = partSprite(this.o.baker, 'fx.p.clock', UI_ZONES);
      this.clock.position.set(this.anchors.hitCenter.x * this.facing, this.anchors.hitCenter.y);
      this.clock.scale.set(this.o.puppet.heightLu / 34);
      this.clock.alpha = 0.75;
      this.overlay.addChildAt(this.clock, 0);
    }
    if (this.clock) this.clock.visible = on;
  }

  private showBubble(shieldBp: number): void {
    if (shieldBp > 0 && !this.bubble) {
      this.bubble = partSprite(this.o.baker, 'fx.p.bubble', UI_ZONES);
      this.bubble.position.set(this.anchors.hitCenter.x * this.facing, this.anchors.hitCenter.y);
      this.bubble.scale.set((this.o.puppet.heightLu * 0.62) / 10);
      this.bubble.tint = 0xe4fbf1;
      this.overlay.addChildAt(this.bubble, 0);
    }
    if (this.bubble) {
      this.bubble.visible = shieldBp > 0;
      this.bubble.alpha = 0.45 + 0.55 * Math.min(1, shieldBp / 10000);
    }
  }

  play(clip: ClipName | string, o?: { durationMs?: number; impactAtMs?: number; loop?: boolean }): void {
    if (this.destroyed || this.dead) return;
    if (clip === 'idle' || clip === 'walk' || clip === 'victory') this.requestedBase = clip;
    if (this.stunned && (clip === 'idle' || clip === 'walk')) return;
    const ok = this.animator.play(clip, o);
    if (!ok) return;
    if (clip === 'spawn') this.spawnDust();
    if (clip === 'die') this.die();
  }

  freeze(ms: number): void {
    this.animator.freeze(ms);
  }

  flash(ms: number, color = 0xffffff): void {
    this.flashMs = ms;
    this.flashDur = Math.max(1, ms);
    this.flashColor = color;
  }

  update(dtMs: number): void {
    if (this.destroyed) return;
    this.clockMs += dtMs;
    if (!this.frozenPose) this.animator.update(dtMs);
    this.rig.apply((b) => this.animator.sample().get(b));
    // local hitstop jitter (A12: 1-2 px)
    if (this.animator.frozen) this.body.position.set((this.rng.next() - 0.5) * 2.4, (this.rng.next() - 0.5) * 1.2);
    else if (this.body.x !== 0 || this.body.y !== 0) this.body.position.set(0, 0);
    // flash: full for 60%, then fades
    if (this.flashMs > 0) {
      this.flashMs = Math.max(0, this.flashMs - dtMs);
      const t = 1 - this.flashMs / this.flashDur;
      this.rig.setFlash(this.flashMs <= 0 ? 0 : t < 0.6 ? 0.95 : 0.95 * (1 - (t - 0.6) / 0.4), this.flashColor);
    }
    if (this.aura) this.aura.alpha = 0.34 + 0.16 * Math.sin((this.clockMs / 900) * Math.PI);
    if (this.stars?.visible) {
      const n = this.stars.children.length;
      this.stars.children.forEach((s, i) => {
        const a = (this.clockMs / 520) * Math.PI + (i * Math.PI * 2) / n;
        s.position.set(Math.cos(a) * 9, Math.sin(a) * 3);
        s.scale.set(0.8 + 0.2 * Math.sin(a));
      });
    }
    if (this.clock?.visible) this.clock.rotation = Math.sin(this.clockMs / 180) * 0.04;
    if (this.bubble?.visible) this.bubble.scale.set(((this.o.puppet.heightLu * 0.62) / 10) * (1 + 0.03 * Math.sin(this.clockMs / 160)));
    if (this.breathAt && !this.dead) {
      this.breathMs -= dtMs;
      if (this.breathMs <= 0) {
        this.breath(this.breathAt);
        this.breathMs = 1400 + this.rng.next() * 900;
      }
    }
    this.puffs.update(dtMs);
    this.applyAlpha();
  }

  private breath(at: { x: number; y: number }): void {
    for (let i = 0; i < 3; i++) {
      const s = partSprite(this.o.baker, 'fx.p.dust', UI_ZONES);
      s.tint = 0xf4f8fb;
      s.position.set(at.x * this.facing, at.y + (this.rng.next() - 0.5) * 4);
      this.puffs.add(s, { vx: this.facing * (18 + this.rng.next() * 16), vy: -6 - this.rng.next() * 8, life: 700 + this.rng.next() * 300, s0: 0.3, s1: 0.9, a0: 0.7 });
    }
  }

  /** True once the die clip has finished (the view can then be destroyed). */
  get finished(): boolean {
    return this.dead && this.animator.finished;
  }

  private spawnDust(): void {
    for (let i = 0; i < 5; i++) {
      const s = partSprite(this.o.baker, 'fx.p.dust', UI_ZONES);
      const dir = i < 2 ? -1 : 1;
      s.position.set((this.rng.next() - 0.5) * 16, -2);
      this.puffs.add(s, { vx: dir * (30 + this.rng.next() * 50), vy: -20 - this.rng.next() * 30, life: 380 + this.rng.next() * 160, s0: 0.5, s1: 1.2, a0: 0.8 });
    }
  }

  private die(): void {
    this.dead = true;
    this.showStars(false);
    const parent = this.root.parent;
    for (const s of this.rig.slotsTagged('prop')) {
      if (!parent) break;
      const bone = this.rig.boneMatrix(s.def.bone);
      if (!bone) continue;
      const copy = new Container();
      for (const child of [s.main, s.team, s.over]) {
        if (!child) continue;
        const c = new Sprite(child.texture);
        c.position.copyFrom(child.position);
        c.tint = child.tint;
        copy.addChild(c);
      }
      // slot position in the parent's space
      const lx = s.node.x * this.facing;
      copy.position.set(this.root.x + lx, this.root.y + s.node.y);
      copy.rotation = s.node.rotation * this.facing;
      copy.scale.set(s.node.scale.x * this.facing, s.node.scale.y);
      s.node.alpha = 0;
      this.o.props.drop(copy, parent, {
        vx: -this.facing * (40 + this.rng.next() * 50),
        vy: -170 - this.rng.next() * 80,
        spin: -this.facing * (4 + this.rng.next() * 5),
        groundY: this.root.y - 2,
      });
    }
    void CLIP_TIMING;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.puffs.clear();
    this.root.destroy({ children: true });
  }

  /** Test and gallery hooks. */
  get debug(): { base: string | null; action: string | null; frozen: boolean; teamColor: number; ringSide: Side } {
    return { ...this.animator.state, teamColor: this.rig.team.color, ringSide: this.o.side };
  }

  /** Re-tints team colour layers (colourblind preset switch). */
  setTeamColor(color: number): void {
    this.rig.setTeam(color, this.o.striped);
    if (this.ring) tintPartSprite(this.ring, color);
    if (this.glyph) tintPartSprite(this.glyph, color);
  }
}
