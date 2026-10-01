/** What the app's screens share: the controller, the services and the battle views by sim. */
import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { Application } from 'pixi.js';
import type { ArtProvider, CardId, Foil, Sim } from '@/contracts';
import type { BattleView } from '@/render';
import type { AppController } from '../controller';
import type { KeyValueStore } from '../eventLog';
import type { Services } from '../services';
import type { FrameScheduler, SessionView } from '../session';

export interface AppUi {
  controller: AppController;
  services: Services;
  art: ArtProvider;
  /** The battle view created for a sim (for the HUD bridge and the tutorial hand). */
  viewOf(sim: Sim): BattleView | undefined;
  /** Builds a mounted battle view for a sim (battles and replays). */
  createView(sim: Sim, mySide?: 0 | 1, o?: { spectator?: boolean }): SessionView;
  /** Frames for replays (the Pixi ticker in the app). */
  scheduler: FrameScheduler | null;
  /** A card portrait; `plate: false` leaves the background transparent (the HUD's fort button and drag ghost). */
  portrait(card: CardId, foil: Foil, size: number, plate?: boolean): Promise<string>;
  t(key: string, params?: Record<string, string | number>): string;
  /** The persistent Pixi application the capsule show draws into (B6); absent in tests. */
  pixi?: Application;
  /** Local storage for the capsule show in progress (a reload replays the same result); absent in tests. */
  storage?: KeyValueStore | null;
  /** Starts a file download (save file, event log); absent in tests. */
  download?: (file: { name: string; mime: string; text: string }) => void;
  /**
   * While the boot art (Stone, Bronze) is still loading, a promise for it; null once loaded. A battle
   * started from the meta screens waits for it (perf audit 2026-10-01: Home no longer waits for battle art).
   */
  artReady?: () => Promise<void> | null;
}

export const AppUiContext = createContext<AppUi | null>(null);

export function useApp(): AppUi {
  const ui = useContext(AppUiContext);
  if (!ui) throw new Error('AppUiContext missing');
  return ui;
}
