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
import type { ComponentChildren, ComponentType } from 'preact';
import { useEffect, useMemo, useRef } from 'preact/hooks';
import { UiKitContext, type UiKit } from '../components/kit';
import { RotateOverlay } from '../components/Layout';
import { createToastStore, ToastHost, type ToastStore } from '../components/Toasts';
import { visibleEntries, type Route, type RouteOf, type ScreenId } from '../router';
import { CardDetailScreen } from './cardDetail/CardDetailScreen';
import { CollectionScreen } from './collection/CollectionScreen';
import { ConquestScreen } from './conquest/ConquestScreen';
import { UiEnvContext, type UiEnv } from './context';
import { HomeScreen } from './home/HomeScreen';
import { ModeSelectScreen } from './modeSelect/ModeSelectScreen';
import { PauseScreen } from './pause/PauseScreen';
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
};

export type ScreenSlots = { [K in ScreenId]?: (route: RouteOf<K>) => ComponentChildren };

export interface ScreenHostProps {
  env: Omit<UiEnv, 'toasts'> & { toasts?: ToastStore };
  /** App-rendered screens (boot, battle, capsule, replay). */
  slots?: ScreenSlots;
}

function renderRoute(route: Route, slots: ScreenSlots | undefined): ComponentChildren {
  const Screen = SCREEN_COMPONENTS[route.id] as ComponentType<{ route: Route }> | undefined;
  if (Screen) return <Screen route={route} />;
  const slot = slots?.[route.id] as ((r: Route) => ComponentChildren) | undefined;
  return slot ? slot(route) : null;
}

/** What Escape does on each screen. Screens with their own flow (VS, battle) ignore it. */
export function onEscape(route: Route, env: UiEnv): void {
  switch (route.id) {
    case 'home':
    case 'vs':
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
  const root = useRef<HTMLDivElement>(null);
  const envRef = useRef(env);
  envRef.current = env;

  const kit: UiKit = useMemo(
    () => ({ t: env.t, locale: env.locale, portrait: env.portrait, reduceMotion: save.settings.reduceMotion }),
    [env.t, env.locale, env.portrait, save.settings.reduceMotion],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      const e2 = envRef.current;
      onEscape(e2.router.current.value, e2);
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
        <div
          ref={root}
          class="ui-root"
          data-testid="ui-root"
          data-screen-id={top.route.id}
          data-reduce-motion={save.settings.reduceMotion ? 'true' : 'false'}
          data-team={save.settings.teamPreset}
        >
          <div class="ui-layer" key={base.key} data-layer="base">
            {renderRoute(base.route, p.slots)}
          </div>
          {overlays.map((o) => (
            <div class="ui-layer ui-layer--overlay" key={o.key} data-layer="overlay">
              {renderRoute(o.route, p.slots)}
            </div>
          ))}
          <ToastHost store={toasts} />
          <RotateOverlay />
        </div>
      </UiKitContext.Provider>
    </UiEnvContext.Provider>
  );
}
