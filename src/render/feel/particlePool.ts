/**
 * Pooled particles (DESIGN A12 Particles, B6 Graphics presets, B16).
 *
 * Every particle is an `EffectView` from the injected `ArtProvider` (the art owns the look; the pool
 * owns the budget). Finished views go back to a free list per effect id and are restarted with
 * `playAt` / `fly`. The live count never exceeds the cap (Lite 300, High 1,500 on desktop, 600 on
 * mobile); when full, the lowest-priority live particles drop first, and a new particle whose
 * priority is not above anything live is dropped instead.
 */
import type { ArtProvider, EffectId, EffectView, Pt } from '@/contracts';
import type { CosmeticRng } from '@/core';
import type { Container } from 'pixi.js';

interface Live {
  view: EffectView;
  effectId: EffectId;
  priority: number;
  seq: number;
}

/** Free views kept per effect id; extra finished views are destroyed. */
const MAX_FREE_PER_EFFECT = 96;

export interface EmitOptions {
  /** Random position spread in lu for multi-count emits. */
  spreadLu?: number;
  /** Passed through to the art (for example `{ side: 1 }`). */
  opts?: Record<string, number>;
}

export class ParticlePool {
  private readonly free = new Map<EffectId, EffectView[]>();
  private live: Live[] = [];
  private seq = 0;
  /** Particles refused or evicted because of the cap (for the dev HUD). */
  dropped = 0;

  constructor(
    private readonly art: Pick<ArtProvider, 'createEffect'>,
    private readonly layer: Container,
    public cap: number,
    private readonly rng: CosmeticRng,
  ) {}

  get liveCount(): number {
    return this.live.length;
  }

  /** Plays `count` instances of `effectId` at `at` (world lu). Returns how many were emitted. */
  emit(effectId: EffectId, count: number, priority: number, at: Pt, o: EmitOptions = {}): number {
    let n = 0;
    for (let i = 0; i < count; i++) {
      if (!this.makeRoom(priority)) break;
      const view = this.acquire(effectId, o.opts);
      const spread = count > 1 ? (o.spreadLu ?? 0) : 0;
      const p = spread > 0 ? { x: at.x + (this.rng.next() * 2 - 1) * spread, y: at.y + (this.rng.next() * 2 - 1) * spread * 0.5 } : at;
      view.playAt(p, { ...o.opts, i, n: count, seed: this.rng.int(1 << 30) });
      this.add(view, effectId, priority);
      n++;
    }
    return n;
  }

  /** Sends one instance of `effectId` flying from `from` to `to` (world lu). Returns false when dropped. */
  fly(effectId: EffectId, from: Pt, to: Pt, travelMs: number, arc: boolean, priority: number, opts?: Record<string, number>): boolean {
    if (!this.makeRoom(priority)) return false;
    const view = this.acquire(effectId, opts);
    view.fly(from, to, travelMs, arc);
    this.add(view, effectId, priority);
    return true;
  }

  update(dtMs: number): void {
    let removed = false;
    for (const l of this.live) {
      l.view.update(dtMs);
      if (l.view.done) {
        this.release(l);
        removed = true;
      }
    }
    if (removed) this.live = this.live.filter((l) => l.view.root.parent !== null);
  }

  /** Removes every live particle (match end, reset). */
  clear(): void {
    for (const l of this.live) this.release(l);
    this.live = [];
  }

  destroy(): void {
    this.clear();
    for (const list of this.free.values()) for (const v of list) v.destroy();
    this.free.clear();
  }

  private add(view: EffectView, effectId: EffectId, priority: number): void {
    this.layer.addChild(view.root);
    this.live.push({ view, effectId, priority, seq: this.seq++ });
  }

  /** Ensures one free slot for a particle of `priority`. False when the new particle should drop. */
  private makeRoom(priority: number): boolean {
    if (this.cap <= 0) {
      this.dropped++;
      return false;
    }
    if (this.live.length < this.cap) return true;
    // Evict the oldest particle of the lowest priority, if it is below the newcomer.
    let victim = -1;
    for (let i = 0; i < this.live.length; i++) {
      const l = this.live[i];
      const v = victim >= 0 ? this.live[victim] : undefined;
      if (!l) continue;
      if (!v || l.priority < v.priority || (l.priority === v.priority && l.seq < v.seq)) victim = i;
    }
    const v = this.live[victim];
    this.dropped++;
    if (!v || v.priority >= priority) return false;
    this.release(v);
    this.live.splice(victim, 1);
    return true;
  }

  private acquire(effectId: EffectId, opts?: Record<string, number>): EffectView {
    const list = this.free.get(effectId);
    const v = list?.pop();
    return v ?? this.art.createEffect(effectId, opts);
  }

  private release(l: Live): void {
    l.view.root.parent?.removeChild(l.view.root);
    let list = this.free.get(l.effectId);
    if (!list) {
      list = [];
      this.free.set(l.effectId, list);
    }
    if (list.length < MAX_FREE_PER_EFFECT) list.push(l.view);
    else l.view.destroy();
  }
}
