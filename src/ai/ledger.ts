/**
 * The bot's model of its own recent commands (DESIGN A7.1, B10).
 *
 * A bot decides on an observation that is `snapshotDelayTicks` old, so its own latest commands may not
 * show yet. The ledger remembers what it issued and when each command runs, so the bot never spends
 * the same gold twice, never builds on a mount that is still busy and never repeats an Evolve during
 * its Ascension. It also learns from what the observation later shows: a Hold that never took effect
 * means the stance is locked (tutorial matches), a Last Stand that stayed armed means it is automatic,
 * and an Evolve that never started means the bot is in the format's final age. This keeps every bot
 * command legal without seeing anything a player could not.
 */
import type { CardId, Observation, StanceMode } from '@/contracts';
import { actionCost, type BotAction } from './actions';
import type { CardBook } from './book';

/** One issued command that the observation may not reflect yet. */
export interface Pending {
  execTick: number;
  action: BotAction;
}

/** Ticks after a stance or Last Stand command runs before its absence counts as a rejection. */
const FEEDBACK_TICKS = 2;
/** Actions per cap window (A7.3 "Max actions / 10 s"). */
export const ACTION_WINDOW_TICKS = 200;

export class Ledger {
  private items: Pending[] = [];
  /** Tick each mount stops building or modernising (A2.8: 1 s). */
  readonly mountBusyUntil: number[];
  /** Earliest tick the bot changes stance again (its own 3 s gap, `econ.stanceGapTicks`; the sim has none). */
  stanceReadyTick = 0;
  /** Earliest tick the next Hold flag move is legal (A18.4.2: 1 s). */
  flagReadyTick = 0;
  /** False once a stance command had no effect (stance locked in training matches). */
  stanceEnabled = true;
  /** False once a Last Stand command had no effect (Last Stand is automatic-only, A2.11). */
  lastStandManual = true;
  /** True once an Evolve with enough XP did not start: the bot is in the format's final age. */
  finalAge = false;
  /** The Evolve in flight: when it runs and the age it leaves. */
  evolve: { execTick: number; fromAge: number } | null = null;
  lastEmoteTick = -1000000;
  /** Ticks of every command issued, for the action cap. */
  private readonly issued: number[] = [];
  private stanceCheck: { execTick: number; stance: StanceMode } | null = null;
  private lastStandCheck: number | null = null;

  constructor(private readonly book: CardBook) {
    this.mountBusyUntil = new Array<number>(book.econ.mountCount).fill(0);
  }

  /** Records an issued action that runs at `execTick`. */
  record(action: BotAction, issueTick: number, execTick: number): void {
    this.items.push({ execTick, action });
    this.issued.push(issueTick);
    const busy = execTick + this.book.econ.turretBuildTicks + 1;
    switch (action.kind) {
      case 'build':
      case 'modernise':
        this.mountBusyUntil[action.mount] = busy;
        break;
      case 'stance':
        this.stanceReadyTick = execTick + this.book.econ.stanceGapTicks;
        if (action.holdP !== undefined) this.flagReadyTick = execTick + this.book.econ.flagMoveTicks;
        this.stanceCheck = { execTick, stance: action.stance };
        break;
      case 'flag':
        this.flagReadyTick = execTick + this.book.econ.flagMoveTicks;
        break;
      case 'lastStand':
        this.lastStandCheck = execTick;
        break;
      case 'evolve':
        break;
      case 'emote':
        this.lastEmoteTick = execTick;
        break;
      default:
        break;
    }
  }

  /** Records an Evolve with the age it leaves. */
  recordEvolve(issueTick: number, execTick: number, fromAge: number): void {
    this.record({ kind: 'evolve' }, issueTick, execTick);
    this.evolve = { execTick, fromAge };
  }

  /** Drops what the observation already shows and learns from commands that had no effect. */
  sync(obs: Observation): void {
    this.items = this.items.filter((p) => p.execTick > obs.tick);
    const sc = this.stanceCheck;
    if (sc && obs.tick >= sc.execTick + FEEDBACK_TICKS) {
      if (obs.me.stance !== sc.stance) this.stanceEnabled = false;
      this.stanceCheck = null;
    }
    const ls = this.lastStandCheck;
    if (ls !== null && obs.tick >= ls + FEEDBACK_TICKS) {
      if (obs.me.lastStand === 'armed') this.lastStandManual = false;
      this.lastStandCheck = null;
    }
    const ev = this.evolve;
    if (ev) {
      if (obs.me.ageIndex > ev.fromAge) this.evolve = null;
      else if (obs.tick >= ev.execTick + this.book.econ.ascendTicks + FEEDBACK_TICKS) {
        this.finalAge = true;
        this.evolve = null;
      }
    }
  }

  /** Commands not yet visible in the observation. */
  pending(): readonly Pending[] {
    return this.items;
  }

  /** Gold (milli) committed by pending commands. */
  pendingGold(): number {
    let g = 0;
    for (const p of this.items) g += actionCost(p.action);
    return g;
  }

  /** Cards of pending train commands, in order. */
  pendingTrains(): CardId[] {
    const out: CardId[] = [];
    for (const p of this.items) if (p.action.kind === 'train') out.push(p.action.card);
    return out;
  }

  has(kind: BotAction['kind']): boolean {
    return this.items.some((p) => p.action.kind === kind);
  }

  /** Commands issued in the cap window ending at `now` (A7.3). */
  actionsInWindow(now: number): number {
    while (this.issued.length > 0 && (this.issued[0] as number) <= now - ACTION_WINDOW_TICKS) this.issued.shift();
    return this.issued.length;
  }

  /**
   * True while an Evolve is in flight and the ageUp may land before a command issued now runs, so the
   * tray, the turret cards and the power may change under it (A2.4). Age-dependent commands wait.
   */
  ageUncertain(now: number): boolean {
    const ev = this.evolve;
    return ev !== null && now + 2 >= ev.execTick + this.book.econ.ascendTicks;
  }
}
