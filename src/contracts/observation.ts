/**
 * What a bot is allowed to see (DESIGN B15 `observation.ts`, A7.1 honesty rules, B10).
 *
 * The session keeps a ring of observations and hands a bot a delayed one, so a controller cannot
 * reach undelayed state (DESIGN B6 loop, B10). Positions are `p`, relative to the observer (A2.1).
 */
import type { AgeId, CardId, Side } from './ids';
import type { SideState, SimState } from './sim';

export interface Observation {
  tick: number;
  side: Side;
  phase: SimState['phase'];
  me: {
    gold: number;
    xpBp: number;
    ageIndex: number;
    queue: CardId[];
    pop: number;
    treasury: number;
    mountsOwned: number;
    turrets: ({ card: CardId; age: AgeId } | null)[];
    powerPpm: number;
    stance: 'charge' | 'hold';
    baseHpBp: number;
    lastStand: SideState['lastStand'];
    tray: (CardId | null)[];
    turretCards: (CardId | null)[];
    power: CardId;
  };
  /** Only what a human could see on screen (DESIGN A7.1). */
  foe: {
    ageIndex: number;
    xpBp: number;
    powerPpm: number;
    turrets: ({ card: CardId; age: AgeId } | null)[];
    baseHpBp: number;
    stance: 'charge' | 'hold';
    treasury: number;
    lastStand: SideState['lastStand'];
    scouted: CardId[];
  };
  telegraphs: { side: Side; power: CardId; p: number; zone: number; impactTick: number }[];
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
  }[];
}
