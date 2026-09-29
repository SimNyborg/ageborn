/**
 * Battle HUD model (DESIGN B15 `hud.ts`, A9.2, B6). Built by `render/hudModel.ts` (WP5) at 15 Hz and
 * rendered by the Preact DOM overlay in `ui/hud` (DESIGN B6 HUD).
 */
import type { StanceMode } from './commands';
import type { ResearchTrack } from './content';
import type { CardId, Foil } from './ids';
import type { SideState, SimState, TurretState } from './sim';

/** Card tray states (DESIGN A2.7: "ARMY FULL", "LEGENDARY IN FIELD"). */
export type CardState = 'ready' | 'unaffordable' | 'armyFull' | 'legendaryInField' | 'empty';

export interface HudCard {
  slot: number;
  card: CardId | null;
  cost: number;
  queued: number;
  trainFillBp: number;
  state: CardState;
  foil: Foil;
}

export interface HudModel {
  clockMs: number;
  phase: SimState['phase'];
  phaseMarks: { overdriveMs: number | null; siegeMs: number | null; finalBellMs: number | null };
  me: {
    gold: number;
    goldPerSec: number;
    /**
     * Price of the next Economy income research (Granary, then Market), or null when none can start now.
     * Until the War Council sheet ships (A18.5.7), the gold counter's tap buys it.
     */
    nextTreasuryCost: number | null;
    /** The Economy income research the gold-counter tap starts (A18.5.4), or null/absent when none can start. */
    nextIncome?: { track: ResearchTrack; rank: 1 | 2 | 3; pick: 0 | 1 } | null;
    baseHpBp: number;
    ageIndex: number;
    xpBp: number;
    /** Evolve glows steadily when ready, never flashes (DESIGN A2.4). */
    evolveReady: boolean;
    ascending: boolean;
    pop: number;
    popCap: number;
    stance: StanceMode;
    stanceVisible: boolean;
    powerPpm: number;
    power: CardId;
    lastStand: SideState['lastStand'];
    /** False in the first 4 matches: Last Stand is automatic only (DESIGN A2.11, A8). */
    lastStandManual: boolean;
    cards: HudCard[];
  };
  /** The opponent is always an AI in v1 and must be labeled so (DESIGN A7.1). */
  foe: {
    label: string;
    isAI: true;
    baseHpBp: number;
    ageIndex: number;
    xpBp: number;
    powerPpm: number;
    lastStandArmed: boolean;
    scouted: CardId[];
  };
  mounts: { index: number; owned: boolean; card: CardId | null; outdated: boolean; state: TurretState['state'] | 'empty' }[];
  /** Speed and pause are allowed in every v1 mode (DESIGN A2.12). */
  speed: 1 | 1.5 | 2;
  paused: boolean;
  canRetreat: boolean;
}
