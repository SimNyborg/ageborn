/**
 * Meta rules (DESIGN B15 `meta.ts`, B9, A6). Implemented by WP7 in `src/meta`.
 *
 * Pure: every function takes the save (and content and clock) and returns a new save; no mutation,
 * no I/O (DESIGN B9). Time arrives only through the injected `Clock` (DESIGN B2).
 */
import type { MatchOutcome } from './events';
import type { CompiledContent } from './content';
import type { AgeId, CapsuleTier, CardId, FormatId, Result, Side } from './ids';
import type { CapsuleReveal, PendingCapsule, SaveDoc, WardrobeReveal } from './save';
import type { SideConfig } from './sim';

/** Injected wall clock, epoch ms (DESIGN B2, B9). */
export interface Clock {
  now(): number;
}

/** Per-match statistics reduced from `SimEvent`s by `sim/stats.ts` (DESIGN B3 Match stats, A6.7 quests). */
export interface MatchStats {
  trained: number;
  kills: number;
  turretKills: number;
  evolves: number;
  reachedFinalAgeAtMs: number | null;
  powerMaxHits: number;
  baseDamage: number;
  heavyKillsByAA: number;
  usedTreasury: boolean;
  usedLastStand: boolean;
  ownBaseHpBpAtEnd: number;
  durationMs: number;
  mvpCard: CardId | null;
}

/**
 * The chosen opponent. `isAI` is always true in v1 and every surface must label it (DESIGN A7.1).
 * `disclosures` lists what the pre-match screen must reveal (tier, warm-up, modifiers; A7.1, A6.8).
 */
export interface OpponentSpec {
  generalId: string;
  displayName: string;
  isAI: true;
  tier: number;
  level: number;
  format: FormatId;
  side: SideConfig;
  modifiers: string[];
  seed: number;
  warmUp: boolean;
  disclosures: string[];
}

export interface MatchResultInput {
  mode: 'ladder' | 'conquest' | 'skirmish' | 'daily' | 'tutorial';
  outcome: MatchOutcome;
  mySide: Side;
  opponent: OpponentSpec;
  stats: MatchStats;
}

/** One step of the result screen reward sequence (DESIGN A6.3, A9). */
export type RewardStep =
  | { kind: 'trophies'; delta: number }
  | { kind: 'amber'; amount: number }
  | { kind: 'dust'; amount: number }
  | { kind: 'capsule'; capsuleId: string }
  | { kind: 'clayPip'; meter: number }
  | { kind: 'codex'; points: number; levelUp: boolean }
  | { kind: 'quest'; questId: string; progress: number; done: boolean }
  | { kind: 'star'; generalId: string; star: 1 | 2 | 3 }
  | { kind: 'arena'; arenaIndex: number }
  | { kind: 'title'; title: string };

/** A War Plan validation finding (DESIGN A3). */
export interface PlanIssue {
  age: AgeId;
  severity: 'error' | 'warning';
  code: string;
  messageKey: string;
}

/** Skirmish setup (DESIGN A9). `'echo'` = mirror of the player's plan. */
export interface SkirmishOptions {
  generalId: string | 'echo';
  tier: number;
  format: FormatId;
  standardLevels: boolean;
}

export interface Meta {
  newSave(content: CompiledContent, clock: Clock, seed: number): SaveDoc;
  /** Trophies, capsules, quests, codex, conquest stars, MMR (DESIGN A6.3, A6.7, A6.8, A6.10). */
  applyMatchResult(
    s: SaveDoc,
    r: MatchResultInput,
    c: CompiledContent,
    clock: Clock,
  ): { save: SaveDoc; rewards: RewardStep[] };
  /** Rolls the contents now, before any animation (DESIGN A6.4, B8). */
  grantCapsule(
    s: SaveDoc,
    kind: PendingCapsule['kind'],
    c: CompiledContent,
    clock: Clock,
    o?: { tier?: CapsuleTier; age?: AgeId },
  ): SaveDoc;
  openCapsule(s: SaveDoc, id: string): { save: SaveDoc; reveal: CapsuleReveal };
  openWardrobe(s: SaveDoc, id: string): { save: SaveDoc; reveal: WardrobeReveal };
  /** Upgrades and duplicates (DESIGN A6.6). */
  upgrade(s: SaveDoc, card: CardId, c: CompiledContent): Result<SaveDoc>;
  /** Crafting with Dust (DESIGN A6.6). */
  craft(s: SaveDoc, id: string, c: CompiledContent): Result<SaveDoc>;
  validatePlan(plan: SaveDoc['warPlans'][number], s: SaveDoc, c: CompiledContent, format: FormatId): PlanIssue[];
  autoFill(s: SaveDoc, c: CompiledContent): SaveDoc['warPlans'][number];
  equipNow(s: SaveDoc, card: CardId, c: CompiledContent): SaveDoc;
  /** Trophy Road (DESIGN A6.3). */
  claimRoadNode(s: SaveDoc, trophies: number, c: CompiledContent, clock: Clock): Result<SaveDoc>;
  /** Matchmaking against the AI ladder (DESIGN A6.8). */
  pickOpponent(
    s: SaveDoc,
    mode: MatchResultInput['mode'],
    c: CompiledContent,
    clock: Clock,
    o?: { format?: FormatId; conquestGeneral?: string; skirmish?: SkirmishOptions },
  ): OpponentSpec;
  /** Charges, daily capsule, quests reset at 04:00. */
  tickTimers(s: SaveDoc, clock: Clock): SaveDoc;
}
