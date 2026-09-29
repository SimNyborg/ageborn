/**
 * The meta UI environment, provided once by the `ScreenHost` and read by every screen:
 * the save signal, the typed content, translation, the clock, the router, the injected services,
 * card portraits and the toast store. Screens read `save.value` during render, so they re-render
 * when the app writes a new save (DESIGN B9: the app holds the SaveDoc in a signal).
 */
import type { Content } from '@/content/types';
import type { SaveDoc } from '@/contracts';
import type { ReadonlySignal } from '@preact/signals';
import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { PortraitFn, Translate } from '../components/kit';
import type { ToastStore } from '../components/Toasts';
import type { Router } from '../router';
import type { UiServices } from './services';

export interface UiEnv {
  save: ReadonlySignal<SaveDoc>;
  content: Content;
  t: Translate;
  /** Locale for number formatting ('en' in v1). */
  locale: string;
  /** Wall clock in epoch ms, for countdowns. */
  now: () => number;
  router: Router;
  services: UiServices;
  portrait: PortraitFn | null;
  toasts: ToastStore;
  /** Optional UI sound hook (ui-plan 5.4): the app passes the audio service's `play`. */
  sound?: (id: string) => void;
}

export const UiEnvContext = createContext<UiEnv | null>(null);

export function useUi(): UiEnv {
  const env = useContext(UiEnvContext);
  if (!env) throw new Error('useUi: no UiEnv. Render screens inside <ScreenHost>.');
  return env;
}
