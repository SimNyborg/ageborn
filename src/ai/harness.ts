/**
 * A headless bot match driver: the observation ring and command stamping of the battle session
 * (DESIGN B6, B10), without rendering. Tests, the dev bot viewer and the headless tools (B12) use it.
 *
 * Every tick, for each bot: push `sim.observe(side)` into its ring, hand the controller the
 * observation from `snapshotDelayTicks` ago (the oldest one while the ring fills, like the session),
 * stamp the returned commands with `sim.tick + 1` and a per-side sequence number, then step the sim.
 * Player emotes are relayed to bots that can hear them (A7.2 emote rule).
 *
 * The AI layer may not import the sim (B2), so the caller passes the `Sim` in.
 */
import type { BotController, Command, EmoteId, MatchOutcome, Observation, Side, Sim, SimEvent, TimedCommand } from '@/contracts';
import { RingBuffer } from '@/core';

export interface BotSeat {
  side: Side;
  controller: BotController;
}

interface SeatState extends BotSeat {
  ring: RingBuffer<Observation>;
  seq: number;
}

interface EmoteListener {
  hearEmote(emote: EmoteId, tick: number): void;
}

function hearsEmotes(c: BotController): c is BotController & EmoteListener {
  return typeof (c as Partial<EmoteListener>).hearEmote === 'function';
}

/** Steps a sim with bots in the seats, one tick at a time. */
export class BotMatch {
  private readonly seats: SeatState[];
  private readonly humanSeq: [number, number] = [0, 0];
  /** Every command the bots issued, stamped (in issue order). */
  readonly botCommands: TimedCommand[] = [];

  constructor(
    readonly sim: Sim,
    seats: readonly BotSeat[],
  ) {
    this.seats = seats.map((s) => ({
      ...s,
      ring: new RingBuffer<Observation>(Math.max(1, Math.trunc(s.controller.snapshotDelayTicks)) + 1),
      seq: 0,
    }));
  }

  get ended(): boolean {
    return this.sim.state.outcome !== null;
  }

  /** One tick: bots decide on their delayed observations, `extra` commands join, the sim steps. */
  tick(extra: readonly Command[] = []): readonly SimEvent[] {
    const next = this.sim.state.tick + 1;
    const cmds: TimedCommand[] = [];
    for (const s of this.seats) {
      s.ring.push(this.sim.observe(s.side));
      const obs = s.ring.at(s.controller.snapshotDelayTicks);
      if (!obs) continue;
      for (const c of s.controller.onTick(obs)) {
        if (c.side !== s.side) continue;
        s.seq += 1;
        const tc = { ...c, tick: next, seq: s.seq } as TimedCommand;
        cmds.push(tc);
        this.botCommands.push(tc);
      }
    }
    for (const c of extra) {
      this.humanSeq[c.side] += 1;
      cmds.push({ ...c, tick: next, seq: 100000 + this.humanSeq[c.side] } as TimedCommand);
    }
    const events = this.sim.step(cmds);
    for (const e of events) {
      if (e.e !== 'emote') continue;
      for (const s of this.seats) {
        if (s.side !== e.side && hearsEmotes(s.controller)) s.controller.hearEmote(e.emote, e.tick);
      }
    }
    return events;
  }
}

export interface HeadlessResult {
  outcome: MatchOutcome | null;
  ticks: number;
  /** Commands the bots issued. */
  commands: TimedCommand[];
  /** `commandRejected` events per side. */
  rejected: (SimEvent & { e: 'commandRejected' })[];
}

/** Runs a match with bots until it ends or `maxTicks` pass. */
export function runHeadless(
  sim: Sim,
  seats: readonly BotSeat[],
  o: { maxTicks?: number; onEvents?: (events: readonly SimEvent[], sim: Sim) => void } = {},
): HeadlessResult {
  const match = new BotMatch(sim, seats);
  const rejected: (SimEvent & { e: 'commandRejected' })[] = [];
  const max = o.maxTicks ?? 20000;
  while (!match.ended && sim.state.tick < max) {
    const ev = match.tick();
    for (const e of ev) if (e.e === 'commandRejected') rejected.push(e);
    o.onEvents?.(ev, sim);
  }
  return { outcome: sim.state.outcome, ticks: sim.state.tick, commands: match.botCommands, rejected };
}
