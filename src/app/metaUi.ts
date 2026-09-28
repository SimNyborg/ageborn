/**
 * Glue between the app controller (battles, results, replays) and WP9's meta screens (DESIGN A9
 * flow, B11 Router; docs/requests/wp9-app-wiring.md).
 *
 * After onboarding, the start screen is WP9's Home. The meta router is the source of truth for the
 * meta screens; the controller stays the source of truth for the battle, its result and replays.
 * Two small effects keep them in step:
 *
 * - controller → router: a starting battle shows the `battle` slot, a finished one the WP9 Result
 *   (rewards staged, tap to skip), a pause the WP9 Pause overlay; back on the title, Home.
 * - router → controller: leaving the Result (Home, Next battle → VS) disposes the finished battle;
 *   a battle that is no longer on the stack is quit.
 *
 * The onboarding matches (A8) keep the app's own battle and result screens; match 1 also keeps
 * the title. Match 2 starts from Home (owner feedback 2026-09-28).
 */
import { computed, effect, signal, type ReadonlySignal } from '@preact/signals';
import type { OpponentSpec, ReplayDoc, SaveDoc } from '@/contracts';
import type { MetaRules } from '@/meta';
import { isFirstWin, persist, type SaveFile } from '@/save';
import { createRouter, createToastStore, visibleEntries, type DailyDifficulty, type ToastStore, type MatchRequest, type PauseInfo, type Router, type UiServices } from '@/ui/screens';
import type { BattleHandle } from './battle';
import { applySettings } from './boot';
import type { AppController, AppRoute } from './controller';
import { matchSetupFor } from './matchSetup';
import { displayName } from './names';
import { homeStep } from './onboarding';
import type { Services } from './services';
import { StoppingCues } from './stopping';
import { lossTipKey } from './trickle';
import { createUiServices } from './uiServices';

export interface MetaUi {
  router: Router;
  /** The meta screens' toast host store (save problems show here too). */
  toasts: ToastStore;
  /** Session counters for the stopping cards (A15.6). */
  cues: StoppingCues;
  save: ReadonlySignal<SaveDoc>;
  services: UiServices;
  /** The match request that started a battle ("Next battle" on its Result). */
  requestOf(battle: BattleHandle): MatchRequest | null;
  /** True when this route is drawn by the meta screens (not the onboarding screens). */
  owns(route: AppRoute, step: string): boolean;
  /**
   * A save problem to show as a banner where the toast host is not drawn (the title during
   * onboarding, B8 load order step 5): the load notice ("Save could not be read. Import a
   * backup?") or an ongoing write problem. Null when there is nothing to say.
   */
  notice: ReadonlySignal<{ messageKey: string; kind?: string } | null>;
  dismissNotice(): void;
  /** Opens Settings (import, For parents, About, break reminder) from the title (A15.6, B8). */
  openSettings(): void;
  dispose(): void;
}

export interface MetaUiOptions {
  controller: AppController;
  services: Services;
  meta: MetaRules;
  download?: (file: SaveFile) => void;
  /** Opens the capsule show (WP10) for pending capsules; the default routes to the `capsule` slot. */
  openCapsules?: (ids: string[]) => void;
  openWardrobe?: (id: string) => void;
  /** Session counters for the stopping cards (A15.6); tests pass their own. */
  cues?: StoppingCues;
}

/** Pause overlay contents from the battle on screen (A9 #6). */
export function pauseInfo(battle: BattleHandle): PauseInfo {
  const hud = battle.session.hud.peek();
  const format = battle.setup.config.content.formats[battle.setup.config.format];
  return {
    mode: battle.setup.mode,
    scouted: [...hud.foe.scouted],
    clockMs: hud.clockMs,
    canRetreat: hud.canRetreat,
    retreatAfterMs: battle.setup.mode === 'tutorial' ? null : (format?.retreatAfterMs ?? null),
  };
}

/** The local date of the Daily Challenge day, which starts at 04:00 (A9.1): `YYYY-MM-DD`. */
export function dailyDateKey(nowMs: number, resetHour = 4): string {
  const d = new Date(nowMs - resetHour * 3_600_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The Daily difficulty of a request, or the one whose tier the opponent has (meta's default). */
export function dailyDifficultyOf(req: MatchRequest | null, tier: number, difficulties: Record<DailyDifficulty, number> | undefined): DailyDifficulty {
  if (req?.mode === 'daily' && req.difficulty) return req.difficulty;
  const list: DailyDifficulty[] = ['recruit', 'veteran', 'warlord'];
  if (!difficulties) return 'veteran';
  return list.reduce((best, d) => (Math.abs(difficulties[d] - tier) < Math.abs(difficulties[best] - tier) ? d : best), 'veteran' as DailyDifficulty);
}

export function createMetaUi(o: MetaUiOptions): MetaUi {
  const { controller, services, meta } = o;
  const router = createRouter({ id: 'home' });
  const requests = new WeakMap<BattleHandle, MatchRequest>();
  /** The save when each battle started (the wrap card compares charges and cards). */
  const saveAtStart = new WeakMap<BattleHandle, SaveDoc | null>();
  const toasts = createToastStore();
  // B8: problems the player must see (quota, blocked storage, an unreadable save).
  const store = services.saveStore as typeof services.saveStore & {
    onProblem?: (cb: (n: { messageKey: string; ongoing?: boolean } | null) => void) => () => void;
    problem?: { messageKey: string; ongoing?: boolean } | null;
    loadReport?: { notice?: { messageKey: string } | null } | null;
  };
  const noticeSig = signal<{ messageKey: string; kind?: string } | null>(null);
  const notify = (n: { messageKey: string; ongoing?: boolean; kind?: string } | null | undefined): void => {
    if (n) {
      toasts.show(services.i18n.t(n.messageKey), { tone: 'bad', ms: n.ongoing ? 8000 : 5000 });
      noticeSig.value = { messageKey: n.messageKey, ...(n.kind ? { kind: n.kind } : {}) };
    } else if (noticeSig.peek() && noticeSig.peek()!.kind !== 'unreadable' && noticeSig.peek()!.kind !== 'recovered') {
      // An ongoing problem was cleared by a successful write; the one-off load notices stay until dismissed.
      noticeSig.value = null;
    }
  };
  const stopProblems = typeof store.onProblem === 'function' ? store.onProblem(notify) : () => undefined;
  notify(store.problem ?? store.loadReport?.notice ?? null);
  /** Settings opened from the title (onboarding has no Home yet). */
  const titleSettings = signal(false);
  const cardsOwned = (): number => Object.keys(controller.save.peek()?.collection ?? {}).length;
  const cues = o.cues ?? new StoppingCues(cardsOwned(), { now: () => services.clock.now(), log: services.eventLog });
  // The meta screens only mount once a save exists (meta makes one at boot).
  const save = computed(() => controller.save.value as SaveDoc);

  const current = (): BattleHandle | null => {
    const r = controller.route.peek();
    return r.id === 'battle' ? r.battle : null;
  };

  let pending: MatchRequest | null = null;
  const begin = (req: MatchRequest, opponent: OpponentSpec): void => {
    if (req.mode === 'tutorial') {
      // Match 2 from Home's Battle button (owner feedback 2026-09-28): the app builds it and keeps
      // its onboarding battle, result and capsule 2 screens, so the meta stack goes back to Home.
      router.reset({ id: 'home' });
      if (!controller.startOnboardingMatch()) controller.showTitle();
      return;
    }
    const s = controller.save.peek();
    const setup = matchSetupFor(s, opponent, req.mode, services.content, {
      opponentLabel: displayName(opponent.displayName, services.i18n),
      standardLevels: opponent.standardLevels === true || (req.mode === 'skirmish' && req.options.standardLevels),
    });
    // The request is known before the route changes, so the route effect already sees the match
    // as one of the meta screens'.
    pending = req;
    let battle: BattleHandle;
    try {
      battle = controller.startSetup(setup);
    } finally {
      pending = null;
    }
    requests.set(battle, req);
    if (req.mode === 'skirmish' && req.speed !== 1) battle.session.setSpeed(req.speed);
    else if (s && s.settings.defaultSpeed !== 1) battle.session.setSpeed(s.settings.defaultSpeed);
  };

  const uiServices = createUiServices({
    services,
    meta,
    save,
    commit: (next, co) => controller.setSave(next, co),
    router,
    ...(o.download ? { download: o.download } : {}),
    flow: {
      begin,
      resume: () => current()?.session.resume(),
      retreat: () => {
        const b = current();
        if (!b) return;
        b.session.resume();
        b.session.issue({ t: 'retreat', side: 0 });
      },
      quitSkirmish: () => {
        router.reset({ id: 'home' });
        controller.quit();
      },
      watchReplay: (r: ReplayDoc) => controller.watchReplay(r),
      openCapsules: o.openCapsules ?? ((ids) => router.go({ id: 'capsule', ids })),
      openWardrobe: o.openWardrobe ?? ((id) => router.go({ id: 'capsule', ids: [id] })),
      restart: () => controller.showTitle(),
      pickAge: (choices) => controller.agePicker.ask(choices),
    },
  });

  // The meta screens draw Home and every match started from them (VS → battle → Result). The
  // onboarding matches, the training match and the `?quick=` dev route keep the app's own screens.
  // Home is the start screen from right after capsule 1 (owner feedback 2026-09-28).
  const owns = (route: AppRoute, step: string): boolean => {
    switch (route.id) {
      case 'title':
        return homeStep(step) || titleSettings.value;
      case 'battle':
        if (pending && !requests.has(route.battle)) requests.set(route.battle, pending);
        return requests.has(route.battle);
      case 'result':
        return !!route.result.battle && requests.has(route.result.battle);
      default:
        return false;
    }
  };

  const top = () => router.current.peek();
  const onStack = (id: string): boolean => router.stack.peek().some((e) => e.route.id === id);

  // controller → router
  let shownResult: unknown = null;
  const stopRoute = effect(() => {
    const r = controller.route.value;
    const step = controller.step.value;
    if (!owns(r, step)) return;
    if (r.id === 'battle') {
      if (!saveAtStart.has(r.battle)) saveAtStart.set(r.battle, controller.save.peek());
      const t = top();
      if (t.id !== 'battle' && t.id !== 'pause' && t.id !== 'settings') {
        router.reset({ id: 'home' });
        router.go({ id: 'battle', request: requests.get(r.battle) ?? { mode: r.battle.setup.mode as 'ladder', format: r.battle.setup.config.format }, opponent: r.battle.setup.opponent });
      }
    } else if (r.id === 'result') {
      if (shownResult === r.result) return;
      shownResult = r.result;
      const replays = services.saveStore.loadReplays();
      const newest = replays[replays.length - 1];
      const kept = !!newest && newest.seed === r.result.replay.seed && newest.finalHash === r.result.replay.finalHash;
      const input = r.result.input;
      const request = r.result.battle ? (requests.get(r.result.battle) ?? null) : null;
      const after = controller.save.peek();
      const won = input.outcome.winner === input.mySide;
      // B8: ask the browser to keep the storage once the player has something to lose.
      const started = r.result.battle ? saveAtStart.get(r.result.battle) : undefined;
      if (after && isFirstWin(started ?? null, after)) void persist();
      const newestFirst = [...replays].reverse();
      const before = r.result.battle ? saveAtStart.get(r.result.battle) : undefined;
      const card = cues.onResult(
        {
          mode: input.mode,
          won,
          lost: input.outcome.winner !== null && !won,
          lossStreak: after?.lossStreak ?? 0,
          usedLastCharge:
            !!before && before.capsules.charges + before.capsules.freeCapsulesLeft > 0 && !!after && after.capsules.charges + after.capsules.freeCapsulesLeft === 0,
          breakReminder: after?.settings.breakReminder !== false,
          collectionSize: cardsOwned(),
          baseDamage: input.stats.baseDamage,
          replayHash: kept ? r.result.replay.finalHash : null,
        },
        (hash) => {
          const i = newestFirst.findIndex((x) => x.finalHash === hash);
          return i >= 0 ? i : null;
        },
      );
      const endedHour = new Date(services.clock.now()).getHours();
      const now = services.clock.now();
      const challenge = (services.content as { dailyModifiers?: { challenge?: { difficulties?: Record<DailyDifficulty, number>; resetHour?: number } } }).dailyModifiers?.challenge;
      const modifier = input.mode === 'daily' ? meta.dailyModifier(services.content, services.clock) : null;
      const modName = modifier ? services.i18n.t(`modifier.${modifier}.name`) : '';
      router.reset({ id: 'home' });
      router.go({
        id: 'result',
        info: {
          input,
          rewards: r.result.rewards,
          replayIndex: kept ? 0 : null,
          request,
          // A16.6: the wave tip after a loss where the trickle detector fired.
          tipKey: r.result.battle ? lossTipKey({ won: input.outcome.winner === input.mySide, draw: input.outcome.winner === null, trickled: r.result.battle.trickle.fired }) : null,
          card,
          endedHour,
          daily:
            input.mode === 'daily'
              ? {
                  dateKey: dailyDateKey(now, challenge?.resetHour ?? 4),
                  modifier: modName,
                  difficulty: dailyDifficultyOf(request, input.opponent.tier, challenge?.difficulties),
                }
              : null,
        },
      });
    } else if (r.id === 'title') {
      const t = top().id;
      if (t === 'battle' || t === 'pause' || t === 'result' || onStack('battle')) router.reset({ id: 'home' });
    }
  });

  // Settings apply at once (A9 #15): volumes and language now; graphics at the next battle view.
  let appliedSettings: SaveDoc['settings'] | null = controller.save.peek()?.settings ?? null;
  const stopSettings = effect(() => {
    const st = controller.save.value?.settings;
    if (!st || st === appliedSettings) return;
    appliedSettings = st;
    applySettings(services, st);
  });

  // Settings opened from the title: back (or an import or reset, which reset the router to Home)
  // returns to the title, rebuilt for the save's onboarding step.
  const stopTitleSettings = effect(() => {
    const base = visibleEntries(router.stack.value).base.route.id;
    if (!titleSettings.value || base !== 'home') return;
    titleSettings.value = false;
    controller.showTitle();
  });

  // router → controller
  const stopStack = effect(() => {
    void router.stack.value;
    const r = controller.route.peek();
    if (!owns(r, controller.step.peek())) return;
    if (r.id === 'result' && !onStack('result')) controller.showTitle();
    else if (r.id === 'battle' && !onStack('battle')) controller.quit();
  });

  // Pause: the session's pause (button, Escape, hidden tab) opens WP9's Pause overlay.
  const stopPause = effect(() => {
    const r = controller.route.value;
    if (r.id !== 'battle' || !owns(r, controller.step.peek())) return;
    const status = r.battle.session.status.value;
    const t = top();
    if (status === 'paused' && t.id === 'battle') router.go({ id: 'pause', info: pauseInfo(r.battle) });
    else if (status !== 'paused' && (t.id === 'pause' || (t.id === 'settings' && onStack('pause')))) {
      while (router.current.peek().id !== 'battle' && router.back()) {
        /* pop the overlays */
      }
    }
  });

  return {
    router,
    toasts,
    cues,
    save,
    services: uiServices,
    requestOf: (b) => requests.get(b) ?? null,
    owns,
    notice: noticeSig,
    dismissNotice() {
      noticeSig.value = null;
    },
    openSettings() {
      router.reset({ id: 'home' });
      router.go({ id: 'settings' });
      titleSettings.value = true;
    },
    dispose() {
      stopTitleSettings();
      stopRoute();
      stopStack();
      stopPause();
      stopSettings();
      stopProblems();
    },
  };
}
