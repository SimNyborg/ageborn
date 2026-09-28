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

/** Server-side anti-cheat check: re-simulate the command log and compare with what the clients reported. */
export function reSimulate(spec: MatchSpec, log: readonly WireCmd[], claimed: MatchOutcome, claimedHash: number): { ok: boolean; finalHash: number; outcome: MatchOutcome | null } {
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
    result: claimed,
    finalHash: claimedHash,
    hashes: [],
  };
  const sim = replayMatch(doc, content);
  const o = sim.state.outcome;
  const finalHash = sim.hash();
  const same = o !== null && o.winner === claimed.winner && o.reason === claimed.reason && o.tick === claimed.tick;
  return { ok: same && finalHash === claimedHash, finalHash, outcome: o };
}

export type { Side };
