/**
 * Builds the match config both clients (and the server re-sim) agree on from a small `MatchSpec`.
 * For the spike both sides use the A2.14 baseline War Plan; a real launch sends each player's
 * validated War Plan in the spec instead (the server checks ownership and deck rules).
 */
import type { MatchConfig, ReplayDoc, Side, TimedCommand } from '@/contracts';
import { content } from '@/content';
import { SIM_VERSION, createSim, replayMatch } from '@/sim';
import { baselinePlan, sideConfig } from '../../tools/lib/plans';
import type { MatchOutcome } from '@/contracts';
import type { MatchSpec, WireCmd } from './protocol';

export { content, createSim, SIM_VERSION };

export function matchConfig(spec: MatchSpec): MatchConfig {
  const plan = baselinePlan(content);
  return {
    seed: spec.seed,
    format: spec.format,
    content,
    sides: [
      sideConfig(content, plan, { level: spec.level, label: spec.labels[0], isBot: false }),
      sideConfig(content, plan, { level: spec.level, label: spec.labels[1], isBot: false }),
    ],
  };
}

export function toTimed(w: WireCmd): TimedCommand {
  return { ...w[2], tick: w[0], seq: w[1] } as TimedCommand;
}

/**
 * Hard cap on a match's length in ticks: the Final Bell plus two minutes of slack (50 ms ticks); in
 * Last Base Standing (no Bell, A2.10.1) its guaranteed end `endByMs` (26:35) plus two minutes, so a real
 * war never meets it. The relay ends a room past this tick, and the re-simulation never runs further.
 */
export function maxTicksFor(format: MatchSpec['format']): number {
  const f = content.formats[format];
  const bell = f?.finalBellMs ?? f?.endByMs ?? 645_000;
  return Math.ceil(bell / 50) + 2400;
}

/**
 * Server-side anti-cheat check: re-simulate the command log on the server's own and compare with what
 * the clients reported. The re-simulation runs until the sim itself ends the match (capped), not to
 * the claimed tick, so an early or invented end claim cannot shorten it; its outcome is the result.
 */
export function reSimulate(spec: MatchSpec, log: readonly WireCmd[], claimed: MatchOutcome | null, claimedHash: number | null): { ok: boolean; finalHash: number; outcome: MatchOutcome | null } {
  const doc: ReplayDoc = {
    v: 1,
    simVersion: SIM_VERSION,
    contentHash: content.hash,
    seed: spec.seed,
    format: spec.format,
    sides: matchConfig(spec).sides,
    modifiers: [],
    training: null,
    commands: log.map(toTimed),
    result: claimed ?? ({ tick: 0 } as MatchOutcome),
    finalHash: claimedHash ?? 0,
    hashes: [],
  };
  const sim = replayMatch(doc, content, maxTicksFor(spec.format));
  const o = sim.state.outcome;
  const finalHash = sim.hash();
  const same = o !== null && claimed !== null && o.winner === claimed.winner && o.reason === claimed.reason && o.tick === claimed.tick;
  return { ok: same && finalHash === claimedHash, finalHash, outcome: o };
}

export type { Side };
