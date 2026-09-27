/**
 * Helpers shared by the procedural views: single-part sprites, the procedural-motion context of a
 * puppet, a tiny particle list for view-owned puffs, and the pool of dropped death props.
 */
import { Container, Sprite } from 'pixi.js';
import type { ClipRef, VisualDef } from '@/contracts/art';
import type { PartBaker } from '../../bake';
import { strideFor, type ProcContext } from '../../clips/procedural';
import { getClip } from '../../clips';
import type { ClipResolver } from '../../animator';
import type { Palette } from '../../palette';
import { getPart } from '../../parts/registry';
import { CLIP_TIMING } from '../../style';
import type { PuppetDef } from '../../types';

/** A part as one small sprite group (main + tinted team + over). Returns an empty container if unknown. */
export function partSprite(baker: PartBaker, partId: string, palette: Palette, teamColor = 0xffffff): Container {
  const c = new Container();
  const p = getPart(partId);
  if (!p) return c;
  const b = baker.get(p, palette);
  const add = (tex: import('pixi.js').Texture | null, tint?: number): void => {
    if (!tex) return;
    const s = new Sprite(tex);
    s.position.set(b.origin.x, b.origin.y);
    if (tint !== undefined) s.tint = tint;
    c.addChild(s);
  };
  add(b.main);
  add(b.team, teamColor);
  add(b.over);
  baker.flush();
  return c;
}

/** Re-tints the team sprite of a `partSprite` group. */
export function tintPartSprite(c: Container, teamColor: number): void {
  const team = c.children[1];
  if (team instanceof Sprite) team.tint = teamColor;
}

export function procContext(p: PuppetDef): ProcContext {
  const legLu = p.motion.legLu ?? 16;
  const legDeg = p.motion.legDeg ?? 25;
  return {
    bones: new Set(p.bones.map((b) => b.id)),
    heightLu: p.heightLu,
    legLu,
    legDeg,
    strideLu: p.motion.strideLu ?? strideFor(legLu, legDeg),
    speedLuPerSec: p.motion.speedLuPerSec ?? CLIP_TIMING.walkRefSpeedLuPerSec,
    wheelRadiusLu: p.motion.wheelRadiusLu ?? 10,
    twirlBone: p.motion.twirlBone,
    air: p.motion.air ?? false,
  };
}

/** Resolves clip names through a manifest entry's clip refs to the keyframe library (B5). */
export function clipResolver(def: VisualDef): ClipResolver {
  return (name: string) => {
    const ref: ClipRef | undefined = def.clips[name];
    if (!ref || ref.kind !== 'keyframes') return undefined;
    const clip = getClip(ref.ref);
    if (!clip) return undefined;
    return { clip, durationMs: ref.durationMs, loop: ref.loop };
  };
}

// ---------------------------------------------------------------------------------------------
// View-owned particles (spawn dust, sell poofs, stun stars): a handful per view, no pooling needed.

export interface Puff {
  s: Container;
  vx: number;
  vy: number;
  g: number;
  life: number;
  age: number;
  spin: number;
  s0: number;
  s1: number;
  a0: number;
}

export class PuffList {
  readonly items: Puff[] = [];

  constructor(readonly layer: Container) {}

  add(s: Container, o: Partial<Omit<Puff, 's' | 'age'>>): void {
    this.layer.addChild(s);
    this.items.push({ s, vx: o.vx ?? 0, vy: o.vy ?? 0, g: o.g ?? 0, life: o.life ?? 400, age: 0, spin: o.spin ?? 0, s0: o.s0 ?? 1, s1: o.s1 ?? 1, a0: o.a0 ?? 1 });
  }

  update(dtMs: number): void {
    const dt = dtMs / 1000;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      if (!p) continue;
      p.age += dtMs;
      const t = Math.min(1, p.age / p.life);
      p.vy += p.g * dt;
      p.s.x += p.vx * dt;
      p.s.y += p.vy * dt;
      p.s.rotation += p.spin * dt;
      p.s.scale.set(p.s0 + (p.s1 - p.s0) * t);
      p.s.alpha = p.a0 * (1 - t * t);
      if (p.age >= p.life) {
        p.s.destroy({ children: true });
        this.items.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const p of this.items) p.s.destroy({ children: true });
    this.items.length = 0;
  }
}

// ---------------------------------------------------------------------------------------------
// Dropped props (A11 die: "hat, helmet or weapon drops and stays 6 s (pool of 40)")

interface Prop {
  node: Container;
  vx: number;
  vy: number;
  spin: number;
  groundY: number;
  age: number;
  settled: boolean;
  last: number;
}

/**
 * Props live in the unit's parent layer so they outlive the unit view. They animate from Pixi's
 * `onRender` hook (wall-clock time; props are cosmetic only) and the oldest is recycled past 40.
 */
export class PropPool {
  private readonly props: Prop[] = [];

  constructor(
    readonly max: number = CLIP_TIMING.propPool,
    readonly lifeMs: number = CLIP_TIMING.propLifeMs,
  ) {}

  get count(): number {
    return this.props.length;
  }

  drop(node: Container, parent: Container, o: { vx: number; vy: number; spin: number; groundY: number }): void {
    parent.addChild(node);
    const prop: Prop = { node, ...o, age: 0, settled: false, last: now() };
    this.props.push(prop);
    while (this.props.length > this.max) this.remove(this.props[0]);
    node.onRender = () => this.step(prop);
  }

  /** Advances one prop (also called directly by tests). */
  step(p: Prop, dtMs?: number): void {
    const t = now();
    const dt = Math.min(0.05, (dtMs ?? t - p.last) / 1000);
    p.last = t;
    p.age += dt * 1000;
    if (!p.settled) {
      p.vy += 900 * dt;
      p.node.x += p.vx * dt;
      p.node.y += p.vy * dt;
      p.node.rotation += p.spin * dt;
      if (p.node.y >= p.groundY) {
        p.node.y = p.groundY;
        if (Math.abs(p.vy) > 120) {
          p.vy = -p.vy * 0.35;
          p.vx *= 0.5;
          p.spin *= 0.4;
        } else {
          p.settled = true;
        }
      }
    }
    const fadeFrom = this.lifeMs - 600;
    if (p.age > fadeFrom) p.node.alpha = Math.max(0, 1 - (p.age - fadeFrom) / 600);
    if (p.age >= this.lifeMs) this.remove(p);
  }

  private remove(p: Prop | undefined): void {
    if (!p) return;
    const i = this.props.indexOf(p);
    if (i >= 0) this.props.splice(i, 1);
    p.node.onRender = null;
    p.node.destroy({ children: true });
  }

  clear(): void {
    while (this.props.length) this.remove(this.props[0]);
  }
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : 0;
}
