/**
 * `BattleSession` (DESIGN B15 `session.ts`, B6 loop, B11): runs one match.
 *
 * The session owns the fixed-step loop of B6:
 *
 * ```
 * acc += min(frameMs, 250) × speed × (freeze ? 0 : 1)
 * while acc ≥ 50:
 *   for each bot side: obsRing[side].push(sim.observe(side))
 *   cmds = humanCmds + stamp(bot.onTick(obsRing[side].at(bot.snapshotDelayTicks)))
 *   events = sim.step(cmds); view.onEvents(events); acc −= 50
 * view.render(alpha, frameMs)
 * ```
 *
 * - Human commands arrive through `issue`, bot commands from `BotController.onTick`, which only ever
 *   receives a delayed `Observation` (A7.1 honesty, B10). Both are stamped with the execution tick
 *   (`sim.tick + 1`) and a per-side sequence number, and every command is recorded for the replay.
 *   Emotes of the other side are relayed to bots that answer them (A7.2).
 * - Pause, speed (1x / 1.5x / 2x), global freezes (`view.simFrozen`, A12) and the visibility pause
 *   (the tab is hidden) stop time. The HUD model signal updates at 15 Hz (B6 HUD).
 * - When the sim reports an outcome the session stops stepping (the view keeps animating), reduces
 *   `MatchStats`, builds the `ReplayDoc` and calls the `onEnd` listeners. What happens next (meta
 *   rewards, save, replay ring) is the app flow's job (`flow.ts`).
 *
 * Everything the session touches arrives by injection, so tests drive it with the fake sim, no view
 * and a manual frame clock, and the app drives it with the real sim, `BattleView` and
 * `requestAnimationFrame`.
 */
import { signal, type ReadonlySignal, type Signal } from '@preact/signals';
import type {
  BattleSession,
  BotController,
  CardId,
  Command,
  EmoteId,
  Foil,
  HudModel,
  MatchResultInput,
  Observation,
  OpponentSpec,
  PlatformAdapter,
  ReplayDoc,
  Side,
  Sim,
  SimEvent,
  TimedCommand,
} from '@/contracts';
import { RingBuffer } from '@/core';
import { FixedStepClock, HudModelBuilder, type HudExtras } from '@/render';
import { createStatsTracker, type StatsTracker } from '@/sim';
import type { Content } from '@/content';
import { createFeatTracker, type FeatTracker } from '@/meta';

/** Speeds a battle allows (A2.12). */
export type BattleSpeed = 1 | 1.5 | 2;

/** What the session needs from a battle view. `render/BattleView` satisfies it. */
export interface SessionView {
  onEvents(events: readonly SimEvent[]): void;
  render(alpha: number, frameMs: number): void;
  /** True during a global freeze (A12): no sim time passes. */
  readonly simFrozen: boolean;
  setSpeed(s: number): void;
  setPaused(p: boolean): void;
  destroy?(): void;
}

/** Builds HUD models for the player's side. `render/HudModelBuilder` satisfies it. */
export interface HudBuilder {
  build(extras: HudExtras): HudModel;
  /** Called after every sim step (scripted tray unlocks are attributed per tick). */
  afterStep?(): void;
}

/** A source of animation frames. The browser one wraps `requestAnimationFrame`. */
export interface FrameScheduler {
  request(cb: (nowMs: number) => void): number;
  cancel(handle: number): void;
  now(): number;
}

/** Tells the session when the page is hidden (visibility pause). */
export interface VisibilitySource {
  readonly hidden: boolean;
  subscribe(cb: (hidden: boolean) => void): () => void;
}

/** A bot controlling one side (an AI General, the tutorial's Old Grogg, or a dev autopilot). */
export interface SessionBot {
  side: Side;
  controller: BotController;
}

export type SessionStatus = 'ready' | 'running' | 'paused' | 'ended' | 'disposed';
export type PauseReason = 'player' | 'hidden' | 'system';

export interface BattleSessionOptions {
  sim: Sim;
  mode: MatchResultInput['mode'];
  opponent: OpponentSpec;
  /** The human's side (and the HUD's). Default 0. */
  mySide?: Side;
  bots?: readonly SessionBot[];
  view?: SessionView | null;
  /** Default: `HudModelBuilder` over the sim for `mySide`. */
  hud?: HudBuilder;
  /** Null = manual driving through `advance` (tests, headless dev tools). */
  scheduler?: FrameScheduler | null;
  visibility?: VisibilitySource | null;
  platform?: PlatformAdapter | null;
  speed?: BattleSpeed;
  /** Recorded in the replay (`SIM_VERSION` of the real sim). */
  simVersion: string;
  /** Owned foils per card for the tray frames. */
  foils?: Partial<Record<CardId, Foil>>;
  /** Destroy the view on `dispose` (the session created it). Default true. */
  ownsView?: boolean;
}

export interface SessionResult {
  input: MatchResultInput;
  replay: ReplayDoc;
}

/** HUD refresh interval, 15 Hz (B6). */
export const HUD_INTERVAL_MS = 1000 / 15;
/** Frame times jitter; a refresh up to this early still counts (every 4th frame at 60 fps). */
const HUD_SLACK_MS = 2;

/** Browser frame scheduler over `requestAnimationFrame` (app only). */
export function browserScheduler(): FrameScheduler {
  return {
    request: (cb) => requestAnimationFrame(cb),
    cancel: (h) => cancelAnimationFrame(h),
    now: () => performance.now(),
  };
}

/** Browser visibility source over `document.visibilityState` (app only). */
export function documentVisibility(doc: Document = document): VisibilitySource {
  return {
    get hidden() {
      return doc.visibilityState === 'hidden';
    },
    subscribe(cb) {
      const on = () => cb(doc.visibilityState === 'hidden');
      doc.addEventListener('visibilitychange', on);
      return () => doc.removeEventListener('visibilitychange', on);
    },
  };
}

interface BotSlot {
  side: Side;
  controller: BotController;
  ring: RingBuffer<Observation>;
}

/** A bot that answers emotes (WP3's `AiBotController.hearEmote`, A7.2 emote rule). */
interface EmoteListener {
  hearEmote(emote: EmoteId, tick: number): void;
}

function hearsEmotes(c: BotController): c is BotController & EmoteListener {
  return typeof (c as Partial<EmoteListener>).hearEmote === 'function';
}

export class BattleSessionImpl implements BattleSession {
  readonly sim: Sim;
  readonly mySide: Side;
  readonly mode: MatchResultInput['mode'];
  readonly opponent: OpponentSpec;
  readonly hud: ReadonlySignal<HudModel>;
  private readonly hudSig: Signal<HudModel>;
  private readonly statusSig: Signal<SessionStatus>;
  private readonly view: SessionView | null;
  private readonly hudBuilder: HudBuilder;
  private readonly scheduler: FrameScheduler | null;
  private readonly platform: PlatformAdapter | null;
  private readonly simVersion: string;
  private readonly foils: Partial<Record<CardId, Foil>>;
  private readonly ownsView: boolean;
  private readonly bots: BotSlot[];
  private readonly clock = new FixedStepClock();
  private readonly stats: StatsTracker;
  /** Hidden feats (A15.10): fed each tick's events like the stats; never in the tutorial. */
  private readonly feats: FeatTracker | null;
  private readonly recorded: TimedCommand[] = [];
  private readonly seq: [number, number] = [0, 0];
  private human: Command[] = [];
  private speed: BattleSpeed;
  private frame: number | null = null;
  private lastFrameAt: number | null = null;
  private lastHudAt = -Infinity;
  private unsubscribeVisibility: (() => void) | null = null;
  private readonly endListeners: ((r: MatchResultInput, replay: ReplayDoc) => void)[] = [];
  private readonly tickListeners = new Set<(events: readonly SimEvent[], sim: Sim) => void>();
  private ended: SessionResult | null = null;
  private pauseReasonValue: PauseReason | null = null;
  /** Commands a bot returned for the other side; dropped (a bot may only command its own side). */
  droppedBotCommands = 0;

  constructor(o: BattleSessionOptions) {
    this.sim = o.sim;
    this.mySide = o.mySide ?? 0;
    this.mode = o.mode;
    this.opponent = o.opponent;
    this.view = o.view ?? null;
    this.scheduler = o.scheduler ?? null;
    this.platform = o.platform ?? null;
    this.simVersion = o.simVersion;
    this.foils = o.foils ?? {};
    this.ownsView = o.ownsView ?? true;
    this.speed = o.speed ?? 1;
    this.hudBuilder = o.hud ?? new HudModelBuilder(this.sim, this.mySide);
    this.bots = (o.bots ?? []).map((b) => ({
      side: b.side,
      controller: b.controller,
      ring: new RingBuffer<Observation>(Math.max(1, Math.trunc(b.controller.snapshotDelayTicks)) + 1),
    }));
    this.stats = createStatsTracker({ format: this.sim.config.format, content: this.sim.config.content }, this.mySide);
    const typed = this.sim.config.content as Partial<Content>;
    this.feats =
      this.mode !== 'tutorial' && typed.feats
        ? createFeatTracker({ content: typed as Content, format: this.sim.config.format, side: this.mySide, loadouts: this.sim.config.sides[this.mySide].loadouts })
        : null;
    this.statusSig = signal<SessionStatus>('ready');
    this.hudSig = signal(this.hudBuilder.build(this.extras()));
    this.hud = this.hudSig;
    this.view?.setSpeed(this.speed);
    this.view?.setPaused(true);
    if (o.visibility) {
      this.unsubscribeVisibility = o.visibility.subscribe((hidden) => {
        if (hidden && this.statusSig.peek() === 'running') this.pause('hidden');
      });
    }
    if (this.sim.state.outcome) this.finish();
    // The view renders from the first frame (the title screen is the live battlefield, A8 0:00);
    // ticks only run once the session is started.
    this.schedule();
  }

  // ------------------------------------------------------------------------------------------
  // BattleSession contract
  // ------------------------------------------------------------------------------------------

  start(): void {
    if (this.statusSig.peek() !== 'ready') return;
    this.setStatus('running');
    this.view?.setPaused(false);
    this.platform?.gameplayStart();
    this.refreshHud(true);
  }

  pause(reason: PauseReason = 'player'): void {
    if (this.statusSig.peek() !== 'running') return;
    this.pauseReasonValue = reason;
    this.setStatus('paused');
    this.view?.setPaused(true);
    this.platform?.gameplayStop();
    this.refreshHud(true);
  }

  resume(): void {
    if (this.statusSig.peek() !== 'paused') return;
    this.pauseReasonValue = null;
    this.setStatus('running');
    this.view?.setPaused(false);
    this.platform?.gameplayStart();
    this.refreshHud(true);
  }

  setSpeed(s: BattleSpeed): void {
    this.speed = s;
    this.view?.setSpeed(s);
    this.refreshHud(true);
  }

  /** Queues a player command for the next tick. Ignored unless running, and only for `mySide`. */
  issue(c: Command): void {
    if (this.statusSig.peek() !== 'running') return;
    if (c.side !== this.mySide) return;
    this.human.push(c);
  }

  onEnd(cb: (r: MatchResultInput, replay: ReplayDoc) => void): void {
    this.endListeners.push(cb);
    if (this.ended) cb(this.ended.input, this.ended.replay);
  }

  dispose(): void {
    if (this.statusSig.peek() === 'disposed') return;
    if (this.statusSig.peek() === 'running') this.platform?.gameplayStop();
    if (this.frame !== null) this.scheduler?.cancel(this.frame);
    this.frame = null;
    this.unsubscribeVisibility?.();
    this.unsubscribeVisibility = null;
    this.tickListeners.clear();
    this.endListeners.length = 0;
    if (this.ownsView) this.view?.destroy?.();
    this.setStatus('disposed');
  }

  // ------------------------------------------------------------------------------------------
  // Extras for the app, the tutorial and dev tools
  // ------------------------------------------------------------------------------------------

  /** 'ready' → 'running' ⇄ 'paused' → 'ended' → 'disposed'. */
  get status(): ReadonlySignal<SessionStatus> {
    return this.statusSig;
  }

  get currentSpeed(): BattleSpeed {
    return this.speed;
  }

  /** Why the session is paused, or null. 'hidden' = the tab was hidden. */
  get pauseReason(): PauseReason | null {
    return this.pauseReasonValue;
  }

  /** The finished match, or null while it runs. */
  get result(): SessionResult | null {
    return this.ended;
  }

  /** Commands recorded so far (the replay's command list). */
  get commands(): readonly TimedCommand[] {
    return this.recorded;
  }

  /** Called after every sim step with that tick's events (tutorial director, event log). */
  onTick(cb: (events: readonly SimEvent[], sim: Sim) => void): () => void {
    this.tickListeners.add(cb);
    return () => this.tickListeners.delete(cb);
  }

  /**
   * One animation frame: adds `frameMs` of scaled game time, runs the due ticks and renders. The
   * scheduler calls this; tests and headless tools call it directly.
   */
  advance(frameMs: number): void {
    const status = this.statusSig.peek();
    if (status === 'disposed') return;
    if (status === 'running') {
      const frozen = this.view?.simFrozen ?? false;
      this.clock.add(frameMs, this.speed, frozen);
      while (this.statusSig.peek() === 'running' && !(this.view?.simFrozen ?? false) && this.clock.consume()) this.tick();
    }
    this.view?.render(this.clock.alpha, frameMs);
    this.refreshHud(false);
  }

  /**
   * Dev fast-forward (B13 e2e: "a Skirmish starts and ends via dev fast-forward"): runs up to
   * `maxTicks` ticks at once, ignoring freezes and the frame clock. Returns the ticks run.
   */
  fastForward(maxTicks: number): number {
    let n = 0;
    while (n < maxTicks && this.statusSig.peek() === 'running') {
      this.tick();
      n += 1;
    }
    this.refreshHud(true);
    return n;
  }

  // ------------------------------------------------------------------------------------------
  // Internals
  // ------------------------------------------------------------------------------------------

  private extras(): HudExtras {
    return { speed: this.speed, paused: this.statusSig.peek() !== 'running', foils: this.foils };
  }

  private setStatus(s: SessionStatus): void {
    this.statusSig.value = s;
  }

  private schedule(): void {
    const sch = this.scheduler;
    if (!sch || this.frame !== null) return;
    const loop = (now: number): void => {
      this.frame = null;
      if (this.statusSig.peek() === 'disposed') return;
      const frameMs = this.lastFrameAt === null ? 0 : now - this.lastFrameAt;
      this.lastFrameAt = now;
      this.advance(frameMs);
      this.frame = sch.request(loop);
    };
    this.frame = sch.request(loop);
  }

  private stamp(cmds: readonly Command[], tick: number): TimedCommand[] {
    return cmds.map((c) => {
      this.seq[c.side] += 1;
      return { ...c, tick, seq: this.seq[c.side] };
    });
  }

  /** One 50 ms tick: bots read their delayed observation, then the sim steps. */
  private tick(): void {
    const tick = this.sim.state.tick + 1;
    const cmds: TimedCommand[] = this.stamp(this.human, tick);
    this.human = [];
    for (const b of this.bots) {
      b.ring.push(this.sim.observe(b.side));
      const obs = b.ring.at(b.controller.snapshotDelayTicks);
      if (!obs) continue;
      const own = b.controller.onTick(obs).filter((c) => {
        if (c.side === b.side) return true;
        this.droppedBotCommands += 1;
        return false;
      });
      cmds.push(...this.stamp(own, tick));
    }
    // The sim applies a tick's commands by (side, seq) (B3 step 1); record them in that order too,
    // so the replay equals the sim's own log.
    cmds.sort((a, b) => a.side - b.side || a.seq - b.seq);
    const events = this.sim.step(cmds);
    this.recorded.push(...cmds);
    this.relayEmotes(events);
    this.stats.push(events);
    this.feats?.push(events);
    this.hudBuilder.afterStep?.();
    this.view?.onEvents(events);
    for (const l of this.tickListeners) l(events, this.sim);
    if (this.sim.state.outcome) this.finish();
  }

  /**
   * A7.2 emotes: "If the player emotes first, the bot may reply". Emotes are on screen for both
   * sides, so every bot hears the other side's emotes as they happen (like WP3's `BotMatch`).
   */
  private relayEmotes(events: readonly SimEvent[]): void {
    for (const e of events) {
      if (e.e !== 'emote') continue;
      for (const b of this.bots) if (b.side !== e.side && hearsEmotes(b.controller)) b.controller.hearEmote(e.emote, e.tick);
    }
  }

  private refreshHud(force: boolean): void {
    if (this.statusSig.peek() === 'disposed') return;
    const now = this.scheduler?.now() ?? 0;
    if (!force && this.scheduler && now - this.lastHudAt < HUD_INTERVAL_MS - HUD_SLACK_MS) return;
    this.lastHudAt = now;
    this.hudSig.value = this.hudBuilder.build(this.extras());
  }

  private finish(): void {
    if (this.ended) return;
    const outcome = this.sim.state.outcome;
    if (!outcome) return;
    const cfg = this.sim.config;
    const replay: ReplayDoc = {
      v: 1,
      simVersion: this.simVersion,
      contentHash: cfg.content.hash,
      seed: cfg.seed,
      format: cfg.format,
      sides: [cfg.sides[0], cfg.sides[1]],
      modifiers: [...(cfg.modifiers ?? [])],
      training: cfg.training ?? null,
      commands: this.recorded.map((c) => ({ ...c })),
      result: { ...outcome, baseHpBp: [outcome.baseHpBp[0], outcome.baseHpBp[1]] },
      finalHash: this.sim.hash(),
      hashes: [...this.sim.state.hashes],
    };
    const input: MatchResultInput = {
      mode: this.mode,
      outcome: replay.result,
      mySide: this.mySide,
      opponent: this.opponent,
      stats: this.stats.result(),
    };
    const feats = this.feats?.found(replay.result) ?? [];
    if (feats.length > 0) input.feats = feats;
    this.ended = { input, replay };
    const wasRunning = this.statusSig.peek() === 'running';
    this.setStatus('ended');
    if (wasRunning) this.platform?.gameplayStop();
    this.refreshHud(true);
    for (const cb of [...this.endListeners]) cb(input, replay);
  }
}

/** Creates a session (the contract's constructor shape). */
export function createBattleSession(o: BattleSessionOptions): BattleSessionImpl {
  return new BattleSessionImpl(o);
}
