/**
 * Simulation state, configuration and replay contracts (DESIGN B15 `sim.ts`, B3, A2.7).
 *
 * Integer state (DESIGN B3): positions in milli-lu (lane = 1,200,000), HP/shields/damage in centi-units,
 * gold and XP in milli-units, power reload progress in parts per million, multipliers in bp.
 * The sim is pure and deterministic: seeded sfc32 RNG in `SimState.rng`, no floats in stat math,
 * no `Math.random`, `Date` or DOM (DESIGN B2, B3). Implemented by WP2 in `src/sim`.
 */
import type { StanceMode, TimedCommand } from './commands';
import type { CompiledContent, PowerSlot, StatusKind } from './content';
import type { MatchOutcome, SimEvent } from './events';
import type { AgeId, CardId, FormatId, RoleGroup, Side, SideLook, SkinId, VisualId } from './ids';
import type { Observation } from './observation';

/** One age loadout of a War Plan: 6 unit slots, 2 turret slots, 2 typed power slots (DESIGN A3, A18.9, A2.9.1). */
export interface Loadout {
  /** Length 6 (A18.9 six troops; 5 before SIM_VERSION 3.0.0, a shorter array plays as empty slots). */
  units: (CardId | null)[];
  /** Length 2. */
  turrets: (CardId | null)[];
  /**
   * The Home and Field power slots (A2.9.1; `power: CardId` before SIM_VERSION 4.0.0). An empty slot is
   * legal and its cast is rejected (`noPower`); a meta-locked slot arrives empty (the match rule).
   */
  powers: LoadoutPowers;
}

/** A loadout's two power slots (DESIGN A2.9.1). */
export interface LoadoutPowers {
  home: CardId | null;
  field: CardId | null;
}

/** One side of a match. Bots are labeled AI on every surface (DESIGN A7.1). */
export interface SideConfig {
  label: string;
  isBot: boolean;
  loadouts: Partial<Record<AgeId, Loadout>>;
  /** Every owned card, including summon sources (DESIGN A2.4 Vanguard, A5.7 Paratroopers). */
  levels: Record<CardId, number>;
  skins: Record<string, SkinId>;
  /** Base flag, national flag, base skins and decorations (A18.9.4). Cosmetic: the sim ignores it. */
  look?: SideLook;
  /**
   * Per-side modifiers, disclosed on the node and the VS screen (DESIGN A18.11, A18.7.6 boss base,
   * A18.2 rule 5). Read at base init, at every evolve and at every spawn; clamped to the A18.2 caps.
   */
  sideMods?: SideMods;
}

/** Per-side modifiers (DESIGN A18.11): boss bases, relics in single player (never in PvP). */
export interface SideMods {
  /** Base max HP +bp (a boss base: +5,000). */
  baseHpBp?: number;
  /** One extra fixed turret (this card, at the side's level) on a fifth mount that cannot be sold or modernised. */
  extraTurret?: CardId;
  /** Unit stats +bp for every own unit (within the A18.2 caps). */
  unitDamageBp?: number;
  unitHpBp?: number;
  unitSpeedBp?: number;
  unitAttackSpeedBp?: number;
}

/**
 * A non-default win rule (DESIGN A18.7.3). `side` is the side that wins by meeting it (default 0, the
 * player). `survive`: that side wins when its base still stands at `atMs`. `target`: that side wins
 * by destroying the enemy's marked turret on `mount`, which has `hp` hit points and takes every hit
 * aimed at that base (it cannot be sold or modernised); destroying the base still wins too.
 */
export type VictoryRule = { kind: 'survive'; atMs: number; side?: Side } | { kind: 'target'; mount: number; hp: number; side?: Side };

/** A scripted tutorial event applied at B3 step 1 (DESIGN A8, B3). */
export interface TrainingEvent {
  tick: number;
  side: Side;
  grantGold?: number;
  unlockSlot?: number;
  /** Sets one power slot's reload progress (ppm); 1,000,000 makes it ready (A8 tutorial beat). */
  setPowerPpm?: { slot: PowerSlot; ppm: number };
}

/** Everything needed to start a deterministic match (DESIGN B3, B11 BattleSession). */
export interface MatchConfig {
  seed: number;
  format: FormatId;
  content: CompiledContent;
  sides: [SideConfig, SideConfig];
  /** Daily Challenge modifiers (DESIGN A9.1). */
  modifiers?: string[];
  /** A War Path objective (DESIGN A18.7.3); default: destroy the base. */
  victory?: VictoryRule;
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

/**
 * The War Council state of a side (DESIGN A18.5.1), hashed. Picks are indices into
 * `content.research.picks`. `cur` −1 = the slot is free.
 */
export interface ResearchState {
  /** Owned picks, in completion order. */
  owned: number[];
  cur: number;
  startTick: number;
  endTick: number;
  /** Milli-gold paid for `cur` (cancel refunds 75% of it). */
  paid: number;
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
  /** The slot it was cast from (A2.9.1). */
  slot: PowerSlot;
  power: CardId;
  startTick: number;
  x: number;
  zone: number;
  nextIndex: number;
  levelBp: number;
  /** A strike's locked unit id, −1 otherwise (A2.9.7). */
  targetId: number;
}

export interface SideState {
  gold: number;
  xp: number;
  ageIndex: number;
  ascendUntil: number;
  queue: QueueItem[];
  pop: number;
  /**
   * The base's economy level for the art (the Treasury prop): the number of owned Economy research
   * picks (A18.5.4 replaced the Treasury upgrade; `treasuryUp` still marks each new level).
   */
  treasury: number;
  mountsOwned: number;
  turrets: (TurretState | null)[];
  /**
   * Reload progress per power slot in ppm, [Home, Field] (A2.9.3); 1,000,000 = reloaded. Empty slots
   * accrue too. `powerRem` carries the integer remainder so every reload is exact.
   */
  powerPpm: [number, number];
  powerRem: [number, number];
  /** The optional shared lockout (`economy.power.lockMs`): no cast before this tick (A2.9.3). */
  powerLockoutUntil: number;
  /** Per mount (own mounts, the extra boss mount included): no turret attack starts before this tick (Suppress, A2.9.7). */
  mountSilencedUntil: number[];
  stance: StanceMode;
  stanceReadyTick: number;
  /** The Hold flag, own-side p in milli-lu (A18.4.2), and when it may move again. */
  holdP: number;
  flagReadyTick: number;
  research: ResearchState;
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
  /** The War Path objective, when the match had one (A18.7.3). */
  victory?: VictoryRule;
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
