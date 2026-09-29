/**
 * What a bot is allowed to see (DESIGN B15 `observation.ts`, A7.1 honesty rules, B10).
 *
 * The session keeps a ring of observations and hands a bot a delayed one, so a controller cannot
 * reach undelayed state (DESIGN B6 loop, B10). Positions are `p`, relative to the observer (A2.1).
 */
import type { StanceMode } from './commands';
import type { PowerSlot } from './content';
import type { AgeId, CardId, Side } from './ids';
import type { SideState, SimState } from './sim';

/** A side's War Council as both players see it (A18.5.1: research is public). */
export interface ResearchView {
  /** Owned pick ids, in completion order. */
  owned: string[];
  /** The pick in progress, or null. */
  current: string | null;
  /** Progress of `current` in bp (0 when idle). */
  progressBp: number;
  /** The highest rank open in this window at the side's current age (A18.5.1): 0-3. */
  ranksOpen: number;
}

/** One of my power slots (A2.9.3): the effective cost (whole gold) and reload (ms) the sim applies. */
export interface ObservedPower {
  card: CardId;
  /** Reload progress, ppm (1,000,000 = reloaded). */
  ppm: number;
  cost: number;
  reloadMs: number;
  /** The slot's reload rate, bp (10,000 + research and modifier bonuses; core `reloadTicksLeft`). */
  rateBp: number;
}

/**
 * One of the opponent's power slots (A2.9.7 visibility): the ring is public, the card only once it was
 * cast (scouted); gold stays hidden.
 */
export interface ObservedFoePower {
  card: CardId | null;
  ppm: number;
}

export interface Observation {
  tick: number;
  side: Side;
  phase: SimState['phase'];
  /** The match's age window (A18.3.4); `ageIndex` values are positions in it. Public to both sides. */
  ages: AgeId[];
  me: {
    gold: number;
    xpBp: number;
    ageIndex: number;
    queue: CardId[];
    pop: number;
    /** Economy level (owned Economy research picks, A18.5.4). */
    treasury: number;
    mountsOwned: number;
    turrets: ({ card: CardId; age: AgeId } | null)[];
    /** My Home and Field slots of the current loadout; null = empty (A2.9.1). */
    powers: Record<PowerSlot, ObservedPower | null>;
    /** The shared lockout (`economy.power.lockMs` lever): no cast before this tick; 0 when none. */
    powerLockoutUntil: number;
    stance: StanceMode;
    /** Hold flag, own-side p in lu (A18.4.2). */
    holdP: number;
    research: ResearchView;
    baseHpBp: number;
    lastStand: SideState['lastStand'];
    tray: (CardId | null)[];
    turretCards: (CardId | null)[];
  };
  /** Only what a human could see on screen (DESIGN A7.1). */
  foe: {
    ageIndex: number;
    xpBp: number;
    /** Their two reload rings (public) and cards once scouted; null = an empty slot. */
    powers: Record<PowerSlot, ObservedFoePower | null>;
    turrets: ({ card: CardId; age: AgeId } | null)[];
    baseHpBp: number;
    stance: StanceMode;
    /** Their Hold flag, in their own-side p, lu. */
    holdP: number;
    research: ResearchView;
    treasury: number;
    lastStand: SideState['lastStand'];
    scouted: CardId[];
  };
  /** Visible telegraphs; `targetId` is a strike's locked unit (−1 otherwise). */
  telegraphs: { side: Side; slot: PowerSlot; power: CardId; p: number; zone: number; impactTick: number; targetId: number }[];
  /** p relative to the observer. */
  units: {
    id: number;
    side: Side;
    card: CardId;
    level: number;
    p: number;
    hp: number;
    maxHp: number;
    shield: number;
    air: boolean;
    /** Summoned (Vanguard, drops, riders): never the power front F (A2.9.4). */
    summoned: boolean;
  }[];
}
