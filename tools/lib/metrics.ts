/**
 * Per-match metrics for the balance tools, reduced from the `SimEvent` stream (DESIGN B3 events,
 * A2.14 metrics): evolve timings, kills by killer kind (turret share), damage and gold per card
 * (damage per gold), power casts and hits (coverage), rejected commands, and the outcome.
 *
 * The reducer is pure: the same events give the same summary, so worker threads can return compact
 * summaries instead of event logs. Units follow B3: damage in centi-HP, positions in milli-lu.
 */
import type { AgeId, CardId, CompiledContent, FormatId, KillerKind, MatchOutcome, Side, SimEvent } from '../../src/contracts';

export type KillKind = KillerKind | 'other';

export interface SideStats {
  /** Tick of every `ascendStart` (the moment Evolve is pressed), in order. */
  evolveTicks: number[];
  /** Tick of every `ageUp`, keyed by the age reached. */
  ageUpTicks: Partial<Record<AgeId, number>>;
  /** Enemy units this side killed, by killer kind. */
  kills: Record<KillKind, number>;
  /** Own units lost (summons included). */
  lost: number;
  /** Units trained (non-summoned spawns) per card. */
  trained: Record<CardId, number>;
  /** Gold spent per card, whole gold, net of turret sell refunds. */
  spent: Record<CardId, number>;
  /** Damage dealt per card (centi-HP) to enemy units and the enemy base; powers and Last Stand included. */
  damage: Record<CardId, number>;
  /** Damage dealt to the enemy base (centi-HP). */
  baseDamage: number;
  /** Per cast power: casts and distinct enemy units hit. */
  powers: Record<CardId, { casts: number; unitsHit: number }>;
  /** `commandRejected` events by reason. */
  rejected: Record<string, number>;
  treasury: number;
  lastStandFired: boolean;
  /** Most trained units alive at once (summons excluded). */
  maxUnitsAlive: number;
}

export interface MatchSummary {
  seed: number;
  format: FormatId;
  winner: Side | null;
  reason: MatchOutcome['reason'] | 'timeout';
  ticks: number;
  finalBell: boolean;
  baseHpBp: [number, number];
  /** Final state hash (determinism checks). */
  hash: number;
  sides: [SideStats, SideStats];
}

function emptySide(): SideStats {
  return {
    evolveTicks: [],
    ageUpTicks: {},
    kills: { unit: 0, turret: 0, power: 0, lastStand: 0, ability: 0, decay: 0, other: 0 },
    lost: 0,
    trained: {},
    spent: {},
    damage: {},
    baseDamage: 0,
    powers: {},
    rejected: {},
    treasury: 0,
    lastStandFired: false,
    maxUnitsAlive: 0,
  };
}

function add(rec: Record<string, number>, key: string, n: number): void {
  rec[key] = (rec[key] ?? 0) + n;
}

const other = (s: Side): Side => (s === 0 ? 1 : 0);

/** Folds events into per-side stats. Feed every tick's events in order, then call `summary`. */
export class MatchTally {
  readonly sides: [SideStats, SideStats] = [emptySide(), emptySide()];
  private readonly unitSide = new Map<number, Side>();
  private readonly unitCard = new Map<number, CardId>();
  private readonly trainedIds = new Set<number>();
  private readonly alive: [number, number] = [0, 0];
  private readonly castInfo = new Map<number, { side: Side; power: CardId; hit: Set<number> }>();
  private readonly mounts: [(CardId | null)[], (CardId | null)[]] = [[null, null, null, null], [null, null, null, null]];
  private readonly refundBp: number;

  constructor(private readonly content: CompiledContent) {
    this.refundBp = content.economy.sellRefundBp;
  }

  private turretCost(card: CardId | null | undefined): number {
    return card ? (this.content.turrets[card]?.cost ?? 0) : 0;
  }

  push(events: readonly SimEvent[]): void {
    for (const e of events) this.one(e);
  }

  private one(e: SimEvent): void {
    switch (e.e) {
      case 'unitSpawned': {
        this.unitSide.set(e.id, e.side);
        this.unitCard.set(e.id, e.card);
        if (!e.summoned) {
          this.trainedIds.add(e.id);
          const s = this.sides[e.side];
          add(s.trained, e.card, 1);
          add(s.spent, e.card, this.content.units[e.card]?.cost ?? 0);
          this.alive[e.side] += 1;
          if (this.alive[e.side] > s.maxUnitsAlive) s.maxUnitsAlive = this.alive[e.side];
        }
        break;
      }
      case 'died': {
        this.sides[e.side].lost += 1;
        if (this.trainedIds.delete(e.id)) this.alive[e.side] = Math.max(0, this.alive[e.side] - 1);
        if (e.killerSide !== null) {
          const kind: KillKind = e.killerKind ?? 'other';
          this.sides[e.killerSide].kills[kind] += 1;
        }
        break;
      }
      case 'hit': {
        const targetSide = this.unitSide.get(e.targetId);
        if (targetSide === undefined) break;
        const by = this.sides[other(targetSide)];
        add(by.damage, e.sourceCard, e.damage);
        if (e.castId !== null) this.castInfo.get(e.castId)?.hit.add(e.targetId);
        break;
      }
      case 'baseDamaged': {
        if (e.sourceId === null) break; // Siege decay
        const by = this.sides[other(e.side)];
        by.baseDamage += e.damage;
        const card = this.unitCard.get(e.sourceId);
        if (card) add(by.damage, card, e.damage);
        break;
      }
      case 'ascendStart':
        this.sides[e.side].evolveTicks.push(e.tick);
        break;
      case 'ageUp':
        this.sides[e.side].ageUpTicks[e.age] = e.tick;
        break;
      case 'turretBuildStart': {
        this.mounts[e.side][e.mount] = e.card;
        add(this.sides[e.side].spent, e.card, this.turretCost(e.card));
        break;
      }
      case 'turretReplaced': {
        const old = this.mounts[e.side][e.mount];
        const credit = Math.trunc((this.turretCost(old) * this.refundBp) / 10000);
        this.mounts[e.side][e.mount] = e.card;
        add(this.sides[e.side].spent, e.card, Math.max(0, this.turretCost(e.card) - credit));
        break;
      }
      case 'turretSold': {
        const old = this.mounts[e.side][e.mount] ?? e.card;
        this.mounts[e.side][e.mount] = null;
        add(this.sides[e.side].spent, old, -Math.trunc((this.turretCost(old) * this.refundBp) / 10000));
        break;
      }
      case 'powerTelegraph': {
        this.castInfo.set(e.castId, { side: e.side, power: e.power, hit: new Set() });
        const rec = (this.sides[e.side].powers[e.power] ??= { casts: 0, unitsHit: 0 });
        rec.casts += 1;
        break;
      }
      case 'treasuryUp':
        this.sides[e.side].treasury = e.level;
        break;
      case 'lastStandFire':
        this.sides[e.side].lastStandFired = true;
        break;
      case 'commandRejected':
        add(this.sides[e.side].rejected, e.reason, 1);
        break;
      default:
        break;
    }
  }

  /** The summary; `outcome` null means the match hit the tick limit. */
  summary(o: { seed: number; format: FormatId; outcome: MatchOutcome | null; ticks: number; hash: number }): MatchSummary {
    for (const c of this.castInfo.values()) {
      const rec = this.sides[c.side].powers[c.power];
      if (rec) rec.unitsHit += c.hit.size;
    }
    this.castInfo.clear();
    const out = o.outcome;
    return {
      seed: o.seed,
      format: o.format,
      winner: out ? out.winner : null,
      reason: out ? out.reason : 'timeout',
      ticks: o.ticks,
      finalBell: out?.reason === 'finalBell',
      baseHpBp: out ? [out.baseHpBp[0], out.baseHpBp[1]] : [10000, 10000],
      hash: o.hash,
      sides: this.sides,
    };
  }
}

/** Score of a side in one match: win 1, draw 0.5, loss 0. */
export function scoreOf(m: Pick<MatchSummary, 'winner'>, side: Side): number {
  if (m.winner === null) return 0.5;
  return m.winner === side ? 1 : 0;
}

/** Total kills by kind over both sides. */
export function totalKills(m: MatchSummary): Record<KillKind, number> {
  const out = emptySide().kills;
  for (const s of m.sides) for (const k of Object.keys(out) as KillKind[]) out[k] += s.kills[k];
  return out;
}
