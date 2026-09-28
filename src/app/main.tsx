/**
 * Entry point (DESIGN B11). `?dev=1` shows the dev page list (src/dev/router.tsx); every other URL
 * boots the game: services, save, settings, platform, Pixi and the Stone/Medieval bake, audio unlock
 * on the first gesture, then the title with the next onboarding match behind one Play button.
 *
 * URL flags:
 * - `?dev=1&autopilot=1`: boots the game with the dev autopilot playing the player's side and
 *   presses Play (B13 e2e step 2). `window.__agebornDev` exposes a fast-forward for e2e tests.
 * - `?dev=1&game=1`: boots the game without the autopilot, with `window.__agebornDev`.
 * - `?quick=short|standard|full`: the Quick Battle dev route (C3 Checkpoint A).
 * - `?svc=fake`, `?sim=fake`, `?art=placeholder` ...: service overrides (services.ts, B5).
 */
import { render } from 'preact';
import type { FormatId, Sim } from '@/contracts';
import { DevRouter, isDevMode } from '@/dev/router';
import { BattleView, DEFAULT_VIEW_SETTINGS, detectMobile, type ViewSettings } from '@/render';
import { boot, bootFlags, validateContentInDev } from './boot';
import { AppController } from './controller';
import type { KeyValueStore } from './eventLog';
import { createPixiHost } from './pixiHost';
import { documentVisibility, type SessionView } from './session';
import { AppRoot } from './ui/AppRoot';
import type { AppUi } from './ui/context';

const QUICK_FORMATS: readonly FormatId[] = ['short', 'standard', 'full'];

/** localStorage, or null when the browser blocks it (private mode, sandboxed iframes). */
function safeStorage(): KeyValueStore | null {
  try {
    const s = window.localStorage;
    const probe = '__ageborn_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

function idle(task: () => void): void {
  const ric = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
  if (ric) ric(task);
  else setTimeout(task, 200);
}

async function start(root: HTMLElement): Promise<void> {
  const search = window.location.search;
  const q = new URLSearchParams(search);
  const canvasHost = document.createElement('div');
  canvasHost.style.cssText = 'position:absolute;inset:0';
  const uiHost = document.createElement('div');
  uiHost.style.cssText = 'position:absolute;inset:0';
  root.append(canvasHost, uiHost);

  const isMobile = detectMobile();
  const dpr = window.devicePixelRatio || 1;
  const booted = await boot({
    search,
    storage: safeStorage(),
    initPixi: () => createPixiHost(canvasHost, { webgpu: q.get('gpu') === 'webgpu' }),
    gestureTarget: document,
    idle,
    devicePixelRatio: dpr,
    isMobile,
    ...(import.meta.env.DEV ? { warn: (m: string) => console.warn(m) } : {}),
  });
  validateContentInDev();
  const { services, art, flags } = booted;
  const pixi = booted.pixi!;
  const views = new Map<Sim, BattleView>();
  const saved = booted.save?.settings;
  const settings: ViewSettings = saved
    ? {
        graphics: saved.graphics,
        reduceMotion: saved.reduceMotion,
        shake: saved.shake,
        hitstop: saved.hitstop,
        damageNumbers: saved.damageNumbers,
        teamPreset: saved.teamPreset,
        mutedEmotes: saved.mutedEmotes,
      }
    : DEFAULT_VIEW_SETTINGS;
  const arenas = (services.content as { arenas?: { list?: { id: string }[] } | null }).arenas;
  const arena = arenas?.list?.[booted.save?.arenaIndex ?? 0]?.id ?? 'tar_pits';

  const createView = (sim: Sim, mySide: 0 | 1 = 0): SessionView => {
    const view = new BattleView({
      sim,
      art,
      audio: services.audio,
      mySide,
      settings,
      isMobile,
      arena,
      onPresetChange: () => pixi.setResolution(view.resolution(dpr)),
    });
    pixi.setResolution(view.resolution(dpr));
    const detach = pixi.mount(view.root, (w, h) => view.resize(w, h));
    const detachInput = view.attachInput(pixi.app.canvas);
    views.set(sim, view);
    return {
      onEvents: (e) => view.onEvents(e),
      render: (a, f) => view.render(a, f),
      get simFrozen() {
        return view.simFrozen;
      },
      setSpeed: (s) => view.setSpeed(s),
      setPaused: (p) => view.setPaused(p),
      destroy: () => {
        detachInput();
        detach();
        views.delete(sim);
        view.destroy();
      },
    };
  };

  const controller = new AppController(services, {
    save: booted.save,
    createView: (sim) => createView(sim, 0),
    scheduler: pixi.scheduler,
    visibility: documentVisibility(),
    autopilot: flags.autopilot,
  });
  const ui: AppUi = {
    controller,
    services,
    art,
    viewOf: (sim) => views.get(sim),
    createView,
    scheduler: pixi.scheduler,
    portrait: (card, foil, size) => art.portrait({ card, foil, size, side: 0 }),
    t: (key, params) => services.i18n.t(key, params),
  };

  const quick = q.get('quick');
  if (quick !== null) controller.quickBattle((QUICK_FORMATS as readonly string[]).includes(quick) ? (quick as FormatId) : 'short');
  else controller.showTitle();
  if (flags.autopilot && controller.route.peek().id === 'title') controller.play();
  if (q.get('dev') === '1') {
    (window as Window & { __agebornDev?: unknown }).__agebornDev = {
      controller,
      /** Runs up to `ticks` sim ticks of the battle on screen at once (B13 e2e dev fast-forward). */
      fastForward(ticks: number): number {
        const r = controller.route.peek();
        return r.id === 'battle' ? r.battle.session.fastForward(ticks) : 0;
      },
    };
  }
  render(<AppRoot ui={ui} />, uiHost);
}

const root = document.getElementById('app');
if (!root) throw new Error('#app element missing');

/** `?dev=1` shows the dev page list, unless the game is asked for (`&autopilot=1` or `&game=1`). */
const devGame = bootFlags(window.location.search).autopilot || new URLSearchParams(window.location.search).get('game') === '1';
if (isDevMode() && !devGame) {
  render(<DevRouter />, root);
} else {
  void start(root);
}
