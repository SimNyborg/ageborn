/**
 * What a bot remembers between decisions, built only from the observations it was handed (DESIGN A7.1).
 *
 * - Own timers a player keeps in their head: when Evolve became available, when the base last took
 *   damage, when a ground unit last passed mid-lane (the A7.2 attack clock).
 * - The enemy composition seen recently (A7.3 "Remembers composition") and when the foe last evolved.
 * - The foe gold estimate (estimate.ts).
 */
import type { CardId, Observation } from '@/contracts';
import { BP, PPM, TICKS_PER_SECOND } from '@/core';
import type { CardBook } from './book';
import { FoeGoldEstimator } from './estimate';

/** How long a remembered enemy card stays in the composition memory. */
const COMPOSITION_MEMORY_TICKS = 45 * TICKS_PER_SECOND;

export interface RememberedCard {
  card: CardId;
  /** Most copies seen alive at once while remembered. */
  count: number;
  lastTick: number;
}

/**
 * Evolve is available as far as the observation shows (A2.4): XP ≥ threshold, not in the format's final
 * age. The observation has no "final age" flag; in the final age XP is measured against the Overcharge
 * amount and converts to charge while the charge is below 100%, so `xpBp` never exceeds 10,000 there and
 * reaches it only with a full charge. Above 10,000, or at 10,000 with charge to spare, is proof enough.
 */
export function evolveVisible(obs: Observation): boolean {
  return obs.me.xpBp > BP || (obs.me.xpBp === BP && obs.me.powerPpm < PPM);
}

export class BotMemory {
  readonly estimator: FoeGoldEstimator;
  lastObsTick = -1;
  /** Tick Evolve was first seen available in the current age, or null. */
  evolveSince: number | null = null;
  private evolveAge = -1;
  /** Last tick the own base lost HP (age changes rescale HP and are ignored). */
  baseDamagedTick = -1000000;
  private lastBaseBp = BP;
  private lastAge = 0;
  /** Last tick one of the bot's ground units stood past mid-lane (A7.2 attack clock). */
  pastMidTick = 0;
  /** Tick the foe's age last went up. */
  foeEvolvedTick = -1000000;
  private foeAge = 0;
  /** Enemy cards seen recently. */
  readonly composition = new Map<CardId, RememberedCard>();
  /** Own base HP (bp) of the last second of observations, oldest first. */
  private readonly baseTrail: number[] = [];

  constructor(private readonly book: CardBook) {
    this.estimator = new FoeGoldEstimator(book);
  }

  /** Folds a new observation in. Repeated observations of the same tick are ignored. */
  observe(obs: Observation): void {
    if (obs.tick <= this.lastObsTick) return;
    this.lastObsTick = obs.tick;
    const me = obs.me;

    if (evolveVisible(obs)) {
      if (this.evolveSince === null || this.evolveAge !== me.ageIndex) this.evolveSince = obs.tick;
      this.evolveAge = me.ageIndex;
    } else {
      this.evolveSince = null;
    }

    if (me.ageIndex === this.lastAge && me.baseHpBp < this.lastBaseBp) this.baseDamagedTick = obs.tick;
    this.baseTrail.push(me.baseHpBp);
    if (this.baseTrail.length > TICKS_PER_SECOND + 1) this.baseTrail.shift();
    this.lastBaseBp = me.baseHpBp;
    this.lastAge = me.ageIndex;

    if (obs.foe.ageIndex > this.foeAge) this.foeEvolvedTick = obs.tick;
    this.foeAge = obs.foe.ageIndex;

    const mid = this.book.econ.midLane;
    const counts = new Map<CardId, number>();
    for (const u of obs.units) {
      if (u.hp <= 0) continue;
      if (u.side === obs.side) {
        if (!u.air && u.p > mid) this.pastMidTick = obs.tick;
      } else {
        counts.set(u.card, (counts.get(u.card) ?? 0) + 1);
      }
    }
    for (const [card, n] of counts) {
      const prev = this.composition.get(card);
      this.composition.set(card, { card, count: Math.max(n, prev?.count ?? 0), lastTick: obs.tick });
    }
    for (const [card, r] of this.composition) {
      if (obs.tick - r.lastTick > COMPOSITION_MEMORY_TICKS) this.composition.delete(card);
    }

    this.estimator.observe(obs);
  }

  /** Own base HP lost over the last second of observations, bp per tick (0 when not falling). */
  baseLossPerTick(): number {
    const n = this.baseTrail.length;
    if (n < 2) return 0;
    const lost = (this.baseTrail[0] as number) - (this.baseTrail[n - 1] as number);
    return lost > 0 ? Math.ceil(lost / (n - 1)) : 0;
  }

  /** The remembered enemy composition, sorted by card id. */
  remembered(): RememberedCard[] {
    return [...this.composition.values()].sort((a, b) => (a.card < b.card ? -1 : a.card > b.card ? 1 : 0));
  }
}
