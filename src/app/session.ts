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
 * - A live match (`live`, an online opponent; owner request 2026-10-13, queue item 34) never pauses and
 *   has no tempo of its own: a player's pause becomes a menu request (`pauseAsks`), a hidden tab does not
 *   pause, and the speed changes only through `setAgreedSpeed` (the live layer's proposals, `live/`).
 *   Time the page missed (a hidden tab, a suspended app: frames stop) is caught up on return: the missed
 *   ticks run without drawing each frame, a slice per frame, with the view silent and input held
 *   (`catchUp`); the bots keep playing through them. Away longer than `MAX_AWAY_MS` counts as leaving
 *   the match: a Retreat, as a reload does (`abandon.ts`).
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
import { FixedStepClock, HudModelBuilder, MAX_FRAME_MS, TICK_MS, type HudExtras } from '@/render';
import { createStatsTracker, type StatsTracker } from '@/sim';
import type { Content } from '@/content';
import { createFeatTracker, type FeatTracker } from '@/meta';

/** Speeds a battle allows (A2.12). */
export type BattleSpeed = 1 | 1.5 | 2;

/** What the session needs from a battle view. `render/BattleView` satisfies it. */
export interface SessionView {
  onEvents(events: readonly SimEvent[]): void;
  /** `catchUp`: a live match's catch-up step, which ages the scene but is no drawn frame (not timed). */
  render(alpha: number, frameMs: number, catchUp?: boolean): void;
  /** True during a global freeze (A12): no sim time passes. */
  readonly simFrozen: boolean;
  setSpeed(s: number): void;
  setPaused(p: boolean): void;
  destroy?(): void;
  /**
   * Resolves once the art the battle opens with has loaded (G7: the decks' unit sheets load per match);
   * null when it already has. The controller starts the clock only then, so no unit appears without its art.
   */
  artReady?(): Promise<void> | null;
  /** Mutes the view's sounds while a live match catches up (queue item 34; `live/silence.ts`). */
  setSilent?(on: boolean): void;
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

/** Tells the session when the page is hidden (visibility pause; a live match's away time). */
export interface VisibilitySource {
  readonly hidden: boolean;
  subscribe(cb: (hidden: boolean) => void): () => void;
  /** The wall clock for away times (`Date.now`); without it the frame clock measures them. */
  now?(): number;
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
  /**
   * A live (online) match (queue item 34): no pause, no player-set speed, no visibility pause; missed time
   * is caught up. `isLiveMatch` (`live/match.ts`) decides it from the match config.
   */
  live?: boolean;
  /**
   * The wall clock for a live match's away time (a suspended app may stop the frame clock). Default: the
   * visibility source's clock (`Date.now` in the browser), else the frame clock.
   */
  wallClock?: () => number;
}

/** A live match's catch-up in progress: how far behind it still is and how much is done. */
export interface CatchUpState {
  /** Game time still to run (ms). */
  behindGameMs: number;
  /** Real time still behind (ms, at the current speed). */
  behindMs: number;
  /** Of this catch-up, bp done. */
  doneBp: number;
}

/**
 * A live match away from the page longer than this (one absence) has been left: it ends as a Retreat (a
 * loss with no rewards, the same as a reload, `abandon.ts`). Shorter absences are caught up; the time owed
 * never exceeds this either.
 */
export const MAX_AWAY_MS = 120_000;
/** Wall time per frame a catch-up may use, so the page stays responsive and the cue can move. */
export const CATCH_UP_BUDGET_MS = 12;
/** During a catch-up the view is advanced every this many ticks (its effects and corpses age with the sim). */
const CATCH_UP_RENDER_TICKS = 5;

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

/**
 * Browser visibility source over `document.visibilityState` (app only). `pagehide` counts as hidden and
 * `pageshow` as shown again (Safari freezes a page into the back-forward cache without a visibility change).
 */
export function documentVisibility(doc: Document = document): VisibilitySource {
  const win = doc.defaultView;
  return {
    get hidden() {
      return doc.visibilityState === 'hidden';
    },
    now: () => Date.now(),
    subscribe(cb) {
      const on = () => cb(doc.visibilityState === 'hidden');
      const hide = () => cb(true);
      const show = () => cb(doc.visibilityState === 'hidden');
      doc.addEventListener('visibilitychange', on);
      win?.addEventListener('pagehide', hide);
      win?.addEventListener('pageshow', show);
      return () => {
        doc.removeEventListener('visibilitychange', on);
        win?.removeEventListener('pagehide', hide);
        win?.removeEventListener('pageshow', show);
      };
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
  /** The page's visibility (null headless): a battle that starts while the tab is hidden starts paused. */
  private readonly visibility: VisibilitySource | null;
  private readonly endListeners: ((r: MatchResultInput, replay: ReplayDoc) => void)[] = [];
  private readonly tickListeners = new Set<(events: readonly SimEvent[], sim: Sim) => void>();
  private ended: SessionResult | null = null;
  private pauseReasonValue: PauseReason | null = null;
  /** Commands a bot returned for the other side; dropped (a bot may only command its own side). */
  droppedBotCommands = 0;
  /** A live match (queue item 34): no pause, tempo only by agreement, missed time caught up. */
  readonly live: boolean;
  private readonly wallClock: (() => number) | null;
  private readonly pauseAsksSig = signal(0);
  private readonly catchUpSig = signal<CatchUpState | null>(null);
  private readonly awaySig = signal(false);
  private readonly frameListeners = new Set<(nowMs: number) => void>();
  /** The frame clock when there is no scheduler (tests and headless tools): the sum of `advance` calls. */
  private manualNow = 0;
  /** Game time a live match still has to catch up (ms). */
  private owedGameMs = 0;
  /** The size of the catch-up in progress (game ms), for its progress. */
  private owedTotalMs = 0;
  /** Wall time the page went hidden, and the away time measured when it came back (live). */
  private hiddenWallAt: number | null = null;
  private awayWallMs = 0;
  /** Frame time processed while hidden (a browser that still runs some frames in the background). */
  private hiddenFrameMs = 0;

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
    this.live = o.live === true;
    this.wallClock = o.wallClock ?? null;
    // a live match starts at the normal speed: any other needs both players (queue item 34)
    this.speed = this.live ? 1 : (o.speed ?? 1);
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
    this.visibility = o.visibility ?? null;
    if (o.visibility) {
      this.unsubscribeVisibility = o.visibility.subscribe((hidden) => {
        if (this.live) this.noteVisibility(hidden);
        else if (hidden && this.statusSig.peek() === 'running') this.pause('hidden');
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

  /** The view's opening art (G7): a promise while it still loads, else null (see `SessionView.artReady`). */
  artReady(): Promise<void> | null {
    return this.view?.artReady?.() ?? null;
  }

  start(): void {
    if (this.statusSig.peek() !== 'ready') return;
    this.setStatus('running');
    this.view?.setPaused(false);
    this.platform?.gameplayStart();
    if (this.live) {
      // the match runs from now: time before the start (the art loading, the countdown) is never owed
      this.lastFrameAt = this.scheduler ? this.scheduler.now() : null;
      this.awayWallMs = 0;
      this.hiddenFrameMs = 0;
      this.hiddenWallAt = this.visibility?.hidden === true ? this.wall() : null;
    } else if (this.visibility?.hidden === true) {
      // the tab was hidden before the clock started (the art loading in the background, G7): the visibility
      // pause applies at once (C5 #20)
      this.pause('hidden');
    }
    this.refreshHud(true);
  }

  pause(reason: PauseReason = 'player'): void {
    if (this.statusSig.peek() !== 'running') return;
    if (this.live) {
      // A live match never pauses (queue item 34): the player's pause (P, the back button) asks for the
      // menu instead; a hidden tab or the system changes nothing.
      if (reason === 'player') this.pauseAsksSig.value = this.pauseAsksSig.peek() + 1;
      return;
    }
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

  /** The player's speed button and the default speed. A live match ignores it: its tempo needs both players. */
  setSpeed(s: BattleSpeed): void {
    if (this.live) return;
    this.setAgreedSpeed(s);
  }

  /** Sets the speed both players agreed on (the live layer); offline it is the same as `setSpeed`. */
  setAgreedSpeed(s: BattleSpeed): void {
    this.speed = s;
    this.view?.setSpeed(s);
    this.refreshHud(true);
  }

  /** Queues a player command for the next tick. Ignored unless running, and only for `mySide`; held while catching up. */
  issue(c: Command): void {
    if (this.statusSig.peek() !== 'running') return;
    if (c.side !== this.mySide) return;
    if (this.catchingUp) return;
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
    this.frameListeners.clear();
    this.endListeners.length = 0;
    if (this.catchUpSig.peek()) this.view?.setSilent?.(false);
    this.catchUpSig.value = null;
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

  /** Called at the end of every frame with the frame clock, after the end too (the live layer's timers). */
  onFrame(cb: (nowMs: number) => void): () => void {
    this.frameListeners.add(cb);
    return () => this.frameListeners.delete(cb);
  }

  /** The frame clock (ms): the scheduler's, or the sum of `advance` calls when driven by hand. */
  now(): number {
    return this.scheduler ? this.scheduler.now() : this.manualNow;
  }

  /** Counts the pauses a live match turned into menu requests (P, the back button); the HUD opens its menu. */
  get pauseAsks(): ReadonlySignal<number> {
    return this.pauseAsksSig;
  }

  /** A live match's catch-up in progress (the HUD's "catching up" cue), or null. */
  get catchUp(): ReadonlySignal<CatchUpState | null> {
    return this.catchUpSig;
  }

  /** True while a live match runs the ticks it missed (input is held meanwhile). */
  get catchingUp(): boolean {
    return this.owedGameMs >= TICK_MS;
  }

  /** True once a live match ended because the player was away longer than `MAX_AWAY_MS` (a Retreat). */
  get awayForfeit(): ReadonlySignal<boolean> {
    return this.awaySig;
  }

  /**
   * A live match missed `ms` of real time (frames stopped: a hidden tab, a suspended app; or the dev hook):
   * it is caught up over the next frames, or, after an absence longer than `MAX_AWAY_MS`, the match has
   * been left and ends as a Retreat. Offline matches pause instead and never owe time.
   */
  owe(ms: number): void {
    if (!this.live || !(ms > 0) || this.statusSig.peek() !== 'running' || this.awaySig.peek()) return;
    if (ms > MAX_AWAY_MS) {
      this.leaveAway();
      return;
    }
    if (this.owedGameMs < TICK_MS) this.owedTotalMs = this.owedGameMs;
    // never more than the limit behind: a device too slow to keep up drops the excess instead of piling it up
    const add = Math.min(ms * this.speed, Math.max(0, MAX_AWAY_MS * this.speed - this.owedGameMs));
    this.owedGameMs += add;
    this.owedTotalMs += add;
    if (this.owedGameMs >= TICK_MS) this.publishCatchUp();
  }

  /**
   * One animation frame: adds `frameMs` of scaled game time, runs the due ticks and renders. The
   * scheduler calls this; tests and headless tools call it directly. A live match keeps a frame longer
   * than the 250 ms clamp (B6) as time owed and catches it up instead of dropping it.
   */
  advance(frameMs: number): void {
    const status = this.statusSig.peek();
    if (status === 'disposed') return;
    if (!this.scheduler) this.manualNow += Math.max(0, frameMs);
    if (status === 'running') {
      let step = frameMs;
      if (this.live) {
        if (this.hiddenWallAt !== null) this.hiddenFrameMs += Math.max(0, frameMs);
        const gap = Math.max(frameMs, this.awayWallMs);
        this.awayWallMs = 0;
        if (gap > MAX_FRAME_MS) {
          // the frame clock takes what it can (B6's clamp); the rest of the gap is owed
          step = Math.min(frameMs, MAX_FRAME_MS);
          this.owe(gap - step);
        }
      }
      if (this.statusSig.peek() === 'running') {
        const frozen = this.view?.simFrozen ?? false;
        this.clock.add(step, this.speed, frozen);
        while (this.statusSig.peek() === 'running' && !(this.view?.simFrozen ?? false) && this.clock.consume()) this.tick();
        if (this.live) this.catchUpSlice();
      }
    }
    this.view?.render(this.clock.alpha, frameMs);
    this.refreshHud(false);
    if (this.frameListeners.size > 0) {
      const now = this.now();
      for (const l of [...this.frameListeners]) l(now);
    }
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

  private wall(): number {
    return this.wallClock?.() ?? this.visibility?.now?.() ?? this.now();
  }

  /**
   * A live match's page went hidden or came back. The away time is measured on the wall clock as well as
   * by the frame gap (a suspended app can stop the frame clock); frames a browser still ran in the
   * background were already counted, so they are taken off.
   */
  private noteVisibility(hidden: boolean): void {
    if (hidden) {
      if (this.hiddenWallAt === null) {
        this.hiddenWallAt = this.wall();
        this.hiddenFrameMs = 0;
      }
      return;
    }
    if (this.hiddenWallAt === null) return;
    const away = this.wall() - this.hiddenWallAt - this.hiddenFrameMs;
    this.hiddenWallAt = null;
    this.hiddenFrameMs = 0;
    if (away > 0 && this.statusSig.peek() === 'running') this.awayWallMs = Math.max(this.awayWallMs, away);
  }

  /**
   * Runs owed ticks for at most `CATCH_UP_BUDGET_MS` of wall time (all of them when driven by hand): the
   * view gets every tick's events (spawns, evolves and builds stay right) but is not drawn per tick; it
   * is advanced every few ticks so effects and corpses age with the sim, and stays silent meanwhile.
   */
  private catchUpSlice(): void {
    if (this.owedGameMs < TICK_MS) {
      // less than a tick behind: nothing to run (the remainder is dropped)
      if (this.owedGameMs > 0 || this.catchUpSig.peek()) this.endCatchUp();
      return;
    }
    const sch = this.scheduler;
    const t0 = sch ? sch.now() : 0;
    this.view?.setSilent?.(true);
    let n = 0;
    while (this.owedGameMs >= TICK_MS && this.statusSig.peek() === 'running') {
      this.tick();
      this.owedGameMs -= TICK_MS;
      n += 1;
      if (n % CATCH_UP_RENDER_TICKS === 0) this.view?.render(0, (CATCH_UP_RENDER_TICKS * TICK_MS) / this.speed, true);
      if (sch && n % 4 === 0 && sch.now() - t0 >= CATCH_UP_BUDGET_MS) break;
    }
    if (this.owedGameMs < TICK_MS || this.statusSig.peek() !== 'running') this.endCatchUp();
    else this.publishCatchUp();
  }

  private endCatchUp(): void {
    const was = this.catchUpSig.peek() !== null || this.owedGameMs > 0;
    this.owedGameMs = 0;
    this.owedTotalMs = 0;
    if (!was) return;
    this.view?.setSilent?.(false);
    this.catchUpSig.value = null;
  }

  private publishCatchUp(): void {
    const total = Math.max(this.owedTotalMs, this.owedGameMs, 1);
    const done = Math.round(((total - this.owedGameMs) * 10_000) / total);
    this.catchUpSig.value = { behindGameMs: this.owedGameMs, behindMs: Math.round(this.owedGameMs / this.speed), doneBp: Math.max(0, Math.min(10_000, done)) };
  }

  /**
   * Away longer than `MAX_AWAY_MS`: the player has left the live match. It ends at once as a Retreat (a
   * loss with no rewards), the same result as a reload (`abandon.ts`) or the Retreat button.
   */
  private leaveAway(): void {
    this.endCatchUp();
    this.awaySig.value = true;
    this.human = [{ t: 'retreat', side: this.mySide }];
    this.tick();
    if (!this.sim.state.outcome) this.awaySig.value = false;
  }

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
