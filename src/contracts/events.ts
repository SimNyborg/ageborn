/**
 * Simulation events (DESIGN B15 `events.ts`).
 *
 * `sim.step()` returns the events of that tick. The render event mapper (DESIGN B6) turns them into
 * clips, feel and sound; `sim/stats.ts` reduces them to `MatchStats` (DESIGN B3 Match stats).
 * Views must never need anything beyond events and read-only state to animate (DESIGN B5: the sim owns timing).
 */
import type { AbilityDef, StatusKind } from './content';
import type { Command } from './commands';
import type { AgeId, CardId, DmgType, EmoteId, Side, VisualId } from './ids';

/** What dealt the killing blow; decides bounty rules (DESIGN A2.3, A2.4). */
export type KillerKind = 'unit' | 'turret' | 'power' | 'lastStand' | 'ability' | 'decay';

type EventBody =
  | { e: 'unitSpawned'; id: number; side: Side; card: CardId; x: number; summoned: boolean; level: number }
  /** The view time-scales the attack clip so `impactAt` lands after `windupTicks` (DESIGN B5). */
  | { e: 'attackStarted'; id: number; targetId: number; windupTicks: number; attackIndex: number }
  | { e: 'projectileFired'; pid: number; from: number; targetId: number; toX: number; travelTicks: number; visualId: VisualId }
  | {
      e: 'hit';
      targetId: number;
      sourceId: number;
      sourceCard: CardId;
      castId: number | null;
      sourceKind: KillerKind;
      damage: number;
      shieldAbsorbed: number;
      heavy: boolean;
      modBp: number;
      x: number;
      dmgType: DmgType;
    }
  | { e: 'healed'; id: number; amount: number }
  | { e: 'statusApplied'; id: number; kind: StatusKind; ms: number; frozen: boolean }
  | { e: 'knockback'; id: number; fromX: number; toX: number }
  | { e: 'abilityUsed'; id: number; ability: AbilityDef['kind']; x: number }
  | {
      e: 'died';
      id: number;
      side: Side;
      card: CardId;
      killerId: number | null;
      killerCard: CardId | null;
      killerKind: KillerKind | null;
      killerSide: Side | null;
      bountyGold: number;
      bountyXp: number;
      x: number;
    }
  | { e: 'turretBuildStart' | 'turretBuilt' | 'turretSold' | 'turretReplaced'; side: Side; mount: number; card: CardId }
  | { e: 'turretFired'; side: Side; mount: number; targetId: number }
  | { e: 'baseDamaged'; side: Side; sourceId: number | null; damage: number; hp: number; maxHp: number }
  | { e: 'goldEarned'; side: Side; amount: number; reason: 'bounty' | 'passive'; x?: number }
  | { e: 'xpEarned'; side: Side; amount: number; reason: 'passive' | 'kill' | 'loss' | 'base' }
  | { e: 'queueChanged'; side: Side }
  /** Queue conversion on evolve (DESIGN A2.4). */
  | { e: 'queueConverted'; side: Side; from: CardId; to: CardId }
  | { e: 'mountBought'; side: Side; mount: number }
  | { e: 'treasuryUp'; side: Side; level: number }
  /** Ascension start and end (DESIGN A2.4). */
  | { e: 'ascendStart' | 'ageUp'; side: Side; age: AgeId }
  | { e: 'powerReady'; side: Side }
  /** 1.0 s telegraph visible to both sides (DESIGN A2.9). */
  | { e: 'powerTelegraph'; side: Side; power: CardId; castId: number; x: number; zone: number }
  | { e: 'powerImpact'; side: Side; power: CardId; castId: number; x: number; index: number }
  | { e: 'stanceChanged'; side: Side; stance: 'charge' | 'hold' }
  /** Last Stand lifecycle (DESIGN A2.11). */
  | { e: 'lastStandArmed' | 'lastStandCharge' | 'lastStandFire'; side: Side }
  | { e: 'phaseChanged'; phase: 'regulation' | 'overdrive' | 'siege' }
  | { e: 'emote'; side: Side; emote: EmoteId }
  | { e: 'commandRejected'; side: Side; t: Command['t']; reason: string }
  | { e: 'matchEnded'; result: MatchOutcome };

/** One simulation event, stamped with the tick it happened on. */
export type SimEvent = EventBody & { tick: number };

/**
 * How a match ended (DESIGN A2.10). `winner` null = draw (both bases on one tick, or a Final Bell gap
 * ≤ 50 bp). Retreat counts as a loss.
 */
export interface MatchOutcome {
  winner: Side | null;
  reason: 'baseDestroyed' | 'bothDestroyed' | 'finalBell' | 'retreat';
  tick: number;
  baseHpBp: [number, number];
}
