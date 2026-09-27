/**
 * The replay player (DESIGN A9 #14 Replay viewer, B3 Replays, C2/WP11): play, pause, 1x / 2x / 4x,
 * restart and a side toggle for the HUD. There is no seek in v1 (it arrives in v1.1).
 *
 * A replay is re-simulated from its config and recorded commands, tick by tick, through the same
 * fixed-step clock as a live battle, so the view and HUD behave exactly as in the match. At the end
 * the player checks the outcome and the final hash against the recording (`verified`).
 * A replay recorded on other content or another sim version cannot be played ("from an older
 * version", B3): the player reports `incompatible` and never steps.
 */
import { signal, type ReadonlySignal, type Signal } from '@preact/signals';
import type { CompiledContent, CreateSim, HudModel, ReplayDoc, Side, Sim, TimedCommand } from '@/contracts';
import { FixedStepClock, HudModelBuilder } from '@/render';
import { replayConfig } from '@/sim';
import type { FrameScheduler, HudBuilder, SessionView } from './session';

export type ReplayStatus = 'ready' | 'playing' | 'paused' | 'ended' | 'incompatible';
export type ReplaySpeed = 1 | 2 | 4;
export const REPLAY_SPEEDS: readonly ReplaySpeed[] = [1, 2, 4];

export interface ReplayPlayerOptions {
  replay: ReplayDoc;
  content: CompiledContent;
  createSim: CreateSim;
  /** The running build's sim version; a replay from another version is incompatible. */
  simVersion: string;
  /** Builds the view for a fresh sim (called again on restart). */
  createView?: (sim: Sim) => SessionView | null;
  /** Builds HUD models for a side. Default: `HudModelBuilder`. */
  createHud?: (sim: Sim, side: Side) => HudBuilder;
  /** Which side's HUD to show first (default 0, the player). */
  hudSide?: Side;
  /** Null = manual driving through `advance`. */
  scheduler?: FrameScheduler | null;
}

/** True when this build can re-simulate the replay (same content hash and sim version, B3). */
export function replayCompatible(r: ReplayDoc, content: CompiledContent, simVersion: string): boolean {
  return r.v === 1 && r.contentHash === content.hash && r.simVersion === simVersion;
}

/** The recorded commands grouped by execution tick. */
export function commandsByTick(r: ReplayDoc): Map<number, TimedCommand[]> {
  const byTick = new Map<number, TimedCommand[]>();
  for (const c of r.commands) {
    const list = byTick.get(c.tick);
    if (list) list.push(c);
    else byTick.set(c.tick, [c]);
  }
  return byTick;
}

const HUD_INTERVAL_MS = 1000 / 15;

export class ReplayPlayer {
  readonly replay: ReplayDoc;
  readonly status: ReadonlySignal<ReplayStatus>;
  /** HUD of the shown side; null for an incompatible replay. */
  readonly hud: ReadonlySignal<HudModel | null>;
  /** After the end: true when outcome and final hash match the recording. */
  readonly verified: ReadonlySignal<boolean | null>;
  readonly speed: ReadonlySignal<ReplaySpeed>;
  readonly hudSide: ReadonlySignal<Side>;
  private readonly statusSig: Signal<ReplayStatus>;
  private readonly hudSig: Signal<HudModel | null>;
  private readonly verifiedSig: Signal<boolean | null>;
  private readonly speedSig: Signal<ReplaySpeed>;
  private readonly sideSig: Signal<Side>;
  private readonly o: ReplayPlayerOptions;
  private readonly byTick: Map<number, TimedCommand[]>;
  private readonly clock = new FixedStepClock();
  private simValue: Sim | null = null;
  private view: SessionView | null = null;
  private hudBuilder: HudBuilder | null = null;
  private frame: number | null = null;
  private lastFrameAt: number | null = null;
  private lastHudAt = -Infinity;
  private disposed = false;

  constructor(o: ReplayPlayerOptions) {
    this.o = o;
    this.replay = o.replay;
    this.byTick = commandsByTick(o.replay);
    const ok = replayCompatible(o.replay, o.content, o.simVersion);
    this.statusSig = signal<ReplayStatus>(ok ? 'ready' : 'incompatible');
    this.hudSig = signal<HudModel | null>(null);
    this.verifiedSig = signal<boolean | null>(null);
    this.speedSig = signal<ReplaySpeed>(1);
    this.sideSig = signal<Side>(o.hudSide ?? 0);
    this.status = this.statusSig;
    this.hud = this.hudSig;
    this.verified = this.verifiedSig;
    this.speed = this.speedSig;
    this.hudSide = this.sideSig;
    if (ok) {
      this.load();
      this.schedule();
    }
  }

  /** The sim being replayed (null when incompatible). */
  get sim(): Sim | null {
    return this.simValue;
  }

  play(): void {
    const s = this.statusSig.peek();
    if (s !== 'ready' && s !== 'paused') return;
    this.statusSig.value = 'playing';
    this.view?.setPaused(false);
    this.refreshHud(true);
  }

  pause(): void {
    if (this.statusSig.peek() !== 'playing') return;
    this.statusSig.value = 'paused';
    this.view?.setPaused(true);
    this.refreshHud(true);
  }

  setSpeed(s: ReplaySpeed): void {
    this.speedSig.value = s;
    this.view?.setSpeed(s);
    this.refreshHud(true);
  }

  /** Shows the HUD of the other side (or `side`). */
  setHudSide(side: Side): void {
    if (!this.simValue) return;
    this.sideSig.value = side;
    this.hudBuilder = this.makeHud(this.simValue, side);
    this.refreshHud(true);
  }

  /** Starts over from tick 0 with a fresh sim and view (no seek in v1). */
  restart(): void {
    if (this.statusSig.peek() === 'incompatible' || this.disposed) return;
    this.view?.destroy?.();
    this.load();
    this.statusSig.value = 'ready';
    this.play();
  }

  /** One animation frame (the scheduler calls it; tests call it directly). */
  advance(frameMs: number): void {
    if (this.disposed || !this.simValue) return;
    if (this.statusSig.peek() === 'playing') {
      this.clock.add(frameMs, this.speedSig.peek(), this.view?.simFrozen ?? false);
      while (this.statusSig.peek() === 'playing' && !(this.view?.simFrozen ?? false) && this.clock.consume()) this.tick();
    }
    this.view?.render(this.clock.alpha, frameMs);
    this.refreshHud(false);
  }

  /** Re-simulates to the end at once (verification, tests). Returns `verified`. */
  runToEnd(): boolean | null {
    if (!this.simValue) return null;
    if (this.statusSig.peek() === 'ready' || this.statusSig.peek() === 'paused') this.statusSig.value = 'playing';
    while (this.statusSig.peek() === 'playing') this.tick();
    this.refreshHud(true);
    return this.verifiedSig.peek();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.frame !== null) this.o.scheduler?.cancel(this.frame);
    this.frame = null;
    this.view?.destroy?.();
    this.view = null;
  }

  private load(): void {
    const sim = this.o.createSim(replayConfig(this.replay, this.o.content));
    this.simValue = sim;
    this.clock.reset();
    this.verifiedSig.value = null;
    this.view = this.o.createView?.(sim) ?? null;
    this.view?.setSpeed(this.speedSig.peek());
    this.view?.setPaused(true);
    this.hudBuilder = this.makeHud(sim, this.sideSig.peek());
    this.refreshHud(true);
  }

  private makeHud(sim: Sim, side: Side): HudBuilder {
    return this.o.createHud?.(sim, side) ?? new HudModelBuilder(sim, side);
  }

  private tick(): void {
    const sim = this.simValue;
    if (!sim) return;
    const events = sim.step(this.byTick.get(sim.state.tick + 1) ?? []);
    this.hudBuilder?.afterStep?.();
    this.view?.onEvents(events);
    if (sim.state.outcome || sim.state.tick >= this.replay.result.tick) this.end(sim);
  }

  private end(sim: Sim): void {
    const out = sim.state.outcome;
    const r = this.replay.result;
    const same =
      out !== null &&
      out.winner === r.winner &&
      out.reason === r.reason &&
      out.tick === r.tick &&
      out.baseHpBp[0] === r.baseHpBp[0] &&
      out.baseHpBp[1] === r.baseHpBp[1] &&
      sim.hash() === this.replay.finalHash;
    this.verifiedSig.value = same;
    this.statusSig.value = 'ended';
    this.refreshHud(true);
  }

  private refreshHud(force: boolean): void {
    if (!this.simValue || !this.hudBuilder) return;
    const now = this.o.scheduler?.now() ?? 0;
    if (!force && this.o.scheduler && now - this.lastHudAt < HUD_INTERVAL_MS - 2) return;
    this.lastHudAt = now;
    const speed = this.speedSig.peek();
    this.hudSig.value = this.hudBuilder.build({ speed: speed === 4 ? 2 : speed, paused: this.statusSig.peek() !== 'playing' });
  }

  private schedule(): void {
    const sch = this.o.scheduler;
    if (!sch || this.frame !== null) return;
    const loop = (now: number): void => {
      this.frame = null;
      if (this.disposed) return;
      const frameMs = this.lastFrameAt === null ? 0 : now - this.lastFrameAt;
      this.lastFrameAt = now;
      this.advance(frameMs);
      this.frame = sch.request(loop);
    };
    this.frame = sch.request(loop);
  }
}
