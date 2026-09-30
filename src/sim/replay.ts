/**
 * Replays (DESIGN B3 Replays, B15 `ReplayDoc`): record a finished match and re-simulate it.
 *
 * A replay is the match config (seed, format, sides, modifiers, training) plus every command with its
 * execution tick; re-simulating it must reproduce `finalHash` and the per-second `hashes`. A replay
 * whose `contentHash` differs from the current content cannot be played.
 */
import type { CompiledContent, MatchConfig, ReplayDoc, ReplayMatch, Sim, TimedCommand } from '@/contracts';
import { SimImpl } from './createSim';

/**
 * Bumped whenever a sim change alters the outcome of recorded commands (golden replays re-recorded).
 * 4.0.0: two typed power slots with cost, reload, reach and the cap (A2.9). 4.1.0: the reach area masks
 * every hit, also of a unit already in the cast's `hitIds` (A2.9.4), and the state hash covers every
 * field of a cast (charge hit counts and runner hits, reload timing, level). 5.0.0: the Fort class
 * (A16.14): the `fort` command, walls, towers and camps as hidden twin units, levies, traps, the
 * structure mod, fort targeting, contact, decay and bounty; levies rank last in power caps.
 */
export const SIM_VERSION = '5.0.0';

/** Thrown when a replay was recorded on different content (B3: "from an older version"). */
export class ReplayContentMismatchError extends Error {
  constructor(expected: string, actual: string) {
    super(`replay content ${expected} does not match current content ${actual}`);
    this.name = 'ReplayContentMismatchError';
  }
}

/** Builds the `ReplayDoc` of a finished match created by `createSim`. */
export function buildReplay(sim: Sim): ReplayDoc {
  if (!(sim instanceof SimImpl)) throw new Error('buildReplay needs a sim created by createSim');
  if (sim.devTouched) throw new Error('buildReplay: the state was changed by dev helpers; it cannot be replayed');
  const outcome = sim.state.outcome;
  if (!outcome) throw new Error('buildReplay: the match has not ended');
  const cfg = sim.config;
  return {
    v: 1,
    simVersion: SIM_VERSION,
    contentHash: cfg.content.hash,
    seed: cfg.seed,
    format: cfg.format,
    sides: [cfg.sides[0], cfg.sides[1]],
    modifiers: [...(cfg.modifiers ?? [])],
    training: cfg.training ?? null,
    ...(cfg.victory ? { victory: cfg.victory } : {}),
    commands: sim.log.map((c) => ({ ...c })),
    result: { ...outcome, baseHpBp: [outcome.baseHpBp[0], outcome.baseHpBp[1]] },
    finalHash: sim.hash(),
    hashes: [...sim.state.hashes],
  };
}

/** The match config a replay was recorded with, on the given content. */
export function replayConfig(r: ReplayDoc, content: CompiledContent): MatchConfig {
  const cfg: MatchConfig = { seed: r.seed, format: r.format, content, sides: [r.sides[0], r.sides[1]], modifiers: [...r.modifiers] };
  if (r.training) cfg.training = r.training;
  if (r.victory) cfg.victory = r.victory;
  return cfg;
}

/**
 * Re-simulates a replay up to `toTick` (default: the recorded end) and returns the sim.
 * Throws `ReplayContentMismatchError` when the content differs.
 */
export const replayMatch: ReplayMatch = (r, content, toTick) => {
  if (content.hash !== r.contentHash) throw new ReplayContentMismatchError(r.contentHash, content.hash);
  const sim = new SimImpl(replayConfig(r, content));
  const byTick = new Map<number, TimedCommand[]>();
  for (const c of r.commands) {
    const list = byTick.get(c.tick);
    if (list) list.push(c);
    else byTick.set(c.tick, [c]);
  }
  const end = toTick ?? r.result.tick;
  while (!sim.state.outcome && sim.state.tick < end) sim.step(byTick.get(sim.state.tick + 1) ?? []);
  return sim;
};

export interface ReplayCheck {
  ok: boolean;
  finalHash: number;
  /** First index into `hashes` that differs, or −1. */
  firstMismatch: number;
}

/** Re-simulates a replay and compares its hashes and result (B12 `replay:verify`). */
export function verifyReplay(r: ReplayDoc, content: CompiledContent): ReplayCheck {
  const sim = replayMatch(r, content);
  const hashes = sim.state.hashes;
  let firstMismatch = -1;
  const n = Math.max(hashes.length, r.hashes.length);
  for (let i = 0; i < n; i += 1) {
    if (hashes[i] !== r.hashes[i]) {
      firstMismatch = i;
      break;
    }
  }
  const out = sim.state.outcome;
  const sameResult =
    out !== null &&
    out.winner === r.result.winner &&
    out.reason === r.result.reason &&
    out.tick === r.result.tick &&
    out.baseHpBp[0] === r.result.baseHpBp[0] &&
    out.baseHpBp[1] === r.result.baseHpBp[1];
  const finalHash = sim.hash();
  return { ok: sameResult && firstMismatch < 0 && finalHash === r.finalHash, finalHash, firstMismatch };
}
