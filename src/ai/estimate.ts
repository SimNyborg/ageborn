/**
 * The foe gold estimator (DESIGN A7.1): bots never see the opponent's gold, so they estimate it from
 * time, the visible Economy research and kills, minus what they saw the opponent spend (units that
 * walked out, turrets, mounts implied by turrets, research items, which are public: A18.5.1).
 *
 * Everything comes from the observation stream, so a human watching the same screen could keep the
 * same tally:
 *
 * - income: passive gold (×2 in Overdrive and Siege) plus Economy research income (never doubled), A18.5.4;
 * - kills: 60% of the victim's cost, 30% while a foe power or Last Stand is hitting, +50% underdog
 *   when the victim's card age is above the foe's age and the foe's Evolve is not available;
 * - summons (Vanguard after an ageUp, Paratroopers after a paradrop telegraph, riders after their
 *   mount falls) cost nothing and pay no bounty, on either side (A2.3 "Summoned units");
 * - spending: research at list price, turrets (modernising gets 50% of the old price back), the mounts a
 *   turret implies, units that appear on the lane; a sold turret refunds 50%.
 *
 * The estimate over-counts gold sitting in the foe's (invisible) training queue; that is the honest
 * price of not seeing it. Daily modifiers are not observable and are not modelled.
 */
import type { CardId, Observation, RoleGroup } from '@/contracts';
import { BP, MILLI, TICKS_PER_SECOND, incomeMilliPerSec, researchCost, researchPick } from '@/core';
import type { CardBook, UnitCard } from './book';

/** Seconds after an ageUp during which new Infantry of that side is assumed to be the free Vanguard. */
const VANGUARD_WINDOW_TICKS = 3 * TICKS_PER_SECOND;
/** Paratroopers land at the telegraph's impact; units of the card this soon after it are summoned. */
const PARADROP_WINDOW_TICKS = 2 * TICKS_PER_SECOND;
/** Riders appear where their mount fell, in the same step. */
const RIDERS_WINDOW_TICKS = TICKS_PER_SECOND;
/** Own units lost this long after a damaging foe power's impact count as power kills (30%). */
const POWER_KILL_WINDOW_TICKS = 4 * TICKS_PER_SECOND;
/** Own units lost this long after the foe's Last Stand started charging count as Last Stand kills. */
const LAST_STAND_WINDOW_TICKS = 2 * TICKS_PER_SECOND;

/** Units a side will get for free soon: a card, or any card of a role group. */
interface Expected {
  card: CardId | null;
  group: RoleGroup | null;
  left: number;
  until: number;
}

/** Free units each side is expecting, matched against the units that appear. */
class SummonWatch {
  private items: Expected[] = [];

  expect(e: Expected): void {
    if (e.left > 0) this.items.push(e);
  }

  /** True when a unit of `card` appearing at `tick` is an expected summon (and uses that slot). */
  take(card: UnitCard, tick: number): boolean {
    this.items = this.items.filter((e) => e.left > 0 && tick <= e.until);
    const hit = this.items.find((e) => e.card === card.id || (e.card === null && e.group === card.group));
    if (!hit) return false;
    hit.left -= 1;
    return true;
  }
}

export class FoeGoldEstimator {
  /** Estimated foe gold, milli. */
  gold: number;
  /** Total income and spending seen so far (milli), for the dev viewer. */
  income = 0;
  spent = 0;
  private lastTick = 0;
  private readonly seen = new Set<number>();
  /** Own summoned units: they pay the foe no bounty. */
  private readonly mySummons = new Set<number>();
  private alive = new Map<number, { card: CardId; mine: boolean }>();
  private readonly summons: [SummonWatch, SummonWatch] = [new SummonWatch(), new SummonWatch()];
  private readonly telegraphs = new Set<string>();
  /** Foe research items seen starting (research is public, A18.5.1). */
  private readonly foeResearch = new Set<string>();
  private foeTurrets: (CardId | null)[] = [];
  /** Mounts the foe must own, implied by the highest mount holding a turret (mount 0 is free). */
  private foeMounts = 1;
  private ages: [number, number] = [0, 0];
  /** Until this tick, own losses are foe power or Last Stand kills (30%). */
  private powerKillUntil = -1000000;

  constructor(private readonly book: CardBook) {
    this.gold = book.econ.startGold;
  }

  /** Folds one observation into the estimate. Call once per new observation tick, in order. */
  observe(obs: Observation): void {
    const b = this.book;
    const me = obs.side;
    const foe = me === 0 ? 1 : 0;
    const dt = obs.tick - this.lastTick;
    if (dt > 0) {
      let perSec = b.econ.passiveGoldPerSec;
      if (obs.phase === 'overdrive' || obs.phase === 'siege') perSec = Math.trunc((perSec * b.econ.overdriveGoldBp) / BP);
      // Economy research income, never doubled (A18.5.4).
      perSec += incomeMilliPerSec(b.content, obs.foe.research?.owned ?? []);
      this.earn(Math.trunc((perSec * dt) / TICKS_PER_SECOND));
      this.lastTick = obs.tick;
    }

    // Power telegraphs (both sides): paradrops announce summons; foe powers make kills pay 30%.
    for (const t of obs.telegraphs) {
      const key = `${t.side}:${t.power}:${t.impactTick}`;
      if (this.telegraphs.has(key)) continue;
      this.telegraphs.add(key);
      const def = b.powers[t.power];
      const fx = def?.effect;
      const damaging = fx?.kind === 'barrage' || fx?.kind === 'sweep' || fx?.kind === 'stampede' || fx?.kind === 'field' || fx?.kind === 'strike';
      if (t.side !== me && damaging) this.powerKillUntil = Math.max(this.powerKillUntil, t.impactTick + POWER_KILL_WINDOW_TICKS);
      // A2.9.2: every foe cast was paid in gold (list price; Power Hour and research discounts ignored).
      if (t.side !== me && def) this.spend(def.cost * MILLI);
      if (fx?.kind === 'paradrop') {
        this.summons[t.side].expect({ card: fx.card, group: null, left: fx.count, until: t.impactTick + PARADROP_WINDOW_TICKS });
      }
    }
    if (obs.foe.lastStand === 'charging') this.powerKillUntil = Math.max(this.powerKillUntil, obs.tick + LAST_STAND_WINDOW_TICKS);

    // ageUps: the next Vanguard Infantry of that side are free (A2.4).
    const ages: [number, number] = me === 0 ? [obs.me.ageIndex, obs.foe.ageIndex] : [obs.foe.ageIndex, obs.me.ageIndex];
    for (const s of [0, 1] as const) {
      if (ages[s] > this.ages[s]) {
        this.summons[s].expect({ card: null, group: 'infantry', left: b.econ.vanguardCount, until: obs.tick + VANGUARD_WINDOW_TICKS });
      }
    }
    this.ages = ages;

    // Research started (public, A18.5.1), at list price; the −20% underdog discount is ignored.
    const cur = obs.foe.research?.current ?? null;
    for (const id of [...(obs.foe.research?.owned ?? []), ...(cur ? [cur] : [])]) {
      if (this.foeResearch.has(id)) continue;
      this.foeResearch.add(id);
      const p = researchPick(b.content, id);
      if (p) this.spend(researchCost(b.content, p) * MILLI);
    }

    // Turrets built, modernised or sold, and the mounts they imply.
    obs.foe.turrets.forEach((t, m) => {
      const prev = this.foeTurrets[m] ?? null;
      const card = t?.card ?? null;
      if (card === prev) return;
      this.foeTurrets[m] = card;
      const prevCost = prev ? (b.turrets[prev]?.cost ?? 0) : 0;
      const credit = Math.trunc((prevCost * b.econ.sellRefundBp) / BP);
      if (!card) {
        this.earn(credit);
        return;
      }
      this.spend(Math.max(0, (b.turrets[card]?.cost ?? 0) - credit));
      while (this.foeMounts <= m) {
        this.spend(b.econ.mountCosts[this.foeMounts] ?? 0);
        this.foeMounts += 1;
      }
    });

    // Losses first, so riders that fall off a dead mount this step are expected before they appear.
    const nowAlive = new Map<number, { card: CardId; mine: boolean }>();
    for (const u of obs.units) if (u.hp > 0) nowAlive.set(u.id, { card: u.card, mine: u.side === me });
    for (const [id, u] of this.alive) {
      if (nowAlive.has(id)) continue;
      const card = b.units[u.card];
      if (!card) continue;
      if (card.riders) {
        this.summons[u.mine ? me : foe].expect({ card: card.riders.card, group: null, left: card.riders.count, until: obs.tick + RIDERS_WINDOW_TICKS });
      }
      if (!u.mine || this.mySummons.delete(id)) continue;
      this.earn(this.bounty(card, obs));
    }
    this.alive = nowAlive;

    // New units: the foe paid for its own unless they are summons; own summons are remembered.
    for (const u of obs.units) {
      if (u.hp <= 0 || this.seen.has(u.id)) continue;
      this.seen.add(u.id);
      const card = b.units[u.card];
      if (!card) continue;
      const free = this.summons[u.side].take(card, obs.tick);
      if (u.side === me) {
        if (free) this.mySummons.add(u.id);
      } else if (!free) {
        this.spend(card.cost);
      }
    }
  }

  /** The foe's bounty for one of the bot's units (A2.3): 60%, 30% for power kills, +50% underdog. */
  private bounty(card: UnitCard, obs: Observation): number {
    const e = this.book.econ;
    // Bounty Hunters raise the foe's bounty rate (A18.5.4).
    let rate = e.bountyGoldBp;
    for (const id of obs.foe.research?.owned ?? []) {
      for (const fx of researchPick(this.book.content, id)?.effects ?? []) if (fx.kind === 'bounty') rate += fx.addBp;
    }
    let gold = Math.trunc((card.cost * (obs.tick <= this.powerKillUntil ? e.powerKillGoldBp : rate)) / BP);
    // The foe's Evolve is available from a full XP bar (in its final age no card can out-age it).
    const foeAge = obs.ages?.[obs.foe.ageIndex];
    const foeAgeIndex = foeAge ? this.book.ageOrder.indexOf(foeAge) : obs.foe.ageIndex;
    if (card.ageIndex > foeAgeIndex && obs.foe.xpBp < BP) gold = Math.trunc((gold * (BP + e.underdogBp)) / BP);
    return gold;
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
