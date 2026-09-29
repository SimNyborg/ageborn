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
  /** Economy level (Economy research picks done; the Treasury before A18.5.4). */
  treasury: number;
  /** War Council (A18.5): picks started, in order; gold spent net of cancel refunds (whole); picks done. */
  research: string[];
  researchGold: number;
  researchDone: number;
  /** Gold earned in the match (start gold, passive income and bounties), whole. */
  goldEarned: number;
  /** Stance changes (A18.4.2; the stance toggler proxy). */
  stanceChanges: number;
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
  /** Tick of the first unit-on-unit hit (A17.14 "first clash"), null if none. */
  firstClashTick: number | null;
  /**
   * Once-a-second samples of the contact point, the midpoint of the two ground fronts (A17.14): seconds
   * with a contact point (both sides have ground units) and those whose contact lies between the two
   * turret covers (p 480 to L − 480).
   */
  contact: { samples: number; middle: number };
}

/** A ground unit as the contact sampler needs it (a subset of the sim's `UnitState`). */
export interface LaneUnit {
  side: Side;
  x: number;
  hp: number;
  air: boolean;
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
    research: [],
    researchGold: 0,
    researchDone: 0,
    goldEarned: 0,
    stanceChanges: 0,
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
  private firstClash: number | null = null;
  private readonly contact = { samples: 0, middle: 0 };

  constructor(private readonly content: CompiledContent) {
    this.refundBp = content.economy.sellRefundBp;
    for (const s of this.sides) s.goldEarned = content.economy.startGold;
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
        if (this.firstClash === null && e.sourceKind === 'unit' && e.castId === null) this.firstClash = e.tick;
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
      case 'researchStarted': {
        const s = this.sides[e.side];
        s.research.push(e.pick);
        s.researchGold += e.cost / 1000;
        break;
      }
      case 'researchCancelled': {
        const s = this.sides[e.side];
        s.researchGold -= e.refund / 1000;
        s.research = s.research.filter((p, i, a) => !(p === e.pick && i === a.lastIndexOf(e.pick)));
        break;
      }
      case 'researchDone':
        this.sides[e.side].researchDone += 1;
        break;
      case 'goldEarned':
        this.sides[e.side].goldEarned += e.amount / 1000;
        break;
      case 'stanceChanged':
        this.sides[e.side].stanceChanges += 1;
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

  /**
   * One contact sample (call once a second): the midpoint of the two ground fronts, in lane mlu from side
   * 0's gate, counts as "middle" between the turret covers (`coverMlu` from each gate).
   */
  sampleContact(units: readonly LaneUnit[], laneMlu: number, coverMlu: number): void {
    let f0 = -1;
    let f1 = -1;
    for (const u of units) {
      if (u.air || u.hp <= 0) continue;
      if (u.side === 0) f0 = Math.max(f0, u.x);
      else f1 = Math.max(f1, laneMlu - u.x);
    }
    if (f0 < 0 || f1 < 0) return;
    const c = (f0 + laneMlu - f1) / 2;
    this.contact.samples += 1;
    if (c >= coverMlu && c <= laneMlu - coverMlu) this.contact.middle += 1;
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
      firstClashTick: this.firstClash,
      contact: { ...this.contact },
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
