/**
 * Replay verification (DESIGN B12 `replay:verify`, B3 Replays): re-simulates recorded matches and
 * compares the per-second hashes, the final hash and the result.
 *
 * A replay can only be re-simulated on the content it was recorded with (B3: a replay whose content hash
 * differs is "from an older version"). The tool tries the current game content and the frozen fixture
 * content (golden replays, compiled by the sim's shim) and reports which one matched.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { CompiledContent, ReplayDoc } from '../src/contracts';
import { content as gameContent } from '../src/content';
import { compileForSim, SIM_VERSION, verifyReplay } from '../src/sim';
import { raw as fixtureRaw } from '../tests/fixtures/content';
import { markdownTable, startReport, type Check, type Report } from './report';

export interface NamedContent {
  name: string;
  content: CompiledContent;
}

let fixtureContent: CompiledContent | null = null;

/** Content sets a replay may have been recorded with. */
export function contentCandidates(): NamedContent[] {
  fixtureContent ??= compileForSim(fixtureRaw);
  return [
    { name: 'game', content: gameContent },
    { name: 'fixture', content: fixtureContent },
  ];
}

export interface ReplayCheckResult {
  file: string;
  ok: boolean;
  content: string | null;
  contentHash: string | null;
  recordedSimVersion: string | null;
  finalHash: number | null;
  recordedFinalHash: number | null;
  firstMismatch: number;
  error: string | null;
}

function isReplayDoc(x: unknown): x is ReplayDoc {
  if (x === null || typeof x !== 'object') return false;
  const r = x as Partial<ReplayDoc>;
  return r.v === 1 && typeof r.contentHash === 'string' && typeof r.seed === 'number' && Array.isArray(r.commands) && Array.isArray(r.hashes) && typeof r.finalHash === 'number';
}

/** Verifies one parsed replay against the candidate contents. */
export function verifyReplayDoc(file: string, doc: unknown, candidates: readonly NamedContent[] = contentCandidates()): ReplayCheckResult {
  const fail = (error: string, r?: Partial<ReplayDoc>): ReplayCheckResult => ({
    file,
    ok: false,
    content: null,
    contentHash: r?.contentHash ?? null,
    recordedSimVersion: r?.simVersion ?? null,
    finalHash: null,
    recordedFinalHash: r?.finalHash ?? null,
    firstMismatch: -1,
    error,
  });
  if (!isReplayDoc(doc)) return fail('not a ReplayDoc (v 1)');
  const match = candidates.find((c) => c.content.hash === doc.contentHash);
  if (!match) return fail(`content ${doc.contentHash} matches no known content (${candidates.map((c) => `${c.name} ${c.content.hash}`).join(', ')}): from an older version`, doc);
  try {
    const r = verifyReplay(doc, match.content);
    return {
      file,
      ok: r.ok,
      content: match.name,
      contentHash: doc.contentHash,
      recordedSimVersion: doc.simVersion,
      finalHash: r.finalHash,
      recordedFinalHash: doc.finalHash,
      firstMismatch: r.firstMismatch,
      error: r.ok ? null : r.firstMismatch >= 0 ? `hash differs from second ${r.firstMismatch}` : 'final hash or result differs',
    };
  } catch (e) {
    return fail(`re-simulation failed: ${String(e)}`, doc);
  }
}

/** Expands files and directories (every `*.json` inside) into a sorted file list. */
export function replayFiles(inputs: readonly string[]): string[] {
  const out: string[] = [];
  for (const p of inputs) {
    if (statSync(p).isDirectory()) {
      for (const f of readdirSync(p).sort()) if (f.endsWith('.json')) out.push(path.join(p, f));
    } else {
      out.push(p);
    }
  }
  return out;
}

export interface ReplayVerifyData {
  simVersion: string;
  results: ReplayCheckResult[];
}

export function runReplayVerify(inputs: readonly string[]): Report<ReplayVerifyData> {
  const rep = startReport<ReplayVerifyData>('replay-verify', 'Ageborn replay verification (DESIGN B3, B12)', { inputs: [...inputs], simVersion: SIM_VERSION });
  const results: ReplayCheckResult[] = [];
  for (const file of replayFiles(inputs)) {
    let doc: unknown;
    try {
      doc = JSON.parse(readFileSync(file, 'utf8'));
    } catch (e) {
      results.push(verifyReplayDoc(file, { error: String(e) }));
      continue;
    }
    results.push(verifyReplayDoc(file, doc));
  }
  const checks: Check[] = results.map((r) => ({
    id: `replay.${path.basename(r.file)}`,
    metric: `Replay ${path.basename(r.file)}`,
    target: 'identical hashes and result',
    value: r.ok ? `identical (${r.content} content)` : 'differs',
    verdict: r.ok ? 'pass' : 'fail',
    ...(r.error ? { note: r.error } : {}),
  }));
  const notes = results.length === 0 ? ['No replay files found.'] : [];
  return rep.finish(checks, { simVersion: SIM_VERSION, results }, notes);
}

export function replaySections(r: Report<ReplayVerifyData>): string[] {
  return [
    '## Replays',
    '',
    markdownTable(
      ['File', 'OK', 'Content', 'Recorded sim', 'Final hash', 'Recorded', 'First mismatch (s)'],
      r.data.results.map((x) => [x.file, x.ok ? 'yes' : 'no', x.content ?? '-', x.recordedSimVersion ?? '-', x.finalHash ?? '-', x.recordedFinalHash ?? '-', x.firstMismatch]),
    ),
  ];
}
