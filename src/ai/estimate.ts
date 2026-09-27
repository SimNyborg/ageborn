/**
 * The foe gold estimator (DESIGN A7.1): bots never see the opponent's gold, so they estimate it from
 * time, the visible Treasury level and kills, minus what they saw the opponent spend (units that
 * walked out, turrets, mounts implied by turrets, Treasury levels).
 *
 * Everything comes from the observation stream, so a human watching the same screen could keep the
 * same tally. The estimate over-counts gold sitting in the foe's (invisible) training queue; that is
 * the honest price of not seeing it.
 */
import type { CardId, Observation } from '@/contracts';
import { BP, TICKS_PER_SECOND } from '@/core';
import type { CardBook } from './book';

/** Seconds after a foe ageUp during which new foe Infantry is assumed to be the free Vanguard. */
const VANGUARD_WINDOW_TICKS = 3 * TICKS_PER_SECOND;
/** Foe units that appear this soon after a foe paradrop telegraph are assumed summoned. */
const PARADROP_WINDOW_TICKS = 4 * TICKS_PER_SECOND;

export class FoeGoldEstimator {
  /** Estimated foe gold, milli. */
  gold: number;
  /** Total income and spending seen so far (milli), for the dev viewer. */
  income = 0;
  spent = 0;
  private lastTick = 0;
  private readonly seenFoe = new Set<number>();
  private myAlive = new Map<number, CardId>();
  private foeTreasury = 0;
  private foeTurrets: (CardId | null)[] = [];
  /** Mounts the foe must own, implied by the highest mount holding a turret (mount 0 is free). */
  private foeMounts = 1;
  private foeAgeIndex = 0;
  private foeAgeUpTick = -1000000;
  private vanguardLeft = 0;
  private paradropTick = -1000000;
  private paradropCard: CardId = '';
  private powerCastTick = -1000000;

  constructor(private readonly book: CardBook) {
    this.gold = book.econ.startGold;
  }

  /** Folds one observation into the estimate. Call once per new observation tick, in order. */
  observe(obs: Observation): void {
    const b = this.book;
    const dt = obs.tick - this.lastTick;
    if (dt > 0) {
      // Passive income: base (×2 in Overdrive and Siege) plus Treasury (never doubled), A2.3.
      let perSec = b.econ.passiveGoldPerSec;
      if (obs.phase === 'overdrive' || obs.phase === 'siege') perSec = Math.trunc((perSec * b.econ.overdriveGoldBp) / BP);
      perSec += obs.foe.treasury * b.econ.treasuryGoldPerSecMilli;
      this.earn(Math.trunc((perSec * dt) / TICKS_PER_SECOND));
      this.lastTick = obs.tick;
    }

    // Foe power casts (visible telegraphs): kills during them pay 30% (A2.9); paradrops summon units.
    for (const t of obs.telegraphs) {
      if (t.side === obs.side) continue;
      this.powerCastTick = obs.tick;
      const def = b.powers[t.power];
      if (def?.effect.kind === 'paradrop') {
        this.paradropTick = obs.tick;
        this.paradropCard = def.effect.card;
      }
    }

    // Foe ageUp: the next Vanguard Infantry are free (A2.4).
    if (obs.foe.ageIndex > this.foeAgeIndex) {
      this.foeAgeIndex = obs.foe.ageIndex;
      this.foeAgeUpTick = obs.tick;
      this.vanguardLeft = b.econ.vanguardCount;
    }

    // Treasury levels bought.
    while (this.foeTreasury < obs.foe.treasury) {
      this.spend(b.econ.treasuryCosts[this.foeTreasury] ?? 0);
      this.foeTreasury += 1;
    }

    // Turrets built or modernised, and the mounts they imply.
    obs.foe.turrets.forEach((t, m) => {
      const prev = this.foeTurrets[m] ?? null;
      const card = t?.card ?? null;
      if (card === prev) return;
      this.foeTurrets[m] = card;
      if (!card) return;
      const cost = b.turrets[card]?.cost ?? 0;
      const credit = prev ? Math.trunc(((b.turrets[prev]?.cost ?? 0) * b.econ.sellRefundBp) / BP) : 0;
      this.spend(Math.max(0, cost - credit));
      while (this.foeMounts <= m) {
        this.spend(b.econ.mountCosts[this.foeMounts] ?? 0);
        this.foeMounts += 1;
      }
    });

    // Units: new foe units were paid for (except summons); own units that vanished paid a bounty.
    const nowAlive = new Map<number, CardId>();
    for (const u of obs.units) {
      if (u.side === obs.side) {
        if (u.hp > 0) nowAlive.set(u.id, u.card);
        continue;
      }
      if (this.seenFoe.has(u.id)) continue;
      this.seenFoe.add(u.id);
      const card = b.units[u.card];
      if (!card) continue;
      if (this.vanguardLeft > 0 && card.group === 'infantry' && obs.tick - this.foeAgeUpTick <= VANGUARD_WINDOW_TICKS) {
        this.vanguardLeft -= 1;
        continue;
      }
      if (u.card === this.paradropCard && obs.tick - this.paradropTick <= PARADROP_WINDOW_TICKS) continue;
      this.spend(card.cost);
    }
    for (const [id, cardId] of this.myAlive) {
      if (nowAlive.has(id)) continue;
      const card = b.units[cardId];
      if (!card) continue;
      const bp = obs.tick - this.powerCastTick <= PARADROP_WINDOW_TICKS ? b.econ.powerKillGoldBp : b.econ.bountyGoldBp;
      this.earn(Math.trunc((card.cost * bp) / BP));
    }
    this.myAlive = nowAlive;
  }

  private earn(milli: number): void {
    this.income += milli;
    this.gold += milli;
  }

  private spend(milli: number): void {
    this.spent += milli;
    this.gold = Math.max(0, this.gold - milli);
  }
}
