/**
 * Forts in the battle view (DESIGN A16.14.8, B6): the render side of `ArtProvider.createFort`.
 *
 * - Walls, towers and camps are sim units (their hidden twins), so the battle view keeps them in its
 *   unit map for bars, sparks, shots and deaths; `FortUnitView` wraps the `FortView` in the `UnitView`
 *   shape and turns sim state into a `FortPose` (scaffold progress, crumble stage, decay, the tower's
 *   next shot, Suppress).
 * - Traps are not units (`SimState.traps`): `TrapViews` keeps one `FortView` per live trap and plays its
 *   armed / sprung / spent states.
 * Presentation only: every timing comes from the sim (B5).
 */
import type { Container } from 'pixi.js';
import type { Anchors, ArtProvider, ClipName, FortPose, FortView, UnitPose, UnitView } from '@/contracts/art';
import type { CardId, CompiledContent, Side, SimState, TeamPreset, TrapState, UnitState } from '@/contracts';
import { MILLI_LU } from './layout';

/** Crumble stage per HP: 1 at ≤ 66%, 2 at ≤ 33%, 3 at ≤ 12% (A16.14.8). */
export function fortCrumble(hpBp: number): 0 | 1 | 2 | 3 {
  if (hpBp <= 1200) return 3;
  if (hpBp <= 3300) return 2;
  if (hpBp <= 6600) return 1;
  return 0;
}

const TICK_MS = 50;

/** Row the forts stand on (lu) and their draw order: behind every unit row, so troops read in front. */
export const FORT_ROW_LU = -6;
export const FORT_Z = 1000;

/**
 * A side's scaffold time, ms (A16.14.5): Engineers (a `fortScaffold` research effect among the owned pick
 * indices) or the economy's. Presentation reads it so a 3 s scaffold rises from the ground, not from 40%.
 */
export function scaffoldMsFor(content: CompiledContent, owned: readonly number[]): number {
  let best = content.economy.fort?.scaffoldMs ?? 5000;
  for (const i of owned) {
    for (const fx of content.research.picks[i]?.effects ?? []) if (fx.kind === 'fortScaffold' && fx.ms > 0 && fx.ms < best) best = fx.ms;
  }
  return best;
}

/** Optional view-side inputs to `fortPoseOf`. */
export interface FortPoseExtras {
  /** Decay already shown before the Siege switch moved the decay clock (A16.14.2), bp. */
  decayCarryBp?: number;
  /** Is the tower's current target still alive? A dead target means no shot follows, so no wind-up. */
  targetAlive?: (id: number) => boolean;
}

/** The fort part of a pose from sim state (`startTick`: when the view saw it placed; `scaffoldMs`: the owner's scaffold time). */
export function fortPoseOf(u: Readonly<UnitState>, tick: number, startTick: number, siege: boolean, scaffoldMs: number, x: FortPoseExtras = {}): Omit<FortPose, 'x' | 'y' | 'hpBp' | 'crumbleStage'> {
  const f = u.fort;
  if (!f) return { scaffoldBp: 10000, decayBp: 0, silenced: false };
  let scaffoldBp = 10000;
  if (!f.done) {
    const start = Math.min(startTick, f.doneTick - Math.round(scaffoldMs / TICK_MS));
    const span = Math.max(1, f.doneTick - start);
    scaffoldBp = Math.max(0, Math.min(9999, Math.floor(((tick - start) * 10000) / span)));
  }
  const decaying = f.done && tick > f.decayFromTick;
  const own = decaying ? Math.floor((tick - f.decayFromTick) / 20) * (siege ? 200 : 100) : 0;
  const decayBp = f.done ? Math.min(10000, own + (x.decayCarryBp ?? 0)) : 0;
  const pose: Omit<FortPose, 'x' | 'y' | 'hpBp' | 'crumbleStage'> = { scaffoldBp, decayBp, silenced: tick < f.silencedUntilTick };
  const st = u.attacks[0];
  if (f.kind === 'tower' && f.done && st && st.targetId !== 0 && (!x.targetAlive || x.targetAlive(st.targetId))) pose.nextAttackInMs = (st.nextAttackTick - tick) * TICK_MS;
  return pose;
}

/** A `FortView` in the `UnitView` shape the battle view's unit map expects. */
export class FortUnitView implements UnitView {
  readonly root: Container;
  private extra: Omit<FortPose, 'x' | 'y' | 'hpBp' | 'crumbleStage'> = { scaffoldBp: 10000, decayBp: 0, silenced: false };

  constructor(readonly fort: FortView) {
    this.root = fort.root;
  }

  /** The art's anchors (duck-typed on the fort view: they arrive with its sheet). */
  get anchors(): Anchors {
    const a = (this.fort as unknown as { anchors?: Anchors }).anchors;
    return a ?? { feet: { x: 0, y: 0 }, head: { x: 0, y: -90 }, muzzle: { x: 6, y: -60 }, hitCenter: { x: 0, y: -34 } };
  }

  setFortState(p: Omit<FortPose, 'x' | 'y' | 'hpBp' | 'crumbleStage'>): void {
    this.extra = p;
  }

  setPose(p: UnitPose): void {
    // A scaffold stands at 50% HP by rule (A16.14.2): it rises whole, never as a broken fort.
    const crumbleStage = this.extra.scaffoldBp < 10000 ? 0 : fortCrumble(p.hpBp);
    this.fort.setPose({ x: p.x, y: p.y, hpBp: p.hpBp, crumbleStage, ...this.extra });
    this.root.alpha = p.alpha;
  }

  play(clip: ClipName | string): void {
    // walls, towers and camps never walk: the unit loop's idle/walk/stun requests are ignored
    if (clip === 'idle' || clip === 'walk' || clip === 'stun' || clip === 'victory' || clip === 'spawn') return;
    this.fort.play(clip === 'die' ? 'collapse' : clip);
  }

  freeze(ms: number): void {
    this.fort.freeze(ms);
  }

  flash(ms: number, color?: number): void {
    this.fort.flash(ms, color);
  }

  update(dtMs: number): void {
    this.fort.update(dtMs);
  }

  destroy(): void {
    this.fort.destroy();
  }
}

interface TrapEntry {
  id: number;
  side: Side;
  view: FortView;
  x: number;
  armed: boolean;
  charges: number;
  /** Ms left of the spent fade once the trap left the sim state. */
  leavingMs: number;
}

/** Traps on the lane (A16.14.3): always visible, never targeted. */
export class TrapViews {
  private readonly traps = new Map<number, TrapEntry>();

  constructor(
    private readonly art: ArtProvider,
    private readonly layer: Container,
    private readonly content: CompiledContent,
    private readonly preset: () => TeamPreset,
    private readonly xOf: (p: number, side: Side) => number,
  ) {}

  has(id: number): boolean {
    return this.traps.has(id);
  }

  /** Plays a clip on a trap (`trigger`, `armed`, `spent`). */
  play(id: number, clip: string): void {
    this.traps.get(id)?.view.play(clip);
  }

  /** Where a trap is (world lu), for effects. */
  at(id: number): number | null {
    return this.traps.get(id)?.x ?? null;
  }

  sync(st: Readonly<SimState>, dtMs: number, visible: (x: number) => boolean): void {
    const live = new Set<number>();
    for (const t of st.traps as readonly TrapState[]) {
      live.add(t.id);
      let e = this.traps.get(t.id);
      if (!e) e = this.create(t) ?? undefined;
      if (!e) continue;
      const armed = st.tick >= t.armTick;
      const armTicks = Math.max(1, Math.round((this.content.forts[t.card]?.trap?.armMs ?? 2000) / 50));
      const armBp = armed ? 10000 : Math.max(0, Math.min(9999, 10000 - Math.floor(((t.armTick - st.tick) * 10000) / armTicks)));
      e.charges = t.charges;
      // the charge pips are the HUD's (ui/hud/FortLane.tsx), so the lane art draws the patch only
      e.view.setPose({ x: e.x, y: 2, hpBp: 10000, scaffoldBp: armBp, decayBp: 0, crumbleStage: 0, silenced: false });
      e.armed = armed;
    }
    for (const e of [...this.traps.values()]) {
      if (!live.has(e.id) && e.leavingMs < 0) {
        e.leavingMs = 900;
        e.view.play('spent');
      }
      if (e.leavingMs >= 0) {
        e.leavingMs -= dtMs;
        if (e.leavingMs <= 0) {
          e.view.destroy();
          this.traps.delete(e.id);
          continue;
        }
      }
      e.view.root.visible = visible(e.x);
      e.view.update(dtMs);
    }
  }

  private create(t: Readonly<TrapState>): TrapEntry | null {
    const fr = this.content.forts[t.card as CardId];
    if (!this.art.createFort || !fr) return null;
    const view = this.art.createFort({ visualId: fr.visualId, side: t.side, teamPreset: this.preset(), kind: 'trap' });
    const x = this.xOf(t.p, t.side) / MILLI_LU;
    view.root.zIndex = 0;
    this.layer.addChild(view.root);
    const e: TrapEntry = { id: t.id, side: t.side, view, x, armed: false, charges: t.charges, leavingMs: -1 };
    this.traps.set(t.id, e);
    return e;
  }

  destroy(): void {
    for (const e of this.traps.values()) e.view.destroy();
    this.traps.clear();
  }
}
