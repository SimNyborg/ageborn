/**
 * Browser entry for the cross-engine determinism spec (DESIGN B13, C4.3 "determinism holds across
 * Chromium and WebKit"; risk table: "golden replays on fixture content in Chromium and WebKit from
 * Phase 1"). `determinism.spec.ts` bundles this file with Vite into one IIFE and runs the same code in
 * Node and in each browser: every golden replay of `src/sim/test/golden` is re-simulated on the frozen
 * fixture content, and the per-second hashes, final hash and result must be identical everywhere. Each
 * replay runs on the fixture whose content hash it was recorded on: the frozen fixture (01-14) or the
 * fixture plus a Last Base Standing format (15, `tests/fixtures/lastBase.ts`).
 *
 * Whether the replays still match their recorded hashes is `src/sim/test/golden.test.ts`'s job (WP2);
 * this spec only proves that the engines agree. Test code only: nothing in `src` imports it.
 */
import type { MatchOutcome, ReplayDoc } from '../../../src/contracts';
import { compileForSim, replayMatch, SIM_VERSION } from '../../../src/sim';
import { raw } from '../../fixtures/content';
import { rawLast } from '../../fixtures/lastBase';

const FILES = import.meta.glob<ReplayDoc>('../../../src/sim/test/golden/*.json', { eager: true, import: 'default' });

export interface EngineResult {
  name: string;
  ticks: number;
  finalHash: number;
  hashes: number[];
  outcome: MatchOutcome | null;
  /** Same final hash as recorded (information only; the golden test owns this). */
  matchesRecording: boolean;
  error: string | null;
}

/** Re-simulates every golden replay in this JavaScript engine. */
export function runGolden(): { simVersion: string; results: EngineResult[] } {
  const contents = [compileForSim(raw), compileForSim(rawLast)];
  const byHash = new Map(contents.map((c) => [c.hash, c]));
  const results = Object.entries(FILES)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([file, doc]): EngineResult => {
      const name = file.replace(/^.*\//, '').replace(/\.json$/, '');
      try {
        const sim = replayMatch(doc, byHash.get(doc.contentHash) ?? (contents[0] as (typeof contents)[number]));
        const finalHash = sim.hash();
        return { name, ticks: sim.state.tick, finalHash, hashes: [...sim.state.hashes], outcome: sim.state.outcome, matchesRecording: finalHash === doc.finalHash, error: null };
      } catch (e) {
        return { name, ticks: -1, finalHash: -1, hashes: [], outcome: null, matchesRecording: false, error: String(e) };
      }
    });
  return { simVersion: SIM_VERSION, results };
}
