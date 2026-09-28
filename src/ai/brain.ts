/**
 * The utility brain (DESIGN A7.2). Each decision it scores every legal action from the bot's view,
 * then takes the best one, or, with the tier's mistake rate, a plausible human error.
 *
 * | Action | Score (A7.2) |
 * |---|---|
 * | Train card c | 1.0 · f_counter(c) + 0.6 · m_aggr · f_push + 0.4 · f_role(c) + 0.3 · m_legendary · [c is Legendary] + 0.3 · [banking and c's range ≥ 250] − 0.8 · f_save(c) |
 * | Build turret on an empty mount | m_turret · f_pressure · f_spare |
 * | Buy mount (all owned mounts filled) | 0.8 · m_turret · f_pressure · f_spare |
 * | Modernise | 0.8 · m_turret · [turret age < current age] · f_spare |
 * | Treasury | m_econ · [before 3:00] · [no enemy within 600 lu of own gate] · [level < tier max] · f_spare |
 * | Evolve | 1.2 when XP ≥ threshold and (no enemy ground unit within 300 lu of own gate, or m_greed ≥ 1.3), after the tier's evolve delay |
 * | Power | 1.0 when the best zone's enemy value ≥ tier threshold × m_patience, or own base took damage in the last 3 s and zone value ≥ 100; aim error applied |
 * | Stance | Hold when the tier allows it, myArmy < 0.7 × foeArmy and ≥ 2 turrets are built, or when the push gate fails; otherwise Charge |
 * | Last Stand | When armed and ≥ 4 enemies are within 450 lu |
 *
 * Plus the push gate, the attack clock, saving goals, the gold float target (A7.3), openings and the
 * personality rules (personalities.ts). The brain is deterministic given (view, memory, RNG, profile,
 * content); the little it keeps between decisions (saving goal, spending mode, opening progress, stance
 * dwell) is itself derived from earlier inputs. Rules the DESIGN leaves open are logged in
 * docs/decisions.md under WP3.
 */
import type { CardId, RoleGroup } from '@/contracts';
import { BP, LANE_MLU, MILLI, TICKS_PER_SECOND, chanceBp, clamp, msToTicks, pickWeighted, randRange, type Sfc32State } from '@/core';
import type { BotAction } from './actions';
import type { CardBook } from './book';
import {
  counterTargets,
  fCounter,
  PREDICT_FROM_XP_BP,
  sampleOfAge,
  sampleOfMemory,
  sampleOfUnits,
  type CounterContext,
} from './counters';
import type { BotMemory } from './memory';
import { pickMistake, type MistakeKind, type MistakeOptions } from './mistakes';
import { parseOpenings, resolveStep, type OpeningPlan } from './openings';
import type { Personality } from './personalities';
import {
  BANKING_RANGE,
  bestPowerZone,
  fPressure,
  fPush,
  fRole,
  fSpare,
  mulBp,
  PRESSURE_RADIUS,
  SCORE,
  TRAIN,
  type PowerZone,
} from './scoring';
import type { TierParams } from './tiers';
import { foeValueIn, type View, type WeightsBp } from './view';

/** A scored candidate action. */
export interface Scored {
  action: BotAction;
  /** Score in bp (10,000 = 1.0). */
  score: number;
}

/** What the bot is saving for; `amount` is milli-gold. */
export type SavingGoal = { kind: 'treasury'; amount: number } | { kind: 'legendary'; amount: number; card: CardId };

/** Why the chosen action was chosen. */
export type ChoiceReason = 'opening' | 'best' | 'mistake' | 'wait';

/** One decision, with the numbers behind it (for tests and the dev bot viewer). */
export interface DecisionTrace {
  tick: number;
  action: BotAction | null;
  reason: ChoiceReason;
  mistake: MistakeKind | null;
  /** The legal candidates, best first. */
  candidates: Scored[];
  myArmy: number;
  foeArmy: number;
  /** Push-gate defence value D (A7.2). */
  defence: number;
  pushOk: boolean;
  banking: boolean;
  goal: SavingGoal | null;
  spending: boolean;
  pressureBp: number;
  /** Estimated foe gold, whole gold. */
  foeGold: number;
  /** Attack-clock multiplier on train scores, bp. */
  clockBp: number;
}

export interface BrainConfig {
  book: CardBook;
  tier: TierParams;
  persona: Personality;
  weights: WeightsBp;
  /** Extra mistake rate from the profile, bp (added to the tier's rate). */
  mistakeBonusBp: number;
  openings: readonly string[];
}

/** "within 500 lu of their gate" (push gate). */
const GATE_ZONE = 500 * MILLI;
/** Push gate: each enemy turret counts as 300 gold of defence. */
const TURRET_DEFENCE = 300;
/** Treasury only while no enemy is within 600 lu of the own gate and before 3:00. */
const TREASURY_SAFE = 600 * MILLI;
const TREASURY_BEFORE_TICKS = 180 * TICKS_PER_SECOND;
/** A quiet-lane Treasury level must pay for itself by 6:00 (A2.3 payback 133 / 233 / 367 s). */
const TREASURY_PAYBACK_BY_TICKS = 360 * TICKS_PER_SECOND;
/** Evolve only while no enemy ground unit is within 300 lu of the own gate (unless greedy). */
const EVOLVE_SAFE = 300 * MILLI;
/** m_greed ≥ 1.3 ignores the evolve safety check. */
const GREEDY_BP = 13000;
/** Last Stand: ≥ 4 enemies within 450 lu. */
const LAST_STAND_FOES = 4;
/**
 * A manual Last Stand needs the base this far (bp) above the automatic trigger, plus twice the worst
 * burst of base damage seen over the bot's reaction time.
 */
const LAST_STAND_MARGIN_BP = 150;
/** Power: own base took damage in the last 3 s and zone value ≥ 100. */
const POWER_HURT_TICKS = 3 * TICKS_PER_SECOND;
const POWER_MIN_VALUE = 100;
/** X: any zone value when the own base is below 25%. */
const LOW_BASE_BP = 2500;
/** Tempest casts into the burst right after the foe evolves. */
const FOE_EVOLVE_WINDOW = 5 * TICKS_PER_SECOND;
/** Stance: Hold when myArmy < 0.7 × m_hold × foeArmy with ≥ 2 turrets. */
const HOLD_RATIO_BP = 7000;
const HOLD_MIN_TURRETS = 2;
/** Holding on a failed push gate needs a Hold weight of at least 20 (m_hold 0.7). */
const HOLD_ON_GATE_BP = 7000;
/** Attack clock: after 60 s without passing mid-lane, train scores +10% per 5 s (capped at ×3). */
const CLOCK_START = 60 * TICKS_PER_SECOND;
const CLOCK_STEP = 5 * TICKS_PER_SECOND;
const CLOCK_STEP_BP = 1000;
const CLOCK_MAX_BP = 30000;
/** Pop within this much of the cap counts as full for the push gate. */
const POP_FULL_MARGIN = 6;
/** Kettle's all-in starts at 80% of the XP threshold and adds this to train scores. */
const ALL_IN_XP_BP = 8000;
const ALL_IN_BONUS = 3000;
/** Pressure (bp) at which saving, floating and the opening give way to defence. */
const URGENT_PRESSURE_BP = 5000;
/** The opening is abandoned after 30 s. */
const OPENING_TICKS = 30 * TICKS_PER_SECOND;
/** A Commander's favourite card bonus. */
const FAVORITE_BONUS = 1500;
/** A "float gold" mistake: the bot forgets its tray for this long. */
const FLOAT_IDLE_TICKS = 3 * TICKS_PER_SECOND;
/** Mistake rate ceiling, bp (a bot always plays mostly on purpose). */
const MAX_MISTAKE_BP = 9000;
/** A saving goal's own action gets this bonus once affordable, bp of score. */
const GOAL_BONUS = 15000;
/** A bot keeps a stance at least this long before toggling again (on top of the 2 s cooldown). */
const STANCE_DWELL = 8 * TICKS_PER_SECOND;
/** Pressure (bp) from which a bot below its wanted turret count wants a turret or mount. */
const DEFENCE_PRESSURE_BP = 2500;
/** Bonus for a wanted turret, mount or modernise once affordable, bp of score. */
const WANT_BONUS = 8000;
/** Legendary saving goal: needs m_legendary ≥ 1.0 (weight ≥ 50). */
const LEGENDARY_GOAL_BP = 10000;
/** Turret choice: anti-air turrets are worth this much more while enemy air is on the lane, bp. */
const AIR_TURRET_BONUS_BP = 5000;

export class Brain {
  goal: SavingGoal | null = null;
  spending = true;
  /** When the brain last chose a stance change. */
  private stanceTick = -1000000;
  /** A "float gold" mistake leaves the tray untouched until this tick. */
  private idleUntil = 0;
  private readonly opening: OpeningPlan;
  private openingIndex = 0;

  constructor(
    private readonly cfg: BrainConfig,
    rng: Sfc32State,
  ) {
    this.opening = parseOpenings(cfg.openings, rng);
  }

  /** True while opening steps remain. */
  get inOpening(): boolean {
    return this.openingIndex < this.opening.steps.length;
  }

  /** Decides at most one action for the view (the controller only asks while the action cap has room). */
  decide(v: View, mem: BotMemory, rng: Sfc32State): DecisionTrace {
    const { book, tier: t, persona: P, weights: W } = this.cfg;
    const e = book.econ;
    const obs = v.obs;
    const siege = v.phase === 'siege';
    const hot = v.phase === 'overdrive' || siege;

    // Situation (A7.2).
    const pressureValue = foeValueIn(v, 0, PRESSURE_RADIUS);
    const pressure = fPressure(pressureValue);
    const urgent = pressure >= URGENT_PRESSURE_BP;
    const foeTurrets = obs.foe.turrets.filter((x) => x !== null).length;
    const foeGold = Math.trunc(mem.estimator.gold / MILLI);
    const defence = foeValueIn(v, LANE_MLU - GATE_ZONE, LANE_MLU) + TURRET_DEFENCE * foeTurrets;
    // Attack clock (A7.2): after 60 s without a ground unit past mid-lane, train scores rise 10% per 5 s,
    // and the push gate relaxes by 0.1 per 5 s down to parity, so two banking bots cannot stall a match.
    const quiet = v.now - mem.pastMidTick;
    const clockSteps = quiet >= CLOCK_START ? Math.trunc((quiet - CLOCK_START) / CLOCK_STEP) : 0;
    const clockBp = Math.min(CLOCK_MAX_BP, BP + CLOCK_STEP_BP * clockSteps);
    const gateBp = hot ? BP : Math.max(BP, P.pushGateBp - CLOCK_STEP_BP * clockSteps);
    // An army at the pop cap cannot grow by banking, so it goes.
    const popFull = v.popCommitted + POP_FULL_MARGIN >= e.popCap;
    const pushOk = siege || popFull || v.myArmy * BP >= gateBp * defence;
    const foeOnMyHalf = v.foes.some((u) => u.p < e.midLane);
    const allIn = P.allInBeforeEvolve && !siege && (v.evolveReady || (obs.me.xpBp >= ALL_IN_XP_BP && obs.me.xpBp < BP));
    // Push gate (A7.2 anti-turtle): the bot charges past mid-lane only with myArmy ≥ gate × D. When the
    // gate fails it banks instead of feeding units into the turrets one by one: a Treasury saving goal
    // (below its cap), a preference for range ≥ 250, a Hold at the line where the tier allows it, and no
    // training until its gold can lift the army over the gate in one wave, which it then spends at once.
    const gateFailed = !pushOk && !foeOnMyHalf && !allIn;
    const waveGold = mulBp(gateBp, defence) - v.myArmy;
    const banking = gateFailed && v.gold < waveGold * MILLI;
    const wave = gateFailed && !banking;

    // Saving goals (A7.2: "Bank 350 for a Legendary" or "bank for Treasury"): trains that would dip
    // below the goal wait, and the goal's own action gets a bonus once affordable, so the bot visibly
    // saves and then buys.
    const treasuryMax = Math.max(t.treasuryMax, P.treasuryRushLevel);
    const nextTreasury = v.treasury < e.treasuryCosts.length ? (e.treasuryCosts[v.treasury] ?? null) : null;
    const rushing = P.treasuryRushLevel > 0 && v.treasury < P.treasuryRushLevel && v.now < msToTicks(P.treasuryRushByMs);
    const legendaryCard = v.tray.find((s) => s.card.legendary)?.card ?? null;
    this.goal = null;
    if (!urgent && !allIn) {
      // Treasury pays back in 133-367 s (A2.3), so a bot banks for it while the lane near its gate is
      // quiet in the first 3:00, up to its tier's Treasury max, and whenever the push gate says bank.
      const quietGate = !v.foes.some((u) => u.p <= TREASURY_SAFE);
      // In a quiet moment a level is only worth it while it still pays back by 6:00.
      const paysBack = nextTreasury !== null && v.now + Math.trunc((nextTreasury * TICKS_PER_SECOND) / e.treasuryGoldPerSecMilli) <= TREASURY_PAYBACK_BY_TICKS;
      if (nextTreasury !== null && v.treasury < treasuryMax && (rushing || ((gateFailed || (quietGate && paysBack)) && v.now < TREASURY_BEFORE_TICKS))) {
        this.goal = { kind: 'treasury', amount: nextTreasury };
      } else if (legendaryCard && !v.legendaryInField && W.legendary >= LEGENDARY_GOAL_BP) {
        this.goal = { kind: 'legendary', amount: legendaryCard.cost, card: legendaryCard.id };
      }
    }
    const goalBonus = (kind: BotAction['kind']): number => (this.goal?.kind === kind ? GOAL_BONUS : 0);

    // Wanted turrets (docs/decisions.md, WP3): a bot below its wanted turret count for the age buys a
    // turret or a mount under pressure, and a rebuilding tier modernises when things are calm. These do
    // not pause training; the bonus only makes them win when the gold is there.
    const mountCap = Math.min(e.mountCount, t.maxTurrets);
    const wantedTurrets = Math.min(t.maxTurrets, 1 + Math.trunc((v.ageIndex * W.turret) / BP));
    const wantTurret = v.turretsBuilt < wantedTurrets && !allIn && pressure >= DEFENCE_PRESSURE_BP ? WANT_BONUS : 0;
    const wantModernise = !urgent && !allIn ? WANT_BONUS : 0;

    // Gold float (A7.3): let gold pile up to the float target, then spend it down.
    // An active saving goal raises the float to the goal, so the bot visibly banks (A7.2 "pause training").
    const cheapest = v.tray.reduce((m, s) => Math.min(m, s.card.cost), Number.MAX_SAFE_INTEGER);
    if (v.gold >= Math.max(t.goldFloat * MILLI, this.goal?.amount ?? 0) || wave) this.spending = true;
    else if (v.gold < cheapest) this.spending = false;
    const mayTrain = !banking && v.now >= this.idleUntil && (this.spending || urgent || allIn);

    const cand: Scored[] = [];
    const add = (action: BotAction, score: number): void => {
      cand.push({ action, score });
    };
    const opts: MistakeOptions = {};

    // Train.
    const trains = this.trainCandidates(v, mem, { banking: gateFailed, allIn, clockBp });
    if (mayTrain) for (const s of trains.scored) add(s.action, s.score);
    // Over-commit (mistake): keep feeding units forward while the push gate says bank.
    if (banking && trains.eager) opts.overCommit = trains.eager;
    if (trains.noAntiAir) opts.forgetAntiAir = trains.noAntiAir;

    // Turrets.
    const turret = this.chooseTurret(v);
    if (turret && v.turretsBuilt < t.maxTurrets) {
      add(turret, mulBp(W.turret, mulBp(pressure, fSpare(v.gold, turret.cost))) + wantTurret);
    }
    const filled = v.turrets.every((x, m) => m >= v.mountsOwned || x !== null);
    if (filled && v.mountsOwned < mountCap) {
      const cost = e.mountCosts[v.mountsOwned] ?? 0;
      if (v.gold >= cost) add({ kind: 'mount', cost }, mulBp(SCORE.mount, mulBp(W.turret, mulBp(pressure, fSpare(v.gold, cost)))) + wantTurret);
    }
    if (t.turretRebuild && !v.ageUncertain) {
      const mod = this.chooseModernise(v, v.gold);
      if (mod) add(mod, mulBp(SCORE.modernise, mulBp(W.turret, fSpare(v.gold, mod.cost))) + wantModernise);
    }

    // Treasury.
    if (nextTreasury !== null && v.treasury < treasuryMax && v.gold >= nextTreasury && (v.now < TREASURY_BEFORE_TICKS || rushing)) {
      const safe = !v.foes.some((u) => u.p <= TREASURY_SAFE);
      if (safe) add({ kind: 'treasury', cost: nextTreasury }, mulBp(W.economy, fSpare(v.gold, nextTreasury)) + goalBonus('treasury'));
    }

    // Evolve.
    let evolveWanted = false;
    if (v.evolveReady && !P.neverEvolves && mem.evolveSince !== null && obs.tick - mem.evolveSince >= t.evolveDelayTicks) {
      const safe = !v.foes.some((u) => !u.air && u.p <= EVOLVE_SAFE);
      if (safe || W.greed >= GREEDY_BP) {
        evolveWanted = true;
        // Kettle pushes first: Evolve waits while units can still be trained into the all-in.
        const waitForAllIn = allIn && trains.scored.length > 0 && v.queue.length < 3;
        if (!waitForAllIn) add({ kind: 'evolve' }, SCORE.evolve);
      } else {
        opts.evolveBeforePush = { kind: 'evolve' };
      }
    }

    // Power.
    if (v.powerReady && v.power) {
      const zone = bestPowerZone(v, v.power, e.zoneMin, e.zoneMax);
      const threshold = mulBp(t.powerThreshold, W.patience);
      const hurt = obs.tick - mem.baseDamagedTick <= POWER_HURT_TICKS && zone.value >= POWER_MIN_VALUE;
      const desperate = t.powerAnyWhenLowBase && v.baseHpBp < LOW_BASE_BP && zone.value > 0;
      const foeEvolved = P.powerForEvolveMoments && v.now - mem.foeEvolvedTick <= FOE_EVOLVE_WINDOW && zone.value >= POWER_MIN_VALUE;
      const beforeEvolve = evolveWanted && zone.value >= POWER_MIN_VALUE;
      const aim = (): BotAction => this.aimPower(zone, rng);
      if (beforeEvolve) add(aim(), SCORE.powerBeforeEvolve);
      else if ((zone.value > 0 && zone.value >= threshold) || hurt || desperate || foeEvolved) add(aim(), SCORE.power);
      else if (zone.value > 0) opts.powerOnFew = { kind: 'power', p: zone.p === null ? null : Math.trunc(zone.p / MILLI) };
    }

    // Stance.
    if (t.hold && !this.opening.noStance && v.stanceReady && (siege || v.now - this.stanceTick >= STANCE_DWELL)) {
      const weak = v.myArmy * BP < mulBp(HOLD_RATIO_BP, W.hold) * v.foeArmy && v.turretsBuilt >= HOLD_MIN_TURRETS;
      const wantHold = !siege && !allIn && (weak || (gateFailed && W.hold >= HOLD_ON_GATE_BP));
      const want = wantHold ? 'hold' : 'charge';
      if (want !== v.stance) {
        add({ kind: 'stance', stance: want }, SCORE.stance);
      } else if (want === 'hold') {
        opts.overCommit = { kind: 'stance', stance: 'charge' };
      }
    }

    // Last Stand. It fires on its own at 10%; if the base may reach that before the command runs, the
    // command would find it already charging, so the bot leaves it to the automatic trigger.
    const lsMargin = 2 * mem.worstBaseLoss(t.snapshotDelayTicks + 2) + LAST_STAND_MARGIN_BP;
    if (v.lastStandArmed && !this.opening.autoLastStand && v.baseHpBp - lsMargin > e.lastStandAutoBp) {
      const near = v.foes.filter((u) => u.p <= e.lastStandRadius).length;
      if (near >= LAST_STAND_FOES) add({ kind: 'lastStand' }, SCORE.lastStand);
    }

    cand.sort((a, b) => b.score - a.score);
    // Any useful action beats waiting, except while saving: then weak candidates wait for the goal.
    const bar = this.goal ? SCORE.savingBar : 1;
    const best = cand[0] && cand[0].score >= bar ? cand[0] : null;

    const trace: DecisionTrace = {
      tick: v.now,
      action: null,
      reason: 'wait',
      mistake: null,
      candidates: cand,
      myArmy: v.myArmy,
      foeArmy: v.foeArmy,
      defence,
      pushOk,
      banking,
      goal: this.goal,
      spending: this.spending,
      pressureBp: pressure,
      foeGold,
      clockBp,
    };

    // Opening build (A7.2): planned, so no mistakes; urgent defence or a Last Stand ends it early.
    if (this.inOpening) {
      if (urgent || v.now >= OPENING_TICKS || best?.action.kind === 'lastStand') {
        this.openingIndex = this.opening.steps.length;
      } else {
        while (this.inOpening) {
          const step = this.opening.steps[this.openingIndex];
          const r = step ? resolveStep(step, v, book, { treasuryMax, mountCap }, (vv) => this.chooseTurret(vv)) : 'skip';
          if (r === 'skip') {
            this.openingIndex += 1;
            continue;
          }
          if (r === 'wait' || (v.ageUncertain && r.kind === 'train')) return trace;
          this.openingIndex += 1;
          trace.action = r;
          trace.reason = 'opening';
          return trace;
        }
      }
    }

    if (best && (best.action.kind === 'build' || best.action.kind === 'mount')) {
      opts.leaveMountEmpty = cand.find((c) => c.action.kind !== 'build' && c.action.kind !== 'mount' && c.score >= bar)?.action ?? null;
    }

    // A mistake replaces an action the bot meant to take (A7.2 "Choice"), so the error rate scales with
    // what the bot does, not with how often it looks. Holding back a wave while banking counts as a
    // choice too: that is when an impatient player over-commits.
    if (!best && !opts.overCommit) return trace;
    if (chanceBp(rng, Math.min(MAX_MISTAKE_BP, t.mistakeBp + this.cfg.mistakeBonusBp))) {
      const m = pickMistake(rng, opts);
      if (m.kind === 'floatGold') this.idleUntil = v.now + FLOAT_IDLE_TICKS;
      trace.mistake = m.kind;
      trace.action = m.action;
      trace.reason = 'mistake';
      return trace;
    }

    if (!best) return trace;
    let action = best.action;
    // Counter depth 0: a weighted random choice from the loadout (A7.3).
    if (action.kind === 'train' && t.counterDepth === 0) {
      const ts = cand.filter((c) => c.action.kind === 'train' && c.score > 0);
      const i = pickWeighted(
        rng,
        ts.map((c) => c.score),
      );
      if (i >= 0) action = (ts[i] as Scored).action;
    }
    if (action.kind === 'stance') this.stanceTick = v.now;
    trace.action = action;
    trace.reason = 'best';
    return trace;
  }

  /** Train candidates with their A7.2 scores, plus the alternatives two mistakes would pick. */
  private trainCandidates(
    v: View,
    mem: BotMemory,
    s: { banking: boolean; allIn: boolean; clockBp: number },
  ): { scored: Scored[]; eager?: BotAction; noAntiAir?: BotAction } {
    const { book, tier: t, persona: P, weights: W } = this.cfg;
    const e = book.econ;
    if (v.ageUncertain) return { scored: [] };
    const ctx = this.counterContext(v, mem);
    const push = fPush(v.myArmy, v.foeArmy);
    const groupCount = new Map<RoleGroup, number>();
    for (const u of v.mine) if (u.def) groupCount.set(u.def.group, (groupCount.get(u.def.group) ?? 0) + 1);
    for (const c of v.queue) {
      const d = book.units[c];
      if (d) groupCount.set(d.group, (groupCount.get(d.group) ?? 0) + 1);
    }
    const foeAir = v.foes.some((u) => u.air);
    const scored: Scored[] = [];
    let eager: Scored | null = null;
    let bestNoAir: Scored | null = null;
    for (const slot of v.tray) {
      const c = slot.card;
      if (v.gold < c.cost || v.queue.length >= e.queueMax) continue;
      if (c.legendary && v.legendaryInField) continue;
      if (v.popCommitted + c.pop > e.popCap) continue;
      const fc = t.counterDepth === 0 ? BP / 2 : fCounter(ctx, c.id);
      const saving = this.goal !== null && !(this.goal.kind === 'legendary' && this.goal.card === c.id) && v.gold - c.cost < this.goal.amount;
      let base =
        mulBp(TRAIN.counter, mulBp(fc, P.counterWeightBp)) +
        mulBp(TRAIN.push, mulBp(W.aggr, push)) +
        mulBp(TRAIN.role, fRole(groupCount.get(c.group) ?? 0)) +
        (c.legendary ? mulBp(TRAIN.legendary, W.legendary) : 0) +
        (P.groupBiasBp[c.group] ?? 0) +
        (P.signatureCards.includes(c.id) ? P.signatureBiasBp : 0) +
        (this.opening.favorite === c.id ? FAVORITE_BONUS : 0) +
        (s.allIn ? ALL_IN_BONUS : 0);
      base = mulBp(base, s.clockBp);
      const bankingBonus = s.banking && c.range >= BANKING_RANGE ? TRAIN.banking : 0;
      const savePenalty = saving && !s.allIn ? TRAIN.save : 0;
      const action: BotAction = { kind: 'train', slot: slot.slot, card: c.id, cost: c.cost };
      const score = base + bankingBonus - savePenalty;
      scored.push({ action, score });
      if (!eager || base > eager.score) eager = { action, score: base };
      if (foeAir && !c.hitsAir && (!bestNoAir || score > bestNoAir.score)) bestNoAir = { action, score };
    }
    const out: { scored: Scored[]; eager?: BotAction; noAntiAir?: BotAction } = { scored };
    if (eager) out.eager = eager.action;
    if (bestNoAir) out.noAntiAir = bestNoAir.action;
    return out;
  }

  private counterContext(v: View, mem: BotMemory): CounterContext {
    const { book, tier: t } = this.cfg;
    const targets = counterTargets(v.foes, v.myFront, t.counterDepth);
    let now = sampleOfUnits(targets);
    if (now.length === 0 && t.remembersComposition) now = sampleOfMemory(mem.remembered(), book);
    let next = null;
    const foe = v.obs.foe;
    if (t.predictsNextAge && foe.xpBp >= PREDICT_FROM_XP_BP) {
      const pool = book.unitsByAge[foe.ageIndex + 1];
      if (pool) next = sampleOfAge(pool);
    }
    return { book, now, next };
  }

  /**
   * The turret to build on the first free mount: the stronger affordable loadout turret, preferring
   * anti-air when enemy air is on the lane and the personality's signature turrets. Null when no mount
   * is free or nothing is affordable.
   */
  chooseTurret(v: View): Extract<BotAction, { kind: 'build' }> | null {
    if (v.ageUncertain) return null;
    const mount = v.turrets.findIndex((x, m) => m < v.mountsOwned && x === null && !v.mountBusy[m]);
    if (mount < 0) return null;
    const pick = this.bestTurretCard(v, v.gold);
    return pick ? { kind: 'build', mount, slot: pick.slot, card: pick.card, cost: pick.cost } : null;
  }

  /** The loadout turret to build within `gold` (after a modernise `credit`), or null. */
  private bestTurretCard(v: View, gold: number, credit = 0): { slot: number; card: CardId; cost: number } | null {
    const { book, persona: P } = this.cfg;
    const foeAir = v.foes.some((u) => u.air);
    let best: { slot: number; card: CardId; cost: number; value: number } | null = null;
    v.turretCards.forEach((id, slot) => {
      const def = id ? book.turrets[id] : undefined;
      if (!id || !def) return;
      const cost = Math.max(0, def.cost - credit);
      if (gold < cost) return;
      let value = def.strength;
      if (foeAir && def.hitsAir) value = mulBp(value, BP + AIR_TURRET_BONUS_BP);
      if (P.signatureCards.includes(id)) value = mulBp(value, BP + P.signatureBiasBp * 4);
      if (!best || value > best.value) best = { slot, card: id, cost, value };
    });
    const b = best as { slot: number; card: CardId; cost: number; value: number } | null;
    return b ? { slot: b.slot, card: b.card, cost: b.cost } : null;
  }

  /** Modernise the oldest outdated turret (A2.8), if the bot can afford a current one. */
  private chooseModernise(v: View, gold: number): Extract<BotAction, { kind: 'modernise' }> | null {
    const { book } = this.cfg;
    let mount = -1;
    let oldest = Number.MAX_SAFE_INTEGER;
    v.turrets.forEach((x, m) => {
      if (!x || v.mountBusy[m] || x.ageIndex >= v.ageIndex) return;
      if (x.ageIndex < oldest) {
        oldest = x.ageIndex;
        mount = m;
      }
    });
    const cur = mount >= 0 ? v.turrets[mount] : null;
    if (!cur) return null;
    const oldCost = book.turrets[cur.card]?.cost ?? 0;
    const credit = Math.trunc((oldCost * book.econ.sellRefundBp) / BP);
    const pick = this.bestTurretCard(v, gold, credit);
    return pick ? { kind: 'modernise', mount, slot: pick.slot, card: pick.card, cost: pick.cost } : null;
  }

  private aimPower(zone: PowerZone, rng: Sfc32State): BotAction {
    if (zone.p === null) return { kind: 'power', p: null };
    const { book, tier: t } = this.cfg;
    const e = book.econ;
    const err = t.powerAimErrorLu > 0 ? randRange(rng, -t.powerAimErrorLu, t.powerAimErrorLu) : 0;
    const p = clamp(Math.trunc(zone.p / MILLI) + err, Math.trunc(e.zoneMin / MILLI), Math.trunc(e.zoneMax / MILLI));
    return { kind: 'power', p };
  }
}
