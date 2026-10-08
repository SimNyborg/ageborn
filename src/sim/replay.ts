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
 * structure mod, fort targeting, contact, decay and bounty; levies rank last in power caps. 5.1.0: the
 * contact cap is a hard limit on a fort's short-range attackers (reach units no longer bypass it), and
 * the safe-pad test reads a moving enemy's current speed (review 2026-10-01). 6.0.0: Last Base Standing
 * (A2.10.1): formats with Siege steps (`FormatDef.escalation`, no Final Bell, no symmetric decay; base and
 * turret damage read the step), the Crumble rope and no evolve heal in Crumble. The step is a pure
 * function of the tick, so goldens 01-14 keep their hashes (re-recorded only for this version string).
 * 7.0.0 (X0, content expansion 2026-10-02): squads (one card spawns 2-3 members, pop and bounty split),
 * frenzy (a self bonus below an HP line), summoners (the levy rules on a moving unit; their summon ids
 * are hashed), the Time Stop visual flag from content, and the `lane` reach (H7: no aim, the screen over
 * the whole lane). Fields only hash when used, so goldens 01-15 keep their hashes; 16 plays the new kinds.
 * 7.1.0 (Bronze wave, 2026-10-03): ally `speedBuff` auras (Aulos Piper) and the Dread aura (`aura.foe`,
 * M4: a slow or mark on enemy ground units in the radius; Tragic Chorus). Both are per-tick fields
 * recomputed from positions, so goldens 01-16 keep their hashes; 17 plays them.
 * 7.2.0 (Gunpowder wave, 2026-10-03): a unit volley with `scatter` lands each projectile within ±scatter
 * of the aim point, as turret volleys already did (the Rocket Cart). The RNG is drawn only when scatter is
 * above 0 and no earlier unit has scatter, so every golden keeps its hash (re-recorded for this string).
 * 7.3.0 (Modern wave, 2026-10-03): a bomber's riders (the Sky Fortress's waist gunners) target like any
 * secondary attack (range, leash, priority, air included); only the bomber's own attack (index 0) uses the
 * drop window. No golden has a bomber with riders, so every golden keeps its hash (re-recorded for this string).
 * 7.4.0 (seven troops, owner request 2026-10-07): a loadout has 7 unit slots, so `train` and `cancelTrain`
 * accept tray slot 6 (a `badCommand` before) and the observation's tray has 7 entries. No golden trains from
 * slot 6, so every golden keeps its hash (re-recorded for this string, A2.9.11 / F3 minor-bump policy).
 * 8.0.0 (ranks, owner request 2026-10-07: long range keeps a little behind the melee): with
 * `economy.formation` a ranged ground unit keeps its place behind its side's melee front (a share of its
 * range, ± a variation fixed by its id) and never advances past it, a Long range unit also steps up between
 * shots when it stands well behind it, ranked units form up behind the Hold flag, and melee walks through its
 * own ranks (A2.7 Ranks; off in Fall back and without the content field). A major bump by the F3 policy: the
 * frozen fixture carries the rule, so all 17 goldens were re-recorded deliberately; 14 changed their hashes
 * (05, 16 and 17 field no ranked unit and keep theirs), and 13 moved to seed 1325 so it still holds a blob
 * at the fort contact cap.
 */
export const SIM_VERSION = '8.0.0';

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
