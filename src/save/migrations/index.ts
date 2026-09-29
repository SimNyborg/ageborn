/**
 * Save migrations (DESIGN B8 Load order step 3): `m[v] : (doc_v) → doc_{v+1}`, pure, run in sequence
 * from the stored version up to `SAVE_VERSION`, before the schema check.
 *
 * Adding version N (never edit an older step or fixture):
 * 1. Change `SaveDoc` in the contracts (via the integration lead) and `schema.ts` to match.
 * 2. Write `migrations/vN.ts` exporting `{ v: N, summary, up: (doc) => docN }`; `up` receives a deep
 *    copy of a version N-1 doc and must return a doc with `v: N`.
 * 3. Append it to `SAVE_VERSIONS` below.
 * 4. Freeze a realistic `test/fixtures/vN.json`. The migration test loads every fixture, runs the
 *    chain and validates the result against the current schema.
 *
 * The store writes `ageborn.backup.pre-vN` before running the step that produces version N.
 */
import type { Migration } from '@/contracts';
import type { SaveVersion } from './types';
import { v1 } from './v1';
import { v2 } from './v2';
import { v3 } from './v3';
import { v4 } from './v4';

export type { SaveVersion } from './types';

/** Every save version, oldest first. The last one is the version this build writes. */
export const SAVE_VERSIONS: readonly SaveVersion[] = [v1, v2, v3, v4];

/** The version this build writes and the schema validates. */
export const SAVE_VERSION: number = SAVE_VERSIONS[SAVE_VERSIONS.length - 1]?.v ?? 1;

/** `m[v]` upgrades a doc of version `v` to `v + 1`. */
export type MigrationTable = Readonly<Record<number, Migration>>;

/**
 * Builds `m` from a version list and checks it: versions start at 1 and are consecutive, and every
 * version after the first has an `up` step. Throws on a broken list (a programming error).
 */
export function migrationTable(versions: readonly SaveVersion[] = SAVE_VERSIONS): MigrationTable {
  const m: Record<number, Migration> = {};
  versions.forEach((ver, i) => {
    if (ver.v !== i + 1) throw new Error(`save versions must be 1, 2, 3 ...; found v${ver.v} at position ${i}`);
    if (i === 0) return;
    if (!ver.up) throw new Error(`save version ${ver.v} has no migration from v${ver.v - 1}`);
    m[ver.v - 1] = ver.up;
  });
  return m;
}

export type MigrateFailure =
  /** Not an object with a numeric `v`. */
  | 'notASave'
  /** `v` is not a positive integer. */
  | 'badVersion'
  /** Written by a newer build than this one. */
  | 'tooNew'
  /** A step threw or did not produce the next version. */
  | 'migrationFailed';

export type MigrateResult =
  | { ok: true; doc: unknown; from: number; to: number }
  | { ok: false; reason: MigrateFailure; from: number | null; detail?: string };

export interface MigrateOptions {
  /** The version chain (tests pass synthetic chains). Default: `SAVE_VERSIONS`. */
  versions?: readonly SaveVersion[];
  /** Called with the doc before each step `from → to` (the store writes its backup here). */
  beforeStep?: (doc: unknown, from: number, to: number) => void;
}

function jsonClone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

/** The `v` of a stored doc, or why it has none. */
export function readVersion(input: unknown): { ok: true; v: number } | { ok: false; reason: 'notASave' | 'badVersion' } {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return { ok: false, reason: 'notASave' };
  const ver = (input as { v?: unknown }).v;
  if (typeof ver !== 'number') return { ok: false, reason: 'notASave' };
  if (!Number.isInteger(ver) || ver < 1) return { ok: false, reason: 'badVersion' };
  return { ok: true, v: ver };
}

/**
 * Runs the migration chain from the doc's version to the newest version. The input is never
 * mutated: each step gets a deep copy. A doc already at the newest version is returned as is.
 */
export function migrate(input: unknown, o: MigrateOptions = {}): MigrateResult {
  const versions = o.versions ?? SAVE_VERSIONS;
  const m = migrationTable(versions);
  const target = versions[versions.length - 1]?.v ?? 1;
  const ver = readVersion(input);
  if (!ver.ok) return { ok: false, reason: ver.reason, from: null };
  const from = ver.v;
  if (from > target) return { ok: false, reason: 'tooNew', from, detail: `v${from} > v${target}` };
  let doc: unknown = input;
  for (let cur = from; cur < target; cur += 1) {
    const step = m[cur];
    if (!step) return { ok: false, reason: 'migrationFailed', from, detail: `no step from v${cur}` };
    o.beforeStep?.(doc, cur, cur + 1);
    try {
      doc = step(jsonClone(doc));
    } catch (e) {
      return { ok: false, reason: 'migrationFailed', from, detail: `v${cur} → v${cur + 1}: ${String(e)}` };
    }
    const after = readVersion(doc);
    if (!after.ok || after.v !== cur + 1) {
      return { ok: false, reason: 'migrationFailed', from, detail: `v${cur} → v${cur + 1} produced ${after.ok ? `v${after.v}` : after.reason}` };
    }
  }
  return { ok: true, doc, from, to: target };
}
