/**
 * The app flow for Phase 1 (DESIGN A8, A9 flow, B11): title (the live battlefield with one Play
 * button) → battle → result (staged rewards) → next onboarding match, Quick Battle or a replay.
 *
 * It owns the current route, the save and the onboarding step as signals. Screens only read those
 * and call the actions here. Phase 2 moves the meta screens onto WP9's router (`ui/router.ts`) and
 * inserts the capsule show (WP10) at the capsule steps; this controller keeps the battle, result and
 * replay parts.
 */
import { signal, type ReadonlySignal, type Signal } from '@preact/signals';
import type { FormatId, MatchResultInput, ReplayDoc, RewardStep, SaveDoc, Sim } from '@/contracts';
import { createBattle, type BattleHandle } from './battle';
import { finishMatch } from './flow';
import { quickBattle, tutorialMatch1, tutorialMatch2, type MatchSetup, type SetupLabels } from './matchSetup';
import { ONBOARDING_STEPS, afterOnboardingMatch, completeStep, onboardingStep, type OnboardingStep } from './onboarding';
import type { Services } from './services';
import type { FrameScheduler, SessionView, VisibilitySource } from './session';

export interface ResultState {
  setup: MatchSetup;
  /**
   * The finished battle, kept alive behind the result so its last frame stays on screen (dimmed);
   * disposed when the player leaves the result.
   */
  battle?: BattleHandle;
  input: MatchResultInput;
  replay: ReplayDoc;
  rewards: RewardStep[];
}

export type AppRoute =
  /** The title screen: the next onboarding match waits behind the Play button (A8 0:00). */
  | { id: 'title'; battle: BattleHandle | null }
  | { id: 'battle'; battle: BattleHandle }
  | { id: 'result'; result: ResultState }
  | { id: 'replay'; replay: ReplayDoc };

/** Quick Battle opponent (C3 Checkpoint A: "Short War vs a tier III bot"). */
export const QUICK_BATTLE_GENERAL = 'kettle';
export const QUICK_BATTLE_TIER = 3;

/** How long the end of a match plays (base collapse, slow motion, coins) before the result. */
export const END_DELAY_MS = 2500;

/** "3-2-1 Fight!" before a non-tutorial battle: each number shows this long (audit #21). */
export const COUNTDOWN_STEP_MS = 700;
/** How long "Fight!" stays after the battle has started. */
export const COUNTDOWN_FIGHT_MS = 650;

export interface AppControllerOptions {
  save: SaveDoc | null;
  /** Builds the battle view (the battle screen owns the canvas). */
  createView?: (sim: Sim) => SessionView | null;
  scheduler?: FrameScheduler | null;
  visibility?: VisibilitySource | null;
  /** Dev autopilot (`?dev=1&autopilot=1`). */
  autopilot?: boolean;
  /** Waits before the result screen; tests pass an immediate one. */
  delay?: (ms: number) => Promise<void>;
  /** A fresh seed for each non-scripted match. */
  seed?: () => number;
  /** "3-2-1 Fight!" before Quick Battles and other non-tutorial matches (off in tests and on autopilot). */
  countdown?: boolean;
  /**
   * Phase 2b: once onboarding is done the start screen is WP9's Home (an opaque screen), so the
   * title builds no waiting battle behind it (main.tsx sets this; the Phase 2a tests do not).
   */
  homeScreen?: boolean;
}

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export class AppController {
  readonly route: ReadonlySignal<AppRoute>;
  readonly save: ReadonlySignal<SaveDoc | null>;
  /** The onboarding step; kept in memory too, so Phase 1 (no save yet) still walks A8. */
  readonly step: ReadonlySignal<OnboardingStep>;
  /** Replays of this session, newest last (the store keeps the persistent ring). */
  readonly replays: ReadonlySignal<readonly ReplayDoc[]>;
  private readonly routeSig: Signal<AppRoute>;
  private readonly saveSig: Signal<SaveDoc | null>;
  private readonly stepSig: Signal<OnboardingStep>;
  private readonly replaysSig: Signal<readonly ReplayDoc[]>;
  private readonly services: Services;
  private readonly o: AppControllerOptions;
  private seedCounter = 1;
  private countdownTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(services: Services, o: AppControllerOptions) {
    this.services = services;
    this.o = o;
    this.saveSig = signal(o.save);
    this.stepSig = signal(onboardingStep(o.save));
    this.replaysSig = signal<readonly ReplayDoc[]>(services.saveStore.loadReplays());
    this.routeSig = signal<AppRoute>({ id: 'title', battle: null });
    this.route = this.routeSig;
    this.save = this.saveSig;
    this.step = this.stepSig;
    this.replays = this.replaysSig;
  }

  private t(key: string): string {
    return this.services.i18n.t(key);
  }

  private nextSeed(): number {
    return this.o.seed?.() ?? (this.seedCounter++ * 7919 + 17) >>> 0;
  }

  /** Names for the sides (the player's only matters before a save exists). */
  private labels(): SetupLabels {
    return { player: this.t('app.you') };
  }

  /** The onboarding match for the current step, or null once onboarding is done. */
  onboardingSetup(): MatchSetup | null {
    switch (this.stepSig.peek()) {
      case 'match1':
        return tutorialMatch1(this.saveSig.peek(), this.services.content, this.t('general.grogg.name'), this.labels());
      case 'match2':
        return this.match2Setup();
      default:
        return null;
    }
  }

  private match2Setup(): MatchSetup {
    return tutorialMatch2(this.saveSig.peek(), this.services.content, this.t('general.pip.name'), this.nextSeed(), this.labels());
  }

  /** A14.3 music: the menu cue on the title and result screens. */
  private menuMusic(): void {
    this.services.audio.music.setCue('music.menu', { fadeMs: 600 });
  }

  /** A14.3 music: a battle starts in its first age's cue (the view takes over the evolve cues). */
  private battleMusic(battle: BattleHandle): void {
    const cfg = battle.setup.config;
    const age = cfg.content.formats[cfg.format]?.ages[0];
    const cue = age ? cfg.content.ages[age]?.musicCue : undefined;
    if (cue) this.services.audio.music.setCue(cue, { fadeMs: 600 });
  }

  /** Starts a battle that is on screen (route and music), after the countdown when it has one. */
  private startBattle(battle: BattleHandle): void {
    this.routeSig.value = { id: 'battle', battle };
    this.battleMusic(battle);
    if (this.o.countdown && !this.o.autopilot && battle.setup.mode !== 'tutorial') this.runCountdown(battle);
    else battle.session.start();
  }

  /**
   * "3-2-1 Fight!" (audit #21): the sim waits in 'ready' (no ticks, no commands) while the numbers
   * show, so nobody is hit while still reading the screen. `countdown` goes 3, 2, 1, 0 ("Fight!",
   * the battle is running), then -1 (hidden).
   */
  private runCountdown(battle: BattleHandle): void {
    this.clearCountdown();
    const cd = battle.countdown;
    cd.value = 3;
    const step = (): void => {
      const r = this.routeSig.peek();
      if (r.id !== 'battle' || r.battle !== battle) return;
      if (cd.peek() > 1) {
        cd.value = cd.peek() - 1;
        this.countdownTimer = setTimeout(step, COUNTDOWN_STEP_MS);
        return;
      }
      if (cd.peek() === 1) {
        cd.value = 0;
        battle.session.start();
        this.countdownTimer = setTimeout(step, COUNTDOWN_FIGHT_MS);
        return;
      }
      cd.value = -1;
      this.countdownTimer = null;
    };
    this.countdownTimer = setTimeout(step, COUNTDOWN_STEP_MS);
  }

  private clearCountdown(): void {
    if (this.countdownTimer !== null) clearTimeout(this.countdownTimer);
    this.countdownTimer = null;
  }

  /** Ends a running countdown at once and starts the battle (pause button, dev fast-forward). */
  skipCountdown(): void {
    const r = this.routeSig.peek();
    if (r.id !== 'battle' || r.battle.countdown.peek() <= 0) return;
    this.clearCountdown();
    r.battle.countdown.value = -1;
    r.battle.session.start();
  }

  /** Shows the title: the next onboarding match is built and waits, rendered, behind Play. */
  showTitle(): void {
    const leaving = this.routeSig.peek();
    this.disposeRoute();
    if (leaving.id === 'battle') this.services.audio.music.stop(600);
    this.menuMusic();
    // No capsules without meta (Phase 1): a capsule step completes at once. Phase 2 opens WP10's
    // capsule show here instead.
    const step = this.stepSig.peek();
    if ((step === 'capsule1' || step === 'capsule2') && !this.services.meta) this.completeStep(step);
    // After onboarding the start screen is Home (WP9): nothing waits behind it.
    if (this.o.homeScreen && this.stepSig.peek() === 'home') {
      this.routeSig.value = { id: 'title', battle: null };
      return;
    }
    // The title is the live battlefield (A8 0:00): the next onboarding match waits behind it, or the
    // training match vs Old Grogg once onboarding is done.
    const setup = this.onboardingSetup() ?? tutorialMatch1(this.saveSig.peek(), this.services.content, this.t('general.grogg.name'), this.labels());
    this.routeSig.value = { id: 'title', battle: this.build(setup) };
  }

  /** Play: starts the waiting onboarding match (one tap into match 1, A8). */
  play(): void {
    const r = this.routeSig.peek();
    const battle = r.id === 'title' ? r.battle : null;
    if (!battle) return;
    this.startBattle(battle);
  }

  /**
   * The training match vs Old Grogg (A8 match 1) from the start screen, whatever the onboarding
   * step (Phase 2a: the start screen offers it next to Quick Battle).
   */
  training(): BattleHandle {
    this.disposeRoute();
    const battle = this.build(tutorialMatch1(this.saveSig.peek(), this.services.content, this.t('general.grogg.name'), this.labels()));
    this.startBattle(battle);
    return battle;
  }

  /** Quick Battle (C3 Checkpoint A): Short War (or another format) vs a tier III AI General. */
  quickBattle(format: FormatId = 'short'): BattleHandle {
    this.disposeRoute();
    const setup = quickBattle(this.saveSig.peek(), this.services.content, {
      generalId: QUICK_BATTLE_GENERAL,
      displayName: this.t(`general.${QUICK_BATTLE_GENERAL}.name`),
      format,
      seed: this.nextSeed(),
      tier: QUICK_BATTLE_TIER,
      ...this.labels(),
    });
    const battle = this.build(setup);
    this.startBattle(battle);
    return battle;
  }

  /** Leaves a running battle without a result (Quit on the pause screen). */
  quit(): void {
    this.showTitle();
  }

  /** Result screen "Next": the capsule step (Phase 2: WP10's show), then the next match or the title. */
  next(): void {
    this.showTitle();
    if (this.stepSig.peek() !== 'home') this.play();
  }

  /**
   * A lost onboarding match can be played again (A8 match 2: "a loss still gives rewards plus a
   * retry"). The retry is offered, not forced: "Next" moves on to capsule 2 as after a win.
   */
  canRetry(result: ResultState): boolean {
    return result.setup.mode === 'tutorial' && result.input.outcome.winner !== result.input.mySide;
  }

  /**
   * Result screen "Retry". A lost match 1 has not moved the onboarding on, so this is the same as
   * Next. A lost match 2 already paid its rewards and moved on to capsule 2; the retry is one more
   * Short War vs Pip, after which the flow continues at capsule 2.
   */
  retry(): void {
    const r = this.routeSig.peek();
    if (r.id !== 'result' || !this.canRetry(r.result)) return;
    if (this.stepSig.peek() === 'match1') {
      this.next();
      return;
    }
    this.disposeRoute();
    this.startBattle(this.build(this.match2Setup()));
  }

  /** Result screen "Play again": the same kind of match with a new seed. */
  playAgain(): void {
    const r = this.routeSig.peek();
    if (r.id !== 'result') return;
    const s = r.result.setup;
    if (s.mode === 'tutorial') {
      if (s.matchNumber === 1) this.training();
      else {
        this.disposeRoute();
        this.startBattle(this.build(this.match2Setup()));
      }
      return;
    }
    this.quickBattle(s.config.format);
  }

  /**
   * Starts a prepared match (the meta screens' VS → battle, `UiServices.beginBattle`): the setup
   * comes from `matchSetupFor` with meta's opponent.
   */
  startSetup(setup: MatchSetup): BattleHandle {
    this.disposeRoute();
    const battle = this.build(setup);
    this.startBattle(battle);
    return battle;
  }

  /**
   * Replaces the save (meta screen actions: upgrades, plans, settings, claims) and persists it.
   * `immediate` for capsule rolls, upgrades and claims (B8).
   */
  setSave(next: SaveDoc, o: { immediate?: boolean } = {}): void {
    this.saveSig.value = next;
    this.stepSig.value = onboardingStep(next);
    void this.services.saveStore.save(next, o.immediate ? { immediate: true } : undefined);
  }

  watchReplay(replay: ReplayDoc): void {
    this.disposeRoute();
    this.routeSig.value = { id: 'replay', replay };
  }

  home(): void {
    this.showTitle();
  }

  private completeStep(step: OnboardingStep): void {
    const save = this.saveSig.peek();
    const idx = ONBOARDING_STEPS.indexOf(step);
    this.stepSig.value = ONBOARDING_STEPS[Math.min(idx + 1, ONBOARDING_STEPS.length - 1)]!;
    if (save) {
      const next = completeStep(save, step);
      this.saveSig.value = next;
      void this.services.saveStore.save(next);
    }
  }

  private build(setup: MatchSetup): BattleHandle {
    const save = this.saveSig.peek();
    const battle = createBattle(this.services, setup, {
      save,
      createView: this.o.createView,
      scheduler: this.o.scheduler ?? null,
      visibility: this.o.visibility ?? null,
      autopilot: this.o.autopilot ?? false,
      // Quick Battle is a dev route: no adaptive hints.
      hints: setup.mode !== 'skirmish' || save !== null,
    });
    battle.session.onEnd((input, replay) => {
      void this.onMatchEnd(battle, input, replay);
    });
    return battle;
  }

  private async onMatchEnd(battle: BattleHandle, input: MatchResultInput, replay: ReplayDoc): Promise<void> {
    const setup = battle.setup;
    const hints = battle.director.hintsShown();
    let out: Awaited<ReturnType<typeof finishMatch>> = { save: null, rewards: [], onboarding: null };
    try {
      out = await finishMatch(this.services, this.saveSig.peek(), setup, input, replay, hints);
    } catch (e) {
      // The player must never be stuck on a finished battle: show the result without rewards.
      this.services.eventLog.record('error', 'finishMatch', { message: e instanceof Error ? e.message : String(e) });
      console.error(e);
    }
    if (out.save) this.saveSig.value = out.save;
    if (setup.mode === 'tutorial') {
      const step = this.stepSig.peek();
      this.stepSig.value = out.onboarding ?? afterOnboardingMatch(step, input.outcome.winner === input.mySide);
    }
    this.replaysSig.value = this.services.saveStore.loadReplays();
    await (this.o.delay ?? wait)(END_DELAY_MS);
    // The player may have left meanwhile.
    const r = this.routeSig.peek();
    if (r.id !== 'battle' || r.battle !== battle) return;
    // The battle stays on screen, dimmed, behind the result (audit #16); leaving the result disposes it.
    this.routeSig.value = { id: 'result', result: { setup, input, replay, rewards: out.rewards, battle } };
  }

  private disposeRoute(): void {
    this.clearCountdown();
    const r = this.routeSig.peek();
    if (r.id === 'title' || r.id === 'battle') r.battle?.dispose();
    else if (r.id === 'result') r.result.battle?.dispose();
  }

  dispose(): void {
    this.disposeRoute();
  }
}
