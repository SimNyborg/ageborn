/**
 * A live (online) match under Settings (queue item 34; orchestrator decision 4, 2026-10-18; review O S3).
 * The live menu opens Settings over the running battle, which never pauses, so Settings must say so: the app
 * provides this context while the battle on screen is a live match, and Settings then shows a sticky
 * "Match running · Back to battle" bar and keeps Import and Reset off until the match is over (both replace
 * the save the match is about to write its result to). Offline battles pause under Settings and provide
 * nothing.
 */
import type { ReadonlySignal } from '@preact/signals';
import { createContext } from 'preact';

export interface SettingsLiveMatch {
  /** The opponent's name. */
  foeName: string;
  /** The battle clock as the HUD shows it ("7:14"). */
  clock: ReadonlySignal<string>;
  /** True while the match runs; false in the moment between its end and the Result. */
  running: ReadonlySignal<boolean>;
}

export const SettingsLiveContext = createContext<SettingsLiveMatch | null>(null);
