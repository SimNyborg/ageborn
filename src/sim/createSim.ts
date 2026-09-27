/**
 * `createSim` (DESIGN B15 `sim.ts`, B3). A `Sim` advances one 50 ms tick per `step()`.
 *
 * Commands are stamped with their execution tick (`sim.tick + 1` offline). `step()` applies the
 * commands whose tick is due, sorted by (side, seq); commands stamped for a later tick wait until
 * then, and late commands run on the current tick. Every applied command is logged with the tick it
 * actually ran on, so `buildReplay` (replay.ts) reproduces the match exactly.
 */
import type { CreateSim, MatchConfig, Observation, Side, Sim, SimEvent, SimState, TimedCommand } from '@/contracts';
import { sortCommands } from './commands';
import { hashState } from './hashState';
import { observe } from './observe';
import { createCtx, type Ctx } from './state';
import { stepTick } from './step';

export class SimImpl implements Sim {
  readonly ctx: Ctx;
  readonly config: Readonly<MatchConfig>;
  /** Every command applied so far, stamped with its execution tick (the replay's command list). */
  readonly log: TimedCommand[] = [];
  /** True once dev helpers (debug.ts) changed the state outside the command stream. */
  devTouched = false;
  private pending: TimedCommand[] = [];

  constructor(cfg: MatchConfig) {
    this.config = cfg;
    this.ctx = createCtx(cfg);
  }

  get state(): Readonly<SimState> {
    return this.ctx.s;
  }

  step(cmds: readonly TimedCommand[]): readonly SimEvent[] {
    if (this.ctx.s.outcome) return [];
    const tick = this.ctx.s.tick + 1;
    let due: TimedCommand[];
    if (this.pending.length === 0 && cmds.every((c) => c.tick <= tick)) {
      due = cmds.length > 1 ? sortCommands(cmds) : [...cmds];
    } else {
      const all = [...this.pending, ...cmds];
      due = sortCommands(all.filter((c) => c.tick <= tick));
      this.pending = all.filter((c) => c.tick > tick);
    }
    for (let i = 0; i < due.length; i += 1) {
      const c = { ...(due[i] as TimedCommand), tick };
      due[i] = c;
      this.log.push(c);
    }
    return stepTick(this.ctx, due);
  }

  hash(): number {
    return hashState(this.ctx.s);
  }

  observe(side: Side): Observation {
    return observe(this.ctx, side);
  }
}

/** Creates a deterministic simulation for a match (DESIGN B3). */
export const createSim: CreateSim = (cfg) => new SimImpl(cfg);
