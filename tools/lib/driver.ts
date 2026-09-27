/**
 * Headless match driver: the battle-session loop of DESIGN B6 without rendering.
 *
 * Every tick, for each seated controller (an AI General or a scripted proxy): push `sim.observe(side)`
 * into that seat's ring, hand the controller the observation from `snapshotDelayTicks` ago (the oldest
 * one while the ring fills), stamp its commands with the execution tick `sim.tick + 1` and a per-side
 * sequence number (B3), then step the sim once. The driver only uses the frozen contracts, so it works
 * with any `Sim` and any `BotController`.
 */
import type { BotController, Command, MatchOutcome, Observation, Side, Sim, SimEvent, TimedCommand } from '../../src/contracts';
import { RingBuffer } from '../../src/core/ring';

export interface Seat {
  side: Side;
  controller: BotController;
}

interface SeatState extends Seat {
  ring: RingBuffer<Observation>;
  delay: number;
}

export class HeadlessMatch {
  private readonly seats: SeatState[];
  private readonly seq: [number, number] = [0, 0];
  /** Every command issued, as stamped (for replays and debugging). */
  readonly commands: TimedCommand[] = [];

  constructor(
    readonly sim: Sim,
    seats: readonly Seat[],
  ) {
    const sides = new Set<Side>();
    this.seats = seats.map((s) => {
      if (sides.has(s.side)) throw new Error(`HeadlessMatch: two controllers on side ${s.side}`);
      sides.add(s.side);
      const delay = Math.max(0, Math.trunc(s.controller.snapshotDelayTicks));
      return { ...s, delay, ring: new RingBuffer<Observation>(delay + 1) };
    });
  }

  get ended(): boolean {
    return this.sim.state.outcome !== null;
  }

  /** One tick: controllers decide on their delayed observations, `extra` commands join, the sim steps. */
  step(extra: readonly Command[] = []): readonly SimEvent[] {
    const tick = this.sim.state.tick + 1;
    const cmds: TimedCommand[] = [];
    const stamp = (c: Command): void => {
      this.seq[c.side] += 1;
      const tc = { ...c, tick, seq: this.seq[c.side] } as TimedCommand;
      cmds.push(tc);
      this.commands.push(tc);
    };
    for (const s of this.seats) {
      s.ring.push(this.sim.observe(s.side));
      const obs = s.ring.at(s.delay);
      if (!obs) continue;
      for (const c of s.controller.onTick(obs)) {
        // A controller may only command its own side (DESIGN A7.1: bots use the player's command API).
        if (c.side === s.side) stamp(c);
      }
    }
    for (const c of extra) stamp(c);
    return this.sim.step(cmds);
  }

  /** Steps until the match ends or `maxTicks` is reached. */
  run(o: { maxTicks?: number; onEvents?: (events: readonly SimEvent[]) => void } = {}): MatchOutcome | null {
    const max = o.maxTicks ?? 20000;
    while (!this.ended && this.sim.state.tick < max) {
      const ev = this.step();
      o.onEvents?.(ev);
    }
    return this.sim.state.outcome;
  }
}
