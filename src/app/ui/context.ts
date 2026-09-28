/** What the app's screens share: the controller, the services and the battle views by sim. */
import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { ArtProvider, CardId, Foil, Sim } from '@/contracts';
import type { BattleView } from '@/render';
import type { AppController } from '../controller';
import type { Services } from '../services';
import type { FrameScheduler, SessionView } from '../session';

export interface AppUi {
  controller: AppController;
  services: Services;
  art: ArtProvider;
  /** The battle view created for a sim (for the HUD bridge and the tutorial hand). */
  viewOf(sim: Sim): BattleView | undefined;
  /** Builds a mounted battle view for a sim (battles and replays). */
  createView(sim: Sim, mySide?: 0 | 1): SessionView;
  /** Frames for replays (the Pixi ticker in the app). */
  scheduler: FrameScheduler | null;
  portrait(card: CardId, foil: Foil, size: number): Promise<string>;
  t(key: string, params?: Record<string, string | number>): string;
  /** Starts a file download (save file, event log); absent in tests. */
  download?: (file: { name: string; mime: string; text: string }) => void;
}

export const AppUiContext = createContext<AppUi | null>(null);

export function useApp(): AppUi {
  const ui = useContext(AppUiContext);
  if (!ui) throw new Error('AppUiContext missing');
  return ui;
}
