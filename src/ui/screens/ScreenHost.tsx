/**
 * The meta UI root (A9). Renders the router stack: the top non-overlay screen plus any overlays
 * above it (Pause over the battle, Settings over Pause). Provides the UI environment and kit
 * contexts, the toast host and the portrait rotate overlay, and handles two keyboard rules:
 * Escape goes back (per screen, see `onEscape`), and focus moves to the new screen's
 * `[data-autofocus]` element (or its title) whenever the top of the stack changes.
 *
 * Screens owned by other packages (boot, battle, capsule show, replay viewer) are rendered by the
 * app through `slots`.
 */
import '../theme.css';
import '../motion.css';
import type { ComponentChildren, ComponentType } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { setHapticsEnabled } from '../components/haptics';
import { PortalContext, UiKitContext, type UiKit } from '../components/kit';
import { RotateOverlay } from '../components/Layout';
import { TabBar, type NavTab } from '../components/Nav';
import { createToastStore, ToastHost, type ToastStore } from '../components/Toasts';
import { runBackHandler } from '../history';
import { TABS, visibleEntries, type Route, type RouteOf, type ScreenId, type TabId } from '../router';
import { CapsulesScreen } from './capsules/CapsulesScreen';
import { CardDetailScreen } from './cardDetail/CardDetailScreen';
import { CollectionScreen } from './collection/CollectionScreen';
import { ConquestScreen } from './conquest/ConquestScreen';
import { CustomizeScreen } from './customize/CustomizeScreen';
import { UiEnvContext, type UiEnv } from './context';
import { HomeScreen } from './home/HomeScreen';
import { ModeSelectScreen } from './modeSelect/ModeSelectScreen';
import { PauseScreen } from './pause/PauseScreen';
import { ProgressScreen } from './progress/ProgressScreen';
import { ProfileScreen } from './profile/ProfileScreen';
import { ResultScreen } from './result/ResultScreen';
import { SettingsScreen } from './settings/SettingsScreen';
import { TrophyRoadScreen } from './trophyRoad/TrophyRoadScreen';
import { VsScreen } from './vs/VsScreen';
import { WarPlanScreen } from './warplan/WarPlanScreen';

type ScreenComponent<K extends ScreenId> = ComponentType<{ route: RouteOf<K> }>;

/** The screens this package renders (A9 numbers 2-4, 6-7, 9-13, 15 and 17). */
export const SCREEN_COMPONENTS: { [K in ScreenId]?: ScreenComponent<K> } = {
  home: HomeScreen,
  modeSelect: ModeSelectScreen,
  vs: VsScreen,
  pause: PauseScreen,
  result: ResultScreen,
  warPlan: WarPlanScreen,
  collection: CollectionScreen,
  cardDetail: CardDetailScreen,
  trophyRoad: TrophyRoadScreen,
  profile: ProfileScreen,
  settings: SettingsScreen,
  conquest: ConquestScreen,
  customize: CustomizeScreen,
  capsules: CapsulesScreen,
  progress: ProgressScreen,
};

export type ScreenSlots = { [K in ScreenId]?: (route: RouteOf<K>) => ComponentChildren };

/**
 * The navigation shell (ui-plan 2.2): the five tabs, their root routes and their badge and lock
 * state. When given, a tab root (the bottom of the active tab's stack) renders with the bottom
 * TabBar; sub-screens and flows hide it. Keys 1-5 switch tabs.
 */
export interface ShellConfig {
  tabs: readonly NavTab[];
  roots: Readonly<Record<TabId, Route>>;
  /** Extra controls in the bottom row right of the tabs (Home's Modes and Play group). */
  bar?: (tab: TabId) => ComponentChildren;
}

export interface ScreenHostProps {
  env: Omit<UiEnv, 'toasts'> & { toasts?: ToastStore };
  /** App-rendered screens (boot, battle, capsule, replay). */
  slots?: ScreenSlots;
  /** The tab shell; without it screens render as before (no bottom tabs). */
  shell?: ShellConfig;
}

/** True when the OS asks for reduced motion (ui-plan 5.6); the setting is the other source. */
function useOsReducedMotion(): boolean {
  const query = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  const [on, setOn] = useState(() => !!query?.matches);
  useEffect(() => {
    if (!query || typeof query.addEventListener !== 'function') return;
    const fn = () => setOn(query.matches);
    query.addEventListener('change', fn);
    return () => query.removeEventListener('change', fn);
  }, []);
  return on;
}

function renderRoute(route: Route, slots: ScreenSlots | undefined): ComponentChildren {
  const Screen = SCREEN_COMPONENTS[route.id] as ComponentType<{ route: Route }> | undefined;
  if (Screen) return <Screen route={route} />;
  const slot = slots?.[route.id] as ((r: Route) => ComponentChildren) | undefined;
  return slot ? slot(route) : null;
}

/**
 * One app back for Escape, the browser back button and the Android gesture (U7): the topmost open
 * sheet closes first, then the screen's own rule ({@link onEscape}). Returns false at the root
 * (Home) and in flows that handle it themselves (battle: the app pauses).
 */
export function handleBack(env: UiEnv): boolean {
  if (runBackHandler()) return true;
  const route = env.router.current.value;
  if (route.id === 'home' || route.id === 'boot' || route.id === 'battle' || route.id === 'capsule' || route.id === 'replay') {
    return route.id === 'home' ? env.router.back() : false;
  }
  onEscape(route, env);
  return true;
}

/** What Escape does on each screen. Screens with their own flow (VS, battle) ignore it. */
export function onEscape(route: Route, env: UiEnv): void {
  switch (route.id) {
    case 'vs':
      // Esc cancels to Home before the countdown ends (ui-plan 2.4 S3).
      env.router.reset({ id: 'home' });
      return;
    case 'home':
    case 'boot':
    case 'battle':
    case 'capsule':
    case 'replay':
      return;
    case 'pause':
      env.router.back();
      env.services.resume();
      return;
    case 'result':
      env.router.reset({ id: 'home' });
      return;
    default:
      env.router.back();
  }
}

export function ScreenHost(p: ScreenHostProps) {
  const toasts = useMemo(() => p.env.toasts ?? createToastStore(), [p.env.toasts]);
  const env: UiEnv = useMemo(() => ({ ...p.env, toasts }), [p.env, toasts]);
  const save = env.save.value;
  const stack = env.router.stack.value;
  const { base, overlays } = visibleEntries(stack);
  const top = stack[stack.length - 1]!;
  const tab = env.router.tab.value;
  // The tab bar shows on a tab root only: hidden in sub-screens and flows (2.2).
  const shellOn = !!p.shell && tab !== null && stack.indexOf(base) === 0;
  // MR-10: the incoming tab slides in from its side.
  const lastTab = useRef<TabId | null>(tab);
  const dir = useRef<'left' | 'right' | null>(null);
  if (lastTab.current !== tab) {
    dir.current = lastTab.current && tab ? (TABS.indexOf(tab) > TABS.indexOf(lastTab.current) ? 'right' : 'left') : null;
    lastTab.current = tab;
  }
  const root = useRef<HTMLDivElement>(null);
  const envRef = useRef(env);
  envRef.current = env;

  const osReduced = useOsReducedMotion();
  const reduceMotion = save.settings.reduceMotion || osReduced;
  const kit: UiKit = useMemo(
    () => ({ t: env.t, locale: env.locale, portrait: env.portrait, reduceMotion, ...(env.sound ? { sound: env.sound } : {}) }),
    [env.t, env.locale, env.portrait, reduceMotion, env.sound],
  );
  useEffect(() => setHapticsEnabled(save.settings.vibrate !== false), [save.settings.vibrate]);
  const shellRef = useRef(p.shell);
  shellRef.current = p.shell;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const e2 = envRef.current;
      if (e.key === 'Escape') {
        if (runBackHandler()) return;
        onEscape(e2.router.current.value, e2);
        return;
      }
      // Keys 1-5 switch tabs on a tab root (2.2), never while typing.
      const shell = shellRef.current;
      const tab = e2.router.tab.value;
      if (!shell || !tab || e2.router.stack.value.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      const i = '12345'.indexOf(e.key);
      if (i < 0) return;
      const id = TABS[i]!;
      const cfg = shell.tabs.find((x) => x.id === id);
      if (!cfg || cfg.hidden || (cfg.lockedUntil !== null && cfg.lockedUntil !== undefined)) return;
      e.preventDefault();
      e2.router.switchTab(id, shell.roots[id]);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const host = root.current;
    if (!host) return;
    const layers = host.querySelectorAll<HTMLElement>('[data-layer]');
    const layer = layers[layers.length - 1];
    if (!layer) return;
    const target = layer.querySelector<HTMLElement>('[data-autofocus]') ?? layer.querySelector<HTMLElement>('h1');
    if (target) {
      if (target.tagName === 'H1' && !target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
  }, [top.key]);

  return (
    <UiEnvContext.Provider value={env}>
      <UiKitContext.Provider value={kit}>
        <PortalContext.Provider value={root}>
          <div
            ref={root}
            class="ui-root"
            data-testid="ui-root"
            data-screen-id={top.route.id}
            data-reduce-motion={reduceMotion ? 'true' : 'false'}
            data-team={save.settings.teamPreset}
            data-tab={tab ?? undefined}
          >
            <div class="ui-layer" key={base.key} data-layer="base">
              {p.shell ? (
                // The shell's frame stays mounted in sub-screens and flows (only its bar hides), so a
                // screen is never re-mounted when the tab bar comes or goes.
                <div class={`ui-shell${shellOn ? '' : ' ui-shell--bare'}`} data-testid={shellOn ? 'shell' : undefined} data-shell-tab={shellOn ? (tab ?? undefined) : undefined}>
                  <div class="ui-shell__content" data-dir={shellOn ? (dir.current ?? undefined) : undefined}>
                    {renderRoute(base.route, p.slots)}
                  </div>
                  {shellOn && tab && !p.shell.tabs.every((x) => x.hidden) ? (
                    <div class="ui-shell__bar">
                      <TabBar tabs={p.shell.tabs} active={tab} onSelect={(id) => env.router.switchTab(id, p.shell!.roots[id])} />
                      {p.shell.bar ? p.shell.bar(tab) : null}
                    </div>
                  ) : null}
                </div>
              ) : (
                renderRoute(base.route, p.slots)
              )}
            </div>
            {overlays.map((o) => (
              <div class="ui-layer ui-layer--overlay" key={o.key} data-layer="overlay">
                {renderRoute(o.route, p.slots)}
              </div>
            ))}
            <ToastHost store={toasts} />
            <RotateOverlay />
          </div>
        </PortalContext.Provider>
      </UiKitContext.Provider>
    </UiEnvContext.Provider>
  );
}
