/**
 * Simulation state, configuration and replay contracts (DESIGN B15 `sim.ts`, B3, A2.7).
 *
 * Integer state (DESIGN B3): positions in milli-lu (lane = 1,200,000), HP/shields/damage in centi-units,
 * gold and XP in milli-units, power charge in parts per million, multipliers in bp.
 * The sim is pure and deterministic: seeded sfc32 RNG in `SimState.rng`, no floats in stat math,
 * no `Math.random`, `Date` or DOM (DESIGN B2, B3). Implemented by WP2 in `src/sim`.
 */
import type { TimedCommand } from './commands';
import type { CompiledContent, StatusKind } from './content';
import type { MatchOutcome, SimEvent } from './events';
import type { AgeId, CardId, FormatId, RoleGroup, Side, SkinId, VisualId } from './ids';
import type { Observation } from './observation';

/** One age loadout of a War Plan: 5 unit slots, 2 turret slots, 1 power (DESIGN A3). */
export interface Loadout {
  /** Length 5. */
  units: (CardId | null)[];
  /** Length 2. */
  turrets: (CardId | null)[];
  power: CardId;
}

/** One side of a match. Bots are labeled AI on every surface (DESIGN A7.1). */
export interface SideConfig {
  label: string;
  isBot: boolean;
  loadouts: Partial<Record<AgeId, Loadout>>;
  /** Every owned card, including summon sources (DESIGN A2.4 Vanguard, A5.7 Paratroopers). */
  levels: Record<CardId, number>;
  skins: Record<string, SkinId>;
}

/** A scripted tutorial event applied at B3 step 1 (DESIGN A8, B3). */
export interface TrainingEvent {
  tick: number;
  side: Side;
  grantGold?: number;
  unlockSlot?: number;
  setPowerPpm?: number;
}

/** Everything needed to start a deterministic match (DESIGN B3, B11 BattleSession). */
export interface MatchConfig {
  seed: number;
  format: FormatId;
  content: CompiledContent;
  sides: [SideConfig, SideConfig];
  /** Daily Challenge modifiers (DESIGN A9.1). */
  modifiers?: string[];
  /** Tutorial and onboarding overrides (DESIGN A8, A2.11: Last Stand automatic in the first 4 matches). */
  training?: {
    enemyBaseStartBp?: number;
    noClock?: boolean;
    script?: TrainingEvent[];
    manualLastStand?: [boolean, boolean];
    stanceEnabled?: [boolean, boolean];
    trays?: Partial<Record<AgeId, number[]>>;
  };
}

/** Per-attack state machine (DESIGN A2.7 Attack cycle). `targetId` −1 = enemy base. */
export interface AttackState {
  targetId: number;
  impactTick: number;
  nextAttackTick: number;
  lastAttackTick: number;
}

export interface ActiveStatus {
  kind: StatusKind;
  magnitudeBp: number;
  untilTick: number;
  amount: number;
  frozen: boolean;
  sourceId: number;
}

/** A live unit. `x` and `prevX` in milli-lu; views interpolate between them (DESIGN B6). */
export interface UnitState {
  id: number;
  side: Side;
  card: CardId;
  level: number;
  x: number;
  prevX: number;
  hp: number;
  maxHp: number;
  shield: number;
  innateShield: number;
  mode: 'walk' | 'attack' | 'hold' | 'retreat' | 'leap' | 'dying';
  /** Indexed like UnitDef.attacks, riders appended. */
  attacks: AttackState[];
  statuses: ActiveStatus[];
  air: boolean;
  summoned: boolean;
  timers: number[];
  lastDamageTick: number;
}

/** One training queue item; the shared queue holds 5 (DESIGN A2.7 Training). */
export interface QueueItem {
  card: CardId;
  group: RoleGroup;
  progress: number;
  total: number;
  /** Finished but waiting for pop room ("ARMY FULL"). */
  waiting: boolean;
}

export interface TurretState {
  card: CardId;
  age: AgeId;
  level: number;
  state: 'building' | 'active' | 'selling' | 'replacing';
  readyTick: number;
  attack: AttackState;
}

export interface ProjectileState {
  pid: number;
  side: Side;
  sourceId: number;
  sourceCard: CardId;
  targetId: number;
  x: number;
  toX: number;
  impactTick: number;
  attackIndex: number;
  visualId: VisualId;
}

export interface PowerCastState {
  castId: number;
  side: Side;
  power: CardId;
  startTick: number;
  x: number;
  zone: number;
  nextIndex: number;
  levelBp: number;
}

export interface SideState {
  gold: number;
  xp: number;
  ageIndex: number;
  ascendUntil: number;
  queue: QueueItem[];
  pop: number;
  treasury: number;
  mountsOwned: number;
  turrets: (TurretState | null)[];
  powerPpm: number;
  stance: 'charge' | 'hold';
  stanceReadyTick: number;
  baseHp: number;
  baseMaxHp: number;
  lastStand: 'locked' | 'armed' | 'charging' | 'used';
  retreated: boolean;
  callStrikeReadyTick: number;
}

/** The whole match state. Entities iterate in id order (DESIGN B3 Entities). */
export interface SimState {
  tick: number;
  phase: 'regulation' | 'overdrive' | 'siege' | 'ended';
  sides: [SideState, SideState];
  units: UnitState[];
  projectiles: ProjectileState[];
  casts: PowerCastState[];
  /** sfc32 state, seeded via xmur3 of `"${seed}"` (DESIGN B3 RNG). */
  rng: [number, number, number, number];
  nextId: number;
  outcome: MatchOutcome | null;
  /** FNV-1a state hash every 20 ticks (DESIGN B3 step 17). */
  hashes: number[];
}

/** A recorded match, about 5-20 KB (DESIGN B3 Replays). A differing `contentHash` cannot be played. */
export interface ReplayDoc {
  v: 1;
  simVersion: string;
  contentHash: string;
  seed: number;
  format: FormatId;
  sides: [SideConfig, SideConfig];
  modifiers: string[];
  training: MatchConfig['training'] | null;
  commands: TimedCommand[];
  result: MatchOutcome;
  finalHash: number;
  hashes: number[];
}

/** A running simulation (DESIGN B3). One `step()` = one 50 ms tick. */
export interface Sim {
  readonly state: Readonly<SimState>;
  readonly config: Readonly<MatchConfig>;
  step(cmds: readonly TimedCommand[]): readonly SimEvent[];
  hash(): number;
  observe(side: Side): Observation;
}

/** Signature of `createSim` in `src/sim/createSim.ts` (WP2). */
export type CreateSim = (cfg: MatchConfig) => Sim;

/** Signature of `replayMatch` in `src/sim/replay.ts` (WP2): re-simulates to `toTick` or the end (DESIGN B3). */
export type ReplayMatch = (r: ReplayDoc, content: CompiledContent, toTick?: number) => Sim;
