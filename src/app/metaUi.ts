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
 * The onboarding matches (A8) keep the app's own title, battle and result screens.
 */
import { computed, effect, type ReadonlySignal } from '@preact/signals';
import type { OpponentSpec, ReplayDoc, SaveDoc } from '@/contracts';
import type { MetaRules } from '@/meta';
import type { SaveFile } from '@/save';
import { createRouter, type MatchRequest, type PauseInfo, type Router, type UiServices } from '@/ui/screens';
import type { BattleHandle } from './battle';
import type { AppController, AppRoute } from './controller';
import { matchSetupFor } from './matchSetup';
import { displayName } from './names';
import type { Services } from './services';
import { createUiServices } from './uiServices';

export interface MetaUi {
  router: Router;
  save: ReadonlySignal<SaveDoc>;
  services: UiServices;
  /** The match request that started a battle ("Next battle" on its Result). */
  requestOf(battle: BattleHandle): MatchRequest | null;
  /** True when this route is drawn by the meta screens (not the onboarding screens). */
  owns(route: AppRoute, step: string): boolean;
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

export function createMetaUi(o: MetaUiOptions): MetaUi {
  const { controller, services, meta } = o;
  const router = createRouter({ id: 'home' });
  const requests = new WeakMap<BattleHandle, MatchRequest>();
  // The meta screens only mount once a save exists (meta makes one at boot).
  const save = computed(() => controller.save.value as SaveDoc);

  const current = (): BattleHandle | null => {
    const r = controller.route.peek();
    return r.id === 'battle' ? r.battle : null;
  };

  const begin = (req: MatchRequest, opponent: OpponentSpec): void => {
    if (req.mode === 'tutorial') {
      controller.showTitle();
      controller.play();
      return;
    }
    const s = controller.save.peek();
    const setup = matchSetupFor(s, opponent, req.mode, services.content, {
      opponentLabel: displayName(opponent.displayName, services.i18n),
      standardLevels: opponent.standardLevels === true || (req.mode === 'skirmish' && req.options.standardLevels),
    });
    const battle = controller.startSetup(setup);
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
    },
  });

  const owns = (route: AppRoute, step: string): boolean => {
    switch (route.id) {
      case 'title':
        return step === 'home';
      case 'battle':
        return route.battle.setup.mode !== 'tutorial';
      case 'result':
        return route.result.setup.mode !== 'tutorial';
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
      router.reset({ id: 'home' });
      router.go({
        id: 'result',
        info: {
          input: r.result.input,
          rewards: r.result.rewards,
          replayIndex: kept ? 0 : null,
          request: r.result.battle ? (requests.get(r.result.battle) ?? null) : null,
        },
      });
    } else if (r.id === 'title') {
      const t = top().id;
      if (t === 'battle' || t === 'pause' || t === 'result' || onStack('battle')) router.reset({ id: 'home' });
    }
  });

  // router → controller
  const stopStack = effect(() => {
    router.stack.value;
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
    save,
    services: uiServices,
    requestOf: (b) => requests.get(b) ?? null,
    owns,
    dispose() {
      stopRoute();
      stopStack();
      stopPause();
    },
  };
}
