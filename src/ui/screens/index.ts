/**
 * The meta UI (WP9) as the app sees it: mount one `ScreenHost` with a `UiEnv`, drive it with the
 * router, and implement `UiServices` on top of meta and save. See docs/requests/wp9-app-wiring.md.
 */
export { ScreenHost, SCREEN_COMPONENTS, onEscape, type ScreenHostProps, type ScreenSlots } from './ScreenHost';
export type { UiEnv } from './context';
export type { ActionResult, ProfileLookPatch, UiServices, WarPlan } from './services';
export { HomeScreen } from './home/HomeScreen';
export {
  createRouter,
  SCREENS,
  WP9_SCREENS,
  visibleEntries,
  type DailyDifficulty,
  type MatchMode,
  type MatchRequest,
  type PauseInfo,
  type ResultInfo,
  type Route,
  type RouteOf,
  type Router,
  type ScreenId,
} from '../router';
export { createToastStore, type ToastStore } from '../components/Toasts';
export type { PortraitFn, Translate } from '../components/kit';
