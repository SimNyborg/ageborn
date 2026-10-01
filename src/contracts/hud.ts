/**
 * Battle HUD model (DESIGN B15 `hud.ts`, A9.2, B6). Built by `render/hudModel.ts` (WP5) at 15 Hz and
 * rendered by the Preact DOM overlay in `ui/hud` (DESIGN B6 HUD).
 */
import type { StanceMode } from './commands';
import type { FortKind, PowerFamily, PowerReach, PowerSlot, ResearchTrack } from './content';
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
  /**
   * The in-battle counter hint (A9.2, owner feedback 2026-09-29): an Anti-heavy card while the enemy
   * fields Heavies shows a "Beats Heavy" chip. Absent in older models.
   */
  beatsHeavy?: boolean;
}

/**
 * A side's War Council as the HUD shows it (A18.5.7; research is public, A18.5.1). Pick ids index
 * `content.research.picks` by id.
 */
export interface HudResearch {
  /** Owned pick ids, in completion order. */
  owned: string[];
  /** The pick in the one research slot, or null. */
  current: string | null;
  /** Progress of `current`, bp (0 when idle). */
  progressBp: number;
  /** Time left on `current`, ms (0 when idle). */
  leftMs: number;
  /** The highest rank open in this window at the side's current age (A18.5.1): 0-3. */
  ranksOpen: number;
  /** Research started now gets the underdog discount (−20%, A18.5.1). */
  discount: boolean;
}

/** One of my power slots on the dock (A2.9.10, A9.2); built from the Observation-equivalent state. */
export interface HudPowerSlot {
  slot: PowerSlot;
  card: CardId;
  /** Reload progress, ppm. */
  ppm: number;
  /** Effective cost, whole gold (modifiers applied, A2.9.2). */
  cost: number;
  /** Gold ≥ cost now. */
  affordable: boolean;
  /** Whole seconds until reloaded (rounded up), 0 when reloaded. */
  secondsLeft: number;
  /** Effective reload, ms. */
  reloadMs: number;
  reach: PowerReach;
  family: PowerFamily;
  /** The cap (A2.9.5); 0 for powers without one (drops, Suppress). */
  maxTargets: number;
  /** Zone width, lu (0 without a zone). */
  zone: number;
  /** The shared lockout lever: no cast before this match time, ms (0 when none). */
  lockoutUntilMs: number;
  /** The slot is locked by progression (meta, the Field slot before its unlock); the sim sees it empty. */
  slotLocked: boolean;
}

/** One of the opponent's rings (public) and its card once scouted (A2.9.7). */
export interface HudFoePowerSlot {
  card: CardId | null;
  ppm: number;
}

/** My Fort button (A16.14.7, F2): the slot's card, price, recharge and caps; the enemy's public ring. */
export interface HudFort {
  card: CardId;
  cost: number;
  /** Gold ≥ cost now. */
  affordable: boolean;
  /** Whole seconds until recharged (rounded up), 0 when ready. */
  secondsLeft: number;
  /** "2/2": the alive cap is reached. */
  cap: boolean;
  /** The slot is locked by progression (meta); the sim sees it empty. */
  slotLocked: boolean;
  /** Siege: forts crumble, no placing. */
  siege: boolean;
  /** The enemy's recharge ring (public): card once scouted, seconds left; null when they have no Fort card. */
  foeRing: { card: CardId | null; secondsLeft: number } | null;
  /** The card's kind (F2 HUD; absent in older models). */
  kind?: FortKind;
  /** Pop the fort uses while alive (6; a Trap 3). */
  pop?: number;
  /** Own forts alive (scaffolds and traps count) and the cap (2). */
  alive?: number;
  max?: number;
  /** An own Camp is alive (one at a time). */
  campAlive?: boolean;
  /** The slot's recharge, ms (the ring's full length; the first ready time is shorter). */
  rechargeMs?: number;
  /** Ticks' worth of recharge left, ms (0 when ready), for a smooth ring. */
  leftMs?: number;
  /** Every pad as the placement rules see it now (`Observation.me.fort.pads`). */
  pads?: HudFortPad[];
  /** Scaffold time of my forts now, ms (Engineers shortens it). */
  scaffoldMs?: number;
}

/** One of my fort pads (A16.14.2): own-frame p in lu, legality now and why not, and a tower's range there. */
export interface HudFortPad {
  p: number;
  kind: 'home' | 'field';
  legal: boolean;
  /** Legal, and every enemy needs longer than the scaffold to get there (Key D and the AI pick these). */
  safe: boolean;
  /** The deny code of an illegal pad (`fortPadKind`, `fortPadTaken`, `fortPadEnemy`, `fortPadField`), else null. */
  reason: string | null;
  /** A tower's range from this pad, lu (0 for other kinds). */
  towerRange: number;
}

/**
 * A fort or trap on the lane as the HUD tags it (A16.14.7 "On the lane"): both sides, `p` from this HUD's
 * gate in lu. Forts are also drawn by the battle view; the HUD adds the readable tag (kind, scaffold
 * progress, crumbling, silenced) and draws traps' charge pips.
 */
export interface HudLaneFort {
  id: number;
  mine: boolean;
  card: CardId;
  kind: FortKind;
  p: number;
  /** HP left, bp of max (traps: 10,000). */
  hpBp: number;
  /** Scaffold (or a trap's arming) progress, bp; 10,000 once built or armed. */
  buildBp: number;
  /** Losing HP to decay now (after 60 s, or at once in Siege). */
  decaying: boolean;
  /** A tower silenced by Suppress. */
  silenced: boolean;
  /** Traps: charges left. */
  charges?: number;
}

export interface HudModel {
  clockMs: number;
  phase: SimState['phase'];
  phaseMarks: { overdriveMs: number | null; siegeMs: number | null; finalBellMs: number | null };
  /**
   * Last Base Standing (A2.10.1, A9.2): the escalation meter (`step` reached of `steps`, schedule in ms)
   * and which sides crumble, by Side. Absent in a format with a Final Bell. Filled by the HUD model (L3).
   */
  escalation?: { step: number; steps: number; atMs: number[]; crumbling: [boolean, boolean] };
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
    /** The Hold flag, own-side p in lu (A18.4.2); absent in older models. */
    holdP?: number;
    /** Until a stance change is accepted again, ms (3 s cooldown, A18.4.2); 0 when ready. */
    stanceWaitMs?: number;
    /** The War Council (A18.5.7); absent in older models and plain test models. */
    research?: HudResearch;
    /**
     * P1 compatibility (A2.9.13): the Home slot on the single power button. `power` is '' when the Home
     * slot is empty. The dock reads `powers`.
     */
    powerPpm: number;
    power: CardId;
    /** Both power slots (A2.9.10); absent in older models and plain test models. */
    powers?: Record<PowerSlot, HudPowerSlot | null>;
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
    /** P1 compatibility: their Home ring. */
    powerPpm: number;
    /** Both of their rings (A2.9.10); absent in older models. */
    powers?: Record<PowerSlot, HudFoePowerSlot | null>;
    lastStandArmed: boolean;
    scouted: CardId[];
    /** Their War Council: public (A18.5.1), shown on their panel and in the Scouted list. */
    research?: HudResearch;
    /** Their stance (public on the lane). */
    stance?: StanceMode;
    /** They field Heavies (A9.2 counter hint: 2+ Heavies on the lane or 40%+ of their value there). */
    heavyThreat?: boolean;
  };
  mounts: { index: number; owned: boolean; card: CardId | null; outdated: boolean; state: TurretState['state'] | 'empty' }[];
  /** My Fort slot (A16.14.7); absent in older models and while the slot is off (F2 turns it on). */
  fort?: HudFort | null;
  /** Forts and traps of both sides on the lane (A16.14.7); absent in older models. */
  laneForts?: HudLaneFort[];
  /** Speed and pause are allowed in every v1 mode (DESIGN A2.12). */
  speed: 1 | 1.5 | 2;
  paused: boolean;
  canRetreat: boolean;
}
