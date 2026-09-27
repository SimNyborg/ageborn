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
import { quickBattle, tutorialMatch1, tutorialMatch2, type MatchSetup } from './matchSetup';
import { ONBOARDING_STEPS, afterOnboardingMatch, completeStep, onboardingStep, type OnboardingStep } from './onboarding';
import type { Services } from './services';
import type { FrameScheduler, SessionView, VisibilitySource } from './session';

export interface ResultState {
  setup: MatchSetup;
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

  /** The onboarding match for the current step, or null once onboarding is done. */
  onboardingSetup(): MatchSetup | null {
    const save = this.saveSig.peek();
    const content = this.services.content;
    switch (this.stepSig.peek()) {
      case 'match1':
        return tutorialMatch1(save, content, this.t('general.grogg.name'));
      case 'match2':
        return tutorialMatch2(save, content, this.t('general.pip.name'), this.nextSeed());
      default:
        return null;
    }
  }

  /** Shows the title: the next onboarding match is built and waits, rendered, behind Play. */
  showTitle(): void {
    this.disposeRoute();
    const setup = this.onboardingSetup();
    this.routeSig.value = { id: 'title', battle: setup ? this.build(setup) : null };
  }

  /** Play: starts the waiting onboarding match (one tap into match 1, A8). */
  play(): void {
    const r = this.routeSig.peek();
    const battle = r.id === 'title' ? r.battle : null;
    if (!battle) return;
    this.routeSig.value = { id: 'battle', battle };
    battle.session.start();
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
    });
    const battle = this.build(setup);
    this.routeSig.value = { id: 'battle', battle };
    battle.session.start();
    return battle;
  }

  /** Leaves a running battle without a result (Quit on the pause screen). */
  quit(): void {
    this.showTitle();
  }

  /** Result screen "Next": the capsule step (Phase 2: WP10's show), then the next match or the title. */
  next(): void {
    const r = this.routeSig.peek();
    if (r.id === 'result' && r.result.setup.mode === 'tutorial') {
      // No capsules without meta (Phase 1): the capsule step completes at once.
      const step = this.stepSig.peek();
      if ((step === 'capsule1' || step === 'capsule2') && !this.services.meta) this.completeStep(step);
    }
    this.showTitle();
    if (this.stepSig.peek() !== 'home') this.play();
  }

  /** Result screen "Play again": the same kind of match with a new seed. */
  playAgain(): void {
    const r = this.routeSig.peek();
    if (r.id !== 'result') return;
    const s = r.result.setup;
    if (s.mode === 'tutorial') {
      this.showTitle();
      this.play();
      return;
    }
    this.quickBattle(s.config.format);
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
    const out = await finishMatch(this.services, this.saveSig.peek(), setup, input, replay, hints);
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
    this.routeSig.value = { id: 'result', result: { setup, input, replay, rewards: out.rewards } };
    battle.dispose();
  }

  private disposeRoute(): void {
    const r = this.routeSig.peek();
    if (r.id === 'title' || r.id === 'battle') r.battle?.dispose();
  }

  dispose(): void {
    this.disposeRoute();
  }
}
