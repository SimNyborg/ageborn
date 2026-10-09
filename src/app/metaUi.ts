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
import type { AgeId, ArtProvider, CosmeticKey, OpponentSpec, ReplayDoc, SaveDoc, SkinId } from '@/contracts';
import { ageOrder, baseSkinsOf, cardVisual, sideAgeCards, type HeldVisual } from '@/render';
import type { MetaRules } from '@/meta';
import { isFirstWin, persist, type SaveFile } from '@/save';
import { createRouter, createToastStore, visibleEntries, type DailyDifficulty, type ToastStore, type MatchRequest, type PauseInfo, type Router, type UiServices } from '@/ui/screens';
import type { BattleHandle } from './battle';
import { applySettings } from './boot';
import type { AppController, AppRoute } from './controller';
import { matchSetupFor, type MatchSetup } from './matchSetup';
import { displayName } from './names';
import { homeStep } from './onboarding';
import type { Services } from './services';
import { StoppingCues } from './stopping';
import { lossTip } from './trickle';
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
  /** A promise while the boot art is still loading, else null: a match start waits for it (VS stays up). */
  artReady?: () => Promise<void> | null;
  /**
   * VS is up: warm the art the match will open with (the app passes the art provider's prefetch;
   * `warmMatchArt`). It gets the setup exactly as the battle will be built. A returned promise (the
   * decks' unit sheets loading, G7) keeps VS up until it settles, at most `WARM_WAIT_MS`.
   */
  warm?: (setup: MatchSetup) => Promise<void> | void;
}

/** The longest VS stays up for the decks' unit sheets (G7); the battle's clock waits for the rest. */
export const WARM_WAIT_MS = 8000;

/** The art provider's duck-typed match warm-up (visuals' `VisualsArtProvider.prefetchMatch`). */
type PrefetchMatch = (o: {
  age: AgeId;
  sides: readonly { skins?: Partial<Record<AgeId, SkinId>>; scenes?: Partial<Record<AgeId, CosmeticKey>> }[];
  units?: readonly HeldVisual[];
}) => Promise<void>;

/**
 * Warms a match's opening art while VS is up (review 1): the first age of its format, each side's base
 * skin model of that age (the troop-system skin wins, as in battle), each half's scene of it, and the
 * unit sheets both decks can field in it (G7: unit sheets load per match). Resolves once they are in; a
 * provider without `prefetchMatch` (fakes, tests) does nothing and returns null.
 */
export function warmMatchArt(art: ArtProvider, setup: MatchSetup): Promise<void> | null {
  const prefetch = (art as ArtProvider & { prefetchMatch?: PrefetchMatch }).prefetchMatch;
  const age = ageOrder(setup.config)[0];
  if (typeof prefetch !== 'function' || !age) return null;
  const sides = setup.config.sides.map((sd) => ({ skins: baseSkinsOf(sd) as Partial<Record<AgeId, SkinId>>, ...(sd.look?.scenes ? { scenes: sd.look.scenes } : {}) }));
  const units: HeldVisual[] = [];
  for (const side of [0, 1] as const) {
    for (const card of sideAgeCards(setup.config, side, age)) {
      const v = cardVisual(setup.config, side, card);
      if (v) units.push(v);
    }
  }
  return prefetch.call(art, { age, sides, units }).catch(() => undefined);
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
  /** The save when each battle started (the first-win check). */
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
  // Home shows before the battle art has loaded (perf audit 2026-10-01): a match asked for meanwhile
  // starts once it has, unless the player has left the screen that asked (VS or Home) by then. VS's
  // warm-up of the decks' unit sheets (G7) holds the start the same way, at most `WARM_WAIT_MS`.
  let waitingForArt = false;
  let warming: Promise<void> | null = null;
  const begin = (req: MatchRequest, opponent: OpponentSpec): void => {
    const boot = o.artReady?.() ?? null;
    const gate = boot && warming ? Promise.all([boot, warming]).then(() => undefined) : (boot ?? warming);
    if (!gate) {
      beginNow(req, opponent);
      return;
    }
    if (waitingForArt) return;
    waitingForArt = true;
    const from = router.current.peek();
    void gate.then(() => {
      waitingForArt = false;
      if (router.current.peek() === from) beginNow(req, opponent);
    });
  };
  /** The setup a request builds (the battle's own, and VS's warm-up). */
  const setupFor = (req: MatchRequest, opponent: OpponentSpec) => {
    const built = matchSetupFor(controller.save.peek(), opponent, req.mode, services.content, {
      opponentLabel: displayName(opponent.displayName, services.i18n),
      standardLevels: opponent.standardLevels === true || (req.mode === 'skirmish' && req.options.standardLevels),
    });
    return req.mode === 'warPath' ? { ...built, warPath: { level: req.level, difficulty: req.difficulty } } : built;
  };
  /** VS is up: the art the battle opens with starts loading now (review 1); a failure never blocks the match. */
  const warm = (req: MatchRequest, opponent: OpponentSpec): void => {
    if (!o.warm || req.mode === 'tutorial') return;
    try {
      const p = o.warm(setupFor(req, opponent));
      if (!p) return;
      let timer: ReturnType<typeof setTimeout> | null = null;
      const capped: Promise<void> = Promise.race([p, new Promise<void>((resolve) => (timer = setTimeout(resolve, WARM_WAIT_MS)))]).then(() => {
        if (timer !== null) clearTimeout(timer);
        if (warming === capped) warming = null;
      });
      warming = capped;
    } catch {
      /* the battle loads its art itself */
    }
  };
  const beginNow = (req: MatchRequest, opponent: OpponentSpec): void => {
    if (req.mode === 'tutorial') {
      // Match 2 from Home's Battle button (owner feedback 2026-09-28): the app builds it and keeps
      // its onboarding battle, result and capsule 2 screens, so the meta stack goes back to Home.
      router.reset({ id: 'home' });
      if (!controller.startOnboardingMatch()) controller.showTitle();
      return;
    }
    const s = controller.save.peek();
    const setup = setupFor(req, opponent);
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
      warm,
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
      const card = cues.onResult(
        {
          mode: input.mode,
          won,
          lost: input.outcome.winner !== null && !won,
          lossStreak: after?.lossStreak ?? 0,
          // A15.6 wrap: this match claimed a Sundial Capsule (kind `win`) and left the Sundial empty.
          claimedLastSundial:
            !!after &&
            after.capsules.charges + after.capsules.freeCapsulesLeft === 0 &&
            r.result.rewards.some((x) => x.kind === 'capsule' && after.capsules.pending.some((p) => p.id === x.capsuleId && p.kind === 'win')),
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
          // A9.2 / A16.6: the missing Anti-heavy card, else the wave tip after a loss where the trickle detector fired.
          ...resultTip(r.result.battle ? lossTip({ won: input.outcome.winner === input.mySide, draw: input.outcome.winner === null, trickled: r.result.battle.trickle.fired, heavyGap: r.result.battle.heavyGap.gap }) : null),
          card,
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

/** The Result route's tip fields: the i18n key and, for the Anti-heavy tip, the card and age ids to name. */
function resultTip(tip: { key: string; card?: string; age?: string } | null): { tipKey: string | null; tipCard?: string; tipAge?: string } {
  if (!tip) return { tipKey: null };
  return { tipKey: tip.key, ...(tip.card ? { tipCard: tip.card } : {}), ...(tip.age ? { tipAge: tip.age } : {}) };
}
