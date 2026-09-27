/**
 * The utility bot controller (DESIGN B10, A7.2, A7.3). It receives only delayed observations, runs the
 * brain every decision interval, enforces the tier's action cap, and remembers its own recent commands
 * so every command it returns is legal when it runs.
 *
 * Timing: the session hands `onTick` the observation from `snapshotDelayTicks` ago (B6, B10), so the
 * controller's clock is `obs.tick + snapshotDelayTicks`, and a command returned now runs one tick later
 * (the session stamps `sim.tick + 1`).
 */
import type { BotController, BotProfile, Command, CompiledContent, EmoteId, Observation, Side } from '@/contracts';
import { BP, seedSfc32, type Sfc32State } from '@/core';
import { describeAction, toCommand, type BotAction } from './actions';
import { cardBook, type CardBook } from './book';
import { Brain, type DecisionTrace } from './brain';
import { EmotePolicy } from './emotes';
import { Ledger } from './ledger';
import { BotMemory } from './memory';
import { personalityFor, weightBp, type Personality } from './personalities';
import { tierParams, type TierParams } from './tiers';
import { buildView, type View, type WeightsBp } from './view';

/** Mistake rate ceiling, bp (a bot always plays mostly on purpose). */
const MAX_MISTAKE_BP = 9000;
/** Decision traces kept for the dev viewer. */
const TRACE_KEEP = 40;

/** An emote the bot's side saw, for a future `Observation.foe.lastEmote` (docs/requests/wp3-observation-emotes.md). */
interface ObservedEmote {
  emote: EmoteId;
  tick: number;
}

/** Extra controller surface for the session, tools and the dev viewer (beyond `BotController`). */
export interface AiBotController extends BotController {
  readonly side: Side;
  readonly profile: Readonly<BotProfile>;
  readonly tier: Readonly<TierParams>;
  readonly personality: Readonly<Personality>;
  /** The player emoted (A7.2 emote rule). The session relays emotes the bot's side can see. */
  hearEmote(emote: EmoteId, tick: number): void;
  /** Recent decisions, newest last. */
  readonly traces: readonly DecisionTrace[];
  /** The estimated foe gold, milli (A7.1 gold estimator). */
  readonly foeGoldEstimate: number;
}

export function botSeed(seed: number, side: Side, stream: string): Sfc32State {
  // DESIGN A7.2: the bot RNG is seeded from hash(matchSeed, side).
  return seedSfc32(`bot:${seed}:${side}:${stream}`);
}

function weightsBp(profile: BotProfile): WeightsBp {
  const w = profile.weights;
  return {
    aggr: weightBp(w.aggr),
    turret: weightBp(w.turret),
    economy: weightBp(w.economy),
    greed: weightBp(w.greed),
    patience: weightBp(w.patience),
    legendary: weightBp(w.legendary),
    hold: weightBp(w.hold),
  };
}

export class UtilityController implements AiBotController {
  readonly snapshotDelayTicks: number;
  readonly tier: TierParams;
  readonly personality: Personality;
  readonly traces: DecisionTrace[] = [];
  private readonly book: CardBook;
  private readonly rng: Sfc32State;
  private readonly memory: BotMemory;
  private readonly ledger: Ledger;
  private readonly brain: Brain;
  private readonly emotes: EmotePolicy;
  private nextDecision = 0;

  constructor(
    readonly profile: BotProfile,
    readonly side: Side,
    seed: number,
    content: CompiledContent,
  ) {
    this.book = cardBook(content);
    this.tier = tierParams(profile.tier);
    this.personality = personalityFor(content, profile.generalId);
    this.snapshotDelayTicks = this.tier.snapshotDelayTicks;
    this.rng = botSeed(seed, side, 'brain');
    this.memory = new BotMemory(this.book);
    this.ledger = new Ledger(this.book);
    this.emotes = new EmotePolicy(botSeed(seed, side, 'emote'));
    const openings = profile.openings.length > 0 ? profile.openings : this.personality.opening;
    this.brain = new Brain(
      {
        book: this.book,
        tier: this.tier,
        persona: this.personality,
        weights: weightsBp(profile),
        mistakeBp: Math.min(MAX_MISTAKE_BP, this.tier.mistakeBp + Math.max(0, profile.mistakeBonusBp)),
        openings,
      },
      this.rng,
    );
  }

  get foeGoldEstimate(): number {
    return this.memory.estimator.gold;
  }

  hearEmote(emote: EmoteId, tick: number): void {
    this.emotes.hear(emote, tick);
  }

  onTick(obs: Observation): Command[] {
    if (obs.side !== this.side || obs.phase === 'ended') return [];
    this.memory.observe(obs);
    this.ledger.sync(obs);
    const heard = (obs.foe as { lastEmote?: ObservedEmote | null }).lastEmote;
    if (heard) this.emotes.hear(heard.emote, heard.tick);

    const now = obs.tick + this.snapshotDelayTicks;
    const out: BotAction[] = [];
    if (now >= this.nextDecision) {
      this.nextDecision = now + this.tier.decisionTicks;
      if (this.canAct(now)) {
        const view = buildView(obs, now, this.book, this.ledger);
        const trace = this.brain.decide(view, this.memory, this.rng);
        this.keep(trace);
        if (trace.action) out.push(trace.action);
      }
    }
    const canEmote = this.canAct(now, out.length) && now >= this.ledger.lastEmoteTick + this.book.econ.emoteCooldownTicks + 1;
    const emote = this.emotes.next(obs, now, canEmote);
    if (emote) out.push({ kind: 'emote', emote });
    return out.map((a) => this.issue(a, obs, now));
  }

  /** The action cap (A7.3 "Max actions / 10 s") leaves room for `extra` + 1 more commands. */
  private canAct(now: number, extra = 0): boolean {
    return this.ledger.actionsInWindow(now) + extra < this.tier.maxActionsPer10s;
  }

  private issue(a: BotAction, obs: Observation, now: number): Command {
    const exec = now + 1;
    if (a.kind === 'evolve') this.ledger.recordEvolve(now, exec, obs.me.ageIndex);
    else this.ledger.record(a, now, exec);
    return toCommand(a, this.side);
  }

  private keep(trace: DecisionTrace): void {
    this.traces.push(trace);
    if (this.traces.length > TRACE_KEEP) this.traces.shift();
  }

  /** The view the brain would see for an observation now (dev viewer). */
  peekView(obs: Observation): View {
    return buildView(obs, obs.tick + this.snapshotDelayTicks, this.book, this.ledger);
  }
}

/** One-line summary of a decision for logs. */
export function traceLine(t: DecisionTrace): string {
  const why = t.mistake ? `mistake:${t.mistake}` : t.reason;
  return `${t.tick} ${describeAction(t.action)} (${why}) army ${t.myArmy}/${t.foeArmy} D ${t.defence} gate ${t.pushOk ? 'ok' : 'fail'}${
    t.goal ? ` goal ${t.goal.kind}` : ''
  } clock ${t.clockBp / BP}`;
}
