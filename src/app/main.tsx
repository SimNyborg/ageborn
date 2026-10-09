/**
 * Entry point (DESIGN B11). `?dev=1` shows the dev page list (src/dev/router.tsx); every other URL
 * boots the game: services, save, settings, platform, Pixi and the Stone/Bronze bake, audio unlock
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
import { textureMemory } from '@/visuals/textureMemory';
import { boot, bootFlags, validateContentInDev } from './boot';
import { AppController, ART_WAIT_MS } from './controller';
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
  // The UI layer never takes pointer events itself: taps on the lane must reach the canvas (mount
  // taps, pinch zoom, double tap). Only its screens' panels and buttons opt back in (app.css).
  uiHost.style.cssText = 'position:absolute;inset:0;pointer-events:none';
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
  let artLoaded = false;
  void booted.artReady.then(() => (artLoaded = true));
  const pixi = booted.pixi!;
  const views = new Map<Sim, BattleView>();
  // The view reads the settings when a battle starts, so Settings changes apply to the next battle.
  const viewSettings = (): ViewSettings => {
    const saved = controller.save.peek()?.settings ?? booted.save?.settings;
    return saved
      ? {
          graphics: saved.graphics,
          reduceMotion: saved.reduceMotion,
          shake: saved.shake,
          hitstop: saved.hitstop,
          damageNumbers: saved.damageNumbers,
          teamPreset: saved.teamPreset,
          mutedEmotes: saved.mutedEmotes,
          autoCamera: saved.autoCamera ?? true,
          edgeScroll: saved.edgeScroll ?? true,
        }
      : DEFAULT_VIEW_SETTINGS;
  };
  const arenas = (services.content as { arenas?: { list?: { id: string }[] } | null }).arenas;
  const arena = arenas?.list?.[booted.save?.arenaIndex ?? 0]?.id ?? 'tar_pits';

  const createView = (sim: Sim, mySide: 0 | 1 = 0, o: { spectator?: boolean } = {}): SessionView => {
    const view = new BattleView({
      sim,
      art,
      audio: services.audio,
      mySide,
      spectator: o.spectator === true,
      settings: viewSettings(),
      isMobile,
      arena,
      mountLabel: (cost) => services.i18n.t('app.newSlot', { cost }),
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
      artReady: () => view.artReady(),
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
    countdown: true,
    homeScreen: true,
  });
  const ui: AppUi = {
    controller,
    services,
    art,
    viewOf: (sim) => views.get(sim),
    createView,
    scheduler: pixi.scheduler,
    pixi: pixi.app,
    storage: safeStorage(),
    portrait: (card, foil, size, plate) => {
      // The provider takes the optional `plate` flag (docs/requests/wp4-portrait-plate-contract.md).
      const req: Parameters<typeof art.portrait>[0] & { plate?: boolean } = { card, foil, size, side: 0, ...(plate === false ? { plate: false } : {}) };
      return art.portrait(req);
    },
    t: (key, params) => services.i18n.t(key, params),
    artReady: () => (artLoaded ? null : booted.artReady),
    download: (file) => {
      const url = URL.createObjectURL(new Blob([file.text], { type: file.mime }));
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.rel = 'noopener';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    },
  };

  const quick = q.get('quick');
  if (quick !== null) controller.quickBattle((QUICK_FORMATS as readonly string[]).includes(quick) ? (quick as FormatId) : 'short');
  else controller.showTitle();
  if (flags.autopilot && controller.route.peek().id === 'title') {
    // The first launch opens the War Path map (ui-plan 6.4): the autopilot starts the due onboarding
    // match itself, as the map's Play would.
    const r = controller.route.peek();
    if (r.id === 'title' && r.battle) controller.play();
    else controller.startOnboardingMatch();
  }
  if (q.get('dev') === '1') {
    (window as Window & { __agebornDev?: unknown }).__agebornDev = {
      controller,
      /**
       * Runs up to `ticks` sim ticks of the battle on screen at once (B13 e2e dev fast-forward). A battle
       * still loading its decks' unit sheets (G7) is waited for first, as its own start would (at most
       * `ART_WAIT_MS`), so the sheets are in before the first units appear; then the countdown is skipped.
       */
      async fastForward(ticks: number): Promise<number> {
        const r = controller.route.peek();
        if (r.id !== 'battle') return 0;
        const art = r.battle.session.artReady();
        if (art) await Promise.race([art, new Promise<void>((resolve) => setTimeout(resolve, ART_WAIT_MS))]);
        const now = controller.route.peek();
        if (now.id !== 'battle' || now.battle !== r.battle) return 0;
        controller.startNow();
        return r.battle.session.fastForward(ticks);
      },
      /** The battle view on screen (e2e camera checks: minimap snapshot, camera stats). */
      view(): BattleView | null {
        const r = controller.route.peek();
        const battle = r.id === 'battle' || r.id === 'title' ? r.battle : null;
        return battle ? (views.get(battle.session.sim) ?? null) : null;
      },
      /**
       * Decoded image memory now (G7, Safari memory): textures on the GPU, decoded copies on the CPU and
       * the unit sheets loaded (`visuals/textureMemory.ts`; the e2e memory budget reads it).
       */
      memory(o: { detail?: number } = {}): unknown {
        const sheets = (art as { atlas?: { sheetStats?: () => unknown } }).atlas?.sheetStats?.() ?? null;
        const fallbacks = (art as { fallbacks?: { units: number; last: string } }).fallbacks ?? null;
        return { ...textureMemory(pixi.app.renderer, o), sheets, fallbacks };
      },
      /** Client (page) point of your turret mount `i` on the battle on screen, for e2e taps. */
      mountPoint(i: number): { x: number; y: number } | null {
        const r = controller.route.peek();
        const battle = r.id === 'battle' || r.id === 'title' ? r.battle : null;
        const view = battle ? views.get(battle.session.sim) : undefined;
        const p = view?.mountScreenPoint(i);
        if (!p) return null;
        const box = pixi.app.canvas.getBoundingClientRect();
        return { x: box.left + p.x, y: box.top + p.y };
      },
    };
  }
  await stylesReady();
  render(<AppRoot ui={ui} />, uiHost);
  hideSplash();
}

/**
 * Resolves once the built stylesheets have applied (`vite.config.ts` loads them without blocking the
 * splash). In the dev server there are none to wait for. Gives up after 15 s rather than never drawing.
 */
function stylesReady(): Promise<void> {
  const links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[data-style]'));
  if (links.length === 0) return Promise.resolve();
  return new Promise((resolve) => {
    const t0 = performance.now();
    const check = (): void => {
      if (links.every((l) => l.rel === 'stylesheet' && l.sheet !== null) || performance.now() - t0 > 15_000) resolve();
      else setTimeout(check, 16);
    };
    check();
  });
}

/** Fades out the static splash of index.html once the first screen has painted (two frames later). */
function hideSplash(): void {
  const el = document.getElementById('splash');
  if (!el) return;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      el.classList.add('is-out');
      setTimeout(() => el.remove(), 400);
    }),
  );
}

const root = document.getElementById('app');
if (!root) throw new Error('#app element missing');

/** `?dev=1` shows the dev page list, unless the game is asked for (`&autopilot=1` or `&game=1`). */
const devGame = bootFlags(window.location.search).autopilot || new URLSearchParams(window.location.search).get('game') === '1';
if (isDevMode() && !devGame) {
  void stylesReady().then(() => {
    render(<DevRouter />, root);
    hideSplash();
  });
} else {
  void start(root).catch((e: unknown) => {
    hideSplash();
    throw e;
  });
}
