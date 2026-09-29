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
 * | Economy income research (was Treasury, A18.5.4) | m_econ · [before 3:00] · [no enemy on its own half (A17.13; 600 lu on the old 1,200 lu lane)] · [level < tier max] · f_spare |
 * | Other research (A18.5.8) | a saving goal once the tier's research time has come and enough match is left, then the goal bonus; picked at random weighted by the General's style (0-I), by `aiHint` against its own situation (II-IV) or by counter scoring on the enemy army (V+; Rook also reads the Scouted list) |
 * | Research timing (A18.5.8) | V-VI: the push gate eases for 20 s after an own Troops item lands; VII-X also while the enemy's Troops item is past half, stiffens for 15 s after it lands, and evolves away from it |
 * | Thin army (A18.6) | Normal (IV) and up push whenever myArmy ≥ 1.5 × foeArmy (and can soak the turrets) |
 * | Evolve | 1.2 when XP ≥ threshold and (no enemy ground unit within 300 lu of own gate, or m_greed ≥ 1.3), after the tier's evolve delay |
 * | Power | 1.0 per slot (A2.9.9) when value × 10,000 ÷ effective cost ≥ the tier's ROI bar + (patience − 50) × 40, or own base took damage in the last 3 s and value ≥ 100; the best value − cost wins; aim error on area powers, best-k pick on strikes |
 * | Stance | Hold when the tier allows it, myArmy < 0.7 × foeArmy and ≥ 2 turrets are built (A17.13: or the foe army is one type), or when the push gate fails; Fall back (V+, before Overdrive) when myArmy < 0.5 × foeArmy and the enemy is past mid-lane, within 200 lu of the turret cover; otherwise Charge. The Hold flag (III+, A18.4.2) goes where the turrets cover when defending, or forward where the army gathers for a wave |
 * | Last Stand | When armed and ≥ 4 enemies are within 450 lu |
 *
 * Plus the push gate, the attack clock, saving goals, the gold float target (A7.3), openings and the
 * personality rules (personalities.ts). The brain is deterministic given (view, memory, RNG, profile,
 * content); the little it keeps between decisions (saving goal, spending mode, opening progress, stance
 * dwell) is itself derived from earlier inputs. Rules the DESIGN leaves open are logged in
 * docs/decisions.md under WP3.
 */
import type { CardId, ResearchClass, ResearchPickDef, RoleGroup } from '@/contracts';
import {
  BP,
  LANE_MLU,
  MILLI,
  PPM,
  TICKS_PER_SECOND,
  chanceBp,
  clamp,
  msToTicks,
  nextIncomePick,
  pickIncomeMilliPerSec,
  pickWeighted,
  randInt,
  randRange,
  reachBand,
  researchCost,
  startablePicks,
  type Sfc32State,
} from '@/core';
import type { BotAction } from './actions';
import { matchClock, type CardBook, type MatchClock } from './book';
import {
  counterTargets,
  fCounter,
  PREDICT_FROM_XP_BP,
  sampleOfAge,
  sampleOfMemory,
  sampleOfUnits,
  type CounterContext,
} from './counters';
import { isTroops, type BotMemory } from './memory';
import { pickMistake, type MistakeKind, type MistakeOptions } from './mistakes';
import { parseOpenings, resolveStep, type OpeningPlan } from './openings';
import type { Personality } from './personalities';
import {
  BANKING_RANGE,
  fPressure,
  fPush,
  fRole,
  fSpare,
  mulBp,
  powerOption,
  PRESSURE_RADIUS,
  SCORE,
  TRAIN,
  type PowerContext,
  type PowerOption,
} from './scoring';
import type { TierParams } from './tiers';
import { foeValueIn, type PowerSlotView, type View, type WeightsBp } from './view';

/** A scored candidate action. */
export interface Scored {
  action: BotAction;
  /** Score in bp (10,000 = 1.0). */
  score: number;
}

/**
 * What the bot is saving for; `amount` is milli-gold. `counter` is A16.3 rule 1: a counter card the bot
 * cannot afford yet (it shares the Legendary goal's code: the card itself is exempt from f_save).
 */
export type SavingGoal =
  | { kind: 'treasury'; amount: number }
  /** A War Council item the bot is saving for (A18.5.8). */
  | { kind: 'research'; amount: number; pick: string }
  | { kind: 'legendary'; amount: number; card: CardId }
  | { kind: 'counter'; amount: number; card: CardId };

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
/**
 * Income research while the lane is quiet: before 3:00 and paying back by 6:00 in a format without
 * clocks. With clocks (A18.3.4) both follow the match: before 3/5 of the Overdrive time, and paid back
 * by a minute into Overdrive (Short 3:00 / 6:00 as before, Standard 4:48 / 9:00, Full 7:12 / 13:00).
 */
const TREASURY_BEFORE_TICKS = 180 * TICKS_PER_SECOND;
const TREASURY_PAYBACK_BY_TICKS = 360 * TICKS_PER_SECOND;
const PAYBACK_AFTER_OVERDRIVE = 60 * TICKS_PER_SECOND;
/** No new research with less than this left before the Final Bell: it would not pay (A18.5.8 "value over the rest"). */
const RESEARCH_HORIZON_TICKS = 90 * TICKS_PER_SECOND;
/** Research timing (A18.5.8): the push gate × 0.8 for 20 s after an own Troops item lands (V+) ... */
const OWN_DONE_TICKS = 20 * TICKS_PER_SECOND;
const OWN_DONE_GATE_BP = 8000;
/** ... × 0.9 while the enemy's Troops item is past half (strike before it lands, VII+) ... */
const FOE_STRIKE_FROM_BP = 5000;
const FOE_STRIKE_GATE_BP = 9000;
/** ... and × 1.15 for 15 s after it lands (let the fresh enemy wave come, VII+). */
const FOE_FRESH_TICKS = 15 * TICKS_PER_SECOND;
const FOE_FRESH_GATE_BP = 11500;
/** The timed gate never drops below 0.8 × D. */
const TIMED_GATE_MIN_BP = 8000;
/** A18.6 thin army: myArmy ≥ 1.5 × foeArmy, worth at least 250 gold. */
const THIN_RATIO_BP = 15000;
const THIN_MIN_ARMY = 250;
/** A18.4.2 Fall back: myArmy < 0.5 × foeArmy (foe worth 300+) with the enemy past mid-lane. */
const FALLBACK_RATIO_BP = 5000;
const FALLBACK_MIN_FOE = 300;
/**
 * ... and only once the enemy front is within 200 lu of the turret cover (past mid-lane, and close): falling
 * back from anything past mid-lane added 10 points of Final Bells to the tier V mirror (Standard 26% →
 * 36%, 600 matches); this keeps the win-rate gain over lower tiers at 29.5%.
 */
const FALLBACK_REACH = 200 * MILLI;
/** Hold flag spots: this far inside the turret cover when defending ... */
const FLAG_COVER_MARGIN = 80 * MILLI;
/** ... and, gathering a wave, this far short of mid-lane and of the nearest enemy ground unit. */
const FLAG_STAGE_GAP = 200 * MILLI;
/** A flag move smaller than this is not worth a command. */
const FLAG_MIN_MOVE = 60 * MILLI;
/** The over-commit mistake (Hold → Charge) only after holding this long. */
const OVERCOMMIT_AFTER_TICKS = 15 * TICKS_PER_SECOND;
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
/** Power: own base took damage in the last 3 s and value ≥ 100 gold casts whatever the bar (A2.9.9). */
const POWER_HURT_TICKS = 3 * TICKS_PER_SECOND;
const POWER_MIN_VALUE = 100 * MILLI;
/** Personality shift of the ROI bar: (power patience − 50) × 40 bp = (m_patience − 1) × 0.4 (A2.9.9). */
const PATIENCE_SHIFT_NUM = 2;
const PATIENCE_SHIFT_DEN = 5;
/** A cast that would break an active saving goal needs this much more ROI (A2.9.9 gold ledger). */
const GOAL_BAR_BP = 5000;
/** Counter-timing (X): the Home bar rises this much while the enemy banks (army on the lane < 300, gold estimate ≥ 300). */
const COUNTER_TIMING_BP = 3000;
const FOE_BANKING_ARMY = 300;
/** Bait discipline (VII+): no Home cast on covered targets worth less than this (whole gold). */
const BAIT_DISCIPLINE_VALUE = 200;
/** Home reserve (V+): while the Home slot is this far reloaded and the enemy army is worth this much. */
const RESERVE_PPM = 750000;
const RESERVE_FOE_ARMY = 300;
/** Ring reading (V+): the push gate × 1.2 while a scouted enemy Home damage power is ready. */
const RING_GATE_BP = 12000;
/** Bait, then wave (A2.9.9): needs this much banked (milli), sends at most 150 gold of bait, releases after 12 s. */
const BAIT_BANK = 500 * MILLI;
const BAIT_SPEND = 150 * MILLI;
const BAIT_RELEASE_TICKS = 12 * TICKS_PER_SECOND;
/** No new bait for this long after a release (one bait per enemy reload). */
const BAIT_COOLDOWN_TICKS = 30 * TICKS_PER_SECOND;
/** A bait train outranks every other candidate but Last Stand. */
const BAIT_TRAIN_SCORE = 16000;
/** TEMP experiment switches (removed before hand-off). */
export const POWER_TUNE = { ring: true, reserve: true, bait: true, hotHomeBarBp: 0, hotFieldBarBp: 0, roiScaleBp: 10000, noHome: false, noField: false, discipline: true, barOverride: 0, bars: {} as Record<string, number> };
/** X: any zone value when the own base is below 25%. */
const LOW_BASE_BP = 2500;
/** Tempest casts into the burst right after the foe evolves. */
const FOE_EVOLVE_WINDOW = 5 * TICKS_PER_SECOND;
/**
 * Stance: Hold when myArmy < 0.7 × m_hold × foeArmy with ≥ 2 turrets, or, on the 2,000 lu lane (A17.13
 * retune), against a one-type army (A16.3 rule 3 factor ≥ ×1.5, a 60% role-group share) with any turrets:
 * falling back to the hold line keeps the defender's short walk, where trickling units one by one across
 * 1,000+ lu fed Heavy spam (mono Heavy 63% → 36% vs tier VII in Short War with the three-wide front).
 */
const HOLD_RATIO_BP = 7000;
const HOLD_MIN_TURRETS = 2;
const HOLD_MONO_BP = 20000;
const HOLD_MONO_ARMY = 450;
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
/**
 * A16.3 rule 1 (save for a counter): the best counter over the whole tray, gold ignored, must beat the
 * best affordable counter by this much (0.15) to set a saving goal for it.
 */
const COUNTER_GOAL_EDGE_BP = 1500;
/** The counter goal lapses after 8 s ... */
const COUNTER_GOAL_TICKS = 8 * TICKS_PER_SECOND;
/** ... or when an enemy unit comes within 300 lu of the own gate. */
const COUNTER_GOAL_LAPSE = 300 * MILLI;
/**
 * A16.3 rule 3 (answer one-type armies): the counter weight is multiplied by
 * 1 + 2.5 × max(0, s − 0.4), capped at 2, where s is the largest role-group share of the visible enemy
 * army value. The diversity term and the gold float target shrink by the same factor.
 */
const MONO_FROM_BP = 4000;
const MONO_SLOPE = 25;
const MONO_MAX_BP = 20000;
/**
 * `waveCommit`: a committed wave ends once it has lost half its peak value, or once it is worth less
 * than the defence D it faces (A18 retune: charging on below D fed the defender, and tier VI lost 65% of
 * Standard Wars to tier V) ...
 */
const WAVE_END_BP = 5000;
/** ... and a new one needs the push gate plus this margin. */
const WAVE_MARGIN_BP = 11500;
/** `econPlan`: the foe counts as passive after this long without a ground unit on the bot's half ... */
const PASSIVE_FOE_TICKS = 20 * TICKS_PER_SECOND;
/** ... and a Treasury level bought then must pay back within this long (A2.3: levels 1 and 2). */
const PASSIVE_PAYBACK_TICKS = 240 * TICKS_PER_SECOND;
/** `baseTurrets`: a missing base turret or its mount scores this × f_spare (so it waits for spare gold). */
const BASE_TURRET_BONUS = 20000;
/** Research (A18.5.8) scores this once affordable, plus the goal bonus (below a wanted base turret). */
const RESEARCH_SCORE = 3000;
/** Research hint weights (bp): the base preference and how much a matching situation adds. */
const HINT_BASE_BP = 5000;
const HINT_MATCH_BP = 10000;
/** A group share of the visible enemy army (bp) from which a hint counts as matching. */
const HINT_SHARE_BP = 3500;
/** A Troops pick scores up to this much more for the class's share of the bot's own army. */
const HINT_OWN_BP = 8000;
/** m_aggr from which "push" picks suit the bot's style (aggression weight ≥ 80, Kettle). */
const AGGRESSIVE_BP = 13000;
/** Deepening an open line (rank II) scores this much more; a third Troops line this much less. */
const HINT_DEEPEN_BP = 6000;
const MAX_OPEN_LINES = 2;

/** Research picks the bot could start (the view counts a pending research as in progress). */
function startableFor(content: CardBook['content'], v: View): ResearchPickDef[] {
  return startablePicks(content, v.research);
}

/** A16.3 rule 3 factor for the visible enemy army, bp (10,000 = ×1, capped at ×2). */
export function monoFactorBp(foes: readonly { value: number; def?: { group: RoleGroup } | undefined }[]): number {
  let total = 0;
  const by = new Map<RoleGroup, number>();
  for (const u of foes) {
    if (!u.def || u.value <= 0) continue;
    total += u.value;
    by.set(u.def.group, (by.get(u.def.group) ?? 0) + u.value);
  }
  if (total <= 0) return BP;
  let top = 0;
  for (const x of by.values()) top = Math.max(top, x);
  const shareBp = Math.trunc((top * BP) / total);
  return Math.min(MONO_MAX_BP, BP + Math.trunc((MONO_SLOPE * Math.max(0, shareBp - MONO_FROM_BP)) / 10));
}

/** When income research is worth buying on a quiet lane (see TREASURY_BEFORE_TICKS). */
function incomeTiming(clock: MatchClock): { before: number; paybackBy: number } {
  const od = clock.overdrive;
  if (od === null) return { before: TREASURY_BEFORE_TICKS, paybackBy: TREASURY_PAYBACK_BY_TICKS };
  return { before: Math.trunc((od * 3) / 5), paybackBy: od + PAYBACK_AFTER_OVERDRIVE };
}

export class Brain {
  goal: SavingGoal | null = null;
  spending = true;
  /** A16.3 rule 1: the counter the bot is saving for, and when that goal lapses. */
  private counterGoal: { card: CardId; amount: number; until: number } | null = null;
  /** When the brain last chose a stance change. */
  private stanceTick = -1000000;
  /** When the brain last started a research item (A18.5.8 research gap). */
  private researchTick = -1000000;
  /** The research pick the bot is saving for. */
  private researchPlan: string | null = null;
  /** A "float gold" mistake leaves the tray untouched until this tick. */
  private idleUntil = 0;
  /** `waveCommit`: the peak army value of the wave now charging, or null while none is. */
  private wavePeak: number | null = null;
  /** Bait, then wave (A2.9.9): when the bait started and the gold (milli) spent on it; null when not baiting. */
  private bait: { start: number; spent: number } | null = null;
  private baitCooldownUntil = 0;
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
    // A17.13: enemy units in their gate zone count only after the opening (30 s). Freshly spawned units
    // stand there on their way out, and on the 2,000 lu lane holding back for them delayed the first clash
    // to ~0:38 (A17.14 wants 0:11-0:16). Turrets always count.
    const gateUnits = v.now >= OPENING_TICKS ? foeValueIn(v, LANE_MLU - GATE_ZONE, LANE_MLU) : 0;
    const defence = gateUnits + TURRET_DEFENCE * foeTurrets;
    // Attack clock (A7.2): after 60 s without a ground unit past mid-lane, train scores rise 10% per 5 s,
    // and the push gate relaxes by 0.1 per 5 s down to parity, so two banking bots cannot stall a match.
    const quiet = v.now - mem.pastMidTick;
    const clockSteps = quiet >= CLOCK_START ? Math.trunc((quiet - CLOCK_START) / CLOCK_STEP) : 0;
    const clockBp = Math.min(CLOCK_MAX_BP, BP + CLOCK_STEP_BP * clockSteps);
    const clock = matchClock(book, obs.ages);
    const baseGateBp = Math.max(BP, P.pushGateBp - CLOCK_STEP_BP * clockSteps);
    let gateBp = hot ? BP : Math.max(TIMED_GATE_MIN_BP, mulBp(baseGateBp, this.researchTimingBp(v, mem)));
    // A2.9.9 ring reading (V+): a scouted enemy Home bombard or sweep that is ready asks 20% more army
    // (the ring and the card are public once cast; the enemy's gold is not, so it is a read, not a certainty).
    const foeHome = obs.foe.powers.home;
    const foeHomeInfo = foeHome?.card ? book.powerInfo[foeHome.card] : undefined;
    const foeHomeArea = foeHomeInfo !== undefined && (foeHomeInfo.def.family === 'bombard' || foeHomeInfo.def.family === 'sweep');
    const foeHomeReady = foeHomeArea && (foeHome?.ppm ?? 0) >= PPM;
    if (POWER_TUNE.ring && t.readsRings && foeHomeReady && !hot) gateBp = mulBp(gateBp, RING_GATE_BP);
    // An army at the pop cap cannot grow by banking, so it goes.
    const popFull = v.popCommitted + POP_FULL_MARGIN >= e.popCap;
    // A18.6 (Normal and up): an army 1.5× the enemy's that can soak its turrets goes, whatever the gate.
    const thin = t.punishThin && v.myArmy >= THIN_MIN_ARMY && v.myArmy * BP >= THIN_RATIO_BP * v.foeArmy && v.myArmy >= TURRET_DEFENCE * foeTurrets;
    let pushOk = siege || popFull || thin || v.myArmy * BP >= gateBp * defence;
    if (t.waveCommit) {
      // Waves, not trickles (owner feedback 2026-09-28): a wave that passed the gate keeps going until it
      // has lost half its peak value or is worth less than D; a new wave needs a 15% margin over the gate.
      if (this.wavePeak !== null && (v.myArmy < mulBp(this.wavePeak, WAVE_END_BP) || v.myArmy < defence)) this.wavePeak = null;
      if (this.wavePeak === null && (siege || popFull || thin || v.myArmy * BP >= mulBp(gateBp, WAVE_MARGIN_BP) * defence)) this.wavePeak = v.myArmy;
      if (this.wavePeak !== null) this.wavePeak = Math.max(this.wavePeak, v.myArmy);
      pushOk = siege || this.wavePeak !== null;
    }
    const foeOnMyHalf = v.foes.some((u) => u.p < e.midLane);
    const allIn = P.allInBeforeEvolve && !siege && (v.evolveReady || (obs.me.xpBp >= ALL_IN_XP_BP && obs.me.xpBp < BP));
    // Push gate (A7.2 anti-turtle): the bot charges past mid-lane only with myArmy ≥ gate × D. When the
    // gate fails it banks instead of feeding units into the turrets one by one: a Treasury saving goal
    // (below its cap), a preference for range ≥ 250, a Hold at the line where the tier allows it, and no
    // training until its gold can lift the army over the gate in one wave, which it then spends at once.
    const gateFailed = !pushOk && !foeOnMyHalf && !allIn;
    const waveGold = mulBp(t.waveCommit ? mulBp(gateBp, WAVE_MARGIN_BP) : gateBp, defence) - v.myArmy;
    const banking = gateFailed && v.gold < waveGold * MILLI;
    let wave = gateFailed && !banking;

    // Bait, then wave (A2.9.9, VII+; Tempest from V): with a wave's gold banked and the enemy's Home
    // bombard or sweep ready, send ≤ 150 gold of the cheapest units first, train nothing else, and release
    // the bank when the enemy casts (their telegraph) or after 12 s.
    const baitOn = POWER_TUNE.bait && (t.bait || t.tier >= P.baitFromTier);
    if (this.bait) {
      const b = this.bait;
      if (mem.foeCastTick.home >= b.start || v.now - b.start >= BAIT_RELEASE_TICKS || urgent || foeOnMyHalf || siege) {
        this.bait = null;
        this.baitCooldownUntil = v.now + BAIT_COOLDOWN_TICKS;
        wave = true;
        this.spending = true;
      }
    } else if (baitOn && v.now >= this.baitCooldownUntil && foeHomeReady && (pushOk || wave) && v.gold >= BAIT_BANK && !foeOnMyHalf && !urgent && !siege && !allIn) {
      this.bait = { start: v.now, spent: 0 };
    }
    const baiting = this.bait !== null;

    // Saving goals (A7.2: "Bank 350 for a Legendary" or "bank for Treasury"): trains that would dip
    // below the goal wait, and the goal's own action gets a bonus once affordable, so the bot visibly
    // saves and then buys.
    // The Treasury is the Economy track's income picks now (A18.5.4): Granary, then Market.
    const treasuryMax = Math.max(t.treasuryMax, P.treasuryRushLevel);
    const incomePick = nextIncomePick(book.content, v.research);
    const nextTreasury = incomePick ? researchCost(book.content, incomePick) * MILLI : null;
    const incomePerSec = incomePick ? Math.max(1, pickIncomeMilliPerSec(incomePick)) : 1;
    const incomeWindow = incomeTiming(clock);
    const rushing = P.treasuryRushLevel > 0 && v.treasury < P.treasuryRushLevel && v.now < msToTicks(P.treasuryRushByMs);
    const legendaryCard = v.tray.find((s) => s.card.legendary)?.card ?? null;
    const mono = monoFactorBp(v.foes);
    // A16.3 rule 1: a counter goal lives 8 s, or until an enemy unit reaches 300 lu of the own gate.
    const cg = this.counterGoal;
    if (cg && (v.now >= cg.until || allIn || v.foes.some((u) => u.p <= COUNTER_GOAL_LAPSE) || !v.tray.some((s) => s.card.id === cg.card))) this.counterGoal = null;
    if (this.counterGoal && v.gold >= this.counterGoal.amount) this.counterGoal = null;
    this.goal = null;
    if (this.counterGoal) this.goal = { kind: 'counter', amount: this.counterGoal.amount, card: this.counterGoal.card };
    else if (!urgent && !allIn) {
      // Treasury pays back in 133-367 s (A2.3), so a bot banks for it while the lane near its gate is
      // quiet in the first 3:00, up to its tier's Treasury max, and whenever the push gate says bank.
      const quietGate = !v.foes.some((u) => u.p <= e.midLane);
      // In a quiet moment a level is only worth it while it still pays back by 6:00.
      const paysBack = nextTreasury !== null && v.now + Math.trunc((nextTreasury * TICKS_PER_SECOND) / incomePerSec) <= incomeWindow.paybackBy;
      const research = this.researchDue(v, clock) ? this.plannedResearch(v, mem, rng) : null;
      if (nextTreasury !== null && v.treasury < treasuryMax && (rushing || ((gateFailed || (quietGate && paysBack)) && v.now < incomeWindow.before) || (quietGate && this.passiveTreasury(v, mem, nextTreasury, incomePerSec)))) {
        this.goal = { kind: 'treasury', amount: nextTreasury };
      } else if (legendaryCard && !v.legendaryInField && W.legendary >= LEGENDARY_GOAL_BP && !gateFailed) {
        // A16.3 rule 4: no Legendary saving goal while the push gate fails.
        this.goal = { kind: 'legendary', amount: legendaryCard.cost, card: legendaryCard.id };
      } else if (research) {
        // A18.5.8: the War Council item comes after the Treasury (income) and Legendary goals.
        this.goal = { kind: 'research', amount: researchCost(book.content, research) * MILLI, pick: research.id };
      }
    }
    const goalBonus = (kind: SavingGoal['kind']): number => (this.goal?.kind === kind ? GOAL_BONUS : 0);
    // `econPlan`: a Treasury goal is bought before the push-gate wave spends the gold.
    if (t.econPlan && this.goal?.kind === 'treasury' && v.gold < this.goal.amount && !urgent) wave = false;

    // Wanted turrets (docs/decisions.md, WP3): a bot below its wanted turret count for the age buys a
    // turret or a mount under pressure, and a rebuilding tier modernises when things are calm. These do
    // not pause training; the bonus only makes them win when the gold is there.
    const mountCap = Math.min(e.mountCount, t.maxTurrets);
    const wantedTurrets = Math.min(t.maxTurrets, 1 + Math.trunc((v.ageIndex * W.turret) / BP));
    // `baseTurrets` (owner feedback 2026-09-28): from Bronze on the upper tiers keep 1-2 turrets up on
    // spare gold, without waiting for pressure (the turrets pay for themselves in bounties).
    const baseTurrets = v.ageIndex >= 1 && !allIn && this.goal?.kind !== 'treasury' ? t.baseTurrets : 0;
    const wantTurret = v.turretsBuilt < wantedTurrets && !allIn && pressure >= DEFENCE_PRESSURE_BP ? WANT_BONUS : 0;
    const baseWant = v.turretsBuilt < baseTurrets ? BASE_TURRET_BONUS : 0;
    const wantModernise = !urgent && !allIn ? WANT_BONUS : 0;

    // Gold float (A7.3): let gold pile up to the float target, then spend it down.
    // An active saving goal raises the float to the goal, so the bot visibly banks (A7.2 "pause training").
    const cheapest = v.tray.reduce((m, s) => Math.min(m, s.card.cost), Number.MAX_SAFE_INTEGER);
    // A16.3 rule 3: the float target shrinks against a one-type army.
    // A2.9.9 gold ledger (V+): the Home power's cost joins the float target while its slot is ≥ 75%
    // reloaded and an enemy army worth 300+ is on the lane.
    const home = v.powerSlots.find((x) => x.slot === 'home');
    const reserve = POWER_TUNE.reserve && t.homeReserve && home && home.info.harmful && home.ppm >= RESERVE_PPM && v.foeArmy >= RESERVE_FOE_ARMY ? home.cost : 0;
    const floatTarget = Math.trunc((t.goldFloat * MILLI * BP) / mono) + reserve;
    if (v.gold >= Math.max(floatTarget, this.goal?.amount ?? 0) || wave) this.spending = true;
    else if (v.gold < cheapest) this.spending = false;
    const mayTrain = !banking && !baiting && v.now >= this.idleUntil && (this.spending || urgent || allIn);

    const cand: Scored[] = [];
    const add = (action: BotAction, score: number): void => {
      cand.push({ action, score });
    };
    const opts: MistakeOptions = {};

    // Train.
    let trains = this.trainCandidates(v, mem, { banking: gateFailed, allIn, clockBp, mono });
    // A16.3 rule 1: the best counter is out of reach but clearly better than anything affordable: save
    // for it (the goal replaces a Treasury or Legendary goal, and the trains are scored again under it).
    if (!this.counterGoal && !allIn && trains.counterGoal && !v.foes.some((u) => u.p <= COUNTER_GOAL_LAPSE)) {
      const c = trains.counterGoal;
      this.counterGoal = { card: c.card, amount: c.cost, until: v.now + COUNTER_GOAL_TICKS };
      this.goal = { kind: 'counter', amount: c.cost, card: c.card };
      this.spending = false;
      trains = this.trainCandidates(v, mem, { banking: gateFailed, allIn, clockBp, mono });
    }
    if (mayTrain) for (const s of trains.scored) add(s.action, s.score);
    if (this.bait && !v.ageUncertain) {
      // The bait: the cheapest tray unit while the bait stays within 150 gold.
      const b = this.bait;
      const cheap = v.tray.filter((x) => !x.card.legendary && v.popCommitted + x.card.pop <= e.popCap).sort((a, c) => a.card.cost - c.card.cost || a.slot - c.slot)[0];
      if (cheap && b.spent + cheap.card.cost <= BAIT_SPEND && v.gold >= cheap.card.cost && v.queue.length < e.queueMax) {
        add({ kind: 'train', slot: cheap.slot, card: cheap.card.id, cost: cheap.card.cost }, BAIT_TRAIN_SCORE);
      }
    }
    // Over-commit (mistake): keep feeding units forward while the push gate says bank.
    if (banking && trains.eager) opts.overCommit = trains.eager;
    if (trains.noAntiAir) opts.forgetAntiAir = trains.noAntiAir;

    // Turrets.
    const turret = this.chooseTurret(v);
    if (turret && v.turretsBuilt < t.maxTurrets) {
      add(turret, mulBp(W.turret, mulBp(pressure, fSpare(v.gold, turret.cost))) + Math.max(wantTurret, mulBp(baseWant, fSpare(v.gold, turret.cost))));
    }
    const filled = v.turrets.every((x, m) => m >= v.mountsOwned || x !== null);
    if (filled && v.mountsOwned < mountCap) {
      const cost = e.mountCosts[v.mountsOwned] ?? 0;
      if (v.gold >= cost) add({ kind: 'mount', cost }, mulBp(SCORE.mount, mulBp(W.turret, mulBp(pressure, fSpare(v.gold, cost)))) + Math.max(wantTurret, mulBp(baseWant, fSpare(v.gold, cost))));
    }
    if (t.turretRebuild && !v.ageUncertain) {
      const mod = this.chooseModernise(v, v.gold);
      if (mod) add(mod, mulBp(SCORE.modernise, mulBp(W.turret, fSpare(v.gold, mod.cost))) + wantModernise);
    }

    // Economy income research (the Treasury before A18.5.4).
    if (incomePick && nextTreasury !== null && v.treasury < treasuryMax && v.gold >= nextTreasury && (v.now < incomeWindow.before || rushing || this.passiveTreasury(v, mem, nextTreasury, incomePerSec))) {
      const safe = !v.foes.some((u) => u.p <= e.midLane);
      if (safe) add({ kind: 'research', pick: incomePick, cost: nextTreasury }, mulBp(W.economy, fSpare(v.gold, nextTreasury)) + goalBonus('treasury'));
    }
    // Other War Council research (A18.5.8): the goal's pick once affordable.
    const g = this.goal;
    if (g?.kind === 'research' && v.gold >= g.amount && v.research.current === null) {
      const pick = book.content.research.picks.find((q) => q.id === g.pick);
      if (pick) add({ kind: 'research', pick, cost: g.amount }, RESEARCH_SCORE + GOAL_BONUS);
    }

    // Evolve.
    // Evolve on time (A7.3, A16.3 rule 2). Below tier VII the evolve delay applies as written, with no
    // safety check. From tier VII the bot waits for a safe window, but never longer than the tier's cap
    // (the evolve-delay column: 2 s at VII, 0.5 s at X); then it evolves anyway.
    const evolveWaited = mem.evolveSince === null ? -1 : obs.tick - mem.evolveSince;
    // XP at exactly 100% can also be the final age (memory.ts `evolveVisible`), so a safe-window tier
    // acts at once only on XP above the threshold, and otherwise after its cap as before.
    const earlyOk = t.safeWindowEvolve && obs.me.xpBp > BP;
    if (v.evolveReady && !P.neverEvolves && evolveWaited >= 0 && (earlyOk || evolveWaited >= t.evolveDelayTicks)) {
      // VII-X evolve away from the enemy's research (A18.5.8): not while its fresh Troops wave is on the bot's half.
      const foeFresh = t.researchTiming === 'both' && obs.tick - mem.foeTroopsDoneTick <= FOE_FRESH_TICKS && v.foes.some((u) => !u.air && u.p < e.midLane);
      const safe = t.safeWindowEvolve ? (this.safeWindow(v) && !foeFresh) || evolveWaited >= t.evolveDelayTicks : true;
      if (safe || W.greed >= GREEDY_BP) {
        // Kettle pushes first: Evolve waits while units can still be trained into the all-in.
        const waitForAllIn = allIn && trains.scored.length > 0 && v.queue.length < 3;
        if (!waitForAllIn) add({ kind: 'evolve' }, SCORE.evolve);
      } else {
        opts.evolveBeforePush = { kind: 'evolve' };
      }
    }

    // Power (A2.9.9): per reloaded, affordable slot, value per gold against the tier's ROI bar.
    const hurt = obs.tick - mem.baseDamagedTick <= POWER_HURT_TICKS;
    const pw = this.powerChoice(v, mem, rng, hurt);
    if (pw.cast) add(pw.cast, SCORE.power);
    if (pw.onFew) opts.powerOnFew = pw.onFew;

    // Stance (A18.4.2). A7.3 allows Hold from tier V; Mama Moss's signature Hold (A7.4) applies at her
    // tiers too. Fall back from tier V when badly outnumbered with the enemy past mid-lane; the Hold flag
    // moves from tier III (tiers 0-II keep it at the default).
    const stanceTier = (t.hold || P.holdAnyTier) && !this.opening.noStance;
    const weak = v.myArmy > 0 && v.myArmy * BP < mulBp(HOLD_RATIO_BP, W.hold) * v.foeArmy && (v.turretsBuilt >= HOLD_MIN_TURRETS || (mono >= HOLD_MONO_BP && v.foeArmy >= HOLD_MONO_ARMY));
    if (stanceTier && v.stanceReady && (siege || v.now - this.stanceTick >= STANCE_DWELL)) {
      // Not from Overdrive on: the late game pushes (the gate drops to 1.0 × D, A7.2), and falling back
      // then only dragged mirrors to the Final Bell (tier VIII mirror, Standard: 75% → 86%).
      const falling =
        t.fallback && !hot && !allIn && v.myArmy > 0 && v.foeArmy >= FALLBACK_MIN_FOE && v.myArmy * BP < FALLBACK_RATIO_BP * v.foeArmy && v.foeFront !== null && v.foeFront < e.turretCover + FALLBACK_REACH;
      const wantHold = !siege && !allIn && (weak || (gateFailed && W.hold >= HOLD_ON_GATE_BP));
      const want = baiting ? 'charge' : falling ? 'fallback' : wantHold ? 'hold' : 'charge';
      if (want !== v.stance) {
        const spot = want === 'hold' && t.movesFlag ? this.flagSpot(v, weak) : null;
        add(spot !== null && spot * MILLI !== v.holdP ? { kind: 'stance', stance: want, holdP: spot } : { kind: 'stance', stance: want }, SCORE.stance);
      } else if (want !== 'charge' && v.now - this.stanceTick >= OVERCOMMIT_AFTER_TICKS) {
        opts.overCommit = { kind: 'stance', stance: 'charge' };
      }
    }
    // Hold flag moves while Holding (no stance cooldown, at most once per 1 s).
    if (stanceTier && t.movesFlag && v.stance === 'hold' && v.flagReady && !siege) {
      const spot = this.flagSpot(v, weak);
      if (Math.abs(spot * MILLI - v.holdP) >= FLAG_MIN_MOVE) add({ kind: 'flag', holdP: spot }, SCORE.flag);
    }

    // Last Stand. It fires on its own at 10%; if the base may reach that before the command runs, the
    // command would find it already charging, so the bot leaves it to the automatic trigger.
    const lsMargin = 2 * mem.worstBaseLoss(t.snapshotDelayTicks + 2) + LAST_STAND_MARGIN_BP;
    if (v.lastStandArmed && !this.opening.autoLastStand && v.baseHpBp - lsMargin > e.lastStandAutoBp) {
      const near = v.foes.filter((u) => u.p <= e.lastStandRadius).length;
      if (near >= LAST_STAND_FOES) add({ kind: 'lastStand' }, SCORE.lastStand);
    }

    // While baiting the bank stays banked: only the bait, stance, casts, Evolve and Last Stand (A2.9.9).
    if (baiting) {
      for (let i = cand.length - 1; i >= 0; i -= 1) {
        const c = cand[i] as Scored;
        const k = c.action.kind;
        if (k === 'build' || k === 'mount' || k === 'modernise' || k === 'research' || (k === 'train' && c.score !== BAIT_TRAIN_SCORE)) cand.splice(i, 1);
      }
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
    // Counter depth 0: a weighted random choice from the loadout (A7.3), among the trains that clear
    // the same bar as the best action, so a saving goal still pauses the trains f_save holds back.
    if (action.kind === 'train' && t.counterDepth === 0) {
      const ts = cand.filter((c) => c.action.kind === 'train' && c.score >= bar);
      const i = pickWeighted(
        rng,
        ts.map((c) => c.score),
      );
      if (i >= 0) action = (ts[i] as Scored).action;
    }
    if (action.kind === 'stance') this.stanceTick = v.now;
    if (this.bait && action.kind === 'train') this.bait.spent += action.cost;
    if (action.kind === 'research') {
      this.researchTick = v.now;
      this.researchPlan = null;
    }
    trace.action = action;
    trace.reason = 'best';
    return trace;
  }

  /**
   * `econPlan`: against a passive foe (no enemy ground unit on the bot's half for 20 s) a Treasury level
   * is worth it in regulation after 3:00 too, while it pays back within 4:00.
   */
  private passiveTreasury(v: View, mem: BotMemory, cost: number, incomePerSec: number): boolean {
    const t = this.cfg.tier;
    if (!t.econPlan || v.phase !== 'regulation' || v.now - mem.foeOnMyHalfTick < PASSIVE_FOE_TICKS) return false;
    return Math.trunc((cost * TICKS_PER_SECOND) / incomePerSec) <= PASSIVE_PAYBACK_TICKS;
  }

  /** The research the bot is saving for: kept until bought or no longer startable, then chosen afresh. */
  private plannedResearch(v: View, mem: BotMemory, rng: Sfc32State): ResearchPickDef | null {
    const open = startableFor(this.cfg.book.content, v);
    const kept = this.researchPlan ? open.find((p) => p.id === this.researchPlan) : undefined;
    if (kept) return kept;
    const pick = this.chooseResearch(v, mem, rng);
    this.researchPlan = pick ? pick.id : null;
    return pick;
  }

  /**
   * The tier's research time has come (A18.5.8: first research, then at most one start per gap), and
   * enough of the match is left for an item to pay back ("value over the rest").
   */
  private researchDue(v: View, clock: MatchClock): boolean {
    const t = this.cfg.tier;
    if (v.research.current !== null || v.phase === 'siege') return false;
    if (clock.finalBell !== null && clock.finalBell - v.now < RESEARCH_HORIZON_TICKS) return false;
    return v.now >= t.researchFromTicks && v.now - this.researchTick >= t.researchGapTicks;
  }

  /**
   * The push gate factor from research timing (A18.5.8 "Uses enemy research"), bp. V-VI push when their
   * own Troops item lands; VII-X also strike while the enemy's Troops item is past half and let its
   * fresh wave come first. All from public research (A7.1).
   */
  private researchTimingBp(v: View, mem: BotMemory): number {
    const t = this.cfg.tier;
    if (t.researchTiming === 'none') return BP;
    const tick = v.obs.tick;
    let bp = BP;
    if (tick - mem.ownTroopsDoneTick <= OWN_DONE_TICKS) bp = mulBp(bp, OWN_DONE_GATE_BP);
    if (t.researchTiming === 'both') {
      const foe = v.obs.foe.research;
      if (foe && isTroops(foe.current) && foe.progressBp >= FOE_STRIKE_FROM_BP) bp = mulBp(bp, FOE_STRIKE_GATE_BP);
      else if (tick - mem.foeTroopsDoneTick <= FOE_FRESH_TICKS) bp = mulBp(bp, FOE_FRESH_GATE_BP);
    }
    return bp;
  }

  /**
   * Where the Hold flag goes (A18.4.2), whole lu: defending, just inside the turret cover (the default
   * without turrets); gathering a wave with the lane clear, where its army value is highest, short of
   * mid-lane and of the nearest enemy ground unit. War Horns' damage needs the flag at p ≤ 480.
   */
  flagSpot(v: View, defending: boolean): number {
    const { book } = this.cfg;
    const e = book.econ;
    let p: number;
    if (defending || (v.foeFront !== null && v.foeFront < e.midLane)) {
      p = v.turretsBuilt > 0 ? e.turretCover - FLAG_COVER_MARGIN : e.flagMin;
    } else {
      // Where its army value is highest: the value-weighted centre of its ground units, so the units
      // already out stay put and new ones gather to them, short of mid-lane and of the enemy.
      let sum = 0;
      let weight = 0;
      for (const u of v.mine) {
        if (u.air || u.value <= 0) continue;
        sum += u.p * u.value;
        weight += u.value;
      }
      p = weight > 0 ? Math.trunc(sum / weight) : e.flagMin;
      p = Math.min(p, e.midLane - FLAG_STAGE_GAP);
      if (v.foeFront !== null) p = Math.min(p, v.foeFront - FLAG_STAGE_GAP);
    }
    for (const id of v.research.owned) {
      const pick = book.content.research.picks.find((q) => q.id === id);
      for (const fx of pick?.effects ?? []) if (fx.kind === 'warHorns') p = Math.min(p, fx.flagMaxP * MILLI);
    }
    p = clamp(p, e.flagMin, e.flagMax);
    return Math.trunc(Math.trunc(p / e.flagSnap) * e.flagSnap / MILLI);
  }

  /**
   * The research pick the bot wants now (A18.5.8), or null. Troops lines only for classes in the tray
   * (research compatibility, A18.5.2); the income picks are the Treasury logic's. Tiers 0-I pick at
   * random, II-IV by `aiHint` with a fixed preference, V and up read the visible enemy army.
   */
  private chooseResearch(v: View, mem: BotMemory, rng: Sfc32State): ResearchPickDef | null {
    const { book, tier: t, persona: P, weights: W } = this.cfg;
    const content = book.content;
    const classes = new Set<string>();
    for (const s of v.tray) {
      const role = content.units[s.card.id]?.role;
      if (role) classes.add(content.research.classOfRole[role]);
    }
    // Defences improve turrets: worth it with a turret up, or for a General who plans them (Moss).
    const defencesOk = v.turretsBuilt > 0 || (P.researchBiasBp.defences ?? 0) > 0;
    // Ambush pays only while Holding: not for a bot that never holds.
    const holds = (t.hold || P.holdAnyTier) && !this.opening.noStance;
    const picks = startableFor(content, v).filter(
      (p) =>
        (p.group === null || classes.has(p.group)) &&
        !(p.track === 'economy' && pickIncomeMilliPerSec(p) > 0) &&
        P.researchBiasBp[p.id] !== -BP &&
        (p.track !== 'defences' || defencesOk) &&
        (holds || !p.effects.some((fx) => fx.kind === 'firstHit' && fx.whileHolding === true)),
    );
    if (picks.length === 0) return null;
    // The General's research style (A18.5.8), by pick id, track and Troops class.
    const style = (p: ResearchPickDef): number =>
      (P.researchBiasBp[p.id] ?? 0) + (P.researchBiasBp[p.track] ?? 0) + (p.group ? (P.researchBiasBp[`troops.${p.group}`] ?? 0) : 0);
    // Tiers 0-I: seeded random among the affordable-in-time picks, weighted by the General's style.
    if (t.researchMode === 'random') {
      const i = pickWeighted(
        rng,
        picks.map((p) => Math.max(1, HINT_BASE_BP + style(p))),
      );
      return picks[i] ?? null;
    }
    // Situation: shares of the enemy army by class (II-IV: what it sees; counter scoring adds what a
    // remembering tier recalls and, for Rook, the Scouted list), pressure, and how busy the lane is.
    const share = this.foeClassShares(v, mem, t.researchMode === 'counter');
    const bp = (c: ResearchClass): number => share.get(c) ?? 0;
    // Value over the rest of the match: a Troops line pays in proportion to how much of its own army
    // the class makes up (units on the lane and in the queue).
    const own = this.ownClassShares(v);
    const pressure = fPressure(foeValueIn(v, 0, PRESSURE_RADIUS));
    const busy = v.mine.length + v.foes.length >= 12;
    // The pick's `aiHint` against the situation (A18.5.8). Push and power picks: counter scoring (V+)
    // takes them while its army is the bigger one (they break standoffs: with defensive picks only, the
    // tier V mirror reached the Final Bell 33% of Standard Wars instead of 19%) and for the power, which
    // every age has; tiers II-IV take them only as a style (aggression ≥ 80, Kettle), since matching them
    // on the moment made tier IV buy Lightfoot and War Horns over Weapons and lose 49% → 35% to the
    // researching reference player.
    const counter = t.researchMode === 'counter';
    const matches = (p: ResearchPickDef): boolean => {
      switch (p.aiHint) {
        case 'vsSwarm':
          return bp('infantry') >= HINT_SHARE_BP;
        case 'vsHeavy':
          return bp('heavy') >= HINT_SHARE_BP;
        case 'vsRanged':
          return bp('ranged') >= HINT_SHARE_BP;
        case 'defend':
          return pressure >= DEFENCE_PRESSURE_BP;
        case 'push':
          return W.aggr >= AGGRESSIVE_BP || (counter && v.myArmy > v.foeArmy);
        case 'busy':
          return busy;
        case 'quiet':
          return !busy && mem.foeOnMyHalfTick < v.now - PASSIVE_FOE_TICKS;
        case 'power':
          return counter && (v.obs.me.powers.home !== null || v.obs.me.powers.field !== null);
        case 'opener':
          return true;
      }
    };
    const composition = (p: ResearchPickDef): boolean => p.aiHint === 'vsSwarm' || p.aiHint === 'vsHeavy' || p.aiHint === 'vsRanged';
    // A18.5.2 budget: a player specialises in 2-3 classes, so once two Troops lines are open the bot
    // deepens them (rank II) instead of opening a third.
    const owned = new Set(v.research.owned);
    const openLines = new Set(content.research.picks.filter((q) => q.group !== null && owned.has(q.id)).map((q) => q.group));
    let best: ResearchPickDef | null = null;
    let bestScore = -1;
    for (const p of picks) {
      let score = HINT_BASE_BP + style(p) + (p.group ? mulBp(HINT_OWN_BP, own.get(p.group) ?? 0) : 0);
      // Counter scoring weighs counters by the counter weight (Rook ×1.5).
      if (matches(p)) score += composition(p) && counter ? mulBp(HINT_MATCH_BP, P.counterWeightBp) : HINT_MATCH_BP;
      if (p.rank > 1) score += HINT_DEEPEN_BP;
      else if (p.group !== null && !openLines.has(p.group) && openLines.size >= MAX_OPEN_LINES) score -= HINT_DEEPEN_BP;
      score += randInt(rng, 1000);
      if (score > bestScore) {
        best = p;
        bestScore = score;
      }
    }
    return best;
  }

  /** Shares (bp) of the bot's own army (lane and queue) by War Council class. */
  private ownClassShares(v: View): Map<ResearchClass, number> {
    const content = this.cfg.book.content;
    const value = new Map<ResearchClass, number>();
    let total = 0;
    const add = (card: string, x: number): void => {
      const role = content.units[card]?.role;
      if (!role || x <= 0) return;
      const c = content.research.classOfRole[role];
      value.set(c, (value.get(c) ?? 0) + x);
      total += x;
    };
    for (const u of v.mine) add(u.card, u.value);
    for (const c of v.queue) add(c, this.cfg.book.units[c]?.value ?? 0);
    const out = new Map<ResearchClass, number>();
    if (total <= 0) return out;
    for (const [c, x] of value) out.set(c, Math.trunc((x * BP) / total));
    return out;
  }

  /**
   * Shares (bp) of the enemy army by War Council class (A18.5.2: Epics and Legendaries count in their
   * base role's class): the visible army, and with `deep` (counter scoring) recently seen cards for
   * tiers that remember composition (VII+) plus one of each Scouted card for Rook.
   */
  private foeClassShares(v: View, mem: BotMemory, deep: boolean): Map<ResearchClass, number> {
    const { book, tier: t, persona: P } = this.cfg;
    const content = book.content;
    const value = new Map<ResearchClass, number>();
    const seen = new Set<string>();
    const add = (card: string, x: number): void => {
      const role = content.units[card]?.role;
      if (!role) return;
      const c = content.research.classOfRole[role];
      value.set(c, (value.get(c) ?? 0) + x);
      seen.add(card);
    };
    for (const u of v.foes) add(u.card, u.value);
    if (deep && t.remembersComposition) {
      for (const r of mem.remembered()) {
        const d = book.units[r.card];
        if (d && !seen.has(r.card)) add(r.card, d.value * r.count);
      }
    }
    if (deep && P.researchScouted) {
      for (const c of v.obs.foe.scouted ?? []) {
        const d = book.units[c];
        if (d && !seen.has(c)) add(c, d.value);
      }
    }
    let total = 0;
    for (const x of value.values()) total += x;
    const out = new Map<ResearchClass, number>();
    if (total <= 0) return out;
    for (const [c, x] of value) out.set(c, Math.trunc((x * BP) / total));
    return out;
  }

  /** Train candidates with their A7.2 scores, plus the alternatives two mistakes would pick. */
  private trainCandidates(
    v: View,
    mem: BotMemory,
    s: { banking: boolean; allIn: boolean; clockBp: number; mono?: number },
  ): { scored: Scored[]; eager?: BotAction; noAntiAir?: BotAction; counterGoal?: { card: CardId; cost: number } } {
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
    const mono = s.mono ?? BP;
    // A16.3 rule 1: every tray card is scored for its counter value, gold ignored; an unaffordable card
    // can only become a saving goal, never be trained.
    let bestAll: { card: CardId; cost: number; fc: number } | null = null;
    let bestAffordable = 0;
    const counts = t.counterDepth > 0 && ctx.now.length > 0;
    for (const slot of v.tray) {
      const c = slot.card;
      if (c.legendary && v.legendaryInField) continue;
      if (v.popCommitted + c.pop > e.popCap) continue;
      const fc = t.counterDepth === 0 ? BP / 2 : fCounter(ctx, c.id);
      if (counts) {
        if (!bestAll || fc > bestAll.fc) bestAll = { card: c.id, cost: c.cost, fc };
        if (v.gold >= c.cost) bestAffordable = Math.max(bestAffordable, fc);
      }
      if (v.gold < c.cost || v.queue.length >= e.queueMax) continue;
      const goal = this.goal;
      const saving = goal !== null && !((goal.kind === 'legendary' || goal.kind === 'counter') && goal.card === c.id) && v.gold - c.cost < goal.amount;
      let base =
        mulBp(TRAIN.counter, mulBp(mulBp(fc, P.counterWeightBp), mono)) +
        mulBp(TRAIN.push, mulBp(W.aggr, push)) +
        Math.trunc((mulBp(TRAIN.role, fRole(groupCount.get(c.group) ?? 0)) * BP) / mono) +
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
    const out: { scored: Scored[]; eager?: BotAction; noAntiAir?: BotAction; counterGoal?: { card: CardId; cost: number } } = { scored };
    const ba = bestAll as { card: CardId; cost: number; fc: number } | null;
    if (ba && ba.cost > v.gold && ba.fc - bestAffordable >= COUNTER_GOAL_EDGE_BP) out.counterGoal = { card: ba.card, cost: ba.cost };
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

  /**
   * The A7.3 "safe window" of tiers VII and X: no enemy ground unit can walk to within 300 lu of the
   * own gate before the Ascension ends. The observation is `snapshotDelayTicks` old and the command
   * runs a tick after the decision, so every foe is moved on at its card speed over that whole span.
   * Lower tiers only check where the enemy stands now, and so sometimes evolve into a push.
   */
  private safeWindow(v: View): boolean {
    const { book, tier: t } = this.cfg;
    const horizon = t.snapshotDelayTicks + 1 + book.econ.ascendTicks;
    return !v.foes.some((u) => !u.air && u.p - Math.trunc(((u.def?.speed ?? 0) * MILLI * horizon) / TICKS_PER_SECOND) <= EVOLVE_SAFE);
  }

  /**
   * The power decision (A2.9.9 steps 1-6): for each reloaded, affordable slot (Home only below tier III)
   * the best option; cast when ROI = value × 10,000 ÷ effective cost clears the bar (tier + patience
   * shift + the General's own shift + 5,000 while it would break a saving goal + 3,000 counter-timing on
   * the Home slot), or on the overrides (base hit in the last 3 s and value ≥ 100; X with its base below
   * 25%). Bait discipline (VII+) skips Home casts on covered value < 200. Of several castable slots, the
   * best value − cost. `onFew` is the A7.2 mistake: a Home cast on 1-2 covered targets below the bar.
   */
  private powerChoice(v: View, mem: BotMemory, rng: Sfc32State, hurt: boolean): { cast: BotAction | null; onFew: BotAction | null } {
    const { book, tier: t, persona: P, weights: W } = this.cfg;
    const e = book.econ;
    const ctx: PowerContext = {
      reach: e.powerReach,
      turretCover: e.turretCover,
      legendaryPowerDamageBp: e.legendaryPowerDamageBp,
      strikeEpicBp: e.strikeEpicBp,
      strikeK: t.strikeK,
      rng,
    };
    const shift = Math.trunc(((W.patience - BP) * PATIENCE_SHIFT_NUM) / PATIENCE_SHIFT_DEN) + P.powerBarBp;
    // Counter-timing (X): the enemy is banking (its army on the lane is under 300 while the gold estimate
    // says it holds 300+), so the Home power waits for the wave that gold becomes (A7.1 estimate).
    const foeBanking = t.counterTiming && v.foeArmy < FOE_BANKING_ARMY && mem.estimator.gold >= FOE_BANKING_ARMY * MILLI;
    // Tempest casts into the burst right after the foe evolves: half the bar for 5 s.
    const foeEvolved = P.powerForEvolveMoments && v.now - mem.foeEvolvedTick <= FOE_EVOLVE_WINDOW;
    let best: { opt: PowerOption; sv: PowerSlotView; net: number } | null = null;
    let onFew: BotAction | null = null;
    for (const sv of v.powerSlots) {
      if (!sv.reloaded || !sv.affordable || (sv.slot === 'field' && !t.fieldSlot)) continue;
      if ((sv.slot === 'home' && POWER_TUNE.noHome) || (sv.slot === 'field' && POWER_TUNE.noField)) continue;
      const opt = powerOption(v, sv.slot, sv.info, ctx);
      if (opt.value <= 0) continue;
      const tb = POWER_TUNE.bars[String(Math.round(t.tier))];
      let bar = mulBp(tb !== undefined ? tb : POWER_TUNE.barOverride > 0 ? POWER_TUNE.barOverride : t.powerRoiBp, POWER_TUNE.roiScaleBp) + shift;
      if (v.phase === 'overdrive' || v.phase === 'siege') bar += sv.slot === 'home' ? POWER_TUNE.hotHomeBarBp : POWER_TUNE.hotFieldBarBp;
      const goal = this.goal;
      if (goal && v.gold - sv.cost < goal.amount && !hurt) bar += GOAL_BAR_BP;
      if (sv.slot === 'home' && foeBanking) bar += COUNTER_TIMING_BP;
      if (foeEvolved) bar = Math.trunc(bar / 2);
      const roi = Math.trunc((opt.value * BP) / Math.max(1, sv.cost));
      const discipline = POWER_TUNE.discipline && t.baitDiscipline && sv.slot === 'home' && sv.info.harmful && opt.covered < BAIT_DISCIPLINE_VALUE && !hurt;
      const override = (hurt && opt.value >= POWER_MIN_VALUE) || (t.powerAnyWhenLowBase && v.baseHpBp < LOW_BASE_BP);
      if (!discipline && (roi >= bar || override)) {
        const net = opt.value - sv.cost;
        if (!best || net > best.net) best = { opt, sv, net };
      } else if (sv.slot === 'home' && sv.info.harmful && opt.count >= 1 && opt.count <= 2) {
        onFew = this.aimPower(v, opt, sv, rng);
      }
    }
    return { cast: best ? this.aimPower(v, best.opt, best.sv, rng) : null, onFew };
  }

  /**
   * The cast for an option: area powers get the tier's positional aim error (± lu) and are clamped back
   * into their band (A2.9.9 step 1); a strike aims at its chosen target; no-aim kinds send no `p`.
   */
  private aimPower(v: View, opt: PowerOption, sv: PowerSlotView, rng: Sfc32State): BotAction {
    const base = { kind: 'power' as const, slot: sv.slot, cost: sv.cost };
    if (opt.p === null) return { ...base, p: null };
    // A strike aims at its chosen target (A2.9.7 manual pick: the enemy nearest the aim).
    if (opt.targetId !== null) return { ...base, p: Math.trunc(opt.p / MILLI) };
    const { book, tier: t } = this.cfg;
    const r = book.econ.powerReach;
    const band = reachBand(sv.info.def.reach, sv.info.zone, v.powerFront, r) ?? [r.zoneMin, r.zoneMax];
    const err = t.powerAimErrorLu > 0 ? randRange(rng, -t.powerAimErrorLu, t.powerAimErrorLu) : 0;
    const p = clamp(Math.trunc(opt.p / MILLI) + err, Math.trunc(band[0] / MILLI), Math.trunc(band[1] / MILLI));
    return { ...base, p };
  }
}
